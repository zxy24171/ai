let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let isSpeaking = false;
let silenceStart: number | null = null;
let speechStart: number | null = null;

export interface VADConfig {
  threshold: number;
  silenceTimeoutMs: number;
  minSpeechMs: number;
}

const DEFAULT_CONFIG: VADConfig = { threshold: -35, silenceTimeoutMs: 800, minSpeechMs: 300 };

export interface VADState {
  isSpeaking: boolean;
  energy: number;
  duration: number;
  timestamp: number;
}

export type VADCallback = (state: VADState) => void;

export function initVAD(stream: MediaStream, _config?: Partial<VADConfig>): void {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function getEnergy(): number {
  if (!analyser || !dataArray) return -100;
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i]! - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  if (rms === 0) return -100;
  return 20 * Math.log10(rms);
}

let vadInterval: ReturnType<typeof setInterval> | null = null;
let vadCallback: VADCallback | null = null;

export function startVAD(callback: VADCallback, config?: Partial<VADConfig>): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  vadCallback = callback;
  if (vadInterval) clearInterval(vadInterval);
  isSpeaking = false;
  silenceStart = null;
  speechStart = null;

  vadInterval = setInterval(() => {
    const energy = getEnergy();
    const now = Date.now();
    if (energy > cfg.threshold) {
      if (!isSpeaking) {
        if (!speechStart) speechStart = now;
        if (now - speechStart > cfg.minSpeechMs) {
          isSpeaking = true;
          silenceStart = null;
        }
      } else { silenceStart = null; }
    } else {
      if (isSpeaking) {
        if (!silenceStart) silenceStart = now;
        if (now - silenceStart > cfg.silenceTimeoutMs) {
          isSpeaking = false;
          speechStart = null;
          silenceStart = null;
        }
      } else { speechStart = null; }
    }
    vadCallback?.({ isSpeaking, energy, duration: isSpeaking ? (silenceStart ? silenceStart - (speechStart ?? now) : now - (speechStart ?? now)) : 0, timestamp: now });
  }, 100);
}

export function stopVAD(): void {
  if (vadInterval) { clearInterval(vadInterval); vadInterval = null; }
  audioContext?.close();
  audioContext = null;
  analyser = null;
  dataArray = null;
  isSpeaking = false;
  vadCallback = null;
}

export function getIsSpeaking(): boolean { return isSpeaking; }
