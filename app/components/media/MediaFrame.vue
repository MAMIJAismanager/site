<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ResponsiveImage from './ResponsiveImage.vue'

import type {
  ResponsiveImageLoadState,
  ResponsiveImageRenderPlan,
} from '~~/shared/types/responsive-image'

type MediaFrameState =
  | 'unbound'
  | 'loading'
  | 'loaded'
  | 'error'

interface Props {
  readonly imagePlan: ResponsiveImageRenderPlan | null
  readonly frameRatio: Readonly<{
    width: number
    height: number
  }>
  readonly stateLabel: string
}

const props = defineProps<Props>()
const childState = ref<ResponsiveImageLoadState>('loading')

function assertFrameDimension(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`Invalid MediaFrame ${name}: ${value}`)
  }
  return value
}

const frameStyle = computed(() => {
  const width = assertFrameDimension(props.frameRatio.width, 'width')
  const height = assertFrameDimension(props.frameRatio.height, 'height')
  return {
    '--mm-media-frame-ratio': `${width} / ${height}`,
    '--mm-media-frame-fit': props.imagePlan?.fit ?? 'cover',
  }
})

const frameState = computed<MediaFrameState>(() => (
  props.imagePlan === null
    ? 'unbound'
    : childState.value
))

const showErrorLabel = computed(() => (
  frameState.value === 'error'
  && props.imagePlan !== null
  && !props.imagePlan.ariaHidden
))

watch(
  () => props.imagePlan,
  () => {
    childState.value = 'loading'
  },
)

function onStateChange(state: ResponsiveImageLoadState): void {
  childState.value = state
}
</script>

<template>
  <div
    class="mm-media-frame"
    :style="frameStyle"
    :data-mm-media-frame-state="frameState"
    :data-mm-media-frame-label="stateLabel"
  >
    <ResponsiveImage
      v-if="imagePlan !== null"
      :plan="imagePlan"
      @state-change="onStateChange"
    />

    <span
      v-if="imagePlan === null && stateLabel"
      class="mm-media-frame__state-label"
      aria-hidden="true"
    >
      {{ stateLabel }}
    </span>

    <span
      v-if="showErrorLabel"
      class="mm-media-frame__error-label"
      role="status"
    >
      이미지를 불러오지 못했습니다.
    </span>
  </div>
</template>

<style src="~/assets/css/media-frame.css"></style>
