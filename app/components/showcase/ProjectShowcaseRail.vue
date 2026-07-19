<script setup lang="ts">
import {
  useRouter,
} from '#imports'

import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

import ProjectShowcaseStage from '~/components/showcase/ProjectShowcaseStage.vue'
import GatewayShowcaseCopyStage from '~/components/showcase/GatewayShowcaseCopyStage.vue'

import {
  useHomeNavigationMemory,
} from '~/composables/useHomeNavigationMemory'

import {
  reconcileShowcaseActiveId,
} from '~/utils/project-showcase-navigation'

import {
  resolveMagazinePresentation,
  resolveMagazineTextPresentation,
} from '~/utils/showcase-magazine-track'

import {
  resolvePreviewIconOpticalLayout,
} from '~~/shared/constants/category-icon-optical-layout'

import {
  SHOWCASE_FULL_STEP_DURATION_MS,
  SHOWCASE_WEIGHTED_MOTION_EASING,
  resolveShowcaseArrowBurst,
  resolveShowcaseTransitionDurationMs,
} from '~/utils/showcase-transition-timing'

import type {
  ShowcaseNavigationDirection,
} from '~/utils/project-showcase-navigation'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ComponentPublicInstance,
} from 'vue'

import type {
  ShowcaseProjectView,
} from '~~/shared/view/portfolio-project-view'

import type {
  HomeGatewayShowcaseView,
} from '~/types/home-gateway'

type ShowcasePhase =
  | 'idle'
  | 'dragging'
  | 'settling'
  | 'recycling'

type PointerAxis =
  | 'pending'
  | 'horizontal'
  | 'vertical'

interface Props {
  readonly projects: readonly ShowcaseProjectView[]
  readonly previewOnly?: boolean
  readonly previewLabel?: string | null
}

interface CopyEntryTarget {
  readonly projectId: string
  readonly href: string
}

interface PointerSession {
  readonly pointerId: number
  readonly surface: HTMLElement
  readonly startX: number
  readonly startY: number
  readonly stageWidth: number
  readonly copyEntryTarget: CopyEntryTarget | null
  axis: PointerAxis
  deltaX: number
  deltaY: number
  lastX: number
  lastTimestamp: number
  velocityX: number
}

interface QueuedNavigation {
  readonly targetId: string
  readonly direction: ShowcaseNavigationDirection
  readonly focusSelector: boolean
  readonly durationMs: number | null
}

const DRAG_AXIS_LOCK_PX = 8
const DRAG_COMMIT_RATIO = 0.14
const DRAG_VELOCITY_COMMIT = 0.42
const MAX_DRAG_PROGRESS = 0.98

const router = useRouter()

const props = withDefaults(defineProps<Props>(), {
  previewOnly: false,
  previewLabel: null,
})

const activeProjectId = ref<string | null>(
  reconcileShowcaseActiveId(props.projects, null),
)
const phase = ref<ShowcasePhase>('idle')
const transitionDirection =
  ref<ShowcaseNavigationDirection | null>(null)
const pendingProjectId = ref<string | null>(null)
const pendingFocusSelector = ref(false)
const transitionEnabled = ref(true)
const trackProgress = ref(0)
const transitionDurationMs = ref(SHOWCASE_FULL_STEP_DURATION_MS)

let pointerSession: PointerSession | null = null
let recycleFrameOne: number | null = null
let recycleFrameTwo: number | null = null
let queuedNavigations: QueuedNavigation[] = []
let lastArrowTapTimestamp = Number.NEGATIVE_INFINITY
let lastArrowTapDirection: ShowcaseNavigationDirection | null = null
let arrowTapStreak = 0
let suppressNextCopyEntryActivation = false
const copyNavigationPending = ref(false)
const copyReturnProjectId = ref<string | null>(null)

const selectorElements = new Map<string, HTMLButtonElement>()
const stageViewport = ref<HTMLElement | null>(null)
const trackViewport = stageViewport

const showcaseStyle = computed<Record<string, string>>(() => ({
  '--mm-showcase-motion-duration': `${transitionDurationMs.value}ms`,
  '--mm-showcase-motion-ease': SHOWCASE_WEIGHTED_MOTION_EASING,
}))

const activeIndex = computed(() => (
  activeProjectId.value === null
    ? -1
    : props.projects.findIndex(
        project => project.id === activeProjectId.value,
      )
))

const activeProject = computed(() => (
  activeIndex.value < 0
    ? null
    : props.projects[activeIndex.value] ?? null
))

const dragDirection = computed<ShowcaseNavigationDirection | null>(() => {
  if (phase.value !== 'dragging' || trackProgress.value === 0) {
    return null
  }

  return trackProgress.value > 0
    ? 'next'
    : 'previous'
})

const incomingProjectId = computed(() => {
  if (pendingProjectId.value !== null) {
    return pendingProjectId.value
  }

  if (dragDirection.value === null) {
    return null
  }

  return adjacentProjectId(dragDirection.value)
})

function isGatewayProject(
  project: ShowcaseProjectView | null,
): project is HomeGatewayShowcaseView {
  return project !== null && 'gatewayCategoryId' in project
}

const copyCurrentProject = computed<HomeGatewayShowcaseView | null>(() => (
  isGatewayProject(activeProject.value)
    ? activeProject.value
    : null
))

const copyIncomingProjectId = computed(() => (
  incomingProjectId.value ?? copyReturnProjectId.value
))

const copyIncomingProject = computed<HomeGatewayShowcaseView | null>(() => {
  const projectId = copyIncomingProjectId.value
  if (projectId === null) return null

  const project = props.projects.find(candidate => candidate.id === projectId) ?? null
  return isGatewayProject(project) ? project : null
})

const copyEntryEnabled = computed(() => (
  phase.value === 'idle'
  && pendingProjectId.value === null
  && trackProgress.value === 0
  && copyReturnProjectId.value === null
  && !copyNavigationPending.value
))

watch(
  () => props.projects,
  projects => {
    const nextActiveId = reconcileShowcaseActiveId(
      projects,
      activeProjectId.value,
    )

    if (nextActiveId === activeProjectId.value) return

    cancelRecycleFrames()
    pointerSession = null
    queuedNavigations = []
    activeProjectId.value = nextActiveId
    pendingProjectId.value = null
    pendingFocusSelector.value = false
    transitionDirection.value = null
    transitionEnabled.value = true
    trackProgress.value = 0
    transitionDurationMs.value = SHOWCASE_FULL_STEP_DURATION_MS
    copyReturnProjectId.value = null
    resetArrowTapBurst()
    phase.value = 'idle'
  },
)

function tabId(projectId: string): string {
  return `mm-showcase-tab-${projectId}`
}

function panelId(projectId: string): string {
  return `mm-showcase-panel-${projectId}`
}

function setSelectorElement(
  projectId: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) {
    selectorElements.set(projectId, element)
    return
  }

  selectorElements.delete(projectId)
}

function wrapIndex(index: number): number {
  const count = props.projects.length
  if (count === 0) return -1
  return ((index % count) + count) % count
}

function adjacentProjectIdFrom(
  baseProjectId: string | null,
  direction: ShowcaseNavigationDirection,
): string | null {
  if (props.projects.length <= 1 || baseProjectId === null) {
    return null
  }

  const baseIndex = props.projects.findIndex(
    project => project.id === baseProjectId,
  )
  if (baseIndex < 0) return null

  const delta = direction === 'next' ? 1 : -1
  return props.projects[wrapIndex(baseIndex + delta)]?.id ?? null
}

function adjacentProjectId(
  direction: ShowcaseNavigationDirection,
): string | null {
  return adjacentProjectIdFrom(activeProjectId.value, direction)
}

function resolveCircularDirection(
  targetId: string,
): ShowcaseNavigationDirection | null {
  if (activeIndex.value < 0 || props.projects.length <= 1) {
    return null
  }

  const targetIndex = props.projects.findIndex(
    project => project.id === targetId,
  )
  if (targetIndex < 0 || targetIndex === activeIndex.value) {
    return null
  }

  const count = props.projects.length
  const forward = (targetIndex - activeIndex.value + count) % count
  const backward = (activeIndex.value - targetIndex + count) % count

  return forward <= backward
    ? 'next'
    : 'previous'
}

function cardStyle(
  projectIndex: number,
): Record<string, string | number> {
  const presentation = resolveMagazinePresentation(
    projectIndex,
    activeIndex.value,
    props.projects.length,
    trackProgress.value,
  )
  const desktop = presentation.desktop
  const mobile = presentation.mobile
  const hue = (208 + projectIndex * 47) % 360
  const focus = presentation.focusStrength
  const text = resolveMagazineTextPresentation(
    presentation.continuousOffset,
    focus,
  )
  const desktopIconX = 16 - focus * 4
  const desktopIconY = 8 + focus * 6
  const desktopIconWidth = 58 - focus * 34
  const desktopIconHeight = 56 + focus * 16
  const mobileIconX = 18 + focus * 14
  const mobileIconY = 7
  const mobileIconWidth = 64 - focus * 28
  const mobileIconHeight = 52 - focus * 18
  const project = props.projects[projectIndex] ?? null
  const opticalLayout = isGatewayProject(project)
    ? resolvePreviewIconOpticalLayout(project.gatewayCategoryId)
    : resolvePreviewIconOpticalLayout('')
  const compactStrength = presentation.compactStrength
  const previewIconOffsetX = (
    opticalLayout.offsetX
    * compactStrength
    * 100
  )
  const previewIconOffsetY = (
    opticalLayout.offsetY
    * compactStrength
    * 100
  )
  const previewIconScale = (
    1
    + (opticalLayout.scale - 1) * compactStrength
  )

  return {
    '--mm-card-x-desktop': `${desktop.x.toFixed(4)}%`,
    '--mm-card-y-desktop': `${desktop.y.toFixed(4)}%`,
    '--mm-card-width-desktop': `${desktop.width.toFixed(4)}%`,
    '--mm-card-height-desktop': `${desktop.height.toFixed(4)}%`,
    '--mm-card-opacity-desktop': desktop.opacity.toFixed(4),
    '--mm-card-scale-desktop': desktop.scale.toFixed(4),
    '--mm-card-saturation-desktop': desktop.saturation.toFixed(4),
    '--mm-card-x-mobile': `${mobile.x.toFixed(4)}%`,
    '--mm-card-y-mobile': `${mobile.y.toFixed(4)}%`,
    '--mm-card-width-mobile': `${mobile.width.toFixed(4)}%`,
    '--mm-card-height-mobile': `${mobile.height.toFixed(4)}%`,
    '--mm-card-opacity-mobile': mobile.opacity.toFixed(4),
    '--mm-card-scale-mobile': mobile.scale.toFixed(4),
    '--mm-card-saturation-mobile': mobile.saturation.toFixed(4),
    '--mm-card-focus': focus.toFixed(4),
    '--mm-card-compact': presentation.compactStrength.toFixed(4),
    '--mm-card-icon-x-desktop': `${desktopIconX.toFixed(4)}%`,
    '--mm-card-icon-y-desktop': `${desktopIconY.toFixed(4)}%`,
    '--mm-card-icon-width-desktop': `${desktopIconWidth.toFixed(4)}%`,
    '--mm-card-icon-height-desktop': `${desktopIconHeight.toFixed(4)}%`,
    '--mm-card-icon-x-mobile': `${mobileIconX.toFixed(4)}%`,
    '--mm-card-icon-y-mobile': `${mobileIconY.toFixed(4)}%`,
    '--mm-card-icon-width-mobile': `${mobileIconWidth.toFixed(4)}%`,
    '--mm-card-icon-height-mobile': `${mobileIconHeight.toFixed(4)}%`,
    '--mm-card-preview-icon-offset-x': `${previewIconOffsetX.toFixed(4)}%`,
    '--mm-card-preview-icon-offset-y': `${previewIconOffsetY.toFixed(4)}%`,
    '--mm-card-preview-icon-scale': previewIconScale.toFixed(4),
    '--mm-card-text-opacity': text.opacity.toFixed(4),
    '--mm-card-text-shift': `${text.shiftRem.toFixed(4)}rem`,
    '--mm-card-text-blur': `${text.blurPx.toFixed(4)}px`,
    '--mm-card-text-scale': text.scale.toFixed(4),
    '--mm-card-text-lift': `${text.liftRem.toFixed(4)}rem`,
    '--mm-card-detail-shift': `${((1 - focus) * 2.5).toFixed(4)}rem`,
    '--mm-card-profile-shift': `${(focus * 1.1).toFixed(4)}rem`,
    '--mm-card-brightness': (0.82 + focus * 0.18).toFixed(4),
    '--mm-card-glow-opacity': (0.1 + focus * 0.34).toFixed(4),
    '--mm-card-radius': `${(1 + focus * 0.5).toFixed(4)}rem`,
    '--mm-card-shadow-y': `${(0.65 + focus * 0.55).toFixed(4)}rem`,
    '--mm-card-shadow-blur': `${(1.55 + focus * 1.15).toFixed(4)}rem`,
    '--mm-card-shadow-alpha': (0.16 + focus * 0.18).toFixed(4),
    '--mm-card-shade-strong': (focus * 0.84).toFixed(4),
    '--mm-card-shade-soft': (focus * 0.18).toFixed(4),
    '--mm-card-mobile-shade-base': (0.68 + focus * 0.22).toFixed(4),
    '--mm-card-mobile-shade-mid': (focus * 0.38).toFixed(4),
    '--mm-card-z': presentation.zIndex,
    '--mm-card-hue': `${hue}`,
    '--mm-card-offset': presentation.continuousOffset.toFixed(4),
  }
}

function focusSelector(projectId: string): void {
  void nextTick(() => {
    selectorElements.get(projectId)?.focus({ preventScroll: true })
  })
}

function restoreActiveProject(projectId: string): boolean {
  const projectExists = props.projects.some(
    project => project.id === projectId,
  )
  if (!projectExists) return false

  cancelRecycleFrames()
  pointerSession = null
  queuedNavigations = []
  activeProjectId.value = projectId
  pendingProjectId.value = null
  pendingFocusSelector.value = false
  transitionDirection.value = null
  transitionEnabled.value = true
  trackProgress.value = 0
  transitionDurationMs.value = SHOWCASE_FULL_STEP_DURATION_MS
  copyReturnProjectId.value = null
  resetArrowTapBurst()
  phase.value = 'idle'
  return true
}

const {
  restorationResult,
  handleDetailActivation,
} = useHomeNavigationMemory({
  projects: () => props.projects,
  activeProjectId,
  trackViewport,
  selectorElements,
  restoreActiveProject,
})

function resetArrowTapBurst(): void {
  lastArrowTapTimestamp = Number.NEGATIVE_INFINITY
  lastArrowTapDirection = null
  arrowTapStreak = 0
}

function queueNavigation(
  targetId: string,
  direction: ShowcaseNavigationDirection,
  focusTarget: boolean,
  durationMs: number | null,
): void {
  if (queuedNavigations.length >= 8) {
    queuedNavigations.shift()
  }

  queuedNavigations.push({
    targetId,
    direction,
    focusSelector: focusTarget,
    durationMs,
  })
}

function beginNavigation(
  targetId: string,
  direction: ShowcaseNavigationDirection,
  focusTarget = false,
  durationMs: number | null = null,
): boolean {
  const projectExists = props.projects.some(
    project => project.id === targetId,
  )
  if (!projectExists) return false

  if (phase.value === 'settling' || phase.value === 'recycling') {
    queueNavigation(targetId, direction, focusTarget, durationMs)
    return true
  }

  if (targetId === activeProjectId.value) return false
  if (phase.value === 'dragging') return false

  transitionDurationMs.value = durationMs
    ?? resolveShowcaseTransitionDurationMs(
      0,
      direction === 'next' ? 1 : -1,
    )
  pendingProjectId.value = targetId
  copyReturnProjectId.value = null
  pendingFocusSelector.value = focusTarget
  transitionDirection.value = direction
  transitionEnabled.value = true
  phase.value = 'settling'

  void nextTick(() => {
    requestAnimationFrame(() => {
      trackProgress.value = direction === 'next' ? 1 : -1
    })
  })

  return true
}

function selectProject(
  targetId: string,
  options: Readonly<{
    focusSelector?: boolean
    direction?: ShowcaseNavigationDirection | null
  }> = {},
): boolean {
  const direction = options.direction
    ?? resolveCircularDirection(targetId)

  if (direction === null) return false

  resetArrowTapBurst()

  return beginNavigation(
    targetId,
    direction,
    options.focusSelector ?? false,
  )
}

function selectAdjacent(
  direction: ShowcaseNavigationDirection,
  focusTarget = false,
  durationMs: number | null = null,
): boolean {
  const queuedBaseId = queuedNavigations.at(-1)?.targetId ?? null
  const baseProjectId = (
    phase.value === 'settling'
    || phase.value === 'recycling'
  )
    ? queuedBaseId ?? pendingProjectId.value ?? activeProjectId.value
    : activeProjectId.value

  const targetId = adjacentProjectIdFrom(baseProjectId, direction)
  if (targetId === null) return false
  return beginNavigation(
    targetId,
    direction,
    focusTarget,
    durationMs,
  )
}

function activateCopyEntry(
  payload: ProjectDetailActivationPayload,
  options: Readonly<{ bypassGestureSuppression?: boolean }> = {},
): void {
  payload.event.preventDefault()

  if (
    !options.bypassGestureSuppression
    && suppressNextCopyEntryActivation
  ) {
    suppressNextCopyEntryActivation = false
    return
  }

  if (
    !copyEntryEnabled.value
    || copyCurrentProject.value?.id !== payload.projectId
    || copyNavigationPending.value
  ) {
    return
  }

  copyNavigationPending.value = true
  handleDetailActivation(payload)

  void router.push(payload.href).then(failure => {
    if (failure) copyNavigationPending.value = false
  }).catch(() => {
    copyNavigationPending.value = false
  })
}

function onCopyEntryActivate(
  payload: ProjectDetailActivationPayload,
): void {
  activateCopyEntry(payload)
}

function onArrowNavigation(
  direction: ShowcaseNavigationDirection,
  event: MouseEvent,
): void {
  const burst = resolveShowcaseArrowBurst({
    timestamp: event.timeStamp,
    previousTimestamp: lastArrowTapTimestamp,
    direction,
    previousDirection: lastArrowTapDirection,
    previousStreak: arrowTapStreak,
  })

  lastArrowTapTimestamp = event.timeStamp
  lastArrowTapDirection = direction
  arrowTapStreak = burst.streak

  selectAdjacent(direction, false, burst.durationMs)
}

function selectBoundary(boundary: 'first' | 'last'): void {
  const target = boundary === 'first'
    ? props.projects[0]
    : props.projects[props.projects.length - 1]

  if (!target) return

  if (target.id === activeProjectId.value) {
    focusSelector(target.id)
    return
  }

  selectProject(target.id, { focusSelector: true })
}

function onSelectorKeydown(event: KeyboardEvent): void {
  resetArrowTapBurst()

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    selectAdjacent('previous', true)
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    selectAdjacent('next', true)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    selectBoundary('first')
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    selectBoundary('last')
  }
}

function resolveCopyEntryTarget(
  target: EventTarget | null,
): CopyEntryTarget | null {
  if (!(target instanceof Element)) return null

  const entry = target.closest<HTMLElement>(
    '[data-mm-ui21-copy-entry]',
  )
  if (
    entry === null
    || entry.dataset.mmUi21EntryEnabled !== 'true'
  ) {
    return null
  }

  const projectId = entry.dataset.mmUi21ProjectId
  const href = entry.dataset.mmUi21EntryHref
  if (!projectId || !href) return null

  return { projectId, href }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false

  if (target.closest('[data-mm-ui21-copy-entry]') !== null) {
    return false
  }

  return target.closest(
      'a, button, input, select, textarea, [contenteditable]',
    ) !== null
}

function onPointerDown(event: PointerEvent): void {
  resetArrowTapBurst()

  if (
    props.projects.length <= 1
    || !event.isPrimary
    || event.button !== 0
    || phase.value !== 'idle'
    || isInteractiveTarget(event.target)
    || !(event.currentTarget instanceof HTMLElement)
  ) {
    return
  }

  const surface = event.currentTarget
  const copyEntryTarget = resolveCopyEntryTarget(event.target)
  suppressNextCopyEntryActivation = false

  pointerSession = {
    pointerId: event.pointerId,
    surface,
    startX: event.clientX,
    startY: event.clientY,
    stageWidth: Math.max(surface.clientWidth, 1),
    copyEntryTarget,
    axis: 'pending',
    deltaX: 0,
    deltaY: 0,
    lastX: event.clientX,
    lastTimestamp: event.timeStamp,
    velocityX: 0,
  }

  surface.setPointerCapture(event.pointerId)
  transitionEnabled.value = false
  phase.value = 'dragging'
}

function abandonVerticalPointer(): void {
  const session = pointerSession
  if (session === null) return

  pointerSession = null
  transitionEnabled.value = true
  trackProgress.value = 0
  phase.value = 'idle'

  if (session.surface.hasPointerCapture(session.pointerId)) {
    session.surface.releasePointerCapture(session.pointerId)
  }
}

function onPointerMove(event: PointerEvent): void {
  const session = pointerSession
  if (
    session === null
    || event.pointerId !== session.pointerId
    || !event.isPrimary
  ) {
    return
  }

  session.deltaX = event.clientX - session.startX
  session.deltaY = event.clientY - session.startY

  if (session.axis === 'pending') {
    const horizontalDistance = Math.abs(session.deltaX)
    const verticalDistance = Math.abs(session.deltaY)

    if (
      Math.max(horizontalDistance, verticalDistance)
      < DRAG_AXIS_LOCK_PX
    ) {
      return
    }

    session.axis = horizontalDistance > verticalDistance
      ? 'horizontal'
      : 'vertical'

    suppressNextCopyEntryActivation = true
  }

  if (session.axis === 'vertical') {
    abandonVerticalPointer()
    return
  }

  event.preventDefault()

  const elapsed = Math.max(event.timeStamp - session.lastTimestamp, 1)
  const instantVelocity = (event.clientX - session.lastX) / elapsed
  session.velocityX = session.velocityX * 0.62 + instantVelocity * 0.38
  session.lastX = event.clientX
  session.lastTimestamp = event.timeStamp

  const progress = -session.deltaX / (session.stageWidth * 0.78)
  trackProgress.value = Math.max(
    -MAX_DRAG_PROGRESS,
    Math.min(MAX_DRAG_PROGRESS, progress),
  )
}

function releasePointerCapture(session: PointerSession): void {
  if (session.surface.hasPointerCapture(session.pointerId)) {
    session.surface.releasePointerCapture(session.pointerId)
  }
}

function settleBackToFocus(): void {
  const currentProgress = trackProgress.value

  if (currentProgress === 0) {
    transitionDurationMs.value = SHOWCASE_FULL_STEP_DURATION_MS
    transitionEnabled.value = true
    copyReturnProjectId.value = null
    phase.value = 'idle'
    return
  }

  copyReturnProjectId.value = incomingProjectId.value

  transitionDurationMs.value = resolveShowcaseTransitionDurationMs(
    currentProgress,
    0,
  )
  pendingProjectId.value = null
  pendingFocusSelector.value = false
  transitionDirection.value = null
  transitionEnabled.value = true
  phase.value = 'settling'

  void nextTick(() => {
    requestAnimationFrame(() => {
      trackProgress.value = 0
    })
  })
}

function commitPointerNavigation(
  direction: ShowcaseNavigationDirection,
): void {
  const targetId = adjacentProjectId(direction)
  if (targetId === null) {
    settleBackToFocus()
    return
  }

  const targetProgress = direction === 'next' ? 1 : -1
  transitionDurationMs.value = resolveShowcaseTransitionDurationMs(
    trackProgress.value,
    targetProgress,
  )
  pendingProjectId.value = targetId
  copyReturnProjectId.value = null
  pendingFocusSelector.value = false
  transitionDirection.value = direction
  transitionEnabled.value = true
  phase.value = 'settling'

  void nextTick(() => {
    requestAnimationFrame(() => {
      trackProgress.value = targetProgress
    })
  })
}

function onPointerUp(event: PointerEvent): void {
  const session = pointerSession
  if (
    session === null
    || event.pointerId !== session.pointerId
  ) {
    return
  }

  pointerSession = null
  releasePointerCapture(session)

  if (session.axis !== 'horizontal') {
    const copyEntryTarget = session.copyEntryTarget
    settleBackToFocus()

    if (copyEntryTarget !== null && session.axis === 'pending') {
      const project = props.projects.find(
        candidate => candidate.id === copyEntryTarget.projectId,
      ) ?? null

      if (isGatewayProject(project)) {
        suppressNextCopyEntryActivation = true
        activateCopyEntry(
          {
            event,
            projectId: project.id,
            href: copyEntryTarget.href,
          },
          { bypassGestureSuppression: true },
        )
      }
    }

    return
  }

  const shouldCommit = (
    Math.abs(trackProgress.value) >= DRAG_COMMIT_RATIO
    || Math.abs(session.velocityX) >= DRAG_VELOCITY_COMMIT
  )

  if (!shouldCommit) {
    settleBackToFocus()
    return
  }

  commitPointerNavigation(
    trackProgress.value > 0 ? 'next' : 'previous',
  )
}

function cancelPointerSession(event: PointerEvent): void {
  const session = pointerSession
  if (
    session === null
    || event.pointerId !== session.pointerId
  ) {
    return
  }

  pointerSession = null
  suppressNextCopyEntryActivation = true
  releasePointerCapture(session)
  settleBackToFocus()
}

function onLostPointerCapture(event: PointerEvent): void {
  const session = pointerSession
  if (
    session === null
    || event.pointerId !== session.pointerId
  ) {
    return
  }

  pointerSession = null
  suppressNextCopyEntryActivation = true
  settleBackToFocus()
}

function cancelRecycleFrames(): void {
  if (recycleFrameOne !== null) {
    cancelAnimationFrame(recycleFrameOne)
    recycleFrameOne = null
  }
  if (recycleFrameTwo !== null) {
    cancelAnimationFrame(recycleFrameTwo)
    recycleFrameTwo = null
  }
}

function recycleTrack(): void {
  if (phase.value !== 'settling') return

  const targetId = pendingProjectId.value

  if (targetId === null) {
    transitionDirection.value = null
    trackProgress.value = 0
    transitionDurationMs.value = SHOWCASE_FULL_STEP_DURATION_MS
    copyReturnProjectId.value = null
    phase.value = 'idle'
    return
  }

  const shouldFocus = pendingFocusSelector.value

  transitionEnabled.value = false
  phase.value = 'recycling'
  activeProjectId.value = targetId
  pendingProjectId.value = null
  pendingFocusSelector.value = false
  transitionDirection.value = null
  trackProgress.value = 0
  transitionDurationMs.value = SHOWCASE_FULL_STEP_DURATION_MS
  copyReturnProjectId.value = null

  if (shouldFocus) {
    focusSelector(targetId)
  }

  cancelRecycleFrames()
  recycleFrameOne = requestAnimationFrame(() => {
    recycleFrameOne = null
    recycleFrameTwo = requestAnimationFrame(() => {
      recycleFrameTwo = null
      transitionEnabled.value = true
      phase.value = 'idle'

      const queued = queuedNavigations.shift() ?? null
      if (queued !== null) {
        beginNavigation(
          queued.targetId,
          queued.direction,
          queued.focusSelector,
          queued.durationMs,
        )
      }
    })
  })
}

function onCardTransitionEnd(
  event: TransitionEvent,
  projectId: string,
): void {
  if (
    event.target !== event.currentTarget
    || event.propertyName !== 'transform'
    || projectId !== activeProjectId.value
    || phase.value !== 'settling'
  ) {
    return
  }

  recycleTrack()
}

onBeforeUnmount(() => {
  cancelRecycleFrames()

  if (pointerSession === null) return

  const session = pointerSession
  pointerSession = null
  releasePointerCapture(session)
})
</script>

<template>
  <section
    class="mm-showcase"
    aria-labelledby="mm-home-showcase-heading"
    data-mm-showcase
    :data-mm-showcase-count="projects.length"
    :data-mm-showcase-active-id="activeProjectId ?? ''"
    :data-mm-showcase-phase="phase"
    :data-mm-showcase-direction="transitionDirection ?? dragDirection ?? 'none'"
    :data-mm-showcase-transition="transitionEnabled ? 'enabled' : 'disabled'"
    :data-mm-showcase-duration-ms="transitionDurationMs"
    :data-mm-showcase-arrow-streak="arrowTapStreak"
    :style="showcaseStyle"
    :data-mm-navigation-restoration="restorationResult?.status ?? 'pending'"
  >
    <div class="mm-showcase__heading-row">
      <p
        id="mm-home-showcase-heading"
        class="mm-label mm-showcase__heading"
      >
        Featured Works
      </p>

      <span
        v-if="previewLabel"
        class="mm-showcase__preview-label"
      >
        {{ previewLabel }}
      </span>
    </div>

    <section
      v-if="activeProject === null"
      class="mm-showcase__empty"
      data-mm-showcase-empty
    >
      <h2 class="mm-section-title">
        대표 작업 준비 중
      </h2>

      <p class="mm-body">
        현재 공개된 대표 작업이 없습니다.
      </p>

      <NuxtLink
        class="mm-showcase__empty-link"
        to="/works"
      >
        전체 작업 보기
      </NuxtLink>
    </section>

    <div
      v-else
      ref="stageViewport"
      class="mm-showcase__magazine-viewport"
      role="tablist"
      aria-label="대표 작업 선택"
      data-mm-showcase-stage-viewport
      data-mm-showcase-magazine-track
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="cancelPointerSession"
      @lostpointercapture="onLostPointerCapture"
    >
      <div
        class="mm-showcase__ambient"
        aria-hidden="true"
      />

      <div
        v-for="(project, projectIndex) in projects"
        :key="project.id"
        class="mm-showcase__magazine-card"
        :class="{
          'mm-showcase__magazine-card--active': project.id === activeProjectId,
          'mm-showcase__magazine-card--incoming': project.id === incomingProjectId,
        }"
        :style="cardStyle(projectIndex)"
        :data-mm-card-project-id="project.id"
        :data-mm-card-active="project.id === activeProjectId ? 'true' : 'false'"
        :data-mm-card-incoming="project.id === incomingProjectId ? 'true' : 'false'"
        @transitionend="onCardTransitionEnd($event, project.id)"
      >
        <ProjectShowcaseStage
          :project="project"
          :tab-id="tabId(project.id)"
          :panel-id="panelId(project.id)"
          :ordinal="projectIndex + 1"
          :total="projects.length"
          :preview-only="previewOnly"
          :interactive="project.id === activeProjectId"
          :show-navigation="projects.length > 1"
          @detail-activate="handleDetailActivation"
          @previous="onArrowNavigation('previous', $event)"
          @next="onArrowNavigation('next', $event)"
        />

        <button
          :id="tabId(project.id)"
          :ref="element => setSelectorElement(project.id, element)"
          class="mm-showcase__magazine-selector"
          type="button"
          role="tab"
          :aria-selected="project.id === activeProjectId"
          :aria-controls="panelId(project.id)"
          :aria-label="`${project.title} 카테고리 대문 선택`"
          :tabindex="project.id === activeProjectId ? 0 : -1"
          :data-mm-project-id="project.id"
          :data-mm-active="project.id === activeProjectId ? 'true' : 'false'"
          data-mm-showcase-tab
          @click="selectProject(project.id)"
          @keydown="onSelectorKeydown"
        />
      </div>

      <GatewayShowcaseCopyStage
        v-if="copyCurrentProject"
        :current="copyCurrentProject"
        :incoming="copyIncomingProject"
        :progress="trackProgress"
        :preview-only="previewOnly"
        :entry-enabled="copyEntryEnabled"
        @detail-activate="onCopyEntryActivate"
      />

    </div>
  </section>
</template>

<style src="~/assets/css/home-showcase.css"></style>
