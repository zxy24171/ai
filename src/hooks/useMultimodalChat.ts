import { useCallback, useState } from 'react';
import { streamChat, getAPIConfig, supportsVision, isVisionConfigured, describeImagesWithVision } from '../lib/apiProxy';
import { buildSystemPrompt } from '../lib/promptTemplates';
import { interruptSpeech } from '../lib/speechInterrupt';
import { onUserActivity } from '../lib/autoSleep';
import { isDuplicateFrame } from '../lib/frameDedup';
import { getCostProfile } from '../lib/costConfig';
import type { CostMode, Message } from '../types';
import { useSession } from './useSession';

export function useMultimodalChat() {
  const { session, addMessage, updateLastMessage, updateSettings, clearSession } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const sendMessage = useCallback(async (
    text: string, images?: string[], _audioBlob?: Blob, costMode: CostMode = "balanced",
    retryCount: number = 0
  ): Promise<string | undefined> => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStreamingText("");
    onUserActivity();

    const apiConfig = getAPIConfig(costMode);
    const modelCanSee = supportsVision(apiConfig.model);
    const visionAvailable = isVisionConfigured();

    // Non-vision model path: describe images with a separate vision API
    if (images && images.length > 0 && !modelCanSee && visionAvailable) {
      const visionDescription = await describeImagesWithVision(images, text);
      addMessage({ role: "user", content: text + "\n\n[Camera view: " + visionDescription + "]", images: undefined });
    } else {
      // Always store images in message for UI history display
      addMessage({ role: "user", content: text, images: images && images.length > 0 ? images : undefined });
    }

    const profile = getCostProfile(costMode);
    let filteredImages = images;
    if (profile.enableDedup && images && images.length > 0) {
      filteredImages = images.filter((img) => !isDuplicateFrame(img));
      if (filteredImages && filteredImages.length === 0) filteredImages = undefined;
    }

    const doAPIRequest = async (): Promise<string> => {
      const systemPrompt = buildSystemPrompt(session.settings.language);
      const systemMsg: Message = { id: "system", role: "system", content: systemPrompt, timestamp: 0 };
      const maxKeep = profile.maxHistoryRounds * 2;
      const recentMessages = maxKeep > 0 && session.messages.length > maxKeep
        ? session.messages.slice(-maxKeep)
        : session.messages;
      const chatMessages = [systemMsg, ...recentMessages];

      let fullText = "";
      let resultModel = "";
      
      // Always send images to the vision model
      const gen = streamChat(chatMessages, { images: modelCanSee ? filteredImages : undefined, costMode });
      for await (const delta of gen) { fullText += delta; setStreamingText(fullText); }
      const finalValue: any = (await gen.return(undefined as any)).value;
      if (finalValue) { resultModel = finalValue.model; }

      if (fullText) {
        addMessage({ role: "assistant", content: fullText, model: resultModel || undefined });
      }

      return fullText;
    };

    try {
      let result = await doAPIRequest();

      if (!result && retryCount < 1) {
        console.warn("[Chat] Empty response, retrying once...");
        result = await doAPIRequest();
      }

      setStreamingText("");
      setIsProcessing(false);
      return result;
    } catch (err: any) {
      console.error("Chat error:", err);
      setIsProcessing(false);
      setStreamingText("");
      throw err;
    }
  }, [isProcessing, session, addMessage, updateLastMessage]);

  const abort = useCallback(() => { interruptSpeech(); setIsProcessing(false); setStreamingText(""); }, []);

  return { messages: session.messages, isProcessing, streamingText, session, sendMessage, abort, clearSession, updateSettings };
}
