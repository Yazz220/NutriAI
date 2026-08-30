import { File } from 'expo-file-system';
import {
  inspectUploadedVideoRecipeSource,
  MAX_DIRECT_VIDEO_BYTES,
} from '@/supabase/functions/_shared/videoUploadContract';

export interface RecipeCaptureVideoAsset {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
}

export interface PreparedRecipeCaptureVideo {
  bytes: Uint8Array;
  fileName: string;
  fileExtension: 'mp4' | 'mov' | 'mpeg' | 'webm';
  mimeType: 'video/mp4' | 'video/mpeg' | 'video/mov' | 'video/webm';
  byteSize: number;
}

function extensionForMimeType(mimeType: PreparedRecipeCaptureVideo['mimeType']): PreparedRecipeCaptureVideo['fileExtension'] {
  if (mimeType === 'video/mov') return 'mov';
  if (mimeType === 'video/mpeg') return 'mpeg';
  if (mimeType === 'video/webm') return 'webm';
  return 'mp4';
}

function videoSourceError(reasonCode: string): Error {
  if (reasonCode === 'video_too_large') {
    return new Error(`This video is larger than ${Math.floor(MAX_DIRECT_VIDEO_BYTES / 1_000_000)} MB. Choose a shorter or smaller video.`);
  }
  if (reasonCode === 'video_permission_required') {
    return new Error('Confirm that you made this video or have permission to process it.');
  }
  return new Error('Choose an MP4, MOV, MPEG, or WebM video file.');
}

export async function prepareRecipeCaptureVideo(
  asset: RecipeCaptureVideoAsset,
): Promise<PreparedRecipeCaptureVideo> {
  const file = new File(asset.uri);
  const declaredByteSize = asset.size ?? file.size;
  const initial = inspectUploadedVideoRecipeSource({
    byteSize: declaredByteSize,
    mimeType: asset.mimeType,
    fileName: asset.name,
    rightsConfirmed: true,
  });
  if (!initial.ready) throw videoSourceError(initial.reasonCode);

  const bytes = await file.bytes();
  const verified = inspectUploadedVideoRecipeSource({
    byteSize: bytes.byteLength,
    mimeType: asset.mimeType,
    fileName: asset.name,
    rightsConfirmed: true,
    headerBytes: bytes.subarray(0, 64),
  });
  if (!verified.ready) throw videoSourceError(verified.reasonCode);

  return {
    bytes,
    fileName: asset.name,
    fileExtension: extensionForMimeType(verified.mimeType),
    mimeType: verified.mimeType,
    byteSize: bytes.byteLength,
  };
}
