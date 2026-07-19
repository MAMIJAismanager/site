import { verifyPublicPromotion } from './lib/public-promotion.mjs'

try {
  const result = verifyPublicPromotion(process.cwd())
  console.log(JSON.stringify({
    event: 'PASS_MMJ_05N_C_PUBLIC_SIGNATURE',
    promotionId: result.envelope.promotionId,
    releaseId: result.envelope.payload.releaseId,
    sequence: result.envelope.payload.promotionSequence,
    keyId: result.keyEntry.keyId,
    publicKeyFingerprint: result.publicKeyFingerprint,
  }))
  console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_TARGET_BINDING', repository: result.envelope.payload.targetRepository, branch: result.envelope.payload.targetBranch }))
} catch (error) {
  console.error(JSON.stringify({ event: 'FAIL_MMJ_05N_C_PUBLIC_SIGNATURE', code: error?.code ?? 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', message: error instanceof Error ? error.message : String(error), context: error?.context ?? {} }))
  process.exitCode = 1
}
