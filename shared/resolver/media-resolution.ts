import type {
  ResolvedAssetReference,
  ResolvedAudioAssetReference,
  ResolvedImageAssetReference,
  ResolvedVideoAssetReference,
} from '../view/portfolio-project-view'

import type {
  MediaInlineIntent,
  MediaResolutionOptions,
  ResolvedAudioInlinePlan,
  ResolvedAudioMedia,
  ResolvedAudioSource,
  ResolvedImageInlinePlan,
  ResolvedImageMedia,
  ResolvedImageSource,
  ResolvedMediaAsset,
  ResolvedMediaInlinePlan,
  ResolvedVideoInlinePlan,
  ResolvedVideoMedia,
  ResolvedVideoSource,
} from '../types/resolved-media'

export type MediaResolutionErrorCode =
  | 'invalid-media-base-url'
  | 'invalid-media-object-key'
  | 'asset-reference-identity-conflict'
  | 'rendition-kind-mismatch'
  | 'duplicate-resolved-source-url'
  | 'missing-primary-source'
  | 'default-source-membership-mismatch'
  | 'poster-kind-mismatch'
  | 'artwork-kind-mismatch'
  | 'unsupported-inline-intent'

export class MediaResolutionError extends Error {
  readonly code: MediaResolutionErrorCode
  readonly path: string
  readonly ownerId: string | null
  readonly value: unknown

  constructor(
    code: MediaResolutionErrorCode,
    path: string,
    ownerId: string | null,
    value: unknown,
  ) {
    super(
      `${code}: path=${path}; ownerId=${ownerId ?? 'null'}; value=${formatValue(value)}`,
    )

    this.name = 'MediaResolutionError'
    this.code = code
    this.path = path
    this.ownerId = ownerId
    this.value = value
  }
}

export interface MediaResolutionAuthority {
  readonly mediaBaseUrl: string

  resolveAsset(
    asset: ResolvedImageAssetReference,
  ): ResolvedImageMedia
  resolveAsset(
    asset: ResolvedVideoAssetReference,
  ): ResolvedVideoMedia
  resolveAsset(
    asset: ResolvedAudioAssetReference,
  ): ResolvedAudioMedia
  resolveAsset(
    asset: ResolvedAssetReference,
  ): ResolvedMediaAsset

  resolveInlinePlan(
    asset: ResolvedImageAssetReference,
    intent: 'primary' | 'thumbnail',
  ): ResolvedImageInlinePlan
  resolveInlinePlan(
    asset: ResolvedVideoAssetReference,
    intent: 'primary' | 'preview',
  ): ResolvedVideoInlinePlan
  resolveInlinePlan(
    asset: ResolvedAudioAssetReference,
    intent: 'primary' | 'preview',
  ): ResolvedAudioInlinePlan
  resolveInlinePlan(
    asset: ResolvedAssetReference,
    intent: MediaInlineIntent,
  ): ResolvedMediaInlinePlan
}

interface CachedAsset {
  readonly source: ResolvedAssetReference
  readonly output: ResolvedMediaAsset
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (
    value === null
    || typeof value === 'number'
    || typeof value === 'boolean'
    || typeof value === 'undefined'
  ) {
    return String(value)
  }

  if (Array.isArray(value)) return `[array:${value.length}]`
  return `[${typeof value}]`
}

function fail(
  code: MediaResolutionErrorCode,
  path: string,
  ownerId: string | null,
  value: unknown,
): never {
  throw new MediaResolutionError(
    code,
    path,
    ownerId,
    value,
  )
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function canonicalizeMediaBaseUrl(
  options: MediaResolutionOptions,
): string {
  if (!isPlainObject(options)) {
    fail(
      'invalid-media-base-url',
      'options.mediaBaseUrl',
      null,
      options,
    )
  }

  const input = options.mediaBaseUrl
  if (
    typeof input !== 'string'
    || input.length === 0
    || input !== input.trim()
    || /[\\]/.test(input)
  ) {
    fail(
      'invalid-media-base-url',
      'options.mediaBaseUrl',
      null,
      input,
    )
  }

  const rawMatch = /^https:\/\/[^/?#]+(?<path>\/[^?#]*)?$/.exec(input)
  const rawPath = rawMatch?.groups?.path ?? ''

  if (
    rawMatch === null
    || /\/\//.test(rawPath)
    || /\/(?:\.{1,2})(?:\/|$)/.test(rawPath)
    || /%(?:2f|5c)/i.test(rawPath)
  ) {
    fail(
      'invalid-media-base-url',
      'options.mediaBaseUrl',
      null,
      input,
    )
  }

  let parsed: URL
  try {
    parsed = new URL(input)
  } catch {
    fail(
      'invalid-media-base-url',
      'options.mediaBaseUrl',
      null,
      input,
    )
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.hostname.length === 0
    || parsed.username.length > 0
    || parsed.password.length > 0
    || parsed.search.length > 0
    || parsed.hash.length > 0
  ) {
    fail(
      'invalid-media-base-url',
      'options.mediaBaseUrl',
      null,
      input,
    )
  }

  const canonicalPath = parsed.pathname === '/'
    ? ''
    : parsed.pathname.replace(/\/$/, '')

  return `${parsed.origin}${canonicalPath}`
}

function validateObjectKey(
  asset: ResolvedAssetReference,
  objectKey: unknown,
  renditionIndex: number,
): string {
  const path = `asset(${asset.id}).renditions[${renditionIndex}].objectKey`
  const prefix = `assets/${asset.kind}/${asset.id}/`

  if (
    typeof objectKey !== 'string'
    || objectKey.length <= prefix.length
    || !objectKey.startsWith(prefix)
    || objectKey.startsWith('/')
    || objectKey.includes('\\')
    || objectKey.includes('..')
    || /\s/.test(objectKey)
    || objectKey.includes('?')
    || objectKey.includes('#')
    || objectKey.endsWith('/')
  ) {
    fail(
      'invalid-media-object-key',
      path,
      asset.id,
      objectKey,
    )
  }

  return objectKey
}

function assertRenditionKind(
  asset: ResolvedAssetReference,
  renditionKind: unknown,
  renditionIndex: number,
): void {
  if (renditionKind !== asset.kind) {
    fail(
      'rendition-kind-mismatch',
      `asset(${asset.id}).renditions[${renditionIndex}].kind`,
      asset.id,
      renditionKind,
    )
  }
}

function assertDefaultMembership<
  Source extends {
    readonly renditionId: string
    readonly isDefault: boolean
  },
>(
  asset: ResolvedAssetReference,
  sources: readonly Source[],
): Source {
  const defaultCandidates = sources.filter(
    source => source.isDefault,
  )
  const source = sources.find(
    item => item.renditionId === asset.defaultRendition.id,
  )
  const inputRenditions: readonly unknown[] = asset.renditions

  if (
    defaultCandidates.length !== 1
    || source === undefined
    || source !== defaultCandidates[0]
    || !inputRenditions.includes(asset.defaultRendition)
    || asset.defaultRendition.id !== asset.defaultRenditionId
  ) {
    fail(
      'default-source-membership-mismatch',
      `asset(${asset.id}).defaultRendition`,
      asset.id,
      asset.defaultRenditionId,
    )
  }

  return source
}

function assertPrimarySource(
  asset: ResolvedAssetReference,
  sources: readonly {
    readonly purpose: string
  }[],
): void {
  if (!sources.some(source => source.purpose === 'primary')) {
    fail(
      'missing-primary-source',
      `asset(${asset.id}).renditions`,
      asset.id,
      'primary',
    )
  }
}

function freezeArray<T>(
  values: readonly T[],
): readonly T[] {
  return Object.freeze([...values])
}

function resolveImageSources(
  asset: ResolvedImageAssetReference,
  mediaBaseUrl: string,
): {
  readonly sources: readonly ResolvedImageSource[]
  readonly defaultSource: ResolvedImageSource
} {
  const output: ResolvedImageSource[] = []
  const urls = new Set<string>()

  for (const [index, rendition] of asset.renditions.entries()) {
    assertRenditionKind(asset, rendition.kind, index)
    const objectKey = validateObjectKey(asset, rendition.objectKey, index)
    const url = `${mediaBaseUrl}/${objectKey}`

    if (urls.has(url)) {
      fail(
        'duplicate-resolved-source-url',
        `asset(${asset.id}).renditions[${index}].objectKey`,
        asset.id,
        url,
      )
    }
    urls.add(url)

    output.push(Object.freeze({
      kind: 'image' as const,
      renditionId: rendition.id,
      purpose: rendition.purpose,
      url,
      mediaType: rendition.mediaType,
      byteSize: rendition.byteSize,
      metadata: Object.freeze({
        width: rendition.metadata.width,
        height: rendition.metadata.height,
      }),
      isDefault: rendition.isDefault,
    }))
  }

  const sources = freezeArray(output)
  assertPrimarySource(asset, sources)
  const defaultSource = assertDefaultMembership(asset, sources)
  return Object.freeze({ sources, defaultSource })
}

function resolveVideoSources(
  asset: ResolvedVideoAssetReference,
  mediaBaseUrl: string,
): {
  readonly sources: readonly ResolvedVideoSource[]
  readonly defaultSource: ResolvedVideoSource
} {
  const output: ResolvedVideoSource[] = []
  const urls = new Set<string>()

  for (const [index, rendition] of asset.renditions.entries()) {
    assertRenditionKind(asset, rendition.kind, index)
    const objectKey = validateObjectKey(asset, rendition.objectKey, index)
    const url = `${mediaBaseUrl}/${objectKey}`

    if (urls.has(url)) {
      fail(
        'duplicate-resolved-source-url',
        `asset(${asset.id}).renditions[${index}].objectKey`,
        asset.id,
        url,
      )
    }
    urls.add(url)

    output.push(Object.freeze({
      kind: 'video' as const,
      renditionId: rendition.id,
      purpose: rendition.purpose,
      url,
      mediaType: rendition.mediaType,
      byteSize: rendition.byteSize,
      metadata: Object.freeze({
        width: rendition.metadata.width,
        height: rendition.metadata.height,
        durationMs: rendition.metadata.durationMs,
        hasAudio: rendition.metadata.hasAudio,
      }),
      isDefault: rendition.isDefault,
    }))
  }

  const sources = freezeArray(output)
  assertPrimarySource(asset, sources)
  const defaultSource = assertDefaultMembership(asset, sources)
  return Object.freeze({ sources, defaultSource })
}

function resolveAudioSources(
  asset: ResolvedAudioAssetReference,
  mediaBaseUrl: string,
): {
  readonly sources: readonly ResolvedAudioSource[]
  readonly defaultSource: ResolvedAudioSource
} {
  const output: ResolvedAudioSource[] = []
  const urls = new Set<string>()

  for (const [index, rendition] of asset.renditions.entries()) {
    assertRenditionKind(asset, rendition.kind, index)
    const objectKey = validateObjectKey(asset, rendition.objectKey, index)
    const url = `${mediaBaseUrl}/${objectKey}`

    if (urls.has(url)) {
      fail(
        'duplicate-resolved-source-url',
        `asset(${asset.id}).renditions[${index}].objectKey`,
        asset.id,
        url,
      )
    }
    urls.add(url)

    output.push(Object.freeze({
      kind: 'audio' as const,
      renditionId: rendition.id,
      purpose: rendition.purpose,
      url,
      mediaType: rendition.mediaType,
      byteSize: rendition.byteSize,
      metadata: Object.freeze({
        durationMs: rendition.metadata.durationMs,
      }),
      isDefault: rendition.isDefault,
    }))
  }

  const sources = freezeArray(output)
  assertPrimarySource(asset, sources)
  const defaultSource = assertDefaultMembership(asset, sources)
  return Object.freeze({ sources, defaultSource })
}

function assertIntent(
  asset: ResolvedAssetReference,
  intent: MediaInlineIntent,
): void {
  const allowed = intent === 'primary'
    || (asset.kind === 'image' && intent === 'thumbnail')
    || (asset.kind !== 'image' && intent === 'preview')

  if (!allowed) {
    fail(
      'unsupported-inline-intent',
      `asset(${asset.id}).inlineIntent`,
      asset.id,
      intent,
    )
  }
}

export function createMediaResolutionAuthority(
  options: MediaResolutionOptions,
): MediaResolutionAuthority {
  const mediaBaseUrl = canonicalizeMediaBaseUrl(options)
  const assetCache = new Map<string, CachedAsset>()
  const planCache = new WeakMap<ResolvedAssetReference, Map<MediaInlineIntent, ResolvedMediaInlinePlan>>()

  function resolveAsset(
    asset: ResolvedImageAssetReference,
  ): ResolvedImageMedia
  function resolveAsset(
    asset: ResolvedVideoAssetReference,
  ): ResolvedVideoMedia
  function resolveAsset(
    asset: ResolvedAudioAssetReference,
  ): ResolvedAudioMedia
  function resolveAsset(
    asset: ResolvedAssetReference,
  ): ResolvedMediaAsset
  function resolveAsset(
    asset: ResolvedAssetReference,
  ): ResolvedMediaAsset {
    const cached = assetCache.get(asset.id)
    if (cached !== undefined) {
      if (cached.source !== asset) {
        fail(
          'asset-reference-identity-conflict',
          `asset(${asset.id})`,
          asset.id,
          asset.id,
        )
      }
      return cached.output
    }

    let output: ResolvedMediaAsset

    if (asset.kind === 'image') {
      const projection = resolveImageSources(asset, mediaBaseUrl)
      output = Object.freeze({
        kind: 'image' as const,
        id: asset.id,
        label: asset.label,
        caption: asset.caption,
        credit: asset.credit,
        altText: asset.altText,
        sources: projection.sources,
        defaultSource: projection.defaultSource,
      })
    } else if (asset.kind === 'video') {
      if (asset.poster !== null && asset.poster.kind !== 'image') {
        fail(
          'poster-kind-mismatch',
          `asset(${asset.id}).poster`,
          asset.id,
          asset.poster.kind,
        )
      }
      const projection = resolveVideoSources(asset, mediaBaseUrl)
      const poster = asset.poster === null
        ? null
        : resolveAsset(asset.poster)
      output = Object.freeze({
        kind: 'video' as const,
        id: asset.id,
        label: asset.label,
        caption: asset.caption,
        credit: asset.credit,
        sources: projection.sources,
        defaultSource: projection.defaultSource,
        poster,
      })
    } else {
      if (asset.artwork !== null && asset.artwork.kind !== 'image') {
        fail(
          'artwork-kind-mismatch',
          `asset(${asset.id}).artwork`,
          asset.id,
          asset.artwork.kind,
        )
      }
      const projection = resolveAudioSources(asset, mediaBaseUrl)
      const artwork = asset.artwork === null
        ? null
        : resolveAsset(asset.artwork)
      output = Object.freeze({
        kind: 'audio' as const,
        id: asset.id,
        label: asset.label,
        caption: asset.caption,
        credit: asset.credit,
        sources: projection.sources,
        defaultSource: projection.defaultSource,
        artwork,
      })
    }

    assetCache.set(asset.id, Object.freeze({
      source: asset,
      output,
    }))
    return output
  }

  function resolveInlinePlan(
    asset: ResolvedImageAssetReference,
    intent: 'primary' | 'thumbnail',
  ): ResolvedImageInlinePlan
  function resolveInlinePlan(
    asset: ResolvedVideoAssetReference,
    intent: 'primary' | 'preview',
  ): ResolvedVideoInlinePlan
  function resolveInlinePlan(
    asset: ResolvedAudioAssetReference,
    intent: 'primary' | 'preview',
  ): ResolvedAudioInlinePlan
  function resolveInlinePlan(
    asset: ResolvedAssetReference,
    intent: MediaInlineIntent,
  ): ResolvedMediaInlinePlan
  function resolveInlinePlan(
    asset: ResolvedAssetReference,
    intent: MediaInlineIntent,
  ): ResolvedMediaInlinePlan {
    assertIntent(asset, intent)
    let assetPlans = planCache.get(asset)
    const existing = assetPlans?.get(intent)
    if (existing !== undefined) return existing

    const media = resolveAsset(asset)
    const requestedSources = media.sources.filter(
      source => source.purpose === intent,
    )
    const useFallback = intent !== 'primary' && requestedSources.length === 0
    const selectedPurpose = useFallback ? 'primary' : intent
    const selectedSources = useFallback
      ? media.sources.filter(source => source.purpose === 'primary')
      : requestedSources

    if (selectedSources.length === 0) {
      fail(
        'missing-primary-source',
        `asset(${asset.id}).renditions`,
        asset.id,
        selectedPurpose,
      )
    }

    const plan = Object.freeze({
      media,
      requestedIntent: intent,
      selectedPurpose,
      usedPrimaryFallback: useFallback,
      sources: freezeArray(selectedSources),
      fallbackSource: media.defaultSource,
    }) as ResolvedMediaInlinePlan

    if (assetPlans === undefined) {
      assetPlans = new Map()
      planCache.set(asset, assetPlans)
    }
    assetPlans.set(intent, plan)
    return plan
  }

  return Object.freeze({
    mediaBaseUrl,
    resolveAsset,
    resolveInlinePlan,
  })
}
