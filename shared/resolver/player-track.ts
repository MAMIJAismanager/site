import {
  isAssetMediaTypeFor,
} from '../constants/public-asset-domain'
import {
  isAssetId,
  isProjectId,
} from '../schema/domain-identifiers'
import type {
  PlayerTrack,
} from '../types/player-store'
import type {
  ResolvedAudioInlinePlan,
} from '../types/resolved-media'
import type {
  ProjectId,
} from '../types/domain-identifiers'

export type PlayerTrackPlanningErrorCode =
  | 'player-track-kind-mismatch'
  | 'player-track-fallback-source-not-member'
  | 'player-track-invalid-project-id'
  | 'player-track-invalid-asset-id'
  | 'player-track-invalid-label'
  | 'player-track-invalid-rendition-id'
  | 'player-track-invalid-media-type'
  | 'player-track-invalid-url'
  | 'player-track-invalid-duration'
  | 'player-track-generation-conflict'

export class PlayerTrackPlanningError extends Error {
  override readonly name = 'PlayerTrackPlanningError'

  constructor(
    readonly code: PlayerTrackPlanningErrorCode,
    readonly path: string,
    readonly ownerId: string | null,
  ) {
    super(`${code}: ${path}${ownerId === null ? '' : ` (${ownerId})`}`)
  }
}

export interface PlayerTrackPlanningAuthority {
  resolve(
    audioPlan: ResolvedAudioInlinePlan,
    projectId: ProjectId,
  ): PlayerTrack
}

interface CachedTrack {
  readonly source: ResolvedAudioInlinePlan
  readonly output: PlayerTrack
}

function fail(
  code: PlayerTrackPlanningErrorCode,
  path: string,
  ownerId: string | null,
): never {
  throw new PlayerTrackPlanningError(code, path, ownerId)
}

function validateHttpsUrl(
  value: unknown,
  ownerId: string,
): string {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value !== value.trim()
  ) {
    fail('player-track-invalid-url', 'audioPlan.fallbackSource.url', ownerId)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    fail('player-track-invalid-url', 'audioPlan.fallbackSource.url', ownerId)
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.hostname.length === 0
    || parsed.username.length > 0
    || parsed.password.length > 0
  ) {
    fail('player-track-invalid-url', 'audioPlan.fallbackSource.url', ownerId)
  }

  return value
}

export function createPlayerTrackPlanningAuthority(): PlayerTrackPlanningAuthority {
  const outputByPlan = new WeakMap<ResolvedAudioInlinePlan, Map<string, PlayerTrack>>()
  const ownerByIdentity = new Map<string, CachedTrack>()

  return Object.freeze({
    resolve(
      audioPlan: ResolvedAudioInlinePlan,
      projectId: ProjectId,
    ): PlayerTrack {
      if (!isProjectId(projectId)) {
        fail('player-track-invalid-project-id', 'projectId', String(projectId))
      }

      const plan = audioPlan as ResolvedAudioInlinePlan
      const media = plan?.media
      const ownerId = typeof media?.id === 'string' ? media.id : null

      if (
        media?.kind !== 'audio'
        || !Array.isArray(plan.sources)
        || plan.fallbackSource?.kind !== 'audio'
        || plan.sources.some(source => source.kind !== 'audio')
      ) {
        fail('player-track-kind-mismatch', 'audioPlan', ownerId)
      }

      if (!isAssetId(media.id)) {
        fail('player-track-invalid-asset-id', 'audioPlan.media.id', ownerId)
      }

      if (
        typeof media.label !== 'string'
        || media.label.length === 0
        || media.label !== media.label.trim()
      ) {
        fail('player-track-invalid-label', 'audioPlan.media.label', media.id)
      }

      if (!plan.sources.includes(plan.fallbackSource)) {
        fail(
          'player-track-fallback-source-not-member',
          'audioPlan.fallbackSource',
          media.id,
        )
      }

      const source = plan.fallbackSource
      if (
        typeof source.renditionId !== 'string'
        || source.renditionId.length === 0
        || source.renditionId !== source.renditionId.trim()
      ) {
        fail(
          'player-track-invalid-rendition-id',
          'audioPlan.fallbackSource.renditionId',
          media.id,
        )
      }

      if (!isAssetMediaTypeFor('audio', source.mediaType)) {
        fail(
          'player-track-invalid-media-type',
          'audioPlan.fallbackSource.mediaType',
          media.id,
        )
      }

      const durationMs = source.metadata?.durationMs
      if (
        !Number.isSafeInteger(durationMs)
        || durationMs <= 0
      ) {
        fail(
          'player-track-invalid-duration',
          'audioPlan.fallbackSource.metadata.durationMs',
          media.id,
        )
      }

      const url = validateHttpsUrl(source.url, media.id)
      const identity = `${media.id}\u0000${projectId}`
      const existingOwner = ownerByIdentity.get(identity)
      if (existingOwner !== undefined && existingOwner.source !== plan) {
        fail('player-track-generation-conflict', 'audioPlan', media.id)
      }

      const projectCache = outputByPlan.get(plan)
      const existingOutput = projectCache?.get(projectId)
      if (existingOutput !== undefined) return existingOutput

      const output: PlayerTrack = Object.freeze({
        trackId: media.id,
        projectId,
        label: media.label,
        source: Object.freeze({
          renditionId: source.renditionId,
          url,
          mediaType: source.mediaType,
          declaredDurationMs: durationMs,
        }),
      })

      const nextProjectCache = projectCache ?? new Map<string, PlayerTrack>()
      nextProjectCache.set(projectId, output)
      if (projectCache === undefined) outputByPlan.set(plan, nextProjectCache)
      ownerByIdentity.set(identity, Object.freeze({ source: plan, output }))
      return output
    },
  })
}
