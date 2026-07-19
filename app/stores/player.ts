import { defineStore } from 'pinia'
import {
  createInitialPlayerStoreState,
  reducePlayerStoreState,
} from '../utils/player-store-state'
import type {
  PlayerPauseReason,
  PlayerRuntimeErrorCode,
  PlayerStateTransition,
  PlayerStoreState,
  PlayerTrack,
} from '~~/shared/types/player-store'

function applyTransition(
  current: PlayerStoreState,
  transition: PlayerStateTransition,
): PlayerStoreState {
  return reducePlayerStoreState(current, transition)
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerStoreState => createInitialPlayerStoreState(),

  getters: {
    hasTrack: state => state.currentTrack !== null,
    currentTrackId: state => state.currentTrack?.trackId ?? null,
    currentProjectId: state => state.currentTrack?.projectId ?? null,
    sourceUrl: state => state.currentTrack?.source.url ?? null,
    sourceMediaType: state => state.currentTrack?.source.mediaType ?? null,
    isPlaying: state => state.phase === 'playing',
    isTransportPending: state => state.pendingTransport !== null,
    isSeekPending: state => state.pendingSeek !== null,
    progressRatio: state => {
      if (state.durationSeconds === null || state.durationSeconds <= 0) {
        return null
      }
      const ratio = state.currentTimeSeconds / state.durationSeconds
      if (ratio < 0) return 0
      if (ratio > 1) return 1
      return ratio
    },
    isAudible: state => (
      state.phase === 'playing'
      && !state.muted
      && state.volume > 0
    ),
  },

  actions: {
    apply(transition: PlayerStateTransition): boolean {
      const previous = this.$state
      const next = applyTransition(previous, transition)
      if (next === previous) return false
      this.$state = next
      return true
    },

    selectTrack(track: PlayerTrack): boolean {
      return this.apply({ kind: 'select-track', track })
    },

    clearTrack(): boolean {
      return this.apply({ kind: 'clear-track' })
    },

    requestPlay(): boolean {
      return this.apply({ kind: 'request-play' })
    },

    requestPause(reason: PlayerPauseReason): boolean {
      return this.apply({ kind: 'request-pause', reason })
    },

    requestSeek(timeSeconds: number): boolean {
      return this.apply({ kind: 'request-seek', timeSeconds })
    },

    setVolume(value: number): boolean {
      return this.apply({ kind: 'set-volume', value })
    },

    setMuted(value: boolean): boolean {
      return this.apply({ kind: 'set-muted', value })
    },

    toggleMuted(): void {
      this.apply({ kind: 'set-muted', value: !this.muted })
    },

    observeMetadata(trackEpoch: number, durationSeconds: number): boolean {
      return this.apply({
        kind: 'observe-metadata',
        trackEpoch,
        durationSeconds,
      })
    },

    observePlaying(trackEpoch: number): boolean {
      return this.apply({ kind: 'observe-playing', trackEpoch })
    },

    observePaused(trackEpoch: number): boolean {
      return this.apply({ kind: 'observe-paused', trackEpoch })
    },

    observeEnded(trackEpoch: number): boolean {
      return this.apply({ kind: 'observe-ended', trackEpoch })
    },

    observeTime(trackEpoch: number, currentTimeSeconds: number): boolean {
      return this.apply({
        kind: 'observe-time',
        trackEpoch,
        currentTimeSeconds,
      })
    },

    observeBufferedUntil(
      trackEpoch: number,
      bufferedUntilSeconds: number,
    ): boolean {
      return this.apply({
        kind: 'observe-buffered',
        trackEpoch,
        bufferedUntilSeconds,
      })
    },

    observeVolume(
      trackEpoch: number,
      volume: number,
      muted: boolean,
    ): boolean {
      return this.apply({
        kind: 'observe-volume',
        trackEpoch,
        volume,
        muted,
      })
    },

    observeError(
      trackEpoch: number,
      code: PlayerRuntimeErrorCode,
      message: string,
    ): boolean {
      return this.apply({
        kind: 'observe-error',
        trackEpoch,
        code,
        message,
      })
    },

    acknowledgeTransportRequest(
      trackEpoch: number,
      requestId: number,
    ): boolean {
      return this.apply({
        kind: 'acknowledge-transport',
        trackEpoch,
        requestId,
      })
    },

    acknowledgeSeekRequest(
      trackEpoch: number,
      requestId: number,
    ): boolean {
      return this.apply({
        kind: 'acknowledge-seek',
        trackEpoch,
        requestId,
      })
    },
  },
})
