<script setup lang="ts">
import type {
  GoogleFormOutboundState,
} from '~/utils/google-form-url'

interface Props {
  readonly state: GoogleFormOutboundState
  readonly linkLabel: string
  readonly unavailableMessage: string
}

defineProps<Props>()
</script>

<template>
  <div
    class="mm-contact-outbound"
    data-mm-contact-outbound
    :data-mm-contact-outbound-state="state.status"
  >
    <a
      v-if="state.status === 'ready'"
      class="mm-info-action mm-info-action--primary"
      :href="state.href"
      target="_blank"
      rel="noopener noreferrer"
      data-mm-google-form-link
    >
      <span>{{ linkLabel }}</span>
      <span aria-hidden="true">↗</span>
      <span class="mm-visually-hidden">새 창</span>
    </a>

    <p
      v-else
      class="mm-contact-outbound__unavailable"
      role="status"
      data-mm-google-form-unavailable
    >
      {{ unavailableMessage }}
    </p>
  </div>
</template>
