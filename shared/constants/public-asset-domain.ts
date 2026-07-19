export interface PublicAssetDomainRegistryEntry<
  Token extends string,
> {
  readonly token: Token
  readonly label: string
  readonly order: number
}

export const ASSET_KIND_REGISTRY = [
  { token: 'image', label: '이미지', order: 10 },
  { token: 'video', label: '영상', order: 20 },
  { token: 'audio', label: '오디오', order: 30 },
] as const satisfies readonly PublicAssetDomainRegistryEntry<string>[]

export type AssetKindEntry =
  typeof ASSET_KIND_REGISTRY[number]
export type AssetKind = AssetKindEntry['token']

export const ASSET_RENDITION_PURPOSE_REGISTRY = [
  {
    token: 'primary',
    label: '기본',
    order: 10,
    kinds: ['image', 'video', 'audio'],
  },
  {
    token: 'thumbnail',
    label: '썸네일',
    order: 20,
    kinds: ['image'],
  },
  {
    token: 'preview',
    label: '미리보기',
    order: 30,
    kinds: ['video', 'audio'],
  },
  {
    token: 'download',
    label: '다운로드',
    order: 40,
    kinds: ['image', 'video', 'audio'],
  },
] as const

export type AssetRenditionPurposeEntry =
  typeof ASSET_RENDITION_PURPOSE_REGISTRY[number]
export type AssetRenditionPurpose =
  AssetRenditionPurposeEntry['token']

export type AssetRenditionPurposeFor<
  Kind extends AssetKind,
> = AssetRenditionPurposeEntry extends infer Entry
  ? Entry extends {
      readonly token: infer Token extends string
      readonly kinds: readonly AssetKind[]
    }
    ? Kind extends Entry['kinds'][number]
      ? Token
      : never
    : never
  : never

export const IMAGE_ASSET_MEDIA_TYPE_REGISTRY = [
  {
    token: 'image/avif',
    extensions: ['avif'],
    kind: 'image',
    order: 10,
  },
  {
    token: 'image/webp',
    extensions: ['webp'],
    kind: 'image',
    order: 20,
  },
  {
    token: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    kind: 'image',
    order: 30,
  },
  {
    token: 'image/png',
    extensions: ['png'],
    kind: 'image',
    order: 40,
  },
] as const

export const VIDEO_ASSET_MEDIA_TYPE_REGISTRY = [
  {
    token: 'video/webm',
    extensions: ['webm'],
    kind: 'video',
    order: 10,
  },
  {
    token: 'video/mp4',
    extensions: ['mp4'],
    kind: 'video',
    order: 20,
  },
] as const

export const AUDIO_ASSET_MEDIA_TYPE_REGISTRY = [
  {
    token: 'audio/mpeg',
    extensions: ['mp3'],
    kind: 'audio',
    order: 10,
  },
  {
    token: 'audio/mp4',
    extensions: ['m4a', 'mp4'],
    kind: 'audio',
    order: 20,
  },
  {
    token: 'audio/ogg',
    extensions: ['ogg', 'oga'],
    kind: 'audio',
    order: 30,
  },
  {
    token: 'audio/wav',
    extensions: ['wav'],
    kind: 'audio',
    order: 40,
  },
] as const

export const ASSET_MEDIA_TYPE_REGISTRY = [
  ...IMAGE_ASSET_MEDIA_TYPE_REGISTRY,
  ...VIDEO_ASSET_MEDIA_TYPE_REGISTRY,
  ...AUDIO_ASSET_MEDIA_TYPE_REGISTRY,
] as const

export type AssetMediaTypeEntry =
  typeof ASSET_MEDIA_TYPE_REGISTRY[number]
export type AssetMediaType = AssetMediaTypeEntry['token']
export type AssetMediaTypeFor<
  Kind extends AssetKind,
> = Extract<
  AssetMediaTypeEntry,
  { readonly kind: Kind }
>['token']

const ASSET_KIND_TOKEN_SET: ReadonlySet<string> =
  new Set(ASSET_KIND_REGISTRY.map(entry => entry.token))

const ASSET_RENDITION_PURPOSE_BY_TOKEN:
ReadonlyMap<string, AssetRenditionPurposeEntry> = new Map(
  ASSET_RENDITION_PURPOSE_REGISTRY.map(
    entry => [entry.token, entry] as const,
  ),
)

const ASSET_MEDIA_TYPE_BY_TOKEN:
ReadonlyMap<string, AssetMediaTypeEntry> = new Map(
  ASSET_MEDIA_TYPE_REGISTRY.map(
    entry => [entry.token, entry] as const,
  ),
)

export function isAssetKind(
  value: unknown,
): value is AssetKind {
  return (
    typeof value === 'string'
    && ASSET_KIND_TOKEN_SET.has(value)
  )
}

export function isAssetRenditionPurpose(
  value: unknown,
): value is AssetRenditionPurpose {
  return (
    typeof value === 'string'
    && ASSET_RENDITION_PURPOSE_BY_TOKEN.has(value)
  )
}

export function isAssetRenditionPurposeFor(
  kind: AssetKind,
  value: unknown,
): value is AssetRenditionPurposeFor<typeof kind> {
  if (!isAssetRenditionPurpose(value)) return false
  const entry = ASSET_RENDITION_PURPOSE_BY_TOKEN.get(value)
  return (
    entry !== undefined
    && (entry.kinds as readonly AssetKind[]).includes(kind)
  )
}

export function isAssetMediaType(
  value: unknown,
): value is AssetMediaType {
  return (
    typeof value === 'string'
    && ASSET_MEDIA_TYPE_BY_TOKEN.has(value)
  )
}

export function getAssetMediaTypeEntry(
  value: AssetMediaType,
): AssetMediaTypeEntry {
  const entry = ASSET_MEDIA_TYPE_BY_TOKEN.get(value)
  if (!entry) {
    throw new Error(`Unknown asset media type: ${value}`)
  }
  return entry
}

export function isAssetMediaTypeFor(
  kind: AssetKind,
  value: unknown,
): value is AssetMediaTypeFor<typeof kind> {
  return (
    isAssetMediaType(value)
    && getAssetMediaTypeEntry(value).kind === kind
  )
}

export function getCanonicalExtensionForAssetMediaType(
  mediaType: AssetMediaType,
): string {
  const entry = getAssetMediaTypeEntry(mediaType)
  const extension = entry.extensions[0]
  if (!extension) {
    throw new Error(`Media type has no canonical extension: ${mediaType}`)
  }
  return extension
}
