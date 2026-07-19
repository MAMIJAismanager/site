<script setup lang="ts">
interface Props {
  readonly page: 'about' | 'contact'
  readonly eyebrow: string
  readonly title: string
  readonly lead: string
}

defineProps<Props>()
</script>

<template>
  <article
    class="mm-page mm-info-page"
    data-mm-info-page
    :data-mm-page="page"
  >
    <header class="mm-page__header mm-info-page__header">
      <p class="mm-label">
        {{ eyebrow }}
      </p>
      <h1 class="mm-page-title">
        {{ title }}
      </h1>
      <p class="mm-page__lead">
        {{ lead }}
      </p>
    </header>

    <div class="mm-info-page__body">
      <slot />
    </div>
  </article>
</template>

<style src="~/assets/css/info-surfaces.css"></style>
