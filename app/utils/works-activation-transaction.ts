import {
  createNavigationCaptureEntry,
  entryMatches,
  isCanonicalWorkDetailHref,
  isEligibleSameTabDetailActivation,
  isFiniteNonNegativeObservation,
} from '~/utils/navigation-restoration'

import type {
  PreparedWorksActivationTransaction,
  ProjectDetailActivationPayload,
  WorksActivationTransactionPort,
  WorksActivationTransactionResult,
} from '~/types/navigation-restoration'

import type {
  NavigationMemoryEntry,
  NavigationRouteKey,
} from '~~/shared/types/navigation-memory'

export interface PrepareWorksActivationTransactionInput {
  readonly payload: ProjectDetailActivationPayload
  readonly transactionId: number
  readonly storeReady: boolean
  readonly originRouteKey: NavigationRouteKey
  readonly replacementRouteKey: NavigationRouteKey
  readonly documentScrollTop: number
}

function frozenResult<const T extends object>(value: T): Readonly<T> {
  return Object.freeze(value)
}

export function prepareAndClaimWorksActivationTransaction(
  input: PrepareWorksActivationTransactionInput,
): PreparedWorksActivationTransaction | null {
  const { event } = input.payload

  if (!input.storeReady) return null
  if (!isEligibleSameTabDetailActivation(event)) return null
  if (!isCanonicalWorkDetailHref(input.payload.href)) return null
  if (!Number.isSafeInteger(input.transactionId) || input.transactionId < 1) return null
  if (!isFiniteNonNegativeObservation(input.documentScrollTop)) return null

  let entry: NavigationMemoryEntry
  try {
    entry = createNavigationCaptureEntry({
      routeKey: input.replacementRouteKey,
      activeProjectId: input.payload.projectId,
      documentScrollTop: input.documentScrollTop,
      railScrollLeft: null,
    })
  } catch {
    return null
  }

  event.preventDefault()
  if (!event.defaultPrevented) return null

  return frozenResult({
    transactionId: input.transactionId,
    projectId: input.payload.projectId,
    detailHref: input.payload.href,
    originRouteKey: input.originRouteKey,
    replacementRouteKey: input.replacementRouteKey,
    entry,
  })
}

async function rollbackExactOrigin(
  transaction: PreparedWorksActivationTransaction,
  port: WorksActivationTransactionPort,
  cause: Extract<WorksActivationTransactionResult, { status: 'rolled-back' }>['cause'],
): Promise<WorksActivationTransactionResult> {
  if (!port.isLatest(transaction.transactionId)) {
    return frozenResult({ status: 'cancelled-superseded' })
  }
  if (port.readCurrentRouteKey() !== transaction.replacementRouteKey) {
    return frozenResult({ status: 'cancelled-route-mismatch' })
  }

  try {
    await port.rollbackOrigin(transaction.originRouteKey)
  } catch {
    return frozenResult({
      status: 'failed',
      code: 'works-activation-origin-rollback-failed',
    })
  }

  if (port.readCurrentRouteKey() !== transaction.originRouteKey) {
    return frozenResult({
      status: 'failed',
      code: 'works-activation-origin-rollback-failed',
    })
  }

  return frozenResult({ status: 'rolled-back', cause })
}

export async function executeWorksActivationTransaction(
  transaction: PreparedWorksActivationTransaction,
  port: WorksActivationTransactionPort,
): Promise<WorksActivationTransactionResult> {
  if (!port.isLatest(transaction.transactionId)) {
    return frozenResult({ status: 'cancelled-superseded' })
  }
  if (port.readCurrentRouteKey() !== transaction.originRouteKey) {
    return frozenResult({ status: 'cancelled-route-mismatch' })
  }

  try {
    await port.replaceOrigin(transaction.replacementRouteKey)
  } catch {
    return frozenResult({
      status: 'failed',
      code: 'works-activation-replace-failed',
    })
  }

  if (!port.isLatest(transaction.transactionId)) {
    return frozenResult({ status: 'cancelled-superseded' })
  }
  if (port.readCurrentRouteKey() !== transaction.replacementRouteKey) {
    return frozenResult({
      status: 'failed',
      code: 'works-activation-replace-not-acknowledged',
    })
  }

  try {
    port.capture(transaction.entry)
  } catch {
    return rollbackExactOrigin(
      transaction,
      port,
      'works-activation-memory-commit-not-acknowledged',
    )
  }

  if (!entryMatches(port.readEntry(), transaction.entry)) {
    return rollbackExactOrigin(
      transaction,
      port,
      'works-activation-memory-commit-not-acknowledged',
    )
  }

  if (!port.isLatest(transaction.transactionId)) {
    port.clearIfExact(transaction.entry)
    return frozenResult({ status: 'cancelled-superseded' })
  }
  if (port.readCurrentRouteKey() !== transaction.replacementRouteKey) {
    port.clearIfExact(transaction.entry)
    return frozenResult({ status: 'cancelled-route-mismatch' })
  }

  try {
    await port.pushDetail(transaction.detailHref)
  } catch {
    port.clearIfExact(transaction.entry)
    return rollbackExactOrigin(
      transaction,
      port,
      'works-activation-detail-push-failed',
    )
  }

  if (!port.isLatest(transaction.transactionId)) {
    port.clearIfExact(transaction.entry)
    return frozenResult({ status: 'cancelled-superseded' })
  }
  if (port.readCurrentFullPath() !== transaction.detailHref) {
    port.clearIfExact(transaction.entry)
    if (port.readCurrentRouteKey() === transaction.replacementRouteKey) {
      return rollbackExactOrigin(
        transaction,
        port,
        'works-activation-detail-push-not-acknowledged',
      )
    }
    return frozenResult({
      status: 'failed',
      code: 'works-activation-detail-push-not-acknowledged',
    })
  }

  return frozenResult({
    status: 'navigated',
    entry: transaction.entry,
  })
}
