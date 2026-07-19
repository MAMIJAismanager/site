import {
  portfolioSnapshot,
  portfolioSnapshotQueries,
} from '~/data/portfolio-snapshot'

import {
  createPortfolioProjectViewResolver,
} from '~~/shared/resolver/portfolio-project-view-resolver'

export const portfolioProjectViews =
  createPortfolioProjectViewResolver(
    portfolioSnapshot,
    portfolioSnapshotQueries,
  )

export const projectCardViews =
  portfolioProjectViews.projectCards

export const featuredShowcaseViews =
  portfolioProjectViews.featuredShowcases

export const findProjectCardViewById =
  portfolioProjectViews.findProjectCardById

export const findProjectCardViewBySlug =
  portfolioProjectViews.findProjectCardBySlug

export const findShowcaseProjectViewById =
  portfolioProjectViews.findShowcaseById

export const findWorkDetailViewById =
  portfolioProjectViews.findWorkDetailById

export const findWorkDetailViewBySlug =
  portfolioProjectViews.findWorkDetailBySlug

export const findRelatedProjectViewById =
  portfolioProjectViews.findRelatedProjectById

export const findResolvedAssetReferenceById =
  portfolioProjectViews.findAssetReferenceById
