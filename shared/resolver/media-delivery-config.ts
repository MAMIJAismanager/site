import { resolvePortfolioMediaDeliveryConfig, type MediaDeliveryEnvironmentClass, type PortfolioMediaDeliveryConfig } from '../constants/media-delivery'

export function createPortfolioMediaDeliveryConfig(
  raw: string | null | undefined,
  environmentClass: MediaDeliveryEnvironmentClass,
): PortfolioMediaDeliveryConfig {
  return resolvePortfolioMediaDeliveryConfig(raw, environmentClass)
}

export function joinPortfolioMediaUrl(config: PortfolioMediaDeliveryConfig, objectKey: string): string | null {
  if (config.mode === 'unbound' || config.mediaBaseUrl === null) return null
  if (!/^assets\/(image|video|audio)\/ast_[a-z0-9]{8,32}\/[a-z0-9][a-z0-9._-]*$/u.test(objectKey)) {
    throw new Error('Invalid portfolio media object key.')
  }
  return `${config.mediaBaseUrl}/${objectKey}`
}
