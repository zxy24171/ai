export function textToSpeech(text: string, language: string = 'zh-CN', onStart?: () => void, onEnd?: () => void): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      onEnd?.();
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((v) => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => { onEnd?.(); resolve(); };
    utterance.onerror = () => { onEnd?.(); resolve(); };

    onStart?.();
    window.speechSynthesis.speak(utterance);
  });
}

export function cancelTTS(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function preloadTTSSupport(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}