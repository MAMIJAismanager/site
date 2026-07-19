import icon01Url from '~/assets/category-icons/01.svg?url'
import icon02Url from '~/assets/category-icons/02.svg?url'
import icon03Url from '~/assets/category-icons/03.svg?url'
import icon04Url from '~/assets/category-icons/04.svg?url'
import icon05Url from '~/assets/category-icons/05.svg?url'
import icon06Url from '~/assets/category-icons/06.svg?url'

import type {
  PublicPortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'

/**
 * MMJ-UI22-R2
 *
 * The browser-facing URLs are owned by Vite's asset graph rather than the
 * deployment root. Source SVG bytes remain untouched; only the emitted URL is
 * build-resolved so dev, subpath, and static deployments share one authority.
 */
export const CATEGORY_ICON_URL_BY_ID = Object.freeze({
  choreography: icon01Url,
  'lyrics-composition': icon02Url,
  'costume-design-production': icon03Url,
  'video-production': icon04Url,
  'project-planning': icon05Url,
  'audio-mixing-mastering': icon06Url,
} satisfies Readonly<Record<PublicPortfolioGatewayCategoryId, string>>)

export function resolveCategoryIconUrl(
  id: string,
): string | null {
  return CATEGORY_ICON_URL_BY_ID[
    id as PublicPortfolioGatewayCategoryId
  ] ?? null
}
