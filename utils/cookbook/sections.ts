import type {
  Cookbook,
  CookbookPageSummary,
  CookbookSection,
  CookbookSectionEntry,
  TocSection,
} from '@/types/cookbook';

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

export function normalizeSections(value: unknown): CookbookSectionEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): CookbookSectionEntry | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id = normalizeSection(typeof record.id === 'string' ? record.id : null);
      const label =
        typeof record.label === 'string' && record.label.trim().length > 0
          ? record.label.trim()
          : COOKBOOK_SECTION_LABELS[id];
      const order = typeof record.order === 'number' ? record.order : 0;
      return { id, label, order };
    })
    .filter((entry): entry is CookbookSectionEntry => entry !== null)
    .sort((a, b) => a.order - b.order);
}

/**
 * Returns the ordered list of sections to render for a given book.
 * Falls back to sections derived from the book's pages, then to an empty list.
 */
export function resolveCookbookSections(
  cookbook: Cookbook | null | undefined,
  pages: { section: CookbookSection }[],
): CookbookSectionEntry[] {
  if (cookbook?.sections && cookbook.sections.length > 0) {
    return cookbook.sections;
  }

  const seen = new Set<CookbookSection>();
  for (const page of pages) {
    seen.add(page.section);
  }

  return COOKBOOK_SECTION_ORDER.filter((id) => seen.has(id)).map((id, index) => ({
    id,
    label: COOKBOOK_SECTION_LABELS[id],
    order: index,
  }));
}

export function groupPagesBySection(
  pages: CookbookPageSummary[],
  sectionEntries?: CookbookSectionEntry[],
): TocSection[] {
  const order =
    sectionEntries && sectionEntries.length > 0
      ? sectionEntries.map((entry) => entry.id)
      : COOKBOOK_SECTION_ORDER;

  const labelLookup: Record<CookbookSection, string> = { ...COOKBOOK_SECTION_LABELS };
  if (sectionEntries) {
    for (const entry of sectionEntries) {
      labelLookup[entry.id] = entry.label;
    }
  }

  return order
    .map<TocSection>((id) => ({
      id,
      label: labelLookup[id],
      pages: pages
        .filter((page) => page.section === id)
        .sort((a, b) => a.pageNumber - b.pageNumber),
    }))
    .filter((section) => section.pages.length > 0);
}
