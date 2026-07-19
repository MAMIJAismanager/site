<script setup lang="ts">
import SiteNavList from '~/components/shell/SiteNavList.vue'
</script>

<template>
  <footer
    class="mm-site-footer"
    data-mm-site-footer
  >
    <div class="mm-shell-frame mm-site-footer__inner">
      <NuxtLink
        class="mm-site-footer__brand"
        to="/"
      >
        매미: 著
      </NuxtLink>

      <SiteNavList label="하단 메뉴" />

      <a
        class="mm-site-footer__top-link"
        href="#mm-app"
      >
        맨 위로
      </a>
    </div>
  </footer>
</template>
