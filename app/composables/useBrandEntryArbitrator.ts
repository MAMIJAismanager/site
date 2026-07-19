import {
  onBeforeUnmount,
  ref,
} from 'vue'

import {
  useRouter,
} from '#imports'

import {
  grantHiddenCategoryCapability,
} from '~/composables/useHiddenCategoryCapability'

import {
  HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
} from '~~/shared/constants/portfolio-gateway-categories'

export const BRAND_DOUBLE_CLICK_WINDOW_MS = 280
const POINTER_MOVE_CANCEL_PX = 8

export function useBrandEntryArbitrator() {
  const router = useRouter()
  const pendingSingleClick = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let pointerStart: Readonly<{ x: number; y: number }> | null = null
  let pointerMoved = false
  let lastPointerType: string | null = null
  let pointerActivationSerial = 0
  let consumedPointerActivationSerial = 0

  function clearTimer(): void {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
    pendingSingleClick.value = false
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return
    pointerStart = { x: event.clientX, y: event.clientY }
    pointerMoved = false
    lastPointerType = event.pointerType
    pointerActivationSerial += 1
  }

  function onPointerMove(event: PointerEvent): void {
    if (pointerStart === null) return
    const distance = Math.hypot(
      event.clientX - pointerStart.x,
      event.clientY - pointerStart.y,
    )
    if (distance > POINTER_MOVE_CANCEL_PX) {
      pointerMoved = true
    }
  }

  function onPointerUp(): void {
    pointerStart = null
  }

  async function openHiddenCategory(): Promise<void> {
    clearTimer()
    grantHiddenCategoryCapability()
    await router.push({
      path: '/works',
      query: {
        category: HIDDEN_VOICE_SYNTHESIS_CATEGORY_ID,
      },
    })
  }

  function onClick(event: MouseEvent): void {
    event.preventDefault()

    if (pointerMoved) {
      clearTimer()
      return
    }

    const supportsDesktopGesture = (
      lastPointerType === 'mouse'
      && pointerActivationSerial > consumedPointerActivationSerial
    )

    consumedPointerActivationSerial = pointerActivationSerial

    if (
      supportsDesktopGesture
      && pendingSingleClick.value
    ) {
      void openHiddenCategory()
      return
    }

    clearTimer()
    pendingSingleClick.value = true
    timer = setTimeout(() => {
      timer = null
      pendingSingleClick.value = false
      void router.push('/')
    }, BRAND_DOUBLE_CLICK_WINDOW_MS)
  }

  onBeforeUnmount(clearTimer)

  return {
    pendingSingleClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClick,
  }
}
