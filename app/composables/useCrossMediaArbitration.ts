import {
  inject,
  provide,
} from 'vue'

import type {
  InjectionKey,
} from 'vue'
import type {
  CrossMediaArbitrationAuthority,
} from '~/types/cross-media-arbitration'

const crossMediaArbitrationKey: InjectionKey<CrossMediaArbitrationAuthority> = Symbol(
  'mm-cross-media-arbitration',
)

export function provideCrossMediaArbitration(
  authority: CrossMediaArbitrationAuthority,
): void {
  provide(crossMediaArbitrationKey, authority)
}

export function useCrossMediaArbitration(): CrossMediaArbitrationAuthority {
  const authority = inject(crossMediaArbitrationKey, null)
  if (authority === null) {
    throw new Error('cross-media-provider-missing')
  }
  return authority
}
