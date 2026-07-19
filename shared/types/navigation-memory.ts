import type { ProjectId } from './domain-identifiers'

export type NavigationRouteKey = string

export type NavigationRawQueryScalar = string | null | undefined

export type NavigationRawQueryValue =
  | NavigationRawQueryScalar
  | readonly NavigationRawQueryScalar[]

export type NavigationRawQuery = Readonly<
  Record<string, NavigationRawQueryValue>
>

export interface NavigationRouteLocationInput {
  readonly path: string
  readonly query: NavigationRawQuery
}

export interface NavigationMemoryEntry {
  readonly routeKey: NavigationRouteKey
  readonly activeProjectId: ProjectId
  readonly documentScrollTop: number
  readonly railScrollLeft: number | null
}

export interface NavigationMemoryStoreState {
  readonly schemaVersion: 1
  readonly entry: NavigationMemoryEntry | null
}

export type NavigationMemoryTransition =
  | Readonly<{
      kind: 'capture'
      entry: NavigationMemoryEntry
    }>
  | Readonly<{
      kind: 'clear'
    }>

export interface NavigationMemoryConsumeResult {
  readonly state: NavigationMemoryStoreState
  readonly entry: NavigationMemoryEntry | null
  readonly matched: boolean
}

export type NavigationMemoryStateErrorCode =
  | 'invalid-navigation-route-path'
  | 'invalid-navigation-route-query-key'
  | 'invalid-navigation-route-query-value'
  | 'invalid-navigation-route-percent-encoding'
  | 'noncanonical-navigation-route-key'
  | 'invalid-navigation-project-id'
  | 'invalid-document-scroll-top'
  | 'invalid-rail-scroll-left'
  | 'works-rail-scroll-left-not-null'
  | 'missing-works-project-query'
  | 'multiple-works-project-query-values'
  | 'works-project-query-mismatch'
  | 'home-project-query-not-allowed'
  | 'invalid-navigation-memory-entry'

export class NavigationMemoryStateError extends Error {
  override readonly name = 'NavigationMemoryStateError'

  constructor(
    readonly code: NavigationMemoryStateErrorCode,
    readonly path: string,
  ) {
    super(`${code}: ${path}`)
  }
}
