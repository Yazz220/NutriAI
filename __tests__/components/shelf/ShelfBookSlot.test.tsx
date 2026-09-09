import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ShelfBookSlot } from '@/components/shelf/ShelfBookSlot';
import { resolveShelfCarouselGeometry } from '@/utils/cookbook/physicalShelf';

jest.mock('@/components/physical-book/ContactShadow', () => ({ ContactShadow: () => null }));

describe('ShelfBookSlot', () => {
  const geometry = resolveShelfCarouselGeometry(180, [24, 24]);

  function renderSlot() {
    const onPress = jest.fn();
    const onOpenContextActions = jest.fn();
    const screen = render(
      <ShelfBookSlot
        index={0}
        shelfOffset={{ value: 0 } as never}
        geometry={geometry}
        coverWidth={180}
        height={225}
        spineWidth={24}
        stageCenterX={200}
        bottom={48}
        onPress={onPress}
        onOpenContextActions={onOpenContextActions}
        contextActions={[
          {
            id: 'book-actions',
            actions: [{ id: 'customize_cookbook', title: 'Customize cookbook', systemImage: 'paintbrush' }],
          },
        ]}
        onContextAction={jest.fn()}
        accessibilityLabel="Open Weeknight Table"
        cover={<Text>Cover</Text>}
        spine={<Text>Spine</Text>}
      />,
    );

    return { screen, onPress, onOpenContextActions };
  }

  it('keeps an ordinary tap wired directly to opening the book', () => {
    const { screen, onPress } = renderSlot();

    fireEvent.press(screen.getAllByRole('button', { name: 'Open Weeknight Table' })[1]);

    expect(onPress).toHaveBeenCalledWith(0);
  });

  it('opens actions on long press without also opening the book on release', () => {
    const { screen, onPress, onOpenContextActions } = renderSlot();
    const cover = screen.getAllByRole('button', { name: 'Open Weeknight Table' })[1];

    fireEvent(cover, 'pressIn');
    fireEvent(cover, 'longPress');
    fireEvent.press(cover);

    expect(onOpenContextActions).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});
