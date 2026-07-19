import type {
  CrossMediaArbitrationAuthority,
  CrossMediaAudioEndpoint,
  CrossMediaAudioRegistration,
  CrossMediaVideoEndpoint,
  CrossMediaVideoRegistration,
} from '~/types/cross-media-arbitration'

export type CrossMediaArbitrationErrorCode =
  | 'duplicate-cross-media-audio-endpoint'
  | 'duplicate-cross-media-video-endpoint'
  | 'invalid-cross-media-audio-endpoint'
  | 'invalid-cross-media-video-endpoint'
  | 'cross-media-authority-disposed'
  | 'cross-media-pause-callback-failed'

export type CrossMediaParticipantKind = 'audio' | 'video'
export type CrossMediaPauseOperation =
  | 'pause-audio-for-video'
  | 'pause-video-for-audio'
  | 'pause-video-for-video'

export class CrossMediaArbitrationError extends Error {
  override readonly name = 'CrossMediaArbitrationError'

  constructor(
    readonly code: CrossMediaArbitrationErrorCode,
    readonly participantKind: CrossMediaParticipantKind,
    readonly assetId: string | null,
    readonly operation: CrossMediaPauseOperation | null,
  ) {
    super([
      code,
      participantKind,
      assetId ?? 'none',
      operation ?? 'none',
    ].join(': '))
  }
}

interface VideoRecord {
  readonly token: object
  readonly endpoint: CrossMediaVideoEndpoint
  active: boolean
  disposed: boolean
}

function invalidAudioEndpoint(endpoint: unknown): boolean {
  return (
    typeof endpoint !== 'object'
    || endpoint === null
    || typeof (endpoint as CrossMediaAudioEndpoint).pauseForVideoPlayback !== 'function'
  )
}

function invalidVideoEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== 'object' || endpoint === null) return true
  const candidate = endpoint as CrossMediaVideoEndpoint
  return (
    typeof candidate.assetId !== 'string'
    || candidate.assetId.length === 0
    || candidate.assetId !== candidate.assetId.trim()
    || typeof candidate.pauseForAudioPlayback !== 'function'
  )
}

function callbackFailure(
  participantKind: CrossMediaParticipantKind,
  assetId: string | null,
  operation: CrossMediaPauseOperation,
): CrossMediaArbitrationError {
  return new CrossMediaArbitrationError(
    'cross-media-pause-callback-failed',
    participantKind,
    assetId,
    operation,
  )
}

export function createCrossMediaArbitrationAuthority(): CrossMediaArbitrationAuthority {
  let audioEndpoint: CrossMediaAudioEndpoint | null = null
  let audioRegistrationActive = false
  let disposed = false

  const videosByToken = new Map<object, VideoRecord>()
  const tokensByEndpoint = new Map<CrossMediaVideoEndpoint, object>()

  function assertAuthorityActive(participantKind: CrossMediaParticipantKind): void {
    if (disposed) {
      throw new CrossMediaArbitrationError(
        'cross-media-authority-disposed',
        participantKind,
        null,
        null,
      )
    }
  }

  function activeVideoSnapshot(excludedToken: object | null): VideoRecord[] {
    return [...videosByToken.values()].filter(record => (
      !record.disposed
      && record.active
      && record.token !== excludedToken
    ))
  }

  function pauseVideoRecord(
    record: VideoRecord,
    operation: 'pause-video-for-audio' | 'pause-video-for-video',
  ): void {
    try {
      record.endpoint.pauseForAudioPlayback()
    } catch {
      throw callbackFailure('video', record.endpoint.assetId, operation)
    }
  }

  function pauseAudioForVideo(): void {
    if (!audioRegistrationActive || audioEndpoint === null) return
    try {
      audioEndpoint.pauseForVideoPlayback()
    } catch {
      throw callbackFailure('audio', null, 'pause-audio-for-video')
    }
  }

  return Object.freeze({
    registerAudio(endpoint: CrossMediaAudioEndpoint): CrossMediaAudioRegistration {
      assertAuthorityActive('audio')
      if (invalidAudioEndpoint(endpoint)) {
        throw new CrossMediaArbitrationError(
          'invalid-cross-media-audio-endpoint',
          'audio',
          null,
          null,
        )
      }
      if (audioRegistrationActive) {
        throw new CrossMediaArbitrationError(
          'duplicate-cross-media-audio-endpoint',
          'audio',
          null,
          null,
        )
      }

      audioEndpoint = endpoint
      audioRegistrationActive = true
      let registrationDisposed = false

      return Object.freeze({
        beforePlayback(): void {
          if (registrationDisposed || disposed || !audioRegistrationActive) return
          const snapshot = activeVideoSnapshot(null)
          for (const record of snapshot) {
            pauseVideoRecord(record, 'pause-video-for-audio')
          }
        },
        dispose(): void {
          if (registrationDisposed) return
          registrationDisposed = true
          if (audioEndpoint === endpoint) {
            audioEndpoint = null
            audioRegistrationActive = false
          }
        },
      })
    },

    registerVideo(endpoint: CrossMediaVideoEndpoint): CrossMediaVideoRegistration {
      assertAuthorityActive('video')
      if (invalidVideoEndpoint(endpoint)) {
        throw new CrossMediaArbitrationError(
          'invalid-cross-media-video-endpoint',
          'video',
          null,
          null,
        )
      }
      if (tokensByEndpoint.has(endpoint)) {
        throw new CrossMediaArbitrationError(
          'duplicate-cross-media-video-endpoint',
          'video',
          endpoint.assetId,
          null,
        )
      }

      const token = Object.freeze({})
      const record: VideoRecord = {
        token,
        endpoint,
        active: false,
        disposed: false,
      }
      videosByToken.set(token, record)
      tokensByEndpoint.set(endpoint, token)

      function registrationActive(): boolean {
        return !disposed && !record.disposed && videosByToken.get(token) === record
      }

      return Object.freeze({
        playbackStarted(): void {
          if (!registrationActive() || record.active) return
          const otherVideos = activeVideoSnapshot(token)
          for (const other of otherVideos) {
            pauseVideoRecord(other, 'pause-video-for-video')
          }
          pauseAudioForVideo()
          if (registrationActive()) record.active = true
        },
        playbackPaused(): void {
          if (!registrationActive()) return
          record.active = false
        },
        playbackEnded(): void {
          if (!registrationActive()) return
          record.active = false
        },
        dispose(): void {
          if (record.disposed) return
          record.disposed = true
          record.active = false
          videosByToken.delete(token)
          if (tokensByEndpoint.get(endpoint) === token) {
            tokensByEndpoint.delete(endpoint)
          }
        },
      })
    },

    dispose(): void {
      if (disposed) return
      disposed = true
      audioEndpoint = null
      audioRegistrationActive = false
      for (const record of videosByToken.values()) {
        record.active = false
        record.disposed = true
      }
      videosByToken.clear()
      tokensByEndpoint.clear()
    },
  })
}
