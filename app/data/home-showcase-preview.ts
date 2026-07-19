import {
  findPortfolioGatewayCategoryIconAsset,
  PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES,
} from '~~/shared/constants/portfolio-gateway-categories'

import type {
  HomeGatewayShowcaseView,
} from '~/types/home-gateway'

import type {
  ResolvedImageAssetReference,
  ShowcaseProjectView,
} from '~~/shared/view/portfolio-project-view'

function createGatewayCover(
  base: ResolvedImageAssetReference,
  suffix: string,
): ResolvedImageAssetReference {
  const id = `ast_gateway${suffix}`
  const renditions = base.renditions.map(rendition => Object.freeze({
    ...rendition,
    objectKey: `gateway/${suffix}/${rendition.id}.webp`,
  }))
  const defaultRendition = renditions.find(
    rendition => rendition.id === base.defaultRenditionId,
  ) ?? renditions[0]

  if (!defaultRendition) {
    throw new Error('Home category gateway requires one image rendition.')
  }

  return Object.freeze({
    ...base,
    id,
    label: `Category gateway ${suffix}`,
    caption: '카테고리 대문 프리뷰',
    credit: null,
    altText: null,
    renditions: Object.freeze(renditions),
    defaultRendition,
  })
}

export function createHomeShowcasePreview(
  source: readonly ShowcaseProjectView[],
): readonly HomeGatewayShowcaseView[] {
  const base = source[0]
  if (!base) return []

  return Object.freeze(
    PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES.map(category => {
      const suffix = String(category.order).padStart(2, '0')
      const cover = createGatewayCover(base.cover, suffix)
      const gatewayIconAsset = (
        findPortfolioGatewayCategoryIconAsset(category.id)
      )

      if (!gatewayIconAsset) {
        throw new Error(
          `Missing category icon asset binding for ${category.id}.`,
        )
      }

      return Object.freeze({
        ...base,
        id: `prj_gateway${suffix}`,
        slug: `gateway-${category.id}`,
        href: `/works?category=${encodeURIComponent(category.id)}`,
        title: category.title,
        gatewayTitleLines: category.titleLines,
        gatewayCategoryId: category.id,
        gatewayIconAsset,
        gatewayCategoryIds: Object.freeze([category.id]),
        tags: Object.freeze([
          Object.freeze({
            token: 'category-gateway',
            label: 'CATEGORY GATEWAY',
          }),
        ]),
        displayMeta: Object.freeze({
          timing: Object.freeze({
            year: null,
            releaseDate: null,
          }),
          client: 'PORTFOLIO GATEWAY',
          metaLine: `CATEGORY ${suffix}`,
        }),
        summary: category.description,
        featured: true,
        order: category.order * 10,
        cover,
        backdrop: cover,
        primary: null,
      })
    }),
  )
}
