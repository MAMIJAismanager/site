import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { validatePublicBundle } from './public-schema-exact-gate.mjs'

const root = process.cwd()
const sha256 = value => createHash('sha256').update(value).digest('hex')
const fail = message => { throw new Error(`FAIL_MMJ_05N_B_PUBLIC_RELEASE: ${message}`) }
const canonical = value => `${JSON.stringify(value, null, 2)}\n`

async function readJson(name) {
  const bytes = await readFile(resolve(root, 'generated', name))
  const text = bytes.toString('utf8')
  const value = JSON.parse(text)
  if (text !== canonical(value)) fail(`${name} is not canonical JSON.`)
  return { bytes, text, value }
}

function reachableAssetIds(snapshot) {
  const assetById = new Map(snapshot.assets.map(asset => [asset.id, asset]))
  const queue = []
  for (const project of snapshot.projects) {
    for (const id of [project.assets.coverAssetId, project.assets.backdropAssetId, project.assets.primaryAssetId, ...project.assets.galleryAssetIds, project.seo.ogAssetId]) {
      if (id !== null) queue.push(id)
    }
  }
  const visited = new Set()
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i]
    if (visited.has(id)) continue
    visited.add(id)
    const asset = assetById.get(id)
    if (!asset) fail(`missing reachable asset: ${id}`)
    if (asset.kind === 'video' && asset.posterAssetId !== null) queue.push(asset.posterAssetId)
    if (asset.kind === 'audio' && asset.artworkAssetId !== null) queue.push(asset.artworkAssetId)
  }
  return [...visited].sort()
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || /^fe[89ab]/.test(host)) return true
  const parts = host.split('.').map(Number)
  if (parts.length !== 4 || parts.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false
  const [a, b] = parts
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
}

function verifyUrls(snapshot) {
  const values = []
  snapshot.projects.forEach(project => {
    project.credits.forEach(group => group.entries.forEach(entry => { if (entry.href !== null) values.push(entry.href) }))
    project.externalLinks.forEach(link => values.push(link.href))
  })
  for (const value of values) {
    let url
    try { url = new URL(value) } catch { fail(`invalid public URL: ${value}`) }
    if (!['https:', 'mailto:'].includes(url.protocol)) fail(`forbidden public URL protocol: ${url.protocol}`)
    if (url.protocol === 'https:' && isPrivateHost(url.hostname)) fail(`private hostname leaked: ${url.hostname}`)
  }
}

const [snapshot, routes, manifest] = await Promise.all([
  readJson('portfolio.snapshot.json'),
  readJson('portfolio.routes.json'),
  readJson('public-release.manifest.json'),
])
validatePublicBundle(snapshot.value, routes.value, manifest.value)
verifyUrls(snapshot.value)

const snapshotDigest = sha256(snapshot.bytes)
const routesDigest = sha256(routes.bytes)
if (manifest.value.snapshotDigest !== snapshotDigest) fail('snapshot digest mismatch.')
if (routes.value.snapshotDigest !== snapshotDigest) fail('route manifest snapshot binding mismatch.')
if (manifest.value.routesDigest !== routesDigest) fail('routes digest mismatch.')
const bundleDigest = sha256(`MMJ-05N-B\n${snapshotDigest}\n${routesDigest}\n${manifest.value.publicationCutoff}\n${manifest.value.generatedAt}\n`)
if (manifest.value.bundleDigest !== bundleDigest) fail('bundle digest mismatch.')
if (manifest.value.releaseId !== `rel_${snapshotDigest.slice(0, 26)}`) fail('releaseId derivation mismatch.')
if (manifest.value.projectCount !== snapshot.value.projects.length) fail('project count mismatch.')
if (manifest.value.assetCount !== snapshot.value.assets.length) fail('asset count mismatch.')
if (manifest.value.publicationCutoff !== snapshot.value.publicationCutoff) fail('publication cutoff mismatch.')
const expectedRoutes = snapshot.value.projects.map(project => `/works/${project.slug}`)
if (JSON.stringify(routes.value.routes) !== JSON.stringify(expectedRoutes)) fail('route derivation mismatch.')
const reachable = reachableAssetIds(snapshot.value)
const actualAssets = snapshot.value.assets.map(asset => asset.id).sort()
if (JSON.stringify(reachable) !== JSON.stringify(actualAssets)) fail('asset reachability closure mismatch.')
for (const forbidden of ['sourceDigest', 'approvalState', 'publishState', 'publishAt', 'operatorHash', 'internalNote', 'publicationReceipt', 'revisionId']) {
  if (snapshot.text.includes(`\"${forbidden}\":`)) fail(`forbidden field leaked: ${forbidden}`)
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_05N_B_PUBLIC_RELEASE',
  releaseId: manifest.value.releaseId,
  snapshotDigest,
  routesDigest,
  bundleDigest,
  projectCount: manifest.value.projectCount,
  assetCount: manifest.value.assetCount,
}))
