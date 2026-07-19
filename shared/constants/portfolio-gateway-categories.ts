import type {
  PortfolioGatewayCategory,
  PortfolioGatewayCategoryId,
  PublicPortfolioGatewayCategoryId,
} from '../types/portfolio-gateway-category'

export const HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID =
  'voice-synthesis-engine-assistant' as const

export const PORTFOLIO_GATEWAY_CATEGORY_ICON_ASSET_BY_ID =
  Object.freeze({
    choreography: '01.svg',
    'lyrics-composition': '02.svg',
    'costume-design-production': '03.svg',
    'video-production': '04.svg',
    'project-planning': '05.svg',
    'audio-mixing-mastering': '06.svg',
  } satisfies Readonly<Record<PublicPortfolioGatewayCategoryId, string>>)

export function findPortfolioGatewayCategoryIconAsset(
  id: PortfolioGatewayCategoryId,
): string | null {
  return PORTFOLIO_GATEWAY_CATEGORY_ICON_ASSET_BY_ID[
    id as PublicPortfolioGatewayCategoryId
  ] ?? null
}

export const PORTFOLIO_GATEWAY_CATEGORY_REGISTRY:
readonly PortfolioGatewayCategory[] = Object.freeze([
  Object.freeze({
    id: 'choreography',
    order: 1,
    title: '안무창작',
    titleLines: Object.freeze(['안무창작']),
    shortLabel: '안무창작',
    description: '안무 구성, 동선 설계, 퍼포먼스 디렉팅 작업을 모았습니다.',
    visibility: 'public',
    entryPolicy: 'public',
  }),
  Object.freeze({
    id: 'lyrics-composition',
    order: 2,
    title: '작사 & 작곡',
    titleLines: Object.freeze(['작사 & 작곡']),
    shortLabel: '작사 & 작곡',
    description: '가사와 멜로디, 곡의 흐름을 설계한 작업을 모았습니다.',
    visibility: 'public',
    entryPolicy: 'public',
  }),
  Object.freeze({
    id: 'costume-design-production',
    order: 3,
    title: '의상코디디자인 & 의상제작(리폼/악세사리제작)',
    titleLines: Object.freeze([
      '의상코디디자인 & 의상제작',
      '(리폼/악세사리제작)',
    ]),
    shortLabel: '의상코디·제작',
    description: '의상 코디, 리폼, 액세서리 제작을 포함한 스타일링 작업입니다.',
    visibility: 'public',
    entryPolicy: 'public',
  }),
  Object.freeze({
    id: 'video-production',
    order: 4,
    title: '영상기획 & 현장감독(영상/카메라 등) & 영상편집',
    titleLines: Object.freeze([
      '영상기획',
      '현장감독(영상/카메라 등)',
      '영상편집',
    ]),
    shortLabel: '영상기획·감독·편집',
    description: '영상 기획부터 현장 운영, 카메라 디렉팅과 편집까지의 작업입니다.',
    visibility: 'public',
    entryPolicy: 'public',
  }),
  Object.freeze({
    id: 'project-planning',
    order: 5,
    title: '프로젝트 기획',
    titleLines: Object.freeze(['프로젝트 기획']),
    shortLabel: '프로젝트 기획',
    description: '프로젝트 구조, 일정, 협업 흐름을 설계한 작업을 모았습니다.',
    visibility: 'public',
    entryPolicy: 'public',
  }),
  Object.freeze({
    id: 'audio-mixing-mastering',
    order: 6,
    title: '음원 믹싱 & 마스터링 by SSIMO STUDIO',
    titleLines: Object.freeze([
      '음원 믹싱 & 마스터링',
      'by SSIMO STUDIO',
    ]),
    shortLabel: '믹싱 & 마스터링',
    description: 'SSIMO STUDIO의 음원 믹싱과 마스터링 작업을 모았습니다.',
    visibility: 'public',
    entryPolicy: 'public',
  }),
  Object.freeze({
    id: HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
    order: 7,
    title: '음성합성엔진 조교',
    titleLines: Object.freeze(['음성합성엔진 조교']),
    shortLabel: '음성합성엔진 조교',
    description: '브랜드 명판의 숨은 입력으로만 열리는 음성합성엔진 작업실입니다.',
    visibility: 'hidden',
    entryPolicy: 'brand-double-click-session',
  }),
])

export const PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES =
  Object.freeze(
    PORTFOLIO_GATEWAY_CATEGORY_REGISTRY.filter(
      category => category.visibility === 'public',
    ),
  )

export const HIDDEN_PORTFOLIO_GATEWAY_CATEGORIES =
  Object.freeze(
    PORTFOLIO_GATEWAY_CATEGORY_REGISTRY.filter(
      category => category.visibility === 'hidden',
    ),
  )

const CATEGORY_BY_ID = new Map(
  PORTFOLIO_GATEWAY_CATEGORY_REGISTRY.map(
    category => [category.id, category] as const,
  ),
)

export function isPortfolioGatewayCategoryId(
  value: unknown,
): value is PortfolioGatewayCategoryId {
  return typeof value === 'string' && CATEGORY_BY_ID.has(
    value as PortfolioGatewayCategoryId,
  )
}

export function findPortfolioGatewayCategory(
  id: string,
): PortfolioGatewayCategory | null {
  return CATEGORY_BY_ID.get(
    id as PortfolioGatewayCategoryId,
  ) ?? null
}

export function isPublicPortfolioGatewayCategoryId(
  value: unknown,
): value is PortfolioGatewayCategoryId {
  if (!isPortfolioGatewayCategoryId(value)) return false
  return CATEGORY_BY_ID.get(value)?.visibility === 'public'
}

export function isHiddenPortfolioGatewayCategoryId(
  value: unknown,
): value is PortfolioGatewayCategoryId {
  if (!isPortfolioGatewayCategoryId(value)) return false
  return CATEGORY_BY_ID.get(value)?.visibility === 'hidden'
}
