export const MMJ_PUBLIC_MEDIA_ORIGIN = 'https://media.mamajing.work' as const

export type MediaDeliveryEnvironmentClass = 'development' | 'test' | 'production'

export interface PortfolioMediaDeliveryConfig {
  readonly mode: 'unbound' | 'bound'
  readonly mediaBaseUrl: string | null
  readonly source: 'runtime-config'
}

export const UNBOUND_PORTFOLIO_MEDIA_DELIVERY_CONFIG: PortfolioMediaDeliveryConfig = Object.freeze({
  mode: 'unbound',
  mediaBaseUrl: null,
  source: 'runtime-config',
})

export function canonicalizeMediaBaseUrl(raw: string): string {
  const parsed = new URL(raw)
  if (parsed.protocol !== 'https:') throw new Error('FAIL_MMJ_05G_INVALID_MEDIA_BASE_URL: HTTPS is required.')
  if (parsed.username || parsed.password) throw new Error('FAIL_MMJ_05G_INVALID_MEDIA_BASE_URL: credentials are forbidden.')
  if (parsed.search || parsed.hash) throw new Error('FAIL_MMJ_05G_INVALID_MEDIA_BASE_URL: query and fragment are forbidden.')
  const host = parsed.hostname.toLowerCase()
  if (host.endsWith('.r2.dev')) throw new Error('FAIL_MMJ_05G_INVALID_MEDIA_BASE_URL: r2.dev is not a production delivery authority.')
  if (host.endsWith('.r2.cloudflarestorage.com')) throw new Error('FAIL_MMJ_05G_INVALID_MEDIA_BASE_URL: the R2 S3 API endpoint is not a public delivery authority.')
  parsed.pathname = parsed.pathname.replace(/\/+$/u, '')
  return parsed.toString().replace(/\/$/u, '')
}

export function resolvePortfolioMediaDeliveryConfig(
  raw: string | null | undefined,
  environmentClass: MediaDeliveryEnvironmentClass,
): PortfolioMediaDeliveryConfig {
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  if (normalized.length === 0) return UNBOUND_PORTFOLIO_MEDIA_DELIVERY_CONFIG
  const canonical = canonicalizeMediaBaseUrl(normalized)
  if (environmentClass === 'production' && canonical !== MMJ_PUBLIC_MEDIA_ORIGIN) {
    throw new Error('FAIL_MMJ_05N_D_PAGES_MEDIA_BASE_DRIFT: production media origin must be https://media.mamajing.work.')
  }
  if (environmentClass === 'production' && canonical.length === 0) {
    throw new Error('FAIL_MMJ_05G_INVALID_MEDIA_BASE_URL: production media delivery is invalid.')
  }
  return Object.freeze({ mode: 'bound', mediaBaseUrl: canonical, source: 'runtime-config' })
}
