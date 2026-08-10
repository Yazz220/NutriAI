import type { Cookbook, CookbookPage } from '@/types/cookbook';

export const SAMPLE_COOKBOOK_ID = 'demo-cookbook';

export const SAMPLE_COOKBOOK: Cookbook = {
  id: SAMPLE_COOKBOOK_ID,
  userId: 'demo-user',
  title: 'The Weeknight Table',
  coverImageAsset: require('../../assets/cookbook/generated/garden-table-cover-texture.png'),
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
  pageCount: 6,
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-10T12:00:00.000Z',
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
  {
    id: 'demo-harissa-chicken',
    cookbookId: SAMPLE_COOKBOOK_ID,
    recipeId: 'recipe-harissa-chicken',
    title: 'Sheet-Pan Harissa Chicken',
    section: 'dinner',
    pageNumber: 4,
    sortOrder: 3,
    imageAsset: require('../../assets/cookbook/generated/sheet-pan-harissa-chicken.png'),
  },
  {
    id: 'demo-tuscan-white-beans',
    cookbookId: SAMPLE_COOKBOOK_ID,
    recipeId: 'recipe-tuscan-white-beans',
    title: 'Creamy Tuscan White Beans',
    section: 'healthy',
    pageNumber: 5,
    sortOrder: 4,
    imageAsset: require('../../assets/cookbook/generated/creamy-tuscan-white-beans.png'),
  },
  {
    id: 'demo-mushroom-orzo',
    cookbookId: SAMPLE_COOKBOOK_ID,
    recipeId: 'recipe-mushroom-orzo',
    title: 'Lemony Mushroom Orzo',
    section: 'dinner',
    pageNumber: 6,
    sortOrder: 5,
    imageAsset: require('../../assets/cookbook/generated/lemony-mushroom-orzo.png'),
  },
];

export function shouldShowSampleCookbook(cookbookId?: string | null): boolean {
  return (
    process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true' &&
    process.env.EXPO_PUBLIC_SHOW_DEMO_COOKBOOK === 'true' &&
    (!cookbookId || cookbookId === SAMPLE_COOKBOOK_ID)
  );
}
