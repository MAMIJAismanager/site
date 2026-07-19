export type GatewayTitleLayoutTokenKind =
  | 'text'
  | 'space'
  | 'symbol'
  | 'parenthetical'

export interface GatewayTitleLayoutToken {
  readonly kind: GatewayTitleLayoutTokenKind
  readonly value: string
  readonly graphemeCount: number
}

export interface GatewayTitleLine {
  readonly tokens: readonly GatewayTitleLayoutToken[]
  readonly countedGraphemeCount: number
  readonly plainText: string
}

export interface GatewayTitleLayout {
  readonly source: string
  readonly lines: readonly GatewayTitleLine[]
  readonly plainText: string
  readonly maxGraphemesPerLine: number
}

export interface GatewayTitleLayoutOptions {
  readonly locale?: string
  readonly maxGraphemesPerLine?: number
}

interface MutableGatewayTitleLayoutToken {
  kind: GatewayTitleLayoutTokenKind
  value: string
  graphemeCount: number
}

interface GatewayTitleGroup {
  readonly tokens: readonly GatewayTitleLayoutToken[]
  readonly countedGraphemeCount: number
}

const DEFAULT_LOCALE = 'ko-KR'
const DEFAULT_MAX_GRAPHEMES_PER_LINE = 8
const SYMBOLS = new Set([
  '&',
  '/',
  '·',
  '+',
  '×',
  '|',
  ':',
  ',',
  '.',
  '-',
])

function freezeToken(
  token: MutableGatewayTitleLayoutToken,
): GatewayTitleLayoutToken {
  return Object.freeze({ ...token })
}

function freezeTokens(
  tokens: readonly MutableGatewayTitleLayoutToken[],
): readonly GatewayTitleLayoutToken[] {
  return Object.freeze(tokens.map(freezeToken))
}

function segmentGraphemes(
  value: string,
  locale: string,
): readonly string[] {
  const segmenter = new Intl.Segmenter(locale, {
    granularity: 'grapheme',
  })

  return Object.freeze(
    Array.from(
      segmenter.segment(value),
      segment => segment.segment,
    ),
  )
}

export function countGatewayTitleGraphemes(
  value: string,
  locale = DEFAULT_LOCALE,
): number {
  return segmentGraphemes(value, locale).length
}

function hasBalancedNonNestedParentheses(
  value: string,
): boolean {
  let depth = 0

  for (const character of value) {
    if (character === '(') {
      depth += 1
      if (depth > 1) return false
      continue
    }

    if (character === ')') {
      depth -= 1
      if (depth < 0) return false
    }
  }

  return depth === 0 && !value.includes('()')
}

function pushNormalizedSpace(
  tokens: MutableGatewayTitleLayoutToken[],
): void {
  if (tokens.at(-1)?.kind === 'space') return

  tokens.push({
    kind: 'space',
    value: ' ',
    graphemeCount: 0,
  })
}

function pushTextBuffer(
  tokens: MutableGatewayTitleLayoutToken[],
  buffer: string[],
  locale: string,
): void {
  if (buffer.length === 0) return

  const value = buffer.join('')
  tokens.push({
    kind: 'text',
    value,
    graphemeCount: countGatewayTitleGraphemes(value, locale),
  })
  buffer.length = 0
}

export function tokenizeGatewayTitleLayout(
  title: string,
  locale = DEFAULT_LOCALE,
): readonly GatewayTitleLayoutToken[] {
  if (!hasBalancedNonNestedParentheses(title)) {
    return freezeTokens([{
      kind: 'text',
      value: title,
      graphemeCount: countGatewayTitleGraphemes(title, locale),
    }])
  }

  const tokens: MutableGatewayTitleLayoutToken[] = []
  const graphemes = segmentGraphemes(title, locale)
  const textBuffer: string[] = []

  for (let index = 0; index < graphemes.length;) {
    const grapheme = graphemes[index]
    if (grapheme === undefined) break

    if (grapheme === '(') {
      pushTextBuffer(tokens, textBuffer, locale)

      const parenthetical: string[] = [grapheme]
      index += 1

      while (
        index < graphemes.length
        && graphemes[index] !== ')'
      ) {
        const next = graphemes[index]
        if (next !== undefined) parenthetical.push(next)
        index += 1
      }

      const closing = graphemes[index]
      if (closing === ')') parenthetical.push(closing)
      index += 1

      tokens.push({
        kind: 'parenthetical',
        value: parenthetical.join(''),
        graphemeCount: 0,
      })
      continue
    }

    if (/\s/u.test(grapheme)) {
      pushTextBuffer(tokens, textBuffer, locale)
      pushNormalizedSpace(tokens)
      index += 1
      continue
    }

    if (SYMBOLS.has(grapheme)) {
      pushTextBuffer(tokens, textBuffer, locale)
      tokens.push({
        kind: 'symbol',
        value: grapheme,
        graphemeCount: 0,
      })
      index += 1
      continue
    }

    textBuffer.push(grapheme)
    index += 1
  }

  pushTextBuffer(tokens, textBuffer, locale)

  while (tokens.at(-1)?.kind === 'space') {
    tokens.pop()
  }

  if (tokens.length === 0) {
    return freezeTokens([{
      kind: 'text',
      value: title,
      graphemeCount: countGatewayTitleGraphemes(title, locale),
    }])
  }

  return freezeTokens(tokens)
}

function splitTextToken(
  token: GatewayTitleLayoutToken,
  maxGraphemesPerLine: number,
  locale: string,
): readonly GatewayTitleLayoutToken[] {
  if (
    token.kind !== 'text'
    || token.graphemeCount <= maxGraphemesPerLine
  ) {
    return Object.freeze([token])
  }

  const graphemes = segmentGraphemes(token.value, locale)
  const chunks: GatewayTitleLayoutToken[] = []

  for (
    let cursor = 0;
    cursor < graphemes.length;
    cursor += maxGraphemesPerLine
  ) {
    const value = graphemes
      .slice(cursor, cursor + maxGraphemesPerLine)
      .join('')

    chunks.push(freezeToken({
      kind: 'text',
      value,
      graphemeCount: countGatewayTitleGraphemes(value, locale),
    }))
  }

  return Object.freeze(chunks)
}

function buildGatewayTitleGroups(
  tokens: readonly GatewayTitleLayoutToken[],
  maxGraphemesPerLine: number,
  locale: string,
): readonly GatewayTitleGroup[] {
  const groups: GatewayTitleGroup[] = []
  let current: GatewayTitleLayoutToken[] = []
  let currentTextIndex = -1

  function flushCurrent(): void {
    if (currentTextIndex < 0) return

    const prefix = current.slice(0, currentTextIndex)
    const text = current[currentTextIndex]
    const suffix = current.slice(currentTextIndex + 1)
    if (text === undefined) return

    const chunks = splitTextToken(
      text,
      maxGraphemesPerLine,
      locale,
    )

    chunks.forEach((chunk, chunkIndex) => {
      const groupTokens = [
        ...(chunkIndex === 0 ? prefix : []),
        chunk,
        ...(chunkIndex === chunks.length - 1 ? suffix : []),
      ]

      groups.push(Object.freeze({
        tokens: Object.freeze(groupTokens),
        countedGraphemeCount: chunk.graphemeCount,
      }))
    })

    current = []
    currentTextIndex = -1
  }

  for (const token of tokens) {
    if (token.kind === 'text') {
      flushCurrent()
      current = [token]
      currentTextIndex = 0
      continue
    }

    current.push(token)
  }

  flushCurrent()

  return Object.freeze(groups)
}

function trimLeadingSpaces(
  tokens: readonly GatewayTitleLayoutToken[],
): readonly GatewayTitleLayoutToken[] {
  let start = 0

  while (tokens[start]?.kind === 'space') start += 1

  return Object.freeze(tokens.slice(start))
}

function trimLineTokens(
  tokens: readonly GatewayTitleLayoutToken[],
): readonly GatewayTitleLayoutToken[] {
  let start = 0
  let end = tokens.length

  while (tokens[start]?.kind === 'space') start += 1
  while (tokens[end - 1]?.kind === 'space') end -= 1

  return Object.freeze(tokens.slice(start, end))
}

function makeLine(
  tokens: readonly GatewayTitleLayoutToken[],
  countedGraphemeCount: number,
): GatewayTitleLine {
  const normalizedTokens = trimLineTokens(tokens)

  return Object.freeze({
    tokens: normalizedTokens,
    countedGraphemeCount,
    plainText: normalizedTokens.map(token => token.value).join(''),
  })
}

function packGatewayTitleLines(
  groups: readonly GatewayTitleGroup[],
  maxGraphemesPerLine: number,
): readonly GatewayTitleLine[] {
  const lines: GatewayTitleLine[] = []
  let currentTokens: GatewayTitleLayoutToken[] = []
  let currentCount = 0

  function flushCurrent(): void {
    if (!currentTokens.some(token => token.kind === 'text')) return

    lines.push(makeLine(currentTokens, currentCount))
    currentTokens = []
    currentCount = 0
  }

  for (const group of groups) {
    const nextCount = currentCount + group.countedGraphemeCount

    // MMJ-UI17: a parenthetical suffix remains inside the preceding
    // text group. Line packing may move the whole group, but must never
    // detach the atomic auxiliary token from its semantic host.
    if (
      currentCount === 0
      || nextCount <= maxGraphemesPerLine
    ) {
      currentTokens.push(...group.tokens)
      currentCount = nextCount
      continue
    }

    flushCurrent()
    currentTokens.push(...group.tokens)
    currentCount = group.countedGraphemeCount
  }

  flushCurrent()

  return Object.freeze(lines)
}

export function layoutGatewayTitle(
  title: string,
  options: GatewayTitleLayoutOptions = {},
): GatewayTitleLayout {
  const locale = options.locale ?? DEFAULT_LOCALE
  const maxGraphemesPerLine =
    options.maxGraphemesPerLine
    ?? DEFAULT_MAX_GRAPHEMES_PER_LINE

  if (
    !Number.isInteger(maxGraphemesPerLine)
    || maxGraphemesPerLine < 1
  ) {
    throw new RangeError(
      'maxGraphemesPerLine must be a positive integer.',
    )
  }

  const tokens = tokenizeGatewayTitleLayout(title, locale)
  const groups = buildGatewayTitleGroups(
    tokens,
    maxGraphemesPerLine,
    locale,
  )
  const lines = packGatewayTitleLines(
    groups,
    maxGraphemesPerLine,
  )

  return Object.freeze({
    source: title,
    lines,
    plainText: title,
    maxGraphemesPerLine,
  })
}

/**
 * MMJ-UI18: an explicit title-line override is presentation authority only.
 * The canonical source string remains untouched for accessibility and routing,
 * while each supplied line is tokenized with the same atomic parenthetical rules.
 */
export function layoutGatewayTitleFromExplicitLines(
  title: string,
  explicitLines: readonly string[],
  options: GatewayTitleLayoutOptions = {},
): GatewayTitleLayout {
  const locale = options.locale ?? DEFAULT_LOCALE
  const maxGraphemesPerLine =
    options.maxGraphemesPerLine
    ?? DEFAULT_MAX_GRAPHEMES_PER_LINE

  if (
    !Number.isInteger(maxGraphemesPerLine)
    || maxGraphemesPerLine < 1
  ) {
    throw new RangeError(
      'maxGraphemesPerLine must be a positive integer.',
    )
  }

  if (explicitLines.length === 0) {
    return layoutGatewayTitle(title, options)
  }

  const lines = explicitLines.map((explicitLine, lineIndex) => {
    const tokens = tokenizeGatewayTitleLayout(explicitLine, locale)
    const countedGraphemeCount = tokens.reduce(
      (total, token) => total + token.graphemeCount,
      0,
    )

    if (!tokens.some(token => token.kind === 'text')) {
      throw new RangeError(
        `explicitLines[${lineIndex}] must contain text.`,
      )
    }

    if (countedGraphemeCount > maxGraphemesPerLine) {
      throw new RangeError(
        `explicitLines[${lineIndex}] exceeds maxGraphemesPerLine.`,
      )
    }

    return makeLine(tokens, countedGraphemeCount)
  })

  return Object.freeze({
    source: title,
    lines: Object.freeze(lines),
    plainText: title,
    maxGraphemesPerLine,
  })
}

