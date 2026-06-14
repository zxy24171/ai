let isListening = false;
let currentRecognition: any = null;
let latestTranscript = "";

/** Pre-warm the SpeechRecognition API so first real use doesn't cold-start */
export function preloadSTT(): void {
  if (typeof window === "undefined") return;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return;
  try {
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Swallow all events, just create and cleanup to prime the API
    recognition.onerror = () => {};
    recognition.start();
    setTimeout(() => { try { recognition.stop(); } catch {} }, 100);
  } catch {}
}

export function startSTT(_micStream?: MediaStream): Promise<string> {
  if (isListening) return Promise.resolve("");

  isListening = true;
  latestTranscript = "";

  return new Promise<string>((resolve) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      isListening = false;
      resolve("");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      currentRecognition = recognition;
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            latestTranscript = transcript;
          } else {
            latestTranscript = transcript;
          }
        }
      };

      recognition.onerror = () => {
        // Ensure promise always resolves even if onend doesn't fire
        const transcript = latestTranscript;
        isListening = false;
        currentRecognition = null;
        resolve(transcript);
      };

      recognition.onend = () => {
        // Ignore if already resolved by onerror
        isListening = false;
        currentRecognition = null;
        resolve(latestTranscript);
      };

      recognition.start();
    } catch (e) {
      isListening = false;
      resolve("");
    }
  });
}

export function stopSTT(): void {
  if (currentRecognition) {
    try {
      currentRecognition.stop();
    } catch {}
    currentRecognition = null;
  }
}

export function getIsSTTListening(): boolean { return isListening; }
