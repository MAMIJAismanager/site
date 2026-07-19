<script setup lang="ts">
interface WorksResultSummaryProps {
  readonly totalCount: number
  readonly resultCount: number
  readonly hasActiveFilters: boolean
  readonly queryReady: boolean
}

defineProps<WorksResultSummaryProps>()
</script>

<template>
  <p
    class="mm-works-result-summary"
    data-mm-works-result-summary
    aria-live="polite"
    aria-atomic="true"
  >
    <template v-if="hasActiveFilters">
      총 {{ totalCount }}개 중 {{ resultCount }}개의 작업
    </template>
    <template v-else>
      총 {{ totalCount }}개의 작업
    </template>
    <span class="mm-works-result-summary__status">
      {{ queryReady ? '' : ' · 조건을 불러오는 중' }}
    </span>
  </p>
</template>
