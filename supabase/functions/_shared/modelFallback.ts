export interface ModelAttemptResult<T> {
  model: string;
  value: T;
}

export type RecipeExtractionSourceType = 'url' | 'text' | 'image' | 'audio' | 'video';

export function recipeSourceUsesModelFallback(sourceType: RecipeExtractionSourceType): boolean {
  return sourceType !== 'video';
}

export function distinctModels(...models: Array<string | undefined>): string[] {
  return [...new Set(models.map((model) => model?.trim()).filter(
    (model): model is string => Boolean(model),
  ))];
}

export function resilientModelOrder(
  primaryModel: string,
  ...fallbackModels: Array<string | undefined>
): string[] {
  const models = distinctModels(primaryModel, ...fallbackModels);
  return models.length > 1 ? [...models, primaryModel] : models;
}

export async function tryModelsInOrder<T>(
  models: string[],
  attempt: (model: string, index: number) => Promise<T>,
): Promise<ModelAttemptResult<T>> {
  let lastError: unknown;
  for (let index = 0; index < models.length; index += 1) {
    const model = models[index]!;
    try {
      return { model, value: await attempt(model, index) };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Every configured model failed');
}
