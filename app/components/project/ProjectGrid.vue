<script setup lang="ts">
import type {
  ProjectDetailActivationPayload,
} from '~/types/navigation-restoration'

import type {
  ProjectCardView,
} from '~~/shared/view/portfolio-project-view'

import ProjectCard from './ProjectCard.vue'

interface ProjectGridProps {
  readonly projects: readonly ProjectCardView[]
}

defineProps<ProjectGridProps>()

const emit = defineEmits<{
  detailActivate: [payload: ProjectDetailActivationPayload]
}>()
</script>

<template>
  <ul
    class="mm-project-grid"
    data-mm-project-list
    data-mm-project-grid
  >
    <li
      v-for="(project, index) in projects"
      :key="project.id"
      class="mm-project-grid__item"
      data-mm-project-grid-item
      :data-mm-project-slug="project.slug"
    >
      <ProjectCard
        :project="project"
        :index="index"
        @detail-activate="emit('detailActivate', $event)"
      />
    </li>
  </ul>
</template>
