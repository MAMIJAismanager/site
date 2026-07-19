<script setup lang="ts">
import {
  findWorkDetailViewBySlug,
} from '~/data/portfolio-project-views'

import WorkAssetFrame from '~/components/work/WorkAssetFrame.vue'
import WorkCredits from '~/components/work/WorkCredits.vue'
import WorkDetailHeader from '~/components/work/WorkDetailHeader.vue'
import WorkExternalLinks from '~/components/work/WorkExternalLinks.vue'
import WorkGallery from '~/components/work/WorkGallery.vue'
import WorkRelatedProjects from '~/components/work/WorkRelatedProjects.vue'

import {
  useWorkReturnTarget,
} from '~/composables/useWorkReturnTarget'

const route = useRoute()
const requestedSlug = route.params.slug

if (
  typeof requestedSlug !== 'string'
  || requestedSlug.length === 0
) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Work not found',
  })
}

const project = findWorkDetailViewBySlug(requestedSlug)

if (project === null) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Work not found',
  })
}

const returnTarget = useWorkReturnTarget(project.id)
</script>

<template>
  <article
    class="mm-work-detail"
    data-mm-page="work-detail"
    :data-mm-work-slug="project.slug"
    :data-mm-work-id="project.id"
  >
    <WorkDetailHeader :project="project" />

    <section
      class="mm-work-detail__cover"
      data-mm-work-cover
      aria-label="대표 이미지"
    >
      <WorkAssetFrame
        :asset="project.assets.cover"
        context-label="대표 이미지"
      />
    </section>

    <section
      class="mm-work-section mm-work-description"
      data-mm-work-description
    >
      <h2 class="mm-work-section__title">
        프로젝트 소개
      </h2>
      <p class="mm-work-description__body">
        {{ project.description }}
      </p>
    </section>

    <section
      v-if="project.assets.primary !== null"
      class="mm-work-section mm-work-primary"
      data-mm-work-primary
    >
      <h2 class="mm-work-section__title">
        주요 미디어
      </h2>
      <WorkAssetFrame
        :asset="project.assets.primary"
        :project-id="project.id"
        context-label="주요 미디어"
        video-runtime="primary-detail"
        audio-runtime="primary-detail"
      />
    </section>

    <WorkGallery :assets="project.assets.gallery" />
    <WorkCredits :groups="project.credits" />
    <WorkExternalLinks :links="project.externalLinks" />
    <WorkRelatedProjects :projects="project.relatedProjects" />

    <footer class="mm-work-detail__footer">
      <NuxtLink
        class="mm-work-detail__all-works"
        :to="returnTarget.href"
        data-mm-work-return-link
        :data-mm-return-origin="returnTarget.origin"
        :data-mm-return-uses-memory="returnTarget.usesMemory ? 'true' : 'false'"
      >
        {{ returnTarget.label }}
      </NuxtLink>
    </footer>
  </article>
</template>

<style src="~/assets/css/work-detail.css"></style>
