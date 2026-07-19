import type {
  AssetMediaTypeFor,
  AssetRenditionPurposeFor,
} from '../constants/public-asset-domain'

import type {
  ProjectCategory,
  ProjectRole,
} from '../constants/taxonomy'

import type {
  ProjectLinkKind,
} from '../constants/public-project-link-domain'

import type {
  AssetId,
  ProjectId,
} from '../types/domain-identifiers'

import type {
  PortfolioGatewayCategoryId,
} from '../types/portfolio-gateway-category'

export interface ProjectCategoryView {
  readonly token: ProjectCategory
  readonly label: string
  readonly order: number
}

export interface ProjectRoleView {
  readonly token: ProjectRole
  readonly label: string
  readonly order: number
}

export interface ProjectTagView {
  readonly token: string
  readonly label: string
}

export interface ProjectTimingView {
  readonly year: number | null
  readonly releaseDate: string | null
}

export interface ProjectDisplayMetaView {
  readonly timing: ProjectTimingView
  readonly client: string | null
  readonly metaLine: string | null
}

export interface ProjectCreditEntryView {
  readonly role: string
  readonly name: string
  readonly href: string | null
}

export interface ProjectCreditGroupView {
  readonly id: string
  readonly label: string
  readonly entries: readonly ProjectCreditEntryView[]
}

export interface ProjectExternalLinkView {
  readonly kind: ProjectLinkKind
  readonly kindLabel: string
  readonly label: string
  readonly href: string
}

export interface ImageRenditionReferenceView {
  readonly kind: 'image'
  readonly id: string
  readonly purpose: AssetRenditionPurposeFor<'image'>
  readonly objectKey: string
  readonly mediaType: AssetMediaTypeFor<'image'>
  readonly byteSize: number
  readonly sha256: string
  readonly metadata: Readonly<{
    width: number
    height: number
  }>
  readonly isDefault: boolean
}

export interface VideoRenditionReferenceView {
  readonly kind: 'video'
  readonly id: string
  readonly purpose: AssetRenditionPurposeFor<'video'>
  readonly objectKey: string
  readonly mediaType: AssetMediaTypeFor<'video'>
  readonly byteSize: number
  readonly sha256: string
  readonly metadata: Readonly<{
    width: number
    height: number
    durationMs: number
    hasAudio: boolean
  }>
  readonly isDefault: boolean
}

export interface AudioRenditionReferenceView {
  readonly kind: 'audio'
  readonly id: string
  readonly purpose: AssetRenditionPurposeFor<'audio'>
  readonly objectKey: string
  readonly mediaType: AssetMediaTypeFor<'audio'>
  readonly byteSize: number
  readonly sha256: string
  readonly metadata: Readonly<{
    durationMs: number
  }>
  readonly isDefault: boolean
}

export interface ResolvedImageAssetReference {
  readonly id: AssetId
  readonly kind: 'image'
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly altText: string | null
  readonly defaultRenditionId: string
  readonly defaultRendition: ImageRenditionReferenceView
  readonly renditions: readonly ImageRenditionReferenceView[]
}

export interface ResolvedVideoAssetReference {
  readonly id: AssetId
  readonly kind: 'video'
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly defaultRenditionId: string
  readonly defaultRendition: VideoRenditionReferenceView
  readonly renditions: readonly VideoRenditionReferenceView[]
  readonly poster: ResolvedImageAssetReference | null
}

export interface ResolvedAudioAssetReference {
  readonly id: AssetId
  readonly kind: 'audio'
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly defaultRenditionId: string
  readonly defaultRendition: AudioRenditionReferenceView
  readonly renditions: readonly AudioRenditionReferenceView[]
  readonly artwork: ResolvedImageAssetReference | null
}

export type ResolvedAssetReference =
  | ResolvedImageAssetReference
  | ResolvedVideoAssetReference
  | ResolvedAudioAssetReference

export interface ProjectAssetCollectionView {
  readonly cover: ResolvedImageAssetReference
  readonly backdrop: ResolvedImageAssetReference | null
  readonly primary: ResolvedAssetReference | null
  readonly gallery: readonly ResolvedAssetReference[]
  readonly seoOg: ResolvedImageAssetReference | null
}

export interface ProjectPresentationBase {
  readonly id: ProjectId
  readonly slug: string
  readonly href: string
  readonly title: string
  readonly category: ProjectCategoryView
  readonly gatewayCategoryIds: readonly PortfolioGatewayCategoryId[]
  readonly roles: readonly ProjectRoleView[]
  readonly tags: readonly ProjectTagView[]
  readonly displayMeta: ProjectDisplayMetaView
  readonly summary: string
  readonly featured: boolean
  readonly order: number
}

export interface ProjectCardView
  extends ProjectPresentationBase {
  readonly cover: ResolvedImageAssetReference
}

export interface ShowcaseProjectView
  extends ProjectPresentationBase {
  readonly cover: ResolvedImageAssetReference
  readonly backdrop: ResolvedImageAssetReference | null
  readonly primary: ResolvedAssetReference | null
}

export interface RelatedProjectView
  extends ProjectPresentationBase {
  readonly cover: ResolvedImageAssetReference
}

export interface ProjectSeoEditorialView {
  readonly title: string
  readonly description: string
  readonly indexable: boolean
  readonly ogAsset: ResolvedImageAssetReference | null
}

export interface WorkDetailView
  extends ProjectPresentationBase {
  readonly description: string
  readonly assets: ProjectAssetCollectionView
  readonly credits: readonly ProjectCreditGroupView[]
  readonly externalLinks: readonly ProjectExternalLinkView[]
  readonly relatedProjects: readonly RelatedProjectView[]
  readonly seo: ProjectSeoEditorialView
}
