import type { CostMode, CameraResolution } from "../types";

export interface CostProfile {
  label: string;
  frameIntervalMs: number;
  cameraResolution: CameraResolution;
  jpegQuality: number;
  motionThreshold: number;
  maxFramesPerRequest: number;
  maxHistoryRounds: number;
  maxContextTokens: number;
  useMiniModel: boolean;
  vadThreshold: number;
  enableDedup: boolean;
  enableMotionDetect: boolean;
  enableAutoSleep: boolean;
  autoSleepMinutes: number;
}

export const COST_PROFILES: Record<CostMode, CostProfile> = {
  off: {
    label: "Off",
    frameIntervalMs: 200,
    cameraResolution: "640x480",
    jpegQuality: 80,
    motionThreshold: 0.02,
    maxFramesPerRequest: 3,
    maxHistoryRounds: 20,
    maxContextTokens: 8192,
    useMiniModel: false,
    vadThreshold: -40,
    enableDedup: false,
    enableMotionDetect: false,
    enableAutoSleep: false,
    autoSleepMinutes: 60,
  },
  balanced: {
    label: "Balanced",
    frameIntervalMs: 500,
    cameraResolution: "480x360",
    jpegQuality: 60,
    motionThreshold: 0.05,
    maxFramesPerRequest: 2,
    maxHistoryRounds: 10,
    maxContextTokens: 4096,
    useMiniModel: true,
    vadThreshold: -35,
    enableDedup: true,
    enableMotionDetect: true,
    enableAutoSleep: true,
    autoSleepMinutes: 15,
  },
  aggressive: {
    label: "Eco",
    frameIntervalMs: 1000,
    cameraResolution: "320x240",
    jpegQuality: 40,
    motionThreshold: 0.10,
    maxFramesPerRequest: 1,
    maxHistoryRounds: 6,
    maxContextTokens: 2048,
    useMiniModel: true,
    vadThreshold: -30,
    enableDedup: true,
    enableMotionDetect: true,
    enableAutoSleep: true,
    autoSleepMinutes: 5,
  },
};

export function getCostProfile(mode: CostMode): CostProfile {
  return COST_PROFILES[mode] ?? COST_PROFILES.balanced;
}