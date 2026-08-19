import {
  clampShelfOffset,
  clampShelfVelocity,
  resolvePagedSnapTarget,
  resolveShelfPose,
  resolveShelfShadow,
  resolveSlotPosition,
  resolveSnapTarget,
  resolveSpineFacePose,
  shelfPitchAt,
  SHELF_CENTER_LIFT,
  SHELF_CENTER_SCALE,
  SHELF_FLANK_SCALE,
  SHELF_MAX_FLING_VELOCITY,
  SHELF_RUBBER_BAND,
  SHELF_SPINE_ANGLE,
  type ShelfGeometry,
} from '@/utils/cookbook/physicalShelf';

const geometry: ShelfGeometry = { centerPitch: 130, flankPitch: 38 };
const COVER_WIDTH = 180;
const SPINE_WIDTH = 26;

describe('spine-packed library shelf', () => {
  describe('resolveShelfPose', () => {
    it('faces the centered book forward, stepped toward the viewer', () => {
      const pose = resolveShelfPose(0, geometry);
      expect(pose.rotateY).toBe(0);
      expect(pose.translateX).toBe(0);
      expect(pose.scale).toBe(SHELF_CENTER_SCALE);
      expect(pose.translateY).toBe(-SHELF_CENTER_LIFT);
      expect(pose.spineBlend).toBe(0);
      expect(pose.opacity).toBe(1);
      expect(pose.zIndex).toBe(1000);
    });

    it('packs flank books spine-out at the spine angle', () => {
      const right = resolveShelfPose(1, geometry);
      const left = resolveShelfPose(-1, geometry);
      // All books rotate the same direction — spines toward the viewer,
      // like real volumes on a shelf.
      expect(right.rotateY).toBe(SHELF_SPINE_ANGLE);
      expect(left.rotateY).toBe(SHELF_SPINE_ANGLE);
      expect(right.scale).toBe(SHELF_FLANK_SCALE);
      expect(right.translateY).toBe(0);
      expect(right.spineBlend).toBeGreaterThan(0.99);
      expect(left.translateX).toBeLessThan(0);
      expect(right.translateX).toBeGreaterThan(0);
    });

    it('sweeps smoothly from cover to spine through the pivot', () => {
      const halfway = resolveShelfPose(0.5, geometry);
      expect(halfway.rotateY).toBeGreaterThan(0);
      expect(halfway.rotateY).toBeLessThan(SHELF_SPINE_ANGLE);
      expect(halfway.spineBlend).toBeGreaterThan(0);
      expect(halfway.spineBlend).toBeLessThan(1);
    });

    it('fades distant books and stacks the centered book on top', () => {
      expect(resolveShelfPose(4, geometry).opacity).toBe(0);
      expect(resolveShelfPose(0, geometry).zIndex).toBeGreaterThan(resolveShelfPose(1, geometry).zIndex);
    });
  });

  describe('resolveSlotPosition', () => {
    it('is monotonic and symmetric', () => {
      expect(resolveSlotPosition(0, geometry)).toBe(0);
      expect(resolveSlotPosition(1, geometry)).toBeGreaterThan(0);
      expect(resolveSlotPosition(2, geometry)).toBeGreaterThan(resolveSlotPosition(1, geometry));
      expect(resolveSlotPosition(-1, geometry)).toBe(-resolveSlotPosition(1, geometry));
    });

    it('packs flanks at the flank pitch beyond the first slot', () => {
      const p1 = resolveSlotPosition(1, geometry);
      const p2 = resolveSlotPosition(2, geometry);
      expect(p2 - p1).toBeCloseTo(geometry.flankPitch);
    });

    it('gives the centered book a wide berth', () => {
      // The pitch profile is centered on slot 0, so position(1) is the
      // average of center and flank pitches.
      expect(resolveSlotPosition(1, geometry)).toBeCloseTo((geometry.centerPitch + geometry.flankPitch) / 2);
    });
  });

  describe('shelfPitchAt', () => {
    it('is widest at the center and narrow on the flanks', () => {
      expect(shelfPitchAt(0, geometry)).toBe(geometry.centerPitch);
      expect(shelfPitchAt(1, geometry)).toBe(geometry.flankPitch);
      expect(shelfPitchAt(2, geometry)).toBe(geometry.flankPitch);
    });
  });

  describe('resolveSpineFacePose', () => {
    it('hides the spine edge-on when the cover faces forward', () => {
      const spine = resolveSpineFacePose(0, 0, geometry, COVER_WIDTH, SPINE_WIDTH);
      expect(spine.rotateY).toBe(-90);
      // Hinged at the cover's left edge.
      expect(spine.translateX).toBeCloseTo(-COVER_WIDTH / 2);
    });

    it('faces the viewer nearly flat when the book is spine-out', () => {
      const pose = resolveShelfPose(1, geometry);
      const spine = resolveSpineFacePose(1, pose.rotateY, geometry, COVER_WIDTH, SPINE_WIDTH);
      expect(Math.abs(spine.rotateY)).toBeLessThan(10);
      // The spine face sits near the slot position — the packed shelf shows
      // a row of spines at flank pitch.
      expect(spine.translateX).toBeGreaterThan(resolveSlotPosition(1, geometry) - COVER_WIDTH * 0.2);
    });
  });

  describe('resolveShelfShadow', () => {
    it('narrows to the spine footprint as the book pivots away', () => {
      const center = resolveShelfShadow(0, geometry, COVER_WIDTH, SPINE_WIDTH);
      const flank = resolveShelfShadow(1, geometry, COVER_WIDTH, SPINE_WIDTH);
      expect(center.scaleX).toBeCloseTo(1);
      expect(flank.scaleX).toBeLessThan(0.5);
      expect(center.opacity).toBeGreaterThan(flank.opacity);
    });
  });

  describe('resolveSnapTarget', () => {
    it('rounds to the nearest slot at rest', () => {
      expect(resolveSnapTarget(0.4, 0, 6)).toBe(0);
      expect(resolveSnapTarget(0.6, 0, 6)).toBe(1);
      expect(resolveSnapTarget(2.5, 0, 6)).toBe(3);
    });

    it('projects fling velocity past the nearest slot', () => {
      expect(resolveSnapTarget(0.1, 6, 6)).toBe(1);
      expect(resolveSnapTarget(2.9, -6, 6)).toBe(2);
    });

    it('clamps to the collection ends', () => {
      expect(resolveSnapTarget(-0.4, -8, 6)).toBe(0);
      expect(resolveSnapTarget(6.4, 8, 6)).toBe(6);
    });
  });

  describe('clampShelfVelocity', () => {
    it('caps fling speed at the shelf limit', () => {
      expect(clampShelfVelocity(16)).toBe(SHELF_MAX_FLING_VELOCITY);
      expect(clampShelfVelocity(-16)).toBe(-SHELF_MAX_FLING_VELOCITY);
      expect(clampShelfVelocity(1.2)).toBe(1.2);
    });
  });

  describe('resolvePagedSnapTarget', () => {
    it('never travels more than one slot from the nearest detent', () => {
      expect(resolvePagedSnapTarget(0.1, 16, 6)).toBe(1);
      expect(resolvePagedSnapTarget(0.1, -16, 6)).toBe(0);
      expect(resolvePagedSnapTarget(2.4, 16, 6)).toBe(3);
      expect(resolvePagedSnapTarget(2.6, -16, 6)).toBe(2);
    });

    it('still respects the collection ends', () => {
      expect(resolvePagedSnapTarget(0.2, -16, 6)).toBe(0);
      expect(resolvePagedSnapTarget(5.8, 16, 6)).toBe(6);
    });

    it('rounds to the nearest slot on a slow release', () => {
      expect(resolvePagedSnapTarget(1.3, 0.2, 6)).toBe(1);
      expect(resolvePagedSnapTarget(1.6, -0.2, 6)).toBe(2);
    });
  });

  describe('clampShelfOffset', () => {
    it('passes through offsets inside the collection', () => {
      expect(clampShelfOffset(0, 6)).toBe(0);
      expect(clampShelfOffset(3.2, 6)).toBe(3.2);
      expect(clampShelfOffset(6, 6)).toBe(6);
    });

    it('rubber-bands overscroll at both ends', () => {
      expect(clampShelfOffset(-2, 6)).toBeCloseTo(-2 * SHELF_RUBBER_BAND);
      expect(clampShelfOffset(8, 6)).toBeCloseTo(6 + 2 * SHELF_RUBBER_BAND);
    });
  });
});
