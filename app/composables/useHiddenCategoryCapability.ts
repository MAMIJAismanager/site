import {
  HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
} from '~~/shared/constants/portfolio-gateway-categories'

const STORAGE_KEY = 'mmj:hidden-category-capability'
const SCHEMA = 'mmj-hidden-category-capability/v1'

interface HiddenCategoryCapability {
  readonly schema: typeof SCHEMA
  readonly categoryId: typeof HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID
  readonly issuedAt: number
}

function isCapability(value: unknown): value is HiddenCategoryCapability {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    record.schema === SCHEMA
    && record.categoryId === HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID
    && typeof record.issuedAt === 'number'
    && Number.isSafeInteger(record.issuedAt)
    && record.issuedAt > 0
  )
}

export function grantHiddenCategoryCapability(): void {
  if (!import.meta.client) return

  const capability: HiddenCategoryCapability = {
    schema: SCHEMA,
    categoryId: HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
    issuedAt: Date.now(),
  }

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(capability),
  )
}

export function hasHiddenCategoryCapability(): boolean {
  if (!import.meta.client) return false

  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (raw === null) return false

  try {
    return isCapability(JSON.parse(raw))
  } catch {
    return false
  }
}

export function clearHiddenCategoryCapability(): void {
  if (!import.meta.client) return
  sessionStorage.removeItem(STORAGE_KEY)
}

export const HIDDEN_CATEGORY_CAPABILITY = Object.freeze({
  storageKey: STORAGE_KEY,
  schema: SCHEMA,
  categoryId: HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
})
