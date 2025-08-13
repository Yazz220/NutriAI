/**
 * Video content extraction system for recipe videos
 * Handles caption extraction, frame OCR, and audio transcription
 */

import { processImageOcr } from './imageOcrProcessor';
import { transcribeFromUri } from './sttClient';

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
 */
export async function extractVideoContent(
  videoFile: File,
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
    const videoMetadata = await getVideoMetadata(videoFile);
    videoDuration = videoMetadata.duration;
    hasAudio = videoMetadata.hasAudio;
    
    // Extract embedded captions/subtitles
    if (extractCaptions) {
      try {
        const cap = await extractEmbeddedCaptions(videoFile);
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
          videoFile,
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
        const audioResult = await transcribeVideoAudio(videoFile, audioLanguage);
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
 */
async function getVideoMetadata(videoFile: File): Promise<{
  duration: number;
  hasAudio: boolean;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    
    video.onloadedmetadata = () => {
      const metadata = {
        duration: video.duration,
        hasAudio: Boolean((video as any).mozHasAudio) || Boolean((video as any).webkitAudioDecodedByteCount) || 
                  Boolean((video as any).audioTracks?.length),
        width: video.videoWidth,
        height: video.videoHeight
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = url;
  });
}

/**
 * Extracts embedded captions/subtitles from video
 */
async function extractEmbeddedCaptions(videoFile: File): Promise<string | null> {
  try {
    // For web implementation, we'll try to extract WebVTT or SRT tracks
    // This is a simplified implementation - in practice, you'd need more sophisticated parsing
    
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    
    return new Promise((resolve) => {
      video.onloadeddata = () => {
        const textTracks = video.textTracks;
        let captions = '';
        
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          if (track.kind === 'captions' || track.kind === 'subtitles') {
            // Extract cues if available
            if (track.cues) {
              for (let j = 0; j < track.cues.length; j++) {
                const cue = track.cues[j] as VTTCue;
                captions += cue.text + ' ';
              }
            }
          }
        }
        
        URL.revokeObjectURL(url);
        resolve(captions.trim() || null);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      
      video.src = url;
    });
    
  } catch (error) {
    console.warn('[VideoExtractor] Embedded caption extraction failed:', error);
    return null;
  }
}

/**
 * Extracts text from video frames using OCR
 */
async function extractTextFromFrames(
  videoFile: File,
  frameInterval: number,
  maxFrames: number
): Promise<{ texts: string[]; frameCount: number }> {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Canvas context not available');
  }
  
  const url = URL.createObjectURL(videoFile);
  const texts: string[] = [];
  let frameCount = 0;
  
  try {
    // Load video
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = reject;
      video.src = url;
    });
    
    const duration = video.duration;
    const totalFramesToExtract = Math.min(maxFrames, Math.floor(duration / frameInterval));
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Extract frames at intervals
    for (let i = 0; i < totalFramesToExtract; i++) {
      const timePosition = (i * frameInterval) + (frameInterval / 2); // Middle of interval
      
      try {
        // Seek to position
        video.currentTime = Math.min(timePosition, duration - 1);
        
        // Wait for seek to complete
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });
        
        // Draw frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const frameDataUrl = canvas.toDataURL('image/png');
        
        // Extract text using OCR
        try {
          const ocrResult = await processImageOcr(frameDataUrl, {
            preprocessImage: true,
            provider: 'auto'
          });
          
          if (ocrResult.text && ocrResult.text.trim().length > 5) {
            texts.push(ocrResult.text.trim());
          }
          
          frameCount++;
        } catch (ocrError) {
          console.warn(`[VideoExtractor] OCR failed for frame ${i}:`, ocrError);
        }
        
      } catch (seekError) {
        console.warn(`[VideoExtractor] Failed to seek to position ${timePosition}:`, seekError);
      }
    }
    
    return { texts, frameCount };
    
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Transcribes audio from video file
 */
async function transcribeVideoAudio(
  videoFile: File,
  language: string
): Promise<{ text: string; confidence: number }> {
  try {
    // Extract audio from video file
    const audioBlob = await extractAudioFromVideo(videoFile);
    
    // Create a temporary file URI for the audio
    const audioUrl = URL.createObjectURL(audioBlob);
    
    try {
      // Use existing transcription service
      const result = await transcribeFromUri(
        audioUrl,
        'extracted_audio.wav',
        'audio/wav',
        {
          language,
          response_format: 'json'
        }
      );
      
      return {
        text: result.text || '',
        confidence: 0.8 // Default confidence for audio transcription
      };
      
    } finally {
      URL.revokeObjectURL(audioUrl);
    }
    
  } catch (error) {
    console.error('[VideoExtractor] Audio transcription failed:', error);
    throw error;
  }
}

/**
 * Extracts audio track from video file
 */
async function extractAudioFromVideo(videoFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const url = URL.createObjectURL(videoFile);
    
    video.onloadeddata = async () => {
      try {
        // Create audio source from video
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        // Record audio stream
        const mediaRecorder = new MediaRecorder(destination.stream);
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          URL.revokeObjectURL(url);
          resolve(audioBlob);
        };
        
        mediaRecorder.onerror = (error) => {
          URL.revokeObjectURL(url);
          reject(error);
        };
        
        // Start recording and play video
        mediaRecorder.start();
        video.play();
        
        // Stop recording when video ends
        video.onended = () => {
          mediaRecorder.stop();
        };
        
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video for audio extraction'));
    };
    
    video.src = url;
  });
}

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
export async function estimateProcessingTime(videoFile: File): Promise<{
  estimatedSeconds: number;
  factors: string[];
}> {
  const factors: string[] = [];
  let estimatedSeconds = 10; // Base time
  
  try {
    const metadata = await getVideoMetadata(videoFile);
    
    // Factor in video duration
    const durationFactor = Math.min(metadata.duration / 60, 5); // Max 5x for very long videos
    estimatedSeconds += durationFactor * 10;
    factors.push(`duration: ${metadata.duration.toFixed(1)}s`);
    
    // Factor in video resolution
    const pixelCount = metadata.width * metadata.height;
    if (pixelCount > 1920 * 1080) {
      estimatedSeconds += 20;
      factors.push('high-resolution');
    } else if (pixelCount < 640 * 480) {
      estimatedSeconds += 5;
      factors.push('low-resolution');
    }
    
    // Factor in audio presence
    if (metadata.hasAudio) {
      estimatedSeconds += 15;
      factors.push('audio-transcription');
    }
    
    // Factor in file size
    const fileSizeMB = videoFile.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      estimatedSeconds += 10;
      factors.push('large-file');
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