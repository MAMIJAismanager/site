import type {
  ShowcaseProjectView,
} from '~~/shared/view/portfolio-project-view'

import type {
  PortfolioGatewayCategoryId,
} from '~~/shared/types/portfolio-gateway-category'

export interface HomeGatewayShowcaseView
  extends ShowcaseProjectView {
  readonly gatewayCategoryId: PortfolioGatewayCategoryId
  readonly gatewayIconAsset: string
  readonly gatewayTitleLines: readonly string[]
}
