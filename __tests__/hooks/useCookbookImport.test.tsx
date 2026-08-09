import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { CookbookImportProvider, useCookbookImport } from '@/hooks/useCookbookImport';

jest.mock('@/utils/cookbook/api', () => ({
  parseRecipeSource: jest.fn(),
}));

jest.mock('@/utils/cookbook/templateFavorites', () => ({
  loadFavoriteRecipeTemplateIds: jest.fn().mockResolvedValue([]),
  saveFavoriteRecipeTemplateIds: jest.fn().mockResolvedValue(undefined),
}));

const mockLoadSourceDraft = jest.fn();
const mockSaveSourceDraft = jest.fn();

jest.mock('@/utils/cookbook/importDraft', () => ({
  loadSourceDraft: (...args: unknown[]) => mockLoadSourceDraft(...args),
  saveSourceDraft: (...args: unknown[]) => mockSaveSourceDraft(...args),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <CookbookImportProvider>{children}</CookbookImportProvider>;
}

describe('useCookbookImport source draft', () => {
  beforeEach(() => {
    mockLoadSourceDraft.mockReset().mockResolvedValue('');
    mockSaveSourceDraft.mockReset().mockResolvedValue(undefined);
  });

  it('restores typed source text but never restores an image attachment', async () => {
    mockLoadSourceDraft.mockResolvedValue('https://example.com/saved-recipe');
    const { result } = renderHook(() => useCookbookImport(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.sourceInput).toBe('https://example.com/saved-recipe');
    expect(result.current.sourceImageBase64).toBeNull();
    expect(mockLoadSourceDraft).toHaveBeenCalledWith('user-1');
  });

  it('keeps new input when it is entered before restoration completes', async () => {
    let resolveSavedInput: (input: string) => void = () => {};
    mockLoadSourceDraft.mockReturnValueOnce(new Promise((resolve) => {
      resolveSavedInput = resolve;
    }));
    const { result } = renderHook(() => useCookbookImport(), { wrapper });

    act(() => result.current.setSourceInput('A newly pasted recipe'));
    await act(async () => {
      resolveSavedInput('An older saved recipe');
      await Promise.resolve();
    });

    expect(result.current.sourceInput).toBe('A newly pasted recipe');
    expect(mockSaveSourceDraft).toHaveBeenCalledWith('user-1', 'A newly pasted recipe');
  });

  it('keeps capture input in provider state until it is explicitly cleared', async () => {
    const { result } = renderHook(() => useCookbookImport(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setSourceInput('https://example.com/recipe');
      result.current.setSourceImageBase64('image-data');
    });

    expect(result.current.sourceInput).toBe('https://example.com/recipe');
    expect(result.current.sourceImageBase64).toBe('image-data');

    act(() => result.current.clearSourceDraft());

    expect(result.current.sourceInput).toBe('');
    expect(result.current.sourceImageBase64).toBeNull();
    expect(mockSaveSourceDraft).toHaveBeenLastCalledWith('user-1', '');
  });
});
