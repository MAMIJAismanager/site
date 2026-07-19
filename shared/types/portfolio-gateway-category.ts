export type PortfolioGatewayCategoryId =
  | 'choreography'
  | 'lyrics-composition'
  | 'costume-design-production'
  | 'video-production'
  | 'project-planning'
  | 'audio-mixing-mastering'
  | 'voice-synthesis-engine-assistant'

export type PublicPortfolioGatewayCategoryId = Exclude<
  PortfolioGatewayCategoryId,
  'voice-synthesis-engine-assistant'
>

export type PortfolioGatewayVisibility =
  | 'public'
  | 'hidden'

export type PortfolioGatewayEntryPolicy =
  | 'public'
  | 'brand-double-click-session'

export interface PortfolioGatewayCategory {
  readonly id: PortfolioGatewayCategoryId
  readonly order: number
  readonly title: string
  readonly titleLines: readonly string[]
  readonly shortLabel: string
  readonly description: string
  readonly visibility: PortfolioGatewayVisibility
  readonly entryPolicy: PortfolioGatewayEntryPolicy
}
