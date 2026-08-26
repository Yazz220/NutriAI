import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { RecipeCaptureResume } from '@/components/nosh/capture/RecipeCaptureResume';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const mockRetryCapture = jest.fn();
let mockCaptures: RecipeCapture[] = [];

jest.mock('@/hooks/useRecipeCaptures', () => ({
  useRecipeCaptures: () => ({
    captures: mockCaptures,
    retryCapture: mockRetryCapture,
  }),
}));

jest.mock('@/contexts/AiDataConsentContext', () => ({
  useAiDataConsent: () => ({ isGranted: true, isReady: true }),
}));

function staleCapture(processingAttempt: number): RecipeCapture {
  return {
    id: 'capture-1',
    userId: 'user-1',
    sourceType: 'url',
    sourcePayload: { input: 'https://example.com/recipe' },
    status: 'processing',
    extractionNotes: [],
    inferredFields: [],
    pageStatus: 'generating',
    idempotencyKey: 'capture-recovery-test-key',
    processingAttempt,
    processingStartedAt: '2026-08-20T00:00:00.000Z',
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  };
}

describe('RecipeCaptureResume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRetryCapture.mockResolvedValue(undefined);
    mockCaptures = [staleCapture(1)];
  });

  it('retries each stale processing attempt once, including a later crashed retry', async () => {
    const screen = render(<RecipeCaptureResume />);

    await waitFor(() => expect(mockRetryCapture).toHaveBeenCalledTimes(1));
    screen.rerender(<RecipeCaptureResume />);
    expect(mockRetryCapture).toHaveBeenCalledTimes(1);

    mockCaptures = [staleCapture(2)];
    screen.rerender(<RecipeCaptureResume />);

    await waitFor(() => expect(mockRetryCapture).toHaveBeenCalledTimes(2));
    expect(mockRetryCapture).toHaveBeenLastCalledWith('capture-1');
  });
});
