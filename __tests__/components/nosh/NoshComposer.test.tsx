import React from 'react';
import { Platform, StyleSheet, TextInput } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NoshComposer } from '@/components/nosh/conversation/NoshComposer';
import type { NoshInteractionSession } from '@/types/noshInteraction';

const mockLaunchImageLibraryAsync = jest.fn();
const mockComposer = {
  addAttachment: jest.fn(async () => undefined),
  clearAttachments: jest.fn(async () => undefined),
  setText: jest.fn((text: string) => {
    if (mockStoreEchoEnabled) {
      mockAuiState.composer.text = text;
      mockAuiState.composer.isEmpty = text.length === 0;
    }
  }),
  getState: jest.fn(() => mockAuiState.composer),
  subscribe: jest.fn((_callback: () => void) => () => undefined),
};
let mockStoreEchoEnabled = true;
const mockAui = {
  composer: mockComposer,
  subscribe: jest.fn((_callback: () => void) => () => undefined),
};
const mockAuiState = {
  composer: { isEmpty: true, text: '' },
  thread: { isRunning: false },
};
const mockConversation = {
  pendingImageBase64: null as string | null,
  pendingImageMimeType: null as string | null,
  setPendingImageBase64: jest.fn((value: string | null) => {
    mockConversation.pendingImageBase64 = value;
  }),
  setPendingImageMimeType: jest.fn((value: string | null) => {
    mockConversation.pendingImageMimeType = value;
  }),
};

jest.mock('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => mockConversation,
}));

jest.mock('@assistant-ui/react-native', () => {
  const ReactModule = require('react');
  const { Pressable, TextInput: NativeTextInput, View } = require('react-native');
  return {
    useAui: () => mockAui,
    useAuiState: (selector: (state: typeof mockAuiState) => unknown) => selector(mockAuiState),
    ComposerPrimitive: {
      Root: ({ children, ...props }: { children: React.ReactNode }) => (
        ReactModule.createElement(View, props, children)
      ),
      Input: ({ submitMode: _submitMode, ...props }: { submitMode?: string }) => (
        ReactModule.createElement(NativeTextInput, {
          ...props,
          value: mockAuiState.composer.text,
          onChangeText: mockComposer.setText,
        })
      ),
      Send: ({ children, ...props }: { children: React.ReactNode }) => (
        ReactModule.createElement(Pressable, props, children)
      ),
      Cancel: ({ children, ...props }: { children: React.ReactNode }) => (
        ReactModule.createElement(Pressable, { accessibilityRole: 'button', ...props }, children)
      ),
    },
  };
});

const interaction: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

const captureInteraction: NoshInteractionSession = {
  entryPoint: 'cookbook-add',
  task: 'capture',
  focus: { kind: 'cookbook', cookbookId: 'book-1', title: 'Dinner' },
};

describe('NoshComposer', () => {
  beforeEach(() => {
    mockAuiState.composer.isEmpty = true;
    mockAuiState.composer.text = '';
    mockAuiState.thread.isRunning = false;
    mockStoreEchoEnabled = true;
    mockConversation.pendingImageBase64 = null;
    mockConversation.pendingImageMimeType = null;
    mockComposer.addAttachment.mockClear();
    mockComposer.clearAttachments.mockClear();
    mockComposer.setText.mockClear();
    mockConversation.setPendingImageBase64.mockClear();
    mockConversation.setPendingImageMimeType.mockClear();
    mockLaunchImageLibraryAsync.mockReset();
  });

  it('grows the native multiline input until the compact maximum height', () => {
    const screen = render(
      <NoshComposer interaction={interaction} />,
    );
    const input = screen.UNSAFE_getByType(TextInput);

    expect(input.props.multiline).toBe(true);
    expect(input.props.numberOfLines).toBe(1);
    expect(input.props.scrollEnabled).toBe(Platform.OS === 'web');
    expect(input.props.maxFontSizeMultiplier).toBe(2);

    if (Platform.OS !== 'web') {
      fireEvent(input, 'contentSizeChange', {
        nativeEvent: { contentSize: { width: 240, height: 88 } },
      });
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(TextInput).props.style).height).toBe(88);

      fireEvent(screen.UNSAFE_getByType(TextInput), 'contentSizeChange', {
        nativeEvent: { contentSize: { width: 240, height: 180 } },
      });
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(TextInput).props.style).height).toBe(120);
      expect(screen.UNSAFE_getByType(TextInput).props.scrollEnabled).toBe(true);
    }
  });

  it('makes a newly entered second line visible before native content measurement catches up', () => {
    if (Platform.OS === 'web') return;

    const screen = render(<NoshComposer interaction={interaction} />);
    const input = screen.getByLabelText('Message Folio');

    fireEvent.changeText(input, 'Hey\nHg');

    expect(StyleSheet.flatten(screen.getByLabelText('Message Folio').props.style).height).toBe(60);
  });

  it('does not inflate an empty native input when iOS reports its padded content height', () => {
    if (Platform.OS === 'web') return;

    const screen = render(<NoshComposer interaction={interaction} />);
    const input = screen.getByLabelText('Message Folio');

    fireEvent(input, 'contentSizeChange', {
      nativeEvent: { contentSize: { width: 240, height: 44 } },
    });

    expect(StyleSheet.flatten(screen.getByLabelText('Message Folio').props.style).height).toBe(44);
  });

  it('keeps the native draft stable while the runtime store echoes text asynchronously', () => {
    mockStoreEchoEnabled = false;
    const screen = render(<NoshComposer interaction={interaction} />);
    const input = screen.getByLabelText('Message Folio');

    fireEvent.changeText(input, 'This sentence should not jump backwards while I type.');
    fireEvent(input, 'contentSizeChange', {
      nativeEvent: { contentSize: { width: 240, height: 88 } },
    });

    expect(screen.getByLabelText('Message Folio').props.value)
      .toBe('This sentence should not jump backwards while I type.');
    expect(mockComposer.setText)
      .toHaveBeenLastCalledWith('This sentence should not jump backwards while I type.');
  });

  it('keeps send and stop in the same compact action position', () => {
    const screen = render(
      <NoshComposer interaction={interaction} />,
    );
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Stop response' })).toBeNull();

    mockAuiState.thread.isRunning = true;
    screen.rerender(<NoshComposer interaction={interaction} />);

    const stop = screen.getByRole('button', { name: 'Stop response' });
    expect(StyleSheet.flatten(stop.props.style)).toEqual(expect.objectContaining({ width: 44, height: 44 }));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
  });

  it('shows the selected photo inside the composer and removes its automatic prompt with it', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{
        base64: 'photo-data',
        mimeType: 'image/png',
        fileName: 'recipe.png',
      }],
    });
    const screen = render(
      <NoshComposer interaction={captureInteraction} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Attach image or screenshot' }));
    await waitFor(() => {
      expect(mockConversation.setPendingImageBase64).toHaveBeenCalledWith('photo-data');
      expect(mockComposer.setText).toHaveBeenCalledWith('Add this recipe from the attached photo');
    });

    screen.rerender(<NoshComposer interaction={captureInteraction} />);
    expect(screen.getByLabelText('Attached recipe photo')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Remove recipe photo' }));

    await waitFor(() => {
      expect(mockComposer.clearAttachments).toHaveBeenCalled();
      expect(mockComposer.setText).toHaveBeenLastCalledWith('');
    });
  });
});
