import type {
  PlayerPauseReason,
  PlayerRuntimeError,
  PlayerRuntimeErrorCode,
  PlayerSeekRequest,
  PlayerStateTransition,
  PlayerStoreState,
  PlayerTrack,
  PlayerTransportRequest,
} from '~~/shared/types/player-store'

export const PLAYER_RUNTIME_TIME_TOLERANCE_SECONDS = 0.05

export type PlayerStoreStateErrorCode =
  | 'player-track-state-generation-conflict'
  | 'player-track-epoch-exhausted'
  | 'player-request-sequence-exhausted'
  | 'player-play-request-without-track'
  | 'player-seek-request-without-track'
  | 'player-future-track-epoch'
  | 'player-future-request-id'
  | 'player-invalid-request-id'
  | 'player-invalid-volume'
  | 'player-invalid-muted'
  | 'player-invalid-duration'
  | 'player-invalid-time'
  | 'player-invalid-buffered-time'
  | 'player-invalid-runtime-error'
  | 'player-observation-without-track'

export class PlayerStoreStateError extends Error {
  override readonly name = 'PlayerStoreStateError'

  constructor(
    readonly code: PlayerStoreStateErrorCode,
    readonly path: string,
  ) {
    super(`${code}: ${path}`)
  }
}

function fail(
  code: PlayerStoreStateErrorCode,
  path: string,
): never {
  throw new PlayerStoreStateError(code, path)
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function assertVolume(value: unknown, path: string): asserts value is number {
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < 0
    || value > 1
  ) {
    fail('player-invalid-volume', path)
  }
}

function assertMuted(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== 'boolean') fail('player-invalid-muted', path)
}

function incrementSafeInteger(
  value: number,
  code: 'player-track-epoch-exhausted' | 'player-request-sequence-exhausted',
  path: string,
): number {
  if (!Number.isSafeInteger(value) || value < 0 || value >= Number.MAX_SAFE_INTEGER) {
    fail(code, path)
  }
  return value + 1
}

function sameTrackIdentity(
  left: PlayerTrack,
  right: PlayerTrack,
): boolean {
  return left.trackId === right.trackId && left.projectId === right.projectId
}

function validateCurrentEpoch(
  state: PlayerStoreState,
  trackEpoch: number,
): 'stale' | 'current' {
  if (!Number.isSafeInteger(trackEpoch) || trackEpoch < 0) {
    fail('player-future-track-epoch', 'trackEpoch')
  }
  if (trackEpoch < state.trackEpoch) return 'stale'
  if (trackEpoch > state.trackEpoch) {
    fail('player-future-track-epoch', 'trackEpoch')
  }
  if (state.currentTrack === null) {
    fail('player-observation-without-track', 'currentTrack')
  }
  return 'current'
}

function validateRequestId(
  state: PlayerStoreState,
  requestId: number,
): void {
  if (!Number.isSafeInteger(requestId) || requestId <= 0) {
    fail('player-invalid-request-id', 'requestId')
  }
  if (requestId > state.requestSequence) {
    fail('player-future-request-id', 'requestId')
  }
}

function nextRequestId(state: PlayerStoreState): number {
  return incrementSafeInteger(
    state.requestSequence,
    'player-request-sequence-exhausted',
    'requestSequence',
  )
}

function makeTransportRequest(
  state: PlayerStoreState,
  kind: 'play' | 'pause',
  reason: 'user' | PlayerPauseReason,
): PlayerTransportRequest {
  const requestId = nextRequestId(state)
  if (kind === 'play') {
    return Object.freeze({
      requestId,
      trackEpoch: state.trackEpoch,
      kind: 'play' as const,
      reason: 'user' as const,
    })
  }
  return Object.freeze({
    requestId,
    trackEpoch: state.trackEpoch,
    kind: 'pause' as const,
    reason: reason as PlayerPauseReason,
  })
}

function makeSeekRequest(
  state: PlayerStoreState,
  timeSeconds: number,
): PlayerSeekRequest {
  return Object.freeze({
    requestId: nextRequestId(state),
    trackEpoch: state.trackEpoch,
    timeSeconds,
  })
}

function makeRuntimeError(
  code: PlayerRuntimeErrorCode,
  message: string,
): PlayerRuntimeError {
  const allowedCodes: readonly PlayerRuntimeErrorCode[] = [
    'aborted',
    'network',
    'decode',
    'source-not-supported',
    'play-rejected',
    'invalid-runtime-observation',
    'unknown-media-error',
  ]
  if (
    !allowedCodes.includes(code)
    || typeof message !== 'string'
    || message.length === 0
    || message !== message.trim()
  ) {
    fail('player-invalid-runtime-error', 'runtimeError')
  }
  return Object.freeze({ code, message })
}

export function createInitialPlayerStoreState(): PlayerStoreState {
  return {
    schemaVersion: 1,
    currentTrack: null,
    trackEpoch: 0,
    phase: 'idle',
    currentTimeSeconds: 0,
    durationSeconds: null,
    bufferedUntilSeconds: 0,
    volume: 1,
    muted: false,
    pendingTransport: null,
    pendingSeek: null,
    requestSequence: 0,
    error: null,
  }
}

export function reducePlayerStoreState(
  state: PlayerStoreState,
  transition: PlayerStateTransition,
): PlayerStoreState {
  switch (transition.kind) {
    case 'select-track': {
      if (state.currentTrack === transition.track) return state
      if (
        state.currentTrack !== null
        && sameTrackIdentity(state.currentTrack, transition.track)
      ) {
        fail('player-track-state-generation-conflict', 'currentTrack')
      }
      return {
        ...state,
        currentTrack: transition.track,
        trackEpoch: incrementSafeInteger(
          state.trackEpoch,
          'player-track-epoch-exhausted',
          'trackEpoch',
        ),
        phase: 'loading',
        currentTimeSeconds: 0,
        durationSeconds: null,
        bufferedUntilSeconds: 0,
        pendingTransport: null,
        pendingSeek: null,
        error: null,
      }
    }

    case 'clear-track': {
      if (state.currentTrack === null) return state
      return {
        ...state,
        currentTrack: null,
        trackEpoch: incrementSafeInteger(
          state.trackEpoch,
          'player-track-epoch-exhausted',
          'trackEpoch',
        ),
        phase: 'idle',
        currentTimeSeconds: 0,
        durationSeconds: null,
        bufferedUntilSeconds: 0,
        pendingTransport: null,
        pendingSeek: null,
        error: null,
      }
    }

    case 'request-play': {
      if (state.currentTrack === null) {
        fail('player-play-request-without-track', 'currentTrack')
      }
      if (
        state.phase === 'playing'
        || (
          state.pendingTransport?.trackEpoch === state.trackEpoch
          && state.pendingTransport.kind === 'play'
        )
      ) {
        return state
      }
      const request = makeTransportRequest(state, 'play', 'user')
      return {
        ...state,
        phase: 'play-requested',
        pendingTransport: request,
        requestSequence: request.requestId,
        error: null,
      }
    }

    case 'request-pause': {
      if (state.currentTrack === null) return state
      if (
        state.phase === 'idle'
        || state.phase === 'paused'
        || state.phase === 'ended'
        || (
          state.pendingTransport?.trackEpoch === state.trackEpoch
          && state.pendingTransport.kind === 'pause'
          && state.pendingTransport.reason === transition.reason
        )
      ) {
        return state
      }
      const request = makeTransportRequest(state, 'pause', transition.reason)
      return {
        ...state,
        phase: 'pause-requested',
        pendingTransport: request,
        requestSequence: request.requestId,
      }
    }

    case 'request-seek': {
      if (state.currentTrack === null) {
        fail('player-seek-request-without-track', 'currentTrack')
      }
      if (!isFiniteNonNegative(transition.timeSeconds)) {
        fail('player-invalid-time', 'timeSeconds')
      }
      if (
        state.durationSeconds !== null
        && transition.timeSeconds > state.durationSeconds
      ) {
        fail('player-invalid-time', 'timeSeconds')
      }
      if (
        state.pendingSeek?.trackEpoch === state.trackEpoch
        && state.pendingSeek.timeSeconds === transition.timeSeconds
      ) {
        return state
      }
      const request = makeSeekRequest(state, transition.timeSeconds)
      return {
        ...state,
        pendingSeek: request,
        requestSequence: request.requestId,
      }
    }

    case 'set-volume': {
      assertVolume(transition.value, 'volume')
      if (transition.value === state.volume) return state
      return { ...state, volume: transition.value }
    }

    case 'set-muted': {
      assertMuted(transition.value, 'muted')
      if (transition.value === state.muted) return state
      return { ...state, muted: transition.value }
    }

    case 'observe-metadata': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      if (
        typeof transition.durationSeconds !== 'number'
        || !Number.isFinite(transition.durationSeconds)
        || transition.durationSeconds <= 0
      ) {
        fail('player-invalid-duration', 'durationSeconds')
      }
      return {
        ...state,
        durationSeconds: transition.durationSeconds,
        phase: state.phase === 'loading' ? 'ready' : state.phase,
      }
    }

    case 'observe-playing': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      return { ...state, phase: 'playing', error: null }
    }

    case 'observe-paused': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      if (state.phase === 'ended') return state
      return { ...state, phase: 'paused' }
    }

    case 'observe-ended': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      return {
        ...state,
        phase: 'ended',
        currentTimeSeconds: state.durationSeconds ?? state.currentTimeSeconds,
      }
    }

    case 'observe-time': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      if (!isFiniteNonNegative(transition.currentTimeSeconds)) {
        fail('player-invalid-time', 'currentTimeSeconds')
      }
      if (
        state.durationSeconds !== null
        && transition.currentTimeSeconds
          > state.durationSeconds + PLAYER_RUNTIME_TIME_TOLERANCE_SECONDS
      ) {
        fail('player-invalid-time', 'currentTimeSeconds')
      }
      if (transition.currentTimeSeconds === state.currentTimeSeconds) return state
      return { ...state, currentTimeSeconds: transition.currentTimeSeconds }
    }

    case 'observe-buffered': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      if (!isFiniteNonNegative(transition.bufferedUntilSeconds)) {
        fail('player-invalid-buffered-time', 'bufferedUntilSeconds')
      }
      if (
        state.durationSeconds !== null
        && transition.bufferedUntilSeconds
          > state.durationSeconds + PLAYER_RUNTIME_TIME_TOLERANCE_SECONDS
      ) {
        fail('player-invalid-buffered-time', 'bufferedUntilSeconds')
      }
      if (transition.bufferedUntilSeconds === state.bufferedUntilSeconds) return state
      return { ...state, bufferedUntilSeconds: transition.bufferedUntilSeconds }
    }

    case 'observe-volume': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      assertVolume(transition.volume, 'volume')
      assertMuted(transition.muted, 'muted')
      if (transition.volume === state.volume && transition.muted === state.muted) {
        return state
      }
      return { ...state, volume: transition.volume, muted: transition.muted }
    }

    case 'observe-error': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      return {
        ...state,
        phase: 'error',
        error: makeRuntimeError(transition.code, transition.message),
        pendingTransport: null,
        pendingSeek: null,
      }
    }

    case 'acknowledge-transport': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      validateRequestId(state, transition.requestId)
      const pending = state.pendingTransport
      if (
        pending === null
        || pending.trackEpoch !== transition.trackEpoch
        || pending.requestId !== transition.requestId
      ) {
        return state
      }
      return { ...state, pendingTransport: null }
    }

    case 'acknowledge-seek': {
      if (validateCurrentEpoch(state, transition.trackEpoch) === 'stale') return state
      validateRequestId(state, transition.requestId)
      const pending = state.pendingSeek
      if (
        pending === null
        || pending.trackEpoch !== transition.trackEpoch
        || pending.requestId !== transition.requestId
      ) {
        return state
      }
      return { ...state, pendingSeek: null }
    }
  }
}
