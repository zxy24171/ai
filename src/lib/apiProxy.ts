import type { Message, ChatRequestOptions, APIConfig, CostMode } from '../types';

export function getAPIConfig(_costMode?: CostMode): APIConfig {
  const model = (import.meta.env.VITE_MODEL as string) || 'doubao-seed-2-0-pro-260215';
  const baseURL = (import.meta.env.VITE_API_BASE_URL as string) || 'https://ark.cn-beijing.volces.com/api/v3';
  return {
    apiKey: (import.meta.env.VITE_API_KEY as string) || (import.meta.env.VITE_DEEPSEEK_API_KEY as string) || '',
    baseURL,
    model,
  };
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: string } }>;
}

export function supportsVision(model: string): boolean {
  const visionModels = ["doubao", "gpt-4o", "gpt-4-vision", "gpt-4.1", "claude-3", "gemini-1.5", "gemini-2.0"];
  return visionModels.some(function(vm) { return model.toLowerCase().includes(vm.toLowerCase()); });
}

export function isVisionConfigured(): boolean {
  const visionApiKey = import.meta.env.VITE_VISION_API_KEY as string;
  const visionBaseURL = import.meta.env.VITE_VISION_API_BASE_URL as string;
  const visionModel = import.meta.env.VITE_VISION_MODEL as string;
  return !!(visionApiKey && visionBaseURL && visionModel);
}

export async function describeImagesWithVision(images: string[], _userText?: string): Promise<string> {
  const visionApiKey = import.meta.env.VITE_VISION_API_KEY as string;
  const visionBaseURL = (import.meta.env.VITE_VISION_API_BASE_URL as string) || "https://api.openai.com/v1";
  const visionModel = (import.meta.env.VITE_VISION_MODEL as string) || "gpt-4o-mini";

  const isVolcengine = visionBaseURL.includes("volces.com");
  const contents: any[] = [];
  for (const img of images) {
    if (isVolcengine) {
      contents.push({ type: "input_image", image_url: "data:image/jpeg;base64," + img });
    } else {
      contents.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + img, detail: "low" } });
    }
  }
  const promptText = "Describe this camera frame in 1-2 sentences in Chinese. Focus on visible objects, people, actions, and scene layout.";
  if (isVolcengine) {
    contents.push({ type: "input_text", text: promptText });
  } else {
    contents.push({ type: "text", text: promptText });
  }

  const endpoint = isVolcengine ? "/responses" : "/chat/completions";
  const body: any = isVolcengine
    ? { model: visionModel, input: [{ role: "user", content: contents }] }
    : { model: visionModel, messages: [{ role: "user", content: contents }], max_tokens: 200 };

  const response = await fetch(visionBaseURL + endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + visionApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(function() { return "unknown error"; });
    console.warn("Vision API error:", response.status, errText);
    return "The user shared a camera frame image.";
  }

  const data = await response.json();
  if (isVolcengine) {
    const output = data.output;
    if (output && Array.isArray(output)) {
      for (const item of output) {
        if (item.type === "message" && item.content) {
          const texts = item.content.filter(function(c: any) { return c.type === "output_text"; }).map(function(c: any) { return c.text; });
          if (texts.length > 0) return texts.join(" ");
        }
      }
    }
    return "The user shared a camera frame image.";
  }
  const description = data.choices?.[0]?.message?.content || "";
  return description.trim() || "The user shared a camera frame image.";
}

function buildMessages(messages: Message[], latestImages?: string[], model?: string): DeepSeekMessage[] {
  const canSee = model ? supportsVision(model) : false;
  const result: DeepSeekMessage[] = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      result.push({ role: "system", content: msg.content });
    } else if (msg.role === "user") {
      const hasImages = msg.images && msg.images.length > 0;
      if (hasImages && canSee) {
        const parts: DeepSeekMessage["content"] = [];
        for (const img of msg.images!) {
          parts.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + img, detail: "low" } });
        }
        parts.push({ type: "text", text: msg.content });
        result.push({ role: "user", content: parts });
      } else {
        result.push({ role: "user", content: msg.content });
      }
    } else {
      result.push({ role: "assistant", content: msg.content });
    }
  }
  if (latestImages && latestImages.length > 0) {
    if (canSee) {
      const parts: DeepSeekMessage["content"] = [];
      for (const img of latestImages) {
        parts.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + img, detail: "low" } });
      }
      parts.push({ type: "text", text: "(current camera frame)" });
      result.push({ role: "user", content: parts });
    }
    // For non-vision models, images are handled BEFORE calling streamChat
    // via describeImagesWithVision - the description is injected as context text
  }
  return result;
}

export async function* streamChat(
  messages: Message[],
  options: ChatRequestOptions & { costMode?: CostMode }
): AsyncGenerator<string, { fullText: string; model: string; usage: { prompt: number; completion: number } | null }> {
  const apiConfig = getAPIConfig(options.costMode ?? 'balanced');
  const apiKey = apiConfig.apiKey;
  if (!apiKey) {
    throw new Error('Please set VITE_API_KEY in .env');
  }

  const chatMessages = buildMessages(messages, options.images, apiConfig.model);

  const isVolcengine = apiConfig.baseURL!.includes('volces.com');
  const endpoint = isVolcengine ? '/chat/completions' : '/v1/chat/completions';

  const response = await fetch(apiConfig.baseURL! + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: apiConfig.model,
      messages: chatMessages,
      stream: true,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown error');
    throw new Error('API error ' + response.status + ': ' + errText);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let usage: { prompt: number; completion: number } | null = null;
  let model = apiConfig.model;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        if (choice?.delta?.content) {
          fullText += choice.delta.content;
          yield choice.delta.content;
        }
        if (parsed.model) model = parsed.model;
        if (parsed.usage) {
          usage = { prompt: parsed.usage.prompt_tokens, completion: parsed.usage.completion_tokens };
        }
      } catch { /* skip parse errors */ }
    }
  }

  return { fullText, model, usage };
}

export async function transcribeAudio(_audioBlob: Blob): Promise<string> {
  // Use Browser Web Speech API for STT (free, no API key needed)
  // Fallback: return empty string, handled by sttService
  throw new Error('STT via Web Speech API - use speechToTextBrowser instead');
}

export async function synthesizeSpeech(_text: string, _costMode?: CostMode): Promise<ArrayBuffer> {
  // Use Browser Web Speech API for TTS (free, no API key needed)
  throw new Error('TTS via Web Speech API - use textToSpeechBrowser instead');
}

export function estimateCost(promptTokens: number, completionTokens: number, model: string): number {
  // DeepSeek pricing (approximate):
  // deepseek-chat: .27/M input tokens, .10/M output tokens
  const rates: Record<string, { input: number; output: number }> = {
    'doubao-seed-2-0-pro-260215': { input: 0.80 / 1_000_000, output: 2.00 / 1_000_000 },
    'deepseek-chat': { input: 0.27 / 1_000_000, output: 1.10 / 1_000_000 },
    'deepseek-reasoner': { input: 0.55 / 1_000_000, output: 2.19 / 1_000_000 },
  };
  const rate = rates[model] ?? rates['deepseek-chat']!;
  return promptTokens * rate.input + completionTokens * rate.output;
}
