<script setup lang="ts">
import MediaFrame from '~/components/media/MediaFrame.vue'
import {
  MM_RELATED_PROJECT_IMAGE_SIZES,
  resolvePortfolioImagePresentation,
} from '~/data/portfolio-media-presentation'

import type {
  RelatedProjectView,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly projects: readonly RelatedProjectView[]
}

defineProps<Props>()

function relatedImagePlan(project: RelatedProjectView) {
  return resolvePortfolioImagePresentation(
    project.cover,
    'thumbnail',
    {
      sizes: MM_RELATED_PROJECT_IMAGE_SIZES,
      accessibility: { mode: 'decorative' },
      loading: 'lazy',
      fetchPriority: 'low',
      fit: 'cover',
    },
  )
}
</script>

<template>
  <section
    v-if="projects.length > 0"
    class="mm-work-section mm-work-related"
    data-mm-work-related
  >
    <h2 class="mm-work-section__title">
      관련 작업
    </h2>

    <ul class="mm-work-related__list">
      <li
        v-for="project in projects"
        :key="project.id"
        class="mm-work-related__item"
      >
        <article class="mm-work-related__card">
          <NuxtLink
            class="mm-work-related__link"
            :to="project.href"
            :data-mm-related-project-id="project.id"
            :data-mm-related-project-slug="project.slug"
          >
            <MediaFrame
              class="mm-work-related__media mm-dark-surface"
              :image-plan="relatedImagePlan(project)"
              :frame-ratio="{ width: 4, height: 3 }"
              state-label=""
            />

            <div class="mm-work-related__content">
              <p class="mm-work-related__category">
                {{ project.category.label }}
              </p>
              <h3 class="mm-work-related__title">
                {{ project.title }}
              </h3>
              <p
                v-if="project.displayMeta.metaLine !== null"
                class="mm-work-related__meta"
              >
                {{ project.displayMeta.metaLine }}
              </p>
              <ul
                class="mm-work-related__roles"
                aria-label="담당 역할"
              >
                <li
                  v-for="role in project.roles"
                  :key="role.token"
                >
                  {{ role.label }}
                </li>
              </ul>
            </div>
          </NuxtLink>
        </article>
      </li>
    </ul>
  </section>
</template>
