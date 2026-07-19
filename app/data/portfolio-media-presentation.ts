import {
  createMediaResolutionAuthority,
} from '~~/shared/resolver/media-resolution'
import {
  createResponsiveImagePlanningAuthority,
} from '~~/shared/resolver/responsive-image-plan'
import {
  createVideoPlayerPlanningAuthority,
} from '~~/shared/resolver/video-player-plan'
import {
  createPlayerTrackPlanningAuthority,
} from '~~/shared/resolver/player-track'

import type {
  ResolvedAudioAssetReference,
  ResolvedImageAssetReference,
  ResolvedVideoAssetReference,
} from '~~/shared/view/portfolio-project-view'
import type {
  MediaResolutionAuthority,
} from '~~/shared/resolver/media-resolution'
import type {
  ResponsiveImagePlanningAuthority,
  ResponsiveImageRenderOptions,
  ResponsiveImageRenderPlan,
} from '~~/shared/types/responsive-image'
import type { ProjectId } from '~~/shared/types/domain-identifiers'
import type { PlayerTrack } from '~~/shared/types/player-store'
import { createPortfolioMediaDeliveryConfig } from '~~/shared/resolver/media-delivery-config'

import type {
  VideoPlayerPlanningAuthority,
  VideoPlayerPresentation,
} from '~~/shared/types/video-player'

export const MM_PROJECT_CARD_IMAGE_SIZES =
  '(min-width: 112rem) 22rem, (min-width: 80rem) 23vw, (min-width: 48rem) 46vw, 100vw'
export const MM_SHOWCASE_STAGE_IMAGE_SIZES =
  '(min-width: 64rem) 64vw, 100vw'
export const MM_SHOWCASE_SELECTOR_IMAGE_SIZES =
  '(min-width: 80rem) 17rem, (min-width: 48rem) 15rem, 12rem'
export const MM_WORK_DETAIL_IMAGE_SIZES =
  '(min-width: 80rem) 80rem, 100vw'
export const MM_RELATED_PROJECT_IMAGE_SIZES =
  '(min-width: 48rem) 33vw, 100vw'

export type PortfolioMediaDelivery =
  | Readonly<{
      status: 'unbound'
      mediaBaseUrl: null
    }>
  | Readonly<{
      status: 'bound'
      mediaBaseUrl: string
    }>

export const portfolioMediaDelivery: PortfolioMediaDelivery = Object.freeze({
  status: 'unbound' as const,
  mediaBaseUrl: null,
})

export function resolveConfiguredPortfolioMediaDelivery(): PortfolioMediaDelivery {
  const runtime = useRuntimeConfig()
  const raw = typeof runtime.public.mmjMediaBaseUrl === 'string'
    ? runtime.public.mmjMediaBaseUrl
    : null
  const config = createPortfolioMediaDeliveryConfig(raw, 'development')
  return config.mode === 'bound'
    ? Object.freeze({ status: 'bound' as const, mediaBaseUrl: config.mediaBaseUrl! })
    : portfolioMediaDelivery
}

const responsiveImagePlanner: ResponsiveImagePlanningAuthority =
  createResponsiveImagePlanningAuthority()
const videoPlayerPlanner: VideoPlayerPlanningAuthority =
  createVideoPlayerPlanningAuthority()
const playerTrackPlanner = createPlayerTrackPlanningAuthority()
let mediaResolutionAuthority: MediaResolutionAuthority | null = null

function getBoundMediaResolutionAuthority(
  delivery: Extract<PortfolioMediaDelivery, { status: 'bound' }>,
): MediaResolutionAuthority {
  if (
    mediaResolutionAuthority === null
    || mediaResolutionAuthority.mediaBaseUrl !== delivery.mediaBaseUrl
  ) {
    mediaResolutionAuthority = createMediaResolutionAuthority({
      mediaBaseUrl: delivery.mediaBaseUrl,
    })
  }
  return mediaResolutionAuthority
}

export function resolvePortfolioImagePresentation(
  asset: ResolvedImageAssetReference,
  intent: 'primary' | 'thumbnail',
  options: ResponsiveImageRenderOptions,
): ResponsiveImageRenderPlan | null {
  const delivery = resolveConfiguredPortfolioMediaDelivery()
  if (portfolioMediaDelivery.status === 'unbound' && delivery.status === 'unbound') {
    return null
  }

  const authority = getBoundMediaResolutionAuthority(
    delivery as Extract<PortfolioMediaDelivery, { status: 'bound' }>,
  )
  const inlinePlan = authority.resolveInlinePlan(asset, intent)
  return responsiveImagePlanner.resolve(inlinePlan, options)
}

export function resolvePortfolioVideoPresentation(
  asset: ResolvedVideoAssetReference,
): VideoPlayerPresentation | null {
  const delivery = resolveConfiguredPortfolioMediaDelivery()
  if (portfolioMediaDelivery.status === 'unbound' && delivery.status === 'unbound') {
    return null
  }

  const authority = getBoundMediaResolutionAuthority(
    delivery as Extract<PortfolioMediaDelivery, { status: 'bound' }>,
  )
  const videoPlan = authority.resolveInlinePlan(asset, 'primary')
  const posterPlan = asset.poster === null
    ? null
    : responsiveImagePlanner.resolve(
        authority.resolveInlinePlan(asset.poster, 'primary'),
        {
          sizes: MM_WORK_DETAIL_IMAGE_SIZES,
          accessibility: { mode: 'decorative' },
          loading: 'lazy',
          fetchPriority: 'auto',
          fit: 'contain',
        },
      )

  return videoPlayerPlanner.resolve(videoPlan, posterPlan)
}

export function resolvePortfolioAudioTrack(
  asset: ResolvedAudioAssetReference,
  projectId: ProjectId,
): PlayerTrack | null {
  const delivery = resolveConfiguredPortfolioMediaDelivery()
  if (portfolioMediaDelivery.status === 'unbound' && delivery.status === 'unbound') {
    return null
  }

  const authority = getBoundMediaResolutionAuthority(
    delivery as Extract<PortfolioMediaDelivery, { status: 'bound' }>,
  )
  const audioPlan = authority.resolveInlinePlan(asset, 'primary')
  return playerTrackPlanner.resolve(audioPlan, projectId)
}
