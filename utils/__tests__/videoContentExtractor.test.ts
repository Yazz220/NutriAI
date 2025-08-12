/**
 * Unit tests for video content extractor
 */

import { 
  extractVideoContent, 
  validateVideoExtraction, 
  optimizeVideoForExtraction,
  estimateProcessingTime 
} from '../videoContentExtractor';

// Mock dependencies
jest.mock('../imageOcrProcessor', () => ({
  processImageOcr: jest.fn().mockResolvedValue({
    text: 'Mocked OCR text from video frame',
    confidence: 0.8,
    metadata: {
      provider: 'tesseract',
      processingTime: 1000,
      imageSize: { width: 640, height: 480 },
      preprocessingApplied: ['contrast-enhancement']
    }
  })
}));

jest.mock('../sttClient', () => ({
  transcribeFromUri: jest.fn().mockResolvedValue({
    text: 'Mocked audio transcript from video'
  })
}));

// Mock DOM APIs
global.document = {
  createElement: jest.fn().mockImplementation((tagName) => {
    if (tagName === 'video') {
      return {
        onloadedmetadata: null,
        onloadeddata: null,
        onended: null,
        onerror: null,
        onseeked: null,
        src: '',
        duration: 60,
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 0,
        textTracks: {
          length: 0
        },
        mozHasAudio: true,
        webkitAudioDecodedByteCount: 1000,
        play: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
    }
    if (tagName === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn()
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mocked')
      };
    }
    return {};
  })
} as any;

global.URL = {
  createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: jest.fn()
} as any;

global.AudioContext = jest.fn().mockImplementation(() => ({
  createMediaElementSource: jest.fn().mockReturnValue({
    connect: jest.fn()
  }),
  createMediaStreamDestination: jest.fn().mockReturnValue({
    stream: {}
  })
})) as any;

global.MediaRecorder = jest.fn().mockImplementation(() => ({
  ondataavailable: null,
  onstop: null,
  onerror: null,
  start: jest.fn(),
  stop: jest.fn()
})) as any;

describe('Video Content Extractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractVideoContent', () => {
    const mockVideoFile = new File(['mock video data'], 'recipe.mp4', { type: 'video/mp4' });

    test('should extract content from video with all methods', async () => {
      // Mock video element behavior
      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
        if (mockVideo.onloadeddata) mockVideo.onloadeddata({} as Event);
      }, 0);

      const result = await extractVideoContent(mockVideoFile, {
        extractCaptions: true,
        extractFrameText: true,
        transcribeAudio: true,
        frameInterval: 10,
        maxFrames: 5
      });

      expect(result.mergedContent).toContain('On-screen Text');
      expect(result.mergedContent).toContain('Audio Transcript');
      expect(result.metadata.extractionMethods).toContain('frame-ocr');
      expect(result.metadata.extractionMethods).toContain('audio-transcription');
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    test('should handle video with embedded captions', async () => {
      const mockVideo = document.createElement('video');
      (mockVideo as any).textTracks = {
        length: 1,
        0: {
          kind: 'captions',
          cues: {
            length: 2,
            0: { text: 'First caption' },
            1: { text: 'Second caption' }
          }
        }
      };

      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
        if (mockVideo.onloadeddata) mockVideo.onloadeddata({} as Event);
      }, 0);

      const result = await extractVideoContent(mockVideoFile, {
        extractCaptions: true,
        extractFrameText: false,
        transcribeAudio: false
      });

      expect(result.captions).toBe('First caption Second caption');
      expect(result.metadata.extractionMethods).toContain('embedded-captions');
    });

    test('should handle frame text extraction', async () => {
      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
        if (mockVideo.onloadeddata) mockVideo.onloadeddata({} as Event);
        // Simulate seeked event
        setTimeout(() => {
          const seekedEvent = new Event('seeked');
          mockVideo.dispatchEvent(seekedEvent);
        }, 10);
      }, 0);

      const result = await extractVideoContent(mockVideoFile, {
        extractCaptions: false,
        extractFrameText: true,
        transcribeAudio: false,
        frameInterval: 5,
        maxFrames: 3
      });

      expect(result.frameTexts.length).toBeGreaterThan(0);
      expect(result.metadata.frameCount).toBeGreaterThan(0);
      expect(result.metadata.extractionMethods).toContain('frame-ocr');
    });

    test('should handle audio transcription', async () => {
      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
        if (mockVideo.onloadeddata) mockVideo.onloadeddata({} as Event);
      }, 0);

      const result = await extractVideoContent(mockVideoFile, {
        extractCaptions: false,
        extractFrameText: false,
        transcribeAudio: true,
        audioLanguage: 'english'
      });

      expect(result.audioTranscript).toBe('Mocked audio transcript from video');
      expect(result.metadata.extractionMethods).toContain('audio-transcription');
    });

    test('should handle video without audio', async () => {
      const mockVideo = document.createElement('video');
      (mockVideo as any).mozHasAudio = false;
      (mockVideo as any).webkitAudioDecodedByteCount = 0;

      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
      }, 0);

      const result = await extractVideoContent(mockVideoFile, {
        transcribeAudio: true
      });

      expect(result.metadata.hasAudio).toBe(false);
      expect(result.audioTranscript).toBeUndefined();
      expect(result.metadata.extractionMethods).not.toContain('audio-transcription');
    });

    test('should handle extraction failures gracefully', async () => {
      // Mock OCR failure
      const { processImageOcr } = await import('../imageOcrProcessor');
      (processImageOcr as jest.Mock).mockRejectedValueOnce(new Error('OCR failed'));

      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
        if (mockVideo.onloadeddata) mockVideo.onloadeddata({} as Event);
      }, 0);

      const result = await extractVideoContent(mockVideoFile, {
        extractFrameText: true,
        transcribeAudio: false
      });

      expect(result.frameTexts).toHaveLength(0);
      expect(result.metadata.extractionMethods).not.toContain('frame-ocr');
    });

    test('should merge content from multiple sources', async () => {
      const mockVideo = document.createElement('video');
      (mockVideo as any).textTracks = {
        length: 1,
        0: {
          kind: 'captions',
          cues: {
            length: 1,
            0: { text: 'Video caption text' }
          }
        }
      };

      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
        if (mockVideo.onloadeddata) mockVideo.onloadeddata({} as Event);
      }, 0);

      const result = await extractVideoContent(mockVideoFile);

      expect(result.mergedContent).toContain('Video Captions:');
      expect(result.mergedContent).toContain('Video caption text');
      expect(result.mergedContent).toContain('On-screen Text:');
      expect(result.mergedContent).toContain('Audio Transcript:');
    });

    test('should handle video metadata extraction failure', async () => {
      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onerror) mockVideo.onerror({} as Event);
      }, 0);

      await expect(extractVideoContent(mockVideoFile)).rejects.toThrow('Video content extraction failed');
    });
  });

  describe('validateVideoExtraction', () => {
    test('should validate good extraction result', () => {
      const goodResult = {
        captions: 'Recipe captions',
        frameTexts: ['Frame text 1', 'Frame text 2'],
        audioTranscript: 'Audio transcript',
        mergedContent: 'Video Captions:\nRecipe captions\n\nOn-screen Text:\nFrame text 1\nFrame text 2\n\nAudio Transcript:\nAudio transcript',
        metadata: {
          extractionMethods: ['embedded-captions', 'frame-ocr', 'audio-transcription'],
          confidence: 0.8,
          processingTime: 5000,
          frameCount: 5,
          videoDuration: 60,
          hasAudio: true
        }
      };

      const validation = validateVideoExtraction(goodResult);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should detect insufficient content', () => {
      const poorResult = {
        captions: undefined,
        frameTexts: [],
        audioTranscript: undefined,
        mergedContent: '',
        metadata: {
          extractionMethods: [],
          confidence: 0.1,
          processingTime: 1000,
          frameCount: 0,
          videoDuration: 30,
          hasAudio: false
        }
      };

      const validation = validateVideoExtraction(poorResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Very little content extracted from video');
      expect(validation.issues).toContain('No extraction methods succeeded');
      expect(validation.issues).toContain('Low extraction confidence');
    });

    test('should provide helpful suggestions', () => {
      const partialResult = {
        captions: undefined,
        frameTexts: [],
        audioTranscript: undefined,
        mergedContent: 'Some minimal content',
        metadata: {
          extractionMethods: ['frame-ocr'],
          confidence: 0.5,
          processingTime: 70000, // Long processing time
          frameCount: 0,
          videoDuration: 120,
          hasAudio: true
        }
      };

      const validation = validateVideoExtraction(partialResult);

      expect(validation.suggestions).toContain('Audio transcription failed - try a video with clearer speech');
      expect(validation.suggestions).toContain('No text found in video frames - ensure recipe text is visible and clear');
      expect(validation.suggestions).toContain('Processing took a long time - consider using shorter videos');
    });
  });

  describe('optimizeVideoForExtraction', () => {
    test('should return optimization result', async () => {
      const mockVideoFile = new File(['mock video'], 'test.mp4', { type: 'video/mp4' });

      const result = await optimizeVideoForExtraction(mockVideoFile);

      expect(result.optimizedFile).toBe(mockVideoFile);
      expect(result.optimizations).toContain('no-optimization-needed');
    });
  });

  describe('estimateProcessingTime', () => {
    test('should estimate processing time based on video properties', async () => {
      const mockVideoFile = new File(['mock video'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(mockVideoFile, 'size', { value: 50 * 1024 * 1024 }); // 50MB

      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
      }, 0);

      const result = await estimateProcessingTime(mockVideoFile);

      expect(result.estimatedSeconds).toBeGreaterThan(0);
      expect(result.factors).toContain('duration: 60.0s');
      expect(result.factors).toContain('audio-transcription');
    });

    test('should handle estimation failure', async () => {
      const mockVideoFile = new File(['mock video'], 'test.mp4', { type: 'video/mp4' });

      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onerror) mockVideo.onerror({} as Event);
      }, 0);

      const result = await estimateProcessingTime(mockVideoFile);

      expect(result.estimatedSeconds).toBe(30);
      expect(result.factors).toContain('estimation-failed');
    });

    test('should factor in high resolution', async () => {
      const mockVideoFile = new File(['mock video'], 'test.mp4', { type: 'video/mp4' });

      const mockVideo = document.createElement('video');
      (mockVideo as any).videoWidth = 3840;
      (mockVideo as any).videoHeight = 2160;

      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
      }, 0);

      const result = await estimateProcessingTime(mockVideoFile);

      expect(result.factors).toContain('high-resolution');
    });

    test('should factor in large file size', async () => {
      const mockVideoFile = new File(['mock video'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(mockVideoFile, 'size', { value: 100 * 1024 * 1024 }); // 100MB

      const mockVideo = document.createElement('video');
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) mockVideo.onloadedmetadata({} as Event);
      }, 0);

      const result = await estimateProcessingTime(mockVideoFile);

      expect(result.factors).toContain('large-file');
    });
  });
});