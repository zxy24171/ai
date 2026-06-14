export interface MotionResult { hasMotion: boolean; score: number; }

export function checkMotion(
  video: HTMLVideoElement,
  threshold: number = 0.05,
  width: number = 160,
  height: number = 120
): MotionResult {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { hasMotion: true, score: 1 };
  ctx.drawImage(video, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  if (!lastFrame) { lastFrame = new Uint8Array(data); return { hasMotion: true, score: 1 }; }
  let diff = 0; const total = data.length;
  for (let i = 0; i < total; i += 4) {
    diff += Math.abs(data[i] - lastFrame[i]) + Math.abs(data[i + 1] - lastFrame[i + 1]) + Math.abs(data[i + 2] - lastFrame[i + 2]);
  }
  lastFrame = new Uint8Array(data);
  const normalized = diff / (total * 255);
  return { hasMotion: normalized > threshold, score: normalized };
}

let lastFrame: Uint8Array | null = null;
export function resetMotionDetect(): void { lastFrame = null; }