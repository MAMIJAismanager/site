import snapshotData from '../../generated/portfolio.snapshot.json'

import {
  createPortfolioSnapshotQueryAuthority,
} from '~~/shared/query/portfolio-snapshot-query'

import type {
  PortfolioSnapshot,
} from '~~/shared/types/portfolio-snapshot'

export const portfolioSnapshot =
  snapshotData as PortfolioSnapshot

export const portfolioSnapshotQueries =
  createPortfolioSnapshotQueryAuthority(
    portfolioSnapshot,
  )

export const publishedProjects =
  portfolioSnapshotQueries.publishedProjects

export const publishedProjectIds =
  portfolioSnapshotQueries.publishedProjectIds

export const featuredProjects =
  portfolioSnapshotQueries.featuredProjects

export const featuredProjectIds =
  portfolioSnapshotQueries.featuredProjectIds

export const projectCategoryFacets =
  portfolioSnapshotQueries.categoryFacets

export const projectRoleFacets =
  portfolioSnapshotQueries.roleFacets

export const findPortfolioProjectById =
  portfolioSnapshotQueries.findProjectById

export const findPortfolioProjectBySlug =
  portfolioSnapshotQueries.findProjectBySlug

export const findPortfolioAssetById =
  portfolioSnapshotQueries.findAssetById

export const portfolioProjects =
  publishedProjects
