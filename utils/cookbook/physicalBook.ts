export type PageTurnDirection = -1 | 0 | 1;

export interface PageCurlPoint {
  x: number;
  z: number;
}

const RELEASE_PROJECTION_SECONDS = 0.18;
const RELEASE_COMMIT_PROGRESS = 0.5;
const PAGE_LIFT_RATIO = 0.48;
const EDGE_RESISTANCE = 0.08;
const MIN_SETTLE_VELOCITY = 1.6;
const MIN_SETTLE_DURATION = 0.18;
const MAX_SETTLE_DURATION = 1.0;

export function clampPageTurnProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

export function shouldCommitPageTurn(
  progress: number,
  velocityX: number,
  direction: Exclude<PageTurnDirection, 0>,
  pageWidth: number,
): boolean {
  const signedVelocity = direction === 1 ? -velocityX : velocityX;
  const projectedProgress =
    clampPageTurnProgress(progress) +
    (signedVelocity / Math.max(pageWidth, 1)) * RELEASE_PROJECTION_SECONDS;

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
  const { grabX, pointerX, pageWidth, direction, canTurn } = grab;
  const targetX = grab.targetX ?? (direction === 1 ? 0 : pageWidth);
  const travel = Math.max(Math.abs(targetX - grabX), 1);
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
  const { progress, velocityX, direction, pageWidth } = input;
  const commit = shouldCommitPageTurn(progress, velocityX, direction, pageWidth);
  const progressVelocity =
    direction === 1 ? -velocityX / Math.max(pageWidth, 1) : velocityX / Math.max(pageWidth, 1);
  const magnitude = Math.max(Math.abs(progressVelocity), MIN_SETTLE_VELOCITY);
  return { commit, settleVelocity: commit ? magnitude : -magnitude };
}

/**
 * Estimated seconds for a timed settle (used by the web scene, which advances
 * turns on a clock rather than a spring). Flicks land faster than slow
 * releases; the result is clamped so the leaf never snaps or drags.
 */
export function estimateTurnSettleDuration(
  progress: number,
  target: 0 | 1,
  settleVelocity: number,
): number {
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

export function buildPageCurlCurve(
  width: number,
  segmentCount: number,
  progress: number,
): PageCurlPoint[] {
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
