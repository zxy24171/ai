import { cancelTTS } from './ttsService';
let onInterrupt: (() => void) | null = null;
export function setInterruptHandler(handler: () => void): void { onInterrupt = handler; }
export function interruptSpeech(): void {
  cancelTTS();
  onInterrupt?.();
}
export function clearInterruptHandler(): void { onInterrupt = null; }