/**
 * NoshAssistantChat — the Phase 5 in-book assistant.
 *
 * Replaces the legacy NoshAssistantButton + NoshAssistantSheet with
 * an assistant-ui powered chat interface. Features:
 *   - Gemini-style clean message bubbles
 *   - Inline tool-call cards (scale, substitute, timer, guide, edit)
 *   - Suggestion chips for quick prompts
 *   - Live page updates via tool execution
 *   - Streaming-ready architecture
 *
 * The component wraps the assistant-ui runtime in a Sheet, with
 * AssistantRuntimeProvider at the top. The runtime bridges to the
 * nosh-chat Edge Function via the NoshChatAdapter, and tools execute
 * against the active page's RecipeGraph.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ChefHat, Send } from 'lucide-react-native';
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  Tools,
  useAuiState,
  useLocalRuntime,
} from '@assistant-ui/react-native';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radii, Spacing, Typography } from '@/constants/spacing';
import { Fonts } from '@/utils/fonts';
import { createNoshChatAdapter } from '@/utils/cookbook/noshChatAdapter';
import { useNoshToolkit } from '@/utils/cookbook/noshToolkit';
import { updatePageRecipeGraph } from '@/utils/cookbook/api';
import type { CookbookPage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NoshAssistantChatProps {
  visible: boolean;
  page: CookbookPage | null;
  cookbookPages: CookbookPage[];
  cookbookTitle?: string;
  pageNumber?: number;
  onClose: () => void;
  /** Called when a tool mutates the RecipeGraph (updates React Query cache) */
  onPageUpdate?: (page: CookbookPage) => void;
}

// ---------------------------------------------------------------------------
// Quick prompts (shown as suggestion chips)
// ---------------------------------------------------------------------------

const QUICK_PROMPTS = [
  'Scale servings',
  'Substitute ingredient',
  'Make a shopping list',
  'Walk me through cooking',
  'Make it healthier',
];

// ---------------------------------------------------------------------------
// Message components — Gemini-style bubbles
// ---------------------------------------------------------------------------

function UserMessage() {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <MessagePrimitive.Parts
          components={{
            Text: ({ text }: { text: string }) => <Text style={styles.userText}>{text}</Text>,
          }}
        />
      </View>
    </View>
  );
}

function AssistantMessage() {
  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantAvatar}>
        <ChefHat size={16} color={Colors.onPrimary} />
      </View>
      <View style={styles.assistantBubble}>
        <MessagePrimitive.Parts
          components={{
            Text: ({ text }: { text: string }) => <Text style={styles.assistantText}>{text}</Text>,
          }}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Composer — rounded input with send button
// ---------------------------------------------------------------------------

function NoshComposer() {
  const isEmpty = useAuiState((s) => s.composer.isEmpty);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <ComposerPrimitive.Root style={styles.composer}>
      <ComposerPrimitive.Input
        placeholder="Ask Nosh..."
        placeholderTextColor={Colors.textMuted}
        multiline
        style={styles.composerInput}
      />
      {isRunning ? (
        <ComposerPrimitive.Cancel style={styles.cancelButton}>
          <Text style={styles.cancelText}>Stop</Text>
        </ComposerPrimitive.Cancel>
      ) : (
        <ComposerPrimitive.Send
          style={[styles.sendButton, isEmpty && styles.sendDisabled]}
        >
          <Send size={18} color={Colors.onPrimary} />
        </ComposerPrimitive.Send>
      )}
    </ComposerPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// Suggestion chips
// ---------------------------------------------------------------------------

function SuggestionChips() {
  return (
    <AuiIf condition={(s) => s.thread.isEmpty}>
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Nosh is looking at this page</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {QUICK_PROMPTS.map((prompt) => (
            <ThreadPrimitive.Suggestion
              key={prompt}
              prompt={prompt}
              send
              style={styles.chip}
            >
              <Text style={styles.chipText}>{prompt}</Text>
            </ThreadPrimitive.Suggestion>
          ))}
        </ScrollView>
      </View>
    </AuiIf>
  );
}

// ---------------------------------------------------------------------------
// Thread — the message list + composer
// ---------------------------------------------------------------------------

function NoshThread() {
  return (
    <View style={styles.threadContainer}>
      <ThreadPrimitive.MessagesFlatList
        autoScroll
        contentContainerStyle={styles.messagesContent}
        style={styles.messagesList}
        components={{
          UserMessage,
          AssistantMessage,
        }}
      />
      <SuggestionChips />
      <NoshComposer />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Runtime provider — wraps the adapter + toolkit
// ---------------------------------------------------------------------------

interface NoshRuntimeProviderProps {
  page: CookbookPage | null;
  cookbookPages: CookbookPage[];
  cookbookTitle?: string;
  children: React.ReactNode;
  onPageUpdate?: (page: CookbookPage) => void;
}

function NoshRuntimeProvider({
  page,
  cookbookPages,
  cookbookTitle,
  children,
  onPageUpdate,
}: NoshRuntimeProviderProps) {
  // Keep a ref to the latest page so the adapter always sends current state
  const pageRef = useRef(page);
  pageRef.current = page;
  const cookbookPagesRef = useRef(cookbookPages);
  cookbookPagesRef.current = cookbookPages;
  const titleRef = useRef(cookbookTitle);
  titleRef.current = cookbookTitle;

  // Tool execution: update the RecipeGraph and persist
  const handleUpdateGraph = useCallback(
    (graph: RecipeGraph) => {
      if (!pageRef.current) return;
      const updatedPage: CookbookPage = {
        ...pageRef.current,
        recipeGraph: graph,
      };
      // Update React Query cache immediately (live typesetter re-render)
      onPageUpdate?.(updatedPage);
      // Persist to DB in the background
      updatePageRecipeGraph(pageRef.current.id, graph).catch((err) => {
        console.warn('[NoshAssistant] Failed to persist graph update', err);
      });
    },
    [onPageUpdate],
  );

  // Create the toolkit with tool execution callbacks
  const toolkit = useNoshToolkit({
    recipeGraph: page?.recipeGraph ?? null,
    onUpdateGraph: handleUpdateGraph,
    onStartTimer: (duration, label) => {
      console.log('[NoshAssistant] Timer requested', { duration, label });
      // Timer implementation: use the device notification API
      // For now, this is a placeholder — actual timer UI is a follow-up
    },
    onGuideStep: (stepId) => {
      console.log('[NoshAssistant] Guide to step', stepId);
      // Step highlighting: scroll to the step in the typesetter
      // For now, this is a placeholder — actual step highlighting is a follow-up
    },
  });

  // Create the adapter — context is read at call time via closures
  const adapter = useMemo(
    () =>
      createNoshChatAdapter(() => ({
        recipeGraph: pageRef.current?.recipeGraph ?? null,
        cookbookPages: cookbookPagesRef.current,
        cookbookTitle: titleRef.current,
        styleId: pageRef.current?.styleId,
      })),
    [],
  );

  // Create the runtime with tool support
  const runtime = useLocalRuntime(adapter, {
    maxSteps: 5,
  });

  // Register tools via AuiConfig
  const config = useMemo(() => AuiConfig({ tools: Tools({ toolkit }) }), [toolkit]);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      {children}
    </AssistantRuntimeProvider>
  );
}

// ---------------------------------------------------------------------------
// Main component — the Sheet wrapper
// ---------------------------------------------------------------------------

export function NoshAssistantChat({
  visible,
  page,
  cookbookPages,
  cookbookTitle,
  pageNumber,
  onClose,
  onPageUpdate,
}: NoshAssistantChatProps) {
  const contextLabel = page
    ? [
        page.title,
        pageNumber ? `Page ${pageNumber}` : null,
        cookbookTitle ?? 'Cookbook',
      ]
        .filter(Boolean)
        .join(' - ')
    : cookbookTitle ?? 'Cookbook';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      keyboardAvoiding
      maxHeight="82%"
      contentStyle={styles.sheet}
      handleStyle={styles.handle}
      closeButtonStyle={styles.closeButton}
      closeAccessibilityLabel="Close Nosh chat"
      header={
        <>
          <View style={styles.iconBadge}>
            <ChefHat size={20} color={Colors.onPrimary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Ask Nosh</Text>
            <Text style={styles.title} numberOfLines={1}>
              {contextLabel}
            </Text>
          </View>
        </>
      }
    >
      <NoshRuntimeProvider
        page={page}
        cookbookPages={cookbookPages}
        cookbookTitle={cookbookTitle}
        onPageUpdate={onPageUpdate}
      >
        <NoshThread />
      </NoshRuntimeProvider>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Button component — the floating "Ask Nosh" trigger
// ---------------------------------------------------------------------------

interface NoshAssistantChatButtonProps {
  page: CookbookPage;
  cookbookPages: CookbookPage[];
  cookbookTitle?: string;
  pageNumber?: number;
  onPageUpdate?: (page: CookbookPage) => void;
}

export function NoshAssistantChatButton({
  page,
  cookbookPages,
  cookbookTitle,
  pageNumber,
  onPageUpdate,
}: NoshAssistantChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Pressable
        style={styles.button}
        accessibilityLabel={`Ask Nosh about ${page.title}`}
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
      >
        <ChefHat size={20} color={Colors.text} />
        <Text style={styles.buttonLabel}>Ask Nosh</Text>
      </Pressable>
      <NoshAssistantChat
        visible={isOpen}
        page={page}
        cookbookPages={cookbookPages}
        cookbookTitle={cookbookTitle}
        pageNumber={pageNumber}
        onClose={() => setIsOpen(false)}
        onPageUpdate={onPageUpdate}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles — Gemini-inspired clean chat aesthetic
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Sheet
  sheet: {
    backgroundColor: Colors.alabaster,
    borderWidth: 1,
    borderColor: Colors.ash,
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  handle: {
    backgroundColor: Colors.duskGrey,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Fonts.ui.medium,
    letterSpacing: 0,
  },
  title: {
    color: Colors.text,
    fontFamily: Fonts.display.bold,
    fontSize: Typography.sizes.xl,
  },
  closeButton: {
    backgroundColor: Colors.white,
  },

  // Thread
  threadContainer: {
    flex: 1,
    gap: Spacing.sm,
  },
  messagesList: {
    flex: 1,
    minHeight: 200,
  },
  messagesContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 2,
  },

  // User message — right-aligned, primary color
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    borderRadius: Radii.lg,
    borderBottomRightRadius: Radii.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  userText: {
    color: Colors.onPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.ui.regular,
  },

  // Assistant message — left-aligned, clean white with avatar
  assistantRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  assistantBubble: {
    flex: 1,
    maxWidth: '85%',
    borderRadius: Radii.lg,
    borderBottomLeftRadius: Radii.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.ash,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  assistantText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.ui.regular,
  },

  // Suggestions
  suggestionsContainer: {
    gap: Spacing.xs,
    paddingHorizontal: 2,
  },
  suggestionsTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.ui.medium,
  },
  chipsRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  chip: {
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },

  // Composer — Gemini-style rounded input
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.ash,
    backgroundColor: Colors.white,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.ui.regular,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  cancelButton: {
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ash,
    paddingHorizontal: Spacing.md,
  },
  cancelText: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
    fontSize: 13,
  },

  // Floating button
  button: {
    minWidth: 126,
    height: 44,
    borderRadius: 9999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.charcoal,
    boxShadow: Colors.book.cardShadow,
  },
  buttonLabel: {
    color: Colors.text,
    fontFamily: Fonts.ui.medium,
  },
});
