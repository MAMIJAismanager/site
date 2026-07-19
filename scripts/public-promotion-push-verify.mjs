import { execFileSync } from 'node:child_process'
import { verifyPublicPromotion } from './lib/public-promotion.mjs'

try {
  const result = verifyPublicPromotion(process.cwd())
  const before = process.env.MMJ_PUBLIC_PUSH_BEFORE ?? process.env.GITHUB_EVENT_BEFORE ?? null
  let mode = 'no-push-context'
  let changed = []
  if (before) {
    if (!/^[a-f0-9]{40}$/.test(before)) throw Object.assign(new Error('Push before SHA is invalid.'), { code: 'MMJ_PUBLIC_PROMOTION_BASE_MISMATCH' })
    if (/^0{40}$/.test(before) && result.envelope.payload.promotionSequence === 1) mode = 'initial-repository-bootstrap'
    else {
      changed = execFileSync('git', ['diff', '--name-only', `${before}..HEAD`], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
      const generatedChanged = changed.some(path => path.startsWith('generated/'))
      const trustChanged = changed.some(path => path.startsWith('trust/'))
      if (!generatedChanged && trustChanged) mode = 'trust-root-no-release-change'
      else {
        if (result.envelope.payload.baseCommitSha !== before) throw Object.assign(new Error('Merged promotion baseCommitSha does not match the push predecessor.'), { code: 'MMJ_PUBLIC_PROMOTION_BASE_MISMATCH' })
        mode = 'predecessor-bound'
      }
    }
  }
  console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_PUSH', promotionId: result.envelope.promotionId, before, mode, changed }))
} catch (error) {
  console.error(JSON.stringify({ event: 'FAIL_MMJ_05N_C_PUBLIC_PUSH', code: error?.code ?? 'MMJ_PUBLIC_PROMOTION_BASE_MISMATCH', message: error instanceof Error ? error.message : String(error) }))
  process.exitCode = 1
}
