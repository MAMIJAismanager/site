export interface PublicProjectLinkDomainRegistryEntry<
  Token extends string,
> {
  readonly token: Token
  readonly label: string
  readonly order: number
}

export const PROJECT_LINK_KIND_REGISTRY = [
  {
    token: 'youtube',
    label: 'YouTube',
    order: 10,
  },
  {
    token: 'vimeo',
    label: 'Vimeo',
    order: 20,
  },
  {
    token: 'spotify',
    label: 'Spotify',
    order: 30,
  },
  {
    token: 'soundcloud',
    label: 'SoundCloud',
    order: 40,
  },
  {
    token: 'instagram',
    label: 'Instagram',
    order: 50,
  },
  {
    token: 'website',
    label: '웹사이트',
    order: 60,
  },
] as const satisfies readonly PublicProjectLinkDomainRegistryEntry<string>[]

export type ProjectLinkKindEntry =
  typeof PROJECT_LINK_KIND_REGISTRY[number]

export type ProjectLinkKind =
  ProjectLinkKindEntry['token']

export const PROJECT_LINK_KIND_TOKENS:
readonly ProjectLinkKind[] = Object.freeze(
  PROJECT_LINK_KIND_REGISTRY.map(
    entry => entry.token,
  ),
)

const PROJECT_LINK_KIND_TOKEN_SET:
ReadonlySet<string> = new Set(PROJECT_LINK_KIND_TOKENS)

export function isProjectLinkKind(
  value: unknown,
): value is ProjectLinkKind {
  return (
    typeof value === 'string'
    && PROJECT_LINK_KIND_TOKEN_SET.has(value)
  )
}

export function readProjectLinkKind(
  value: unknown,
): ProjectLinkKind | null {
  return isProjectLinkKind(value)
    ? value
    : null
}
