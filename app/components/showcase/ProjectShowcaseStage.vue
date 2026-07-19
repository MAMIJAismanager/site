<script setup lang="ts">
import { computed } from 'vue'

import MediaFrame from '~/components/media/MediaFrame.vue'
import { layoutGatewayTitle } from '~/utils/layout-gateway-title'
import { tokenizeGatewayTitle } from '~/utils/tokenize-gateway-title'
import {
  MM_SHOWCASE_STAGE_IMAGE_SIZES,
  resolvePortfolioImagePresentation,
} from '~/data/portfolio-media-presentation'
import { resolveCategoryIconUrl } from '~/data/category-icon-assets'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ShowcaseProjectView,
} from '~~/shared/view/portfolio-project-view'

import type {
  HomeGatewayShowcaseView,
} from '~/types/home-gateway'

interface Props {
  readonly project: ShowcaseProjectView | HomeGatewayShowcaseView
  readonly tabId: string
  readonly panelId: string
  readonly ordinal: number
  readonly total: number
  readonly previewOnly?: boolean
  readonly interactive?: boolean
  readonly showNavigation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  previewOnly: false,
  interactive: true,
  showNavigation: false,
})

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
  previous: [event: MouseEvent]
  next: [event: MouseEvent]
}>()

function onDetailActivate(event: MouseEvent): void {
  emit('detailActivate', {
    event,
    projectId: props.project.id,
    href: props.project.href,
  })
}

const gatewayProject = computed<HomeGatewayShowcaseView | null>(() => (
  'gatewayCategoryId' in props.project
    ? props.project
    : null
))

const isGatewayProject = computed(() => gatewayProject.value !== null)
const gatewayIconAsset = computed(() => (
  gatewayProject.value?.gatewayIconAsset ?? null
))

const gatewayIconAssetUrl = computed(() => {
  const categoryId = gatewayProject.value?.gatewayCategoryId
  return categoryId
    ? resolveCategoryIconUrl(categoryId)
    : null
})

const gatewayDesktopTitleLayout = computed(() => (
  layoutGatewayTitle(props.project.title, {
    maxGraphemesPerLine: 8,
  })
))

const gatewayMobileTitleLayout = computed(() => (
  layoutGatewayTitle(props.project.title, {
    maxGraphemesPerLine: 6,
  })
))

const gatewayTitleLineTokens = computed(() => (
  tokenizeGatewayTitle(props.project.title)
))

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

const stageAsset = computed(() => props.project.backdrop ?? props.project.cover)
const imagePlan = computed(() => {
  if (isGatewayProject.value) return null

  return resolvePortfolioImagePresentation(
    stageAsset.value,
    'primary',
    {
      sizes: MM_SHOWCASE_STAGE_IMAGE_SIZES,
      accessibility: { mode: 'decorative' },
      loading: props.interactive ? 'eager' : 'lazy',
      fetchPriority: props.interactive ? 'high' : 'low',
      fit: 'cover',
    },
  )
})
</script>

<template>
  <article
    :id="panelId"
    class="mm-showcase-stage"
    role="tabpanel"
    :aria-labelledby="tabId"
    :aria-hidden="interactive ? 'false' : 'true'"
    :tabindex="interactive ? 0 : -1"
    :data-mm-showcase-stage-project-id="project.id"
    :data-mm-showcase-stage-active="interactive ? 'true' : 'false'"
    data-mm-showcase-stage
    :data-mm-gateway-stage="isGatewayProject ? 'true' : 'false'"
  >
    <MediaFrame
      class="mm-showcase-stage__media"
      :image-plan="imagePlan"
      :frame-ratio="{ width: 4, height: 5 }"
      state-label=""
      :data-mm-cover-asset-id="stageAsset.id"
    />

    <div class="mm-showcase-stage__shade" aria-hidden="true" />

    <div
      v-if="gatewayIconAssetUrl"
      class="mm-showcase-stage__gateway-icon-stage"
      aria-hidden="true"
      data-mm-ui22-category-icon-stage
      :data-mm-ui22-category-id="gatewayProject?.gatewayCategoryId"
      :data-mm-ui22-icon-asset="gatewayIconAsset"
      :data-mm-ui22-r2-icon-url="gatewayIconAssetUrl"
    >
      <img
        class="mm-showcase-stage__gateway-icon"
        :src="gatewayIconAssetUrl"
        alt=""
        aria-hidden="true"
        :draggable="false"
        :loading="interactive ? 'eager' : 'lazy'"
        :fetchpriority="interactive ? 'high' : 'low'"
        data-mm-ui22-category-icon
        data-mm-ui23-preview-optical-icon
      >
    </div>

    <div class="mm-showcase-stage__metadata">
      <div class="mm-showcase-stage__eyebrow">
        <span v-if="!isGatewayProject">
          {{ project.category.label }}
        </span>
        <span v-if="project.displayMeta.metaLine">
          {{ project.displayMeta.metaLine }}
        </span>
      </div>

      <h2
        class="mm-showcase-stage__title"
        :aria-label="isGatewayProject ? project.title : undefined"
        :data-mm-gateway-title-token-count="gatewayTitleLineTokens.length"
      >
        <template v-if="isGatewayProject">
          <span
            class="mm-showcase-stage__title-layout mm-showcase-stage__title-layout--desktop"
            aria-hidden="true"
            data-mm-gateway-title-layout="desktop"
          >
            <span
              v-for="(line, lineIndex) in gatewayDesktopTitleLayout.lines"
              :key="`${project.id}-desktop-title-${lineIndex}`"
              class="mm-showcase-stage__title-line"
              :data-mm-gateway-title-count="line.countedGraphemeCount"
            >
              <template
                v-for="(token, tokenIndex) in line.tokens"
                :key="`${project.id}-desktop-title-${lineIndex}-${tokenIndex}`"
              >
                <span
                  v-if="token.kind === 'parenthetical'"
                  class="mm-showcase-stage__title-parenthetical"
                  data-mm-gateway-title-parenthetical
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'symbol'"
                  class="mm-showcase-stage__title-symbol"
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'space'"
                  class="mm-showcase-stage__title-space"
                >{{ token.value }}</span>
                <span
                  v-else
                  class="mm-showcase-stage__title-text"
                >{{ token.value }}</span>
              </template>
            </span>
          </span>

          <span
            class="mm-showcase-stage__title-layout mm-showcase-stage__title-layout--mobile"
            aria-hidden="true"
            data-mm-gateway-title-layout="mobile"
          >
            <span
              v-for="(line, lineIndex) in gatewayMobileTitleLayout.lines"
              :key="`${project.id}-mobile-title-${lineIndex}`"
              class="mm-showcase-stage__title-line"
              :data-mm-gateway-title-count="line.countedGraphemeCount"
            >
              <template
                v-for="(token, tokenIndex) in line.tokens"
                :key="`${project.id}-mobile-title-${lineIndex}-${tokenIndex}`"
              >
                <span
                  v-if="token.kind === 'parenthetical'"
                  class="mm-showcase-stage__title-parenthetical"
                  data-mm-gateway-title-parenthetical
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'symbol'"
                  class="mm-showcase-stage__title-symbol"
                >{{ token.value }}</span>
                <span
                  v-else-if="token.kind === 'space'"
                  class="mm-showcase-stage__title-space"
                >{{ token.value }}</span>
                <span
                  v-else
                  class="mm-showcase-stage__title-text"
                >{{ token.value }}</span>
              </template>
            </span>
          </span>
        </template>
        <template v-else>{{ project.title }}</template>
      </h2>

      <ul
        v-if="!isGatewayProject"
        class="mm-showcase-stage__roles"
        aria-label="역할"
      >
        <li
          v-for="role in project.roles"
          :key="role.token"
        >
          {{ role.label }}
        </li>
      </ul>

      <p class="mm-showcase-stage__summary">
        {{ project.summary }}
      </p>

      <span
        v-if="previewOnly && !isGatewayProject"
        class="mm-showcase-stage__detail-link mm-showcase-stage__detail-link--preview"
      >
        레일 구조 확인용 목업
      </span>

      <NuxtLink
        v-else-if="!isGatewayProject"
        class="mm-showcase-stage__detail-link"
        :to="project.href"
        :tabindex="interactive ? 0 : -1"
        :data-mm-project-id="project.id"
        data-mm-showcase-detail-link
        @click.capture="onDetailActivate"
      >
        작업 자세히 보기
      </NuxtLink>

    </div>

    <Transition name="mm-showcase-controls">
      <nav
        v-if="showNavigation && interactive"
        class="mm-showcase-stage__controls"
        aria-label="대표 작업 이동"
        data-mm-showcase-arrow-controls
      >
        <button
          class="mm-showcase-stage__arrow mm-showcase-stage__arrow--previous"
          type="button"
          aria-label="이전 대표 작업"
          data-mm-showcase-arrow="previous"
          :draggable="false"
          @pointerdown.stop
          @dragstart.stop.prevent
          @click.stop="emit('previous', $event)"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          class="mm-showcase-stage__arrow mm-showcase-stage__arrow--next"
          type="button"
          aria-label="다음 대표 작업"
          data-mm-showcase-arrow="next"
          :draggable="false"
          @pointerdown.stop
          @dragstart.stop.prevent
          @click.stop="emit('next', $event)"
        >
          <span aria-hidden="true">›</span>
        </button>
      </nav>
    </Transition>

    <div
      class="mm-showcase-stage__profile"
      aria-hidden="true"
    >
      <span class="mm-showcase-stage__profile-index">
        {{ twoDigits(ordinal) }}
      </span>

      <span class="mm-showcase-stage__profile-title">
        {{ project.title }}
      </span>

      <span class="mm-showcase-stage__profile-meta">
        {{ project.displayMeta.metaLine ?? project.category.label }}
      </span>
    </div>

    <span
      class="mm-showcase-stage__counter"
      aria-hidden="true"
    >
      {{ twoDigits(ordinal) }} / {{ twoDigits(total) }}
    </span>
  </article>
</template>
