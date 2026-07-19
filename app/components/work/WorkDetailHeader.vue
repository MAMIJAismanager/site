<script setup lang="ts">
import type {
  WorkDetailView,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly project: WorkDetailView
}

defineProps<Props>()
</script>

<template>
  <header
    class="mm-work-detail-header"
    data-mm-work-detail-header
  >
    <p class="mm-label mm-work-detail-header__eyebrow">
      Work · {{ project.category.label }}
    </p>

    <h1 class="mm-page-title mm-work-detail-header__title">
      {{ project.title }}
    </h1>

    <p
      v-if="project.displayMeta.metaLine !== null"
      class="mm-work-detail-header__meta"
      data-mm-work-meta-line
    >
      {{ project.displayMeta.metaLine }}
    </p>

    <ul
      class="mm-work-detail-header__roles"
      aria-label="담당 역할"
      data-mm-work-roles
    >
      <li
        v-for="role in project.roles"
        :key="role.token"
      >
        {{ role.label }}
      </li>
    </ul>

    <p class="mm-work-detail-header__summary">
      {{ project.summary }}
    </p>

    <ul
      v-if="project.tags.length > 0"
      class="mm-work-detail-header__tags"
      aria-label="태그"
      data-mm-work-tags
    >
      <li
        v-for="tag in project.tags"
        :key="tag.token"
      >
        {{ tag.label }}
      </li>
    </ul>

    <p
      v-if="project.displayMeta.timing.releaseDate !== null"
      class="mm-work-detail-header__release"
      data-mm-work-release-date
    >
      <span>발표일</span>
      <time :datetime="project.displayMeta.timing.releaseDate">
        {{ project.displayMeta.timing.releaseDate }}
      </time>
    </p>
  </header>
</template>
