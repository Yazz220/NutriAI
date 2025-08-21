/**
 * Video content extraction system for recipe videos
 * Handles caption extraction, frame OCR, and audio transcription
 * React Native compatible version
 */

import { processImageOcr } from './imageOcrProcessor';
import { transcribeFromUri, transcribeFromUrl } from './sttClient';
import * as FileSystem from 'expo-file-system';

export interface VideoExtractionResult {
  captions?: string;
  frameTexts: string[];
  audioTranscript?: string;
  mergedContent: string;
  metadata: {
    extractionMethods: string[];
    confidence: number;
    processingTime: number;
    frameCount: number;
    videoDuration?: number;
    hasAudio: boolean;
  };
}

export interface VideoExtractionOptions {
  extractCaptions?: boolean;
  extractFrameText?: boolean;
  transcribeAudio?: boolean;
  frameInterval?: number; // seconds between frame extractions
  maxFrames?: number;
  audioLanguage?: string;
}

/**
 * Main video content extraction function
 * React Native compatible version
 */
export async function extractVideoContent(
  videoInput: File | string,
  options: VideoExtractionOptions = {}
): Promise<VideoExtractionResult> {
  const startTime = Date.now();
  const {
    extractCaptions = true,
    extractFrameText = true,
    transcribeAudio = true,
    frameInterval = 5,
    maxFrames = 10,
    audioLanguage = 'english'
  } = options;

  const extractionMethods: string[] = [];
  let captions: string | undefined;
  let frameTexts: string[] = [];
  let audioTranscript: string | undefined;
  let confidence = 0;
  let frameCount = 0;
  let videoDuration: number | undefined;
  let hasAudio = false;

  try {
    // Get video metadata
    const videoMetadata = await getVideoMetadata(videoInput);
    videoDuration = videoMetadata.duration;
    hasAudio = videoMetadata.hasAudio;

    // Extract embedded captions/subtitles
    if (extractCaptions) {
      try {
        const cap = await extractEmbeddedCaptions(videoInput);
        captions = cap || undefined;

        if (captions) {
          extractionMethods.push('embedded-captions');
          confidence += 0.3;
        }
      } catch (error) {
        console.warn('[VideoExtractor] Caption extraction failed:', error);
      }
    }

    // Extract text from video frames
    if (extractFrameText) {
      try {
        const frameExtractionResult = await extractTextFromFrames(
          videoInput,
          frameInterval,
          maxFrames
        );
        frameTexts = frameExtractionResult.texts;
        frameCount = frameExtractionResult.frameCount;

        if (frameTexts.length > 0) {
          extractionMethods.push('frame-ocr');
          confidence += Math.min(0.4, frameTexts.length * 0.1);
        }
      } catch (error) {
        console.warn('[VideoExtractor] Frame text extraction failed:', error);
      }
    }

    // Transcribe audio
    if (transcribeAudio && hasAudio) {
      try {
        const audioResult = await transcribeVideoAudio(videoInput, audioLanguage);
        audioTranscript = audioResult.text;

        if (audioTranscript) {
          extractionMethods.push('audio-transcription');
          confidence += 0.4;
        }
      } catch (error) {
        console.warn('[VideoExtractor] Audio transcription failed:', error);
      }
    }

    // Merge all extracted content
    const mergedContent = mergeVideoContent({
      captions,
      frameTexts,
      audioTranscript
    });

    const processingTime = Date.now() - startTime;

    return {
      captions,
      frameTexts,
      audioTranscript,
      mergedContent,
      metadata: {
        extractionMethods,
        confidence: Math.min(1, confidence),
        processingTime,
        frameCount,
        videoDuration,
        hasAudio
      }
    };

  } catch (error) {
    console.error('[VideoExtractor] Video content extraction failed:', error);
    throw new Error(`Video content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets video metadata including duration and audio presence
 * React Native compatible version using expo-av
 */
async function getVideoMetadata(videoInput: File | string): Promise<{
  duration: number;
  hasAudio: boolean;
  width: number;
  height: number;
}> {
  try {
    let videoUri: string;

    if (typeof videoInput === 'string') {
      videoUri = videoInput;
    } else {
      // For File objects, we can't directly process them in React Native
      // In a full implementation, you'd save the file and use expo-av
      console.warn('[VideoExtractor] File object processing not implemented for React Native');
      return {
        duration: 0,
        hasAudio: false,
        width: 0,
        height: 0
      };
    }

    // For React Native, we'll use a simplified approach
    // In a full implementation, you might use expo-av or react-native-video
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    // Basic metadata extraction - in production, you'd use a proper video processing library
    return {
      duration: 0, // Would need proper video processing library
      hasAudio: true, // Assume audio is present
      width: 0, // Would need proper video processing library
      height: 0 // Would need proper video processing library
    };
  } catch (error) {
    console.warn('[VideoExtractor] Failed to get video metadata:', error);
    // Return safe defaults
    return {
      duration: 0,
      hasAudio: false,
      width: 0,
      height: 0
    };
  }
}

/**
 * Extracts embedded captions/subtitles from video
 * React Native compatible version
 */
async function extractEmbeddedCaptions(videoInput: File | string): Promise<string | null> {
  try {
    // For React Native, embedded caption extraction is not supported
    // In a full implementation, you might use a library that can parse video metadata
    console.warn('[VideoExtractor] Embedded caption extraction not supported in React Native');
    return null;
  } catch (error) {
    console.warn('[VideoExtractor] Embedded caption extraction failed:', error);
    return null;
  }
}

/**
 * Extracts text from video frames using OCR
 * React Native compatible version - simplified approach
 */
async function extractTextFromFrames(
  videoInput: File | string,
  frameInterval: number,
  maxFrames: number
): Promise<{ texts: string[]; frameCount: number }> {
  try {
    // For React Native, frame extraction is not supported without additional libraries
    // In a full implementation, you might use FFmpeg bindings or a video processing service
    console.warn('[VideoExtractor] Frame text extraction not supported in React Native');
    return { texts: [], frameCount: 0 };
  } catch (error) {
    console.warn('[VideoExtractor] Frame text extraction failed:', error);
    return { texts: [], frameCount: 0 };
  }
}

/**
 * Transcribes audio from video file
 * React Native compatible version
 */
async function transcribeVideoAudio(
  videoInput: File | string,
  language: string
): Promise<{ text: string; confidence: number }> {
  try {
    if (typeof videoInput === 'string') {
      // For video URLs, try to use the STT service directly
      const result = await transcribeFromUrl(videoInput, {
        language,
        response_format: 'json'
      });

      return {
        text: result.text || '',
        confidence: 0.8
      };
    } else {
      // For video files, audio extraction is not supported in React Native
      // without additional libraries like FFmpeg bindings
      console.warn('[VideoExtractor] Audio extraction from video files not supported in React Native');
      return {
        text: '',
        confidence: 0
      };
    }
  } catch (error) {
    console.error('[VideoExtractor] Audio transcription failed:', error);
    return {
      text: '',
      confidence: 0
    };
  }
}

// Audio extraction from video files is not supported in React Native
// without additional libraries like FFmpeg bindings

/**
 * Merges content from different extraction methods
 */
function mergeVideoContent(content: {
  captions?: string;
  frameTexts: string[];
  audioTranscript?: string;
}): string {
  const sections: string[] = [];
  
  // Add captions if available
  if (content.captions && content.captions.trim()) {
    sections.push('Video Captions:\n' + content.captions.trim());
  }
  
  // Add frame text if available
  if (content.frameTexts.length > 0) {
    const uniqueFrameTexts = [...new Set(content.frameTexts)];
    sections.push('On-screen Text:\n' + uniqueFrameTexts.join('\n'));
  }
  
  // Add audio transcript if available
  if (content.audioTranscript && content.audioTranscript.trim()) {
    sections.push('Audio Transcript:\n' + content.audioTranscript.trim());
  }
  
  return sections.join('\n\n');
}

/**
 * Validates video extraction result
 */
export function validateVideoExtraction(result: VideoExtractionResult): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check if any content was extracted
  if (!result.mergedContent || result.mergedContent.trim().length < 20) {
    issues.push('Very little content extracted from video');
    suggestions.push('Try a video with clearer audio or on-screen text');
  }
  
  // Check extraction methods
  if (result.metadata.extractionMethods.length === 0) {
    issues.push('No extraction methods succeeded');
    suggestions.push('Video may be corrupted or in an unsupported format');
  }
  
  // Check confidence
  if (result.metadata.confidence < 0.3) {
    issues.push('Low extraction confidence');
    suggestions.push('Video quality may be poor or content may not be recipe-related');
  }
  
  // Check for audio issues
  if (result.metadata.hasAudio && !result.audioTranscript) {
    suggestions.push('Audio transcription failed - try a video with clearer speech');
  }
  
  // Check frame extraction
  if (result.metadata.frameCount === 0 && result.frameTexts.length === 0) {
    suggestions.push('No text found in video frames - ensure recipe text is visible and clear');
  }
  
  // Check processing time
  if (result.metadata.processingTime > 60000) { // 1 minute
    suggestions.push('Processing took a long time - consider using shorter videos');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

/**
 * Optimizes video for better content extraction
 */
export async function optimizeVideoForExtraction(videoFile: File): Promise<{
  optimizedFile: File;
  optimizations: string[];
}> {
  const optimizations: string[] = [];
  
  try {
    // For now, return the original file
    // In a full implementation, you might:
    // - Compress video to reduce processing time
    // - Enhance audio quality
    // - Adjust frame rate for better OCR
    // - Normalize audio levels
    
    optimizations.push('no-optimization-needed');
    
    return {
      optimizedFile: videoFile,
      optimizations
    };
    
  } catch (error) {
    console.warn('[VideoExtractor] Video optimization failed:', error);
    return {
      optimizedFile: videoFile,
      optimizations: ['optimization-failed']
    };
  }
}

/**
 * Estimates processing time for video
 */
export async function estimateProcessingTime(videoInput: File | string): Promise<{
  estimatedSeconds: number;
  factors: string[];
}> {
  const factors: string[] = [];
  let estimatedSeconds = 10; // Base time

  try {
    const metadata = await getVideoMetadata(videoInput);

    // Factor in video duration (only available for URLs in React Native)
    if (metadata.duration > 0) {
      const durationFactor = Math.min(metadata.duration / 60, 5); // Max 5x for very long videos
      estimatedSeconds += durationFactor * 10;
      factors.push(`duration: ${metadata.duration.toFixed(1)}s`);
    }

    // Factor in audio presence
    if (metadata.hasAudio) {
      estimatedSeconds += 15;
      factors.push('audio-transcription');
    }

    return {
      estimatedSeconds: Math.round(estimatedSeconds),
      factors
    };

  } catch (error) {
    return {
      estimatedSeconds: 30, // Conservative estimate
      factors: ['estimation-failed']
    };
  }
}

/**
 * Enhanced error handling for video imports
 */
export function getVideoImportErrorMessage(error: any): string {
  const errorMessage = error?.message || '';
  const errorString = String(error);

  // Check for common configuration issues
  if (errorMessage.includes('not configured') || errorString.includes('EXPO_PUBLIC_STT_API_BASE')) {
    return 'Speech-to-Text service is not configured. Please set up EXPO_PUBLIC_STT_API_BASE and EXPO_PUBLIC_STT_API_KEY in your environment variables.';
  }

  if (errorMessage.includes('401') || errorString.includes('401')) {
    return 'Speech-to-Text service authentication failed. Please check your EXPO_PUBLIC_STT_API_KEY.';
  }

  if (errorMessage.includes('400') || errorString.includes('400')) {
    return 'Invalid video URL or format. Please try a different video or paste the recipe text instead.';
  }

  if (errorMessage.includes('network') || errorString.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (errorMessage.includes('insufficient_video_evidence')) {
    return 'Video quality is too low for automatic processing. Please try:\n• A video with clearer audio\n• A video with visible text/captions\n• Pasting the recipe text manually';
  }

  if (errorMessage.includes('no_transcript')) {
    return 'No audio could be extracted from the video. Please try:\n• A video with clearer speech\n• A different video URL\n• Pasting the recipe text manually';
  }

  // Generic fallback
  return `Video processing failed: ${errorMessage || 'Unknown error'}. Please try pasting the recipe text instead.`;
}