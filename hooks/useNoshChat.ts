/**
 * useNoshChat
 *
 * Main chat state management hook for the Nosh AI kitchen buddy.
 * - Persists messages to AsyncStorage (last 100)
 * - Routes imports through the orchestrator (URL / video / image / recipe text)
 * - Maintains an "active recipe" context for follow-up AI questions
 * - Handles regular conversational AI chat via createChatCompletion
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NoshChatMessage, Meal } from '@/types';
import { detectContentType, looksLikeRecipe, ContentType } from '@/utils/contentDetector';
import { orchestrateImport } from '@/utils/importOrchestrator';
import { createChatCompletion, ChatMessage } from '@/utils/aiClient';
import { buildAIContext } from '@/utils/aiContext';
import { useMeals } from '@/hooks/useMealsStore';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  CHAT_STORAGE_KEY,
  NOSH_FIRST_MESSAGE,
  NOSH_SYSTEM_RULES,
} from '@/constants/brand';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PERSISTED_MESSAGES = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function welcomeMessage(): NoshChatMessage {
  return {
    id: makeId(),
    role: 'assistant',
    content: NOSH_FIRST_MESSAGE,
    timestamp: Date.now(),
  };
}

function processingMessage(contentType: ContentType): string {
  switch (contentType) {
    case 'video_url':
      return "Ooh, a cooking video! Let me watch this and grab the recipe 🎬👨‍🍳";
    case 'recipe_url':
      return "Nice link! Let me pull that recipe out for you 🔗";
    case 'image':
      return "Let me take a look at that photo 📸👨‍🍳";
    default:
      return "On it! Parsing that recipe for you 📝";
  }
}

function successMessage(meal: Meal): string {
  const category = meal.category
    ? meal.category.charAt(0).toUpperCase() + meal.category.slice(1)
    : 'Recipe';
  const totalTime = (meal.prepTime ?? 0) + (meal.cookTime ?? 0);
  const ingredientCount = meal.ingredients?.length ?? 0;
  return `Saved! 🍝 **${meal.name}** → ${category}. ${ingredientCount} ingredients, ${totalTime} min. What else you got?`;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseNoshChatReturn {
  messages: NoshChatMessage[];
  isTyping: boolean;
  activeRecipe: Meal | null;
  sendMessage: (text: string, imageBase64?: string) => Promise<void>;
  clearChat: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNoshChat(): UseNoshChatReturn {
  const [messages, setMessages] = useState<NoshChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Meal | null>(null);

  const { addMeal, meals } = useMeals();
  const { profile } = useUserProfile();

  // Track whether we've finished loading from storage
  const loadedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Load persisted messages on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (raw) {
          const parsed: NoshChatMessage[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (err) {
        console.warn('[useNoshChat] Failed to load chat history:', err);
      }
      // First open — show welcome message
      setMessages([welcomeMessage()]);
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Persist messages whenever they change (capped at MAX_PERSISTED_MESSAGES)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!loadedRef.current) return;
    if (messages.length === 0) return;

    const toSave = messages.slice(-MAX_PERSISTED_MESSAGES);
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave)).catch((err) =>
      console.warn('[useNoshChat] Failed to persist chat:', err),
    );
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Build system prompt
  // ---------------------------------------------------------------------------

  const buildSystemPrompt = useCallback(
    (recipe: Meal | null): string => {
      const parts: string[] = [NOSH_SYSTEM_RULES];

      // User profile context
      const profileCtx = buildAIContext({ profile });
      if (profileCtx) {
        parts.push('\n### User Profile\n' + profileCtx);
      }

      // Active recipe context
      if (recipe) {
        const ingredientList = recipe.ingredients
          .slice(0, 15)
          .map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim())
          .join(', ');
        parts.push(
          '\n### Active Recipe\n' +
            `Name: ${recipe.name}\n` +
            `Category: ${recipe.category ?? 'unknown'}\n` +
            `Ingredients: ${ingredientList || 'n/a'}\n` +
            `Steps: ${recipe.steps.length}`,
        );
      }

      // Saved recipes list (names only to keep prompt lean)
      if (meals.length > 0) {
        const recipeNames = meals
          .slice(0, 20)
          .map((m) => m.name)
          .join(', ');
        parts.push(`\n### Saved Recipes (${meals.length} total)\n${recipeNames}`);
      }

      return parts.join('\n');
    },
    [profile, meals],
  );

  // ---------------------------------------------------------------------------
  // Append helpers
  // ---------------------------------------------------------------------------

  const appendMessage = useCallback((msg: NoshChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const appendMessages = useCallback((msgs: NoshChatMessage[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  }, []);

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (text: string, imageBase64?: string) => {
      const trimmed = text.trim();
      if (!trimmed && !imageBase64) return;

      const hasImage = Boolean(imageBase64);
      const contentType = detectContentType(trimmed, hasImage);

      // 1. Add user message
      const userMsg: NoshChatMessage = {
        id: makeId(),
        role: 'user',
        content: trimmed || '[photo]',
        timestamp: Date.now(),
      };
      appendMessage(userMsg);

      setIsTyping(true);

      try {
        // -----------------------------------------------------------------------
        // 2. Decide routing: import pipeline or plain chat
        // -----------------------------------------------------------------------

        const shouldImport =
          contentType === 'video_url' ||
          contentType === 'recipe_url' ||
          contentType === 'image' ||
          (contentType === 'text' && looksLikeRecipe(trimmed));

        if (shouldImport) {
          // Show contextual processing message
          const processingMsg: NoshChatMessage = {
            id: makeId(),
            role: 'assistant',
            content: processingMessage(contentType),
            timestamp: Date.now(),
            isProcessing: true,
          };
          appendMessage(processingMsg);

          const result = await orchestrateImport(trimmed, contentType, imageBase64);

          if (result.success && result.meal) {
            // Auto-save the meal
            addMeal(result.meal);
            setActiveRecipe(result.meal);

            // Replace the processing indicator with the recipe card message
            const successMsg: NoshChatMessage = {
              id: makeId(),
              role: 'assistant',
              content: successMessage(result.meal),
              timestamp: Date.now(),
              recipeCard: result.meal,
            };

            setMessages((prev) => {
              // Remove the processing message (last one with isProcessing flag)
              const withoutProcessing = prev.filter((m) => m.id !== processingMsg.id);
              return [...withoutProcessing, successMsg];
            });
          } else if (result.isConversation) {
            // Orchestrator decided this is a chat message — fall through to AI chat
            setMessages((prev) => prev.filter((m) => m.id !== processingMsg.id));
            await handleAiChat(trimmed);
          } else {
            // Import failed
            const errorMsg: NoshChatMessage = {
              id: makeId(),
              role: 'assistant',
              content: result.error
                ? `Hmm, I couldn't grab that recipe 😅 ${result.error}`
                : "Hmm, I couldn't grab that recipe. Try a different link or paste the text directly!",
              timestamp: Date.now(),
            };
            setMessages((prev) => {
              const withoutProcessing = prev.filter((m) => m.id !== processingMsg.id);
              return [...withoutProcessing, errorMsg];
            });
          }
        } else {
          // Plain AI conversation
          await handleAiChat(trimmed);
        }
      } catch (err) {
        console.error('[useNoshChat] sendMessage error:', err);
        const errorMsg: NoshChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: "Something went wrong on my end 😬 Try again in a sec!",
          timestamp: Date.now(),
        };
        appendMessage(errorMsg);
      } finally {
        setIsTyping(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appendMessage, addMeal, buildSystemPrompt, activeRecipe, messages],
  );

  // ---------------------------------------------------------------------------
  // Regular AI chat (extracted so sendMessage can call it after fallback)
  // ---------------------------------------------------------------------------

  async function handleAiChat(userText: string) {
    const systemPrompt = buildSystemPrompt(activeRecipe);

    // Build conversation history for the AI (skip processing placeholders)
    const history: ChatMessage[] = messages
      .filter((m) => !m.isProcessing && m.content && m.content !== '[photo]')
      .slice(-20) // Keep last 20 exchanges for context window
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userText },
    ];

    const reply = await createChatCompletion(chatMessages);

    const assistantMsg: NoshChatMessage = {
      id: makeId(),
      role: 'assistant',
      content: reply,
      timestamp: Date.now(),
    };
    appendMessage(assistantMsg);
  }

  // ---------------------------------------------------------------------------
  // clearChat
  // ---------------------------------------------------------------------------

  const clearChat = useCallback(async () => {
    const fresh = [welcomeMessage()];
    setMessages(fresh);
    setActiveRecipe(null);
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(fresh));
    } catch (err) {
      console.warn('[useNoshChat] Failed to clear persisted chat:', err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return { messages, isTyping, activeRecipe, sendMessage, clearChat };
}
