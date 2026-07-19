<script setup lang="ts">
import type {
  ProjectCreditGroupView,
} from '~~/shared/view/portfolio-project-view'

interface Props {
  readonly groups: readonly ProjectCreditGroupView[]
}

defineProps<Props>()
</script>

<template>
  <section
    v-if="groups.length > 0"
    class="mm-work-section mm-work-credits"
    data-mm-work-credits
  >
    <h2 class="mm-work-section__title">
      크레딧
    </h2>

    <ul class="mm-work-credits__groups">
      <li
        v-for="group in groups"
        :key="group.id"
        class="mm-work-credits__group"
      >
        <h3 class="mm-work-credits__group-title">
          {{ group.label }}
        </h3>

        <ul class="mm-work-credits__entries">
          <li
            v-for="entry in group.entries"
            :key="`${group.id}:${entry.role}:${entry.name}`"
            class="mm-work-credits__entry"
          >
            <span class="mm-work-credits__role">{{ entry.role }}</span>
            <a
              v-if="entry.href !== null"
              class="mm-work-credits__name"
              :href="entry.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${entry.name}, 새 창에서 열기`"
            >
              {{ entry.name }}
            </a>
            <span
              v-else
              class="mm-work-credits__name"
            >
              {{ entry.name }}
            </span>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>
