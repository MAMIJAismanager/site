import {
  projectCardViews,
} from '~/data/portfolio-project-views'

import {
  isPublicPortfolioGatewayCategoryId,
} from '~~/shared/constants/portfolio-gateway-categories'

import {
  createWorksProjectQueryAuthority,
} from '~~/shared/query/works-project-query'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

export function isHiddenOnlyProject(
  project: ProjectCardView,
): boolean {
  return (
    project.gatewayCategoryIds.length > 0
    && project.gatewayCategoryIds.every(
      categoryId => !isPublicPortfolioGatewayCategoryId(categoryId),
    )
  )
}

export const publicProjectCardViews = Object.freeze(
  projectCardViews.filter(
    project => !isHiddenOnlyProject(project),
  ),
)

export const hiddenProjectCardViews = Object.freeze(
  projectCardViews.filter(isHiddenOnlyProject),
)

export const worksProjectQueryAuthority =
  createWorksProjectQueryAuthority(publicProjectCardViews)

export const allWorksProjectQueryAuthority =
  createWorksProjectQueryAuthority(projectCardViews)

export const worksCategoryOptions =
  worksProjectQueryAuthority.categoryOptions

export const worksRoleOptions =
  worksProjectQueryAuthority.roleOptions

export const worksTagOptions =
  worksProjectQueryAuthority.tagOptions

export const worksYearOptions =
  worksProjectQueryAuthority.yearOptions

export const evaluateWorksQuery =
  worksProjectQueryAuthority.evaluate
