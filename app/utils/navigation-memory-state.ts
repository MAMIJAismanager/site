import { navigationRouteKeyAuthority } from '../../shared/navigation/navigation-route-key'
import { isProjectId } from '../../shared/schema/domain-identifiers'
import {
  NavigationMemoryStateError,
} from '../../shared/types/navigation-memory'
import type {
  NavigationMemoryConsumeResult,
  NavigationMemoryEntry,
  NavigationMemoryStateErrorCode,
  NavigationMemoryStoreState,
  NavigationMemoryTransition,
  NavigationRouteKey,
} from '../../shared/types/navigation-memory'

const ENTRY_KEYS = [
  'activeProjectId',
  'documentScrollTop',
  'railScrollLeft',
  'routeKey',
] as const

function fail(code: NavigationMemoryStateErrorCode, path: string): never {
  throw new NavigationMemoryStateError(code, path)
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function assertExactEntryFields(input: unknown): asserts input is NavigationMemoryEntry {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail('invalid-navigation-memory-entry', 'entry')
  }
  const keys = Object.keys(input).sort()
  if (
    keys.length !== ENTRY_KEYS.length
    || keys.some((key, index) => key !== ENTRY_KEYS[index])
  ) {
    fail('invalid-navigation-memory-entry', 'entry')
  }
}

function copyEntry(entry: NavigationMemoryEntry): NavigationMemoryEntry {
  return Object.freeze({
    routeKey: entry.routeKey,
    activeProjectId: entry.activeProjectId,
    documentScrollTop: entry.documentScrollTop,
    railScrollLeft: entry.railScrollLeft,
  })
}

function sameEntry(
  left: NavigationMemoryEntry,
  right: NavigationMemoryEntry,
): boolean {
  return (
    left.routeKey === right.routeKey
    && left.activeProjectId === right.activeProjectId
    && left.documentScrollTop === right.documentScrollTop
    && left.railScrollLeft === right.railScrollLeft
  )
}

export function createNavigationMemoryEntry(
  input: NavigationMemoryEntry,
): NavigationMemoryEntry {
  assertExactEntryFields(input)
  const parsed = navigationRouteKeyAuthority.parse(input.routeKey)

  if (!isProjectId(input.activeProjectId)) {
    fail('invalid-navigation-project-id', 'entry.activeProjectId')
  }
  if (!isFiniteNonNegative(input.documentScrollTop)) {
    fail('invalid-document-scroll-top', 'entry.documentScrollTop')
  }
  if (
    input.railScrollLeft !== null
    && !isFiniteNonNegative(input.railScrollLeft)
  ) {
    fail('invalid-rail-scroll-left', 'entry.railScrollLeft')
  }

  const projectValues = parsed.query.project ?? []
  if (parsed.path === '/works') {
    if (input.railScrollLeft !== null) {
      fail('works-rail-scroll-left-not-null', 'entry.railScrollLeft')
    }
    if (projectValues.length === 0) {
      fail('missing-works-project-query', 'entry.routeKey.query.project')
    }
    if (projectValues.length !== 1) {
      fail('multiple-works-project-query-values', 'entry.routeKey.query.project')
    }
    if (projectValues[0] !== input.activeProjectId) {
      fail('works-project-query-mismatch', 'entry.activeProjectId')
    }
  } else if (projectValues.length > 0) {
    fail('home-project-query-not-allowed', 'entry.routeKey.query.project')
  }

  return copyEntry(input)
}

export function createInitialNavigationMemoryStoreState(): NavigationMemoryStoreState {
  return {
    schemaVersion: 1,
    entry: null,
  }
}

export function reduceNavigationMemoryStoreState(
  state: NavigationMemoryStoreState,
  transition: NavigationMemoryTransition,
): NavigationMemoryStoreState {
  switch (transition.kind) {
    case 'capture': {
      const entry = createNavigationMemoryEntry(transition.entry)
      if (state.entry !== null && sameEntry(state.entry, entry)) return state
      return {
        schemaVersion: 1,
        entry,
      }
    }
    case 'clear':
      if (state.entry === null) return state
      return {
        schemaVersion: 1,
        entry: null,
      }
    default: {
      const exhaustive: never = transition
      void exhaustive
      fail('invalid-navigation-memory-entry', 'transition.kind')
    }
  }
}

export function consumeNavigationMemoryForRoute(
  state: NavigationMemoryStoreState,
  currentRouteKey: NavigationRouteKey,
): NavigationMemoryConsumeResult {
  navigationRouteKeyAuthority.assertCanonical(currentRouteKey)
  if (state.entry === null) {
    return Object.freeze({
      state,
      entry: null,
      matched: false,
    })
  }

  const matched = state.entry.routeKey === currentRouteKey
  const entry = matched ? copyEntry(state.entry) : null
  const nextState: NavigationMemoryStoreState = {
    schemaVersion: 1,
    entry: null,
  }
  return Object.freeze({
    state: nextState,
    entry,
    matched,
  })
}
