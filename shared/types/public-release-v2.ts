import type { AssetKind, AssetMediaTypeFor, AssetRenditionPurposeFor } from '../constants/public-asset-domain'
import type { ProjectLinkKind } from '../constants/public-project-link-domain'
import type { ProjectRole } from '../constants/taxonomy'
import type { AssetId, ProjectId } from './domain-identifiers'
import type { WorkFilterId, WorkPrimaryClassification } from './work-classification'

export interface PublicProjectTagV2 {
  readonly token: string
  readonly label: string
}

export interface PublicProjectTimingV2 {
  readonly year: number | null
  readonly releaseDate: string | null
}

export interface PublicProjectCreditEntryV2 {
  readonly role: string
  readonly name: string
  readonly href: string | null
}

export interface PublicProjectCreditGroupV2 {
  readonly id: string
  readonly label: string
  readonly entries: readonly PublicProjectCreditEntryV2[]
}

export interface PublicProjectLinkV2 {
  readonly kind: ProjectLinkKind
  readonly label: string
  readonly href: string
}

export interface PublicProjectAssetReferencesV2 {
  readonly coverAssetId: AssetId
  readonly backdropAssetId: AssetId | null
  readonly primaryAssetId: AssetId | null
  readonly galleryAssetIds: readonly AssetId[]
}

export interface PublicProjectSeoV2 {
  readonly title: string
  readonly description: string
  readonly ogAssetId: AssetId | null
  readonly indexable: boolean
}

export interface PublicPortfolioProjectV2 {
  readonly schemaVersion: 2
  readonly id: ProjectId
  readonly slug: string
  readonly title: string
  readonly category: WorkPrimaryClassification
  readonly gatewayCategoryIds: readonly WorkFilterId[]
  readonly roles: readonly ProjectRole[]
  readonly tags: readonly PublicProjectTagV2[]
  readonly timing: PublicProjectTimingV2
  readonly client: string | null
  readonly summary: string
  readonly description: string
  readonly credits: readonly PublicProjectCreditGroupV2[]
  readonly externalLinks: readonly PublicProjectLinkV2[]
  readonly relatedProjectIds: readonly ProjectId[]
  readonly assets: PublicProjectAssetReferencesV2
  readonly featured: boolean
  readonly order: number
  readonly seo: PublicProjectSeoV2
}

export interface PublicImageRenditionMetadataV2 {
  readonly width: number
  readonly height: number
}

export interface PublicVideoRenditionMetadataV2 {
  readonly width: number
  readonly height: number
  readonly durationMs: number
  readonly hasAudio: boolean
}

export interface PublicAudioRenditionMetadataV2 {
  readonly durationMs: number
}

export interface PublicAssetRenditionV2<Kind extends AssetKind, Metadata> {
  readonly id: string
  readonly purpose: AssetRenditionPurposeFor<Kind>
  readonly objectKey: string
  readonly mediaType: AssetMediaTypeFor<Kind>
  readonly byteSize: number
  readonly sha256: string
  readonly metadata: Metadata
}

interface PublicPortfolioAssetBaseV2<Kind extends 'image' | 'video' | 'audio', Rendition> {
  readonly schemaVersion: 2
  readonly id: AssetId
  readonly kind: Kind
  readonly label: string
  readonly caption: string | null
  readonly credit: string | null
  readonly defaultRenditionId: string
  readonly renditions: readonly Rendition[]
}

export interface PublicPortfolioImageAssetV2 extends PublicPortfolioAssetBaseV2<'image', PublicAssetRenditionV2<'image', PublicImageRenditionMetadataV2>> {
  readonly altText: string | null
}

export interface PublicPortfolioVideoAssetV2 extends PublicPortfolioAssetBaseV2<'video', PublicAssetRenditionV2<'video', PublicVideoRenditionMetadataV2>> {
  readonly posterAssetId: AssetId | null
}

export interface PublicPortfolioAudioAssetV2 extends PublicPortfolioAssetBaseV2<'audio', PublicAssetRenditionV2<'audio', PublicAudioRenditionMetadataV2>> {
  readonly artworkAssetId: AssetId | null
}

export type PublicPortfolioAssetV2 =
  | PublicPortfolioImageAssetV2
  | PublicPortfolioVideoAssetV2
  | PublicPortfolioAudioAssetV2

export interface PublicPortfolioSnapshotV2 {
  readonly schemaVersion: 2
  readonly publicationCutoff: string
  readonly projects: readonly PublicPortfolioProjectV2[]
  readonly assets: readonly PublicPortfolioAssetV2[]
}

export interface PublicRouteManifestV2 {
  readonly schemaVersion: 2
  readonly snapshotDigest: string
  readonly routes: readonly string[]
}

export interface PublicReleaseManifestV2 {
  readonly schemaVersion: 2
  readonly contract: 'MMJ-05N-B'
  readonly releaseId: `rel_${string}`
  readonly snapshotDigest: string
  readonly routesDigest: string
  readonly bundleDigest: string
  readonly projectCount: number
  readonly assetCount: number
  readonly publicationCutoff: string
  readonly generatedAt: string
}
