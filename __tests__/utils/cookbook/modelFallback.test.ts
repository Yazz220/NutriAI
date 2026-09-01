import {
  distinctModels,
  recipeSourceUsesModelFallback,
  resilientModelOrder,
  tryModelsInOrder,
} from '@/supabase/functions/_shared/modelFallback';

describe('model fallback', () => {
  it('covers every non-video recipe extraction source', () => {
    expect(recipeSourceUsesModelFallback('url')).toBe(true);
    expect(recipeSourceUsesModelFallback('text')).toBe(true);
    expect(recipeSourceUsesModelFallback('image')).toBe(true);
    expect(recipeSourceUsesModelFallback('audio')).toBe(true);
    expect(recipeSourceUsesModelFallback('video')).toBe(false);
  });

  it('removes blank and duplicate model names while preserving order', () => {
    expect(distinctModels('qwen/primary', ' ', 'gemini/fallback', 'qwen/primary')).toEqual([
      'qwen/primary',
      'gemini/fallback',
    ]);
  });

  it('retries the primary after an alternate model fails', () => {
    expect(resilientModelOrder('qwen/primary', 'gemini/fallback')).toEqual([
      'qwen/primary',
      'gemini/fallback',
      'qwen/primary',
    ]);
    expect(resilientModelOrder('qwen/primary', 'qwen/primary')).toEqual(['qwen/primary']);
  });

  it('uses the next model when the primary attempt fails', async () => {
    const attempts: string[] = [];
    const result = await tryModelsInOrder(['qwen/primary', 'gemini/fallback'], async (model) => {
      attempts.push(model);
      if (model === 'qwen/primary') throw new Error('timed out');
      return 'accepted recipe';
    });

    expect(attempts).toEqual(['qwen/primary', 'gemini/fallback']);
    expect(result).toEqual({ model: 'gemini/fallback', value: 'accepted recipe' });
  });

  it('preserves the final provider error when every model fails', async () => {
    await expect(tryModelsInOrder(['first', 'second'], async (model) => {
      throw new Error(`${model} failed`);
    })).rejects.toThrow('second failed');
  });
});
