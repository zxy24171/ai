import { useCallback, useState } from 'react';
import { streamChat, estimateCost, getAPIConfig, supportsVision, isVisionConfigured, describeImagesWithVision } from '../lib/apiProxy';
import { buildSystemPrompt } from '../lib/promptTemplates';
import { interruptSpeech } from '../lib/speechInterrupt';
import { onUserActivity } from '../lib/autoSleep';
import { isDuplicateFrame } from '../lib/frameDedup';
import { getCostProfile } from '../lib/costConfig';
import type { CostMode, Message } from '../types';
import { useSession } from './useSession';

export function useMultimodalChat() {
  const { session, costMetrics, addMessage, updateLastMessage, updateTokenUsage, updateSettings, updateCostMetrics, clearSession } = useSession();
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
      let resultUsage: { prompt: number; completion: number } | null = null;

      // Always send images to the vision model
      const gen = streamChat(chatMessages, { images: modelCanSee ? filteredImages : undefined, costMode });
      for await (const delta of gen) { fullText += delta; setStreamingText(fullText); }
      const finalResult = await gen.return(undefined as any);
      const finalValue: any = finalResult.value;
      if (finalValue) { resultModel = finalValue.model; resultUsage = finalValue.usage; }

      if (fullText) {
        const tokenCost = resultUsage ? estimateCost(resultUsage.prompt, resultUsage.completion, resultModel) : 0;
        addMessage({ role: "assistant", content: fullText, tokenCost, model: resultModel || undefined });
        updateTokenUsage((resultUsage?.prompt ?? 0) + (resultUsage?.completion ?? 0), tokenCost);
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
  }, [isProcessing, session, addMessage, updateLastMessage, updateTokenUsage]);

  const abort = useCallback(() => { interruptSpeech(); setIsProcessing(false); setStreamingText(""); }, []);

  return { messages: session.messages, isProcessing, streamingText, costMetrics, session, sendMessage, abort, clearSession, updateSettings, updateCostMetrics };
}
