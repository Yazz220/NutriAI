import { resolvePageBlockPresentation } from '@/components/physical-book/PageBlockEdges';

describe('PageBlockEdges closed-cover presentation', () => {
  it('keeps the page block tucked beneath a straight-on cover', () => {
    const presentation = resolvePageBlockPresentation(8, 4, 0);

    expect(presentation.foreReveal).toBeGreaterThan(presentation.tailReveal);
    expect(presentation.foreReveal).toBeLessThanOrEqual(2);
    expect(presentation.tailReveal).toBeLessThanOrEqual(1);
    expect(presentation.headReveal).toBeLessThanOrEqual(1);
    expect(presentation.foreReveal).toBeLessThan(8 / 3);
  });

  it('reveals more binding depth in a tilted shelf pose without exposing the full block', () => {
    const front = resolvePageBlockPresentation(8, 4, 0);
    const tilted = resolvePageBlockPresentation(8, 4, -18);

    expect(tilted.foreReveal).toBeGreaterThan(front.foreReveal);
    expect(tilted.tailReveal).toBeGreaterThan(front.tailReveal);
    expect(tilted.foreReveal).toBeLessThan(8 / 2);
    expect(tilted.tailReveal).toBeLessThan(8 / 4);
  });
});
