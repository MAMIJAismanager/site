import { defineStore } from 'pinia'
import {
  consumeNavigationMemoryForRoute,
  createInitialNavigationMemoryStoreState,
  reduceNavigationMemoryStoreState,
} from '../utils/navigation-memory-state'
import type {
  NavigationMemoryEntry,
  NavigationMemoryStoreState,
  NavigationRouteKey,
} from '../../shared/types/navigation-memory'

export const useNavigationMemoryStore = defineStore('navigation-memory', {
  state: (): NavigationMemoryStoreState =>
    createInitialNavigationMemoryStoreState(),

  getters: {
    hasEntry: state => state.entry !== null,
    routeKey: state => state.entry?.routeKey ?? null,
    activeProjectId: state => state.entry?.activeProjectId ?? null,
  },

  actions: {
    capture(entry: NavigationMemoryEntry): boolean {
      const previous = this.$state
      const next = reduceNavigationMemoryStoreState(previous, {
        kind: 'capture',
        entry,
      })
      if (next === previous) return false
      this.$state = next
      return true
    },

    clear(): boolean {
      const previous = this.$state
      const next = reduceNavigationMemoryStoreState(previous, {
        kind: 'clear',
      })
      if (next === previous) return false
      this.$state = next
      return true
    },

    consumeForRoute(currentRouteKey: NavigationRouteKey): NavigationMemoryEntry | null {
      const previous = this.$state
      const result = consumeNavigationMemoryForRoute(previous, currentRouteKey)
      if (result.state !== previous) this.$state = result.state
      return result.entry
    },
  },
})
