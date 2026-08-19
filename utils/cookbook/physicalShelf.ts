/**
 * Spine-packed library shelf math. Every function is a pure worklet so the
 * shelf can derive per-book poses on the UI thread from a single shared
 * offset — the same pattern as `physicalBook.ts` (page-turn physics).
 *
 * Model: books stand packed on the shelf with their SPINES facing the
 * viewer (like a real library). One shared value (`shelfOffset`, in slot
 * units) is the carousel position; each book computes
 * `offset = index - shelfOffset` and maps it to a pose:
 *
 * - The centered book (offset 0) pivots to face forward: rotateY 0°,
 *   stepped slightly forward (scale + lift).
 * - Flank books (|offset| ≥ 1) rotate to ~82°, showing their spine face — a
 *   separate perpendicular plane hinged at the cover's left edge — and pack
 *   tightly at a pitch of spine width + gap.
 *
 * Because slot pitch is wide at the center (full cover) and narrow on the
 * flanks (spine only), horizontal position is the INTEGRAL of a pitch
 * profile rather than a fixed spacing multiplier.
 */

/** Flank rotation: the spine faces the viewer, the cover faces screen-right. */
export const SHELF_SPINE_ANGLE = 82;
/** The centered book steps toward the viewer. */
export const SHELF_CENTER_SCALE = 1.05;
export const SHELF_FLANK_SCALE = 0.9;
/** Vertical lift (px) as a book reaches the center — stepping off the shelf. */
export const SHELF_CENTER_LIFT = 10;
/** Rubber-band damping applied to overscroll past the shelf ends. */
export const SHELF_RUBBER_BAND = 0.35;
/** Seconds of fling velocity projected forward when choosing a snap target. */
export const SHELF_FLING_PROJECTION_SECONDS = 0.12;
/** Max fling speed carried into the snap (slots/sec) — keeps flicks from
 * whipping through the whole shelf when the flank pitch is narrow. */
export const SHELF_MAX_FLING_VELOCITY = 2.5;
/** Release speed (slots/sec) at which a flick commits to the next slot even
 * from a shallow drag — a deliberate flick always turns one page. */
export const SHELF_FLING_COMMIT_VELOCITY = 1.2;

export interface ShelfGeometry {
  /** Pitch between slot centers at the carousel center (cover needs room). */
  centerPitch: number;
  /** Pitch between slot centers on the flanks (spine width + shelf gap). */
  flankPitch: number;
}

export interface ShelfPose {
  /** Horizontal translation in px from the slot's home center. */
  translateX: number;
  /** Vertical translation in px (negative = lifted toward the viewer). */
  translateY: number;
  /** Y-axis rotation in degrees: 0 faces forward, +82 shows the spine. */
  rotateY: number;
  scale: number;
  opacity: number;
  /** Stacking order: the centered book renders above its neighbors. */
  zIndex: number;
  /** 0 at center → 1 on the flanks: how strongly the spine plane shows. */
  spineBlend: number;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function smoothstep01(value: number): number {
  'worklet';
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function interpolateLinear(value: number, input: number[], output: number[]): number {
  'worklet';
  if (value <= input[0]) return output[0];
  for (let i = 1; i < input.length; i += 1) {
    if (value <= input[i]) {
      const t = (value - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[output.length - 1];
}

/**
 * Slot pitch (px between adjacent slot centers) at distance t from the
 * carousel center. Wide near the center so the facing cover has room;
 * narrow past |1| where only spines show. Also used to scale gesture
 * deltas, so finger tracking stays consistent with on-screen motion.
 */
export function shelfPitchAt(t: number, geometry: ShelfGeometry): number {
  'worklet';
  const span = geometry.centerPitch - geometry.flankPitch;
  return geometry.flankPitch + span * (1 - smoothstep01(t));
}

/**
 * Horizontal position of the slot center at offset x (slot units) — the
 * integral of the pitch profile, so it is smooth and monotonic through the
 * center's wide berth into the flanks' tight packing.
 */
export function resolveSlotPosition(x: number, geometry: ShelfGeometry): number {
  'worklet';
  const a = Math.abs(x);
  const span = geometry.centerPitch - geometry.flankPitch;
  let distance: number;
  if (a <= 1) {
    // ∫0^a (1 - smoothstep(t)) dt = a - a³ + a⁴/2
    distance = geometry.flankPitch * a + span * (a - Math.pow(a, 3) + Math.pow(a, 4) / 2);
  } else {
    // G(1) = flankPitch + span/2, then linear at the flank pitch.
    distance = geometry.flankPitch + span * 0.5 + geometry.flankPitch * (a - 1);
  }
  return x < 0 ? -distance : distance;
}

/**
 * Maps a book's distance from the carousel center to its cover pose. The
 * centered book faces forward and steps forward; flank books pivot to
 * SHELF_SPINE_ANGLE (spine toward the viewer — all books rotate the same
 * direction, like real volumes on a shelf) and recede slightly.
 */
export function resolveShelfPose(offset: number, geometry: ShelfGeometry): ShelfPose {
  'worklet';
  const distance = Math.abs(offset);
  const sweep = smoothstep01(distance);
  return {
    translateX: resolveSlotPosition(offset, geometry),
    translateY: sweep >= 1 ? 0 : -SHELF_CENTER_LIFT * (1 - sweep),
    rotateY: SHELF_SPINE_ANGLE * sweep,
    scale: SHELF_CENTER_SCALE + (SHELF_FLANK_SCALE - SHELF_CENTER_SCALE) * sweep,
    opacity: interpolateLinear(distance, [0, 2.4, 3.2], [1, 1, 0]),
    zIndex: Math.round(1000 - distance * 10),
    spineBlend: smoothstep01(distance * 1.15),
  };
}

export interface SpineFacePose {
  translateX: number;
  rotateY: number;
}

/**
 * The spine is a perpendicular plane hinged at the cover's left edge. Its
 * on-screen anchor is the hinge position rotated into view:
 * local (-coverWidth/2, +spineWidth/2 depth) rotated by the pose angle.
 * At rotateY 0° the plane is edge-on (invisible); at 82° it faces the
 * viewer nearly flat.
 */
export function resolveSpineFacePose(
  offset: number,
  rotateY: number,
  geometry: ShelfGeometry,
  coverWidth: number,
  spineWidth: number,
): SpineFacePose {
  'worklet';
  const theta = (rotateY * Math.PI) / 180;
  const hinge = (-coverWidth / 2) * Math.cos(theta) + (spineWidth / 2) * Math.sin(theta);
  return {
    translateX: resolveSlotPosition(offset, geometry) + hinge,
    rotateY: rotateY - 90,
  };
}

export interface ShelfShadowPose {
  translateX: number;
  scaleX: number;
  opacity: number;
}

/**
 * Contact shadow on the shelf board. Follows the visible silhouette: the
 * full cover footprint at center, narrowing to the spine footprint on the
 * flanks.
 */
export function resolveShelfShadow(
  offset: number,
  geometry: ShelfGeometry,
  coverWidth: number,
  spineWidth: number,
): ShelfShadowPose {
  'worklet';
  const pose = resolveShelfPose(offset, geometry);
  const spine = resolveSpineFacePose(offset, pose.rotateY, geometry, coverWidth, spineWidth);
  const blend = pose.spineBlend;
  return {
    translateX: pose.translateX + (spine.translateX - pose.translateX) * blend,
    scaleX: 1 + (spineWidth / coverWidth - 1) * blend * 0.9,
    opacity: interpolateLinear(Math.abs(offset), [0, 1], [0.32, 0.2]) * pose.opacity,
  };
}

/**
 * Damps overscroll past the shelf ends so the collection resists instead of
 * scrolling into empty space. Inside [0, maxIndex] the offset passes through
 * untouched.
 */
export function clampShelfOffset(offset: number, maxIndex: number): number {
  'worklet';
  if (offset < 0) return offset * SHELF_RUBBER_BAND;
  if (offset > maxIndex) return maxIndex + (offset - maxIndex) * SHELF_RUBBER_BAND;
  return offset;
}

/** Clamps release velocity (slots/sec) to the shelf's fling limit. */
export function clampShelfVelocity(velocity: number): number {
  'worklet';
  return clamp(velocity, -SHELF_MAX_FLING_VELOCITY, SHELF_MAX_FLING_VELOCITY);
}

/**
 * Chooses the slot to rest on after a pan ends. A fraction of the release
 * velocity (slots/sec) is projected forward so a flick carries past the
 * nearest slot, then the result rounds to the nearest slot and clamps to
 * the collection.
 */
export function resolveSnapTarget(offset: number, velocity: number, maxIndex: number): number {
  'worklet';
  const projected = offset + velocity * SHELF_FLING_PROJECTION_SECONDS;
  return clamp(Math.round(projected), 0, Math.max(0, maxIndex));
}

/**
 * Paged snap: like resolveSnapTarget, but a single release can travel at
 * most one slot from the nearest detent — the tactile page-by-page feel of
 * browsing a physical shelf. Velocity is clamped first so fast flicks don't
 * amplify through narrow flank pitches, and a deliberate flick (past
 * SHELF_FLING_COMMIT_VELOCITY) always commits one slot in its direction.
 */
export function resolvePagedSnapTarget(offset: number, velocity: number, maxIndex: number): number {
  'worklet';
  const max = Math.max(0, maxIndex);
  const clampedVelocity = clampShelfVelocity(velocity);
  const nearest = clamp(Math.round(offset), 0, max);
  let target = resolveSnapTarget(offset, clampedVelocity, maxIndex);
  if (target === nearest && Math.abs(clampedVelocity) >= SHELF_FLING_COMMIT_VELOCITY) {
    target = nearest + Math.sign(clampedVelocity);
  }
  return clamp(target, clamp(nearest - 1, 0, max), clamp(nearest + 1, 0, max));
}
