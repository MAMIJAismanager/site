import {
  PROJECT_CATEGORY_REGISTRY,
  type ProjectCategory,
} from '~~/shared/constants/taxonomy'

export interface AboutScopeItem {
  readonly token: ProjectCategory
  readonly label: string
}

export interface AboutSurfaceContent {
  readonly eyebrow: string
  readonly title: string
  readonly lead: string
  readonly scopeHeading: string
  readonly scopeItems: readonly AboutScopeItem[]
  readonly methodHeading: string
  readonly methodBody: string
  readonly worksLinkLabel: string
  readonly contactLinkLabel: string
}

export interface ContactSurfaceContent {
  readonly eyebrow: string
  readonly title: string
  readonly lead: string
  readonly outboundHeading: string
  readonly outboundDescription: string
  readonly formLinkLabel: string
  readonly formUrl: string | null
  readonly unavailableMessage: string
  readonly worksLinkLabel: string
}

export interface SiteInformation {
  readonly about: AboutSurfaceContent
  readonly contact: ContactSurfaceContent
}

function deepFreeze<T>(value: T): T {
  if (
    value === null
    || typeof value !== 'object'
    || Object.isFrozen(value)
  ) {
    return value
  }

  for (const child of Object.values(
    value as Record<string, unknown>,
  )) {
    deepFreeze(child)
  }

  return Object.freeze(value)
}

export const SITE_INFORMATION: SiteInformation = deepFreeze({
  about: {
    eyebrow: 'About',
    title: '매미: 著',
    lead:
      '안무, 작곡, 영상, 디렉팅, 프로듀싱 작업을 한곳에서 살펴볼 수 있는 포트폴리오입니다.',
    scopeHeading: '작업 영역',
    scopeItems: PROJECT_CATEGORY_REGISTRY.map(entry => ({
      token: entry.token,
      label: entry.label,
    })),
    methodHeading: '포트폴리오 구성',
    methodBody:
      '각 프로젝트에서 맡은 역할과 크레딧, 작업물을 중심으로 기록합니다.',
    worksLinkLabel: '전체 작업 보기',
    contactLinkLabel: '프로젝트 문의',
  },
  contact: {
    eyebrow: 'Contact',
    title: '프로젝트 문의',
    lead:
      '협업 및 프로젝트 문의는 외부 Google Form을 통해 받습니다.',
    outboundHeading: '문의하기',
    outboundDescription:
      '링크를 열면 외부 Google Form으로 이동합니다. 이 사이트는 문의 내용을 직접 저장하거나 전송하지 않습니다.',
    formLinkLabel: 'Google Form에서 문의하기',
    formUrl: null,
    unavailableMessage:
      '문의 폼 주소가 아직 설정되지 않았습니다.',
    worksLinkLabel: '작업 먼저 보기',
  },
})
