<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'home',
})

import ProjectShowcaseRail from '~/components/showcase/ProjectShowcaseRail.vue'

import {
  createHomeShowcasePreview,
} from '~/data/home-showcase-preview'
import {
  featuredShowcaseViews,
} from '~/data/portfolio-project-views'

const showcasePreviewProjects = createHomeShowcasePreview(
  featuredShowcaseViews,
)
</script>

<template>
  <section
    class="mm-page mm-home-page"
    data-mm-page="home"
  >
    <header class="mm-page__header">
      <p class="mm-label">
        Portfolio
      </p>

      <h1
        class="mm-display-title"
        data-mm-title-probe
      >
        매미: 著
      </h1>

      <p class="mm-page__lead">
        Choreography · Composition · Video Direction · Producing
      </p>
    </header>

    <ProjectShowcaseRail
      :projects="showcasePreviewProjects"
      preview-label="CATEGORY GATE · 6 ITEMS"
    />
  </section>
</template>

<style src="~/assets/css/home-page.css"></style>
