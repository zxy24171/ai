import type { CameraResolution } from '../types';

export interface CaptureConfig {
  resolution: CameraResolution;
  jpegQuality: number;
}

const RESOLUTION_MAP: Record<CameraResolution, { width: number; height: number }> = {
  '320x240': { width: 320, height: 240 },
  '640x480': { width: 640, height: 480 },
  '1280x720': { width: 1280, height: 720 },
  '480x360': { width: 480, height: 360 },
};

function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

export function captureFrame(video: HTMLVideoElement, config: CaptureConfig): string {
  const { width, height } = RESOLUTION_MAP[config.resolution];
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', config.jpegQuality / 100).split(',')[1]!;
}