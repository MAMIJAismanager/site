<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import ResponsiveImage from './ResponsiveImage.vue'

import { useCrossMediaArbitration } from '~/composables/useCrossMediaArbitration'

import {
  createInitialVideoPlayerState,
  mapMediaErrorCode,
  reduceVideoPlayerState,
} from '~/utils/video-player-state'

import type {
  CrossMediaVideoRegistration,
} from '~/types/cross-media-arbitration'
import type {
  ResponsiveImageLoadState,
} from '~~/shared/types/responsive-image'
import type {
  VideoPlayerPresentation,
} from '~~/shared/types/video-player'
import type {
  VideoPlayerRuntimeEvent,
  VideoPlayerRuntimeState,
} from '~/utils/video-player-state'

interface Props {
  readonly presentation: VideoPlayerPresentation
}

interface Emits {
  (event: 'playback-started'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const arbitration = useCrossMediaArbitration()
const videoElement = ref<HTMLVideoElement | null>(null)
const runtimeState = ref<VideoPlayerRuntimeState>(
  createInitialVideoPlayerState(props.presentation.posterPlan !== null),
)
let arbitrationRegistration: CrossMediaVideoRegistration | null = null

function pauseForAudioPlayback(): void {
  const video = videoElement.value
  if (video === null || video.paused) return
  video.pause()
}

const arbitrationEndpoint = Object.freeze({
  get assetId(): string {
    return props.presentation.assetId
  },
  pauseForAudioPlayback,
})

const controlsVisible = computed(() => (
  runtimeState.value.activation === 'complete'
))
const activationVisible = computed(() => (
  runtimeState.value.activation !== 'complete'
))
const activationPending = computed(() => (
  runtimeState.value.activation === 'pending'
))
const frameStyle = computed(() => ({
  '--mm-video-player-ratio': `${props.presentation.intrinsicSize.width} / ${props.presentation.intrinsicSize.height}`,
}))

function dispatch(event: VideoPlayerRuntimeEvent): void {
  runtimeState.value = reduceVideoPlayerState(runtimeState.value, event)
}

function mediaErrorMessage(code: ReturnType<typeof mapMediaErrorCode>): string {
  switch (code) {
    case 'aborted':
      return '영상 불러오기가 중단되었습니다.'
    case 'network':
      return '네트워크 문제로 영상을 불러오지 못했습니다.'
    case 'decode':
      return '영상 디코딩에 실패했습니다.'
    case 'source-not-supported':
      return '이 브라우저에서 지원하는 영상 소스가 없습니다.'
    case 'play-rejected':
      return '브라우저가 영상 재생 요청을 허용하지 않았습니다.'
    case 'invalid-runtime-observation':
      return '영상 재생 상태를 올바르게 확인하지 못했습니다.'
    case 'unknown-media-error':
      return '영상을 재생하지 못했습니다.'
  }
}

function onPosterStateChange(state: ResponsiveImageLoadState): void {
  dispatch({ type: 'poster-state', state })
}

async function requestPlayback(): Promise<void> {
  const video = videoElement.value
  if (video === null || runtimeState.value.activation !== 'required') return
  dispatch({ type: 'play-requested' })
  try {
    await video.play()
  } catch {
    dispatch({
      type: 'media-error',
      code: 'play-rejected',
      message: mediaErrorMessage('play-rejected'),
    })
  }
}

function onPlay(): void {
  dispatch({ type: 'play-started' })
  try {
    arbitrationRegistration?.playbackStarted()
  } catch {
    videoElement.value?.pause()
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  emit('playback-started')
  void nextTick(() => {
    videoElement.value?.focus({ preventScroll: true })
  })
}

function onPause(): void {
  dispatch({ type: 'paused' })
  arbitrationRegistration?.playbackPaused()
}

function onEnded(): void {
  dispatch({ type: 'ended' })
  arbitrationRegistration?.playbackEnded()
}

function onMetadataObservation(): void {
  const video = videoElement.value
  if (video === null) return
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  dispatch({ type: 'metadata-ready', durationSeconds: video.duration })
}

function onTimeUpdate(): void {
  const video = videoElement.value
  if (video === null) return
  if (!Number.isFinite(video.currentTime) || video.currentTime < 0) {
    dispatch({
      type: 'media-error',
      code: 'invalid-runtime-observation',
      message: mediaErrorMessage('invalid-runtime-observation'),
    })
    return
  }
  dispatch({ type: 'time-update', currentTimeSeconds: video.currentTime })
}

function onMediaError(): void {
  const code = mapMediaErrorCode(videoElement.value?.error?.code ?? null)
  dispatch({
    type: 'media-error',
    code,
    message: mediaErrorMessage(code),
  })
}

function onFullscreenChange(): void {
  dispatch({
    type: 'fullscreen-change',
    fullscreen: document.fullscreenElement === videoElement.value,
  })
}

function onEnterPictureInPicture(): void {
  dispatch({ type: 'picture-in-picture-change', active: true })
}

function onLeavePictureInPicture(): void {
  dispatch({ type: 'picture-in-picture-change', active: false })
}

function releaseVideoSources(): void {
  const video = videoElement.value
  if (video === null) return
  video.pause()
  for (const source of video.querySelectorAll('source')) {
    source.removeAttribute('src')
  }
  video.removeAttribute('src')
  video.load()
}

watch(
  () => props.presentation,
  presentation => {
    arbitrationRegistration?.playbackPaused()
    releaseVideoSources()
    dispatch({
      type: 'source-reset',
      hasPoster: presentation.posterPlan !== null,
    })
    void nextTick(() => {
      videoElement.value?.load()
    })
  },
)

onMounted(() => {
  arbitrationRegistration = arbitration.registerVideo(arbitrationEndpoint)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  arbitrationRegistration?.dispose()
  arbitrationRegistration = null
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  releaseVideoSources()
})
</script>

<template>
  <div
    class="mm-video-player"
    :style="frameStyle"
    :data-mm-video-player-state="runtimeState.playback"
    :data-mm-video-player-activation="runtimeState.activation"
    :data-mm-video-player-readiness="runtimeState.readiness"
  >
    <video
      ref="videoElement"
      class="mm-video-player__video"
      :aria-label="presentation.label"
      :controls="controlsVisible"
      :playsinline="presentation.playsInline"
      preload="none"
      @loadedmetadata="onMetadataObservation"
      @durationchange="onMetadataObservation"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @error="onMediaError"
      @enterpictureinpicture="onEnterPictureInPicture"
      @leavepictureinpicture="onLeavePictureInPicture"
    >
      <source
        v-for="source in presentation.sources"
        :key="source.renditionId"
        :src="source.url"
        :type="source.mediaType"
      >
      이 브라우저는 HTML 비디오를 지원하지 않습니다.
    </video>

    <div
      v-if="activationVisible"
      class="mm-video-player__activation"
      data-mm-video-player-activation-overlay
    >
      <ResponsiveImage
        v-if="presentation.posterPlan !== null"
        class="mm-video-player__poster"
        :plan="presentation.posterPlan"
        @state-change="onPosterStateChange"
      />
      <div
        v-else
        class="mm-video-player__poster-placeholder mm-dark-surface"
        aria-hidden="true"
      />
      <button
        class="mm-video-player__play"
        type="button"
        :disabled="activationPending"
        @click="requestPlayback"
      >
        {{ presentation.label }} 재생
      </button>
    </div>

    <p
      v-if="runtimeState.error !== null"
      class="mm-video-player__error"
      role="status"
    >
      {{ runtimeState.error.message }}
    </p>
  </div>
</template>

<style src="~/assets/css/video-player.css"></style>
