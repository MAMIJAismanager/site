import { computed } from 'vue'

import {
  useClientNavigationMemoryStore,
} from '~/composables/useClientNavigationMemoryStore'

import {
  deriveWorkReturnTarget,
} from '~/utils/navigation-restoration'

import type { ProjectId } from '~~/shared/types/domain-identifiers'

export function useWorkReturnTarget(
  projectId: ProjectId,
) {
  const store = useClientNavigationMemoryStore()

  return computed(() => (
    deriveWorkReturnTarget(projectId, store.value?.entry ?? null)
  ))
}
