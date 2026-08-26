/**
 * Tool definitions and guided cards for Nosh actions.
 *
 * Each tool has:
 *   - A zod parameter schema (matches the nosh-chat Edge Function definitions)
 *   - An execute function that mutates the RecipeGraph and persists changes
 *   - A render component for the inline tool-call UI
 *
 * The toolkit is created dynamically via `useNoshToolkit` because the
 * execute functions need access to the current page and an update callback.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { defineToolkit } from '@assistant-ui/react-native';
import { z } from 'zod';
import { BookOpen, ChefHat, Clock, ScanSearch } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { RecipeActionPreviewCard } from '@/components/nosh/recipe/RecipeActionPreviewCard';
import { ArtworkActionCard } from '@/components/nosh/recipe/ArtworkActionCard';
import { CollectionActionCard } from '@/components/nosh/collection/CollectionActionCard';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type { RecipeGraph } from '@/types/recipeGraph';
import type { GeneratedRecipePage } from '@/types/cookbook';
import {
  proposeGraphPatch,
  proposeIngredientSubstitution,
  proposeServingScale,
  type RecipeActionCommitMode,
  type RecipeActionProposal,
} from '@/utils/cookbook/recipeActions';
import type {
  LoadedCollectionRecipe,
  RecipeCollectionBrowseInput,
  RecipeCollectionBrowseResult,
  RecipeCollectionSearchOutcome,
} from '@/utils/cookbook/recipeCollection';
import type { CookingPreferenceKey } from '@/utils/cookbook/cookingPreferences';
import type {
  CollectionActionKind,
  CollectionActionPreview,
  CollectionActionResult,
} from '@/utils/cookbook/collectionActions';

// ---------------------------------------------------------------------------
// Tool UI components — inline cards shown when tools execute
// ---------------------------------------------------------------------------

function ToolCard({
  icon,
  label,
  detail,
  running,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  running?: boolean;
  error?: boolean;
}) {
  return (
    <View style={[styles.toolCard, error && styles.toolCardError]}>
      <View style={styles.toolIcon}>{icon}</View>
      <View style={styles.toolText}>
        <Text style={styles.toolLabel}>{label}</Text>
        {detail ? <Text style={styles.toolDetail}>{detail}</Text> : null}
      </View>
      {running ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
    </View>
  );
}

function StartTimerToolUI({ args, status, isError }: {
  args: { durationMinutes: number; label?: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  isError?: boolean;
}) {
  return (
    <ToolCard
      icon={<Clock size={16} color={Colors.primary} />}
      label={isError ? 'Timer not started' : status.type === 'running' ? 'Starting timer' : 'Timer started'}
      detail={`${args.durationMinutes} min${args.label ? ` — ${args.label}` : ''}`}
      running={status.type === 'running'}
      error={isError}
    />
  );
}

function GuideNextStepToolUI({ status, isError }: {
  args: { stepId: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  isError?: boolean;
}) {
  return (
    <ToolCard
      icon={<ChefHat size={16} color={Colors.primary} />}
      label={isError ? 'Could not open that step' : status.type === 'running' ? 'Finding step' : 'Guiding to step'}
      running={status.type === 'running'}
      error={isError}
    />
  );
}

function WalkthroughStateToolUI({ args, status, isError }: {
  args: { active: boolean };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  isError?: boolean;
}) {
  return (
    <ToolCard
      icon={<ChefHat size={16} color={Colors.primary} />}
      label={isError
        ? 'Could not change walkthrough'
        : status.type === 'running'
        ? args.active ? 'Starting walkthrough' : 'Ending walkthrough'
        : args.active ? 'Walkthrough started' : 'Walkthrough ended'}
      detail={args.active ? 'Progress stays in this cooking session' : 'Back to open conversation'}
      running={status.type === 'running'}
      error={isError}
    />
  );
}

interface NoshCookbookChoice {
  id: string;
  title: string;
}

function SearchRecipeCollectionToolUI({ args, status, result, isError }: {
  args: { query: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  result?: RecipeCollectionSearchOutcome;
  isError?: boolean;
}) {
  if (status.type !== 'running' && !isError) return null;
  const count = result?.status === 'resolved'
    ? result.candidates.length
    : result?.candidates.length;
  return (
    <ToolCard
      icon={<ScanSearch size={16} color={Colors.primary} />}
      label={isError ? 'Could not search your cookbooks' : 'Searching your cookbooks'}
      detail={count == null ? args.query : `${count} match${count === 1 ? '' : 'es'}`}
      running={status.type === 'running'}
      error={isError}
    />
  );
}

function BrowseRecipeCollectionToolUI({ args, status, result, isError }: {
  args: RecipeCollectionBrowseInput;
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  result?: RecipeCollectionBrowseResult;
  isError?: boolean;
}) {
  if (status.type !== 'running' && !isError) return null;
  return (
    <ToolCard
      icon={<ScanSearch size={16} color={Colors.primary} />}
      label={isError ? 'Could not browse your cookbooks' : 'Checking your cookbooks'}
      detail={result
        ? `${result.totalCount} matching recipe${result.totalCount === 1 ? '' : 's'}`
        : args.text ?? args.ingredientsAny?.join(', ') ?? 'Your saved recipes'}
      running={status.type === 'running'}
      error={isError}
    />
  );
}

function CookingPreferenceCard({
  args,
  onSave,
  onResult,
}: {
  args: { key: CookingPreferenceKey; value: string; action: 'save' | 'remove' };
  onSave: (input: typeof args) => Promise<unknown>;
  onResult: (result: unknown) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const verb = args.action === 'save' ? 'Remember' : 'Forget';

  const commit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      onResult(await onSave(args));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that preference');
      setSaving(false);
    }
  };

  return (
    <View style={styles.handoffCard}>
      <View style={styles.handoffHeader}>
        <ChefHat size={18} color={Colors.primary} />
        <Text style={styles.handoffTitle}>{verb} this preference?</Text>
      </View>
      <Text style={styles.handoffCopy}>{args.value}</Text>
      {error ? <Text style={styles.preferenceError}>{error}</Text> : null}
      <Pressable
        style={styles.handoffPrimary}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={`${verb} ${args.value}`}
        accessibilityState={{ disabled: saving }}
        onPress={commit}
      >
        {saving
          ? <ActivityIndicator size="small" color={Colors.white} />
          : <Text style={styles.handoffPrimaryText}>{verb}</Text>}
      </Pressable>
      <Pressable
        style={styles.handoffSecondary}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Cancel preference change"
        onPress={() => onResult({ accepted: false })}
      >
        <Text style={styles.handoffSecondaryText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

function LoadRecipeToolUI({ status, result, isError }: {
  args: { pageId: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  result?: LoadedCollectionRecipe;
  isError?: boolean;
}) {
  if (status.type !== 'running' && !isError) return null;
  return (
    <ToolCard
      icon={<BookOpen size={16} color={Colors.primary} />}
      label={isError ? 'Could not load that recipe' : 'Loading saved recipe'}
      detail={result?.recipeGraph.title}
      running={status.type === 'running'}
      error={isError}
    />
  );
}

function OpenRecipeToolUI({ status, result, isError }: {
  args: { pageId: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
  result?: { title?: string };
  isError?: boolean;
}) {
  return (
    <ToolCard
      icon={<BookOpen size={16} color={Colors.primary} />}
      label={isError ? 'Could not open that recipe' : status.type === 'running' ? 'Opening recipe' : 'Recipe opened'}
      detail={result?.title}
      running={status.type === 'running'}
      error={isError}
    />
  );
}


// ---------------------------------------------------------------------------
// Toolkit hook — creates a toolkit with access to the current page
// ---------------------------------------------------------------------------

export interface NoshToolkitContext {
  /** The current page's RecipeGraph (or null if no active page) */
  recipeGraph: RecipeGraph | null;
  /** Apply a confirmed recipe proposal for this session or to the cookbook. */
  onCommitRecipeAction: (
    proposal: RecipeActionProposal,
    mode: RecipeActionCommitMode,
  ) => Promise<{ pageId?: string }>;
  /** Generate an unselected artwork candidate for the focused page. */
  onGenerateArtCandidate?: (instruction: string | undefined, idempotencyKey: string) => Promise<GeneratedRecipePage>;
  /** Select a generated artwork candidate after explicit approval. */
  onSelectArtCandidate?: (candidate: GeneratedRecipePage) => Promise<void>;
  /** Whether the focused page already has selected artwork. */
  hasCurrentArtwork?: boolean;
  /** Compact list used by collection tools and capture destination context. */
  availableCookbooks?: NoshCookbookChoice[];
  /** Callback to start a timer (device-level) */
  onStartTimer?: (durationMinutes: number, label?: string) => void;
  /** Callback to highlight a step on the page */
  onGuideStep?: (stepId: string) => void;
  /** Enter or leave temporary step-by-step cooking mode. */
  onSetWalkthrough?: (active: boolean) => void;
  /** Find likely recipes across every cookbook the signed-in user owns. */
  onSearchRecipeCollection?: (input: {
    query: string;
    cookbookId?: string;
    recentFirst?: boolean;
    limit?: number;
  }) => Promise<RecipeCollectionSearchOutcome>;
  /** Browse or filter the collection without loading full recipe graphs. */
  onBrowseRecipeCollection?: (input: RecipeCollectionBrowseInput) => Promise<RecipeCollectionBrowseResult>;
  /** Load the canonical graph after a collection candidate is selected. */
  onLoadRecipe?: (pageId: string) => Promise<LoadedCollectionRecipe>;
  /** Navigate only after the user explicitly asks to open or show a recipe. */
  onOpenRecipe?: (pageId: string) => Promise<{
    success: true;
    cookbookId: string;
    pageId: string;
    title: string;
  }>;
  /** Load verified names for a move or copy confirmation card. */
  onLoadCollectionActionPreview?: (input: {
    action: CollectionActionKind;
    pageId: string;
    destinationCookbookId: string;
  }) => Promise<CollectionActionPreview>;
  /** Commit a confirmed, idempotent collection move or copy. */
  onCommitCollectionAction?: (input: {
    action: CollectionActionKind;
    pageId: string;
    destinationCookbookId: string;
    idempotencyKey: string;
  }) => Promise<CollectionActionResult>;
  /** Move an explicitly supplied source from conversation into the capture task. */
  onStartRecipeCapture?: (source: {
    sourceType: 'url' | 'text' | 'image' | 'video';
    input?: string;
  }) => void;
  /** Persist or remove a cooking preference only after the user confirms. */
  onSaveCookingPreference?: (input: {
    key: CookingPreferenceKey;
    value: string;
    action: 'save' | 'remove';
  }) => Promise<unknown>;
}

export function useNoshToolkit(ctx: NoshToolkitContext) {
  const {
    recipeGraph,
    onCommitRecipeAction,
    onGenerateArtCandidate,
    onSelectArtCandidate,
    hasCurrentArtwork,
    availableCookbooks,
    onStartTimer,
    onGuideStep,
    onSetWalkthrough,
    onSearchRecipeCollection,
    onBrowseRecipeCollection,
    onLoadRecipe,
    onOpenRecipe,
    onLoadCollectionActionPreview,
    onCommitCollectionAction,
    onStartRecipeCapture,
    onSaveCookingPreference,
  } = ctx;

  return React.useMemo(() => {
    return defineToolkit({
      start_recipe_capture: {
        type: 'human',
        description: 'Ask before moving a recipe source from general conversation into the capture flow',
        parameters: z.object({
          sourceType: z.enum(['url', 'text', 'image', 'video']),
          input: z.string().optional(),
        }),
        render: ({ args, addResult }) => (
          <View style={styles.handoffCard}>
            <View style={styles.handoffHeader}>
              <ChefHat size={18} color={Colors.primary} />
              <Text style={styles.handoffTitle}>Start recipe capture?</Text>
            </View>
            <Text style={styles.handoffCopy}>
              Nosh will read this source and create a complete page in the right cookbook.
            </Text>
            <Pressable
              style={styles.handoffPrimary}
              accessibilityRole="button"
              accessibilityLabel="Start recipe capture"
              onPress={() => {
                onStartRecipeCapture?.(args);
                addResult({ accepted: true, ...args });
              }}
            >
              <Text style={styles.handoffPrimaryText}>Start capture</Text>
            </Pressable>
            <Pressable
              style={styles.handoffSecondary}
              accessibilityRole="button"
              accessibilityLabel="Keep talking without capturing"
              onPress={() => addResult({ accepted: false })}
            >
              <Text style={styles.handoffSecondaryText}>Not now</Text>
            </Pressable>
          </View>
        ),
      },

      search_recipe_collection: {
        type: 'frontend',
        description: 'Find saved recipes across the signed-in user\'s cookbook collection',
        parameters: z.object({
          query: z.string().min(1),
          cookbookId: z.string().optional(),
          recentFirst: z.boolean().optional(),
          limit: z.number().int().min(1).max(5).optional(),
        }),
        execute: async (args) => {
          if (!onSearchRecipeCollection) throw new Error('Recipe collection search is unavailable');
          return onSearchRecipeCollection(args);
        },
        render: SearchRecipeCollectionToolUI,
      },

      browse_recipe_collection: {
        type: 'frontend',
        description: 'Browse or filter saved recipes using compact metadata without loading every full recipe',
        parameters: z.object({
          cookbookIds: z.array(z.string()).max(10).optional(),
          text: z.string().max(120).optional(),
          ingredientsAll: z.array(z.string()).max(10).optional(),
          ingredientsAny: z.array(z.string()).max(10).optional(),
          excludeIngredients: z.array(z.string()).max(10).optional(),
          tags: z.array(z.string()).max(10).optional(),
          category: z.string().max(80).optional(),
          cuisine: z.string().max(80).optional(),
          maxTotalMinutes: z.number().int().min(1).max(1440).optional(),
          sort: z.enum(['relevance', 'recent', 'title', 'time']).optional(),
          cursor: z.string().optional(),
          limit: z.number().int().min(1).max(20).optional(),
        }),
        execute: async (args) => {
          if (!onBrowseRecipeCollection) throw new Error('Recipe collection browsing is unavailable');
          return onBrowseRecipeCollection(args);
        },
        render: BrowseRecipeCollectionToolUI,
      },

      load_recipe: {
        type: 'frontend',
        description: 'Load the full canonical RecipeGraph for one selected saved recipe',
        parameters: z.object({ pageId: z.string().min(1) }),
        execute: async ({ pageId }) => {
          if (!onLoadRecipe) throw new Error('Saved recipe loading is unavailable');
          return onLoadRecipe(pageId);
        },
        render: LoadRecipeToolUI,
      },

      open_recipe: {
        type: 'frontend',
        description: 'Open a resolved saved recipe in its cookbook when the user explicitly asks to open or show it',
        parameters: z.object({ pageId: z.string().min(1) }),
        execute: async ({ pageId }) => {
          if (!onOpenRecipe) throw new Error('Recipe navigation is unavailable');
          return onOpenRecipe(pageId);
        },
        render: OpenRecipeToolUI,
      },

      list_cookbooks: {
        type: 'frontend',
        description: 'Return the signed-in user\'s compact cookbook list for destination resolution',
        parameters: z.object({}),
        execute: async () => ({ cookbooks: availableCookbooks ?? [] }),
        render: ({ status, result, isError }) => {
          if (status.type !== 'running' && !isError) return null;
          return (
            <ToolCard
              icon={<BookOpen size={16} color={Colors.primary} />}
              label={isError ? 'Could not check your cookbooks' : 'Checking your cookbooks'}
              detail={result ? `${result.cookbooks.length} cookbook${result.cookbooks.length === 1 ? '' : 's'}` : undefined}
              running={status.type === 'running'}
              error={isError}
            />
          );
        },
      },

      organize_recipe: {
        type: 'human',
        description: 'Show an exact move or copy preview and wait for explicit user confirmation',
        parameters: z.object({
          action: z.enum(['move', 'copy']),
          pageId: z.string().min(1),
          destinationCookbookId: z.string().min(1),
        }),
        render: ({ args, addResult }) => {
          if (!onLoadCollectionActionPreview || !onCommitCollectionAction) {
            return <ToolCard icon={<BookOpen size={16} color={Colors.primary} />} label="Collection changes are unavailable" />;
          }
          return (
            <CollectionActionCard
              {...args}
              onPreview={onLoadCollectionActionPreview}
              onCommit={onCommitCollectionAction}
              onResult={addResult}
            />
          );
        },
      },

      save_cooking_preference: {
        type: 'human',
        description: 'Show a confirmation before remembering or forgetting a durable cooking preference',
        parameters: z.object({
          key: z.enum([
            'allergy',
            'dietary_restriction',
            'disliked_ingredient',
            'measurement_system',
            'default_servings',
            'appliance',
            'cooking_goal',
          ]),
          value: z.string().min(1).max(200),
          action: z.enum(['save', 'remove']),
        }),
        render: ({ args, addResult }) => {
          if (!onSaveCookingPreference) {
            return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="Cooking preferences are unavailable" />;
          }
          return (
            <CookingPreferenceCard
              args={args}
              onSave={onSaveCookingPreference}
              onResult={addResult}
            />
          );
        },
      },

      scale_servings: {
        type: 'human',
        description: 'Preview scaled ingredient quantities and wait for the user to choose temporary or saved use',
        parameters: z.object({
          targetServings: z.number().int().min(1).max(100),
        }),
        render: ({ args, addResult }) => {
          if (!recipeGraph) return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="No recipe in focus" />;
          try {
            return (
              <RecipeActionPreviewCard
                proposal={proposeServingScale(recipeGraph, args.targetServings)}
                onCommit={onCommitRecipeAction}
                onResult={addResult}
              />
            );
          } catch (error) {
            return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="Could not prepare change" detail={error instanceof Error ? error.message : undefined} />;
          }
        },
      },

      substitute_ingredient: {
        type: 'human',
        description: 'Preview an ingredient substitution and wait for the user to choose temporary or saved use',
        parameters: z.object({
          ingredientName: z.string(),
          substituteName: z.string(),
          substituteQuantity: z.string().optional(),
          substituteUnit: z.string().optional(),
          reason: z.string().optional(),
        }),
        render: ({ args, addResult }) => {
          if (!recipeGraph) return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="No recipe in focus" />;
          try {
            return (
              <RecipeActionPreviewCard
                proposal={proposeIngredientSubstitution(recipeGraph, args)}
                onCommit={onCommitRecipeAction}
                onResult={addResult}
              />
            );
          } catch (error) {
            return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="Could not prepare change" detail={error instanceof Error ? error.message : undefined} />;
          }
        },
      },

      start_timer: {
        type: 'frontend',
        description: 'Start a cooking timer',
        parameters: z.object({
          durationMinutes: z.number().int().min(1).max(600),
          label: z.string().optional(),
        }),
        execute: async ({ durationMinutes, label }) => {
          onStartTimer?.(durationMinutes, label);
          return { success: true, durationMinutes, label };
        },
        render: StartTimerToolUI,
      },

      guide_next_step: {
        type: 'frontend',
        description: 'Highlight a specific step on the page',
        parameters: z.object({
          stepId: z.string(),
        }),
        execute: async ({ stepId }) => {
          onGuideStep?.(stepId);
          return { success: true, stepId };
        },
        render: GuideNextStepToolUI,
      },

      set_walkthrough: {
        type: 'frontend',
        description: 'Start or end temporary step-by-step guidance after an explicit user request',
        parameters: z.object({ active: z.boolean() }),
        execute: async ({ active }) => {
          onSetWalkthrough?.(active);
          return { success: true, active };
        },
        render: WalkthroughStateToolUI,
      },

      update_page_data: {
        type: 'human',
        description: 'Preview recipe graph patch operations and wait for the user to choose temporary or saved use',
        parameters: z.object({
          operations: z.array(
            z.object({
              path: z.string(),
              value: z.unknown(),
            }),
          ),
        }),
        render: ({ args, addResult }) => {
          if (!recipeGraph) return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="No recipe in focus" />;
          try {
            return (
              <RecipeActionPreviewCard
                proposal={proposeGraphPatch(recipeGraph, args.operations)}
                onCommit={onCommitRecipeAction}
                onResult={addResult}
              />
            );
          } catch (error) {
            return <ToolCard icon={<ChefHat size={16} color={Colors.primary} />} label="Could not prepare change" detail={error instanceof Error ? error.message : undefined} />;
          }
        },
      },

      regenerate_recipe_page: {
        type: 'human',
        description: 'Show generation cost, create an unselected complete-page candidate, and wait for approval',
        parameters: z.object({
          instruction: z.string().max(600).optional(),
        }),
        render: ({ args, addResult }) => (
          <ArtworkActionCard
            instruction={args.instruction}
            hasCurrentArtwork={Boolean(hasCurrentArtwork)}
            onGenerate={async (instruction, idempotencyKey) => {
              if (!onGenerateArtCandidate) throw new Error('Artwork generation is unavailable');
              return onGenerateArtCandidate(instruction, idempotencyKey);
            }}
            onSelect={async (candidate) => {
              if (!onSelectArtCandidate) throw new Error('Artwork selection is unavailable');
              return onSelectArtCandidate(candidate);
            }}
            onResult={addResult}
          />
        ),
      },
    });
  }, [
    recipeGraph,
    onCommitRecipeAction,
    onGenerateArtCandidate,
    onSelectArtCandidate,
    hasCurrentArtwork,
    availableCookbooks,
    onStartTimer,
    onGuideStep,
    onSetWalkthrough,
    onSearchRecipeCollection,
    onBrowseRecipeCollection,
    onLoadRecipe,
    onOpenRecipe,
    onLoadCollectionActionPreview,
    onCommitCollectionAction,
    onStartRecipeCapture,
    onSaveCookingPreference,
  ]);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  handoffCard: {
    gap: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginVertical: 4,
  },
  handoffHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  handoffTitle: { color: Colors.text, fontFamily: Fonts.display.bold, fontSize: 16 },
  handoffCopy: { color: Colors.slate, fontSize: 12, lineHeight: 18 },
  preferenceError: { color: Colors.error, fontSize: 12, lineHeight: 18 },
  handoffPrimary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
  },
  handoffPrimaryText: { color: Colors.onPrimary, fontFamily: Fonts.ui.medium, fontSize: 13 },
  handoffSecondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    paddingHorizontal: Spacing.md,
  },
  handoffSecondaryText: { color: Colors.text, fontFamily: Fonts.ui.medium, fontSize: 13 },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.ash,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginVertical: 4,
  },
  toolCardError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  toolIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  toolText: {
    flex: 1,
  },
  toolLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },
  toolDetail: {
    color: Colors.slate,
    fontSize: 12,
    lineHeight: 16,
  },
});
