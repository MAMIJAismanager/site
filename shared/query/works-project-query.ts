import {
  PROJECT_ROLE_REGISTRY,
  isProjectRole,
} from '../constants/taxonomy'
import {
  PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES,
  isPortfolioGatewayCategoryId,
  findPortfolioGatewayCategory,
} from '../constants/portfolio-gateway-categories'

import type {
  ProjectRole,
} from '../constants/taxonomy'
import type {
  PortfolioGatewayCategoryId,
} from '../types/portfolio-gateway-category'

import {
  isProjectId,
} from '../schema/domain-identifiers'

import type {
  ProjectId,
} from '../types/domain-identifiers'

import type {
  ProjectCardView,
} from '../view/portfolio-project-view'

import {
  DEFAULT_WORKS_QUERY_STATE,
  WORKS_QUERY_KEYS,
  isWorksSort,
  normalizeWorksQueryInput,
} from './works-query-state'

import type {
  WorksQueryIssue,
  WorksQueryIssueCode,
  WorksQueryKey,
  WorksQueryState,
  WorksRawQuery,
  WorksRawQueryValue,
} from './works-query-state'

export interface WorksCategoryOption {
  readonly token: PortfolioGatewayCategoryId
  readonly label: string
  readonly order: number
  readonly count: number
}

export interface WorksRoleOption {
  readonly token: ProjectRole
  readonly label: string
  readonly order: number
  readonly count: number
}

export interface WorksTagOption {
  readonly token: string
  readonly label: string
  readonly count: number
}

export interface WorksYearOption {
  readonly year: number
  readonly count: number
}

export interface WorksQueryEvaluation {
  readonly state: WorksQueryState
  readonly projects: readonly ProjectCardView[]
  readonly activeProject: ProjectCardView | null
  readonly totalCount: number
  readonly resultCount: number
  readonly hasActiveFilters: boolean
  readonly canonicalQuery: Readonly<Record<string, string>>
  readonly issues: readonly WorksQueryIssue[]
}

export interface WorksProjectQueryAuthority {
  readonly allProjects: readonly ProjectCardView[]
  readonly categoryOptions: readonly WorksCategoryOption[]
  readonly roleOptions: readonly WorksRoleOption[]
  readonly tagOptions: readonly WorksTagOption[]
  readonly yearOptions: readonly WorksYearOption[]

  evaluate(rawQuery: WorksRawQuery): WorksQueryEvaluation

  serialize(
    state: WorksQueryState,
  ): Readonly<Record<string, string>>
}

export type WorksProjectQueryBuildErrorCode =
  | 'duplicate-project-id'
  | 'duplicate-project-slug'
  | 'conflicting-tag-label'
  | 'sparse-project-list'

export class WorksProjectQueryBuildError
  extends Error {
  readonly code: WorksProjectQueryBuildErrorCode
  readonly key: string
  readonly firstIndex: number
  readonly duplicateIndex: number

  constructor(
    code: WorksProjectQueryBuildErrorCode,
    key: string,
    firstIndex: number,
    duplicateIndex: number,
  ) {
    super(
      `${code}: key "${key}" first appears at index ${firstIndex} and repeats at index ${duplicateIndex}.`,
    )

    this.name = 'WorksProjectQueryBuildError'
    this.code = code
    this.key = key
    this.firstIndex = firstIndex
    this.duplicateIndex = duplicateIndex
  }
}

interface ParsedScalar {
  readonly present: boolean
  readonly value: string | null
  readonly issue: WorksQueryIssue | null
}

function freezeRecord<T extends object>(
  value: T,
): Readonly<T> {
  return Object.freeze(value)
}

function issue(
  key: WorksQueryKey,
  code: WorksQueryIssueCode,
  value: unknown,
): WorksQueryIssue {
  return freezeRecord({
    key,
    code,
    value,
  })
}

function readScalar(
  rawQuery: WorksRawQuery,
  key: WorksQueryKey,
): ParsedScalar {
  const rawValue: WorksRawQueryValue = rawQuery[key]

  if (Array.isArray(rawValue)) {
    if (rawValue.length !== 1) {
      return {
        present: true,
        value: null,
        issue: issue(
          key,
          'multiple-values',
          [...rawValue],
        ),
      }
    }

    const onlyValue = rawValue[0]
    if (typeof onlyValue !== 'string') {
      return {
        present: true,
        value: null,
        issue: issue(key, 'empty-value', onlyValue),
      }
    }

    return {
      present: true,
      value: onlyValue,
      issue: null,
    }
  }

  if (rawValue === undefined) {
    return {
      present: false,
      value: null,
      issue: null,
    }
  }

  if (typeof rawValue !== 'string') {
    return {
      present: true,
      value: null,
      issue: issue(key, 'empty-value', rawValue),
    }
  }

  return {
    present: true,
    value: rawValue,
    issue: null,
  }
}

export function normalizeWorksSearchText(
  value: string,
): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim()
}

function compareCodeUnits(
  left: string,
  right: string,
): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: 'asc' | 'desc',
): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  return direction === 'asc'
    ? left - right
    : right - left
}

function compareNullableString(
  left: string | null,
  right: string | null,
  direction: 'asc' | 'desc',
): number {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  const result = compareCodeUnits(left, right)
  return direction === 'asc'
    ? result
    : -result
}

function buildSearchDocument(
  project: ProjectCardView,
): string {
  const fields: string[] = [
    project.title,
    project.summary,
    project.category.token,
    project.category.label,
  ]

  for (const categoryId of project.gatewayCategoryIds) {
    fields.push(categoryId)
    const gatewayCategory = findPortfolioGatewayCategory(categoryId)
    if (gatewayCategory !== null) {
      fields.push(gatewayCategory.title, gatewayCategory.shortLabel)
    }
  }

  for (const role of project.roles) {
    fields.push(role.token, role.label)
  }

  for (const tag of project.tags) {
    fields.push(tag.token, tag.label)
  }

  if (project.displayMeta.client !== null) {
    fields.push(project.displayMeta.client)
  }

  if (project.displayMeta.metaLine !== null) {
    fields.push(project.displayMeta.metaLine)
  }

  if (project.displayMeta.timing.year !== null) {
    fields.push(
      String(project.displayMeta.timing.year),
    )
  }

  return normalizeWorksSearchText(
    fields.join(' '),
  )
}

function hasAnyActiveQuery(
  state: WorksQueryState,
): boolean {
  return (
    state.q !== null
    || state.category !== null
    || state.role !== null
    || state.tag !== null
    || state.year !== null
    || state.sort !== 'order'
    || state.project !== null
  )
}

function serializeWorksQueryState(
  state: WorksQueryState,
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {}

  if (state.q !== null) output.q = state.q
  if (state.category !== null) {
    output.category = state.category
  }
  if (state.role !== null) output.role = state.role
  if (state.tag !== null) output.tag = state.tag
  if (state.year !== null) {
    output.year = String(state.year)
  }
  if (state.sort !== 'order') {
    output.sort = state.sort
  }
  if (state.project !== null) {
    output.project = state.project
  }

  return Object.freeze(output)
}

export function createWorksProjectQueryAuthority(
  projectCardViews: readonly ProjectCardView[],
): WorksProjectQueryAuthority {
  for (
    let projectIndex = 0;
    projectIndex < projectCardViews.length;
    projectIndex += 1
  ) {
    if (!(projectIndex in projectCardViews)) {
      throw new WorksProjectQueryBuildError(
        'sparse-project-list',
        String(projectIndex),
        projectIndex,
        projectIndex,
      )
    }
  }

  const projectIdFirstIndex =
    new Map<ProjectId, number>()
  const projectSlugFirstIndex =
    new Map<string, number>()
  const tagOwner = new Map<
    string,
    Readonly<{
      label: string
      index: number
    }>
  >()

  const categoryCounts = new Map<
    PortfolioGatewayCategoryId,
    number
  >(
    PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES.map(
      entry => [entry.id, 0] as const,
    ),
  )

  const roleCounts = new Map<
    ProjectRole,
    number
  >(
    PROJECT_ROLE_REGISTRY.map(
      entry => [entry.token, 0] as const,
    ),
  )

  const tagCounts = new Map<string, number>()
  const yearCounts = new Map<number, number>()
  const searchDocumentById = new Map<
    ProjectId,
    string
  >()

  for (const [projectIndex, project] of (
    projectCardViews.entries()
  )) {
    const existingIdIndex =
      projectIdFirstIndex.get(project.id)

    if (existingIdIndex !== undefined) {
      throw new WorksProjectQueryBuildError(
        'duplicate-project-id',
        project.id,
        existingIdIndex,
        projectIndex,
      )
    }

    const existingSlugIndex =
      projectSlugFirstIndex.get(project.slug)

    if (existingSlugIndex !== undefined) {
      throw new WorksProjectQueryBuildError(
        'duplicate-project-slug',
        project.slug,
        existingSlugIndex,
        projectIndex,
      )
    }

    projectIdFirstIndex.set(project.id, projectIndex)
    projectSlugFirstIndex.set(project.slug, projectIndex)

    for (const categoryId of project.gatewayCategoryIds) {
      const categoryCount = categoryCounts.get(categoryId)
      if (categoryCount !== undefined) {
        categoryCounts.set(categoryId, categoryCount + 1)
      }
    }

    for (const role of project.roles) {
      const roleCount = roleCounts.get(role.token)

      if (roleCount === undefined) {
        throw new Error(
          `Unknown project role: ${role.token}`,
        )
      }

      roleCounts.set(role.token, roleCount + 1)
    }

    for (const tag of project.tags) {
      const existingTag = tagOwner.get(tag.token)

      if (
        existingTag !== undefined
        && existingTag.label !== tag.label
      ) {
        throw new WorksProjectQueryBuildError(
          'conflicting-tag-label',
          tag.token,
          existingTag.index,
          projectIndex,
        )
      }

      if (existingTag === undefined) {
        tagOwner.set(
          tag.token,
          freezeRecord({
            label: tag.label,
            index: projectIndex,
          }),
        )
      }

      tagCounts.set(
        tag.token,
        (tagCounts.get(tag.token) ?? 0) + 1,
      )
    }

    const year = project.displayMeta.timing.year
    if (year !== null) {
      yearCounts.set(
        year,
        (yearCounts.get(year) ?? 0) + 1,
      )
    }

    searchDocumentById.set(
      project.id,
      buildSearchDocument(project),
    )
  }

  const allProjects = Object.freeze([
    ...projectCardViews,
  ])

  const categoryOptions = Object.freeze(
    PUBLIC_PORTFOLIO_GATEWAY_CATEGORIES.map(entry => (
      freezeRecord({
        token: entry.id,
        label: entry.shortLabel,
        order: entry.order,
        count: categoryCounts.get(entry.id) ?? 0,
      })
    )),
  )

  const roleOptions = Object.freeze(
    PROJECT_ROLE_REGISTRY.map(entry => (
      freezeRecord({
        token: entry.token,
        label: entry.label,
        order: entry.order,
        count: roleCounts.get(entry.token) ?? 0,
      })
    )),
  )

  const tagOptions = Object.freeze(
    [...tagOwner.entries()]
      .sort(([left], [right]) => (
        compareCodeUnits(left, right)
      ))
      .map(([token, owner]) => (
        freezeRecord({
          token,
          label: owner.label,
          count: tagCounts.get(token) ?? 0,
        })
      )),
  )

  const yearOptions = Object.freeze(
    [...yearCounts.entries()]
      .sort(([left], [right]) => right - left)
      .map(([year, count]) => (
        freezeRecord({ year, count })
      )),
  )

  function evaluate(
    rawQuery: WorksRawQuery,
  ): WorksQueryEvaluation {
    const issuesByKey = new Map<
      WorksQueryKey,
      WorksQueryIssue
    >()

    const scalars = new Map<
      WorksQueryKey,
      ParsedScalar
    >()

    for (const key of WORKS_QUERY_KEYS) {
      const scalar = readScalar(rawQuery, key)
      scalars.set(key, scalar)
      if (scalar.issue !== null) {
        issuesByKey.set(key, scalar.issue)
      }
    }

    const qScalar = scalars.get('q')
    const categoryScalar = scalars.get('category')
    const roleScalar = scalars.get('role')
    const tagScalar = scalars.get('tag')
    const yearScalar = scalars.get('year')
    const sortScalar = scalars.get('sort')
    const projectScalar = scalars.get('project')

    if (
      qScalar === undefined
      || categoryScalar === undefined
      || roleScalar === undefined
      || tagScalar === undefined
      || yearScalar === undefined
      || sortScalar === undefined
      || projectScalar === undefined
    ) {
      throw new Error('Works query scalar map is incomplete.')
    }

    let q: string | null = null
    if (
      qScalar.issue === null
      && qScalar.present
      && qScalar.value !== null
    ) {
      q = normalizeWorksQueryInput(qScalar.value)
      if (q === null) {
        issuesByKey.set(
          'q',
          issue('q', 'empty-value', qScalar.value),
        )
      }
    }

    let category: PortfolioGatewayCategoryId | null = null
    if (
      categoryScalar.issue === null
      && categoryScalar.present
      && categoryScalar.value !== null
    ) {
      if (isPortfolioGatewayCategoryId(categoryScalar.value)) {
        category = categoryScalar.value
      } else if (categoryScalar.value.length === 0) {
        issuesByKey.set(
          'category',
          issue(
            'category',
            'empty-value',
            categoryScalar.value,
          ),
        )
      } else {
        issuesByKey.set(
          'category',
          issue(
            'category',
            'unknown-category',
            categoryScalar.value,
          ),
        )
      }
    }

    let role: ProjectRole | null = null
    if (
      roleScalar.issue === null
      && roleScalar.present
      && roleScalar.value !== null
    ) {
      if (isProjectRole(roleScalar.value)) {
        role = roleScalar.value
      } else if (roleScalar.value.length === 0) {
        issuesByKey.set(
          'role',
          issue('role', 'empty-value', roleScalar.value),
        )
      } else {
        issuesByKey.set(
          'role',
          issue(
            'role',
            'unknown-role',
            roleScalar.value,
          ),
        )
      }
    }

    let tag: string | null = null
    if (
      tagScalar.issue === null
      && tagScalar.present
      && tagScalar.value !== null
    ) {
      if (tagOwner.has(tagScalar.value)) {
        tag = tagScalar.value
      } else if (tagScalar.value.length === 0) {
        issuesByKey.set(
          'tag',
          issue('tag', 'empty-value', tagScalar.value),
        )
      } else {
        issuesByKey.set(
          'tag',
          issue(
            'tag',
            'unknown-tag',
            tagScalar.value,
          ),
        )
      }
    }

    let year: number | null = null
    if (
      yearScalar.issue === null
      && yearScalar.present
      && yearScalar.value !== null
    ) {
      if (/^[0-9]{4}$/.test(yearScalar.value)) {
        const parsedYear = Number(yearScalar.value)
        if (parsedYear >= 1900 && parsedYear <= 2200) {
          year = parsedYear
        } else {
          issuesByKey.set(
            'year',
            issue(
              'year',
              'invalid-year',
              yearScalar.value,
            ),
          )
        }
      } else if (yearScalar.value.length === 0) {
        issuesByKey.set(
          'year',
          issue('year', 'empty-value', yearScalar.value),
        )
      } else {
        issuesByKey.set(
          'year',
          issue(
            'year',
            'invalid-year',
            yearScalar.value,
          ),
        )
      }
    }

    let sort: WorksQueryState['sort'] = 'order'
    if (
      sortScalar.issue === null
      && sortScalar.present
      && sortScalar.value !== null
    ) {
      if (isWorksSort(sortScalar.value)) {
        sort = sortScalar.value
      } else if (sortScalar.value.length === 0) {
        issuesByKey.set(
          'sort',
          issue('sort', 'empty-value', sortScalar.value),
        )
      } else {
        issuesByKey.set(
          'sort',
          issue(
            'sort',
            'unknown-sort',
            sortScalar.value,
          ),
        )
      }
    }

    let requestedProject: ProjectId | null = null
    if (
      projectScalar.issue === null
      && projectScalar.present
      && projectScalar.value !== null
    ) {
      if (projectScalar.value.length === 0) {
        issuesByKey.set(
          'project',
          issue(
            'project',
            'empty-value',
            projectScalar.value,
          ),
        )
      } else if (isProjectId(projectScalar.value)) {
        requestedProject = projectScalar.value
      } else {
        issuesByKey.set(
          'project',
          issue(
            'project',
            'invalid-project-id',
            projectScalar.value,
          ),
        )
      }
    }

    const normalizedTerms = q === null
      ? []
      : normalizeWorksSearchText(q)
        .split(' ')
        .filter(term => term.length > 0)

    let projects = allProjects.filter(project => {
      if (normalizedTerms.length > 0) {
        const document = searchDocumentById.get(project.id)
        if (document === undefined) {
          throw new Error(
            `Missing search document: ${project.id}`,
          )
        }
        if (!normalizedTerms.every(term => (
          document.includes(term)
        ))) {
          return false
        }
      }

      if (
        category !== null
        && !project.gatewayCategoryIds.includes(category)
      ) {
        return false
      }

      if (
        role !== null
        && !project.roles.some(entry => (
          entry.token === role
        ))
      ) {
        return false
      }

      if (
        tag !== null
        && !project.tags.some(entry => (
          entry.token === tag
        ))
      ) {
        return false
      }

      if (
        year !== null
        && project.displayMeta.timing.year !== year
      ) {
        return false
      }

      return true
    })

    if (sort !== 'order') {
      projects = [...projects].sort((left, right) => {
        if (sort === 'newest' || sort === 'oldest') {
          const direction = sort === 'newest'
            ? 'desc'
            : 'asc'
          const yearResult = compareNullableNumber(
            left.displayMeta.timing.year,
            right.displayMeta.timing.year,
            direction,
          )
          if (yearResult !== 0) return yearResult

          const releaseDateResult = compareNullableString(
            left.displayMeta.timing.releaseDate,
            right.displayMeta.timing.releaseDate,
            direction,
          )
          if (releaseDateResult !== 0) {
            return releaseDateResult
          }
        }

        if (sort === 'title') {
          const normalizedTitleResult = compareCodeUnits(
            normalizeWorksSearchText(left.title),
            normalizeWorksSearchText(right.title),
          )
          if (normalizedTitleResult !== 0) {
            return normalizedTitleResult
          }

          const titleResult = compareCodeUnits(
            left.title,
            right.title,
          )
          if (titleResult !== 0) return titleResult
        }

        const orderResult = left.order - right.order
        if (orderResult !== 0) return orderResult

        return compareCodeUnits(left.id, right.id)
      })
    } else {
      projects = [...projects]
    }

    let project: ProjectId | null = requestedProject
    let activeProject: ProjectCardView | null = null

    if (requestedProject !== null) {
      activeProject = projects.find(candidate => (
        candidate.id === requestedProject
      )) ?? null

      if (activeProject === null) {
        project = null
        issuesByKey.set(
          'project',
          issue(
            'project',
            'project-not-in-result',
            requestedProject,
          ),
        )
      }
    }

    const state = freezeRecord<WorksQueryState>({
      q,
      category,
      role,
      tag,
      year,
      sort,
      project,
    })

    const frozenProjects = Object.freeze(projects)
    const issues = Object.freeze(
      WORKS_QUERY_KEYS.flatMap(key => {
        const currentIssue = issuesByKey.get(key)
        return currentIssue === undefined
          ? []
          : [currentIssue]
      }),
    )

    const canonicalQuery =
      serializeWorksQueryState(state)

    return freezeRecord<WorksQueryEvaluation>({
      state,
      projects: frozenProjects,
      activeProject,
      totalCount: allProjects.length,
      resultCount: frozenProjects.length,
      hasActiveFilters: hasAnyActiveQuery(state),
      canonicalQuery,
      issues,
    })
  }

  const authority = freezeRecord<WorksProjectQueryAuthority>({
    allProjects,
    categoryOptions,
    roleOptions,
    tagOptions,
    yearOptions,
    evaluate,
    serialize: serializeWorksQueryState,
  })

  return authority
}

export {
  DEFAULT_WORKS_QUERY_STATE,
}
