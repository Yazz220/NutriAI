import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  AiDataConsentProvider,
  useAiDataConsent,
} from '@/contexts/AiDataConsentContext';
import { loadAiDataConsent } from '@/utils/privacy/aiDataConsent';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

function ConsentProbe() {
  const { isGranted, isReady, requestConsent, reviewConsent } = useAiDataConsent();
  return (
    <>
      <Text>{isReady ? 'ready' : 'loading'}</Text>
      <Text>{isGranted ? 'granted' : 'not granted'}</Text>
      <Button title="Request permission" onPress={() => { void requestConsent(); }} />
      <Button title="Review permission" onPress={reviewConsent} />
    </>
  );
}

describe('AiDataConsentProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('explains external processing before storing permission', async () => {
    const screen = render(
      <AiDataConsentProvider>
        <ConsentProbe />
      </AiDataConsentProvider>,
    );
    await screen.findByText('ready');

    fireEvent.press(screen.getByRole('button', { name: 'Request permission' }));

    expect(await screen.findByText('AI data use')).toBeTruthy();
    expect(screen.getByText(/OpenRouter routes this content/)).toBeTruthy();
    expect(await loadAiDataConsent('user-1')).toBeNull();

    fireEvent.press(screen.getByTestId('allow-ai-data-processing'));

    await waitFor(() => expect(screen.getByText('granted')).toBeTruthy());
    await expect(loadAiDataConsent('user-1')).resolves.toEqual(expect.objectContaining({
      version: 1,
      grantedAt: expect.any(String),
    }));
  });

  it('lets the user withdraw permission from the review sheet', async () => {
    const screen = render(
      <AiDataConsentProvider>
        <ConsentProbe />
      </AiDataConsentProvider>,
    );
    await screen.findByText('ready');
    fireEvent.press(screen.getByRole('button', { name: 'Request permission' }));
    fireEvent.press(await screen.findByTestId('allow-ai-data-processing'));
    await screen.findByText('granted');

    fireEvent.press(screen.getByRole('button', { name: 'Review permission' }));
    fireEvent.press(await screen.findByTestId('withdraw-ai-data-processing'));

    await waitFor(() => expect(screen.getByText('not granted')).toBeTruthy());
    await expect(loadAiDataConsent('user-1')).resolves.toBeNull();
  });
});
