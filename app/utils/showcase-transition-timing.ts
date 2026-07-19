export const SHOWCASE_FULL_STEP_DURATION_MS = 1400
export const SHOWCASE_MIN_SETTLE_DURATION_MS = 600
export const SHOWCASE_WEIGHTED_MOTION_EASING = 'cubic-bezier(0.55, 0, 0.45, 1)'

export const SHOWCASE_ARROW_RAPID_TAP_WINDOW_MS = 520
export const SHOWCASE_ARROW_RAPID_TAP_MIN_DURATION_MS = 760

const SHOWCASE_ARROW_RAPID_TAP_SCALES = [
  1,
  0.78,
  0.64,
  0.54,
] as const

export interface ShowcaseArrowBurstInput {
  readonly timestamp: number
  readonly previousTimestamp: number
  readonly direction: 'previous' | 'next'
  readonly previousDirection: 'previous' | 'next' | null
  readonly previousStreak: number
}

export interface ShowcaseArrowBurstResult {
  readonly streak: number
  readonly durationMs: number
  readonly accelerated: boolean
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(-1, Math.min(1, value))
}

function normalizeTimestamp(value: number): number {
  return Number.isFinite(value)
    ? value
    : Number.NEGATIVE_INFINITY
}

export function resolveShowcaseArrowBurst(
  input: ShowcaseArrowBurstInput,
): ShowcaseArrowBurstResult {
  const timestamp = normalizeTimestamp(input.timestamp)
  const previousTimestamp = normalizeTimestamp(input.previousTimestamp)
  const elapsed = timestamp - previousTimestamp
  const continuesBurst = (
    input.previousDirection === input.direction
    && elapsed >= 0
    && elapsed <= SHOWCASE_ARROW_RAPID_TAP_WINDOW_MS
  )
  const streak = continuesBurst
    ? Math.min(Math.max(input.previousStreak, 1) + 1, 4)
    : 1
  const scale = SHOWCASE_ARROW_RAPID_TAP_SCALES[streak - 1] ?? 1
  const durationMs = streak === 1
    ? SHOWCASE_FULL_STEP_DURATION_MS
    : Math.max(
        SHOWCASE_ARROW_RAPID_TAP_MIN_DURATION_MS,
        Math.round(SHOWCASE_FULL_STEP_DURATION_MS * scale),
      )

  return {
    streak,
    durationMs,
    accelerated: streak > 1,
  }
}

export function resolveShowcaseTransitionDurationMs(
  fromProgress: number,
  toProgress: number,
): number {
  const from = clampProgress(fromProgress)
  const to = clampProgress(toProgress)
  const distance = Math.abs(to - from)

  if (distance === 0) return 0

  return Math.max(
    SHOWCASE_MIN_SETTLE_DURATION_MS,
    Math.round(SHOWCASE_FULL_STEP_DURATION_MS * distance),
  )
}
