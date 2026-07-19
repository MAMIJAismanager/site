// @ts-expect-error Nuxt config executes in Node; the project intentionally adds no direct Node type dependency.
import { createHash } from 'node:crypto'
// @ts-expect-error Nuxt config executes in Node; the project intentionally adds no direct Node type dependency.
import { readFileSync } from 'node:fs'
// @ts-expect-error Nuxt config executes in Node; the project intentionally adds no direct Node type dependency.
import { dirname, join } from 'node:path'
// @ts-expect-error Nuxt config executes in Node; the project intentionally adds no direct Node type dependency.
import { fileURLToPath } from 'node:url'
import { resolvePortfolioMediaDeliveryConfig } from './shared/constants/media-delivery'

interface PortfolioRouteManifest {
  readonly schemaVersion: 2
  readonly snapshotDigest: string
  readonly routes: readonly string[]
}

const root = dirname(fileURLToPath(import.meta.url))
const snapshotPath = join(root, 'generated', 'portfolio.snapshot.json')
const routeManifestPath = join(root, 'generated', 'portfolio.routes.json')
const snapshotBytes = readFileSync(snapshotPath)
const runtimeProcess = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
const runtimeEnv = runtimeProcess?.env ?? {}
const environmentClass = runtimeEnv.MMJ_BUILD_ENVIRONMENT_CLASS === 'production' ? 'production' : runtimeEnv.MMJ_BUILD_ENVIRONMENT_CLASS === 'test' ? 'test' : 'development'
const mediaDeliveryConfig = resolvePortfolioMediaDeliveryConfig(runtimeEnv.NUXT_PUBLIC_MMJ_MEDIA_BASE_URL, environmentClass)
const snapshotValue: unknown = JSON.parse(snapshotBytes.toString())
const routeManifestValue: unknown = JSON.parse(
  readFileSync(routeManifestPath, 'utf8'),
)

function isPortfolioRouteManifest(
  value: unknown,
): value is PortfolioRouteManifest {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()

  return (
    keys.join(',') === 'routes,schemaVersion,snapshotDigest'
    && record.schemaVersion === 2
    && typeof record.snapshotDigest === 'string'
    && /^[a-f0-9]{64}$/.test(record.snapshotDigest)
    && Array.isArray(record.routes)
    && record.routes.every(route => (
      typeof route === 'string'
      && /^\/works\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route)
    ))
  )
}

if (!isPortfolioRouteManifest(routeManifestValue)) {
  throw new Error(
    'FAIL_MMJ_01E_ROUTE_MANIFEST_DRIFT: invalid generated route manifest.',
  )
}

const actualSnapshotDigest = createHash('sha256')
  .update(snapshotBytes)
  .digest('hex')

if (routeManifestValue.snapshotDigest !== actualSnapshotDigest) {
  throw new Error(
    'FAIL_MMJ_01E_ROUTE_MANIFEST_DRIFT: snapshot digest mismatch.',
  )
}

if (environmentClass === 'production' && mediaDeliveryConfig.mode === 'unbound') {
  const snapshotRecord = snapshotValue as { projects?: readonly unknown[]; assets?: readonly unknown[] }
  if ((snapshotRecord.projects?.length ?? 0) > 0 && (snapshotRecord.assets?.length ?? 0) > 0) {
    throw new Error('FAIL_MMJ_05G_MEDIA_DELIVERY_UNBOUND: public media exists but NUXT_PUBLIC_MMJ_MEDIA_BASE_URL is unbound.')
  }
}

const staticRoutes = [
  '/',
  '/works',
  '/about',
  '/contact',
] as const

const prerenderRoutes = [
  ...staticRoutes,
  ...routeManifestValue.routes,
]

const routeOwners = new Map<string, number>()
for (const route of prerenderRoutes) {
  const count = (routeOwners.get(route) ?? 0) + 1
  routeOwners.set(route, count)

  if (count > 1) {
    throw new Error(
      `FAIL_MMJ_01E_DUPLICATE_PRERENDER_ROUTE: ${route}`,
    )
  }
}

export default defineNuxtConfig({
  ssr: true,
  buildId: runtimeEnv.MMJ_BUILD_ID ?? 'mmj-05n-k-source',

  runtimeConfig: {
    public: {
      mmjMediaBaseUrl: mediaDeliveryConfig.mediaBaseUrl ?? '',
    },
  },

  modules: [
    '@pinia/nuxt',
  ],

  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/base.css',
    '~/assets/css/typography.css',
    '~/assets/css/shell.css',
    '~/assets/css/project-listing.css',
    '~/assets/css/works-query.css',
  ],

  devtools: {
    enabled: false,
  },

  app: {
    head: {
      title: '매미: 著',
      htmlAttrs: {
        lang: 'ko',
      },
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap',
        },
      ],
    },
  },

  nitro: {
    prerender: {
      concurrency: 1,
      crawlLinks: false,
      routes: prerenderRoutes,
    },
  },
})
