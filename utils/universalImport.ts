import { importRecipeFromUrl, importRecipeFromText, importRecipeFromImage } from './recipeImport';
import { transcribeFromUrl, transcribeFromUri } from './sttClient';
import { createChatCompletion } from './aiClient';
import { detectInputType, validateInput, getPlatformHints } from './inputDetection';
import * as FileSystem from 'expo-file-system';

export type SmartInput = {
  url?: string | null;
  text?: string | null;
  file?: { uri: string; mime?: string; name?: string } | null;
};

export type SmartOutput = {
  recipe: any;
  provenance: {
    source: 'url' | 'text' | 'image' | 'video';
    videoUrl?: string;
    caption?: string;
    transcript?: string;
    ocrText?: string;
    pageText?: string;
    parserNotes?: string[];
    confidence?: number;
    platform?: string;
    detectionConfidence?: number;
    validationWarnings?: string[];
    hints?: string[];
  };
};

const SOCIAL_HOSTS = ['tiktok.com', 'instagram.com', 'youtube.com', 'youtu.be', 'vm.tiktok.com', 'facebook.com', 'fb.watch', 'pinterest.com', 'pin.it'];

function isUrlLike(s?: string | null) {
  if (!s) return false;
  try { new URL(s); return true; } catch { return false; }
}

function isSocialVideoUrl(u: string) {
  try { const h = new URL(u).hostname.replace(/^www\./,''); return SOCIAL_HOSTS.some(x => h.includes(x)); } catch { return false; }
}

function detectKind(input: SmartInput): {
  kind: 'video-url' | 'recipe-url' | 'text' | 'image-file' | 'video-file';
  detection: ReturnType<typeof detectInputType>;
  validation: ReturnType<typeof validateInput>;
  hints: string[];
} {
  let inputForDetection: string | File;
  
  if (input.url) {
    inputForDetection = input.url;
  } else if (input.file?.uri) {
    // Create a mock File object for detection
    const mockFile = {
      name: input.file.name || 'file',
      type: input.file.mime || '',
      size: 0 // We don't have size info from SmartInput
    } as File;
    inputForDetection = mockFile;
  } else {
    inputForDetection = input.text || '';
  }

  const detection = detectInputType(inputForDetection);
  const validation = validateInput(inputForDetection, detection);
  const hints = getPlatformHints(detection);

  // Map new detection types to legacy kinds for backward compatibility
  let kind: 'video-url' | 'recipe-url' | 'text' | 'image-file' | 'video-file';
  
  if (detection.type === 'url') {
    kind = detection.metadata.isVideoUrl ? 'video-url' : 'recipe-url';
  } else if (detection.type === 'image') {
    kind = 'image-file';
  } else if (detection.type === 'video') {
    kind = 'video-file';
  } else {
    kind = 'text';
  }

  return { kind, detection, validation, hints };
}

function preprocess(text: string) {
  // Use the enhanced text normalizer for better preprocessing
  try {
    const { normalizeSocialMediaContent } = require('./textContentNormalizer');
    const result = normalizeSocialMediaContent(text);
    return result.normalizedText;
  } catch (error) {
    console.warn('[UniversalImport] Text normalizer not available, using basic preprocessing:', error);
    // Fallback to basic preprocessing
    let t = text || '';
    t = t.replace(/[\u{1F300}-\u{1FAFF}]/gu, ''); // emojis
    t = t.replace(/https?:\/\/\S+/g, '');
    t = t.replace(/[#@]\w+/g, '');
    t = t.replace(/[\t ]+/g, ' ').trim();
    return t;
  }
}

function mergeSignals(parts: Array<string | undefined>) {
  const cleanedParts = parts.filter((p): p is string => !!p).map(p => preprocess(p));
  const lines = cleanedParts.join('\n').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = l.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(l); }
  }
  return out.join('\n');
}

async function reconcileWithAI(initialJson: any, evidence: string): Promise<{ recipe: any; notes: string[]; confidence: number }>
{
  const system = `You are a meticulous recipe extraction assistant. You receive a preliminary JSON and a block of evidence text (merged from transcript, caption, OCR, and page). You must:
- Ensure ALL ingredients mentioned anywhere appear in the list.
- Normalize units to: tsp, tbsp, cup, oz, g, ml, lb, kg, clove, bunch, pinch, splash.
- Convert number words to numerals.
- If quantity uncertain, prefix with ~ and set approximate: true.
- Ensure steps only reference ingredients present. If a step mentions a new ingredient, add it.
- Do not invent ingredients not present in evidence. If an item is garnish/optional, set optional: true.
Return strict JSON: { recipe, notes: string[], confidence: number }.`;

  const user = `PRELIMINARY_JSON\n${JSON.stringify(initialJson)}\n\nEVIDENCE\n${evidence}`;
  const resp = await createChatCompletion([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  try {
    let jsonText = resp.trim();
    // Attempt to extract JSON from code fences or surrounding text
    const fenceMatch = jsonText.match(/```json[\s\S]*?```/i) || jsonText.match(/```[\s\S]*?```/);
    if (fenceMatch) {
      jsonText = fenceMatch[0].replace(/```json|```/gi, '').trim();
    } else {
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
    }
    const parsed = JSON.parse(jsonText);
    const recipe = parsed.recipe || initialJson;
    const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.7;
    return { recipe, notes, confidence };
  } catch {
    // fallback to initial
    return { recipe: initialJson, notes: ['Failed to parse reconciliation response.'], confidence: 0.6 };
  }
}

export async function smartImport(input: SmartInput): Promise<SmartOutput> {
  const { kind, detection, validation, hints } = detectKind(input);
  
  // Check validation before proceeding
  if (!validation.isValid) {
    throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
  }
  
  const provenance: SmartOutput['provenance'] = { 
    source: kind.includes('url') ? 'url' : kind.includes('text') ? 'text' : kind.includes('image') ? 'image' : 'video',
    platform: detection.metadata.platform,
    detectionConfidence: detection.confidence,
    validationWarnings: validation.warnings,
    hints
  } as any;

  if (kind === 'recipe-url') {
    const recipe = await importRecipeFromUrl(input.url!);
    return { recipe, provenance };
  }

  if (kind === 'text') {
    const initial = await importRecipeFromText(preprocess(input.text || ''));
    // For text-only we don’t have extra evidence; still run light reconcile on text
    const { recipe, notes, confidence } = await reconcileWithAI(initial, input.text || '');
    return { recipe, provenance: { ...provenance, parserNotes: notes, confidence } };
  }

  if (kind === 'image-file') {
    // Convert to base64 data URL as expected by importRecipeFromImage
    const uri = input.file!.uri;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = uri.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;
    const recipe = await importRecipeFromImage(dataUrl);
    return { recipe, provenance };
  }

  if (kind === 'video-url') {
    provenance.videoUrl = input.url!;
    // Try direct transcript (caption fetch not implemented here). Provider supports URL input.
    const tx = await transcribeFromUrl(input.url!, { language: 'english', response_format: 'json' });
    provenance.transcript = tx.text;
    const evidence = mergeSignals([tx.text]);
    const initial = await importRecipeFromText(evidence);
    const { recipe, notes, confidence } = await reconcileWithAI(initial, evidence);
    return { recipe, provenance: { ...provenance, parserNotes: notes, confidence } };
  }

  // video-file - use enhanced video content extraction
  try {
    const { extractVideoContent } = await import('./videoContentExtractor');
    
    // Convert URI to File object for video extraction
    const response = await fetch(input.file!.uri);
    const blob = await response.blob();
    const videoFile = new File([blob], input.file!.name || 'video.mp4', { 
      type: input.file!.mime || 'video/mp4' 
    });
    
    const videoResult = await extractVideoContent(videoFile, {
      extractCaptions: true,
      extractFrameText: true,
      transcribeAudio: true,
      frameInterval: 10,
      maxFrames: 8
    });
    
    provenance.transcript = videoResult.audioTranscript;
    provenance.caption = videoResult.captions;
    provenance.ocrText = videoResult.frameTexts.join('\n');
    
    const evidence = videoResult.mergedContent;
    const initial = await importRecipeFromText(evidence);
    const { recipe, notes, confidence } = await reconcileWithAI(initial, evidence);
    
    return { 
      recipe, 
      provenance: { 
        ...provenance, 
        parserNotes: [...(notes || []), ...videoResult.metadata.extractionMethods],
        confidence: Math.max(confidence, videoResult.metadata.confidence)
      } 
    };
    
  } catch (error) {
    console.warn('[UniversalImport] Enhanced video extraction failed, falling back to audio-only:', error);
    
    // Fallback to audio-only transcription
    const tx = await transcribeFromUri(input.file!.uri, input.file!.name || 'video.mp4', input.file!.mime || 'video/mp4', { language: 'english', response_format: 'json' });
    provenance.transcript = tx.text;
    const evidence = mergeSignals([tx.text]);
    const initial = await importRecipeFromText(evidence);
    const { recipe, notes, confidence } = await reconcileWithAI(initial, evidence);
    return { recipe, provenance: { ...provenance, parserNotes: notes, confidence } };
  }
}
