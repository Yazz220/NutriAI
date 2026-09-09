jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ manipulateAsync: jest.fn(), SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: jest.fn() }));

import {
  collectRecipeCaptureVideoFrames,
  MAX_VIDEO_FRAME_COUNT,
  sampleVideoFrameTimestamps,
} from '@/utils/cookbook/recipeCaptureVideoFrames';

describe('sampleVideoFrameTimestamps', () => {
  it('returns evenly spaced timestamps with margins for a known duration', () => {
    const timestamps = sampleVideoFrameTimestamps(60, 5);
    expect(timestamps).toHaveLength(5);
    expect(timestamps[0]).toBeGreaterThan(0);
    expect(timestamps[timestamps.length - 1]).toBeLessThan(60);
    // Even spacing between consecutive samples.
    const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i]);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.01);
  });

  it('caps the frame count at MAX_VIDEO_FRAME_COUNT', () => {
    const timestamps = sampleVideoFrameTimestamps(120, 20);
    expect(timestamps).toHaveLength(MAX_VIDEO_FRAME_COUNT);
  });

  it('falls back to an early-video ladder when duration is unknown', () => {
    const timestamps = sampleVideoFrameTimestamps(null, 4);
    expect(timestamps).toHaveLength(4);
    expect(timestamps[0]).toBe(0.5);
  });

  it('falls back when duration is non-finite or non-positive', () => {
    expect(sampleVideoFrameTimestamps(NaN, 3)).toHaveLength(3);
    expect(sampleVideoFrameTimestamps(0, 3)).toHaveLength(3);
    expect(sampleVideoFrameTimestamps(-5, 3)).toHaveLength(3);
  });

  it('returns a single frame at 0 for sub-second videos', () => {
    expect(sampleVideoFrameTimestamps(0.5, 8)).toEqual([0]);
  });
});

describe('collectRecipeCaptureVideoFrames', () => {
  it('degrades to no frame evidence when the native thumbnail module is unavailable', async () => {
    const frames = await collectRecipeCaptureVideoFrames(
      { uri: 'file:///recipe.mp4', mimeType: 'video/mp4', fileName: 'recipe.mp4' },
      async () => null,
    );

    expect(frames).toEqual([]);
  });
});
