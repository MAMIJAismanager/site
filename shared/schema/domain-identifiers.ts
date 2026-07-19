import type {
  AssetId,
  ProjectId,
} from '../types/domain-identifiers'

export const PROJECT_ID_PATTERN =
  /^prj_[a-z0-9]{8,32}$/

export const ASSET_ID_PATTERN =
  /^ast_[a-z0-9]{8,32}$/

export const PROJECT_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const RESERVED_PROJECT_SLUGS:
ReadonlySet<string> = new Set([
  'new',
  'edit',
  'admin',
  'api',
  'search',
  'index',
  'undefined',
  'null',
])

export function isProjectId(
  value: unknown,
): value is ProjectId {
  return (
    typeof value === 'string'
    && PROJECT_ID_PATTERN.test(value)
  )
}

export function isAssetId(
  value: unknown,
): value is AssetId {
  return (
    typeof value === 'string'
    && ASSET_ID_PATTERN.test(value)
  )
}

export function isProjectSlug(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && value.length >= 2
    && value.length <= 96
    && PROJECT_SLUG_PATTERN.test(value)
    && !RESERVED_PROJECT_SLUGS.has(value)
  )
}

export function isReservedProjectSlug(
  value: unknown,
): value is string {
  return (
    typeof value === 'string'
    && RESERVED_PROJECT_SLUGS.has(value)
  )
}
