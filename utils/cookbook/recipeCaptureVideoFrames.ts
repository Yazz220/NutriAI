import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import type { RecipeCaptureVideoAsset } from '@/utils/cookbook/recipeCaptureVideo';

export const MAX_VIDEO_FRAME_COUNT = 8;
export const MAX_VIDEO_FRAME_EDGE = 1280;
const FRAME_JPEG_QUALITY = 0.65;
const MAX_VIDEO_FRAME_BYTES = 1_100_000;

const FALLBACK_FRAME_TIMESTAMPS = [0.5, 1.5, 3, 5, 8, 12, 20, 30];

export interface PreparedVideoFrame {
  bytes: Uint8Array;
  mimeType: 'image/jpeg';
}

type VideoThumbnailModule = typeof import('expo-video-thumbnails');

async function loadVideoThumbnailModule(): Promise<VideoThumbnailModule | null> {
  try {
    return await import('expo-video-thumbnails');
  } catch {
    // Older development builds may not contain this optional native module.
    // Frame evidence is supplementary, so preserve transcript/video ingestion.
    return null;
  }
}

/**
 * Evenly spaced sample times with a small margin at both ends, so overlays
 * that appear at the start or finish of the video are still captured. An
 * unknown duration falls back to a fixed early-video ladder.
 */
export function sampleVideoFrameTimestamps(
  durationSeconds: number | null,
  count = MAX_VIDEO_FRAME_COUNT,
): number[] {
  const frameCount = Math.max(1, Math.min(MAX_VIDEO_FRAME_COUNT, Math.floor(count)));
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return FALLBACK_FRAME_TIMESTAMPS.slice(0, frameCount);
  }
  const duration = Math.min(durationSeconds, 3600);
  if (duration < 1) return [0];
  const margin = Math.min(0.5, duration * 0.05);
  const interval = (duration - 2 * margin) / (frameCount - 1);
  return Array.from({ length: frameCount }, (_, index) =>
    Number((margin + index * interval).toFixed(3)),
  );
}

function durationSecondsFromAsset(video: RecipeCaptureVideoAsset): number | null {
  const duration = video.duration;
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null;
  return duration / 1000;
}

/**
 * Best-effort frame sampling for on-screen-text evidence. Any frame that
 * cannot be thumbnailed, compressed, or size-bounded is skipped; the video
 * itself remains the primary source.
 */
export async function collectRecipeCaptureVideoFrames(
  video: RecipeCaptureVideoAsset,
  loadThumbnailModule = loadVideoThumbnailModule,
): Promise<PreparedVideoFrame[]> {
  const videoThumbnails = await loadThumbnailModule();
  if (!videoThumbnails) return [];
  const timestamps = sampleVideoFrameTimestamps(durationSecondsFromAsset(video));
  const frames: PreparedVideoFrame[] = [];
  for (const timestamp of timestamps) {
    if (frames.length >= MAX_VIDEO_FRAME_COUNT) break;
    try {
      const thumbnail = await videoThumbnails.getThumbnailAsync(video.uri, {
        time: Math.round(timestamp * 1000),
        quality: 0.6,
      });
      const longestEdge = Math.max(thumbnail.width, thumbnail.height);
      const scale = longestEdge > MAX_VIDEO_FRAME_EDGE ? MAX_VIDEO_FRAME_EDGE / longestEdge : 1;
      const actions: ImageManipulator.Action[] = scale < 1
        ? [{
            resize: {
              width: Math.max(1, Math.round(thumbnail.width * scale)),
              height: Math.max(1, Math.round(thumbnail.height * scale)),
            },
          }]
        : [];
      const manipulated = await ImageManipulator.manipulateAsync(
        thumbnail.uri,
        actions,
        { compress: FRAME_JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
      );
      const file = new File(manipulated.uri);
      const bytes = await file.bytes();
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_VIDEO_FRAME_BYTES) continue;
      frames.push({ bytes, mimeType: 'image/jpeg' });
    } catch {
      continue;
    }
  }
  return frames;
}
