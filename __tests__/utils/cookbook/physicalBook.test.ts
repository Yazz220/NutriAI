import {
  clampPageTurnProgress,
  resolveAnchoredTurnProgress,
  resolveTurnGrabXForProgress,
  resolveTurnProgress,
  resolveTurnRelease,
  shouldCommitPageTurn,
} from '@/utils/cookbook/physicalBook';

// Phone-like one-page geometry: a ~361pt reading page on a 393pt screen.
const PAGE_WIDTH = 361;

describe('anchored turn progress (native drag-to-turn)', () => {
  it('starts at zero when the pointer has not moved', () => {
    expect(
      resolveAnchoredTurnProgress({ grabX: 370, pointerX: 370, pageWidth: PAGE_WIDTH, direction: 1, canTurn: true }),
    ).toBe(0);
  });

  it('crosses the spine at half progress and completes at the far side', () => {
    const grabX = 370;
    expect(
      resolveAnchoredTurnProgress({
        grabX,
        pointerX: grabX - PAGE_WIDTH,
        pageWidth: PAGE_WIDTH,
        direction: 1,
        canTurn: true,
      }),
    ).toBe(0.5);
    expect(
      resolveAnchoredTurnProgress({
        grabX,
        pointerX: grabX - 2 * PAGE_WIDTH,
        pageWidth: PAGE_WIDTH,
        direction: 1,
        canTurn: true,
      }),
    ).toBe(1);
  });

  it('mirrors the same travel for backward turns', () => {
    const grabX = 20;
    expect(
      resolveAnchoredTurnProgress({
        grabX,
        pointerX: grabX + PAGE_WIDTH,
        pageWidth: PAGE_WIDTH,
        direction: -1,
        canTurn: true,
      }),
    ).toBe(0.5);
    expect(
      resolveAnchoredTurnProgress({
        grabX,
        pointerX: grabX + 2 * PAGE_WIDTH,
        pageWidth: PAGE_WIDTH,
        direction: -1,
        canTurn: true,
      }),
    ).toBe(1);
  });

  it('is independent of the coordinate origin (screen and book units agree)', () => {
    const shift = 137;
    const base = resolveAnchoredTurnProgress({
      grabX: 370,
      pointerX: 200,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    const shifted = resolveAnchoredTurnProgress({
      grabX: 370 + shift,
      pointerX: 200 + shift,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    expect(shifted).toBeCloseTo(base, 10);
  });

  it('keeps the same sensitivity when the page is grabbed mid-leaf', () => {
    const edgeGrab = resolveAnchoredTurnProgress({
      grabX: 370,
      pointerX: 370 - 0.5 * PAGE_WIDTH,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    const midGrab = resolveAnchoredTurnProgress({
      grabX: 200,
      pointerX: 200 - 0.5 * PAGE_WIDTH,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    expect(midGrab).toBeCloseTo(edgeGrab, 10);
    expect(midGrab).toBeCloseTo(0.25, 10);
  });

  it('clamps to the 0..1 range instead of over-rotating', () => {
    expect(
      resolveAnchoredTurnProgress({
        grabX: 370,
        pointerX: -500,
        pageWidth: PAGE_WIDTH,
        direction: 1,
        canTurn: true,
      }),
    ).toBe(1);
    expect(
      resolveAnchoredTurnProgress({
        grabX: 370,
        pointerX: 500,
        pageWidth: PAGE_WIDTH,
        direction: 1,
        canTurn: true,
      }),
    ).toBe(0);
  });

  it('resists when there is no page to turn to', () => {
    const free = resolveAnchoredTurnProgress({
      grabX: 370,
      pointerX: 100,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    const resisted = resolveAnchoredTurnProgress({
      grabX: 370,
      pointerX: 100,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: false,
    });
    expect(resisted).toBeCloseTo(free * 0.08, 10);
  });
});

describe('turn grab inversion', () => {
  it.each([0.05, 0.3, 0.5, 0.8, 1])(
    'round-trips progress %d through the anchored formula (forward)',
    (progress) => {
      const pointerX = 123;
      const grabX = resolveTurnGrabXForProgress({ pointerX, progress, pageWidth: PAGE_WIDTH, direction: 1 });
      expect(
        resolveAnchoredTurnProgress({ grabX, pointerX, pageWidth: PAGE_WIDTH, direction: 1, canTurn: true }),
      ).toBeCloseTo(progress, 10);
    },
  );

  it.each([0.05, 0.5, 1])('round-trips progress %d through the anchored formula (backward)', (progress) => {
    const pointerX = 123;
    const grabX = resolveTurnGrabXForProgress({ pointerX, progress, pageWidth: PAGE_WIDTH, direction: -1 });
    expect(
      resolveAnchoredTurnProgress({ grabX, pointerX, pageWidth: PAGE_WIDTH, direction: -1, canTurn: true }),
    ).toBeCloseTo(progress, 10);
  });

  it('stays continuous when re-grabbing exactly at the spine (progress 0.5)', () => {
    // The old grab-relative travel model was singular here: progress 0.5
    // forced pointerX === targetX for any grab point, so re-grabbing a
    // half-turned page always snapped. The anchored inversion has no
    // singularity.
    const pointerX = 200;
    const grabX = resolveTurnGrabXForProgress({ pointerX, progress: 0.5, pageWidth: PAGE_WIDTH, direction: 1 });
    const beforeNudge = resolveAnchoredTurnProgress({
      grabX,
      pointerX,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    const afterNudge = resolveAnchoredTurnProgress({
      grabX,
      pointerX: pointerX - 2,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    expect(beforeNudge).toBe(0.5);
    expect(afterNudge - beforeNudge).toBeCloseTo(2 / (2 * PAGE_WIDTH), 10);
  });
});

describe('spine-crossing commit with anchored progress', () => {
  // Simulates a slow drag-and-hold from the page corner toward the binding,
  // released without flick velocity, using the same helpers the gesture
  // handler wires together.
  function releaseAfterDrag(dragDistance: number, velocityX = 0) {
    const pointerX = 370;
    const grabX = resolveTurnGrabXForProgress({ pointerX, progress: 0.05, pageWidth: PAGE_WIDTH, direction: 1 });
    const progress = resolveAnchoredTurnProgress({
      grabX,
      pointerX: pointerX - dragDistance,
      pageWidth: PAGE_WIDTH,
      direction: 1,
      canTurn: true,
    });
    return resolveTurnRelease({ progress, velocityX, direction: 1, pageWidth: PAGE_WIDTH });
  }

  it('commits a slow drag that carries the corner past the spine', () => {
    expect(releaseAfterDrag(PAGE_WIDTH).commit).toBe(true);
    expect(releaseAfterDrag(1.2 * PAGE_WIDTH).commit).toBe(true);
  });

  it('commits a near-full-width hold that used to snap back', () => {
    // Regression: with the old screen/page coordinate mix, releasing 95% of
    // the way across the page produced progress < 0.5 and cancelled.
    expect(releaseAfterDrag(0.95 * PAGE_WIDTH).commit).toBe(true);
  });

  it('cancels a slow drag released well before the spine', () => {
    expect(releaseAfterDrag(0.5 * PAGE_WIDTH).commit).toBe(false);
    expect(releaseAfterDrag(0.2 * PAGE_WIDTH).commit).toBe(false);
  });

  it('commits an early release when flicked with real velocity', () => {
    expect(releaseAfterDrag(0.2 * PAGE_WIDTH, -900).commit).toBe(true);
  });

  it('cancels a past-spine release when flicked hard back toward rest', () => {
    expect(releaseAfterDrag(1.3 * PAGE_WIDTH, 900).commit).toBe(false);
  });
});

describe('existing turn math contracts', () => {
  it('keeps the web scene grab-mirror travel semantics intact', () => {
    // The web scene passes targetX = grabX ∓ 2·(grabX − spineX) — the mirror
    // of the grab point across the canvas-center spine — and
    // resolveTurnProgress applies its own 2× mirror on top. Pin the resulting
    // calibration so the shared helper can't drift under the web scene.
    const spineX = 500;
    const startX = 900;
    const targetX = startX - 2 * (startX - spineX);
    expect(
      resolveTurnProgress({ grabX: startX, pointerX: spineX, pageWidth: 1000, direction: 1, canTurn: true, targetX }),
    ).toBe(0.25);
    expect(
      resolveTurnProgress({ grabX: startX, pointerX: targetX, pageWidth: 1000, direction: 1, canTurn: true, targetX }),
    ).toBe(0.5);
  });

  it('keeps the commit thresholds and progress clamp stable', () => {
    expect(clampPageTurnProgress(-1)).toBe(0);
    expect(clampPageTurnProgress(2)).toBe(1);
    expect(shouldCommitPageTurn(0.5, 0, 1, PAGE_WIDTH)).toBe(true);
    expect(shouldCommitPageTurn(0.49, 0, 1, PAGE_WIDTH)).toBe(false);
  });
});
