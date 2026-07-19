import type {
  PlayerPhase,
  PlayerRuntimeErrorCode,
  PlayerTrack,
} from '~~/shared/types/player-store'

export type AudioTrackActionDecision =
  | 'select-and-play'
  | 'pause'
  | 'play'

export type GlobalAudioRuntimeErrorCode =
  | 'invalid-buffered-ranges'
  | 'invalid-time-value'
  | 'invalid-audio-epoch'

export class GlobalAudioRuntimeError extends Error {
  override readonly name = 'GlobalAudioRuntimeError'

  constructor(
    readonly code: GlobalAudioRuntimeErrorCode,
    readonly path: string,
  ) {
    super(`${code}: ${path}`)
  }
}

function fail(
  code: GlobalAudioRuntimeErrorCode,
  path: string,
): never {
  throw new GlobalAudioRuntimeError(code, path)
}

export function mapAudioMediaErrorCode(
  code: number | null,
): PlayerRuntimeErrorCode {
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

export function audioRuntimeErrorMessage(
  code: PlayerRuntimeErrorCode,
): string {
  switch (code) {
    case 'aborted':
      return '오디오 불러오기가 중단되었습니다.'
    case 'network':
      return '오디오를 불러오는 중 네트워크 오류가 발생했습니다.'
    case 'decode':
      return '오디오 데이터를 재생 가능한 형태로 해석하지 못했습니다.'
    case 'source-not-supported':
      return '이 브라우저에서 지원하지 않는 오디오 형식입니다.'
    case 'play-rejected':
      return '브라우저가 오디오 재생 요청을 거부했습니다.'
    case 'invalid-runtime-observation':
      return '오디오 재생 상태를 올바르게 확인하지 못했습니다.'
    case 'unknown-media-error':
      return '알 수 없는 오디오 재생 오류가 발생했습니다.'
  }
}

export function readBufferedUntilSeconds(
  ranges: Pick<TimeRanges, 'length' | 'end'>,
): number {
  if (!Number.isSafeInteger(ranges.length) || ranges.length < 0) {
    fail('invalid-buffered-ranges', 'ranges.length')
  }

  let maximum = 0
  let previous = 0

  for (let index = 0; index < ranges.length; index += 1) {
    let end: number
    try {
      end = ranges.end(index)
    } catch {
      fail('invalid-buffered-ranges', `ranges.end(${index})`)
    }

    if (!Number.isFinite(end) || end < 0 || end < previous) {
      fail('invalid-buffered-ranges', `ranges.end(${index})`)
    }

    previous = end
    if (end > maximum) maximum = end
  }

  return maximum
}

export function formatPlayerTime(
  valueSeconds: number | null,
): string {
  if (valueSeconds === null) return '--:--'
  if (!Number.isFinite(valueSeconds) || valueSeconds < 0) {
    fail('invalid-time-value', 'valueSeconds')
  }

  const totalSeconds = Math.floor(valueSeconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function parseAudioEpoch(value: string | undefined): number {
  if (value === undefined || !/^(?:0|[1-9][0-9]*)$/.test(value)) {
    fail('invalid-audio-epoch', 'data-mm-audio-epoch')
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    fail('invalid-audio-epoch', 'data-mm-audio-epoch')
  }
  return parsed
}

export function decideAudioTrackAction(
  currentTrack: PlayerTrack | null,
  phase: PlayerPhase,
  requestedTrack: PlayerTrack,
): AudioTrackActionDecision {
  const sameTrack = currentTrack !== null
    && currentTrack.trackId === requestedTrack.trackId
    && currentTrack.projectId === requestedTrack.projectId

  if (!sameTrack) return 'select-and-play'
  if (phase === 'playing' || phase === 'play-requested') return 'pause'
  return 'play'
}
