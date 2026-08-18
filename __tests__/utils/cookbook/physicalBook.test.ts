import {
  buildPageCurlCurve,
  estimateTurnSettleDuration,
  getSheetTurnProgress,
  resolveTurnProgress,
  resolveTurnRelease,
  shouldCommitPageTurn,
} from '@/utils/cookbook/physicalBook';

describe('physical cookbook page turns', () => {
  it('keeps every sheet on a stable side except the active sheet', () => {
    expect(getSheetTurnProgress(0, 2, 0, 0)).toBe(1);
    expect(getSheetTurnProgress(1, 2, 0, 0)).toBe(1);
    expect(getSheetTurnProgress(2, 2, 0, 0)).toBe(0);
    expect(getSheetTurnProgress(3, 2, 0, 0)).toBe(0);

    expect(getSheetTurnProgress(2, 2, 1, 0.35)).toBeCloseTo(0.35);
    expect(getSheetTurnProgress(1, 2, -1, 0.35)).toBeCloseTo(0.65);
  });

  it('projects release velocity in the direction of travel', () => {
    expect(shouldCommitPageTurn(0.3, -900, 1, 390)).toBe(true);
    expect(shouldCommitPageTurn(0.3, 900, 1, 390)).toBe(false);
    expect(shouldCommitPageTurn(0.3, 900, -1, 390)).toBe(true);
    expect(shouldCommitPageTurn(0.3, -900, -1, 390)).toBe(false);
  });

  it('starts and lands flat while lifting the page through the middle', () => {
    const start = buildPageCurlCurve(2, 8, 0);
    const middle = buildPageCurlCurve(2, 8, 0.5);
    const end = buildPageCurlCurve(2, 8, 1);

    expect(start.at(-1)).toEqual({ x: 2, z: 0 });
    expect(middle.at(-1)?.z).toBeGreaterThan(0.75);
    expect(end.at(-1)?.x).toBeCloseTo(-2);
    expect(end.at(-1)?.z).toBeCloseTo(0);
  });

  describe('resolveTurnProgress', () => {
    const pageWidth = 390;

    it('tracks pointer position 1:1 from a free-edge grab', () => {
      const base = { grabX: pageWidth, pageWidth, direction: 1 as const, canTurn: true };
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth })).toBe(0);
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth / 2 })).toBeCloseTo(0.5);
      expect(resolveTurnProgress({ ...base, pointerX: 0 })).toBe(1);
      expect(resolveTurnProgress({ ...base, pointerX: -40 })).toBe(1);
    });

    it('follows the finger back when the drag reverses', () => {
      const base = { grabX: pageWidth, pageWidth, direction: 1 as const, canTurn: true };
      expect(resolveTurnProgress({ ...base, pointerX: 100 })).toBeCloseTo(0.74, 1);
      expect(resolveTurnProgress({ ...base, pointerX: 300 })).toBeCloseTo(0.23, 1);
    });

    it('anchors travel to the grab point for mid-page grabs', () => {
      const grabX = pageWidth * 0.5;
      const base = { grabX, pageWidth, direction: 1 as const, canTurn: true };
      expect(resolveTurnProgress({ ...base, pointerX: grabX })).toBe(0);
      expect(resolveTurnProgress({ ...base, pointerX: 0 })).toBe(1);
    });

    it('mirrors the mapping for backward turns', () => {
      const base = { grabX: 0, pageWidth, direction: -1 as const, canTurn: true };
      expect(resolveTurnProgress({ ...base, pointerX: 0 })).toBe(0);
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth / 2 })).toBeCloseTo(0.5);
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth })).toBe(1);
    });

    it('resists when no page exists in the grab direction', () => {
      const atEdge = {
        grabX: pageWidth,
        pointerX: 0,
        pageWidth,
        direction: 1 as const,
        canTurn: false,
      };
      expect(resolveTurnProgress(atEdge)).toBeLessThan(0.1);
    });
  });

  describe('resolveTurnRelease', () => {
    it('commits past the midpoint even without velocity', () => {
      const release = resolveTurnRelease({ progress: 0.6, velocityX: 0, direction: 1, pageWidth: 390 });
      expect(release.commit).toBe(true);
      expect(release.settleVelocity).toBeGreaterThan(0);
    });

    it('commits on a flick below the midpoint and carries the flick velocity', () => {
      const release = resolveTurnRelease({ progress: 0.2, velocityX: -1200, direction: 1, pageWidth: 390 });
      expect(release.commit).toBe(true);
      expect(release.settleVelocity).toBeGreaterThan(1.6);
    });

    it('cancels slow drags below the midpoint with negative settle velocity', () => {
      const release = resolveTurnRelease({ progress: 0.3, velocityX: 0, direction: 1, pageWidth: 390 });
      expect(release.commit).toBe(false);
      expect(release.settleVelocity).toBeLessThan(0);
    });

    it('mirrors velocity handling for backward turns', () => {
      const forwardFlick = resolveTurnRelease({ progress: 0.2, velocityX: 1200, direction: -1, pageWidth: 390 });
      const wrongWayFlick = resolveTurnRelease({ progress: 0.2, velocityX: -1200, direction: -1, pageWidth: 390 });
      expect(forwardFlick.commit).toBe(true);
      expect(wrongWayFlick.commit).toBe(false);
    });
  });

  describe('estimateTurnSettleDuration', () => {
    it('settles faster after a flick than after a slow release', () => {
      const flick = estimateTurnSettleDuration(0.2, 1, 4);
      const slow = estimateTurnSettleDuration(0.2, 1, 1.6);
      expect(flick).toBeLessThan(slow);
    });

    it('stays within the perceptual bounds', () => {
      expect(estimateTurnSettleDuration(0.99, 1, 0.5)).toBeGreaterThanOrEqual(0.18);
      expect(estimateTurnSettleDuration(0, 1, 0.5)).toBeLessThanOrEqual(1);
    });
  });
});
