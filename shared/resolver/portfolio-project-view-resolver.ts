import {
  PROJECT_CATEGORY_REGISTRY,
  PROJECT_ROLE_REGISTRY,
} from '../constants/taxonomy'

import {
  PROJECT_LINK_KIND_REGISTRY,
} from '../constants/public-project-link-domain'

import type {
  ProjectCategory,
  ProjectRole,
} from '../constants/taxonomy'

import type {
  ProjectLinkKind,
} from '../constants/public-project-link-domain'

import type {
  AssetId,
  ProjectId,
} from '../types/domain-identifiers'

import type {
  PortfolioSnapshot,
  PublicPortfolioAsset,
  PublicPortfolioProject,
} from '../types/portfolio-snapshot'

import type {
  PortfolioSnapshotQueryAuthority,
} from '../query/portfolio-snapshot-query'

import type {
  AudioRenditionReferenceView,
  ImageRenditionReferenceView,
  ProjectAssetCollectionView,
  ProjectCardView,
  ProjectCategoryView,
  ProjectCreditGroupView,
  ProjectDisplayMetaView,
  ProjectExternalLinkView,
  ProjectPresentationBase,
  ProjectRoleView,
  ProjectSeoEditorialView,
  ProjectTagView,
  RelatedProjectView,
  ResolvedAssetReference,
  ResolvedAudioAssetReference,
  ResolvedImageAssetReference,
  ResolvedVideoAssetReference,
  ShowcaseProjectView,
  VideoRenditionReferenceView,
  WorkDetailView,
} from '../view/portfolio-project-view'

export type PortfolioProjectViewBuildErrorCode =
  | 'query-project-identity-mismatch'
  | 'query-project-slug-identity-mismatch'
  | 'query-asset-identity-mismatch'
  | 'unknown-project-category'
  | 'unknown-project-role'
  | 'unknown-project-link-kind'
  | 'duplicate-asset-rendition-id'
  | 'missing-default-rendition'
  | 'missing-project-asset'
  | 'project-asset-kind-mismatch'
  | 'missing-video-poster'
  | 'video-poster-kind-mismatch'
  | 'missing-audio-artwork'
  | 'audio-artwork-kind-mismatch'
  | 'missing-related-project'

export class PortfolioProjectViewBuildError
  extends Error {
  readonly code: PortfolioProjectViewBuildErrorCode
  readonly path: string
  readonly ownerId: string
  readonly referencedId: string | null

  constructor(
    code: PortfolioProjectViewBuildErrorCode,
    path: string,
    ownerId: string,
    referencedId: string | null,
  ) {
    super(
      `${code}: path=${path}; ownerId=${ownerId}; referencedId=${referencedId ?? 'null'}`,
    )

    this.name = 'PortfolioProjectViewBuildError'
    this.code = code
    this.path = path
    this.ownerId = ownerId
    this.referencedId = referencedId
  }
}

export interface PortfolioProjectViewResolver {
  readonly projectCards: readonly ProjectCardView[]
  readonly featuredShowcases: readonly ShowcaseProjectView[]

  findProjectCardById(id: string): ProjectCardView | null
  findProjectCardBySlug(slug: string): ProjectCardView | null
  findShowcaseById(id: string): ShowcaseProjectView | null
  findWorkDetailById(id: string): WorkDetailView | null
  findWorkDetailBySlug(slug: string): WorkDetailView | null
  findRelatedProjectById(id: string): RelatedProjectView | null
  findAssetReferenceById(id: string): ResolvedAssetReference | null
}

type ImageAsset = Extract<
  PublicPortfolioAsset,
  { readonly kind: 'image' }
>

type VideoAsset = Extract<
  PublicPortfolioAsset,
  { readonly kind: 'video' }
>

type AudioAsset = Extract<
  PublicPortfolioAsset,
  { readonly kind: 'audio' }
>

type AssetProjection =
  | {
      readonly kind: 'image'
      readonly source: ImageAsset
      readonly renditions: readonly ImageRenditionReferenceView[]
      readonly defaultRendition: ImageRenditionReferenceView
    }
  | {
      readonly kind: 'video'
      readonly source: VideoAsset
      readonly renditions: readonly VideoRenditionReferenceView[]
      readonly defaultRendition: VideoRenditionReferenceView
    }
  | {
      readonly kind: 'audio'
      readonly source: AudioAsset
      readonly renditions: readonly AudioRenditionReferenceView[]
      readonly defaultRendition: AudioRenditionReferenceView
    }

interface ProjectProjection {
  readonly source: PublicPortfolioProject
  readonly base: ProjectPresentationBase
  readonly credits: readonly ProjectCreditGroupView[]
  readonly externalLinks: readonly ProjectExternalLinkView[]
}

const CATEGORY_BY_TOKEN = new Map(
  PROJECT_CATEGORY_REGISTRY.map(
    entry => [entry.token, entry] as const,
  ),
)

const ROLE_BY_TOKEN = new Map(
  PROJECT_ROLE_REGISTRY.map(
    entry => [entry.token, entry] as const,
  ),
)

const LINK_KIND_BY_TOKEN = new Map(
  PROJECT_LINK_KIND_REGISTRY.map(
    entry => [entry.token, entry] as const,
  ),
)

function fail(
  code: PortfolioProjectViewBuildErrorCode,
  path: string,
  ownerId: string,
  referencedId: string | null,
): never {
  throw new PortfolioProjectViewBuildError(
    code,
    path,
    ownerId,
    referencedId,
  )
}

function freezeArray<T>(
  values: readonly T[],
): readonly T[] {
  return Object.freeze([...values])
}

function createMetaLine(
  year: number | null,
  client: string | null,
): string | null {
  if (year !== null && client !== null) {
    return `${year} · ${client}`
  }

  if (year !== null) {
    return String(year)
  }

  return client
}

function projectPath(
  projectIndex: number,
  suffix: string,
): string {
  return `projects[${projectIndex}].${suffix}`
}

function assetPath(
  assetIndex: number,
  suffix: string,
): string {
  return `assets[${assetIndex}].${suffix}`
}

function createImageRenditions(
  asset: ImageAsset,
  assetIndex: number,
): {
  readonly renditions: readonly ImageRenditionReferenceView[]
  readonly defaultRendition: ImageRenditionReferenceView
} {
  const seen = new Set<string>()
  const output: ImageRenditionReferenceView[] = []

  for (const [renditionIndex, rendition] of asset.renditions.entries()) {
    if (seen.has(rendition.id)) {
      fail(
        'duplicate-asset-rendition-id',
        assetPath(assetIndex, `renditions[${renditionIndex}].id`),
        asset.id,
        rendition.id,
      )
    }

    seen.add(rendition.id)
    output.push(Object.freeze({
      kind: 'image' as const,
      id: rendition.id,
      purpose: rendition.purpose,
      objectKey: rendition.objectKey,
      mediaType: rendition.mediaType,
      byteSize: rendition.byteSize,
      sha256: rendition.sha256,
      metadata: Object.freeze({
        width: rendition.metadata.width,
        height: rendition.metadata.height,
      }),
      isDefault: rendition.id === asset.defaultRenditionId,
    }))
  }

  const renditions = freezeArray(output)
  const defaultRendition = output.find(
    rendition => rendition.id === asset.defaultRenditionId,
  )

  if (!defaultRendition) {
    fail(
      'missing-default-rendition',
      assetPath(assetIndex, 'defaultRenditionId'),
      asset.id,
      asset.defaultRenditionId,
    )
  }

  return Object.freeze({
    renditions,
    defaultRendition,
  })
}

function createVideoRenditions(
  asset: VideoAsset,
  assetIndex: number,
): {
  readonly renditions: readonly VideoRenditionReferenceView[]
  readonly defaultRendition: VideoRenditionReferenceView
} {
  const seen = new Set<string>()
  const output: VideoRenditionReferenceView[] = []

  for (const [renditionIndex, rendition] of asset.renditions.entries()) {
    if (seen.has(rendition.id)) {
      fail(
        'duplicate-asset-rendition-id',
        assetPath(assetIndex, `renditions[${renditionIndex}].id`),
        asset.id,
        rendition.id,
      )
    }

    seen.add(rendition.id)
    output.push(Object.freeze({
      kind: 'video' as const,
      id: rendition.id,
      purpose: rendition.purpose,
      objectKey: rendition.objectKey,
      mediaType: rendition.mediaType,
      byteSize: rendition.byteSize,
      sha256: rendition.sha256,
      metadata: Object.freeze({
        width: rendition.metadata.width,
        height: rendition.metadata.height,
        durationMs: rendition.metadata.durationMs,
        hasAudio: rendition.metadata.hasAudio,
      }),
      isDefault: rendition.id === asset.defaultRenditionId,
    }))
  }

  const renditions = freezeArray(output)
  const defaultRendition = output.find(
    rendition => rendition.id === asset.defaultRenditionId,
  )

  if (!defaultRendition) {
    fail(
      'missing-default-rendition',
      assetPath(assetIndex, 'defaultRenditionId'),
      asset.id,
      asset.defaultRenditionId,
    )
  }

  return Object.freeze({
    renditions,
    defaultRendition,
  })
}

function createAudioRenditions(
  asset: AudioAsset,
  assetIndex: number,
): {
  readonly renditions: readonly AudioRenditionReferenceView[]
  readonly defaultRendition: AudioRenditionReferenceView
} {
  const seen = new Set<string>()
  const output: AudioRenditionReferenceView[] = []

  for (const [renditionIndex, rendition] of asset.renditions.entries()) {
    if (seen.has(rendition.id)) {
      fail(
        'duplicate-asset-rendition-id',
        assetPath(assetIndex, `renditions[${renditionIndex}].id`),
        asset.id,
        rendition.id,
      )
    }

    seen.add(rendition.id)
    output.push(Object.freeze({
      kind: 'audio' as const,
      id: rendition.id,
      purpose: rendition.purpose,
      objectKey: rendition.objectKey,
      mediaType: rendition.mediaType,
      byteSize: rendition.byteSize,
      sha256: rendition.sha256,
      metadata: Object.freeze({
        durationMs: rendition.metadata.durationMs,
      }),
      isDefault: rendition.id === asset.defaultRenditionId,
    }))
  }

  const renditions = freezeArray(output)
  const defaultRendition = output.find(
    rendition => rendition.id === asset.defaultRenditionId,
  )

  if (!defaultRendition) {
    fail(
      'missing-default-rendition',
      assetPath(assetIndex, 'defaultRenditionId'),
      asset.id,
      asset.defaultRenditionId,
    )
  }

  return Object.freeze({
    renditions,
    defaultRendition,
  })
}

function createProjectProjection(
  project: PublicPortfolioProject,
  projectIndex: number,
): ProjectProjection {
  const categoryEntry = CATEGORY_BY_TOKEN.get(
    project.category as ProjectCategory,
  )

  if (!categoryEntry) {
    fail(
      'unknown-project-category',
      projectPath(projectIndex, 'category'),
      project.id,
      String(project.category),
    )
  }

  const category: ProjectCategoryView = Object.freeze({
    token: categoryEntry.token,
    label: categoryEntry.label,
    order: categoryEntry.order,
  })

  const roles = freezeArray(
    project.roles.map((role, roleIndex) => {
      const entry = ROLE_BY_TOKEN.get(role as ProjectRole)

      if (!entry) {
        fail(
          'unknown-project-role',
          projectPath(projectIndex, `roles[${roleIndex}]`),
          project.id,
          String(role),
        )
      }

      const view: ProjectRoleView = Object.freeze({
        token: entry.token,
        label: entry.label,
        order: entry.order,
      })

      return view
    }),
  )

  const tags = freezeArray(
    project.tags.map(tag => {
      const view: ProjectTagView = Object.freeze({
        token: tag.token,
        label: tag.label,
      })

      return view
    }),
  )

  const timing = Object.freeze({
    year: project.timing.year,
    releaseDate: project.timing.releaseDate,
  })

  const displayMeta: ProjectDisplayMetaView = Object.freeze({
    timing,
    client: project.client,
    metaLine: createMetaLine(
      project.timing.year,
      project.client,
    ),
  })

  const credits = freezeArray(
    project.credits.map(group => Object.freeze({
      id: group.id,
      label: group.label,
      entries: freezeArray(
        group.entries.map(entry => Object.freeze({
          role: entry.role,
          name: entry.name,
          href: entry.href,
        })),
      ),
    })),
  ) as readonly ProjectCreditGroupView[]

  const externalLinks = freezeArray(
    project.externalLinks.map((link, linkIndex) => {
      const entry = LINK_KIND_BY_TOKEN.get(
        link.kind as ProjectLinkKind,
      )

      if (!entry) {
        fail(
          'unknown-project-link-kind',
          projectPath(projectIndex, `externalLinks[${linkIndex}].kind`),
          project.id,
          String(link.kind),
        )
      }

      const view: ProjectExternalLinkView = Object.freeze({
        kind: entry.token,
        kindLabel: entry.label,
        label: link.label,
        href: link.href,
      })

      return view
    }),
  )

  const base: ProjectPresentationBase = Object.freeze({
    id: project.id,
    slug: project.slug,
    href: `/works/${project.slug}`,
    title: project.title,
    category,
    gatewayCategoryIds: freezeArray(project.gatewayCategoryIds),
    roles,
    tags,
    displayMeta,
    summary: project.summary,
    featured: project.featured,
    order: project.order,
  })

  return Object.freeze({
    source: project,
    base,
    credits,
    externalLinks,
  })
}

export function createPortfolioProjectViewResolver(
  snapshot: PortfolioSnapshot,
  queries: PortfolioSnapshotQueryAuthority,
): PortfolioProjectViewResolver {
  for (const [projectIndex, project] of snapshot.projects.entries()) {
    if (queries.findProjectById(project.id) !== project) {
      fail(
        'query-project-identity-mismatch',
        projectPath(projectIndex, 'id'),
        project.id,
        project.id,
      )
    }

    if (queries.findProjectBySlug(project.slug) !== project) {
      fail(
        'query-project-slug-identity-mismatch',
        projectPath(projectIndex, 'slug'),
        project.id,
        project.slug,
      )
    }
  }

  for (const [assetIndex, asset] of snapshot.assets.entries()) {
    if (queries.findAssetById(asset.id) !== asset) {
      fail(
        'query-asset-identity-mismatch',
        assetPath(assetIndex, 'id'),
        asset.id,
        asset.id,
      )
    }
  }

  const projections: AssetProjection[] = []
  const projectionById = new Map<AssetId, AssetProjection>()

  for (const [assetIndex, asset] of snapshot.assets.entries()) {
    let projection: AssetProjection

    if (asset.kind === 'image') {
      projection = Object.freeze({
        kind: 'image' as const,
        source: asset,
        ...createImageRenditions(asset, assetIndex),
      })
    } else if (asset.kind === 'video') {
      projection = Object.freeze({
        kind: 'video' as const,
        source: asset,
        ...createVideoRenditions(asset, assetIndex),
      })
    } else {
      projection = Object.freeze({
        kind: 'audio' as const,
        source: asset,
        ...createAudioRenditions(asset, assetIndex),
      })
    }

    projections.push(projection)
    projectionById.set(asset.id, projection)
  }

  const imageReferenceById =
    new Map<AssetId, ResolvedImageAssetReference>()

  for (const projection of projections) {
    if (projection.kind !== 'image') {
      continue
    }

    const reference: ResolvedImageAssetReference = Object.freeze({
      id: projection.source.id,
      kind: 'image',
      label: projection.source.label,
      caption: projection.source.caption,
      credit: projection.source.credit,
      altText: projection.source.altText,
      defaultRenditionId: projection.source.defaultRenditionId,
      defaultRendition: projection.defaultRendition,
      renditions: projection.renditions,
    })

    imageReferenceById.set(reference.id, reference)
  }

  const assetReferenceById =
    new Map<AssetId, ResolvedAssetReference>()

  for (const [assetIndex, projection] of projections.entries()) {
    if (projection.kind === 'image') {
      const reference = imageReferenceById.get(
        projection.source.id,
      )

      if (!reference) {
        fail(
          'missing-project-asset',
          assetPath(assetIndex, 'id'),
          projection.source.id,
          projection.source.id,
        )
      }

      assetReferenceById.set(reference.id, reference)
      continue
    }

    if (projection.kind === 'video') {
      const posterId = projection.source.posterAssetId
      let poster: ResolvedImageAssetReference | null = null

      if (posterId !== null) {
        const target = projectionById.get(posterId)

        if (!target) {
          fail(
            'missing-video-poster',
            assetPath(assetIndex, 'posterAssetId'),
            projection.source.id,
            posterId,
          )
        }

        if (target.kind !== 'image') {
          fail(
            'video-poster-kind-mismatch',
            assetPath(assetIndex, 'posterAssetId'),
            projection.source.id,
            posterId,
          )
        }

        poster = imageReferenceById.get(posterId) ?? null

        if (!poster) {
          fail(
            'missing-video-poster',
            assetPath(assetIndex, 'posterAssetId'),
            projection.source.id,
            posterId,
          )
        }
      }

      const reference: ResolvedVideoAssetReference = Object.freeze({
        id: projection.source.id,
        kind: 'video',
        label: projection.source.label,
        caption: projection.source.caption,
        credit: projection.source.credit,
        defaultRenditionId: projection.source.defaultRenditionId,
        defaultRendition: projection.defaultRendition,
        renditions: projection.renditions,
        poster,
      })

      assetReferenceById.set(reference.id, reference)
      continue
    }

    const artworkId = projection.source.artworkAssetId
    let artwork: ResolvedImageAssetReference | null = null

    if (artworkId !== null) {
      const target = projectionById.get(artworkId)

      if (!target) {
        fail(
          'missing-audio-artwork',
          assetPath(assetIndex, 'artworkAssetId'),
          projection.source.id,
          artworkId,
        )
      }

      if (target.kind !== 'image') {
        fail(
          'audio-artwork-kind-mismatch',
          assetPath(assetIndex, 'artworkAssetId'),
          projection.source.id,
          artworkId,
        )
      }

      artwork = imageReferenceById.get(artworkId) ?? null

      if (!artwork) {
        fail(
          'missing-audio-artwork',
          assetPath(assetIndex, 'artworkAssetId'),
          projection.source.id,
          artworkId,
        )
      }
    }

    const reference: ResolvedAudioAssetReference = Object.freeze({
      id: projection.source.id,
      kind: 'audio',
      label: projection.source.label,
      caption: projection.source.caption,
      credit: projection.source.credit,
      defaultRenditionId: projection.source.defaultRenditionId,
      defaultRendition: projection.defaultRendition,
      renditions: projection.renditions,
      artwork,
    })

    assetReferenceById.set(reference.id, reference)
  }

  const projectProjections = snapshot.projects.map(
    (project, projectIndex) => createProjectProjection(
      project,
      projectIndex,
    ),
  )

  const projectAssetViewById =
    new Map<ProjectId, ProjectAssetCollectionView>()

  function resolveProjectAsset(
    owner: PublicPortfolioProject,
    ownerIndex: number,
    id: AssetId,
    suffix: string,
    imageRequired: boolean,
  ): ResolvedAssetReference {
    const reference = assetReferenceById.get(id)

    if (!reference) {
      fail(
        'missing-project-asset',
        projectPath(ownerIndex, suffix),
        owner.id,
        id,
      )
    }

    if (imageRequired && reference.kind !== 'image') {
      fail(
        'project-asset-kind-mismatch',
        projectPath(ownerIndex, suffix),
        owner.id,
        id,
      )
    }

    return reference
  }

  for (const [projectIndex, project] of snapshot.projects.entries()) {
    const cover = resolveProjectAsset(
      project,
      projectIndex,
      project.assets.coverAssetId,
      'assets.coverAssetId',
      true,
    ) as ResolvedImageAssetReference

    const backdrop = project.assets.backdropAssetId === null
      ? null
      : resolveProjectAsset(
          project,
          projectIndex,
          project.assets.backdropAssetId,
          'assets.backdropAssetId',
          true,
        ) as ResolvedImageAssetReference

    const primary = project.assets.primaryAssetId === null
      ? null
      : resolveProjectAsset(
          project,
          projectIndex,
          project.assets.primaryAssetId,
          'assets.primaryAssetId',
          false,
        )

    const gallery = freezeArray(
      project.assets.galleryAssetIds.map(
        (id, galleryIndex) => resolveProjectAsset(
          project,
          projectIndex,
          id,
          `assets.galleryAssetIds[${galleryIndex}]`,
          false,
        ),
      ),
    )

    const seoOg = project.seo.ogAssetId === null
      ? null
      : resolveProjectAsset(
          project,
          projectIndex,
          project.seo.ogAssetId,
          'seo.ogAssetId',
          true,
        ) as ResolvedImageAssetReference

    projectAssetViewById.set(
      project.id,
      Object.freeze({
        cover,
        backdrop,
        primary,
        gallery,
        seoOg,
      }),
    )
  }

  const relatedByProjectId =
    new Map<ProjectId, RelatedProjectView>()

  for (const [projectIndex, projection] of projectProjections.entries()) {
    const assets = projectAssetViewById.get(
      projection.source.id,
    )

    if (!assets) {
      fail(
        'missing-project-asset',
        projectPath(projectIndex, 'assets.coverAssetId'),
        projection.source.id,
        projection.source.assets.coverAssetId,
      )
    }

    const related: RelatedProjectView = Object.freeze({
      ...projection.base,
      cover: assets.cover,
    })

    relatedByProjectId.set(projection.source.id, related)
  }

  const cardByProjectId = new Map<ProjectId, ProjectCardView>()
  const cardBySlug = new Map<string, ProjectCardView>()
  const showcaseByProjectId = new Map<ProjectId, ShowcaseProjectView>()
  const detailByProjectId = new Map<ProjectId, WorkDetailView>()
  const detailBySlug = new Map<string, WorkDetailView>()
  const projectCards: ProjectCardView[] = []

  for (const [projectIndex, projection] of projectProjections.entries()) {
    const project = projection.source
    const assets = projectAssetViewById.get(project.id)

    if (!assets) {
      fail(
        'missing-project-asset',
        projectPath(projectIndex, 'assets.coverAssetId'),
        project.id,
        project.assets.coverAssetId,
      )
    }

    const relatedProjects = freezeArray(
      project.relatedProjectIds.map(
        (relatedId, relatedIndex) => {
          const related = relatedByProjectId.get(relatedId)

          if (!related) {
            fail(
              'missing-related-project',
              projectPath(
                projectIndex,
                `relatedProjectIds[${relatedIndex}]`,
              ),
              project.id,
              relatedId,
            )
          }

          return related
        },
      ),
    )

    const card: ProjectCardView = Object.freeze({
      ...projection.base,
      cover: assets.cover,
    })

    const showcase: ShowcaseProjectView = Object.freeze({
      ...projection.base,
      cover: assets.cover,
      backdrop: assets.backdrop,
      primary: assets.primary,
    })

    const seo: ProjectSeoEditorialView = Object.freeze({
      title: project.seo.title,
      description: project.seo.description,
      indexable: project.seo.indexable,
      ogAsset: assets.seoOg,
    })

    const detail: WorkDetailView = Object.freeze({
      ...projection.base,
      description: project.description,
      assets,
      credits: projection.credits,
      externalLinks: projection.externalLinks,
      relatedProjects,
      seo,
    })

    projectCards.push(card)
    cardByProjectId.set(project.id, card)
    cardBySlug.set(project.slug, card)
    showcaseByProjectId.set(project.id, showcase)
    detailByProjectId.set(project.id, detail)
    detailBySlug.set(project.slug, detail)
  }

  const featuredShowcases = freezeArray(
    queries.featuredProjects.map(project => {
      const view = showcaseByProjectId.get(project.id)

      if (!view) {
        fail(
          'query-project-identity-mismatch',
          'queries.featuredProjects',
          project.id,
          project.id,
        )
      }

      return view
    }),
  )

  return Object.freeze({
    projectCards: freezeArray(projectCards),
    featuredShowcases,
    findProjectCardById(
      id: string,
    ): ProjectCardView | null {
      return cardByProjectId.get(id as ProjectId) ?? null
    },
    findProjectCardBySlug(
      slug: string,
    ): ProjectCardView | null {
      return cardBySlug.get(slug) ?? null
    },
    findShowcaseById(
      id: string,
    ): ShowcaseProjectView | null {
      return showcaseByProjectId.get(id as ProjectId) ?? null
    },
    findWorkDetailById(
      id: string,
    ): WorkDetailView | null {
      return detailByProjectId.get(id as ProjectId) ?? null
    },
    findWorkDetailBySlug(
      slug: string,
    ): WorkDetailView | null {
      return detailBySlug.get(slug) ?? null
    },
    findRelatedProjectById(
      id: string,
    ): RelatedProjectView | null {
      return relatedByProjectId.get(id as ProjectId) ?? null
    },
    findAssetReferenceById(
      id: string,
    ): ResolvedAssetReference | null {
      return assetReferenceById.get(id as AssetId) ?? null
    },
  })
}
