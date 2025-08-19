import { useRef, useState } from 'react';
import { createChatCompletion, type ChatMessage } from '@/utils/aiClient';
import { buildStructuredSystemPrompt, tryExtractJSON, type StructuredResponse } from '@/utils/aiFormat';

export type ChefChatMessage = {
  id: string;
  role: 'user' | 'coach';
  text?: string;
  source?: 'ai' | 'builtin';
  structuredData?: StructuredResponse;
};

export function useChefChat(userContext?: string) {
  const [messages, setMessages] = useState<ChefChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const idSeq = useRef(0);
  const newId = () => `${Date.now()}-${idSeq.current++}`;

  function pushCoach(msg: Omit<ChefChatMessage, 'id' | 'role'>) {
    setMessages(prev => [...prev, { id: newId(), role: 'coach', source: msg.source || 'ai', ...msg }]);
  }
  function pushUser(text: string) {
    setMessages(prev => [...prev, { id: newId(), role: 'user', text }]);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushUser(trimmed);

    const system: ChatMessage = { role: 'system', content: buildStructuredSystemPrompt(userContext || '') };
    const user: ChatMessage = { role: 'user', content: trimmed };

    try {
      setIsTyping(true);
      const placeholderId = newId();
      setMessages(prev => [...prev, { id: placeholderId, role: 'coach', text: '…', source: 'ai' }]);

      const full = await createChatCompletion([system, user]);
      const parsed = tryExtractJSON(full);
      if (parsed) {
        setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, text: undefined, structuredData: parsed } : m)));
      } else {
        setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, text: full.trim() } : m)));
      }
      setIsTyping(false);
    } catch (err) {
      console.warn('Chef AI error', err);
      pushCoach({ text: 'Try asking for a 20-minute dinner using what you have on hand.', source: 'builtin' });
      setIsTyping(false);
    }
  }

  function performInlineAction() {
    // Reserved for future actions (e.g., add to plan)
  }

  const quickChips = [
    'Dinner tonight in 20–30 min',
    'High-protein lunch',
    'Vegetarian dinner for 2',
    'Low-carb snacks',
    'Budget-friendly meal',
  ];

  return { messages, isTyping, sendMessage, performInlineAction, quickChips };
}
