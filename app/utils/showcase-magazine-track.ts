export interface MagazineSlot {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly opacity: number
  readonly scale: number
  readonly saturation: number
}


export interface MagazineTextPresentation {
  readonly opacity: number
  readonly shiftRem: number
  readonly liftRem: number
  readonly blurPx: number
  readonly scale: number
}
export interface MagazinePresentation {
  readonly desktop: MagazineSlot
  readonly mobile: MagazineSlot
  readonly focusStrength: number
  readonly compactStrength: number
  readonly zIndex: number
  readonly continuousOffset: number
}

const DESKTOP_MAGAZINE_SLOTS: Readonly<Record<number, MagazineSlot>> = Object.freeze({
  [-3]: Object.freeze({ x: -34, y: 34, width: 11, height: 32, opacity: 0, scale: 0.88, saturation: 0.42 }),
  [-2]: Object.freeze({ x: -21, y: 31, width: 12, height: 36, opacity: 0.14, scale: 0.9, saturation: 0.48 }),
  [-1]: Object.freeze({ x: -7, y: 28, width: 14, height: 42, opacity: 0.46, scale: 0.94, saturation: 0.58 }),
  [0]: Object.freeze({ x: 4, y: 10, width: 49, height: 80, opacity: 1, scale: 1, saturation: 1 }),
  [1]: Object.freeze({ x: 58, y: 24, width: 16, height: 48, opacity: 0.82, scale: 0.97, saturation: 0.72 }),
  [2]: Object.freeze({ x: 76, y: 28, width: 14, height: 42, opacity: 0.58, scale: 0.94, saturation: 0.6 }),
  [3]: Object.freeze({ x: 92, y: 31, width: 12, height: 36, opacity: 0.32, scale: 0.91, saturation: 0.5 }),
  [4]: Object.freeze({ x: 106, y: 34, width: 11, height: 32, opacity: 0, scale: 0.88, saturation: 0.42 }),
})

const MOBILE_MAGAZINE_SLOTS: Readonly<Record<number, MagazineSlot>> = Object.freeze({
  [-3]: Object.freeze({ x: -104, y: 21, width: 42, height: 58, opacity: 0, scale: 0.88, saturation: 0.42 }),
  [-2]: Object.freeze({ x: -74, y: 20, width: 45, height: 60, opacity: 0.08, scale: 0.9, saturation: 0.48 }),
  [-1]: Object.freeze({ x: -31, y: 17, width: 49, height: 66, opacity: 0.38, scale: 0.94, saturation: 0.58 }),
  [0]: Object.freeze({ x: 6, y: 5, width: 88, height: 90, opacity: 1, scale: 1, saturation: 1 }),
  [1]: Object.freeze({ x: 88, y: 17, width: 49, height: 66, opacity: 0.5, scale: 0.95, saturation: 0.64 }),
  [2]: Object.freeze({ x: 132, y: 20, width: 45, height: 60, opacity: 0.1, scale: 0.9, saturation: 0.48 }),
  [3]: Object.freeze({ x: 168, y: 21, width: 42, height: 58, opacity: 0, scale: 0.88, saturation: 0.42 }),
  [4]: Object.freeze({ x: 202, y: 21, width: 42, height: 58, opacity: 0, scale: 0.88, saturation: 0.42 }),
})

const DESKTOP_FALLBACK_SLOT: MagazineSlot = Object.freeze({
  x: 106,
  y: 34,
  width: 11,
  height: 32,
  opacity: 0,
  scale: 0.88,
  saturation: 0.42,
})

const MOBILE_FALLBACK_SLOT: MagazineSlot = Object.freeze({
  x: 202,
  y: 21,
  width: 42,
  height: 58,
  opacity: 0,
  scale: 0.88,
  saturation: 0.42,
})

function clampSlotOffset(offset: number): number {
  return Math.max(-3, Math.min(4, offset))
}

function interpolateSlot(
  slots: Readonly<Record<number, MagazineSlot>>,
  fallback: MagazineSlot,
  offset: number,
): MagazineSlot {
  const clamped = clampSlotOffset(offset)
  const lowerIndex = Math.floor(clamped)
  const upperIndex = Math.ceil(clamped)
  const lower = slots[lowerIndex] ?? fallback
  const upper = slots[upperIndex] ?? fallback

  if (lowerIndex === upperIndex) return lower

  const amount = clamped - lowerIndex
  const mix = (start: number, end: number): number => (
    start + (end - start) * amount
  )

  return Object.freeze({
    x: mix(lower.x, upper.x),
    y: mix(lower.y, upper.y),
    width: mix(lower.width, upper.width),
    height: mix(lower.height, upper.height),
    opacity: mix(lower.opacity, upper.opacity),
    scale: mix(lower.scale, upper.scale),
    saturation: mix(lower.saturation, upper.saturation),
  })
}

export function resolveMagazineCircularOffset(
  projectIndex: number,
  activeIndex: number,
  projectCount: number,
): number {
  if (
    !Number.isSafeInteger(projectIndex)
    || !Number.isSafeInteger(activeIndex)
    || !Number.isSafeInteger(projectCount)
    || projectCount <= 0
    || projectIndex < 0
    || projectIndex >= projectCount
    || activeIndex < 0
    || activeIndex >= projectCount
  ) {
    return 4
  }

  let offset = (projectIndex - activeIndex + projectCount) % projectCount
  const positiveCapacity = Math.ceil(projectCount / 2)

  if (offset > positiveCapacity) {
    offset -= projectCount
  }

  return offset
}

export function resolveMagazinePresentation(
  projectIndex: number,
  activeIndex: number,
  projectCount: number,
  trackProgress: number,
): MagazinePresentation {
  const finiteProgress = Number.isFinite(trackProgress)
    ? Math.max(-1, Math.min(1, trackProgress))
    : 0
  const continuousOffset = resolveMagazineCircularOffset(
    projectIndex,
    activeIndex,
    projectCount,
  ) - finiteProgress
  const focusStrength = Math.max(0, 1 - Math.abs(continuousOffset))

  return Object.freeze({
    desktop: interpolateSlot(
      DESKTOP_MAGAZINE_SLOTS,
      DESKTOP_FALLBACK_SLOT,
      continuousOffset,
    ),
    mobile: interpolateSlot(
      MOBILE_MAGAZINE_SLOTS,
      MOBILE_FALLBACK_SLOT,
      continuousOffset,
    ),
    focusStrength,
    compactStrength: 1 - focusStrength,
    zIndex: Math.round(10 + focusStrength * 70),
    continuousOffset,
  })
}

export function resolveMagazineTextPresentation(
  continuousOffset: number,
  focusStrength: number,
): MagazineTextPresentation {
  const focus = Number.isFinite(focusStrength)
    ? Math.max(0, Math.min(1, focusStrength))
    : 0
  const offset = Number.isFinite(continuousOffset)
    ? continuousOffset
    : 0
  const opacity = focus * focus * (3 - 2 * focus)
  const unfocused = 1 - opacity

  return Object.freeze({
    opacity,
    shiftRem: Math.sign(offset) * unfocused * 0.5,
    liftRem: unfocused * 0.12,
    blurPx: unfocused * 2.5,
    scale: 0.995 + opacity * 0.005,
  })
}

