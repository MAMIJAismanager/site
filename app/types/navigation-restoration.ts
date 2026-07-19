import type {
  NavigationMemoryEntry,
  NavigationRouteKey,
} from '~~/shared/types/navigation-memory'
import type { ProjectId } from '~~/shared/types/domain-identifiers'

export type NavigationOrigin = 'home' | 'works'

export interface ProjectDetailActivationPayload {
  readonly event: MouseEvent
  readonly projectId: ProjectId
  readonly href: string
}

export interface PreparedWorksActivationTransaction {
  readonly transactionId: number
  readonly projectId: ProjectId
  readonly detailHref: string
  readonly originRouteKey: NavigationRouteKey
  readonly replacementRouteKey: NavigationRouteKey
  readonly entry: NavigationMemoryEntry
}

export type WorksActivationTransactionErrorCode =
  | 'works-activation-origin-mismatch'
  | 'works-activation-replace-failed'
  | 'works-activation-replace-not-acknowledged'
  | 'works-activation-memory-commit-not-acknowledged'
  | 'works-activation-detail-push-failed'
  | 'works-activation-detail-push-not-acknowledged'
  | 'works-activation-origin-rollback-failed'

export interface WorkReturnTarget {
  readonly href: string
  readonly label: string
  readonly origin: NavigationOrigin | 'fallback'
  readonly usesMemory: boolean
}

export type NavigationRestorationPlan =
  | Readonly<{
      origin: 'works'
      routeKey: NavigationRouteKey
      activeProjectId: ProjectId
      documentScrollTop: number
      railScrollLeft: null
    }>
  | Readonly<{
      origin: 'home'
      routeKey: NavigationRouteKey
      activeProjectId: ProjectId
      documentScrollTop: number
      railScrollLeft: number | null
    }>

export type NavigationRestorationResult =
  | Readonly<{ status: 'restored'; origin: NavigationOrigin }>
  | Readonly<{ status: 'no-entry' }>
  | Readonly<{ status: 'route-mismatch' }>
  | Readonly<{ status: 'target-missing'; origin: NavigationOrigin }>
  | Readonly<{ status: 'cancelled'; origin: NavigationOrigin }>

export type WorksActivationTransactionResult =
  | Readonly<{ status: 'navigated'; entry: NavigationMemoryEntry }>
  | Readonly<{ status: 'cancelled-superseded' }>
  | Readonly<{ status: 'cancelled-route-mismatch' }>
  | Readonly<{
      status: 'rolled-back'
      cause: Exclude<
        WorksActivationTransactionErrorCode,
        'works-activation-origin-rollback-failed'
      >
    }>
  | Readonly<{
      status: 'failed'
      code: WorksActivationTransactionErrorCode
    }>

export type HomeDetailActivationResult =
  | Readonly<{ status: 'native' }>
  | Readonly<{ status: 'captured'; entry: NavigationMemoryEntry }>

export interface WorksActivationTransactionPort {
  readonly isLatest: (transactionId: number) => boolean
  readonly readCurrentRouteKey: () => NavigationRouteKey | null
  readonly readCurrentFullPath: () => string
  readonly replaceOrigin: (routeKey: NavigationRouteKey) => Promise<void>
  readonly capture: (entry: NavigationMemoryEntry) => boolean
  readonly readEntry: () => NavigationMemoryEntry | null
  readonly clearIfExact: (entry: NavigationMemoryEntry) => boolean
  readonly pushDetail: (href: string) => Promise<void>
  readonly rollbackOrigin: (routeKey: NavigationRouteKey) => Promise<void>
}

export interface HomeDetailActivationPort {
  readonly readDocumentScrollTop: () => number
  readonly readRailScrollLeft: () => number | null
  readonly currentRouteKey: () => NavigationRouteKey
  readonly capture: (entry: NavigationMemoryEntry) => void
  readonly clear: () => void
}

export interface NavigationLayoutSettlePort {
  readonly isCurrent: () => boolean
  readonly nextTick: () => Promise<void>
  readonly requestFrame: () => Promise<void>
}

export interface WorksRestorationPort extends NavigationLayoutSettlePort {
  readonly hasProject: (projectId: ProjectId) => boolean
  readonly hasFocusTarget: (projectId: ProjectId) => boolean
  readonly scrollDocument: (top: number) => void
  readonly focusProject: (projectId: ProjectId) => void
}

export interface HomeRestorationPort extends NavigationLayoutSettlePort {
  readonly hasProject: (projectId: ProjectId) => boolean
  readonly hasRailAndFocusTarget: (projectId: ProjectId) => boolean
  readonly activateProject: (projectId: ProjectId) => boolean
  readonly scrollRail: (left: number) => void
  readonly scrollDocument: (top: number) => void
  readonly focusProject: (projectId: ProjectId) => void
}
