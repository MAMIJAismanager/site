export interface TaxonomyRegistryEntry<
  Token extends string,
> {
  readonly token: Token
  readonly label: string
  readonly order: number
}

export const PROJECT_CATEGORY_REGISTRY = [
  {
    token: 'choreography',
    label: '안무',
    order: 10,
  },
  {
    token: 'composition',
    label: '작곡',
    order: 20,
  },
  {
    token: 'video',
    label: '영상',
    order: 30,
  },
  {
    token: 'direction',
    label: '디렉팅',
    order: 40,
  },
  {
    token: 'producing',
    label: '프로듀싱',
    order: 50,
  },
] as const satisfies readonly TaxonomyRegistryEntry<string>[]

export type ProjectCategoryEntry =
  typeof PROJECT_CATEGORY_REGISTRY[number]

export type ProjectCategory =
  ProjectCategoryEntry['token']

export const PROJECT_ROLE_REGISTRY = [
  {
    token: 'choreographer',
    label: '안무',
    order: 10,
  },
  {
    token: 'composer',
    label: '작곡',
    order: 20,
  },
  {
    token: 'arranger',
    label: '편곡',
    order: 30,
  },
  {
    token: 'lyricist',
    label: '작사',
    order: 40,
  },
  {
    token: 'performer',
    label: '퍼포먼스',
    order: 50,
  },
  {
    token: 'video-director',
    label: '영상 연출',
    order: 60,
  },
  {
    token: 'creative-director',
    label: '크리에이티브 디렉팅',
    order: 70,
  },
  {
    token: 'producer',
    label: '프로듀싱',
    order: 80,
  },
  {
    token: 'editor',
    label: '편집',
    order: 90,
  },
  {
    token: 'planner',
    label: '기획',
    order: 100,
  },
] as const satisfies readonly TaxonomyRegistryEntry<string>[]

export type ProjectRoleEntry =
  typeof PROJECT_ROLE_REGISTRY[number]

export type ProjectRole =
  ProjectRoleEntry['token']

export const PROJECT_CATEGORY_TOKENS:
readonly ProjectCategory[] = Object.freeze(
  PROJECT_CATEGORY_REGISTRY.map(
    entry => entry.token,
  ),
)

export const PROJECT_ROLE_TOKENS:
readonly ProjectRole[] = Object.freeze(
  PROJECT_ROLE_REGISTRY.map(
    entry => entry.token,
  ),
)

const PROJECT_CATEGORY_BY_TOKEN:
ReadonlyMap<ProjectCategory, ProjectCategoryEntry> =
  new Map(
    PROJECT_CATEGORY_REGISTRY.map(
      entry => [entry.token, entry] as const,
    ),
  )

const PROJECT_ROLE_BY_TOKEN:
ReadonlyMap<ProjectRole, ProjectRoleEntry> =
  new Map(
    PROJECT_ROLE_REGISTRY.map(
      entry => [entry.token, entry] as const,
    ),
  )

const PROJECT_CATEGORY_TOKEN_SET:
ReadonlySet<string> =
  new Set(PROJECT_CATEGORY_TOKENS)

const PROJECT_ROLE_TOKEN_SET:
ReadonlySet<string> =
  new Set(PROJECT_ROLE_TOKENS)

export function isProjectCategory(
  value: unknown,
): value is ProjectCategory {
  return (
    typeof value === 'string'
    && PROJECT_CATEGORY_TOKEN_SET.has(value)
  )
}

export function isProjectRole(
  value: unknown,
): value is ProjectRole {
  return (
    typeof value === 'string'
    && PROJECT_ROLE_TOKEN_SET.has(value)
  )
}

export function getProjectCategoryEntry(
  category: ProjectCategory,
): ProjectCategoryEntry {
  const entry = PROJECT_CATEGORY_BY_TOKEN.get(category)

  if (!entry) {
    throw new Error(
      `Unknown project category: ${category}`,
    )
  }

  return entry
}

export function getProjectRoleEntry(
  role: ProjectRole,
): ProjectRoleEntry {
  const entry = PROJECT_ROLE_BY_TOKEN.get(role)

  if (!entry) {
    throw new Error(
      `Unknown project role: ${role}`,
    )
  }

  return entry
}

export function getProjectCategoryLabel(
  category: ProjectCategory,
): string {
  return getProjectCategoryEntry(category).label
}

export function getProjectRoleLabel(
  role: ProjectRole,
): string {
  return getProjectRoleEntry(role).label
}

export function readProjectCategory(
  value: unknown,
): ProjectCategory | null {
  return isProjectCategory(value)
    ? value
    : null
}

export function readProjectRole(
  value: unknown,
): ProjectRole | null {
  return isProjectRole(value)
    ? value
    : null
}

export interface ProjectRoleListValidation {
  readonly valid: boolean
  readonly roles: readonly ProjectRole[]
  readonly invalidValues: readonly unknown[]
  readonly duplicateRoles: readonly ProjectRole[]
}

export function validateProjectRoleList(
  values: readonly unknown[],
): ProjectRoleListValidation {
  const roles: ProjectRole[] = []
  const invalidValues: unknown[] = []
  const duplicateRoles: ProjectRole[] = []
  const seen = new Set<ProjectRole>()

  for (const value of values) {
    if (!isProjectRole(value)) {
      invalidValues.push(value)
      continue
    }

    if (seen.has(value)) {
      duplicateRoles.push(value)
      continue
    }

    seen.add(value)
    roles.push(value)
  }

  return {
    valid:
      roles.length > 0
      && invalidValues.length === 0
      && duplicateRoles.length === 0,
    roles,
    invalidValues,
    duplicateRoles,
  }
}

export function compareProjectCategories(
  left: ProjectCategory,
  right: ProjectCategory,
): number {
  return (
    getProjectCategoryEntry(left).order
    - getProjectCategoryEntry(right).order
  )
}

export function compareProjectRoles(
  left: ProjectRole,
  right: ProjectRole,
): number {
  return (
    getProjectRoleEntry(left).order
    - getProjectRoleEntry(right).order
  )
}
