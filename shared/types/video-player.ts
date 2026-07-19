import type { AssetId } from './domain-identifiers'
import type { ResolvedVideoInlinePlan } from './resolved-media'
import type { ResponsiveImageRenderPlan } from './responsive-image'

export interface VideoPlayerSource {
  readonly renditionId: string
  readonly url: string
  readonly mediaType: 'video/webm' | 'video/mp4'
  readonly width: number
  readonly height: number
  readonly durationMs: number
  readonly hasAudio: boolean
  readonly isDefault: boolean
}

export interface VideoPlayerPresentation {
  readonly assetId: AssetId
  readonly label: string
  readonly sources: readonly VideoPlayerSource[]
  readonly defaultSource: VideoPlayerSource
  readonly intrinsicSize: Readonly<{
    width: number
    height: number
  }>
  readonly declaredDurationMs: number
  readonly hasAudio: boolean
  readonly posterPlan: ResponsiveImageRenderPlan | null
  readonly preload: 'none'
  readonly playsInline: true
}

export interface VideoPlayerPlanningAuthority {
  resolve(
    videoPlan: ResolvedVideoInlinePlan,
    posterPlan: ResponsiveImageRenderPlan | null,
  ): VideoPlayerPresentation
}
