import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OpenBookInspector } from '@/components/create/OpenBookInspector';
import { getCookbookStyle } from '@/constants/cookbookStyles';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'Light' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/components/physical-book/ContactShadow', () => ({
  ContactShadow: () => null,
}));

jest.mock('@/components/physical-book/PhysicalBook', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return {
    PhysicalBook: ({ title }: { title: string }) => ReactModule.createElement(Text, null, title),
  };
});

describe('OpenBookInspector', () => {
  it('previews the cookbook identity without asking for a page template', () => {
    const screen = render(
      <OpenBookInspector preset={getCookbookStyle('sage-linen')} title="Weeknight Table" width={340} />,
    );

    expect(screen.getByText('Tap the cover to open')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open cookbook preview' }));

    expect(screen.getByText('Sage visual identity')).toBeTruthy();
    expect(screen.queryByLabelText('Sample cookbook pages')).toBeNull();
  });
});
