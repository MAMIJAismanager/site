<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'works',
})

import ProjectGrid from '~/components/project/ProjectGrid.vue'
import WorksFilterBar from '~/components/works/WorksFilterBar.vue'
import WorksResultSummary from '~/components/works/WorksResultSummary.vue'

import {
  worksCategoryOptions,
  worksRoleOptions,
  worksTagOptions,
  worksYearOptions,
} from '~/data/works-query'

import {
  useWorksQueryState,
} from '~/composables/useWorksQueryState'

import {
  useWorksNavigationMemory,
} from '~/composables/useWorksNavigationMemory'

import type {
  ProjectRole,
} from '~~/shared/constants/taxonomy'

import {
  findPortfolioGatewayCategory,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  PortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'

import type {
  WorksSort,
} from '~~/shared/query/works-query-state'

const {
  queryReady,
  evaluation,
  projects,
  state,
  activeProject,
  hasActiveFilters,
  hiddenCategoryActive,
  hiddenAccessDenied,
  patchQuery,
  replaceQuery,
  resetQuery,
} = useWorksQueryState()

const {
  restorationResult,
  handleDetailActivation,
} = useWorksNavigationMemory({
  queryReady,
  projects,
  activeProject,
  replaceQuery,
})

function submitSearch(
  value: string | null,
): void {
  void patchQuery({ q: value })
}

function changeCategory(
  value: PortfolioGatewayCategoryId | null,
): void {
  void patchQuery({ category: value })
}

function changeRole(
  value: ProjectRole | null,
): void {
  void patchQuery({ role: value })
}

function changeTag(
  value: string | null,
): void {
  void patchQuery({ tag: value })
}

function changeYear(
  value: number | null,
): void {
  void patchQuery({ year: value })
}

function changeSort(
  value: WorksSort,
): void {
  void patchQuery({ sort: value })
}

const activeGatewayCategory = computed(() => (
  state.value.category === null
    ? null
    : findPortfolioGatewayCategory(state.value.category)
))

function resetWorksQuery(): void {
  void resetQuery()
}
</script>

<template>
  <section
    class="mm-page mm-works-index"
    data-mm-page="works-index"
    :data-mm-query-ready="queryReady ? 'true' : 'false'"
    :data-mm-result-count="evaluation.resultCount"
    :data-mm-total-count="evaluation.totalCount"
    :data-mm-active-project-id="activeProject?.id"
    :data-mm-navigation-restoration="restorationResult?.status ?? 'pending'"
    :data-mm-hidden-category-active="hiddenCategoryActive ? 'true' : 'false'"
    :data-mm-hidden-access-denied="hiddenAccessDenied ? 'true' : 'false'"
  >
    <header class="mm-page__header">
      <p class="mm-label">
        Portfolio
      </p>

      <h1 class="mm-page-title">
        {{ activeGatewayCategory?.title ?? '작업' }}
      </h1>

      <p
        v-if="hiddenCategoryActive"
        class="mm-page__lead"
        data-mm-hidden-category-heading
      >
        브랜드 명판의 더블클릭으로 열린 숨은 작업실
      </p>
    </header>

    <WorksFilterBar
      :state="state"
      :category-options="worksCategoryOptions"
      :role-options="worksRoleOptions"
      :tag-options="worksTagOptions"
      :year-options="worksYearOptions"
      :has-active-filters="hasActiveFilters"
      :query-ready="queryReady"
      @submit-search="submitSearch"
      @change-category="changeCategory"
      @change-role="changeRole"
      @change-tag="changeTag"
      @change-year="changeYear"
      @change-sort="changeSort"
      @reset="resetWorksQuery"
    />

    <WorksResultSummary
      :total-count="evaluation.totalCount"
      :result-count="evaluation.resultCount"
      :has-active-filters="hasActiveFilters"
      :query-ready="queryReady"
    />

    <p
      v-if="!queryReady"
      class="mm-body"
      data-mm-query-pending
    >
      작업 목록 확인 중
    </p>

    <ProjectGrid
      v-else-if="projects.length > 0"
      :projects="projects"
      @detail-activate="handleDetailActivation"
    />

    <div
      v-else-if="queryReady && evaluation.totalCount > 0"
      class="mm-works-query-empty"
      data-mm-filtered-empty-state
    >
      <p class="mm-body">
        조건에 맞는 작업이 없습니다.
      </p>

      <button
        class="mm-works-query__button"
        type="button"
        @click="resetWorksQuery"
      >
        조건 초기화
      </button>
    </div>

    <p
      v-else
      class="mm-body"
      data-mm-empty-state
    >
      현재 공개된 작업이 없습니다.
    </p>
  </section>
</template>
