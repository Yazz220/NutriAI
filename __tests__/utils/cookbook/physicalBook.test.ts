import {
  buildPageCurlCurve,
  computeRowTurnProgress,
  estimateTurnSettleDuration,
  getSheetTurnProgress,
  resolveBookStageTranslation,
  resolveNativeBookGeometry,
  resolveNativeReadingPageGeometry,
  resolveTurnProgress,
  resolveTurnRelease,
  shouldCommitPageTurn,
} from '@/utils/cookbook/physicalBook';

describe('physical cookbook page turns', () => {
  describe('native book geometry', () => {
    it('keeps a compact open spread inside the iPhone viewport', () => {
      const geometry = resolveNativeBookGeometry(430, 932, true);

      expect(geometry.stageWidth).toBeLessThanOrEqual(430 - 16);
      expect(geometry.hingeX).toBeCloseTo(215);
    });

    it('attaches both closed covers to the same center hinge', () => {
      const geometry = resolveNativeBookGeometry(430, 932, true);
      const centeredCoverLeft = 430 / 2 - geometry.pageWidth / 2;

      expect(centeredCoverLeft + geometry.frontCoverOffsetX).toBeCloseTo(geometry.hingeX);
      expect(centeredCoverLeft + geometry.backCoverOffsetX + geometry.pageWidth).toBeCloseTo(geometry.hingeX);
    });

    it('centers the closed cover and settles the open spread at center', () => {
      expect(resolveBookStageTranslation(0, 300)).toBe(-150);
      expect(resolveBookStageTranslation(0.5, 300)).toBe(-75);
      expect(resolveBookStageTranslation(1, 300)).toBe(0);
    });

    it('keeps the one-page binding directly across the page hinge', () => {
      const geometry = resolveNativeReadingPageGeometry(430, 932);

      expect(geometry.pageOffsetX).toBeLessThanOrEqual(10);
      expect(geometry.bindingLeft).toBeLessThan(geometry.pageOffsetX);
      expect(geometry.bindingLeft + geometry.bindingWidth).toBeGreaterThan(geometry.pageOffsetX);
      expect(geometry.stageWidth).toBeLessThan(430);
    });
  });

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

    it('tracks pointer position with symmetrical travel from a free-edge grab', () => {
      const base = { grabX: pageWidth, pageWidth, direction: 1 as const, canTurn: true };
      // travel = 2 * |targetX - grabX| = 2 * 390 = 780
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth })).toBe(0);
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth / 2 })).toBeCloseTo(0.25);
      expect(resolveTurnProgress({ ...base, pointerX: 0 })).toBeCloseTo(0.5);
      expect(resolveTurnProgress({ ...base, pointerX: -pageWidth })).toBeCloseTo(1);
    });

    it('follows the finger back when the drag reverses', () => {
      const base = { grabX: pageWidth, pageWidth, direction: 1 as const, canTurn: true };
      // travel = 780; at pointerX=100: (390-100)/780 ≈ 0.37
      expect(resolveTurnProgress({ ...base, pointerX: 100 })).toBeCloseTo(0.37, 1);
      // at pointerX=300: (390-300)/780 ≈ 0.12
      expect(resolveTurnProgress({ ...base, pointerX: 300 })).toBeCloseTo(0.12, 1);
    });

    it('anchors travel to the grab point for mid-page grabs', () => {
      const grabX = pageWidth * 0.5;
      const base = { grabX, pageWidth, direction: 1 as const, canTurn: true };
      // travel = 2 * |0 - 195| = 390; at pointerX=0: 195/390 = 0.5
      expect(resolveTurnProgress({ ...base, pointerX: grabX })).toBe(0);
      expect(resolveTurnProgress({ ...base, pointerX: 0 })).toBeCloseTo(0.5);
    });

    it('mirrors the mapping for backward turns', () => {
      const base = { grabX: 0, pageWidth, direction: -1 as const, canTurn: true };
      // travel = 2 * |390 - 0| = 780; at pointerX=195: 195/780 = 0.25
      expect(resolveTurnProgress({ ...base, pointerX: 0 })).toBe(0);
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth / 2 })).toBeCloseTo(0.25);
      expect(resolveTurnProgress({ ...base, pointerX: pageWidth })).toBeCloseTo(0.5);
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

  describe('computeRowTurnProgress', () => {
    it('starts and ends flat across all rows regardless of grab position', () => {
      expect(computeRowTurnProgress(0, 0, 1)).toBe(0);
      expect(computeRowTurnProgress(0, 1, 1)).toBe(0);
      expect(computeRowTurnProgress(1, 0, 1)).toBe(1);
      expect(computeRowTurnProgress(1, 1, 1)).toBe(1);
    });

    it('returns uniform progress when grabbed at the vertical center', () => {
      expect(computeRowTurnProgress(0.5, 0, 0.5)).toBeCloseTo(0.5);
      expect(computeRowTurnProgress(0.5, 0.5, 0.5)).toBeCloseTo(0.5);
      expect(computeRowTurnProgress(0.5, 1, 0.5)).toBeCloseTo(0.5);
    });

    it('accelerates bottom rows and delays top rows on bottom-corner grab', () => {
      const topRow = computeRowTurnProgress(0.5, 0, 1);
      const bottomRow = computeRowTurnProgress(0.5, 1, 1);
      const midRow = computeRowTurnProgress(0.5, 0.5, 1);

      expect(bottomRow).toBeGreaterThan(0.5);
      expect(topRow).toBeLessThan(0.5);
      expect(midRow).toBeCloseTo(0.5);
    });

    it('accelerates top rows and delays bottom rows on top-corner grab', () => {
      const topRow = computeRowTurnProgress(0.5, 0, 0);
      const bottomRow = computeRowTurnProgress(0.5, 1, 0);
      const midRow = computeRowTurnProgress(0.5, 0.5, 0);

      expect(topRow).toBeGreaterThan(0.5);
      expect(bottomRow).toBeLessThan(0.5);
      expect(midRow).toBeCloseTo(0.5);
    });
  });
});
