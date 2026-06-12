import { useCallback, useState } from 'react';
import type { Message, Session, SessionSettings, CostMetrics } from '../types';

const DEFAULT_SETTINGS: SessionSettings = {
  cameraResolution: '640x480', frameInterval: 500, voiceSpeed: 1.0, voiceModel: 'tts-1', language: 'zh', costSaveMode: 'balanced',
};

function createSession(): Session {
  return { id: crypto.randomUUID(), messages: [], createdAt: Date.now(), settings: { ...DEFAULT_SETTINGS }, tokenUsage: { total: 0, estimatedCost: 0, requestCount: 0 } };
}

export function useSession() {
  const [session, setSession] = useState<Session>(createSession);
  const [costMetrics, setCostMetrics] = useState<CostMetrics>({ totalTokens: 0, estimatedCost: 0, requestCount: 0, currentMode: 'balanced' });

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const message: Message = { ...msg, id: crypto.randomUUID(), timestamp: Date.now() } as Message;
    setSession((prev) => ({ ...prev, messages: [...prev.messages, message] }));
    return message;
  }, []);

  const updateLastMessage = useCallback((updates: Partial<Message>) => {
    setSession((prev) => {
      const msgs = [...prev.messages];
      const last = msgs[msgs.length - 1];
      if (last) msgs[msgs.length - 1] = { ...last, ...updates };
      return { ...prev, messages: msgs };
    });
  }, []);

  const updateTokenUsage = useCallback((tokens: number, cost: number) => {
    setSession((prev) => ({
      ...prev,
      tokenUsage: { total: prev.tokenUsage.total + tokens, estimatedCost: prev.tokenUsage.estimatedCost + cost, requestCount: prev.tokenUsage.requestCount + 1 },
    }));
  }, []);

  const updateSettings = useCallback((updates: Partial<SessionSettings>) => {
    setSession((prev) => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  }, []);

  const clearSession = useCallback(() => { setSession(createSession()); }, []);

  const updateCostMetrics = useCallback((updates: Partial<CostMetrics>) => {
    setCostMetrics((prev) => ({ ...prev, ...updates }));
  }, []);

  const getMessagesForAPI = useCallback((systemPrompt: string): Message[] => {
    const systemMsg: Message = { id: 'system', role: 'system', content: systemPrompt, timestamp: 0 };
    return [systemMsg, ...session.messages];
  }, [session.messages]);

  return { session, costMetrics, addMessage, updateLastMessage, updateTokenUsage, updateSettings, updateCostMetrics, clearSession, getMessagesForAPI };
}