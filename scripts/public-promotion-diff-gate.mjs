import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PROMOTION_FILES } from './lib/public-promotion.mjs'

const args = process.argv.slice(2)
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
try {
  const baseRef = arg('--base-ref') ?? process.env.MMJ_PUBLIC_DIFF_BASE ?? null
  const baseDir = arg('--base-dir') ?? null
  const listPath = arg('--changed-files')
  let changed = []
  let mode = 'self-only-no-diff-context'
  if (listPath) {
    changed = readFileSync(listPath, 'utf8').split(/\r?\n/).filter(Boolean)
    mode = 'changed-files-list'
  } else if (baseRef) {
    changed = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
    mode = 'git-diff'
  }
  if (changed.length === 0) {
    console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_DIFF', mode, changedCount: 0 }))
    process.exit(0)
  }
  const changedSet = new Set(changed)
  const generated = changed.filter(path => path.startsWith('generated/'))
  const trust = changed.filter(path => path.startsWith('trust/'))
  const other = changed.filter(path => !path.startsWith('generated/') && !path.startsWith('trust/'))
  if (generated.length > 0) {
    if (trust.length > 0) throw Object.assign(new Error('Release and trust-root changes are mixed.'), { code: 'MMJ_PUBLIC_PROMOTION_TRUST_ROOT_MIXED_CHANGE' })
    if (other.length > 0) throw Object.assign(new Error('Promotion transaction contains code or configuration changes.'), { code: 'MMJ_PUBLIC_PROMOTION_MIXED_DIFF' })
    const exactFour = changedSet.size === PROMOTION_FILES.length && PROMOTION_FILES.every(path => changedSet.has(path))
    let bootstrapEnvelopeOnly = false
    if (!exactFour && changedSet.size === 1 && changedSet.has('generated/public-release.promotion.json') && baseDir) {
      const envelope = JSON.parse(readFileSync(resolve('generated/public-release.promotion.json'), 'utf8'))
      if (envelope.payload?.promotionSequence === 1) {
        const immutable = PROMOTION_FILES.slice(0, 3)
        bootstrapEnvelopeOnly = immutable.every(path => {
          const basePath = resolve(baseDir, path)
          return existsSync(basePath) && readFileSync(basePath).equals(readFileSync(resolve(path)))
        })
      }
    }
    if (!exactFour && !bootstrapEnvelopeOnly) throw Object.assign(new Error('Promotion transaction must change the four generated artifacts, except an initial envelope-only retrofit with byte-identical 05N-B artifacts.'), { code: 'MMJ_PUBLIC_PROMOTION_MIXED_DIFF' })
    if (bootstrapEnvelopeOnly) mode = `${mode}:initial-envelope-retrofit`
  } else if (trust.length > 0) {
    if (other.length > 0 || trust.some(path => path !== 'trust/public-release-signing-keys.json')) throw Object.assign(new Error('Trust-root transaction contains mixed paths.'), { code: 'MMJ_PUBLIC_PROMOTION_TRUST_ROOT_MIXED_CHANGE' })
  }
  console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_DIFF', mode, changed }))
} catch (error) {
  console.error(JSON.stringify({ event: 'FAIL_MMJ_05N_C_PUBLIC_DIFF', code: error?.code ?? 'MMJ_PUBLIC_PROMOTION_MIXED_DIFF', message: error instanceof Error ? error.message : String(error) }))
  process.exitCode = 1
}
