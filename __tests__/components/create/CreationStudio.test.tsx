import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { CreationStudio } from '@/components/create/CreationStudio';

const sampleAssets = [
  { localUri: 'file:///illustrated-brownies.png', uri: 'file:///illustrated-brownies.png' },
  { localUri: 'file:///illustrated-cookies.png', uri: 'file:///illustrated-cookies.png' },
  { localUri: 'file:///editorial-brownies.png', uri: 'file:///editorial-brownies.png' },
  { localUri: 'file:///editorial-cookies.png', uri: 'file:///editorial-cookies.png' },
  { localUri: 'file:///heritage-brownies.png', uri: 'file:///heritage-brownies.png' },
  { localUri: 'file:///heritage-cookies.png', uri: 'file:///heritage-cookies.png' },
];

let resolveSampleAssets: ((assets: typeof sampleAssets) => void) | undefined;
const mockLoadAsync = jest.fn(() => new Promise<typeof sampleAssets>((resolve) => {
  resolveSampleAssets = resolve;
}));

jest.mock('expo-asset', () => ({
  Asset: { loadAsync: (...args: unknown[]) => mockLoadAsync(...args) },
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@/components/physical-book/PhysicalBook', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return {
    PhysicalBook: ({ title, coverStyle }: { title: string; coverStyle: string }) => (
      ReactModule.createElement(Text, {
        accessibilityLabel: `Book preview: ${title}, ${coverStyle}`,
      })
    ),
  };
});

describe('CreationStudio', () => {
  beforeEach(() => {
    mockLoadAsync.mockClear();
    mockLoadAsync.mockImplementation(() => new Promise<typeof sampleAssets>((resolve) => {
      resolveSampleAssets = resolve;
    }));
  });

  it('creates one book with independently selected cover and recipe-page styles', async () => {
    const onCreateBook = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <CreationStudio canCreate onCreateBook={onCreateBook} onSignIn={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Healthy Meals'), 'Desserts');
    fireEvent.press(screen.getByRole('button', { name: 'Midnight Leather cover' }));
    fireEvent.press(screen.getByText('Editorial'));
    fireEvent.press(screen.getByRole('button', { name: 'Add this cookbook to my shelf' }));

    await waitFor(() => {
      expect(onCreateBook).toHaveBeenCalledWith(
        'Desserts',
        'navy-leather',
        'studio-editorial',
      );
    });
  });

  it('downloads page samples before showing the native inside preview', async () => {
    const screen = render(
      <CreationStudio canCreate onCreateBook={jest.fn()} onSignIn={jest.fn()} />,
    );

    fireEvent.press(screen.getByText('Heritage'));

    expect(screen.getByText('Loading recipe samples')).toBeTruthy();
    await waitFor(() => expect(mockLoadAsync).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveSampleAssets?.(sampleAssets);
    });
    await waitFor(() => expect(screen.getByLabelText('Heritage brownie recipe sample')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Close cookbook preview' })).toBeTruthy();
    expect(screen.getByLabelText('Heritage cookie recipe sample')).toBeTruthy();
  });
});
