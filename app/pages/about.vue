<script setup lang="ts">
definePageMeta({
  hideSiteFooter: true,
  viewportComposition: 'info',
})

import InfoPageSurface from '~/components/info/InfoPageSurface.vue'
import { SITE_INFORMATION } from '~/content/site-information'

const about = SITE_INFORMATION.about
</script>

<template>
  <InfoPageSurface
    page="about"
    :eyebrow="about.eyebrow"
    :title="about.title"
    :lead="about.lead"
  >
    <section
      class="mm-info-section"
      data-mm-about-scope
    >
      <h2 class="mm-info-section__title">
        {{ about.scopeHeading }}
      </h2>
      <ul class="mm-info-scope-list">
        <li
          v-for="item in about.scopeItems"
          :key="item.token"
          class="mm-info-scope-list__item"
          :data-mm-about-scope-token="item.token"
        >
          {{ item.label }}
        </li>
      </ul>
    </section>

    <section
      class="mm-info-section"
      data-mm-about-method
    >
      <h2 class="mm-info-section__title">
        {{ about.methodHeading }}
      </h2>
      <p class="mm-info-section__body">
        {{ about.methodBody }}
      </p>
    </section>

    <nav
      class="mm-info-actions"
      aria-label="소개 페이지 이동"
      data-mm-info-actions
    >
      <NuxtLink
        class="mm-info-action mm-info-action--primary"
        to="/works"
      >
        {{ about.worksLinkLabel }}
      </NuxtLink>
      <NuxtLink
        class="mm-info-action mm-info-action--secondary"
        to="/contact"
      >
        {{ about.contactLinkLabel }}
      </NuxtLink>
    </nav>
  </InfoPageSurface>
</template>
