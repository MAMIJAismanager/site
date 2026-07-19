import type { ProjectCategory } from '../constants/taxonomy'
import type { PortfolioGatewayCategoryId } from './portfolio-gateway-category'

/** Primary editorial classification. It does not own media. */
export type WorkPrimaryClassification = ProjectCategory

/** Gateway, listing, and URL-filter classification. It does not own media. */
export type WorkFilterId = PortfolioGatewayCategoryId
