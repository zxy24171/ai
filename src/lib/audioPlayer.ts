import { cancelTTS } from './ttsService';
export function enqueueAudio(_url: string, _onStart?: () => void, _onEnd?: () => void): void {
  // Not used anymore - Web Speech API handles play directly
  _onEnd?.();
}
export function stopAllAudio(): void { cancelTTS(); }
export function getIsPlaying(): boolean { return false; }
