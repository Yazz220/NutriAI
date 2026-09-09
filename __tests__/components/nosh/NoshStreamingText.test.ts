import { parseNoshResponseBlocks } from '@/components/nosh/conversation/noshResponseFormatting';

describe('parseNoshResponseBlocks', () => {
  it('keeps paragraphs separated by blank lines', () => {
    expect(parseNoshResponseBlocks('First thought.\n\nSecond thought.')).toEqual([
      { kind: 'paragraph', text: 'First thought.' },
      { kind: 'paragraph', text: 'Second thought.' },
    ]);
  });

  it('joins wrapped lines within the same paragraph', () => {
    expect(parseNoshResponseBlocks('This is one\nwrapped paragraph.')).toEqual([
      { kind: 'paragraph', text: 'This is one wrapped paragraph.' },
    ]);
  });

  it('renders Folio bullets as distinct response blocks', () => {
    expect(parseNoshResponseBlocks('Try these:\n• Add lemon\n• Finish with herbs')).toEqual([
      { kind: 'paragraph', text: 'Try these:' },
      { kind: 'bullet', text: 'Add lemon' },
      { kind: 'bullet', text: 'Finish with herbs' },
    ]);
  });

  it('accepts a markdown-style bullet without requiring markdown rendering', () => {
    expect(parseNoshResponseBlocks('- Use a larger pan')).toEqual([
      { kind: 'bullet', text: 'Use a larger pan' },
    ]);
  });
});
