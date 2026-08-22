import React from 'react';
import { render } from '@testing-library/react-native';
import { NoshInteractionStateSync } from '@/components/nosh/conversation/NoshInteractionStateSync';
import type { NoshInteractionSession } from '@/types/noshInteraction';

const mockUpdateCustom = jest.fn(() => {
  throw new Error('Thread "_LOCALID_test" has status "new", so it cannot update custom metadata.');
});

jest.mock('@assistant-ui/react-native', () => ({
  useAui: () => ({
    threadListItem: {
      getState: () => ({ id: '_LOCALID_test', status: 'new', custom: undefined }),
      updateCustom: mockUpdateCustom,
    },
  }),
  useAuiState: (selector: (state: unknown) => unknown) => selector({
    threadListItem: { id: '_LOCALID_test', status: 'new', custom: undefined },
  }),
}));

const interaction: NoshInteractionSession = {
  entryPoint: 'shelf-nosh',
  task: 'collection',
  focus: { kind: 'collection' },
};

describe('NoshInteractionStateSync', () => {
  it('waits to persist interaction metadata while a local thread is new', () => {
    expect(() => render(
      <NoshInteractionStateSync
        interaction={interaction}
        onRestoreInteraction={jest.fn()}
        onThreadChanged={jest.fn()}
      />,
    )).not.toThrow();
    expect(mockUpdateCustom).not.toHaveBeenCalled();
  });
});
