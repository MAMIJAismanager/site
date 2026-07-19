<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { storeToRefs } from 'pinia'

import { useCrossMediaArbitration } from '~/composables/useCrossMediaArbitration'
import { usePlayerStore } from '~/stores/player'
import {
  audioRuntimeErrorMessage,
  formatPlayerTime,
  mapAudioMediaErrorCode,
  parseAudioEpoch,
  readBufferedUntilSeconds,
} from '~/utils/global-audio-runtime'

import type {
  CrossMediaAudioRegistration,
} from '~/types/cross-media-arbitration'
import type {
  PlayerRuntimeErrorCode,
  PlayerSeekRequest,
  PlayerTransportRequest,
} from '~~/shared/types/player-store'

const arbitration = useCrossMediaArbitration()
const player = usePlayerStore()
const {
  bufferedUntilSeconds,
  currentTimeSeconds,
  currentTrack,
  durationSeconds,
  error,
  muted,
  pendingSeek,
  pendingTransport,
  phase,
  trackEpoch,
  volume,
} = storeToRefs(player)

const audioElement = ref<HTMLAudioElement | null>(null)
const seekDraftSeconds = ref(0)
const seekEditing = ref(false)
const consumedTransport = new WeakMap<HTMLAudioElement, Set<number>>()
const consumedSeek = new WeakMap<HTMLAudioElement, Set<number>>()
let disposed = false
let arbitrationRegistration: CrossMediaAudioRegistration | null = null

const hasTrack = computed(() => currentTrack.value !== null)
const isPlayingIntent = computed(() => (
  phase.value === 'playing' || phase.value === 'play-requested'
))
const currentTimeLabel = computed(() => formatPlayerTime(currentTimeSeconds.value))
const durationLabel = computed(() => formatPlayerTime(durationSeconds.value))
const seekMaximum = computed(() => durationSeconds.value ?? 0)
const bufferedRatio = computed(() => {
  const duration = durationSeconds.value
  if (duration === null || duration <= 0) return 0
  return Math.min(1, bufferedUntilSeconds.value / duration)
})

function shouldReportEpoch(epoch: number): boolean {
  return currentTrack.value !== null || epoch < player.trackEpoch
}

function fixedRuntimeError(
  epoch: number,
  code: PlayerRuntimeErrorCode,
): void {
  if (!shouldReportEpoch(epoch) || epoch > player.trackEpoch) return
  player.observeError(epoch, code, audioRuntimeErrorMessage(code))
}

function eventAudio(event: Event): HTMLAudioElement | null {
  return event.currentTarget instanceof HTMLAudioElement
    ? event.currentTarget
    : null
}

function eventEpoch(event: Event): number | null {
  const audio = eventAudio(event)
  if (audio === null) return null
  try {
    return parseAudioEpoch(audio.dataset.mmAudioEpoch)
  } catch {
    return null
  }
}

function observeMetadata(event: Event): void {
  const audio = eventAudio(event)
  const epoch = eventEpoch(event)
  if (audio === null || epoch === null) return
  if (!shouldReportEpoch(epoch)) return
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
    fixedRuntimeError(epoch, 'invalid-runtime-observation')
    return
  }
  player.observeMetadata(epoch, audio.duration)
  observeBuffered(event)
}

function observeTime(event: Event): void {
  const audio = eventAudio(event)
  const epoch = eventEpoch(event)
  if (audio === null || epoch === null) return
  if (!shouldReportEpoch(epoch)) return
  if (!Number.isFinite(audio.currentTime) || audio.currentTime < 0) {
    fixedRuntimeError(epoch, 'invalid-runtime-observation')
    return
  }
  player.observeTime(epoch, audio.currentTime)
}

function observeBuffered(event: Event): void {
  const audio = eventAudio(event)
  const epoch = eventEpoch(event)
  if (audio === null || epoch === null) return
  if (!shouldReportEpoch(epoch)) return
  try {
    player.observeBufferedUntil(
      epoch,
      readBufferedUntilSeconds(audio.buffered),
    )
  } catch {
    fixedRuntimeError(epoch, 'invalid-runtime-observation')
  }
}

function observeVolume(event: Event): void {
  const audio = eventAudio(event)
  const epoch = eventEpoch(event)
  if (audio === null || epoch === null) return
  if (!shouldReportEpoch(epoch)) return
  player.observeVolume(epoch, audio.volume, audio.muted)
}

function observeMediaError(event: Event): void {
  const audio = eventAudio(event)
  const epoch = eventEpoch(event)
  if (audio === null || epoch === null) return
  if (!shouldReportEpoch(epoch)) return
  const code = mapAudioMediaErrorCode(audio.error?.code ?? null)
  fixedRuntimeError(epoch, code)
}

function isCurrentPlayRequest(
  audio: HTMLAudioElement,
  trackEpochValue: number,
  requestId: number,
): boolean {
  const pending = player.pendingTransport
  return (
    !disposed
    && audioElement.value === audio
    && player.trackEpoch === trackEpochValue
    && pending !== null
    && pending.trackEpoch === trackEpochValue
    && pending.requestId === requestId
    && pending.kind === 'play'
  )
}

function pauseForVideoPlayback(): void {
  if (
    currentTrack.value === null
    || phase.value === 'idle'
    || phase.value === 'paused'
    || phase.value === 'ended'
  ) {
    return
  }

  player.requestPause('video-started')
  const audio = audioElement.value
  const request = player.pendingTransport
  if (audio !== null && request?.kind === 'pause') {
    executeTransport(audio, request)
  }
}

const arbitrationEndpoint = Object.freeze({
  pauseForVideoPlayback,
})

function executeTransport(
  audio: HTMLAudioElement,
  request: PlayerTransportRequest,
): void {
  if (
    request.trackEpoch !== trackEpoch.value
    || request.trackEpoch !== Number(audio.dataset.mmAudioEpoch)
  ) {
    return
  }

  const consumed = consumedTransport.get(audio) ?? new Set<number>()
  if (consumed.has(request.requestId)) return
  consumed.add(request.requestId)
  consumedTransport.set(audio, consumed)

  const track = currentTrack.value
  if (
    track === null
    || audio.getAttribute('src') !== track.source.url
  ) {
    fixedRuntimeError(request.trackEpoch, 'invalid-runtime-observation')
    return
  }

  if (request.kind === 'pause') {
    audio.pause()
    player.acknowledgeTransportRequest(
      request.trackEpoch,
      request.requestId,
    )
    return
  }

  try {
    arbitrationRegistration?.beforePlayback()
  } catch {
    fixedRuntimeError(request.trackEpoch, 'invalid-runtime-observation')
    return
  }

  const executionAudio = audio
  const executionEpoch = request.trackEpoch
  const executionRequestId = request.requestId
  void audio.play().then(
    () => {
      if (!isCurrentPlayRequest(
        executionAudio,
        executionEpoch,
        executionRequestId,
      )) {
        return
      }
      player.acknowledgeTransportRequest(
        executionEpoch,
        executionRequestId,
      )
    },
    () => {
      if (!isCurrentPlayRequest(
        executionAudio,
        executionEpoch,
        executionRequestId,
      )) {
        return
      }
      fixedRuntimeError(executionEpoch, 'play-rejected')
    },
  )
}

function observePlay(event: Event): void {
  const audio = eventAudio(event)
  const epoch = eventEpoch(event)
  if (audio === null || epoch === null || !shouldReportEpoch(epoch)) return
  if (
    phase.value === 'pause-requested'
    || pendingTransport.value?.kind === 'pause'
  ) {
    audio.pause()
    return
  }
  player.observePlaying(epoch)
}

function observePause(event: Event): void {
  const epoch = eventEpoch(event)
  if (epoch !== null && shouldReportEpoch(epoch)) {
    player.observePaused(epoch)
  }
}

function observeEnded(event: Event): void {
  const epoch = eventEpoch(event)
  if (epoch !== null && shouldReportEpoch(epoch)) {
    player.observeEnded(epoch)
  }
}

function executeSeek(
  audio: HTMLAudioElement,
  request: PlayerSeekRequest,
): void {
  if (
    request.trackEpoch !== trackEpoch.value
    || request.trackEpoch !== Number(audio.dataset.mmAudioEpoch)
  ) {
    return
  }

  const consumed = consumedSeek.get(audio) ?? new Set<number>()
  if (consumed.has(request.requestId)) return
  consumed.add(request.requestId)
  consumedSeek.set(audio, consumed)

  try {
    audio.currentTime = request.timeSeconds
    player.acknowledgeSeekRequest(
      request.trackEpoch,
      request.requestId,
    )
  } catch {
    fixedRuntimeError(request.trackEpoch, 'invalid-runtime-observation')
  }
}

function initializeAudio(audio: HTMLAudioElement | null): void {
  if (audio === null) return
  audio.volume = volume.value
  audio.muted = muted.value
  const request = pendingTransport.value
  if (request !== null) executeTransport(audio, request)
  const seek = pendingSeek.value
  if (seek !== null) executeSeek(audio, seek)
}

function cleanupAudio(audio: HTMLAudioElement | null): void {
  if (audio === null) return
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

function togglePlayback(): void {
  if (isPlayingIntent.value) {
    player.requestPause('user')
  } else {
    player.requestPlay()
  }
}

function commitSeek(): void {
  seekEditing.value = false
  player.requestSeek(seekDraftSeconds.value)
}

function updateSeekDraft(event: Event): void {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return
  const value = input.valueAsNumber
  if (!Number.isFinite(value) || value < 0) return
  seekDraftSeconds.value = value
}

function updateVolume(event: Event): void {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return
  player.setVolume(input.valueAsNumber)
}

watch(audioElement, (current, previous) => {
  cleanupAudio(previous)
  initializeAudio(current)
})

watch(
  pendingTransport,
  request => {
    const audio = audioElement.value
    if (audio !== null && request !== null) executeTransport(audio, request)
  },
  { flush: 'post' },
)

watch(
  pendingSeek,
  request => {
    const audio = audioElement.value
    if (audio !== null && request !== null) executeSeek(audio, request)
  },
  { flush: 'post' },
)

watch([volume, muted], ([nextVolume, nextMuted]) => {
  const audio = audioElement.value
  if (audio === null) return
  if (audio.volume !== nextVolume) audio.volume = nextVolume
  if (audio.muted !== nextMuted) audio.muted = nextMuted
})

watch(currentTimeSeconds, value => {
  if (!seekEditing.value) seekDraftSeconds.value = value
})

watch(trackEpoch, async () => {
  seekEditing.value = false
  seekDraftSeconds.value = 0
  await nextTick()
  initializeAudio(audioElement.value)
})

onMounted(() => {
  arbitrationRegistration = arbitration.registerAudio(arbitrationEndpoint)
})

onBeforeUnmount(() => {
  disposed = true
  arbitrationRegistration?.dispose()
  arbitrationRegistration = null
  cleanupAudio(audioElement.value)
  seekEditing.value = false
  seekDraftSeconds.value = 0
})
</script>

<template>
  <div
    id="mm-global-audio-host"
    class="mm-global-audio-host"
    data-mm-global-audio-host
  >
    <audio
      :key="trackEpoch"
      ref="audioElement"
      data-mm-global-audio-element
      :data-mm-audio-epoch="trackEpoch"
      preload="metadata"
      :src="currentTrack?.source.url"
      @loadedmetadata="observeMetadata"
      @durationchange="observeMetadata"
      @timeupdate="observeTime"
      @seeked="observeTime"
      @progress="observeBuffered"
      @play="observePlay"
      @pause="observePause"
      @ended="observeEnded"
      @volumechange="observeVolume"
      @error="observeMediaError"
    />

    <section
      v-if="hasTrack"
      class="mm-global-audio-dock"
      data-mm-global-audio-dock
      aria-label="전역 오디오 플레이어"
    >
      <div class="mm-global-audio-dock__inner mm-shell-frame">
        <p class="mm-global-audio-dock__track">
          {{ currentTrack?.label }}
        </p>

        <button
          class="mm-global-audio-dock__button"
          type="button"
          :aria-label="isPlayingIntent ? '오디오 일시정지' : '오디오 재생'"
          @click="togglePlayback"
        >
          {{ isPlayingIntent ? '일시정지' : '재생' }}
        </button>

        <div class="mm-global-audio-dock__timeline">
          <span>{{ currentTimeLabel }}</span>
          <input
            class="mm-global-audio-dock__seek"
            type="range"
            min="0"
            :max="seekMaximum"
            step="0.1"
            :value="seekDraftSeconds"
            :disabled="durationSeconds === null"
            aria-label="오디오 재생 위치"
            :aria-valuetext="`${formatPlayerTime(seekDraftSeconds)} / ${durationLabel}`"
            :style="{ '--mm-buffered-ratio': bufferedRatio }"
            @focus="seekEditing = true"
            @input="updateSeekDraft"
            @change="commitSeek"
            @blur="seekEditing = false"
          >
          <span>{{ durationLabel }}</span>
        </div>

        <button
          class="mm-global-audio-dock__button"
          type="button"
          :aria-label="muted ? '음소거 해제' : '음소거'"
          @click="player.toggleMuted()"
        >
          {{ muted ? '음소거 해제' : '음소거' }}
        </button>

        <input
          class="mm-global-audio-dock__volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="volume"
          aria-label="오디오 볼륨"
          @input="updateVolume"
        >

        <p
          v-if="error !== null"
          class="mm-global-audio-dock__error"
          role="status"
        >
          {{ error.message }}
        </p>
      </div>
    </section>
  </div>
</template>

<style src="~/assets/css/global-audio-dock.css"></style>
