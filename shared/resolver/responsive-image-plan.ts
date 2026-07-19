import type { ResolvedImageInlinePlan } from '../types/resolved-media'
import type {
  ResponsiveImageAccessibility,
  ResponsiveImageCandidate,
  ResponsiveImageFetchPriority,
  ResponsiveImageFit,
  ResponsiveImageLoading,
  ResponsiveImageMediaType,
  ResponsiveImagePlanningAuthority,
  ResponsiveImageRenderOptions,
  ResponsiveImageRenderPlan,
  ResponsiveImageSourceSet,
} from '../types/responsive-image'

export type ResponsiveImagePlanningErrorCode =
  | 'invalid-responsive-image-options'
  | 'invalid-responsive-image-sizes'
  | 'invalid-responsive-image-alt'
  | 'non-image-inline-plan'
  | 'empty-responsive-image-source-set'
  | 'fallback-source-identity-mismatch'
  | 'invalid-responsive-image-dimension'
  | 'mixed-responsive-image-aspect-ratio'
  | 'duplicate-responsive-image-width'
  | 'invalid-responsive-image-url'
  | 'unsupported-responsive-image-media-type'

export class ResponsiveImagePlanningError extends Error {
  readonly code: ResponsiveImagePlanningErrorCode
  readonly path: string
  readonly assetId: string | null
  readonly value: unknown

  constructor(
    code: ResponsiveImagePlanningErrorCode,
    path: string,
    assetId: string | null,
    value: unknown,
  ) {
    super(`${code}: path=${path}; assetId=${assetId ?? 'null'}; value=${formatValue(value)}`)
    this.name = 'ResponsiveImagePlanningError'
    this.code = code
    this.path = path
    this.assetId = assetId
    this.value = value
  }
}

const SUPPORTED_MEDIA_TYPES = new Set<ResponsiveImageMediaType>([
  'image/avif',
  'image/webp',
  'image/jpeg',
  'image/png',
])

const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/u

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function fail(
  code: ResponsiveImagePlanningErrorCode,
  path: string,
  assetId: string | null,
  value: unknown,
): never {
  throw new ResponsiveImagePlanningError(code, path, assetId, value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertExactText(
  value: unknown,
  path: string,
  assetId: string | null,
  code: ResponsiveImagePlanningErrorCode,
  allowEmpty: boolean,
  maxBytes?: number,
): string {
  if (
    typeof value !== 'string'
    || value.trim() !== value
    || (!allowEmpty && value.length === 0)
    || CONTROL_CHARACTER.test(value)
    || (maxBytes !== undefined && new TextEncoder().encode(value).byteLength > maxBytes)
  ) {
    fail(code, path, assetId, value)
  }
  return value
}

function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  assetId: string | null,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail('invalid-responsive-image-options', path, assetId, value)
  }
  return value as T
}

function validateAccessibility(
  value: unknown,
  assetId: string | null,
): {
  readonly accessibility: ResponsiveImageAccessibility
  readonly alt: string
  readonly ariaHidden: boolean
} {
  if (!isPlainObject(value)) {
    fail('invalid-responsive-image-options', 'options.accessibility', assetId, value)
  }

  if (value.mode === 'decorative') {
    if (Object.keys(value).some(key => key !== 'mode')) {
      fail('invalid-responsive-image-options', 'options.accessibility', assetId, value)
    }
    return {
      accessibility: Object.freeze({ mode: 'decorative' as const }),
      alt: '',
      ariaHidden: true,
    }
  }

  if (value.mode === 'informative') {
    const altText = assertExactText(
      value.altText,
      'options.accessibility.altText',
      assetId,
      'invalid-responsive-image-alt',
      false,
    )
    if (Object.keys(value).some(key => key !== 'mode' && key !== 'altText')) {
      fail('invalid-responsive-image-options', 'options.accessibility', assetId, value)
    }
    return {
      accessibility: Object.freeze({
        mode: 'informative' as const,
        altText,
      }),
      alt: altText,
      ariaHidden: false,
    }
  }

  fail('invalid-responsive-image-options', 'options.accessibility.mode', assetId, value.mode)
}

function validateOptions(
  value: ResponsiveImageRenderOptions,
  assetId: string | null,
): {
  readonly options: ResponsiveImageRenderOptions
  readonly alt: string
  readonly ariaHidden: boolean
  readonly key: string
} {
  if (!isPlainObject(value)) {
    fail('invalid-responsive-image-options', 'options', assetId, value)
  }

  const allowedKeys = new Set([
    'sizes',
    'accessibility',
    'loading',
    'fetchPriority',
    'fit',
  ])
  if (Object.keys(value).some(key => !allowedKeys.has(key))) {
    fail('invalid-responsive-image-options', 'options', assetId, value)
  }

  const sizes = assertExactText(
    value.sizes,
    'options.sizes',
    assetId,
    'invalid-responsive-image-sizes',
    false,
    1024,
  )
  const accessibility = validateAccessibility(value.accessibility, assetId)
  const loading = assertEnum<ResponsiveImageLoading>(
    value.loading,
    ['eager', 'lazy'],
    'options.loading',
    assetId,
  )
  const fetchPriority = assertEnum<ResponsiveImageFetchPriority>(
    value.fetchPriority,
    ['high', 'auto', 'low'],
    'options.fetchPriority',
    assetId,
  )
  const fit = assertEnum<ResponsiveImageFit>(
    value.fit,
    ['cover', 'contain'],
    'options.fit',
    assetId,
  )

  const normalized = Object.freeze({
    sizes,
    accessibility: accessibility.accessibility,
    loading,
    fetchPriority,
    fit,
  })
  const key = JSON.stringify({
    sizes,
    accessibility: accessibility.accessibility,
    loading,
    fetchPriority,
    fit,
  })

  return {
    options: normalized,
    alt: accessibility.alt,
    ariaHidden: accessibility.ariaHidden,
    key,
  }
}

function assertImagePlan(plan: ResolvedImageInlinePlan): void {
  const assetId = plan?.media?.id ?? null
  if (plan === null || typeof plan !== 'object' || plan.media?.kind !== 'image') {
    fail('non-image-inline-plan', 'plan.media.kind', assetId, plan)
  }
  if (!Array.isArray(plan.sources) || plan.sources.length === 0) {
    fail('empty-responsive-image-source-set', 'plan.sources', assetId, plan.sources)
  }
  if (
    plan.fallbackSource?.kind !== 'image'
    || plan.fallbackSource !== plan.media.defaultSource
  ) {
    fail(
      'fallback-source-identity-mismatch',
      'plan.fallbackSource',
      assetId,
      plan.fallbackSource,
    )
  }
  if (plan.selectedPurpose !== 'primary' && plan.selectedPurpose !== 'thumbnail') {
    fail('non-image-inline-plan', 'plan.selectedPurpose', assetId, plan.selectedPurpose)
  }
  for (const [index, source] of plan.sources.entries()) {
    if (source.kind !== 'image' || source.purpose !== plan.selectedPurpose) {
      fail('non-image-inline-plan', `plan.sources[${index}]`, assetId, source)
    }
  }
}

function assertDimension(
  value: unknown,
  path: string,
  assetId: string,
): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    fail('invalid-responsive-image-dimension', path, assetId, value)
  }
  return value as number
}

function validateUrl(
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
    fail('invalid-responsive-image-url', path, assetId, value)
  }

  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' || parsed.search !== '' || parsed.hash !== '') {
      fail('invalid-responsive-image-url', path, assetId, value)
    }
  } catch {
    fail('invalid-responsive-image-url', path, assetId, value)
  }

  return value
}

function validateMediaType(
  value: unknown,
  path: string,
  assetId: string,
): ResponsiveImageMediaType {
  if (typeof value !== 'string' || !SUPPORTED_MEDIA_TYPES.has(value as ResponsiveImageMediaType)) {
    fail('unsupported-responsive-image-media-type', path, assetId, value)
  }
  return value as ResponsiveImageMediaType
}

function serializeSrcset(
  candidates: readonly ResponsiveImageCandidate[],
): string {
  return candidates
    .map(candidate => `${candidate.url} ${candidate.width}w`)
    .join(', ')
}

function deepFreezeSourceSet(
  mediaType: ResponsiveImageMediaType,
  candidates: readonly ResponsiveImageCandidate[],
): ResponsiveImageSourceSet {
  const frozenCandidates = Object.freeze([...candidates])
  return Object.freeze({
    mediaType,
    candidates: frozenCandidates,
    srcset: serializeSrcset(frozenCandidates),
  })
}

export function createResponsiveImagePlanningAuthority(): ResponsiveImagePlanningAuthority {
  const cache = new WeakMap<ResolvedImageInlinePlan, Map<string, ResponsiveImageRenderPlan>>()

  function resolve(
    plan: ResolvedImageInlinePlan,
    rawOptions: ResponsiveImageRenderOptions,
  ): ResponsiveImageRenderPlan {
    assertImagePlan(plan)
    const assetId = plan.media.id
    const validatedOptions = validateOptions(rawOptions, assetId)
    let optionCache = cache.get(plan)
    const cached = optionCache?.get(validatedOptions.key)
    if (cached !== undefined) return cached

    const fallbackWidth = assertDimension(
      plan.fallbackSource.metadata.width,
      'plan.fallbackSource.metadata.width',
      assetId,
    )
    const fallbackHeight = assertDimension(
      plan.fallbackSource.metadata.height,
      'plan.fallbackSource.metadata.height',
      assetId,
    )
    const fallbackUrl = validateUrl(
      plan.fallbackSource.url,
      'plan.fallbackSource.url',
      assetId,
    )
    const fallbackMediaType = validateMediaType(
      plan.fallbackSource.mediaType,
      'plan.fallbackSource.mediaType',
      assetId,
    )

    const groupOrder: ResponsiveImageMediaType[] = []
    const groups = new Map<ResponsiveImageMediaType, ResponsiveImageCandidate[]>()
    const widthsByGroup = new Map<ResponsiveImageMediaType, Set<number>>()

    for (const [index, source] of plan.sources.entries()) {
      const width = assertDimension(
        source.metadata.width,
        `plan.sources[${index}].metadata.width`,
        assetId,
      )
      const height = assertDimension(
        source.metadata.height,
        `plan.sources[${index}].metadata.height`,
        assetId,
      )
      if (width * fallbackHeight !== height * fallbackWidth) {
        fail(
          'mixed-responsive-image-aspect-ratio',
          `plan.sources[${index}].metadata`,
          assetId,
          { width, height, fallbackWidth, fallbackHeight },
        )
      }

      const url = validateUrl(
        source.url,
        `plan.sources[${index}].url`,
        assetId,
      )
      const mediaType = validateMediaType(
        source.mediaType,
        `plan.sources[${index}].mediaType`,
        assetId,
      )

      let widths = widthsByGroup.get(mediaType)
      if (widths === undefined) {
        widths = new Set()
        widthsByGroup.set(mediaType, widths)
        groups.set(mediaType, [])
        groupOrder.push(mediaType)
      }
      if (widths.has(width)) {
        fail(
          'duplicate-responsive-image-width',
          `plan.sources[${index}].metadata.width`,
          assetId,
          { mediaType, width },
        )
      }
      widths.add(width)

      const candidate = Object.freeze({
        url,
        width,
        height,
      })
      groups.get(mediaType)?.push(candidate)
    }

    const sourceSets: ResponsiveImageSourceSet[] = []
    for (const mediaType of groupOrder) {
      if (mediaType === fallbackMediaType) continue
      const candidates = groups.get(mediaType)
      if (candidates === undefined || candidates.length === 0) continue
      sourceSets.push(deepFreezeSourceSet(mediaType, candidates))
    }

    const fallbackCandidates = groups.get(fallbackMediaType)
    const fallback = Object.freeze({
      url: fallbackUrl,
      mediaType: fallbackMediaType,
      width: fallbackWidth,
      height: fallbackHeight,
      srcset: fallbackCandidates === undefined || fallbackCandidates.length === 0
        ? null
        : serializeSrcset(fallbackCandidates),
    })
    const intrinsicSize = Object.freeze({
      width: fallbackWidth,
      height: fallbackHeight,
    })
    const output = Object.freeze({
      assetId,
      sourceSets: Object.freeze(sourceSets),
      fallback,
      sizes: validatedOptions.options.sizes,
      intrinsicSize,
      alt: validatedOptions.alt,
      ariaHidden: validatedOptions.ariaHidden,
      loading: validatedOptions.options.loading,
      fetchPriority: validatedOptions.options.fetchPriority,
      decoding: 'async' as const,
      fit: validatedOptions.options.fit,
    })

    if (optionCache === undefined) {
      optionCache = new Map()
      cache.set(plan, optionCache)
    }
    optionCache.set(validatedOptions.key, output)
    return output
  }

  return Object.freeze({ resolve })
}
