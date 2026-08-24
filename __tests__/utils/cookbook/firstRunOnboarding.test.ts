import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultFirstRunOnboardingState,
  isFirstRunCapture,
  loadFirstRunOnboardingState,
  markFirstPageReaderCueSeen,
  recordFirstCaptureStarted,
  recordFirstCookbookCreated,
  recordFirstReadyRecipeOpened,
  saveFirstRunOnboardingStatus,
  shouldPresentFirstRunWelcome,
} from '@/utils/cookbook/firstRunOnboarding';

describe('first-run onboarding state', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts pending and stores progress per user', async () => {
    expect(await loadFirstRunOnboardingState('user-a')).toEqual(defaultFirstRunOnboardingState());

    await saveFirstRunOnboardingStatus('user-a', 'completed');

    expect((await loadFirstRunOnboardingState('user-a')).status).toBe('completed');
    expect((await loadFirstRunOnboardingState('user-b')).status).toBe('pending');
  });

  it('only presents on an empty, ready shelf with no share work in progress', () => {
    const eligible = {
      isReady: true,
      cookbookCount: 0,
      status: 'pending' as const,
      hasNativeShareWork: false,
    };

    expect(shouldPresentFirstRunWelcome(eligible)).toBe(true);
    expect(shouldPresentFirstRunWelcome({ ...eligible, status: 'started' })).toBe(true);
    expect(shouldPresentFirstRunWelcome({ ...eligible, status: 'skipped' })).toBe(false);
    expect(shouldPresentFirstRunWelcome({ ...eligible, cookbookCount: 1 })).toBe(false);
    expect(shouldPresentFirstRunWelcome({ ...eligible, hasNativeShareWork: true })).toBe(false);
    expect(shouldPresentFirstRunWelcome({ ...eligible, isReady: false })).toBe(false);
  });

  it('carries the activation journey from first book through first opened page', async () => {
    const bookState = await recordFirstCookbookCreated('user-a', 'book-1');
    expect(bookState.status).toBe('started');
    expect(bookState.firstCookbookId).toBe('book-1');
    expect(isFirstRunCapture(bookState, 'book-1')).toBe(true);
    expect(isFirstRunCapture(bookState, 'book-2')).toBe(false);

    const capture = await recordFirstCaptureStarted('user-a', 'capture-1', 'book-1');
    expect(capture.didRecord).toBe(true);
    expect(capture.state.firstCaptureId).toBe('capture-1');

    const duplicateCapture = await recordFirstCaptureStarted('user-a', 'capture-2', 'book-1');
    expect(duplicateCapture.didRecord).toBe(false);
    expect(duplicateCapture.state.firstCaptureId).toBe('capture-1');

    const activation = await recordFirstReadyRecipeOpened('user-a', 'book-1', 'page-1');
    expect(activation.didActivate).toBe(true);
    expect(activation.state).toMatchObject({
      status: 'completed',
      firstPageId: 'page-1',
      readerCueSeen: false,
    });

    const seen = await markFirstPageReaderCueSeen('user-a');
    expect(seen.readerCueSeen).toBe(true);
  });

  it('does not attach skipped onboarding to later cookbook activity', async () => {
    await saveFirstRunOnboardingStatus('user-a', 'skipped');

    const bookState = await recordFirstCookbookCreated('user-a', 'book-1');
    const capture = await recordFirstCaptureStarted('user-a', 'capture-1', 'book-1');
    const activation = await recordFirstReadyRecipeOpened('user-a', 'book-1', 'page-1');

    expect(bookState.status).toBe('skipped');
    expect(capture.didRecord).toBe(false);
    expect(activation.didActivate).toBe(false);
  });
});
