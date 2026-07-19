import { WORKS_QUERY_KEYS } from '../query/works-query-state'
import {
  NavigationMemoryStateError,
} from '../types/navigation-memory'
import type {
  NavigationRawQuery,
  NavigationRawQueryScalar,
  NavigationRouteKey,
  NavigationRouteLocationInput,
} from '../types/navigation-memory'

export interface NavigationRouteKeyAuthority {
  create(input: NavigationRouteLocationInput): NavigationRouteKey
  parse(routeKey: NavigationRouteKey): Readonly<{
    path: '/' | '/works'
    query: Readonly<Record<string, readonly (string | null)[]>>
  }>
  assertCanonical(routeKey: NavigationRouteKey): void
}

const ALLOWED_PATHS = new Set<string>(['/', '/works'])
const OFFICIAL_KEY_ORDER = new Map<string, number>(
  WORKS_QUERY_KEYS.map((key, index) => [key, index]),
)
const UPPERCASE_PERCENT_ESCAPE = /%[0-9A-F]{2}/g
const ANY_PERCENT = /%/g

function fail(
  code: ConstructorParameters<typeof NavigationMemoryStateError>[0],
  path: string,
): never {
  throw new NavigationMemoryStateError(code, path)
}

function assertAllowedPath(path: unknown): asserts path is '/' | '/works' {
  if (
    typeof path !== 'string'
    || !ALLOWED_PATHS.has(path)
    || path.includes('#')
    || path.includes('?')
  ) {
    fail('invalid-navigation-route-path', 'path')
  }
}

function strictEncode(value: string, path: string): string {
  try {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
  } catch {
    fail('invalid-navigation-route-query-value', path)
  }
}

function assertQueryKey(key: unknown, path: string): asserts key is string {
  if (typeof key !== 'string' || key.length === 0) {
    fail('invalid-navigation-route-query-key', path)
  }
  strictEncode(key, path)
}

function normalizeQueryValue(
  value: unknown,
  path: string,
): readonly (string | null)[] {
  if (value === undefined) return []
  if (value === null || typeof value === 'string') return [value]
  if (!Array.isArray(value)) {
    fail('invalid-navigation-route-query-value', path)
  }
  const output: (string | null)[] = []
  for (const [index, item] of value.entries()) {
    if (item === undefined) continue
    if (item !== null && typeof item !== 'string') {
      fail('invalid-navigation-route-query-value', `${path}[${index}]`)
    }
    output.push(item)
  }
  return output
}

function orderedKeys(query: NavigationRawQuery): readonly string[] {
  const keys = Object.keys(query)
  for (const key of keys) assertQueryKey(key, `query.${key}`)
  return keys.sort((left, right) => {
    const leftOfficial = OFFICIAL_KEY_ORDER.get(left)
    const rightOfficial = OFFICIAL_KEY_ORDER.get(right)
    if (leftOfficial !== undefined && rightOfficial !== undefined) {
      return leftOfficial - rightOfficial
    }
    if (leftOfficial !== undefined) return -1
    if (rightOfficial !== undefined) return 1
    return left < right ? -1 : left > right ? 1 : 0
  })
}

function createRouteKey(input: NavigationRouteLocationInput): NavigationRouteKey {
  if (typeof input !== 'object' || input === null) {
    fail('invalid-navigation-route-path', 'input')
  }
  assertAllowedPath(input.path)
  if (typeof input.query !== 'object' || input.query === null || Array.isArray(input.query)) {
    fail('invalid-navigation-route-query-value', 'query')
  }

  const pairs: string[] = []
  for (const key of orderedKeys(input.query)) {
    const encodedKey = strictEncode(key, `query.${key}`)
    const values = normalizeQueryValue(input.query[key], `query.${key}`)
    for (const value of values) {
      if (value === null) {
        pairs.push(encodedKey)
      } else {
        pairs.push(`${encodedKey}=${strictEncode(value, `query.${key}`)}`)
      }
    }
  }
  return pairs.length === 0
    ? input.path
    : `${input.path}?${pairs.join('&')}`
}

function assertPercentEncoding(value: string): void {
  const allPercentCount = [...value.matchAll(ANY_PERCENT)].length
  const validPercentCount = [...value.matchAll(UPPERCASE_PERCENT_ESCAPE)].length
  if (allPercentCount !== validPercentCount) {
    fail('invalid-navigation-route-percent-encoding', 'routeKey')
  }
}

function decodePart(value: string, path: string): string {
  assertPercentEncoding(value)
  try {
    return decodeURIComponent(value)
  } catch {
    fail('invalid-navigation-route-percent-encoding', path)
  }
}

function freezeQuery(
  query: Record<string, readonly (string | null)[]>,
): Readonly<Record<string, readonly (string | null)[]>> {
  const output: Record<string, readonly (string | null)[]> = {}
  for (const key of Object.keys(query)) {
    output[key] = Object.freeze([...query[key]!])
  }
  return Object.freeze(output)
}

function parseRouteKey(routeKey: NavigationRouteKey): Readonly<{
  path: '/' | '/works'
  query: Readonly<Record<string, readonly (string | null)[]>>
}> {
  if (typeof routeKey !== 'string' || routeKey.length === 0 || routeKey.includes('#')) {
    fail('invalid-navigation-route-path', 'routeKey')
  }
  const questionIndex = routeKey.indexOf('?')
  const path = questionIndex === -1
    ? routeKey
    : routeKey.slice(0, questionIndex)
  assertAllowedPath(path)

  const rawQuery = questionIndex === -1
    ? ''
    : routeKey.slice(questionIndex + 1)
  const parsed: Record<string, (string | null)[]> = {}

  if (rawQuery.length > 0) {
    for (const [pairIndex, pair] of rawQuery.split('&').entries()) {
      if (pair.length === 0) {
        fail('invalid-navigation-route-query-key', `routeKey.query[${pairIndex}]`)
      }
      const equalsIndex = pair.indexOf('=')
      const rawKey = equalsIndex === -1 ? pair : pair.slice(0, equalsIndex)
      const rawValue = equalsIndex === -1 ? null : pair.slice(equalsIndex + 1)
      if (rawKey.length === 0) {
        fail('invalid-navigation-route-query-key', `routeKey.query[${pairIndex}]`)
      }
      const key = decodePart(rawKey, `routeKey.query[${pairIndex}].key`)
      assertQueryKey(key, `routeKey.query[${pairIndex}].key`)
      const value = rawValue === null
        ? null
        : decodePart(rawValue, `routeKey.query[${pairIndex}].value`)
      const bucket = parsed[key] ?? []
      bucket.push(value)
      parsed[key] = bucket
    }
  }

  const query = freezeQuery(parsed)
  const canonical = createRouteKey({ path, query })
  if (canonical !== routeKey) {
    fail('noncanonical-navigation-route-key', 'routeKey')
  }
  return Object.freeze({ path, query })
}

export const navigationRouteKeyAuthority: NavigationRouteKeyAuthority = Object.freeze({
  create: createRouteKey,
  parse: parseRouteKey,
  assertCanonical(routeKey: NavigationRouteKey): void {
    parseRouteKey(routeKey)
  },
})
