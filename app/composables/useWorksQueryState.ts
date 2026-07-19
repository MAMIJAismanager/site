import {
  computed,
  onMounted,
  readonly,
  ref,
  shallowRef,
  watch,
} from 'vue'

import type {
  ComputedRef,
  Ref,
} from 'vue'

import type {
  LocationQuery,
  LocationQueryRaw,
} from 'vue-router'

import {
  useRoute,
  useRouter,
} from '#imports'

import {
  hasHiddenCategoryCapability,
} from '~/composables/useHiddenCategoryCapability'

import {
  allWorksProjectQueryAuthority,
  worksProjectQueryAuthority,
} from '~/data/works-query'

import {
  HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
  isHiddenPortfolioGatewayCategoryId,
} from '~~/shared/constants/portfolio-gateway-categories'

import {
  WORKS_QUERY_KEYS,
} from '~~/shared/query/works-query-state'

import type {
  WorksProjectQueryAuthority,
  WorksQueryEvaluation,
} from '~~/shared/query/works-project-query'

import type {
  WorksQueryState,
  WorksRawQuery,
  WorksRawQueryValue,
} from '~~/shared/query/works-query-state'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

export interface UseWorksQueryStateResult {
  readonly queryReady: Readonly<Ref<boolean>>
  readonly evaluation: Readonly<Ref<WorksQueryEvaluation>>
  readonly projects: ComputedRef<readonly ProjectCardView[]>
  readonly state: ComputedRef<WorksQueryState>
  readonly activeProject: ComputedRef<ProjectCardView | null>
  readonly hasActiveFilters: ComputedRef<boolean>
  readonly hiddenCategoryActive: ComputedRef<boolean>
  readonly hiddenAccessDenied: Readonly<Ref<boolean>>

  patchQuery(patch: Partial<WorksQueryState>): Promise<void>
  replaceQuery(patch: Partial<WorksQueryState>): Promise<void>
  resetQuery(): Promise<void>
}

function isOfficialKey(key: string): boolean {
  return (WORKS_QUERY_KEYS as readonly string[]).includes(key)
}

function toWorksRawQuery(query: LocationQuery): WorksRawQuery {
  const output: Record<string, WorksRawQueryValue> = {}
  for (const key of WORKS_QUERY_KEYS) {
    const value = query[key]
    output[key] = Array.isArray(value) ? [...value] : value
  }
  return output
}

function rawValueSignature(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [
      'array',
      ...value.map(item => (
        item === null ? ['null'] : ['string', item]
      )),
    ]
  }
  if (value === undefined) return ['undefined']
  if (value === null) return ['null']
  return ['string', String(value)]
}

function officialQuerySignature(
  query: Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify(
    WORKS_QUERY_KEYS.map(key => [key, rawValueSignature(query[key])]),
  )
}

function completeQuerySignature(
  query: Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify(
    Object.keys(query).sort().map(key => [key, rawValueSignature(query[key])]),
  )
}

function mergeCanonicalOfficialQuery(
  current: LocationQuery,
  canonical: Readonly<Record<string, string>>,
): LocationQueryRaw {
  const output: LocationQueryRaw = {}

  for (const [key, value] of Object.entries(current)) {
    if (isOfficialKey(key)) continue
    output[key] = Array.isArray(value) ? [...value] : value
  }

  for (const key of WORKS_QUERY_KEYS) {
    const value = canonical[key]
    if (value !== undefined) output[key] = value
  }

  return output
}

function patchState(
  current: WorksQueryState,
  patch: Partial<WorksQueryState>,
): WorksQueryState {
  return {
    q: Object.hasOwn(patch, 'q') ? patch.q ?? null : current.q,
    category: Object.hasOwn(patch, 'category')
      ? patch.category ?? null
      : current.category,
    role: Object.hasOwn(patch, 'role') ? patch.role ?? null : current.role,
    tag: Object.hasOwn(patch, 'tag') ? patch.tag ?? null : current.tag,
    year: Object.hasOwn(patch, 'year') ? patch.year ?? null : current.year,
    sort: Object.hasOwn(patch, 'sort') ? patch.sort ?? 'order' : current.sort,
    project: Object.hasOwn(patch, 'project')
      ? patch.project ?? null
      : current.project,
  }
}

function rawCategory(query: LocationQuery): string | null {
  const value = query.category
  if (Array.isArray(value)) return value.length === 1 ? value[0] ?? null : null
  return typeof value === 'string' ? value : null
}

function authorityForCategory(
  category: WorksQueryState['category'],
): WorksProjectQueryAuthority {
  if (
    category !== null
    && isHiddenPortfolioGatewayCategoryId(category)
    && hasHiddenCategoryCapability()
  ) {
    return allWorksProjectQueryAuthority
  }

  return worksProjectQueryAuthority
}

export function useWorksQueryState(): UseWorksQueryStateResult {
  const route = useRoute()
  const router = useRouter()

  const queryReady = ref(false)
  const hiddenAccessDenied = ref(false)
  const evaluation = shallowRef(
    worksProjectQueryAuthority.evaluate({}),
  )

  let mounted = false
  let repairInFlight = false

  async function syncFromRoute(): Promise<void> {
    const requestedCategory = rawCategory(route.query)
    const requestsHiddenCategory = (
      requestedCategory === HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID
    )

    if (
      requestsHiddenCategory
      && !hasHiddenCategoryCapability()
    ) {
      hiddenAccessDenied.value = true
      evaluation.value = worksProjectQueryAuthority.evaluate({})
      queryReady.value = true

      if (!repairInFlight) {
        repairInFlight = true
        try {
          await router.replace({
            path: '/works',
            query: mergeCanonicalOfficialQuery(route.query, {}),
          })
        } finally {
          repairInFlight = false
        }
      }
      return
    }

    hiddenAccessDenied.value = false
    const authority = requestsHiddenCategory
      ? allWorksProjectQueryAuthority
      : worksProjectQueryAuthority
    const nextEvaluation = authority.evaluate(
      toWorksRawQuery(route.query),
    )

    evaluation.value = nextEvaluation

    const currentOfficialSignature = officialQuerySignature(route.query)
    const canonicalOfficialSignature = officialQuerySignature(
      nextEvaluation.canonicalQuery,
    )

    if (
      currentOfficialSignature !== canonicalOfficialSignature
      && !repairInFlight
    ) {
      repairInFlight = true
      try {
        await router.replace({
          query: mergeCanonicalOfficialQuery(
            route.query,
            nextEvaluation.canonicalQuery,
          ),
        })
      } finally {
        repairInFlight = false
      }
    }

    queryReady.value = true
  }

  onMounted(() => {
    mounted = true
    void syncFromRoute()
  })

  watch(
    () => officialQuerySignature(route.query),
    () => {
      if (!mounted || repairInFlight) return
      void syncFromRoute()
    },
  )

  async function navigateQuery(
    patch: Partial<WorksQueryState>,
    mode: 'push' | 'replace',
  ): Promise<void> {
    const candidateState = patchState(evaluation.value.state, patch)
    const authority = authorityForCategory(candidateState.category)
    const nextEvaluation = authority.evaluate(
      authority.serialize(candidateState),
    )
    const nextQuery = mergeCanonicalOfficialQuery(
      route.query,
      nextEvaluation.canonicalQuery,
    )

    if (completeQuerySignature(route.query) === completeQuerySignature(nextQuery)) {
      return
    }

    if (mode === 'replace') {
      await router.replace({ query: nextQuery })
    } else {
      await router.push({ query: nextQuery })
    }
  }

  async function patchQuery(patch: Partial<WorksQueryState>): Promise<void> {
    await navigateQuery(patch, 'push')
  }

  async function replaceQuery(patch: Partial<WorksQueryState>): Promise<void> {
    await navigateQuery(patch, 'replace')
  }

  async function resetQuery(): Promise<void> {
    const nextQuery = mergeCanonicalOfficialQuery(route.query, {})
    if (completeQuerySignature(route.query) === completeQuerySignature(nextQuery)) {
      return
    }
    await router.push({ query: nextQuery })
  }

  return {
    queryReady: readonly(queryReady),
    evaluation: readonly(evaluation),
    projects: computed(() => evaluation.value.projects),
    state: computed(() => evaluation.value.state),
    activeProject: computed(() => evaluation.value.activeProject),
    hasActiveFilters: computed(() => evaluation.value.hasActiveFilters),
    hiddenCategoryActive: computed(() => (
      evaluation.value.state.category === HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID
      && hasHiddenCategoryCapability()
    )),
    hiddenAccessDenied: readonly(hiddenAccessDenied),
    patchQuery,
    replaceQuery,
    resetQuery,
  }
}
