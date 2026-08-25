export const READER_MIN_ZOOM = 1;
export const READER_MAX_ZOOM = 4;
export const READER_DOUBLE_TAP_ZOOM = 2.2;
export const READER_ZOOMED_THRESHOLD = 1.05;

export function clampReaderZoomScale(scale: number): number {
  'worklet';
  return Math.max(READER_MIN_ZOOM, Math.min(READER_MAX_ZOOM, scale));
}

export function nextDoubleTapZoomScale(currentScale: number): number {
  'worklet';
  return currentScale > READER_ZOOMED_THRESHOLD ? READER_MIN_ZOOM : READER_DOUBLE_TAP_ZOOM;
}

export function clampReaderZoomTranslation(
  translation: number,
  pageDimension: number,
  scale: number,
): number {
  'worklet';
  const bound = Math.max(0, (pageDimension * (scale - READER_MIN_ZOOM)) / 2);
  return Math.max(-bound, Math.min(bound, translation));
}
