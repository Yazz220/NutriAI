import { getNoshRevealLength } from '@/components/nosh/conversation/noshStreaming';

describe('getNoshRevealLength', () => {
  it('reveals a bounded prefix while tokens are arriving', () => {
    expect(getNoshRevealLength(0, 60, false)).toBe(10);
    expect(getNoshRevealLength(58, 60, false)).toBe(59);
  });

  it('catches up faster once the response is complete', () => {
    expect(getNoshRevealLength(0, 60, true)).toBe(20);
    expect(getNoshRevealLength(59, 60, true)).toBe(60);
  });

  it('never reveals beyond the available text', () => {
    expect(getNoshRevealLength(10, 10, false)).toBe(10);
    expect(getNoshRevealLength(9, 10, true)).toBe(10);
  });
});
