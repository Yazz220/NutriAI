import type { Cookbook, CookbookPage } from '@/types/cookbook';

export const SAMPLE_COOKBOOK_ID = 'demo-cookbook';

export const SAMPLE_COOKBOOK: Cookbook = {
  id: SAMPLE_COOKBOOK_ID,
  userId: 'demo-user',
  title: 'The Weeknight Table',
  coverImageAsset: require('../../assets/cookbook/generated/weeknight-table-cover.png'),
  theme: {
    name: 'Garden Table',
    prompt: 'Warm editorial recipe journal with hand-drawn botanical details.',
  },
  sectionOrder: ['dinner', 'healthy', 'sides'],
  coverStyle: 'handwritten',
  sections: [
    { id: 'dinner', label: 'Dinner', order: 0 },
    { id: 'healthy', label: 'Fresh & Healthy', order: 1 },
    { id: 'sides', label: 'Sides', order: 2 },
  ],
  pageCount: 3,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-09T12:00:00.000Z',
};

export const SAMPLE_COOKBOOK_PAGES: CookbookPage[] = [
  {
    id: 'demo-miso-salmon',
    cookbookId: SAMPLE_COOKBOOK_ID,
    recipeId: 'recipe-miso-salmon',
    title: 'Miso Salmon Rice Bowls',
    section: 'dinner',
    pageNumber: 1,
    sortOrder: 0,
    imageAsset: require('../../assets/cookbook/generated/miso-salmon-rice-bowls.png'),
  },
  {
    id: 'demo-chickpea-salad',
    cookbookId: SAMPLE_COOKBOOK_ID,
    recipeId: 'recipe-chickpea-salad',
    title: 'Crispy Chickpea Chopped Salad',
    section: 'healthy',
    pageNumber: 2,
    sortOrder: 1,
    imageAsset: require('../../assets/cookbook/generated/crispy-chickpea-chopped-salad.png'),
  },
  {
    id: 'demo-broccolini',
    cookbookId: SAMPLE_COOKBOOK_ID,
    recipeId: 'recipe-broccolini',
    title: 'Garlicky Broccolini & Lemon Crumbs',
    section: 'sides',
    pageNumber: 3,
    sortOrder: 2,
    imageAsset: require('../../assets/cookbook/generated/garlicky-broccolini-lemon-crumbs.png'),
  },
];

export function shouldShowSampleCookbook(cookbookId?: string | null): boolean {
  return (
    process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true' &&
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK === 'true' &&
    (!cookbookId || cookbookId === SAMPLE_COOKBOOK_ID)
  );
}
