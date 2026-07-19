import { readFile, readdir, stat } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const fail = message => { throw new Error(`FAIL_MMJ_05N_A_PUBLIC_BOUNDARY: ${message}`) }
const normalize = path => path.split(sep).join('/')

const allowedRootEntries = new Set([
  '.github', '.gitignore', '.npmrc', 'README.md', 'app', 'generated',
  'nuxt.config.ts', 'package-lock.json', 'public', 'package.json', 'scripts', 'security', 'shared', 'supply-chain', 'transparency', 'trust', 'tsconfig.json',
])

const allowedShared = new Set([
  'shared/constants/public-asset-domain.ts',
  'shared/constants/category-icon-optical-layout.ts',
  'shared/constants/media-delivery.ts',
  'shared/constants/portfolio-gateway-categories.ts',
  'shared/constants/public-project-link-domain.ts',
  'shared/constants/taxonomy.ts',
  'shared/navigation/navigation-route-key.ts',
  'shared/query/portfolio-snapshot-query.ts',
  'shared/query/works-project-query.ts',
  'shared/query/works-query-state.ts',
  'shared/resolver/media-delivery-config.ts',
  'shared/resolver/media-resolution.ts',
  'shared/resolver/player-track.ts',
  'shared/resolver/portfolio-project-view-resolver.ts',
  'shared/resolver/responsive-image-plan.ts',
  'shared/resolver/video-player-plan.ts',
  'shared/schema/domain-identifiers.ts',
  'shared/types/domain-identifiers.ts',
  'shared/types/navigation-memory.ts',
  'shared/types/player-store.ts',
  'shared/types/portfolio-gateway-category.ts',
  'shared/types/portfolio-snapshot.ts',
  'shared/types/public-release-v2.ts',
  'shared/types/public-promotion.ts',
  'shared/types/resolved-media.ts',
  'shared/types/responsive-image.ts',
  'shared/types/video-player.ts',
  'shared/types/work-classification.ts',
  'shared/view/portfolio-project-view.ts',
])

const allowedSecurity = new Set(['security/public-history-baseline.json','security/public-secret-scan-policy.json','security/public-history-audit-receipt.json'])
const securityScannerFiles = new Set(['scripts/public-secret-scan-common.mjs','scripts/public-secret-history-gate.mjs','scripts/public-archive-secret-gate.mjs','scripts/public-baseline-verify.mjs','scripts/public-05n-e-regression-gate.mjs'])

const forbiddenPrefixes = [
  'apps-script/', 'workers/', 'content/', 'artifacts/', 'fixtures/', 'docs/', '.build/',
  'shared/build/', 'shared/provider/', 'shared/migration/', 'shared/contracts/',
]
const forbiddenFiles = new Set(['.clasp.json', '.clasprc.json', '.dev.vars', 'signing-key.json'])
const forbiddenBasenamePatterns = [/\.pem$/i, /\.key$/i, /private-key/i]
const textExtensions = new Set(['.ts', '.vue', '.js', '.mjs', '.json', '.md', '.yml', '.yaml', '.toml', '.html', '.css'])
const forbiddenText = [
  /MMJ_[A-Z0-9_]*(?:SECRET|SALT|ACCOUNT_ID|BUCKET_NAME|SPREADSHEET_ID|SCRIPT_ID|WORKER_ORIGIN)/,
  /CLOUDFLARE_API_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|GOOGLE_APPLICATION_CREDENTIALS/,
  /apps-script\/media-cms|workers\/media-cms|content\/providers/i,
]

async function walk(dir) {
  const files = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.nuxt' || entry.name === '.output' || entry.name === '.git') continue
    const absolute = resolve(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute))
    else files.push(absolute)
  }
  return files
}

for (const entry of await readdir(root)) {
  if (['node_modules', '.nuxt', '.output', 'dist'].includes(entry)) continue
  if (!allowedRootEntries.has(entry)) fail(`unexpected root entry: ${entry}`)
}

const files = await walk(root)
for (const absolute of files) {
  const rel = normalize(relative(root, absolute))
  const basename = rel.split('/').at(-1)
  if (forbiddenFiles.has(rel) || rel.startsWith('.env') || forbiddenBasenamePatterns.some(pattern => pattern.test(basename))) fail(`forbidden credential file: ${rel}`)
  if (forbiddenPrefixes.some(prefix => rel.startsWith(prefix))) fail(`forbidden path: ${rel}`)
  if (rel.startsWith('security/') && !allowedSecurity.has(rel)) fail(`security file is not allowlisted: ${rel}`)
  if (rel.startsWith('shared/') && !allowedShared.has(rel)) fail(`shared file is not allowlisted: ${rel}`)
  if (!textExtensions.has(extname(rel)) || rel === 'scripts/public-boundary-gate.mjs' || rel === 'scripts/public-runtime-origin-gate.mjs' || securityScannerFiles.has(rel) || rel.startsWith('security/')) continue
  const text = await readFile(absolute, 'utf8')
  for (const pattern of forbiddenText) {
    if (pattern.test(text)) fail(`forbidden control-plane signature in ${rel}: ${pattern}`)
  }
  const imports = text.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g)
  for (const match of imports) {
    const specifier = match[2]
    if (/^(?:~~\/|\.\.\/|\.\/).*(?:apps-script|workers|content\/providers|shared\/(?:build|provider|migration|contracts)|cms-|media-upload|production-authoring|mmj-05i)/.test(specifier)) {
      fail(`forbidden import in ${rel}: ${specifier}`)
    }
  }
}

const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
if (pkg.devDependencies?.wrangler || pkg.dependencies?.wrangler) fail('wrangler is forbidden in the public package graph.')
for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
  if (/snapshot:mmj|mmj-05[a-m]|wrangler|clasp/i.test(String(command))) fail(`private command leaked through script ${name}.`)
}

for (const required of allowedShared) {
  try { await stat(resolve(root, required)) } catch { fail(`required public dependency missing: ${required}`) }
}

console.log(JSON.stringify({
  event: 'PASS_MMJ_05N_A_PUBLIC_BOUNDARY',
  scannedFileCount: files.length,
  sharedAllowlistCount: allowedShared.size,
}))
