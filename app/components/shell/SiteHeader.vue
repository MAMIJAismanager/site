<script setup lang="ts">
import SiteNavList from '~/components/shell/SiteNavList.vue'

import {
  useBrandEntryArbitrator,
} from '~/composables/useBrandEntryArbitrator'

const route = useRoute()

const {
  pendingSingleClick: brandClickPending,
  onPointerDown: onBrandPointerDown,
  onPointerMove: onBrandPointerMove,
  onPointerUp: onBrandPointerUp,
  onClick: onBrandClick,
} = useBrandEntryArbitrator()

const headerRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLButtonElement | null>(null)
const isMenuOpen = ref(false)

function closeMenu(): void {
  isMenuOpen.value = false
}

async function openMenu(): Promise<void> {
  isMenuOpen.value = true

  await nextTick()

  headerRef.value
    ?.querySelector<HTMLAnchorElement>('.mm-site-navigation__link')
    ?.focus()
}

function toggleMenu(): void {
  if (isMenuOpen.value) {
    closeMenu()
    return
  }

  void openMenu()
}

async function closeMenuAndRestoreFocus(): Promise<void> {
  closeMenu()
  await nextTick()
  menuButtonRef.value?.focus()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !isMenuOpen.value) {
    return
  }

  event.preventDefault()
  void closeMenuAndRestoreFocus()
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  },
)
</script>

<template>
  <header
    ref="headerRef"
    class="mm-site-header"
    :data-menu-open="isMenuOpen"
    data-mm-site-header
    @keydown="handleKeydown"
  >
    <div class="mm-shell-frame mm-site-header__inner">
      <a
        class="mm-site-header__brand"
        href="/"
        aria-label="매미: 著 홈. 데스크톱 더블클릭 시 숨은 작업실 진입"
        :data-mm-brand-click-pending="brandClickPending ? 'true' : 'false'"
        data-mm-brand-hidden-entry
        @pointerdown="onBrandPointerDown"
        @pointermove="onBrandPointerMove"
        @pointerup="onBrandPointerUp"
        @pointercancel="onBrandPointerUp"
        @click="onBrandClick"
      >
        매미: 著
      </a>

      <button
        ref="menuButtonRef"
        class="mm-site-header__menu-button"
        type="button"
        aria-controls="mm-primary-navigation"
        :aria-expanded="isMenuOpen"
        :aria-label="isMenuOpen ? '사이트 메뉴 닫기' : '사이트 메뉴 열기'"
        @click="toggleMenu"
      >
        <span aria-hidden="true">
          {{ isMenuOpen ? '닫기' : '메뉴' }}
        </span>
      </button>

      <div
        id="mm-primary-navigation"
        class="mm-site-header__navigation"
      >
        <SiteNavList
          label="주요 메뉴"
          @navigate="closeMenu"
        />
      </div>
    </div>
  </header>
</template>
