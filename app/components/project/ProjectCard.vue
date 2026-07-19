<script setup lang="ts">
import {
  isEligibleSameTabDetailActivation,
} from '~/utils/navigation-restoration'

import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import ProjectCardMedia from './ProjectCardMedia.vue'
import ProjectCardMetadata from './ProjectCardMetadata.vue'

interface ProjectCardProps {
  readonly project: ProjectCardView
  readonly index: number
}

type NuxtNavigate = (event?: MouseEvent) => Promise<unknown>

const props = defineProps<ProjectCardProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()

function onDetailActivate(event: MouseEvent): void {
  emit('detailActivate', {
    event,
    projectId: props.project.id,
    href: props.project.href,
  })
}

function onControlledNuxtFallback(
  event: MouseEvent,
  navigate: NuxtNavigate,
): void {
  if (!isEligibleSameTabDetailActivation(event)) return
  void navigate(event)
}
</script>

<template>
  <article
    class="mm-project-card"
    data-mm-project-card
  >
    <NuxtLink
      v-slot="{ href, navigate }"
      :to="project.href"
      custom
    >
      <a
        class="mm-project-card__link mm-dark-surface"
        :href="href"
        data-mm-project-card-link
        :data-mm-project-id="project.id"
        :data-mm-project-slug="project.slug"
        @click.capture="onDetailActivate"
        @click="onControlledNuxtFallback($event, navigate)"
      >
        <ProjectCardMedia
          :cover="project.cover"
          :index="index"
        />
        <ProjectCardMetadata :project="project" />
      </a>
    </NuxtLink>
  </article>
</template>
