import { useState, useCallback } from 'react';
import { aiChat, ChatMessage as ApiChatMessage } from '@/utils/aiClient';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useInventory } from '@/hooks/useInventoryStore';
import { useMealPlanner } from '@/hooks/useMealPlanner';

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function useAiCoach() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { profile } = useUserProfile();
  const { inventory } = useInventory();
  const { plannedMeals } = useMealPlanner();

  const buildContext = useCallback(() => {
    // Keep payload compact and typed
    const inv = (inventory ?? []).slice(0, 100).map((i): {
      id: string;
      name: string;
      quantity: number;
      unit: string | undefined;
      category: string;
      expiryDate: string | null;
    } => ({
      id: String(i.id),
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
      expiryDate: i.expiryDate ?? null,
    }));

    const plans = (plannedMeals ?? []).slice(0, 100).map((p) => ({
      id: p.id,
      recipeId: p.recipeId,
      date: p.date,
      mealType: p.mealType,
      servings: p.servings,
      notes: p.notes ?? null,
      isCompleted: !!p.isCompleted,
    }));

    return {
      profile: profile ? {
        display_name: profile.basics?.name,
        units: profile.metrics?.unitSystem,
        goals: (profile.goals as unknown as Record<string, unknown>) ?? {},
        preferences: (profile.preferences as unknown as Record<string, unknown>) ?? {},
      } : null,
      inventory: inv,
      plannedMeals: plans,
    };
  }, [inventory, plannedMeals, profile]);

  const send = useCallback(async (userContent: string) => {
    setLoading(true);
    setError(null);

    try {
      const userMsg: AiMessage = { role: 'user', content: userContent };
      const apiMessages: ApiChatMessage[] = [...messages.filter(m => m.role !== 'system'), userMsg];
      const res = await aiChat(apiMessages, buildContext());
      const replyContent = res?.output?.summary || res?.output?.blocks?.[0]?.content || '';
      const assistantMsg: AiMessage = { role: 'assistant', content: replyContent };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      return replyContent;
    } catch (e: any) {
      console.error('AI coach error', e);
      setError(e?.message ?? 'AI request failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [messages, buildContext]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, send, reset };
}
