import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { canonicalJson, derivePromotionId, sha256, verifyChain, verifyPublicPromotion } from './lib/public-promotion.mjs'

const root = process.cwd()
const fail = message => { throw new Error(`FAIL_MMJ_05N_C_PUBLIC_REGRESSION: ${message}`) }
const expectCode = (label, code, fn) => {
  try { fn(); fail(`${label} was accepted.`) } catch (error) { if (error.message?.startsWith('FAIL_MMJ')) throw error; if (error?.code !== code) fail(`${label} returned ${error?.code ?? error}, expected ${code}.`) }
}
const clone = () => {
  const dir = mkdtempSync(join(tmpdir(), 'mmj-05n-c-public-'))
  cpSync(join(root, 'generated'), join(dir, 'generated'), { recursive: true })
  cpSync(join(root, 'trust'), join(dir, 'trust'), { recursive: true })
  return dir
}
const baseline = verifyPublicPromotion(root)

let dir = clone()
try {
  const path = join(dir, 'generated/portfolio.snapshot.json')
  const bytes = readFileSync(path)
  bytes[bytes.length - 2] ^= 1
  writeFileSync(path, bytes)
  expectCode('artifact tamper', 'MMJ_PUBLIC_PROMOTION_ARTIFACT_SET_MISMATCH', () => verifyPublicPromotion(dir))
} finally { rmSync(dir, { recursive: true, force: true }) }

dir = clone()
try {
  const path = join(dir, 'generated/public-release.promotion.json')
  const value = JSON.parse(readFileSync(path, 'utf8'))
  value.signature = `${value.signature.slice(0, -1)}${value.signature.endsWith('A') ? 'B' : 'A'}`
  writeFileSync(path, canonicalJson(value))
  expectCode('signature bit flip', 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', () => verifyPublicPromotion(dir))
} finally { rmSync(dir, { recursive: true, force: true }) }

dir = clone()
try {
  const path = join(dir, 'trust/public-release-signing-keys.json')
  const value = JSON.parse(readFileSync(path, 'utf8'))
  value.keys = []
  writeFileSync(path, canonicalJson(value))
  expectCode('unknown key', 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', () => verifyPublicPromotion(dir))
} finally { rmSync(dir, { recursive: true, force: true }) }
expectCode('wrong repository', 'MMJ_PUBLIC_PROMOTION_TARGET_MISMATCH', () => verifyPublicPromotion(root, { expectedRepository: 'someone/other-site', expectedBranch: 'main' }))
expectCode('replayed current envelope', 'MMJ_PUBLIC_PROMOTION_SEQUENCE_MISMATCH', () => verifyChain(baseline.envelope, baseline.envelope))

dir = clone()
try {
  const manifestPath = join(dir, 'generated/public-release.manifest.json')
  const promotionPath = join(dir, 'generated/public-release.promotion.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.bundleDigest = 'f'.repeat(64)
  writeFileSync(manifestPath, canonicalJson(manifest))
  const envelope = JSON.parse(readFileSync(promotionPath, 'utf8'))
  envelope.payload.bundleDigest = manifest.bundleDigest
  envelope.payload.manifestDigest = sha256(readFileSync(manifestPath))
  envelope.promotionId = derivePromotionId(envelope.payload)
  writeFileSync(promotionPath, canonicalJson(envelope))
  expectCode('self-consistent unsigned rewrite', 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', () => verifyPublicPromotion(dir))
} finally { rmSync(dir, { recursive: true, force: true }) }

const runDiff = (files, shouldPass, expectedCode = null) => {
  const dir = mkdtempSync(join(tmpdir(), 'mmj-05n-c-diff-'))
  const list = join(dir, 'changed.txt')
  writeFileSync(list, `${files.join('\n')}\n`)
  const result = spawnSync(process.execPath, ['scripts/public-promotion-diff-gate.mjs', '--changed-files', list], { cwd: root, encoding: 'utf8' })
  rmSync(dir, { recursive: true, force: true })
  if (shouldPass && result.status !== 0) fail(`Expected diff pass: ${result.stderr}`)
  if (!shouldPass) {
    if (result.status === 0) fail('Mixed diff was accepted.')
    const output = JSON.parse(result.stderr.trim().split(/\r?\n/).at(-1))
    if (output.code !== expectedCode) fail(`Mixed diff returned ${output.code}, expected ${expectedCode}.`)
  }
}
runDiff([
  'generated/portfolio.snapshot.json',
  'generated/portfolio.routes.json',
  'generated/public-release.manifest.json',
  'generated/public-release.promotion.json',
], true)
runDiff(['generated/portfolio.snapshot.json', 'app/app.vue'], false, 'MMJ_PUBLIC_PROMOTION_MIXED_DIFF')
runDiff(['generated/public-release.promotion.json', 'trust/public-release-signing-keys.json'], false, 'MMJ_PUBLIC_PROMOTION_TRUST_ROOT_MIXED_CHANGE')

console.log(JSON.stringify({ event: 'PASS_MMJ_05N_C_PUBLIC_REGRESSION', promotionId: baseline.envelope.promotionId }))
