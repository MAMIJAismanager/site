<script setup lang="ts">
import { ref, watch } from 'vue'

import type {
  ResponsiveImageLoadState,
  ResponsiveImageRenderPlan,
} from '~~/shared/types/responsive-image'

interface Props {
  readonly plan: ResponsiveImageRenderPlan
}

interface Emits {
  (
    event: 'state-change',
    state: ResponsiveImageLoadState,
  ): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const state = ref<ResponsiveImageLoadState>('loading')

function setState(nextState: ResponsiveImageLoadState): void {
  if (state.value === nextState) return
  state.value = nextState
  emit('state-change', nextState)
}

watch(
  () => props.plan.fallback.url,
  () => {
    state.value = 'loading'
    emit('state-change', 'loading')
  },
)
</script>

<template>
  <picture
    data-mm-responsive-image
    :data-mm-responsive-image-state="state"
  >
    <source
      v-for="sourceSet in plan.sourceSets"
      :key="sourceSet.mediaType"
      :type="sourceSet.mediaType"
      :srcset="sourceSet.srcset"
      :sizes="plan.sizes"
    >
    <img
      :src="plan.fallback.url"
      :srcset="plan.fallback.srcset ?? undefined"
      :sizes="plan.sizes"
      :width="plan.intrinsicSize.width"
      :height="plan.intrinsicSize.height"
      :alt="plan.alt"
      :aria-hidden="plan.ariaHidden ? 'true' : undefined"
      :loading="plan.loading"
      :fetchpriority="plan.fetchPriority"
      decoding="async"
      @load="setState('loaded')"
      @error="setState('error')"
    >
  </picture>
</template>
