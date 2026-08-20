/**
 * NoshToolkit — tool definitions for the 5 Nosh assistant tools.
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
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { defineToolkit } from '@assistant-ui/react-native';
import { z } from 'zod';
import { ChefHat, Clock, Scale, Utensils, Wrench } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import type {
  IngredientGroup,
  RecipeGraph,
} from '@/types/recipeGraph';

// ---------------------------------------------------------------------------
// Tool execution helpers — mutate the RecipeGraph
// ---------------------------------------------------------------------------

/** Scale all ingredient quantities by a ratio, preserving originals. */
function scaleServings(graph: RecipeGraph, targetServings: number): RecipeGraph {
  const ratio = targetServings / graph.servings;
  const ingredientGroups: IngredientGroup[] = graph.ingredientGroups.map((group) => ({
    ...group,
    ingredients: group.ingredients.map((ing) => ({
      ...ing,
      originalQuantity: ing.originalQuantity ?? ing.quantity,
      quantity: scaleQuantity(ing.quantity, ratio),
    })),
  }));

  return { ...graph, servings: targetServings, ingredientGroups };
}

function scaleQuantity(quantity: string | undefined, ratio: number): string | undefined {
  if (!quantity) return undefined;
  const parsed = parseQuantity(quantity);
  if (parsed === null) return quantity;
  const scaled = parsed * ratio;
  const rounded = Math.round(scaled * 100) / 100;
  return formatQuantity(rounded);
}

function parseQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
  }
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    const lower = parseFloat(parts[0]);
    if (!isNaN(lower)) return lower;
  }
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

function formatQuantity(value: number): string {
  if (value === Math.floor(value)) return String(value);
  const fractionMap: Array<[number, string]> = [
    [0.25, '1/4'],
    [0.33, '1/3'],
    [0.5, '1/2'],
    [0.67, '2/3'],
    [0.75, '3/4'],
  ];
  const remainder = value - Math.floor(value);
  for (const [frac, label] of fractionMap) {
    if (Math.abs(remainder - frac) < 0.02) {
      const wholePart = Math.floor(value);
      return wholePart > 0 ? `${wholePart} ${label}` : label;
    }
  }
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/** Substitute one ingredient for another. */
function substituteIngredient(
  graph: RecipeGraph,
  args: {
    ingredientName: string;
    substituteName: string;
    substituteQuantity?: string;
    substituteUnit?: string;
  },
): RecipeGraph {
  const target = args.ingredientName.toLowerCase();
  const ingredientGroups: IngredientGroup[] = graph.ingredientGroups.map((group) => ({
    ...group,
    ingredients: group.ingredients.map((ing) => {
      if (ing.name.toLowerCase().includes(target)) {
        return {
          ...ing,
          name: args.substituteName,
          quantity: args.substituteQuantity ?? ing.quantity,
          unit: args.substituteUnit ?? ing.unit,
        };
      }
      return ing;
    }),
  }));

  return { ...graph, ingredientGroups };
}

/** Apply JSON-patch-style operations to the recipe graph. */
function applyPatchOperations(
  graph: RecipeGraph,
  operations: Array<{ path: string; value: unknown }>,
): RecipeGraph {
  const clone: RecipeGraph = JSON.parse(JSON.stringify(graph));

  for (const op of operations) {
    applyPatch(clone, op.path, op.value);
  }

  return clone;
}

function applyPatch(target: unknown, path: string, value: unknown): void {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const index = parseInt(seg, 10);
    if (!isNaN(index) && Array.isArray(current)) {
      current = current[index];
    } else if (current && typeof current === 'object') {
      current = current[seg];
    } else {
      return;
    }
  }

  const lastSeg = segments[segments.length - 1];
  const lastIndex = parseInt(lastSeg, 10);
  if (value === null) {
    if (!isNaN(lastIndex) && Array.isArray(current)) {
      current.splice(lastIndex, 1);
    } else if (current && typeof current === 'object') {
      delete current[lastSeg];
    }
  } else {
    if (!isNaN(lastIndex) && Array.isArray(current)) {
      current[lastIndex] = value;
    } else if (current && typeof current === 'object') {
      current[lastSeg] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Tool UI components — inline cards shown when tools execute
// ---------------------------------------------------------------------------

function ToolCard({
  icon,
  label,
  detail,
  running,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  running?: boolean;
}) {
  return (
    <View style={styles.toolCard}>
      <View style={styles.toolIcon}>{icon}</View>
      <View style={styles.toolText}>
        <Text style={styles.toolLabel}>{label}</Text>
        {detail ? <Text style={styles.toolDetail}>{detail}</Text> : null}
      </View>
      {running ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
    </View>
  );
}

function ScaleServingsToolUI({ args, status }: {
  args: { targetServings: number };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
}) {
  const target = args.targetServings;
  return (
    <ToolCard
      icon={<Scale size={16} color={Colors.primary} />}
      label={status.type === 'running' ? 'Scaling recipe' : 'Scaled recipe'}
      detail={`to ${target} servings`}
      running={status.type === 'running'}
    />
  );
}

function SubstituteIngredientToolUI({ args, status }: {
  args: { ingredientName: string; substituteName: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
}) {
  return (
    <ToolCard
      icon={<Utensils size={16} color={Colors.primary} />}
      label={status.type === 'running' ? 'Substituting ingredient' : 'Substituted ingredient'}
      detail={`${args.ingredientName} → ${args.substituteName}`}
      running={status.type === 'running'}
    />
  );
}

function StartTimerToolUI({ args, status }: {
  args: { durationMinutes: number; label?: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
}) {
  return (
    <ToolCard
      icon={<Clock size={16} color={Colors.primary} />}
      label={status.type === 'running' ? 'Starting timer' : 'Timer started'}
      detail={`${args.durationMinutes} min${args.label ? ` — ${args.label}` : ''}`}
      running={status.type === 'running'}
    />
  );
}

function GuideNextStepToolUI({ status }: {
  args: { stepId: string };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
}) {
  return (
    <ToolCard
      icon={<ChefHat size={16} color={Colors.primary} />}
      label={status.type === 'running' ? 'Finding step' : 'Guiding to step'}
      running={status.type === 'running'}
    />
  );
}

function UpdatePageDataToolUI({ args, status }: {
  args: { operations: Array<{ path: string }> };
  status: { type: 'running' | 'complete' | 'incomplete' | 'requires-action' };
}) {
  const ops = args.operations ?? [];
  return (
    <ToolCard
      icon={<Wrench size={16} color={Colors.primary} />}
      label={status.type === 'running' ? 'Updating recipe' : 'Updated recipe'}
      detail={`${ops.length} change${ops.length === 1 ? '' : 's'}`}
      running={status.type === 'running'}
    />
  );
}

// ---------------------------------------------------------------------------
// Toolkit hook — creates a toolkit with access to the current page
// ---------------------------------------------------------------------------

export interface NoshToolkitContext {
  /** The current page's RecipeGraph (or null if no active page) */
  recipeGraph: RecipeGraph | null;
  /** Callback to update the page with a new RecipeGraph */
  onUpdateGraph: (graph: RecipeGraph) => void;
  /** Callback to start a timer (device-level) */
  onStartTimer?: (durationMinutes: number, label?: string) => void;
  /** Callback to highlight a step on the page */
  onGuideStep?: (stepId: string) => void;
}

export function useNoshToolkit(ctx: NoshToolkitContext) {
  const { recipeGraph, onUpdateGraph, onStartTimer, onGuideStep } = ctx;

  return React.useMemo(() => {
    return defineToolkit({
      scale_servings: {
        description: 'Scale all ingredient quantities to a new serving count',
        parameters: z.object({
          targetServings: z.number().int().min(1).max(100),
        }),
        execute: async ({ targetServings }) => {
          if (!recipeGraph) throw new Error('No active recipe to scale');
          const updated = scaleServings(recipeGraph, targetServings);
          onUpdateGraph(updated);
          return { success: true, servings: targetServings };
        },
        render: ScaleServingsToolUI,
      },

      substitute_ingredient: {
        description: 'Substitute one ingredient for another',
        parameters: z.object({
          ingredientName: z.string(),
          substituteName: z.string(),
          substituteQuantity: z.string().optional(),
          substituteUnit: z.string().optional(),
          reason: z.string().optional(),
        }),
        execute: async (args) => {
          if (!recipeGraph) throw new Error('No active recipe to modify');
          const updated = substituteIngredient(recipeGraph, args);
          onUpdateGraph(updated);
          return { success: true, from: args.ingredientName, to: args.substituteName };
        },
        render: SubstituteIngredientToolUI,
      },

      start_timer: {
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

      update_page_data: {
        description: 'Update the recipe graph with patch operations',
        parameters: z.object({
          operations: z.array(
            z.object({
              path: z.string(),
              value: z.unknown(),
            }),
          ),
        }),
        execute: async ({ operations }) => {
          if (!recipeGraph) throw new Error('No active recipe to update');
          const updated = applyPatchOperations(recipeGraph, operations);
          onUpdateGraph(updated);
          return { success: true, operationCount: operations.length };
        },
        render: UpdatePageDataToolUI,
      },
    });
  }, [recipeGraph, onUpdateGraph, onStartTimer, onGuideStep]);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
