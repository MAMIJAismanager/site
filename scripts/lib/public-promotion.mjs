import { createHash, createPublicKey, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DOMAIN_PREFIX = Buffer.from('MMJ-05N-C\0PUBLIC_RELEASE_PROMOTION_V1\0', 'utf8')
export const PROMOTION_FILES = [
  'generated/portfolio.snapshot.json',
  'generated/portfolio.routes.json',
  'generated/public-release.manifest.json',
  'generated/public-release.promotion.json',
]
const PAYLOAD_KEYS = [
  'schemaVersion', 'contract', 'payloadType', 'promotionKind', 'releaseId',
  'promotionSequence', 'previousPromotionId', 'previousBundleDigest',
  'rollbackSourcePromotionId', 'bundleDigest', 'manifestDigest',
  'artifactSetDigest', 'targetRepository', 'targetBranch', 'baseCommitSha',
  'keyId', 'algorithm', 'signedAt',
]
const ENVELOPE_KEYS = ['schemaVersion', 'contract', 'promotionId', 'payload', 'signature']
const REGISTRY_KEYS = ['schemaVersion', 'contract', 'keys']
const KEY_KEYS = ['keyId', 'algorithm', 'publicKeySpkiBase64', 'validFromSequence', 'validThroughSequence', 'status']
const SHA256 = /^[a-f0-9]{64}$/
const SHA1 = /^[a-f0-9]{40}$/
const PROMOTION_ID = /^prm_[a-f0-9]{26}$/
const RELEASE_ID = /^rel_[a-f0-9]{26}$/

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
export const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`
const fail = (code, message, context = {}) => { const error = new Error(message); error.code = code; error.context = context; throw error }
const assert = (condition, code, message, context = {}) => { if (!condition) fail(code, message, context) }

function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', `${label} must be an object.`)
  const actual = Object.keys(value)
  assert(actual.length === keys.length && actual.every((key, index) => key === keys[index]), 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', `${label} keys or key order are invalid.`, { expected: keys, actual })
}

export function readCanonicalJson(path, code = 'MMJ_PUBLIC_PROMOTION_NON_CANONICAL') {
  const bytes = readFileSync(path)
  const text = bytes.toString('utf8')
  let value
  try { value = JSON.parse(text) } catch { fail(code, `Invalid JSON: ${path}`) }
  assert(text === canonicalJson(value), code, `Non-canonical JSON: ${path}`)
  return { bytes, text, value }
}

export function validatePayload(payload) {
  exactKeys(payload, PAYLOAD_KEYS, 'payload')
  assert(payload.schemaVersion === 1 && payload.contract === 'MMJ-05N-C' && payload.payloadType === 'PUBLIC_RELEASE_PROMOTION_V1', 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', 'Payload contract is invalid.')
  assert(['forward', 'rollback'].includes(payload.promotionKind), 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', 'promotionKind is invalid.')
  assert(RELEASE_ID.test(payload.releaseId), 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', 'releaseId is invalid.')
  assert(Number.isSafeInteger(payload.promotionSequence) && payload.promotionSequence > 0, 'MMJ_PUBLIC_PROMOTION_SEQUENCE_MISMATCH', 'promotionSequence is invalid.')
  assert(payload.previousPromotionId === null || PROMOTION_ID.test(payload.previousPromotionId), 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH', 'previousPromotionId is invalid.')
  assert(payload.previousBundleDigest === null || SHA256.test(payload.previousBundleDigest), 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH', 'previousBundleDigest is invalid.')
  assert(payload.rollbackSourcePromotionId === null || PROMOTION_ID.test(payload.rollbackSourcePromotionId), 'MMJ_PUBLIC_PROMOTION_ROLLBACK_SOURCE_INVALID', 'rollbackSourcePromotionId is invalid.')
  for (const key of ['bundleDigest', 'manifestDigest', 'artifactSetDigest']) assert(SHA256.test(payload[key]), 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', `${key} is invalid.`)
  assert(typeof payload.targetRepository === 'string' && payload.targetRepository.includes('/'), 'MMJ_PUBLIC_PROMOTION_TARGET_MISMATCH', 'targetRepository is invalid.')
  assert(typeof payload.targetBranch === 'string' && payload.targetBranch.length > 0, 'MMJ_PUBLIC_PROMOTION_TARGET_MISMATCH', 'targetBranch is invalid.')
  assert(SHA1.test(payload.baseCommitSha), 'MMJ_PUBLIC_PROMOTION_BASE_MISMATCH', 'baseCommitSha is invalid.')
  assert(typeof payload.keyId === 'string' && payload.keyId.length >= 6, 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', 'keyId is invalid.')
  assert(payload.algorithm === 'Ed25519', 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', 'algorithm is invalid.')
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.signedAt), 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', 'signedAt is invalid.')
  if (payload.promotionSequence === 1) assert(payload.previousPromotionId === null && payload.previousBundleDigest === null, 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH', 'Initial predecessor must be null.')
  else assert(payload.previousPromotionId !== null && payload.previousBundleDigest !== null, 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH', 'Non-initial predecessor is missing.')
  if (payload.promotionKind === 'forward') assert(payload.rollbackSourcePromotionId === null, 'MMJ_PUBLIC_PROMOTION_ROLLBACK_SOURCE_INVALID', 'Forward promotion cannot name rollback source.')
  if (payload.promotionKind === 'rollback') assert(payload.rollbackSourcePromotionId !== null && payload.rollbackSourcePromotionId !== payload.previousPromotionId, 'MMJ_PUBLIC_PROMOTION_ROLLBACK_SOURCE_INVALID', 'Rollback source is invalid.')
  return payload
}

export function derivePromotionId(payload) {
  validatePayload(payload)
  return `prm_${sha256(Buffer.from(canonicalJson(payload), 'utf8')).slice(0, 26)}`
}

export function validateEnvelope(envelope) {
  exactKeys(envelope, ENVELOPE_KEYS, 'envelope')
  assert(envelope.schemaVersion === 1 && envelope.contract === 'MMJ-05N-C', 'MMJ_PUBLIC_PROMOTION_ENVELOPE_INVALID', 'Envelope contract is invalid.')
  validatePayload(envelope.payload)
  assert(envelope.promotionId === derivePromotionId(envelope.payload), 'MMJ_PUBLIC_PROMOTION_ID_MISMATCH', 'promotionId derivation mismatch.')
  assert(typeof envelope.signature === 'string' && /^[A-Za-z0-9_-]{86}$/.test(envelope.signature), 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', 'Signature encoding is invalid.')
  return envelope
}

export function validateRegistry(registry) {
  exactKeys(registry, REGISTRY_KEYS, 'registry')
  assert(registry.schemaVersion === 1 && registry.contract === 'MMJ-05N-C' && Array.isArray(registry.keys), 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', 'Trust registry contract is invalid.')
  const ids = new Set()
  for (const key of registry.keys) {
    exactKeys(key, KEY_KEYS, 'registry key')
    assert(!ids.has(key.keyId), 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', `Duplicate keyId: ${key.keyId}`)
    ids.add(key.keyId)
    assert(key.algorithm === 'Ed25519' && ['active', 'retired', 'revoked'].includes(key.status), 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', `Invalid key registry entry: ${key.keyId}`)
    assert(Number.isSafeInteger(key.validFromSequence) && key.validFromSequence > 0, 'MMJ_PUBLIC_PROMOTION_KEY_NOT_VALID_FOR_SEQUENCE', 'validFromSequence is invalid.')
    assert(key.validThroughSequence === null || (Number.isSafeInteger(key.validThroughSequence) && key.validThroughSequence >= key.validFromSequence), 'MMJ_PUBLIC_PROMOTION_KEY_NOT_VALID_FOR_SEQUENCE', 'validThroughSequence is invalid.')
  }
  return registry
}

function artifactSet(root) {
  const snapshot = readFileSync(join(root, 'generated/portfolio.snapshot.json'))
  const routes = readFileSync(join(root, 'generated/portfolio.routes.json'))
  const manifestBytes = readFileSync(join(root, 'generated/public-release.manifest.json'))
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const snapshotDigest = sha256(snapshot)
  const routesDigest = sha256(routes)
  const manifestDigest = sha256(manifestBytes)
  const input = Buffer.from(`MMJ-05N-C-ARTIFACT-SET-V1\ngenerated/portfolio.snapshot.json\n${snapshotDigest}\ngenerated/portfolio.routes.json\n${routesDigest}\ngenerated/public-release.manifest.json\n${manifestDigest}\n`, 'utf8')
  return { manifest, snapshotDigest, routesDigest, manifestDigest, artifactSetDigest: sha256(input) }
}

export function verifyPublicPromotion(root, { expectedRepository, expectedBranch } = {}) {
  const envelopeRecord = readCanonicalJson(join(root, 'generated/public-release.promotion.json'))
  const registryRecord = readCanonicalJson(join(root, 'trust/public-release-signing-keys.json'), 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN')
  const envelope = validateEnvelope(envelopeRecord.value)
  const registry = validateRegistry(registryRecord.value)
  const keyEntry = registry.keys.find(key => key.keyId === envelope.payload.keyId)
  assert(keyEntry, 'MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', `Unknown signing key: ${envelope.payload.keyId}`)
  assert(keyEntry.status !== 'revoked', 'MMJ_PUBLIC_PROMOTION_KEY_REVOKED', `Signing key is revoked: ${keyEntry.keyId}`)
  assert(envelope.payload.promotionSequence >= keyEntry.validFromSequence && (keyEntry.validThroughSequence === null || envelope.payload.promotionSequence <= keyEntry.validThroughSequence), 'MMJ_PUBLIC_PROMOTION_KEY_NOT_VALID_FOR_SEQUENCE', 'Signing key is outside its sequence validity range.')
  let publicKey
  try { publicKey = createPublicKey({ key: Buffer.from(keyEntry.publicKeySpkiBase64, 'base64'), format: 'der', type: 'spki' }) } catch { fail('MMJ_PUBLIC_PROMOTION_KEY_UNKNOWN', 'Signing public key is invalid.') }
  const signature = Buffer.from(envelope.signature, 'base64url')
  assert(signature.length === 64 && signature.toString('base64url') === envelope.signature, 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', 'Signature base64url encoding is non-canonical.')
  const signatureInput = Buffer.concat([DOMAIN_PREFIX, Buffer.from(canonicalJson(envelope.payload), 'utf8')])
  assert(verify(null, signatureInput, publicKey, signature), 'MMJ_PUBLIC_PROMOTION_SIGNATURE_INVALID', 'Ed25519 signature verification failed.')
  const artifacts = artifactSet(root)
  assert(envelope.payload.manifestDigest === artifacts.manifestDigest, 'MMJ_PUBLIC_PROMOTION_MANIFEST_DIGEST_MISMATCH', 'Manifest digest mismatch.')
  assert(envelope.payload.artifactSetDigest === artifacts.artifactSetDigest, 'MMJ_PUBLIC_PROMOTION_ARTIFACT_SET_MISMATCH', 'Artifact set digest mismatch.')
  assert(envelope.payload.bundleDigest === artifacts.manifest.bundleDigest && envelope.payload.releaseId === artifacts.manifest.releaseId, 'MMJ_PUBLIC_PROMOTION_BUNDLE_MISMATCH', 'Promotion does not bind the current 05N-B bundle.')
  const repository = expectedRepository ?? process.env.MMJ_CANONICAL_PUBLIC_REPOSITORY ?? 'MAMIJAismanager/MMJ-site'
  const branch = expectedBranch ?? process.env.MMJ_PUBLIC_TARGET_BRANCH ?? 'main'
  assert(envelope.payload.targetRepository === repository && envelope.payload.targetBranch === branch, 'MMJ_PUBLIC_PROMOTION_TARGET_MISMATCH', 'Promotion target binding mismatch.', { expectedRepository: repository, expectedBranch: branch })
  return { envelope, registry, keyEntry, artifacts, publicKeyFingerprint: sha256(Buffer.from(keyEntry.publicKeySpkiBase64, 'base64')) }
}

export function verifyChain(current, base = null, { expectedBaseSha = null } = {}) {
  const payload = current.payload
  if (base === null) {
    assert(payload.promotionSequence === 1 && payload.previousPromotionId === null && payload.previousBundleDigest === null, 'MMJ_PUBLIC_PROMOTION_SEQUENCE_MISMATCH', 'No-base chain is only valid for initial promotion.')
  } else {
    assert(payload.promotionSequence === base.payload.promotionSequence + 1, 'MMJ_PUBLIC_PROMOTION_SEQUENCE_MISMATCH', 'Promotion sequence is not predecessor + 1.')
    assert(payload.previousPromotionId === base.promotionId, 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH', 'previousPromotionId mismatch.')
    assert(payload.previousBundleDigest === base.payload.bundleDigest, 'MMJ_PUBLIC_PROMOTION_PREDECESSOR_MISMATCH', 'previousBundleDigest mismatch.')
  }
  if (expectedBaseSha !== null) assert(payload.baseCommitSha === expectedBaseSha, 'MMJ_PUBLIC_PROMOTION_BASE_MISMATCH', 'baseCommitSha mismatch.')
  return true
}
