import type {
  PublicPortfolioGatewayCategoryId,
} from '../types/portfolio-gateway-category'

export interface PreviewIconOpticalLayout {
  /** Horizontal shift as a fraction of the preview icon box. */
  readonly offsetX: number
  /** Vertical shift as a fraction of the preview icon box. */
  readonly offsetY: number
  /** Uniform scale. Non-uniform vector deformation is forbidden. */
  readonly scale: number
}

/**
 * MMJ-UI23 / MMJ-UI23-R1
 *
 * Small-card optical calibration only. These values compensate for the
 * difference between each SVG viewBox centre and its perceived visual mass.
 * The rail multiplies them by compactStrength, so the correction resolves to
 * translate(0, 0) scale(1) on the settled focus card.
 */
export const CATEGORY_PREVIEW_ICON_OPTICAL_LAYOUT_BY_ID = Object.freeze({
  choreography: Object.freeze({
    offsetX: -0.04,
    offsetY: 0.03,
    scale: 1,
  }),
  'lyrics-composition': Object.freeze({
    offsetX: -0.01,
    offsetY: 0.03,
    scale: 1.06,
  }),
  'costume-design-production': Object.freeze({
    offsetX: 0.05,
    offsetY: 0,
    scale: 1.08,
  }),
  'video-production': Object.freeze({
    offsetX: 0.06,
    offsetY: 0.07,
    scale: 1,
  }),
  'project-planning': Object.freeze({
    offsetX: 0.05,
    offsetY: -0.03,
    scale: 0.94,
  }),
  'audio-mixing-mastering': Object.freeze({
    offsetX: 0.05,
    offsetY: 0.06,
    scale: 0.96,
  }),
} satisfies Readonly<Record<
  PublicPortfolioGatewayCategoryId,
  Readonly<PreviewIconOpticalLayout>
>>)

const NO_PREVIEW_ICON_OPTICAL_LAYOUT = Object.freeze({
  offsetX: 0,
  offsetY: 0,
  scale: 1,
}) satisfies Readonly<PreviewIconOpticalLayout>

export function resolvePreviewIconOpticalLayout(
  id: string,
): Readonly<PreviewIconOpticalLayout> {
  return CATEGORY_PREVIEW_ICON_OPTICAL_LAYOUT_BY_ID[
    id as PublicPortfolioGatewayCategoryId
  ] ?? NO_PREVIEW_ICON_OPTICAL_LAYOUT
}
