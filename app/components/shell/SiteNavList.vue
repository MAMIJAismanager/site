<script setup lang="ts">
import { SITE_NAVIGATION_ITEMS } from '~/constants/site-navigation'

defineProps<{
  label: string
}>()

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()

function isCurrentRoute(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav
    class="mm-site-navigation"
    :aria-label="label"
  >
    <ul class="mm-site-navigation__list">
      <li
        v-for="item in SITE_NAVIGATION_ITEMS"
        :key="item.id"
        class="mm-site-navigation__item"
      >
        <NuxtLink
          class="mm-site-navigation__link"
          :to="item.to"
          :aria-current="isCurrentRoute(item.to) ? 'page' : undefined"
          @click="emit('navigate')"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
