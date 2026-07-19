<script setup lang="ts">
import { computed } from 'vue'

import MediaFrame from '~/components/media/MediaFrame.vue'
import {
  MM_PROJECT_CARD_IMAGE_SIZES,
  resolvePortfolioImagePresentation,
} from '~/data/portfolio-media-presentation'

import type {
  ResolvedImageAssetReference,
} from '~~/shared/view/portfolio-project-view'

interface ProjectCardMediaProps {
  readonly cover: ResolvedImageAssetReference
  readonly index: number
}

const props = defineProps<ProjectCardMediaProps>()

const imagePlan = computed(() => (
  resolvePortfolioImagePresentation(
    props.cover,
    'thumbnail',
    {
      sizes: MM_PROJECT_CARD_IMAGE_SIZES,
      accessibility: { mode: 'decorative' },
      loading: props.index === 0 ? 'eager' : 'lazy',
      fetchPriority: props.index === 0 ? 'high' : 'auto',
      fit: 'cover',
    },
  )
))
</script>

<template>
  <MediaFrame
    class="mm-project-card-media"
    :image-plan="imagePlan"
    :frame-ratio="{ width: 4, height: 3 }"
    state-label=""
    data-mm-project-card-media
    data-mm-project-card-media-placeholder
  />
</template>
