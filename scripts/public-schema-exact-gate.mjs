import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const SNAPSHOT_KEYS = ['schemaVersion', 'publicationCutoff', 'projects', 'assets']
export const PROJECT_KEYS = ['schemaVersion', 'id', 'slug', 'title', 'category', 'gatewayCategoryIds', 'roles', 'tags', 'timing', 'client', 'summary', 'description', 'credits', 'externalLinks', 'relatedProjectIds', 'assets', 'featured', 'order', 'seo']
export const TAG_KEYS = ['token', 'label']
export const TIMING_KEYS = ['year', 'releaseDate']
export const PROJECT_ASSET_KEYS = ['coverAssetId', 'backdropAssetId', 'primaryAssetId', 'galleryAssetIds']
export const SEO_KEYS = ['title', 'description', 'ogAssetId', 'indexable']
export const CREDIT_GROUP_KEYS = ['id', 'label', 'entries']
export const CREDIT_ENTRY_KEYS = ['role', 'name', 'href']
export const LINK_KEYS = ['kind', 'label', 'href']
export const ASSET_BASE_KEYS = ['schemaVersion', 'id', 'kind', 'label', 'caption', 'credit', 'defaultRenditionId', 'renditions']
export const RENDITION_KEYS = ['id', 'purpose', 'objectKey', 'mediaType', 'byteSize', 'sha256', 'metadata']
export const ROUTES_KEYS = ['schemaVersion', 'snapshotDigest', 'routes']
export const MANIFEST_KEYS = ['schemaVersion', 'contract', 'releaseId', 'snapshotDigest', 'routesDigest', 'bundleDigest', 'projectCount', 'assetCount', 'publicationCutoff', 'generatedAt']
const SHA = /^[a-f0-9]{64}$/
const OBJECT_KEY = /^assets\/(image|video|audio)\/ast_[a-z0-9]{8,32}\/[a-z0-9][a-z0-9._-]*$/
const FORBIDDEN_KEY = /(spreadsheet|scriptid|sheetid|operator|audit|secret|hmac|tombstone|retention|diagnostic|workerorigin|accountid|bucketname|accesskey|privatekey|revision|receipt|approvalstate|publishstate|publishat|sourcerow|internalnote)/i
const FORBIDDEN_TEXT = [/.r2.cloudflarestorage.com/i, /sheets.googleapis.com/i, /script.google.com/i, /\/cms\/v1\//i, /MMJ_CMS_/, /MMJ_UPLOAD_/, /\b(?:publishAt|publishState|approvalState|sourceDigest|publicationReceipt|operatorHash|internalNote)\b/i, /BEGIN PRIVATE KEY/, /AIza[0-9A-Za-z_-]{20,}/, /ghp_[0-9A-Za-z]{20,}/, /github_pat_[0-9A-Za-z_]{20,}/]

const fail = message => { throw new Error(`FAIL_MMJ_05N_B_PUBLIC_SCHEMA: ${message}`) }
const record = (value, path) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${path} must be a plain object.`)
  return value
}
const exact = (value, keys, path) => {
  record(value, path)
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join('\0') !== expected.join('\0')) fail(`${path} exact keys mismatch. expected=${expected.join(',')} actual=${actual.join(',')}`)
}
const array = (value, path) => { if (!Array.isArray(value)) fail(`${path} must be an array.`) }
const string = (value, path, nullable = false) => { if (!(nullable && value === null) && typeof value !== 'string') fail(`${path} must be ${nullable ? 'null or ' : ''}string.`) }
const finite = (value, path) => { if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${path} must be finite.`) }

function scan(value, path = '$') {
  if (typeof value === 'string') {
    for (const pattern of FORBIDDEN_TEXT) if (pattern.test(value)) fail(`${path} contains forbidden control-plane text.`)
    return
  }
  if (Array.isArray(value)) return value.forEach((entry, i) => scan(entry, `${path}[${i}]`))
  if (typeof value !== 'object' || value === null) return
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) fail(`${path}.${key} is a forbidden key.`)
    scan(entry, `${path}.${key}`)
  }
}

function validateProject(project, i) {
  const p = `$.projects[${i}]`
  exact(project, PROJECT_KEYS, p)
  if (project.schemaVersion !== 2) fail(`${p}.schemaVersion must equal 2.`)
  for (const key of ['id', 'slug', 'title', 'category', 'summary', 'description']) string(project[key], `${p}.${key}`)
  string(project.client, `${p}.client`, true)
  for (const key of ['gatewayCategoryIds', 'roles', 'relatedProjectIds']) { array(project[key], `${p}.${key}`); project[key].forEach((v, j) => string(v, `${p}.${key}[${j}]`)) }
  array(project.tags, `${p}.tags`)
  project.tags.forEach((tag, j) => { exact(tag, TAG_KEYS, `${p}.tags[${j}]`); string(tag.token, `${p}.tags[${j}].token`); string(tag.label, `${p}.tags[${j}].label`) })
  exact(project.timing, TIMING_KEYS, `${p}.timing`); if (project.timing.year !== null) finite(project.timing.year, `${p}.timing.year`); string(project.timing.releaseDate, `${p}.timing.releaseDate`, true)
  array(project.credits, `${p}.credits`)
  project.credits.forEach((group, j) => { const g=`${p}.credits[${j}]`; exact(group,CREDIT_GROUP_KEYS,g); string(group.id,`${g}.id`); string(group.label,`${g}.label`); array(group.entries,`${g}.entries`); group.entries.forEach((entry,k)=>{const e=`${g}.entries[${k}]`; exact(entry,CREDIT_ENTRY_KEYS,e); string(entry.role,`${e}.role`); string(entry.name,`${e}.name`); string(entry.href,`${e}.href`,true)}) })
  array(project.externalLinks, `${p}.externalLinks`)
  project.externalLinks.forEach((link,j)=>{const l=`${p}.externalLinks[${j}]`; exact(link,LINK_KEYS,l); string(link.kind,`${l}.kind`); string(link.label,`${l}.label`); string(link.href,`${l}.href`)})
  exact(project.assets, PROJECT_ASSET_KEYS, `${p}.assets`); string(project.assets.coverAssetId,`${p}.assets.coverAssetId`); string(project.assets.backdropAssetId,`${p}.assets.backdropAssetId`,true); string(project.assets.primaryAssetId,`${p}.assets.primaryAssetId`,true); array(project.assets.galleryAssetIds,`${p}.assets.galleryAssetIds`)
  if (typeof project.featured !== 'boolean') fail(`${p}.featured must be boolean.`); finite(project.order,`${p}.order`)
  exact(project.seo,SEO_KEYS,`${p}.seo`); string(project.seo.title,`${p}.seo.title`); string(project.seo.description,`${p}.seo.description`); string(project.seo.ogAssetId,`${p}.seo.ogAssetId`,true); if(typeof project.seo.indexable!=='boolean') fail(`${p}.seo.indexable must be boolean.`)
}

function validateAsset(asset, i) {
  const p=`$.assets[${i}]`
  const extra=asset?.kind==='image'?['altText']:asset?.kind==='video'?['posterAssetId']:asset?.kind==='audio'?['artworkAssetId']:[]
  exact(asset,[...ASSET_BASE_KEYS,...extra],p)
  if(asset.schemaVersion!==2) fail(`${p}.schemaVersion must equal 2.`)
  for(const key of ['id','kind','label','defaultRenditionId']) string(asset[key],`${p}.${key}`)
  string(asset.caption,`${p}.caption`,true); string(asset.credit,`${p}.credit`,true)
  array(asset.renditions,`${p}.renditions`)
  asset.renditions.forEach((rendition,j)=>{const r=`${p}.renditions[${j}]`; exact(rendition,RENDITION_KEYS,r); for(const key of ['id','purpose','objectKey','mediaType','sha256']) string(rendition[key],`${r}.${key}`); if(!OBJECT_KEY.test(rendition.objectKey)) fail(`${r}.objectKey invalid.`); if(!SHA.test(rendition.sha256)) fail(`${r}.sha256 invalid.`); finite(rendition.byteSize,`${r}.byteSize`); const metadataKeys=asset.kind==='image'?['width','height']:asset.kind==='video'?['width','height','durationMs','hasAudio']:['durationMs']; exact(rendition.metadata,metadataKeys,`${r}.metadata`)})
  if(asset.kind==='image') string(asset.altText,`${p}.altText`,true)
  if(asset.kind==='video') string(asset.posterAssetId,`${p}.posterAssetId`,true)
  if(asset.kind==='audio') string(asset.artworkAssetId,`${p}.artworkAssetId`,true)
}

export function validatePublicBundle(snapshot, routes, manifest) {
  exact(snapshot,SNAPSHOT_KEYS,'$'); if(snapshot.schemaVersion!==2) fail('snapshot schemaVersion must equal 2.'); string(snapshot.publicationCutoff,'$.publicationCutoff'); array(snapshot.projects,'$.projects'); array(snapshot.assets,'$.assets'); snapshot.projects.forEach(validateProject); snapshot.assets.forEach(validateAsset)
  exact(routes,ROUTES_KEYS,'$routes'); if(routes.schemaVersion!==2||!SHA.test(routes.snapshotDigest)) fail('invalid route manifest.'); array(routes.routes,'$routes.routes')
  exact(manifest,MANIFEST_KEYS,'$manifest'); if(manifest.schemaVersion!==2||manifest.contract!=='MMJ-05N-B') fail('invalid public manifest.'); for(const key of ['snapshotDigest','routesDigest','bundleDigest']) if(!SHA.test(manifest[key])) fail(`manifest ${key} invalid.`)
  scan(snapshot); scan(routes); scan(manifest)
}

async function main() {
  const root=process.cwd()
  const [snapshot,routes,manifest]=await Promise.all(['portfolio.snapshot.json','portfolio.routes.json','public-release.manifest.json'].map(async name=>JSON.parse(await readFile(resolve(root,'generated',name),'utf8'))))
  validatePublicBundle(snapshot,routes,manifest)
  console.log(JSON.stringify({event:'PASS_MMJ_05N_B_PUBLIC_SCHEMA',projectCount:snapshot.projects.length,assetCount:snapshot.assets.length}))
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(error=>{console.error(error.message);process.exitCode=1})
