<script setup lang="ts">
import type {
  ResolvedAssetReference,
} from '~~/shared/view/portfolio-project-view'

import WorkAssetFrame from './WorkAssetFrame.vue'

interface Props {
  readonly assets: readonly ResolvedAssetReference[]
}

defineProps<Props>()
</script>

<template>
  <section
    v-if="assets.length > 0"
    class="mm-work-section mm-work-gallery"
    data-mm-work-gallery
  >
    <h2 class="mm-work-section__title">
      갤러리
    </h2>

    <ol class="mm-work-gallery__list">
      <li
        v-for="(asset, index) in assets"
        :key="asset.id"
        class="mm-work-gallery__item"
      >
        <WorkAssetFrame
          :asset="asset"
          context-label="갤러리"
          :index-label="`${index + 1}`"
        />
      </li>
    </ol>
  </section>
</template>
