let prevImageData: ImageData | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function getCanvas(w: number, h: number) {
  if (!canvas || canvas.width !== w || canvas.height !== h) {
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    ctx = canvas.getContext('2d')!;
  }
  return { canvas, ctx };
}

export function detectMotion(video: HTMLVideoElement, width: number = 160, height: number = 120, threshold: number = 0.05): { score: number; hasMotion: boolean } {
  const { ctx: c } = getCanvas(width, height);
  c!.drawImage(video, 0, 0, width, height);
  const current = c!.getImageData(0, 0, width, height);

  if (!prevImageData) {
    prevImageData = current;
    return { score: 0, hasMotion: true };
  }

  let diff = 0;
  const d = current.data;
  const p = prevImageData.data;
  const len = Math.min(d.length, p.length);
  for (let i = 0; i < len; i += 4) {
    diff += Math.abs(d[i]! - p[i]!);
    diff += Math.abs(d[i+1]! - p[i+1]!);
    diff += Math.abs(d[i+2]! - p[i+2]!);
  }
  const maxDiff = len * 3 * 255;
  const score = Math.min(diff / maxDiff, 1);
  prevImageData = current;
  return { score, hasMotion: score > threshold };
}

export function resetMotionDetection() { prevImageData = null; }
