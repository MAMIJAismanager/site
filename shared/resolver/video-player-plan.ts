import type { ResolvedVideoInlinePlan } from '../types/resolved-media'
import type { ResponsiveImageRenderPlan } from '../types/responsive-image'
import type {
  VideoPlayerPlanningAuthority,
  VideoPlayerPresentation,
  VideoPlayerSource,
} from '../types/video-player'

export type VideoPlayerPlanningErrorCode =
  | 'video-player-kind-mismatch'
  | 'empty-video-player-source-set'
  | 'unsupported-video-player-media-type'
  | 'invalid-video-player-source'
  | 'duplicate-video-player-media-type'
  | 'video-player-default-source-mismatch'
  | 'mixed-video-player-aspect-ratio'
  | 'mixed-video-player-duration'
  | 'mixed-video-player-audio-flag'
  | 'video-player-poster-identity-mismatch'
  | 'video-player-poster-aspect-ratio-mismatch'
  | 'video-player-poster-accessibility-mismatch'

export class VideoPlayerPlanningError extends Error {
  readonly code: VideoPlayerPlanningErrorCode
  readonly path: string
  readonly assetId: string | null
  readonly value: unknown

  constructor(
    code: VideoPlayerPlanningErrorCode,
    path: string,
    assetId: string | null,
    value: unknown,
  ) {
    super(`${code}: path=${path}; assetId=${assetId ?? 'null'}; value=${formatValue(value)}`)
    this.name = 'VideoPlayerPlanningError'
    this.code = code
    this.path = path
    this.assetId = assetId
    this.value = value
  }
}

const VIDEO_MEDIA_TYPES = new Set([
  'video/webm',
  'video/mp4',
] as const)

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function fail(
  code: VideoPlayerPlanningErrorCode,
  path: string,
  assetId: string | null,
  value: unknown,
): never {
  throw new VideoPlayerPlanningError(code, path, assetId, value)
}

function assertPositiveInteger(
  value: unknown,
  path: string,
  assetId: string,
): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    fail('invalid-video-player-source', path, assetId, value)
  }
  return value as number
}

function assertExactUrl(
  value: unknown,
  path: string,
  assetId: string,
): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || !value.startsWith('https://')
    || value.includes('?')
    || value.includes('#')
  ) {
    fail('invalid-video-player-source', path, assetId, value)
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' || parsed.search !== '' || parsed.hash !== '') {
      fail('invalid-video-player-source', path, assetId, value)
    }
  } catch {
    fail('invalid-video-player-source', path, assetId, value)
  }
  return value
}

function assertVideoPlan(plan: ResolvedVideoInlinePlan): void {
  const assetId = plan?.media?.id ?? null
  if (
    plan === null
    || typeof plan !== 'object'
    || plan.media?.kind !== 'video'
    || plan.fallbackSource?.kind !== 'video'
  ) {
    fail('video-player-kind-mismatch', 'videoPlan.media.kind', assetId, plan)
  }
  if (!Array.isArray(plan.sources) || plan.sources.length === 0) {
    fail('empty-video-player-source-set', 'videoPlan.sources', assetId, plan.sources)
  }
  if (plan.selectedPurpose !== 'primary') {
    fail('video-player-kind-mismatch', 'videoPlan.selectedPurpose', assetId, plan.selectedPurpose)
  }
  if (plan.fallbackSource !== plan.media.defaultSource) {
    fail(
      'video-player-default-source-mismatch',
      'videoPlan.fallbackSource',
      assetId,
      plan.fallbackSource,
    )
  }
}

function validatePoster(
  plan: ResolvedVideoInlinePlan,
  posterPlan: ResponsiveImageRenderPlan | null,
  width: number,
  height: number,
): void {
  const poster = plan.media.poster
  if (poster === null) {
    if (posterPlan !== null) {
      fail(
        'video-player-poster-identity-mismatch',
        'posterPlan',
        plan.media.id,
        posterPlan.assetId,
      )
    }
    return
  }
  if (posterPlan === null || posterPlan.assetId !== poster.id) {
    fail(
      'video-player-poster-identity-mismatch',
      'posterPlan.assetId',
      plan.media.id,
      posterPlan?.assetId ?? null,
    )
  }
  if (
    posterPlan.intrinsicSize.width * height
    !== posterPlan.intrinsicSize.height * width
  ) {
    fail(
      'video-player-poster-aspect-ratio-mismatch',
      'posterPlan.intrinsicSize',
      plan.media.id,
      posterPlan.intrinsicSize,
    )
  }
  if (!posterPlan.ariaHidden || posterPlan.alt !== '') {
    fail(
      'video-player-poster-accessibility-mismatch',
      'posterPlan.accessibility',
      plan.media.id,
      {
        alt: posterPlan.alt,
        ariaHidden: posterPlan.ariaHidden,
      },
    )
  }
}

function freezeSource(
  source: ResolvedVideoInlinePlan['sources'][number],
  assetId: string,
): VideoPlayerSource {
  if (source.kind !== 'video') {
    fail('video-player-kind-mismatch', 'videoPlan.sources.kind', assetId, source.kind)
  }
  if (!VIDEO_MEDIA_TYPES.has(source.mediaType)) {
    fail(
      'unsupported-video-player-media-type',
      'videoPlan.sources.mediaType',
      assetId,
      source.mediaType,
    )
  }
  const width = assertPositiveInteger(source.metadata.width, 'source.metadata.width', assetId)
  const height = assertPositiveInteger(source.metadata.height, 'source.metadata.height', assetId)
  const durationMs = assertPositiveInteger(
    source.metadata.durationMs,
    'source.metadata.durationMs',
    assetId,
  )
  if (typeof source.metadata.hasAudio !== 'boolean') {
    fail('invalid-video-player-source', 'source.metadata.hasAudio', assetId, source.metadata.hasAudio)
  }
  if (typeof source.renditionId !== 'string' || source.renditionId.length === 0) {
    fail('invalid-video-player-source', 'source.renditionId', assetId, source.renditionId)
  }
  const url = assertExactUrl(source.url, 'source.url', assetId)
  return Object.freeze({
    renditionId: source.renditionId,
    url,
    mediaType: source.mediaType,
    width,
    height,
    durationMs,
    hasAudio: source.metadata.hasAudio,
    isDefault: source.isDefault,
  })
}

export function createVideoPlayerPlanningAuthority(): VideoPlayerPlanningAuthority {
  const noPosterCache = new WeakMap<ResolvedVideoInlinePlan, VideoPlayerPresentation>()
  const posterCache = new WeakMap<
    ResolvedVideoInlinePlan,
    WeakMap<ResponsiveImageRenderPlan, VideoPlayerPresentation>
  >()

  function resolve(
    videoPlan: ResolvedVideoInlinePlan,
    posterPlan: ResponsiveImageRenderPlan | null,
  ): VideoPlayerPresentation {
    assertVideoPlan(videoPlan)
    const cached = posterPlan === null
      ? noPosterCache.get(videoPlan)
      : posterCache.get(videoPlan)?.get(posterPlan)
    if (cached !== undefined) return cached

    const assetId = videoPlan.media.id
    const mediaTypes = new Set<string>()
    const sourcePairs = videoPlan.sources.map((source, index) => {
      if (mediaTypes.has(source.mediaType)) {
        fail(
          'duplicate-video-player-media-type',
          `videoPlan.sources[${index}].mediaType`,
          assetId,
          source.mediaType,
        )
      }
      mediaTypes.add(source.mediaType)
      return Object.freeze({
        input: source,
        output: freezeSource(source, assetId),
      })
    })

    const defaultPairs = sourcePairs.filter(pair => pair.input.isDefault)
    const defaultPair = sourcePairs.find(pair => pair.input === videoPlan.media.defaultSource)
    if (
      defaultPairs.length !== 1
      || defaultPair === undefined
      || defaultPair.input !== videoPlan.fallbackSource
      || !defaultPair.output.isDefault
    ) {
      fail(
        'video-player-default-source-mismatch',
        'videoPlan.defaultSource',
        assetId,
        {
          defaultCount: defaultPairs.length,
          member: defaultPair !== undefined,
        },
      )
    }

    const defaultSource = defaultPair.output
    for (const [index, pair] of sourcePairs.entries()) {
      const source = pair.output
      if (source.width * defaultSource.height !== source.height * defaultSource.width) {
        fail(
          'mixed-video-player-aspect-ratio',
          `videoPlan.sources[${index}]`,
          assetId,
          { width: source.width, height: source.height },
        )
      }
      if (source.durationMs !== defaultSource.durationMs) {
        fail(
          'mixed-video-player-duration',
          `videoPlan.sources[${index}].durationMs`,
          assetId,
          source.durationMs,
        )
      }
      if (source.hasAudio !== defaultSource.hasAudio) {
        fail(
          'mixed-video-player-audio-flag',
          `videoPlan.sources[${index}].hasAudio`,
          assetId,
          source.hasAudio,
        )
      }
    }

    validatePoster(
      videoPlan,
      posterPlan,
      defaultSource.width,
      defaultSource.height,
    )

    const sources = Object.freeze(sourcePairs.map(pair => pair.output))
    const output = Object.freeze({
      assetId,
      label: videoPlan.media.label,
      sources,
      defaultSource,
      intrinsicSize: Object.freeze({
        width: defaultSource.width,
        height: defaultSource.height,
      }),
      declaredDurationMs: defaultSource.durationMs,
      hasAudio: defaultSource.hasAudio,
      posterPlan,
      preload: 'none' as const,
      playsInline: true as const,
    })

    if (posterPlan === null) {
      noPosterCache.set(videoPlan, output)
    } else {
      let byPoster = posterCache.get(videoPlan)
      if (byPoster === undefined) {
        byPoster = new WeakMap()
        posterCache.set(videoPlan, byPoster)
      }
      byPoster.set(posterPlan, output)
    }
    return output
  }

  return Object.freeze({ resolve })
}
