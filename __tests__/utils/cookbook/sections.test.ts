import { groupPagesBySection, normalizeSection } from '@/utils/cookbook/sections';
import type { CookbookPageSummary } from '@/types/cookbook';

const pages: CookbookPageSummary[] = [
  { id: 'p1', title: 'Oats', section: 'breakfast', pageNumber: 1, imageUrl: 'a' },
  { id: 'p2', title: 'Pasta', section: 'dinner', pageNumber: 2, imageUrl: 'b' },
  { id: 'p3', title: 'Cake', section: 'desserts', pageNumber: 3, imageUrl: 'c' },
];

describe('cookbook sections', () => {
  it('normalizes unknown sections to favorites', () => {
    expect(normalizeSection('weeknight')).toBe('favorites');
  });

  it('groups pages by cookbook section order', () => {
    const grouped = groupPagesBySection(pages);
    expect(grouped.map((section) => section.id)).toEqual(['breakfast', 'dinner', 'desserts']);
    expect(grouped[0].pages[0].title).toBe('Oats');
  });
});
