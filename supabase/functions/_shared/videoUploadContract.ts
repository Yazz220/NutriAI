export const MAX_DIRECT_VIDEO_BYTES = 20_000_000;
export const MIN_VIDEO_BYTES = 32;

export type VideoRecipeMimeType = 'video/mp4' | 'video/mpeg' | 'video/mov' | 'video/webm';

export type UploadedVideoRecipeSourceInspection =
  | {
      ready: true;
      mimeType: VideoRecipeMimeType;
      byteSize: number;
      adapterVersion: 'video-source-v2';
    }
  | {
      ready: false;
      reasonCode: 'video_source_unsupported' | 'video_permission_required' | 'video_too_large';
      diagnostic: string;
    };

function hasIsoBaseMediaSignature(bytes: Uint8Array): boolean {
  for (let offset = 4; offset <= bytes.length - 4; offset += 1) {
    if (
      bytes[offset] === 0x66
      && bytes[offset + 1] === 0x74
      && bytes[offset + 2] === 0x79
      && bytes[offset + 3] === 0x70
    ) return true;
  }
  return false;
}

function hasWebmSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 4
    && bytes[0] === 0x1a
    && bytes[1] === 0x45
    && bytes[2] === 0xdf
    && bytes[3] === 0xa3;
}

function hasMpegSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 4
    && bytes[0] === 0x00
    && bytes[1] === 0x00
    && bytes[2] === 0x01
    && (bytes[3] === 0xba || bytes[3] === 0xb3);
}

function hasExpectedContainerSignature(bytes: Uint8Array, mimeType: VideoRecipeMimeType): boolean {
  if (mimeType === 'video/mp4' || mimeType === 'video/mov') return hasIsoBaseMediaSignature(bytes);
  if (mimeType === 'video/webm') return hasWebmSignature(bytes);
  return hasMpegSignature(bytes);
}

function mimeTypeFromFileName(fileName: string | null | undefined): VideoRecipeMimeType | null {
  const extension = fileName?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'mov') return 'video/mov';
  if (extension === 'mpeg' || extension === 'mpg') return 'video/mpeg';
  if (extension === 'webm') return 'video/webm';
  return null;
}

function normalizedVideoMimeType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
): VideoRecipeMimeType | null {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (normalized === 'video/mp4' || normalized === 'video/mpeg' || normalized === 'video/webm') {
    return normalized;
  }
  if (normalized === 'video/mov' || normalized === 'video/quicktime') return 'video/mov';
  if (normalized === 'video/x-m4v') return 'video/mp4';
  return mimeTypeFromFileName(fileName);
}

export function inspectUploadedVideoRecipeSource(input: {
  byteSize: number;
  mimeType?: string | null;
  fileName?: string | null;
  rightsConfirmed?: boolean;
  headerBytes?: Uint8Array;
}): UploadedVideoRecipeSourceInspection {
  if (input.rightsConfirmed !== true) {
    return {
      ready: false,
      reasonCode: 'video_permission_required',
      diagnostic: 'Uploaded video processing requires the user to confirm ownership or permission.',
    };
  }
  if (input.byteSize > MAX_DIRECT_VIDEO_BYTES) {
    return {
      ready: false,
      reasonCode: 'video_too_large',
      diagnostic: `The uploaded video is ${input.byteSize} bytes.`,
    };
  }
  if (input.byteSize < MIN_VIDEO_BYTES) {
    return {
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: `The video source contains only ${input.byteSize} bytes.`,
    };
  }
  const mimeType = normalizedVideoMimeType(input.mimeType, input.fileName);
  if (!mimeType) {
    return {
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: `The uploaded file uses ${input.mimeType ?? 'an unknown content type'}.`,
    };
  }
  if (input.headerBytes && !hasExpectedContainerSignature(input.headerBytes, mimeType)) {
    return {
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: `The uploaded file does not contain a valid ${mimeType} container signature.`,
    };
  }
  return {
    ready: true,
    mimeType,
    byteSize: input.byteSize,
    adapterVersion: 'video-source-v2',
  };
}
