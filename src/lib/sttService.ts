let recognition: any = null;
let isListening = false;
let resolveCurrent: ((text: string) => void) | null = null;
let rejectCurrent: ((err: Error) => void) | null = null;

export async function speechToText(_audioBlob: Blob): Promise<string> {
  // For push-to-talk: use browser SpeechRecognition for live transcription
  // Since we have the blob, we use the recognition API in a fresh instance
  throw new Error('Use startSTT / stopSTT for browser-based STT');
}

export function startSTT(language: string = 'zh-CN'): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      resolveCurrent?.(transcript);
    };

    recognition.onerror = (event: any) => {
      rejectCurrent?.(new Error('Speech recognition error: ' + event.error));
    };

    recognition.onend = () => {
      isListening = false;
    };

    resolveCurrent = resolve;
    rejectCurrent = reject;
    isListening = true;
    recognition.start();
  });
}

export function stopSTT(): void {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
  }
  resolveCurrent = null;
  rejectCurrent = null;
}

export function getIsSTTListening(): boolean { return isListening; }
