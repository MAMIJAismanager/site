export interface CrossMediaAudioEndpoint {
  readonly pauseForVideoPlayback: () => void
}

export interface CrossMediaVideoEndpoint {
  readonly assetId: string
  readonly pauseForAudioPlayback: () => void
}

export interface CrossMediaAudioRegistration {
  readonly beforePlayback: () => void
  readonly dispose: () => void
}

export interface CrossMediaVideoRegistration {
  readonly playbackStarted: () => void
  readonly playbackPaused: () => void
  readonly playbackEnded: () => void
  readonly dispose: () => void
}

export interface CrossMediaArbitrationAuthority {
  readonly registerAudio: (
    endpoint: CrossMediaAudioEndpoint,
  ) => CrossMediaAudioRegistration

  readonly registerVideo: (
    endpoint: CrossMediaVideoEndpoint,
  ) => CrossMediaVideoRegistration

  readonly dispose: () => void
}
