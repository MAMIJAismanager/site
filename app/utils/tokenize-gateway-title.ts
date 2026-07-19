export type GatewayTitleToken =
  | {
      readonly kind: 'text'
      readonly value: string
    }
  | {
      readonly kind: 'parenthetical'
      readonly value: string
    }

function hasBalancedNonNestedParentheses(value: string): boolean {
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

  return depth === 0
}

export function tokenizeGatewayTitle(
  title: string,
): readonly GatewayTitleToken[] {
  if (!hasBalancedNonNestedParentheses(title)) {
    return Object.freeze([
      Object.freeze({
        kind: 'text' as const,
        value: title,
      }),
    ])
  }

  const tokens: GatewayTitleToken[] = []
  const parentheticalPattern = /\([^()]+\)/g
  let cursor = 0

  for (const match of title.matchAll(parentheticalPattern)) {
    const index = match.index
    if (index === undefined) continue

    if (index > cursor) {
      tokens.push(Object.freeze({
        kind: 'text',
        value: title.slice(cursor, index),
      }))
    }

    tokens.push(Object.freeze({
      kind: 'parenthetical',
      value: match[0],
    }))
    cursor = index + match[0].length
  }

  if (cursor < title.length) {
    tokens.push(Object.freeze({
      kind: 'text',
      value: title.slice(cursor),
    }))
  }

  if (tokens.length === 0) {
    return Object.freeze([
      Object.freeze({
        kind: 'text' as const,
        value: title,
      }),
    ])
  }

  return Object.freeze(tokens)
}
