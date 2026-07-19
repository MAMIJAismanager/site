<script setup lang="ts">
import { computed, ref, resolveComponent, watch } from 'vue'

import {
  layoutGatewayTitle,
  layoutGatewayTitleFromExplicitLines,
} from '~/utils/layout-gateway-title'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  HomeGatewayShowcaseView,
} from '~/types/home-gateway'

interface Props {
  readonly current: HomeGatewayShowcaseView
  readonly incoming?: HomeGatewayShowcaseView | null
  readonly progress?: number
  readonly previewOnly?: boolean
  readonly entryEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  incoming: null,
  progress: 0,
  previewOnly: false,
  entryEnabled: false,
})

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()

const nuxtLinkComponent = resolveComponent('NuxtLink')
const VIDEO_PRODUCTION_CATEGORY_ID = 'video-production' as const

function resolveGatewayTitleLayout(
  project: HomeGatewayShowcaseView,
  maxGraphemesPerLine: number,
): ReturnType<typeof layoutGatewayTitle> {
  if (project.gatewayCategoryId === VIDEO_PRODUCTION_CATEGORY_ID) {
    return layoutGatewayTitleFromExplicitLines(
      project.title,
      project.gatewayTitleLines,
      { maxGraphemesPerLine },
    )
  }

  return layoutGatewayTitle(project.title, {
    maxGraphemesPerLine,
  })
}

interface CopyLayer {
  readonly role: 'current' | 'incoming'
  readonly project: HomeGatewayShowcaseView
  readonly desktopTitleLayout: ReturnType<typeof layoutGatewayTitle>
  readonly mobileTitleLayout: ReturnType<typeof layoutGatewayTitle>
  readonly style: Readonly<Record<string, string>>
  readonly ariaHidden: boolean
  readonly delayedReveal: boolean
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const distance = edge1 - edge0
  if (distance <= 0) return value >= edge1 ? 1 : 0

  const amount = clampUnit((value - edge0) / distance)
  return amount * amount * (3 - 2 * amount)
}

const normalizedProgress = computed(() => clampUnit(Math.abs(props.progress)))
const delayedRevealProjectId = ref<string | null>(null)

watch(
  () => props.current.id,
  (nextProjectId, previousProjectId) => {
    if (
      previousProjectId !== undefined
      && nextProjectId !== previousProjectId
    ) {
      delayedRevealProjectId.value = nextProjectId
    }
  },
  { flush: 'sync' },
)

const copyLayers = computed<readonly CopyLayer[]>(() => {
  const progress = normalizedProgress.value
  const outgoingAmount = smoothstep(0.52, 0.94, progress)

  const layers: CopyLayer[] = [
    {
      role: 'current',
      project: props.current,
      desktopTitleLayout: resolveGatewayTitleLayout(props.current, 8),
      mobileTitleLayout: resolveGatewayTitleLayout(props.current, 6),
      ariaHidden: false,
      delayedReveal: (
        delayedRevealProjectId.value === props.current.id
        && progress === 0
      ),
      style: Object.freeze({
        '--mm-copy-opacity': (1 - outgoingAmount).toFixed(4),
        '--mm-copy-translate-y': `${(-0.25 * outgoingAmount).toFixed(4)}rem`,
        '--mm-copy-blur': `${(1.5 * outgoingAmount).toFixed(4)}px`,
      }),
    },
  ]

  if (props.incoming !== null) {
    layers.push({
      role: 'incoming',
      project: props.incoming,
      desktopTitleLayout: resolveGatewayTitleLayout(props.incoming, 8),
      mobileTitleLayout: resolveGatewayTitleLayout(props.incoming, 6),
      ariaHidden: true,
      delayedReveal: false,
      style: Object.freeze({
        '--mm-copy-opacity': '0',
        '--mm-copy-translate-y': '0.5rem',
        '--mm-copy-blur': '3px',
      }),
    })
  }

  return Object.freeze(layers)
})

function isEntryEnabled(layer: CopyLayer): boolean {
  return (
    !props.previewOnly
    && props.entryEnabled
    && layer.role === 'current'
    && !layer.delayedReveal
  )
}

function onCopyRevealAnimationEnd(event: AnimationEvent): void {
  if (
    event.target !== event.currentTarget
    || event.animationName !== 'mm-showcase-copy-focus-reveal'
  ) {
    return
  }

  delayedRevealProjectId.value = null
}

function onCopyEntryActivate(
  event: MouseEvent,
  layer: CopyLayer,
): void {
  if (!isEntryEnabled(layer)) {
    event.preventDefault()
    return
  }

  emit('detailActivate', {
    event,
    projectId: layer.project.id,
    href: layer.project.href,
  })
}
</script>

<template>
  <section
    class="mm-showcase-copy-stage"
    data-mm-ui15-copy-stage
    data-mm-ui16-copy-stage
    data-mm-ui17-copy-stage
    data-mm-ui19-copy-stage
    data-mm-ui20-copy-stage
    data-mm-ui21-copy-stage
    aria-live="polite"
  >
    <article
      v-for="layer in copyLayers"
      :key="`${layer.role}:${layer.project.id}`"
      class="mm-showcase-copy-stage__layer"
      :class="[
        `mm-showcase-copy-stage__layer--${layer.role}`,
        {
          'mm-showcase-copy-stage__layer--delayed-reveal':
            layer.delayedReveal,
        },
      ]"
      :style="layer.style"
      :aria-hidden="layer.ariaHidden ? 'true' : 'false'"
      :data-mm-copy-layer-role="layer.role"
      :data-mm-copy-project-id="layer.project.id"
      :data-mm-copy-delayed-reveal="layer.delayedReveal ? 'true' : 'false'"
      @animationend="onCopyRevealAnimationEnd"
    >
      <component
        :is="previewOnly ? 'div' : nuxtLinkComponent"
        class="mm-showcase-copy-stage__body mm-showcase-copy-stage__entry"
        data-mm-ui20-copy-body
        data-mm-ui21-copy-entry
        :data-mm-ui21-entry-enabled="isEntryEnabled(layer) ? 'true' : 'false'"
        :data-mm-ui21-project-id="layer.project.id"
        :data-mm-ui21-entry-href="layer.project.href"
        :to="previewOnly ? undefined : layer.project.href"
        :tabindex="isEntryEnabled(layer) ? 0 : -1"
        :aria-label="previewOnly ? undefined : `${layer.project.title} 카테고리 작업 보기`"
        :aria-disabled="!previewOnly && !isEntryEnabled(layer) ? 'true' : undefined"
        :draggable="false"
        @click.capture="onCopyEntryActivate($event, layer)"
        @dragstart.prevent
      >
        <div
          class="mm-showcase-copy-stage__eyebrow"
          data-mm-ui17-category-eyebrow
        >
          <span
            v-if="layer.project.displayMeta.metaLine"
            data-mm-ui17-category-code
          >
            {{ layer.project.displayMeta.metaLine }}
          </span>
        </div>

        <h2
          class="mm-showcase-copy-stage__title"
          :aria-label="layer.project.title"
        >
          <span
            class="mm-showcase-copy-stage__title-layout mm-showcase-copy-stage__title-layout--desktop"
            aria-hidden="true"
            data-mm-ui15-title-layout="desktop"
          >
            <span
              v-for="(line, lineIndex) in layer.desktopTitleLayout.lines"
              :key="`${layer.project.id}-ui15-desktop-${lineIndex}`"
              class="mm-showcase-copy-stage__title-line"
              data-mm-ui19-title-line
              :data-mm-ui15-title-count="line.countedGraphemeCount"
            >
              <template
                v-for="(token, tokenIndex) in line.tokens"
                :key="`${layer.project.id}-ui15-desktop-${lineIndex}-${tokenIndex}`"
              >
                <span
                  v-if="token.kind === 'parenthetical'"
                  class="mm-showcase-copy-stage__title-parenthetical"
                  data-mm-ui17-parenthetical-token
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'symbol'"
                  class="mm-showcase-copy-stage__title-symbol"
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'space'"
                  class="mm-showcase-copy-stage__title-space"
                >{{ token.value }}</span>
                <span
                  v-else
                  class="mm-showcase-copy-stage__title-text"
                >{{ token.value }}</span>
              </template>
            </span>
          </span>

          <span
            class="mm-showcase-copy-stage__title-layout mm-showcase-copy-stage__title-layout--mobile"
            aria-hidden="true"
            data-mm-ui15-title-layout="mobile"
          >
            <span
              v-for="(line, lineIndex) in layer.mobileTitleLayout.lines"
              :key="`${layer.project.id}-ui15-mobile-${lineIndex}`"
              class="mm-showcase-copy-stage__title-line"
              data-mm-ui19-title-line
              :data-mm-ui15-title-count="line.countedGraphemeCount"
            >
              <template
                v-for="(token, tokenIndex) in line.tokens"
                :key="`${layer.project.id}-ui15-mobile-${lineIndex}-${tokenIndex}`"
              >
                <span
                  v-if="token.kind === 'parenthetical'"
                  class="mm-showcase-copy-stage__title-parenthetical"
                  data-mm-ui17-parenthetical-token
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'symbol'"
                  class="mm-showcase-copy-stage__title-symbol"
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'space'"
                  class="mm-showcase-copy-stage__title-space"
                >{{ token.value }}</span>
                <span
                  v-else
                  class="mm-showcase-copy-stage__title-text"
                >{{ token.value }}</span>
              </template>
            </span>
          </span>
        </h2>

        <p class="mm-showcase-copy-stage__summary" data-mm-ui20-summary>
          {{ layer.project.summary }}
        </p>
      </component>
    </article>
  </section>
</template>
