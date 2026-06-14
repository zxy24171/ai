import { useCallback, useState } from 'react';
import type { Message, Session, SessionSettings } from '../types';

const DEFAULT_SETTINGS: SessionSettings = {
  cameraResolution: '640x480', frameInterval: 500, voiceSpeed: 1.0, voiceModel: 'tts-1', language: 'zh', costSaveMode: 'balanced',
};

function createSession(): Session {
  return { id: crypto.randomUUID(), messages: [], createdAt: Date.now(), settings: { ...DEFAULT_SETTINGS } };
}

export function useSession() {
  const [session, setSession] = useState<Session>(createSession);

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

  const updateSettings = useCallback((updates: Partial<SessionSettings>) => {
    setSession((prev) => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  }, []);

  const clearSession = useCallback(() => { setSession(createSession()); }, []);

  return { session, addMessage, updateLastMessage, updateSettings, clearSession };
}
