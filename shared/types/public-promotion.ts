export type PublicPromotionKind = 'forward' | 'rollback'

export interface PublicPromotionPayloadV1 {
  schemaVersion: 1
  contract: 'MMJ-05N-C'
  payloadType: 'PUBLIC_RELEASE_PROMOTION_V1'
  promotionKind: PublicPromotionKind
  releaseId: string
  promotionSequence: number
  previousPromotionId: string | null
  previousBundleDigest: string | null
  rollbackSourcePromotionId: string | null
  bundleDigest: string
  manifestDigest: string
  artifactSetDigest: string
  targetRepository: string
  targetBranch: string
  baseCommitSha: string
  keyId: string
  algorithm: 'Ed25519'
  signedAt: string
}

export interface PublicPromotionEnvelopeV1 {
  schemaVersion: 1
  contract: 'MMJ-05N-C'
  promotionId: string
  payload: PublicPromotionPayloadV1
  signature: string
}
