import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  readonly,
  ref,
  toRaw,
  watch,
} from 'vue'

import {
  useRoute,
} from '#imports'

import {
  useClientNavigationMemoryStore,
} from '~/composables/useClientNavigationMemoryStore'

import {
  createCurrentNavigationRouteKey,
  createNavigationRestorationPlan,
  entryMatches,
  executeHomeDetailActivation,
  runHomeNavigationRestoration,
} from '~/utils/navigation-restoration'

import type {
  NavigationRestorationResult,
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  Ref,
} from 'vue'

import type {
  ShowcaseProjectView,
} from '~~/shared/view/portfolio-project-view'

import type { ProjectId } from '~~/shared/types/domain-identifiers'

interface UseHomeNavigationMemoryOptions {
  readonly projects: () => readonly ShowcaseProjectView[]
  readonly activeProjectId: Ref<ProjectId | null>
  readonly trackViewport: Ref<HTMLElement | null>
  readonly selectorElements: ReadonlyMap<ProjectId, HTMLButtonElement>
  readonly restoreActiveProject: (projectId: ProjectId) => boolean
}

export function useHomeNavigationMemory(
  options: UseHomeNavigationMemoryOptions,
) {
  const route = useRoute()
  const navigationMemoryStore = useClientNavigationMemoryStore()
  const restorationResult = ref<NavigationRestorationResult | null>(null)

  let mounted = false
  let disposed = false
  let restoreAttempted = false
  let restoreGeneration = 0

  function currentRouteKey() {
    return createCurrentNavigationRouteKey(
      route.path,
      route.query,
    )
  }

  function readMutableNavigationMemoryStore() {
    return toRaw(navigationMemoryStore).value
  }

  function readDocumentScrollTop(): number {
    const scrollingElement = document.scrollingElement
    return scrollingElement === null
      ? window.scrollY
      : scrollingElement.scrollTop
  }

  function handleDetailActivation(
    payload: ProjectDetailActivationPayload,
  ): void {
    const store = readMutableNavigationMemoryStore()
    if (store === null) return

    executeHomeDetailActivation(
      payload,
      options.activeProjectId.value,
      {
        readDocumentScrollTop,
        readRailScrollLeft: () => (
          options.trackViewport.value?.scrollLeft ?? null
        ),
        currentRouteKey,
        capture: entry => {
          store.capture(entry)
          if (!entryMatches(store.entry, entry)) {
            throw new Error(
              'home-navigation-memory-capture-not-acknowledged',
            )
          }
        },
        clear: () => {
          store.clear()
        },
      },
    )
  }

  function requestFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve())
    })
  }

  async function attemptRestoration(): Promise<void> {
    if (
      !mounted
      || restoreAttempted
      || navigationMemoryStore.value === null
    ) return
    restoreAttempted = true

    const store = readMutableNavigationMemoryStore()
    if (store === null) return
    const hadEntry = store.entry !== null
    const entry = store.consumeForRoute(currentRouteKey())

    if (entry === null) {
      restorationResult.value = Object.freeze({
        status: hadEntry ? 'route-mismatch' : 'no-entry',
      })
      return
    }

    if (store.entry !== null) {
      restorationResult.value = Object.freeze({
        status: 'cancelled',
        origin: 'home',
      })
      return
    }

    const plan = createNavigationRestorationPlan(entry)
    if (plan.origin !== 'home') {
      restorationResult.value = Object.freeze({
        status: 'route-mismatch',
      })
      return
    }

    const generation = ++restoreGeneration
    restorationResult.value = await runHomeNavigationRestoration(
      plan,
      {
        isCurrent: () => (
          !disposed
          && generation === restoreGeneration
        ),
        nextTick: async () => {
          await nextTick()
        },
        requestFrame,
        hasProject: projectId => (
          options.projects().some(
            project => project.id === projectId,
          )
        ),
        hasRailAndFocusTarget: projectId => (
          options.trackViewport.value !== null
          && options.selectorElements.has(projectId)
        ),
        activateProject: options.restoreActiveProject,
        scrollRail: left => {
          options.trackViewport.value?.scrollTo({
            left,
            top: 0,
            behavior: 'auto',
          })
        },
        scrollDocument: top => {
          window.scrollTo({
            top,
            left: 0,
            behavior: 'auto',
          })
        },
        focusProject: projectId => {
          options.selectorElements.get(projectId)?.focus({
            preventScroll: true,
          })
        },
      },
    )
  }

  onMounted(() => {
    mounted = true
    void attemptRestoration()
  })

  watch(
    () => navigationMemoryStore.value,
    store => {
      if (store !== null) void attemptRestoration()
    },
  )

  watch(
    () => route.fullPath,
    () => {
      restoreGeneration += 1
    },
    { flush: 'sync' },
  )

  onBeforeUnmount(() => {
    disposed = true
    restoreGeneration += 1
  })

  return {
    restorationResult: readonly(restorationResult),
    handleDetailActivation,
  }
}
