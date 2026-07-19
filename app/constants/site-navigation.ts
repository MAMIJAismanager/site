export interface SiteNavigationItem {
  readonly id: 'works' | 'about' | 'contact'
  readonly label: string
  readonly to: '/works' | '/about' | '/contact'
}

export const SITE_NAVIGATION_ITEMS = [
  {
    id: 'works',
    label: '작업',
    to: '/works',
  },
  {
    id: 'about',
    label: '소개',
    to: '/about',
  },
  {
    id: 'contact',
    label: '문의',
    to: '/contact',
  },
] as const satisfies readonly SiteNavigationItem[]
