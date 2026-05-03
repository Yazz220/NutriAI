import type { CookbookPageSummary, CookbookSection, TocSection } from '@/types/cookbook';

export const COOKBOOK_SECTION_ORDER: CookbookSection[] = [
  'breakfast',
  'lunch',
  'dinner',
  'healthy',
  'desserts',
  'sides',
  'favorites',
];

export const COOKBOOK_SECTION_LABELS: Record<CookbookSection, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  healthy: 'Healthy',
  desserts: 'Desserts',
  sides: 'Sides',
  favorites: 'Favorites',
};

export function normalizeSection(value?: string | null): CookbookSection {
  if (!value) return 'favorites';

  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized === 'breakfast') return 'breakfast';
  if (normalized === 'lunch') return 'lunch';
  if (normalized === 'dinner') return 'dinner';
  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'dessert' || normalized === 'desserts') return 'desserts';
  if (normalized === 'side' || normalized === 'sides') return 'sides';
  return 'favorites';
}

export function groupPagesBySection(pages: CookbookPageSummary[]): TocSection[] {
  return COOKBOOK_SECTION_ORDER.map((id) => ({
    id,
    label: COOKBOOK_SECTION_LABELS[id],
    pages: pages
      .filter((page) => page.section === id)
      .sort((a, b) => a.pageNumber - b.pageNumber),
  })).filter((section) => section.pages.length > 0);
}
