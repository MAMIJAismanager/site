<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { usePlayerStore } from '~/stores/player'
import { decideAudioTrackAction } from '~/utils/global-audio-runtime'

import type { PlayerTrack } from '~~/shared/types/player-store'

interface Props {
  readonly track: PlayerTrack
}

const props = defineProps<Props>()
const player = usePlayerStore()
const { currentTrack, phase } = storeToRefs(player)

const actionLabel = computed(() => {
  const decision = decideAudioTrackAction(
    currentTrack.value,
    phase.value,
    props.track,
  )
  return decision === 'pause'
    ? `${props.track.label} 일시정지`
    : `${props.track.label} 재생`
})

function activate(): void {
  const decision = decideAudioTrackAction(
    currentTrack.value,
    phase.value,
    props.track,
  )

  switch (decision) {
    case 'select-and-play':
      player.selectTrack(props.track)
      player.requestPlay()
      return
    case 'pause':
      player.requestPause('user')
      return
    case 'play':
      player.requestPlay()
  }
}
</script>

<template>
  <button
    class="mm-audio-track-action"
    type="button"
    data-mm-audio-track-action
    :aria-label="actionLabel"
    @click="activate"
  >
    {{ phase === 'playing' || phase === 'play-requested' ? '일시정지' : '오디오 재생' }}
  </button>
</template>
