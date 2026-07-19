import type { AssetId } from './domain-identifiers'
import type { ResolvedImageInlinePlan } from './resolved-media'

export type ResponsiveImageAccessibility =
  | Readonly<{
      mode: 'decorative'
    }>
  | Readonly<{
      mode: 'informative'
      altText: string
    }>

export type ResponsiveImageLoadState =
  | 'loading'
  | 'loaded'
  | 'error'

export type ResponsiveImageLoading =
  | 'eager'
  | 'lazy'

export type ResponsiveImageFetchPriority =
  | 'high'
  | 'auto'
  | 'low'

export type ResponsiveImageFit =
  | 'cover'
  | 'contain'

export interface ResponsiveImageRenderOptions {
  readonly sizes: string
  readonly accessibility: ResponsiveImageAccessibility
  readonly loading: ResponsiveImageLoading
  readonly fetchPriority: ResponsiveImageFetchPriority
  readonly fit: ResponsiveImageFit
}

export interface ResponsiveImageCandidate {
  readonly url: string
  readonly width: number
  readonly height: number
}

export type ResponsiveImageMediaType =
  | 'image/avif'
  | 'image/webp'
  | 'image/jpeg'
  | 'image/png'

export interface ResponsiveImageSourceSet {
  readonly mediaType: ResponsiveImageMediaType
  readonly candidates: readonly ResponsiveImageCandidate[]
  readonly srcset: string
}

export interface ResponsiveImageFallback {
  readonly url: string
  readonly mediaType: ResponsiveImageMediaType
  readonly width: number
  readonly height: number
  readonly srcset: string | null
}

export interface ResponsiveImageRenderPlan {
  readonly assetId: AssetId
  readonly sourceSets: readonly ResponsiveImageSourceSet[]
  readonly fallback: ResponsiveImageFallback
  readonly sizes: string
  readonly intrinsicSize: Readonly<{
    width: number
    height: number
  }>
  readonly alt: string
  readonly ariaHidden: boolean
  readonly loading: ResponsiveImageLoading
  readonly fetchPriority: ResponsiveImageFetchPriority
  readonly decoding: 'async'
  readonly fit: ResponsiveImageFit
}

export interface ResponsiveImagePlanningAuthority {
  resolve(
    plan: ResolvedImageInlinePlan,
    options: ResponsiveImageRenderOptions,
  ): ResponsiveImageRenderPlan
}
