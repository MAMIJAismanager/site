<script setup lang="ts">
import type {
  ProjectExternalLinkView,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly links: readonly ProjectExternalLinkView[]
}

defineProps<Props>()
</script>

<template>
  <section
    v-if="links.length > 0"
    class="mm-work-section mm-work-external-links"
    data-mm-work-external-links
  >
    <h2 class="mm-work-section__title">
      외부 링크
    </h2>

    <ul class="mm-work-external-links__list">
      <li
        v-for="link in links"
        :key="`${link.kind}:${link.href}`"
      >
        <a
          class="mm-work-external-links__link"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${link.kindLabel}, ${link.label}, 새 창에서 열기`"
        >
          <span class="mm-work-external-links__kind">
            {{ link.kindLabel }}
          </span>
          <span class="mm-work-external-links__label">
            {{ link.label }}
          </span>
          <span class="mm-work-external-links__indicator">
            새 창
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>
