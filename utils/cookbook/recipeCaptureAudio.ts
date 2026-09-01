import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import {
  inspectAudioRecipeSource,
  type AudioRecipeFormat,
} from '@/supabase/functions/_shared/audioRecipeEvidence';

export interface RecipeCaptureAudioAsset {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
}

export interface PreparedRecipeCaptureAudio {
  bytes: Uint8Array;
  fileName: string;
  format: AudioRecipeFormat;
  mimeType: string;
  byteSize: number;
}

export async function prepareRecipeCaptureAudio(
  asset: RecipeCaptureAudioAsset,
): Promise<PreparedRecipeCaptureAudio> {
  let bytes: Uint8Array | null = null;
  let byteSize: number;
  if (Platform.OS === 'web') {
    if (asset.size == null) {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Nosh could not read this audio file. Choose another recording.');
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    byteSize = asset.size ?? bytes?.byteLength ?? 0;
  } else {
    byteSize = asset.size ?? new File(asset.uri).size;
  }
  const decision = inspectAudioRecipeSource({
    byteSize,
    mimeType: asset.mimeType,
    fileName: asset.name,
  });
  if (!decision.ready) {
    if (decision.reasonCode === 'audio_too_large') {
      throw new Error('This audio file is larger than 6 MB. Choose a shorter or smaller recording.');
    }
    throw new Error('Choose an MP3, M4A, WAV, AAC, AIFF, OGG, or FLAC audio file.');
  }

  if (!bytes) {
    if (Platform.OS === 'web') {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Nosh could not read this audio file. Choose another recording.');
      bytes = new Uint8Array(await response.arrayBuffer());
    } else {
      bytes = await new File(asset.uri).bytes();
    }
  }
  if (bytes.byteLength !== byteSize) {
    const verified = inspectAudioRecipeSource({
      byteSize: bytes.byteLength,
      mimeType: asset.mimeType,
      fileName: asset.name,
    });
    if (!verified.ready) {
      throw new Error(verified.reasonCode === 'audio_too_large'
        ? 'This audio file is larger than 6 MB. Choose a shorter or smaller recording.'
        : 'Folio could not read this audio file. Choose another recording.');
    }
  }

  return {
    bytes,
    fileName: asset.name,
    format: decision.format,
    mimeType: decision.mimeType,
    byteSize: bytes.byteLength,
  };
}
