<script setup lang="ts">
import { computed } from 'vue'

import AudioTrackAction from '~/components/player/AudioTrackAction.vue'
import MediaFrame from '~/components/media/MediaFrame.vue'
import VideoPlayer from '~/components/media/VideoPlayer.vue'
import {
  MM_WORK_DETAIL_IMAGE_SIZES,
  resolvePortfolioAudioTrack,
  resolvePortfolioImagePresentation,
  resolvePortfolioVideoPresentation,
} from '~/data/portfolio-media-presentation'

import type { ProjectId } from '~~/shared/types/domain-identifiers'
import type {
  ResolvedAssetReference,
  ResolvedImageAssetReference,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly asset: ResolvedAssetReference
  readonly contextLabel: string
  readonly indexLabel?: string
  readonly projectId?: ProjectId
  readonly videoRuntime?: 'disabled' | 'primary-detail'
  readonly audioRuntime?: 'disabled' | 'primary-detail'
}

const props = withDefaults(defineProps<Props>(), {
  indexLabel: undefined,
  projectId: undefined,
  videoRuntime: 'disabled',
  audioRuntime: 'disabled',
})

const kindLabel = computed(() => {
  switch (props.asset.kind) {
    case 'image':
      return '이미지'
    case 'video':
      return '영상'
    case 'audio':
      return '오디오'
  }
})

const previewAsset = computed<ResolvedImageAssetReference | null>(() => {
  switch (props.asset.kind) {
    case 'image':
      return props.asset
    case 'video':
      return props.asset.poster
    case 'audio':
      return props.asset.artwork
  }
})

const frameRatio = computed(() => {
  const preview = previewAsset.value
  if (preview !== null) {
    return Object.freeze({
      width: preview.defaultRendition.metadata.width,
      height: preview.defaultRendition.metadata.height,
    })
  }
  if (props.asset.kind === 'video') {
    return Object.freeze({
      width: props.asset.defaultRendition.metadata.width,
      height: props.asset.defaultRendition.metadata.height,
    })
  }
  return Object.freeze({ width: 1, height: 1 })
})

const imagePlan = computed(() => {
  const preview = previewAsset.value
  if (preview === null) return null
  return resolvePortfolioImagePresentation(
    preview,
    'primary',
    {
      sizes: MM_WORK_DETAIL_IMAGE_SIZES,
      accessibility: {
        mode: 'informative',
        altText: preview.altText ?? '',
      },
      loading: props.contextLabel === '대표 이미지' ? 'eager' : 'lazy',
      fetchPriority: props.contextLabel === '대표 이미지' ? 'high' : 'auto',
      fit: 'contain',
    },
  )
})

const videoPresentation = computed(() => {
  if (
    props.videoRuntime !== 'primary-detail'
    || props.asset.kind !== 'video'
  ) {
    return null
  }
  return resolvePortfolioVideoPresentation(props.asset)
})


const audioTrack = computed(() => {
  if (
    props.audioRuntime !== 'primary-detail'
    || props.asset.kind !== 'audio'
    || props.projectId === undefined
  ) {
    return null
  }
  return resolvePortfolioAudioTrack(props.asset, props.projectId)
})

const audioArtworkState = computed(() => {
  if (props.asset.kind !== 'audio') return undefined
  return props.asset.artwork === null ? undefined : 'present'
})
</script>

<template>
  <figure
    class="mm-work-asset-frame"
    data-mm-work-asset-frame
    :data-mm-work-asset-context="contextLabel"
    :data-mm-work-asset-kind="asset.kind"
    :data-mm-work-asset-id="asset.id"
    :data-mm-work-audio-artwork="audioArtworkState"
    :data-mm-video-runtime="videoRuntime"
    :data-mm-audio-runtime="audioRuntime"
  >
    <VideoPlayer
      v-if="videoPresentation !== null"
      :presentation="videoPresentation"
    />
    <MediaFrame
      v-else
      class="mm-work-asset-frame__surface mm-dark-surface"
      :image-plan="imagePlan"
      :frame-ratio="frameRatio"
      :state-label="`${kindLabel} 영역`"
    />

    <AudioTrackAction
      v-if="audioTrack !== null"
      :track="audioTrack"
    />

    <figcaption class="mm-work-asset-frame__caption">
      <p class="mm-work-asset-frame__context">
        <span v-if="indexLabel">{{ indexLabel }} · </span>{{ contextLabel }} · {{ kindLabel }}
      </p>
      <p class="mm-work-asset-frame__label">
        {{ asset.label }}
      </p>
      <p
        v-if="asset.caption !== null"
        class="mm-work-asset-frame__editorial"
      >
        {{ asset.caption }}
      </p>
      <p
        v-if="asset.credit !== null"
        class="mm-work-asset-frame__credit"
      >
        {{ asset.credit }}
      </p>
    </figcaption>
  </figure>
</template>
