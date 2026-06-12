export type CameraResolution = "320x240" | "480x360" | "640x480" | "1280x720";
export type Language = "zh" | "en" | "auto";
export type CostMode = "off" | "balanced" | "aggressive";
export interface SessionSettings {
  cameraResolution: CameraResolution;
  frameInterval: number;
  voiceSpeed: number;
  voiceModel: "tts-1" | "tts-1-hd";
  language: Language;
  costSaveMode: CostMode;
}
export type MessageRole = "user" | "assistant" | "system";
export interface Message {
  id: string; role: MessageRole; content: string; timestamp: number;
  images?: string[]; audioUrl?: string; tokenCost?: number; model?: string;
}
export interface Session {
  id: string; messages: Message[]; createdAt: number;
  settings: SessionSettings; tokenUsage: { total: number; estimatedCost: number; requestCount: number };
}
export interface CostMetrics {
  totalTokens: number; estimatedCost: number; requestCount: number; currentMode: CostMode;
}
export interface ChatRequestOptions { images?: string[]; audioBlob?: Blob; text?: string; model?: string; }
export interface APIConfig { apiKey: string; baseURL?: string; model: string; }
