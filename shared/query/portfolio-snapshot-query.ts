import {
  PROJECT_CATEGORY_REGISTRY,
  PROJECT_ROLE_REGISTRY,
} from '../constants/taxonomy'

import type {
  ProjectCategory,
  ProjectRole,
} from '../constants/taxonomy'

import type {
  AssetId,
  ProjectId,
} from '../types/domain-identifiers'

import type {
  PortfolioSnapshot,
  PublicPortfolioAsset,
  PublicPortfolioProject,
} from '../types/portfolio-snapshot'

export interface ProjectCategoryFacetCount {
  readonly token: ProjectCategory
  readonly label: string
  readonly order: number
  readonly count: number
}

export interface ProjectRoleFacetCount {
  readonly token: ProjectRole
  readonly label: string
  readonly order: number
  readonly count: number
}

export type PortfolioSnapshotQueryBuildErrorCode =
  | 'duplicate-project-id'
  | 'duplicate-project-slug'
  | 'duplicate-asset-id'

export class PortfolioSnapshotQueryBuildError
  extends Error {
  readonly code: PortfolioSnapshotQueryBuildErrorCode
  readonly key: string
  readonly firstIndex: number
  readonly duplicateIndex: number

  constructor(
    code: PortfolioSnapshotQueryBuildErrorCode,
    key: string,
    firstIndex: number,
    duplicateIndex: number,
  ) {
    super(
      `${code}: key "${key}" first appears at index ${firstIndex} and repeats at index ${duplicateIndex}.`,
    )

    this.name = 'PortfolioSnapshotQueryBuildError'
    this.code = code
    this.key = key
    this.firstIndex = firstIndex
    this.duplicateIndex = duplicateIndex
  }
}

export interface PortfolioSnapshotQueryAuthority {
  readonly publishedProjects:
    readonly PublicPortfolioProject[]

  readonly publishedProjectIds:
    readonly ProjectId[]

  readonly featuredProjects:
    readonly PublicPortfolioProject[]

  readonly featuredProjectIds:
    readonly ProjectId[]

  readonly categoryFacets:
    readonly ProjectCategoryFacetCount[]

  readonly roleFacets:
    readonly ProjectRoleFacetCount[]

  findProjectById(
    id: string,
  ): PublicPortfolioProject | null

  findProjectBySlug(
    slug: string,
  ): PublicPortfolioProject | null

  findAssetById(
    id: string,
  ): PublicPortfolioAsset | null
}

function duplicateError(
  code: PortfolioSnapshotQueryBuildErrorCode,
  key: string,
  firstIndex: number,
  duplicateIndex: number,
): never {
  throw new PortfolioSnapshotQueryBuildError(
    code,
    key,
    firstIndex,
    duplicateIndex,
  )
}

export function createPortfolioSnapshotQueryAuthority(
  snapshot: PortfolioSnapshot,
): PortfolioSnapshotQueryAuthority {
  const projectById =
    new Map<ProjectId, PublicPortfolioProject>()

  const projectBySlug =
    new Map<string, PublicPortfolioProject>()

  const projectIdFirstIndex =
    new Map<ProjectId, number>()

  const projectSlugFirstIndex =
    new Map<string, number>()

  const categoryCounts =
    new Map<ProjectCategory, number>(
      PROJECT_CATEGORY_REGISTRY.map(
        entry => [entry.token, 0] as const,
      ),
    )

  const roleCounts =
    new Map<ProjectRole, number>(
      PROJECT_ROLE_REGISTRY.map(
        entry => [entry.token, 0] as const,
      ),
    )

  const publishedProjectIds: ProjectId[] = []
  const featuredProjects: PublicPortfolioProject[] = []
  const featuredProjectIds: ProjectId[] = []

  for (const [
    projectIndex,
    project,
  ] of snapshot.projects.entries()) {

    const existingIdIndex =
      projectIdFirstIndex.get(project.id)

    if (existingIdIndex !== undefined) {
      duplicateError(
        'duplicate-project-id',
        project.id,
        existingIdIndex,
        projectIndex,
      )
    }

    const existingSlugIndex =
      projectSlugFirstIndex.get(project.slug)

    if (existingSlugIndex !== undefined) {
      duplicateError(
        'duplicate-project-slug',
        project.slug,
        existingSlugIndex,
        projectIndex,
      )
    }

    const categoryCount =
      categoryCounts.get(project.category)

    if (categoryCount === undefined) {
      throw new Error(
        `Unknown project category: ${project.category}`,
      )
    }

    projectIdFirstIndex.set(project.id, projectIndex)
    projectSlugFirstIndex.set(project.slug, projectIndex)
    projectById.set(project.id, project)
    projectBySlug.set(project.slug, project)
    publishedProjectIds.push(project.id)
    categoryCounts.set(
      project.category,
      categoryCount + 1,
    )

    for (const role of project.roles) {
      const roleCount = roleCounts.get(role)

      if (roleCount === undefined) {
        throw new Error(
          `Unknown project role: ${role}`,
        )
      }

      roleCounts.set(role, roleCount + 1)
    }

    if (project.featured) {
      featuredProjects.push(project)
      featuredProjectIds.push(project.id)
    }
  }

  const assetById =
    new Map<AssetId, PublicPortfolioAsset>()

  const assetIdFirstIndex =
    new Map<AssetId, number>()

  for (const [
    assetIndex,
    asset,
  ] of snapshot.assets.entries()) {

    const existingIndex =
      assetIdFirstIndex.get(asset.id)

    if (existingIndex !== undefined) {
      duplicateError(
        'duplicate-asset-id',
        asset.id,
        existingIndex,
        assetIndex,
      )
    }

    assetIdFirstIndex.set(asset.id, assetIndex)
    assetById.set(asset.id, asset)
  }

  const publishedProjects = Object.freeze([
    ...snapshot.projects,
  ])

  const frozenPublishedProjectIds = Object.freeze([
    ...publishedProjectIds,
  ])

  const frozenFeaturedProjects = Object.freeze([
    ...featuredProjects,
  ])

  const frozenFeaturedProjectIds = Object.freeze([
    ...featuredProjectIds,
  ])

  const categoryFacets = Object.freeze(
    PROJECT_CATEGORY_REGISTRY.map(
      entry => {
        const count = categoryCounts.get(entry.token)

        if (count === undefined) {
          throw new Error(
            `Missing project category counter: ${entry.token}`,
          )
        }

        return Object.freeze({
          token: entry.token,
          label: entry.label,
          order: entry.order,
          count,
        })
      },
    ),
  )

  const roleFacets = Object.freeze(
    PROJECT_ROLE_REGISTRY.map(
      entry => {
        const count = roleCounts.get(entry.token)

        if (count === undefined) {
          throw new Error(
            `Missing project role counter: ${entry.token}`,
          )
        }

        return Object.freeze({
          token: entry.token,
          label: entry.label,
          order: entry.order,
          count,
        })
      },
    ),
  )

  return Object.freeze({
    publishedProjects,
    publishedProjectIds:
      frozenPublishedProjectIds,
    featuredProjects:
      frozenFeaturedProjects,
    featuredProjectIds:
      frozenFeaturedProjectIds,
    categoryFacets,
    roleFacets,
    findProjectById(
      id: string,
    ): PublicPortfolioProject | null {
      return projectById.get(id) ?? null
    },
    findProjectBySlug(
      slug: string,
    ): PublicPortfolioProject | null {
      return projectBySlug.get(slug) ?? null
    },
    findAssetById(
      id: string,
    ): PublicPortfolioAsset | null {
      return assetById.get(id) ?? null
    },
  })
}
