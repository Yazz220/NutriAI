import {
  clampReaderZoomScale,
  clampReaderZoomTranslation,
  nextDoubleTapZoomScale,
  READER_DOUBLE_TAP_ZOOM,
  READER_MAX_ZOOM,
} from '@/utils/cookbook/readerZoom';

describe('reader page zoom', () => {
  it('keeps pinch scale within the readable range', () => {
    expect(clampReaderZoomScale(0.4)).toBe(1);
    expect(clampReaderZoomScale(2.5)).toBe(2.5);
    expect(clampReaderZoomScale(8)).toBe(READER_MAX_ZOOM);
  });

  it('uses double tap as a predictable zoom toggle', () => {
    expect(nextDoubleTapZoomScale(1)).toBe(READER_DOUBLE_TAP_ZOOM);
    expect(nextDoubleTapZoomScale(1.02)).toBe(READER_DOUBLE_TAP_ZOOM);
    expect(nextDoubleTapZoomScale(1.2)).toBe(1);
  });

  it('bounds panning so a zoomed page cannot be lost offscreen', () => {
    expect(clampReaderZoomTranslation(500, 300, 2)).toBe(150);
    expect(clampReaderZoomTranslation(-500, 300, 2)).toBe(-150);
    expect(clampReaderZoomTranslation(40, 300, 2)).toBe(40);
    expect(clampReaderZoomTranslation(40, 300, 1)).toBe(0);
  });
});
