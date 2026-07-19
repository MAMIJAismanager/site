import type {
  AssetMediaTypeFor,
  AssetRenditionPurposeFor,
} from '../constants/public-asset-domain'

import type {
  AssetId,
} from './domain-identifiers'

export interface ResolvedImageSource {
  readonly kind: 'image'
  readonly renditionId: string
  readonly purpose: AssetRenditionPurposeFor<'image'>
  readonly url: string
  readonly mediaType: AssetMediaTypeFor<'image'>
  readonly byteSize: number
  readonly metadata: Readonly<{
    width: number
    height: number
  }>
  readonly isDefault: boolean
}

export interface ResolvedVideoSource {
  readonly kind: 'video'
  readonly renditionId: string
  readonly purpose: AssetRenditionPurposeFor<'video'>
  readonly url: string
  readonly mediaType: AssetMediaTypeFor<'video'>
  readonly byteSize: number
  readonly metadata: Readonly<{
    width: number
    height: number
    durationMs: number
    hasAudio: boolean
  }>
  readonly isDefault: boolean
}

export interface ResolvedAudioSource {
  readonly kind: 'audio'
  readonly renditionId: string
  readonly purpose: AssetRenditionPurposeFor<'audio'>
  readonly url: string
  readonly mediaType: AssetMediaTypeFor<'audio'>
  readonly byteSize: number
  readonly metadata: Readonly<{
    durationMs: number
  }>
  readonly isDefault: boolean
}

export interface ResolvedImageMedia {
  readonly kind: 'image'
  readonly id: AssetId
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly altText: string | null
  readonly sources: readonly ResolvedImageSource[]
  readonly defaultSource: ResolvedImageSource
}

export interface ResolvedVideoMedia {
  readonly kind: 'video'
  readonly id: AssetId
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly sources: readonly ResolvedVideoSource[]
  readonly defaultSource: ResolvedVideoSource
  readonly poster: ResolvedImageMedia | null
}

export interface ResolvedAudioMedia {
  readonly kind: 'audio'
  readonly id: AssetId
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly sources: readonly ResolvedAudioSource[]
  readonly defaultSource: ResolvedAudioSource
  readonly artwork: ResolvedImageMedia | null
}

export type ResolvedMediaAsset =
  | ResolvedImageMedia
  | ResolvedVideoMedia
  | ResolvedAudioMedia

export type MediaInlineIntent =
  | 'primary'
  | 'thumbnail'
  | 'preview'

interface ResolvedMediaInlinePlanBase<
  Media extends ResolvedMediaAsset,
  Source extends Media['sources'][number],
> {
  readonly media: Media
  readonly requestedIntent: MediaInlineIntent
  readonly selectedPurpose:
    | 'primary'
    | 'thumbnail'
    | 'preview'
  readonly usedPrimaryFallback: boolean
  readonly sources: readonly Source[]
  readonly fallbackSource: Source
}

export type ResolvedImageInlinePlan =
  ResolvedMediaInlinePlanBase<
    ResolvedImageMedia,
    ResolvedImageSource
  >

export type ResolvedVideoInlinePlan =
  ResolvedMediaInlinePlanBase<
    ResolvedVideoMedia,
    ResolvedVideoSource
  >

export type ResolvedAudioInlinePlan =
  ResolvedMediaInlinePlanBase<
    ResolvedAudioMedia,
    ResolvedAudioSource
  >

export type ResolvedMediaInlinePlan =
  | ResolvedImageInlinePlan
  | ResolvedVideoInlinePlan
  | ResolvedAudioInlinePlan

export interface MediaResolutionOptions {
  readonly mediaBaseUrl: string
}
