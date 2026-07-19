import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateEnvelope, verifyChain, verifyPublicPromotion } from './lib/public-promotion.mjs'

const args = process.argv.slice(2)
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
try {
  const current = verifyPublicPromotion(process.cwd()).envelope
  const baseDir = arg('--base-dir')
  const expectedBaseSha = arg('--base-sha') ?? process.env.MMJ_PUBLIC_BASE_SHA ?? null
  let base = null
  let mode = 'initial-self'
  if (baseDir) {
    const path = resolve(baseDir, 'generated/public-release.promotion.json')
    if (existsSync(path)) {
      base = verifyPublicPromotion(resolve(baseDir)).envelope
      mode = 'base-directory-verified'
    } else mode = 'explicit-initial-base'
  }
  if (base !== null && current.promotionId === base.promotionId) {
    if (JSON.stringify(current) !== JSON.stringify(base)) throw Object.assign(new Error('Unchanged promotionId has different envelope bytes.'), { code: 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH' })
    mode = 'trust-root-no-release-change'
  } else if (base === null && !baseDir && current.payload.promotionSequence > 1) {
    mode = 'self-only-no-base-context'
    if (expectedBaseSha !== null && current.payload.baseCommitSha !== expectedBaseSha) throw Object.assign(new Error('baseCommitSha mismatch.'), { code: 'MMJ_PUBLIC_PROMOTION_BASE_MISMATCH' })
  } else verifyChain(current, base, { expectedBaseSha })
  console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_CHAIN', mode, promotionId: current.promotionId, sequence: current.payload.promotionSequence, baseCommitSha: current.payload.baseCommitSha }))
  if (current.payload.promotionKind === 'forward') console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_ROLLBACK_SEAL', mode: 'forward-no-rollback-source' }))
  else {
    if (!arg('--rollback-history')) throw Object.assign(new Error('Rollback verification requires --rollback-history.'), { code: 'MMJ_PUBLIC_PROMOTION_ROLLBACK_SOURCE_INVALID' })
    const history = JSON.parse(readFileSync(resolve(arg('--rollback-history')), 'utf8'))
    if (!history.includes(current.payload.rollbackSourcePromotionId)) throw Object.assign(new Error('Rollback source is not present in verified history.'), { code: 'MMJ_PUBLIC_PROMOTION_ROLLBACK_SOURCE_INVALID' })
    console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_ROLLBACK_SEAL', source: current.payload.rollbackSourcePromotionId }))
  }
} catch (error) {
  console.error(JSON.stringify({ event: 'FAIL_MMJ_05N_C_PUBLIC_CHAIN', code: error?.code ?? 'MMJ_PUBLIC_PROMOTION_SEQUENCE_MISMATCH', message: error instanceof Error ? error.message : String(error), context: error?.context ?? {} }))
  process.exitCode = 1
}
