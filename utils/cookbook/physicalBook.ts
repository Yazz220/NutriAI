export type PageTurnDirection = -1 | 0 | 1;

export interface PageCurlPoint {
  x: number;
  z: number;
}

export interface NativeBookGeometry {
  pageWidth: number;
  pageHeight: number;
  stageWidth: number;
  stageHeight: number;
  hingeX: number;
  frontCoverOffsetX: number;
  backCoverOffsetX: number;
  frameInset: number;
}

export interface NativeReadingPageGeometry {
  pageWidth: number;
  pageHeight: number;
  stageWidth: number;
  pageOffsetX: number;
  bindingLeft: number;
  bindingWidth: number;
}

const NATIVE_PAGE_ASPECT = 1.38;
const NATIVE_FRAME_INSET = 10;
const NATIVE_COMPACT_MARGIN = 8;
const NATIVE_REGULAR_MARGIN = 16;
const NATIVE_READING_PAGE_MARGIN = 16;
const NATIVE_READING_PAGE_RATIO = 1.35;
const NATIVE_READING_STAGE_GUTTER = 18;
const NATIVE_READING_BINDING_WIDTH = 14;

/**
 * Resolves one geometry model for the native cover, spread, and binding.
 * The stage includes the 10 pt board allowance on each outer edge, so that
 * allowance must be removed before sizing the two page leaves.
 */
export function resolveNativeBookGeometry(
  viewportWidth: number,
  viewportHeight: number,
  compact: boolean,
): NativeBookGeometry {
  const horizontalMargin = compact ? NATIVE_COMPACT_MARGIN : NATIVE_REGULAR_MARGIN;
  const widthBound = (viewportWidth - horizontalMargin * 2 - NATIVE_FRAME_INSET * 2) / 2;
  const heightBound = (viewportHeight - 210) / NATIVE_PAGE_ASPECT;
  const pageWidth = Math.max(120, Math.min(340, widthBound, heightBound));
  const pageHeight = pageWidth * NATIVE_PAGE_ASPECT;
  const stageWidth = pageWidth * 2 + NATIVE_FRAME_INSET * 2;

  return {
    pageWidth,
    pageHeight,
    stageWidth,
    stageHeight: pageHeight + 24,
    hingeX: viewportWidth / 2,
    frontCoverOffsetX: pageWidth / 2,
    backCoverOffsetX: -pageWidth / 2,
    frameInset: NATIVE_FRAME_INSET,
  };
}

/**
 * Keeps the closed front cover centered, then moves the full spread back to
 * center as the cover opens. The cover still rotates around the same hinge;
 * this only corrects the visual center of the changing silhouette.
 */
export function resolveBookStageTranslation(opening: number, pageWidth: number): number {
  'worklet';
  const progress = Math.max(0, Math.min(1, opening));
  if (progress === 1) return 0;
  return -(1 - progress) * pageWidth * 0.5;
}

/** Geometry shared by the one-page stack and its fixed left binding. */
export function resolveNativeReadingPageGeometry(
  viewportWidth: number,
  viewportHeight: number,
): NativeReadingPageGeometry {
  const pageWidth = Math.min(
    viewportWidth - NATIVE_READING_PAGE_MARGIN * 2,
    (viewportHeight - 190) / NATIVE_READING_PAGE_RATIO,
  );
  const pageHeight = pageWidth * NATIVE_READING_PAGE_RATIO;
  const stageWidth = Math.min(viewportWidth, pageWidth + NATIVE_READING_STAGE_GUTTER);
  const pageOffsetX = (stageWidth - pageWidth) / 2;

  return {
    pageWidth,
    pageHeight,
    stageWidth,
    pageOffsetX,
    bindingLeft: pageOffsetX - NATIVE_READING_BINDING_WIDTH / 2,
    bindingWidth: NATIVE_READING_BINDING_WIDTH,
  };
}

const RELEASE_PROJECTION_SECONDS = 0.18;
const RELEASE_COMMIT_PROGRESS = 0.5;
const PAGE_LIFT_RATIO = 0.48;
const EDGE_RESISTANCE = 0.08;
const MIN_SETTLE_VELOCITY = 1.6;
const MIN_SETTLE_DURATION = 0.18;
const MAX_SETTLE_DURATION = 1.0;

export function clampPageTurnProgress(progress: number): number {
  'worklet';
  return Math.max(0, Math.min(1, progress));
}

export function shouldCommitPageTurn(
  progress: number,
  velocityX: number,
  direction: Exclude<PageTurnDirection, 0>,
  pageWidth: number,
): boolean {
  'worklet';
  const current = clampPageTurnProgress(progress);
  const signedVelocity = direction === 1 ? -velocityX : velocityX;
  const velocityContribution = (signedVelocity / Math.max(pageWidth, 1)) * RELEASE_PROJECTION_SECONDS;
  const projectedProgress = current + velocityContribution;

  // If the user has dragged past 50%, commit unless actively flicking backward
  if (current >= 0.5 && velocityContribution > -0.2) {
    return true;
  }
  // If below 20%, cancel unless flicked forward with substantial speed
  if (current < 0.2 && velocityContribution < 0.3) {
    return false;
  }

  return projectedProgress >= RELEASE_COMMIT_PROGRESS;
}

export interface TurnGrab {
  /** Pointer x within the page stage at grab time. */
  grabX: number;
  /** Current pointer x within the page stage. */
  pointerX: number;
  /** Width of a single page leaf in the same coordinate space. */
  pageWidth: number;
  direction: Exclude<PageTurnDirection, 0>;
  /** False when there is no page to turn to in this direction. */
  canTurn: boolean;
  /**
   * Pointer x where the turn is considered complete. Defaults to the far
   * edge of the stage (0 for forward turns, pageWidth for backward turns).
   * The web scene passes the mirror of the grab point across the spine so
   * the corner tracks the cursor 1:1 over a two-page spread.
   */
  targetX?: number;
}

/**
 * Pointer-position-driven turn progress. The leaf follows the finger: moving
 * the pointer back toward the grab point reverses the page naturally, and the
 * turn completes when the pointer reaches the target. Grabbing mid-page
 * shortens the travel, as if you caught the page partway. When no page exists
 * in the grab direction the leaf resists instead of moving 1:1.
 */
export function resolveTurnProgress(grab: TurnGrab): number {
  'worklet';
  const { grabX, pointerX, pageWidth, direction, canTurn } = grab;
  const targetX = grab.targetX ?? (direction === 1 ? 0 : pageWidth);
  // Symmetrical travel: the full drag distance is twice the distance from
  // grab to target (mirror across the target line). This prevents the turn
  // from being too sensitive when grabbing near the spine.
  const travel = Math.max(2 * Math.abs(targetX - grabX), 1);
  const raw = direction === 1 ? (grabX - pointerX) / travel : (pointerX - grabX) / travel;
  const progress = clampPageTurnProgress(raw);
  return canTurn ? progress : progress * EDGE_RESISTANCE;
}

export interface TurnRelease {
  commit: boolean;
  /**
   * Signed velocity of the progress value itself (units/sec) at release.
   * Positive moves toward a completed turn, negative toward cancellation.
   * Feed into Reanimated's spring `velocity` or the web settle clock so a
   * flick carries through instead of restarting from zero energy.
   */
  settleVelocity: number;
}

export function resolveTurnRelease(input: {
  progress: number;
  velocityX: number;
  direction: Exclude<PageTurnDirection, 0>;
  pageWidth: number;
}): TurnRelease {
  'worklet';
  const { progress, velocityX, direction, pageWidth } = input;
  const commit = shouldCommitPageTurn(progress, velocityX, direction, pageWidth);
  const progressVelocity = direction === 1 ? -velocityX / Math.max(pageWidth, 1) : velocityX / Math.max(pageWidth, 1);
  const magnitude = Math.max(Math.abs(progressVelocity), MIN_SETTLE_VELOCITY);
  return { commit, settleVelocity: commit ? magnitude : -magnitude };
}

/**
 * Estimated seconds for a timed settle (used by the web scene, which advances
 * turns on a clock rather than a spring). Flicks land faster than slow
 * releases; the result is clamped so the leaf never snaps or drags.
 */
export function estimateTurnSettleDuration(progress: number, target: 0 | 1, settleVelocity: number): number {
  const distance = Math.abs(target - clampPageTurnProgress(progress));
  const speed = Math.max(Math.abs(settleVelocity), MIN_SETTLE_VELOCITY);
  const duration = speed > 0 ? distance / speed : MAX_SETTLE_DURATION;
  return Math.min(MAX_SETTLE_DURATION, Math.max(MIN_SETTLE_DURATION, duration));
}

export function getSheetTurnProgress(
  sheetIndex: number,
  currentPageIndex: number,
  direction: PageTurnDirection,
  gestureProgress: number,
): number {
  const progress = clampPageTurnProgress(gestureProgress);

  if (direction === 1 && sheetIndex === currentPageIndex) return progress;
  if (direction === -1 && sheetIndex === currentPageIndex - 1) return 1 - progress;
  return sheetIndex < currentPageIndex ? 1 : 0;
}

export function buildPageCurlCurve(width: number, segmentCount: number, progress: number): PageCurlPoint[] {
  'worklet';
  const safeSegments = Math.max(1, Math.floor(segmentCount));
  const pageProgress = clampPageTurnProgress(progress);
  const segmentWidth = width / safeSegments;
  const bend = 0.62 * Math.sin(Math.PI * pageProgress);
  const baseRotation = -Math.PI * pageProgress;
  const points: PageCurlPoint[] = [{ x: 0, z: 0 }];

  let x = 0;
  let z = 0;
  for (let segment = 1; segment <= safeSegments; segment += 1) {
    const normalizedMidpoint = (segment - 0.5) / safeSegments;
    const tangent = baseRotation + bend * (1 - normalizedMidpoint * 2);
    x += Math.cos(tangent) * segmentWidth;
    z -= Math.sin(tangent) * segmentWidth * PAGE_LIFT_RATIO;
    points.push({ x, z });
  }

  return points;
}

/**
 * Finds the x-coordinate of the fold peak — the point where the paper bends
 * most sharply (steepest z-increment). This is the apex of the curl, where
 * the shadow should sit, rather than the free edge (trailing tip).
 */
export function findFoldPeakX(curve: PageCurlPoint[]): number {
  'worklet';
  if (curve.length < 2) return 0;
  let maxZIncrement = 0;
  let peakX = curve[0].x;
  for (let i = 1; i < curve.length; i += 1) {
    const zIncrement = curve[i].z - curve[i - 1].z;
    if (zIncrement > maxZIncrement) {
      maxZIncrement = zIncrement;
      peakX = curve[i].x;
    }
  }
  return peakX;
}

// ---------------------------------------------------------------------------
// 2D Conical Corner Peel
//
// Modulates the turn progress per mesh row based on the grab Y position,
// creating a diagonal peel when grabbing near the top or bottom corner.
// The modulation amplitude is kept small to minimize texture stretching —
// the higher mesh resolution (30 segments x 12 rows) distributes the shear
// across more triangles, making any residual stretching imperceptible.
// ---------------------------------------------------------------------------

/**
 * Maximum diagonal skew between the leading and lagging corners at mid-turn
 * (progress=0.5). Kept moderate to balance the diagonal peel effect against
 * texture stretching — the higher mesh resolution compensates for the
 * remaining shear.
 */
export const CORNER_SKEW_MAX = 0.22;

/**
 * Modulates turn progress for a specific vertical mesh row based on where the
 * user grabbed the page (grabYRatio in 0..1).
 *
 * Grabbing near the bottom corner (grabYRatio ~ 1) accelerates bottom rows
 * and delays top rows, creating a diagonal conical peel.
 * Grabbing near the top corner (grabYRatio ~ 0) does the reverse.
 * Grabbing near the center (grabYRatio ~ 0.5) produces a uniform cylindrical
 * curl with no per-row modulation.
 *
 * The envelope uses sin(PI * baseProgress) so all rows start flat at
 * progress=0 and converge smoothly to flat at progress=1.
 */
export function computeRowTurnProgress(baseProgress: number, rowRatio: number, grabYRatio: number): number {
  'worklet';
  const progress = clampPageTurnProgress(baseProgress);
  const grabY = Math.max(0, Math.min(1, grabYRatio));
  const envelope = Math.sin(Math.PI * progress);
  const delta = (rowRatio - 0.5) * 2 * (grabY - 0.5) * CORNER_SKEW_MAX * envelope;
  return clampPageTurnProgress(progress + delta);
}
