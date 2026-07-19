import {
  navigationRouteKeyAuthority,
} from '~~/shared/navigation/navigation-route-key'

import {
  isProjectId,
  isProjectSlug,
} from '~~/shared/schema/domain-identifiers'

import type {
  HomeDetailActivationPort,
  HomeDetailActivationResult,
  HomeRestorationPort,
  NavigationLayoutSettlePort,
  NavigationRestorationPlan,
  NavigationRestorationResult,
  ProjectDetailActivationPayload,
  WorkReturnTarget,
  WorksRestorationPort,
} from '~/types/navigation-restoration'

import type {
  NavigationMemoryEntry,
  NavigationRawQuery,
  NavigationRawQueryValue,
  NavigationRouteKey,
} from '~~/shared/types/navigation-memory'

import type { ProjectId } from '~~/shared/types/domain-identifiers'

const WORK_DETAIL_PREFIX = '/works/'

export function createNavigationCaptureEntry(
  input: NavigationMemoryEntry,
): NavigationMemoryEntry {
  const parsed = navigationRouteKeyAuthority.parse(input.routeKey)

  if (!isProjectId(input.activeProjectId)) {
    throw new TypeError('invalid-navigation-project-id')
  }
  if (!isFiniteNonNegativeObservation(input.documentScrollTop)) {
    throw new TypeError('invalid-document-scroll-top')
  }
  if (
    input.railScrollLeft !== null
    && !isFiniteNonNegativeObservation(input.railScrollLeft)
  ) {
    throw new TypeError('invalid-rail-scroll-left')
  }

  const projectValues = parsed.query.project ?? []
  if (parsed.path === '/works') {
    if (input.railScrollLeft !== null) {
      throw new TypeError('works-rail-scroll-left-not-null')
    }
    if (projectValues.length !== 1) {
      throw new TypeError(
        projectValues.length === 0
          ? 'missing-works-project-query'
          : 'multiple-works-project-query-values',
      )
    }
    if (projectValues[0] !== input.activeProjectId) {
      throw new TypeError('works-project-query-mismatch')
    }
  } else if (projectValues.length > 0) {
    throw new TypeError('home-project-query-not-allowed')
  }

  return Object.freeze({
    routeKey: input.routeKey,
    activeProjectId: input.activeProjectId,
    documentScrollTop: input.documentScrollTop,
    railScrollLeft: input.railScrollLeft,
  })
}

function sameMemoryEntry(
  left: NavigationMemoryEntry,
  right: NavigationMemoryEntry,
): boolean {
  return (
    left.routeKey === right.routeKey
    && left.activeProjectId === right.activeProjectId
    && left.documentScrollTop === right.documentScrollTop
    && left.railScrollLeft === right.railScrollLeft
  )
}

export function isEligibleSameTabDetailActivation(
  event: Pick<MouseEvent,
    | 'altKey'
    | 'button'
    | 'cancelable'
    | 'ctrlKey'
    | 'defaultPrevented'
    | 'metaKey'
    | 'shiftKey'
  >,
): boolean {
  return (
    !event.defaultPrevented
    && event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
    && event.cancelable
  )
}

export function isCanonicalWorkDetailHref(
  href: string,
): boolean {
  if (!href.startsWith(WORK_DETAIL_PREFIX)) return false
  const slug = href.slice(WORK_DETAIL_PREFIX.length)
  return !slug.includes('/') && isProjectSlug(slug)
}

export function isFiniteNonNegativeObservation(
  value: unknown,
): value is number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
  )
}

export function toNavigationRawQuery(
  query: Readonly<Record<string, unknown>>,
): NavigationRawQuery {
  const output: Record<string, NavigationRawQueryValue> = {}

  for (const [key, value] of Object.entries(query)) {
    if (
      value === undefined
      || value === null
      || typeof value === 'string'
    ) {
      output[key] = value
      continue
    }

    if (
      Array.isArray(value)
      && value.every(item => (
        item === undefined
        || item === null
        || typeof item === 'string'
      ))
    ) {
      output[key] = [...value] as readonly (string | null | undefined)[]
      continue
    }

    throw new TypeError(`invalid-navigation-route-query-value: query.${key}`)
  }

  return output
}

export function createCurrentNavigationRouteKey(
  path: string,
  query: Readonly<Record<string, unknown>>,
): NavigationRouteKey {
  return navigationRouteKeyAuthority.create({
    path,
    query: toNavigationRawQuery(query),
  })
}

export function createNavigationRestorationPlan(
  entry: NavigationMemoryEntry,
): NavigationRestorationPlan {
  const parsed = navigationRouteKeyAuthority.parse(entry.routeKey)

  if (parsed.path === '/works') {
    return Object.freeze({
      origin: 'works',
      routeKey: entry.routeKey,
      activeProjectId: entry.activeProjectId,
      documentScrollTop: entry.documentScrollTop,
      railScrollLeft: null,
    })
  }

  return Object.freeze({
    origin: 'home',
    routeKey: entry.routeKey,
    activeProjectId: entry.activeProjectId,
    documentScrollTop: entry.documentScrollTop,
    railScrollLeft: entry.railScrollLeft,
  })
}

export function deriveWorkReturnTarget(
  currentProjectId: ProjectId,
  entry: NavigationMemoryEntry | null,
): WorkReturnTarget {
  if (
    entry === null
    || entry.activeProjectId !== currentProjectId
  ) {
    return Object.freeze({
      href: '/works',
      label: '전체 작업 보기',
      origin: 'fallback',
      usesMemory: false,
    })
  }

  let parsed: ReturnType<typeof navigationRouteKeyAuthority.parse>
  try {
    parsed = navigationRouteKeyAuthority.parse(entry.routeKey)
  } catch {
    return Object.freeze({
      href: '/works',
      label: '전체 작업 보기',
      origin: 'fallback',
      usesMemory: false,
    })
  }

  if (parsed.path === '/works') {
    return Object.freeze({
      href: entry.routeKey,
      label: '작업 목록으로 돌아가기',
      origin: 'works',
      usesMemory: true,
    })
  }

  return Object.freeze({
    href: entry.routeKey,
    label: '대표 작업으로 돌아가기',
    origin: 'home',
    usesMemory: true,
  })
}

export function executeHomeDetailActivation(
  payload: ProjectDetailActivationPayload,
  activeProjectId: ProjectId | null,
  port: HomeDetailActivationPort,
): HomeDetailActivationResult {
  if (
    !isEligibleSameTabDetailActivation(payload.event)
    || !isCanonicalWorkDetailHref(payload.href)
    || activeProjectId !== payload.projectId
  ) {
    return Object.freeze({ status: 'native' })
  }

  const documentScrollTop = port.readDocumentScrollTop()
  const railScrollLeft = port.readRailScrollLeft()

  if (
    !isFiniteNonNegativeObservation(documentScrollTop)
    || (
      railScrollLeft !== null
      && !isFiniteNonNegativeObservation(railScrollLeft)
    )
  ) {
    port.clear()
    return Object.freeze({ status: 'native' })
  }

  try {
    const entry = createNavigationCaptureEntry({
      routeKey: port.currentRouteKey(),
      activeProjectId: payload.projectId,
      documentScrollTop,
      railScrollLeft,
    })
    port.capture(entry)
    return Object.freeze({ status: 'captured', entry })
  } catch {
    port.clear()
    return Object.freeze({ status: 'native' })
  }
}

export async function settleNavigationLayout(
  port: NavigationLayoutSettlePort,
): Promise<boolean> {
  if (!port.isCurrent()) return false
  await port.nextTick()
  if (!port.isCurrent()) return false
  await port.requestFrame()
  if (!port.isCurrent()) return false
  await port.requestFrame()
  return port.isCurrent()
}

export async function runWorksNavigationRestoration(
  plan: Extract<NavigationRestorationPlan, { origin: 'works' }>,
  port: WorksRestorationPort,
): Promise<NavigationRestorationResult> {
  if (!port.hasProject(plan.activeProjectId)) {
    return Object.freeze({
      status: 'target-missing',
      origin: 'works',
    })
  }

  if (!await settleNavigationLayout(port)) {
    return Object.freeze({
      status: 'cancelled',
      origin: 'works',
    })
  }

  if (!port.hasFocusTarget(plan.activeProjectId)) {
    return Object.freeze({
      status: 'target-missing',
      origin: 'works',
    })
  }

  port.scrollDocument(plan.documentScrollTop)
  port.focusProject(plan.activeProjectId)

  return Object.freeze({
    status: 'restored',
    origin: 'works',
  })
}

export async function runHomeNavigationRestoration(
  plan: Extract<NavigationRestorationPlan, { origin: 'home' }>,
  port: HomeRestorationPort,
): Promise<NavigationRestorationResult> {
  if (
    !port.hasProject(plan.activeProjectId)
    || !port.hasRailAndFocusTarget(plan.activeProjectId)
  ) {
    return Object.freeze({
      status: 'target-missing',
      origin: 'home',
    })
  }

  if (!port.activateProject(plan.activeProjectId)) {
    return Object.freeze({
      status: 'target-missing',
      origin: 'home',
    })
  }

  if (!await settleNavigationLayout(port)) {
    return Object.freeze({
      status: 'cancelled',
      origin: 'home',
    })
  }

  if (!port.hasRailAndFocusTarget(plan.activeProjectId)) {
    return Object.freeze({
      status: 'target-missing',
      origin: 'home',
    })
  }

  if (plan.railScrollLeft !== null) {
    port.scrollRail(plan.railScrollLeft)
  }
  port.scrollDocument(plan.documentScrollTop)
  port.focusProject(plan.activeProjectId)

  return Object.freeze({
    status: 'restored',
    origin: 'home',
  })
}

export function entryMatches(
  current: NavigationMemoryEntry | null,
  expected: NavigationMemoryEntry,
): boolean {
  return current !== null && sameMemoryEntry(current, expected)
}
