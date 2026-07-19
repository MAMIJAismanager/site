<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

import { provideCrossMediaArbitration } from '~/composables/useCrossMediaArbitration'
import { createCrossMediaArbitrationAuthority } from '~/utils/cross-media-arbitration'

const authority = createCrossMediaArbitrationAuthority()
provideCrossMediaArbitration(authority)

onBeforeUnmount(() => {
  authority.dispose()
})
</script>

<template>
  <slot />
</template>
