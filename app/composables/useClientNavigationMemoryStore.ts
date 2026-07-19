import {
  onMounted,
  readonly,
  shallowRef,
} from 'vue'

import type {
  NavigationMemoryEntry,
  NavigationRouteKey,
} from '~~/shared/types/navigation-memory'

export interface NavigationMemoryStorePort {
  readonly entry: NavigationMemoryEntry | null
  capture(entry: NavigationMemoryEntry): boolean
  clear(): boolean
  consumeForRoute(routeKey: NavigationRouteKey): NavigationMemoryEntry | null
}

export function useClientNavigationMemoryStore() {
  const store = shallowRef<NavigationMemoryStorePort | null>(null)

  onMounted(async () => {
    if (!import.meta.client) return
    const module = await import('~/stores/navigation-memory')
    store.value = module.useNavigationMemoryStore()
  })

  return readonly(store)
}
