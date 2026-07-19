export interface GoogleFormReadyState {
  readonly status: 'ready'
  readonly href: string
  readonly externalHost: 'docs.google.com' | 'forms.gle'
}

export interface GoogleFormUnavailableState {
  readonly status: 'unavailable'
  readonly href: null
}

export type GoogleFormOutboundState =
  | GoogleFormReadyState
  | GoogleFormUnavailableState

const INVALID_MARKER = 'FAIL_MMJ_02G_INVALID_GOOGLE_FORM_URL'

function invalidGoogleFormUrl(value: string): never {
  throw new Error(`${INVALID_MARKER}: ${JSON.stringify(value)}`)
}

export function resolveGoogleFormOutbound(
  value: string | null,
): GoogleFormOutboundState {
  if (value === null) {
    return Object.freeze({
      status: 'unavailable',
      href: null,
    })
  }

  if (
    value.length === 0
    || value !== value.trim()
  ) {
    return invalidGoogleFormUrl(value)
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return invalidGoogleFormUrl(value)
  }

  if (
    parsed.protocol !== 'https:'
    || parsed.username !== ''
    || parsed.password !== ''
    || parsed.port !== ''
  ) {
    return invalidGoogleFormUrl(value)
  }

  if (
    parsed.hostname === 'docs.google.com'
    && parsed.pathname.startsWith('/forms/')
  ) {
    return Object.freeze({
      status: 'ready',
      href: value,
      externalHost: 'docs.google.com',
    })
  }

  if (
    parsed.hostname === 'forms.gle'
    && parsed.pathname !== '/'
  ) {
    return Object.freeze({
      status: 'ready',
      href: value,
      externalHost: 'forms.gle',
    })
  }

  return invalidGoogleFormUrl(value)
}
