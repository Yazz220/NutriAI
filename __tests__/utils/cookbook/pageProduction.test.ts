import {
  fetchPageById,
  generateRecipePageImage,
} from '@/utils/cookbook/api';
import { pollCookbookGeneration } from '@/utils/cookbook/generationPolling';
import {
  finishRecipePageCandidate,
  finishRecipePageImage,
} from '@/utils/cookbook/pageProduction';
import type { CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraphDraft } from '@/types/recipeGraph';

jest.mock('@/utils/cookbook/api', () => ({
  fetchPageById: jest.fn(),
  generateRecipePageImage: jest.fn(),
}));

jest.mock('@/utils/cookbook/generationPolling', () => ({
  pollCookbookGeneration: jest.fn(),
}));

const graph: RecipeGraphDraft = {
  title: 'Layered Cake',
  servings: 8,
  category: 'desserts',
  ingredientGroups: [{ id: 'cake', label: 'Cake', ingredients: [{ name: 'flour', quantity: '2', unit: 'cups' }] }],
  stepGroups: [{ id: 'bake', label: 'Bake', steps: [{ id: 'step-1', text: 'Bake the cake.' }] }],
  equipment: ['cake tins'],
  tags: ['celebration'],
  provenance: { sourceType: 'text', confidence: 0.92 },
};

const candidate: GeneratedRecipePage = {
  id: 'version-1',
  pageId: 'page-1',
  imageUrl: 'https://example.test/page.png',
  styleId: 'sage-linen',
  styleRevision: 1,
  generationPrompt: 'Complete cake page',
  model: 'test-model',
  status: 'ready',
  creditCost: 1,
  createdAt: '2026-08-22T00:00:00.000Z',
};

describe('complete recipe page production', () => {
  beforeEach(() => jest.clearAllMocks());

  it('polls one page and one idempotency key until its selected image is ready', async () => {
    const page = { id: 'page-1', recipeGraph: graph, pageImage: candidate } as unknown as CookbookPage;
    const generate = jest.mocked(generateRecipePageImage);
    const poll = jest.mocked(pollCookbookGeneration);
    generate
      .mockResolvedValueOnce({ status: 'processing', requestId: 'request-1' })
      .mockResolvedValueOnce({ pageImage: candidate });
    jest.mocked(fetchPageById).mockResolvedValue(page);
    poll.mockImplementation(async (request) => {
      expect((await request()).status).toBe('processing');
      const ready = await request();
      if (ready.status !== 'ready') throw new Error('Expected ready page');
      return ready.page;
    });

    await expect(finishRecipePageImage({
      cookbookId: 'cookbook-1',
      pageId: 'page-1',
      recipeGraph: graph,
      styleId: 'sage-linen',
      styleRevision: 1,
      idempotencyKey: 'generation-1',
    })).resolves.toBe(page);

    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      pageId: 'page-1',
      idempotencyKey: 'generation-1',
    }));
    expect(fetchPageById).toHaveBeenCalledWith('page-1');
  });

  it('returns an unselected complete-page candidate for a visual revision', async () => {
    jest.mocked(generateRecipePageImage).mockResolvedValue({ pageImage: candidate });
    jest.mocked(pollCookbookGeneration).mockImplementation(async (request) => {
      const ready = await request();
      if (ready.status !== 'ready') throw new Error('Expected ready candidate');
      return ready.page;
    });

    await expect(finishRecipePageCandidate({
      cookbookId: 'cookbook-1',
      pageId: 'page-1',
      recipeGraph: graph,
      styleId: 'sage-linen',
      idempotencyKey: 'page-edit-1',
      artDirection: 'Use a blue plate',
      referenceArtUrl: 'https://example.test/current.png',
    })).resolves.toEqual(candidate);

    expect(generateRecipePageImage).toHaveBeenCalledWith(expect.objectContaining({
      selectOnComplete: false,
      artDirection: 'Use a blue plate',
      referenceArtUrl: 'https://example.test/current.png',
    }));
  });
});
