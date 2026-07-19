export type VideoPlayerRuntimeErrorCode =
  | 'aborted'
  | 'network'
  | 'decode'
  | 'source-not-supported'
  | 'play-rejected'
  | 'invalid-runtime-observation'
  | 'unknown-media-error'

export interface VideoPlayerRuntimeError {
  readonly code: VideoPlayerRuntimeErrorCode
  readonly message: string
}

export interface VideoPlayerRuntimeState {
  readonly readiness:
    | 'metadata-pending'
    | 'metadata-ready'
    | 'error'
  readonly activation:
    | 'required'
    | 'pending'
    | 'complete'
  readonly playback:
    | 'paused'
    | 'playing'
    | 'ended'
  readonly poster:
    | 'absent'
    | 'loading'
    | 'loaded'
    | 'error'
    | 'dismissed'
  readonly currentTimeSeconds: number
  readonly durationSeconds: number | null
  readonly fullscreen: boolean
  readonly pictureInPicture: boolean
  readonly error: VideoPlayerRuntimeError | null
}

export type VideoPlayerRuntimeEvent =
  | Readonly<{ type: 'source-reset'; hasPoster: boolean }>
  | Readonly<{ type: 'poster-state'; state: 'loading' | 'loaded' | 'error' }>
  | Readonly<{ type: 'play-requested' }>
  | Readonly<{ type: 'play-started' }>
  | Readonly<{ type: 'paused' }>
  | Readonly<{ type: 'ended' }>
  | Readonly<{ type: 'metadata-ready'; durationSeconds: number }>
  | Readonly<{ type: 'time-update'; currentTimeSeconds: number }>
  | Readonly<{ type: 'fullscreen-change'; fullscreen: boolean }>
  | Readonly<{ type: 'picture-in-picture-change'; active: boolean }>
  | Readonly<{
      type: 'media-error'
      code: VideoPlayerRuntimeErrorCode
      message: string
    }>

export class VideoPlayerStateError extends Error {
  readonly code = 'invalid-video-player-state-event'
  readonly event: unknown

  constructor(message: string, event: unknown) {
    super(message)
    this.name = 'VideoPlayerStateError'
    this.event = event
  }
}

const ERROR_CODES = new Set<VideoPlayerRuntimeErrorCode>([
  'aborted',
  'network',
  'decode',
  'source-not-supported',
  'play-rejected',
  'invalid-runtime-observation',
  'unknown-media-error',
])

function fail(message: string, event: unknown): never {
  throw new VideoPlayerStateError(message, event)
}

function freezeError(
  code: VideoPlayerRuntimeErrorCode,
  message: string,
): VideoPlayerRuntimeError {
  return Object.freeze({ code, message })
}

function freezeState(
  state: VideoPlayerRuntimeState,
): VideoPlayerRuntimeState {
  if (state.error !== null && !Object.isFrozen(state.error)) {
    state = { ...state, error: freezeError(state.error.code, state.error.message) }
  }
  return Object.freeze(state)
}

export function createInitialVideoPlayerState(
  hasPoster: boolean,
): VideoPlayerRuntimeState {
  if (typeof hasPoster !== 'boolean') {
    fail('hasPoster must be boolean', { hasPoster })
  }
  return freezeState({
    readiness: 'metadata-pending',
    activation: 'required',
    playback: 'paused',
    poster: hasPoster ? 'loading' : 'absent',
    currentTimeSeconds: 0,
    durationSeconds: null,
    fullscreen: false,
    pictureInPicture: false,
    error: null,
  })
}

function assertFiniteNonNegative(
  value: unknown,
  name: string,
  event: unknown,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(`${name} must be finite and non-negative`, event)
  }
  return value
}

function assertFinitePositive(
  value: unknown,
  name: string,
  event: unknown,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    fail(`${name} must be finite and positive`, event)
  }
  return value
}

export function reduceVideoPlayerState(
  state: VideoPlayerRuntimeState,
  event: VideoPlayerRuntimeEvent,
): VideoPlayerRuntimeState {
  if (state === null || typeof state !== 'object' || event === null || typeof event !== 'object') {
    fail('state and event must be objects', event)
  }

  switch (event.type) {
    case 'source-reset':
      return createInitialVideoPlayerState(event.hasPoster)

    case 'poster-state':
      if (state.poster === 'absent') {
        fail('poster event is invalid when poster is absent', event)
      }
      if (!['loading', 'loaded', 'error'].includes(event.state)) {
        fail('invalid poster state', event)
      }
      return freezeState({ ...state, poster: event.state })

    case 'play-requested':
      if (state.activation !== 'required') return state
      return freezeState({ ...state, activation: 'pending', error: null })

    case 'play-started':
      return freezeState({
        ...state,
        activation: 'complete',
        playback: 'playing',
        poster: state.poster === 'absent' ? 'absent' : 'dismissed',
        error: null,
      })

    case 'paused':
      if (state.playback === 'ended') return state
      return freezeState({ ...state, playback: 'paused' })

    case 'ended':
      return freezeState({
        ...state,
        playback: 'ended',
        currentTimeSeconds: state.durationSeconds ?? state.currentTimeSeconds,
      })

    case 'metadata-ready': {
      const durationSeconds = assertFinitePositive(
        event.durationSeconds,
        'durationSeconds',
        event,
      )
      return freezeState({
        ...state,
        readiness: 'metadata-ready',
        durationSeconds,
        error: null,
      })
    }

    case 'time-update': {
      const currentTimeSeconds = assertFiniteNonNegative(
        event.currentTimeSeconds,
        'currentTimeSeconds',
        event,
      )
      return freezeState({ ...state, currentTimeSeconds })
    }

    case 'fullscreen-change':
      if (typeof event.fullscreen !== 'boolean') {
        fail('fullscreen must be boolean', event)
      }
      return freezeState({ ...state, fullscreen: event.fullscreen })

    case 'picture-in-picture-change':
      if (typeof event.active !== 'boolean') {
        fail('picture-in-picture active must be boolean', event)
      }
      return freezeState({ ...state, pictureInPicture: event.active })

    case 'media-error':
      if (
        typeof event.code !== 'string'
        || !ERROR_CODES.has(event.code)
        || typeof event.message !== 'string'
        || event.message.length === 0
      ) {
        fail('invalid media error', event)
      }
      return freezeState({
        ...state,
        readiness: 'error',
        playback: 'paused',
        activation: state.activation === 'pending' ? 'required' : state.activation,
        error: freezeError(event.code, event.message),
      })

    default:
      fail('unknown video player event', event)
  }
}

export function mapMediaErrorCode(
  code: number | null,
): VideoPlayerRuntimeErrorCode {
  switch (code) {
    case 1:
      return 'aborted'
    case 2:
      return 'network'
    case 3:
      return 'decode'
    case 4:
      return 'source-not-supported'
    default:
      return 'unknown-media-error'
  }
}
