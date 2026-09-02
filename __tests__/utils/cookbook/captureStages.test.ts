import {
  AUDIO_TRANSCRIPTION_STAGE_VERSION,
  CAPTURE_CHECKPOINT_NAMES,
  captureCheckpointIsCompatible,
  captureStageCheckpoints,
  LEGACY_CAPTURE_STAGE_VERSION,
  normalizedGraphCanResume,
  recipeQualityStageVersion,
  RECIPE_EXTRACTION_STAGE_VERSION,
  RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
  sourceStageVersion,
} from '@/supabase/functions/_shared/captureStages';

describe('recipe capture stage checkpoints', () => {
  it('includes external acquisition between source reading and transcription', () => {
    expect(CAPTURE_CHECKPOINT_NAMES).toEqual([
      'source',
      'acquisition',
      'transcription',
      'extraction',
      'normalization',
      'quality',
      'page_generation',
      'publication',
    ]);
  });

  it('keeps only recognized checkpoints with versions', () => {
    expect(captureStageCheckpoints({
      source: { version: 'image-source-v1', byteSize: 1200 },
      extraction: { completedAt: '2026-08-30T12:00:00.000Z' },
      unknown: { version: 'ignored-v1' },
    })).toEqual({
      source: { version: 'image-source-v1', byteSize: 1200 },
    });
  });

  it('separates provider-independent contracts from model metadata', () => {
    expect(sourceStageVersion('audio')).toBe('audio-source-v1');
    expect(sourceStageVersion('video')).toBe('video-source-v2');
    expect(AUDIO_TRANSCRIPTION_STAGE_VERSION).toBe('audio-transcription-v1');
    expect(RECIPE_EXTRACTION_STAGE_VERSION).toBe('recipe-extraction-v3');
    expect(recipeQualityStageVersion(3)).toBe('recipe-quality-v3');
  });

  it('accepts exact or explicitly allowed legacy checkpoints, but rejects stale contracts', () => {
    const current = {
      stage_checkpoints: {
        normalization: { version: RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION },
      },
    };
    expect(captureCheckpointIsCompatible(
      current,
      'normalization',
      RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
    )).toBe(true);
    expect(captureCheckpointIsCompatible(
      { stage_checkpoints: { normalization: { version: LEGACY_CAPTURE_STAGE_VERSION } } },
      'normalization',
      RECIPE_GRAPH_NORMALIZATION_STAGE_VERSION,
      { allowLegacy: true },
    )).toBe(true);
    expect(normalizedGraphCanResume({
      stage_checkpoints: { normalization: { version: 'recipe-graph-normalization-v99' } },
    })).toBe(false);
  });

  it('never reinterprets a graph after a page has already been created from it', () => {
    expect(normalizedGraphCanResume({
      pending_page_id: 'page-1',
      stage_checkpoints: { normalization: { version: 'recipe-graph-normalization-v0' } },
    })).toBe(true);
  });
});
