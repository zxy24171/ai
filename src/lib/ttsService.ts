let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

const VOLC_VOICES = {
  gentle: "BV001_streaming",
  intellectual: "BV005_streaming",
  sweet: "BV004_streaming",
  emotional: "BV006_streaming",
};

let cachedVoices: SpeechSynthesisVoice[] = [];
function findBestChineseVoice(): SpeechSynthesisVoice | null {
  const names = ["Microsoft Huihui", "Microsoft Yaoyao", "Microsoft Yunxia", "Microsoft Xiaoxiao",
    "Google 普通话", "Tingting"];
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  cachedVoices = voices;
  for (const name of names) {
    const found = voices.find((v) => v.name.includes(name));
    if (found) return found;
  }
  return voices.find((v) => v.lang.startsWith("zh")) || null;
}

export async function textToSpeech(text: string, language: string = "zh-CN", onStart?: () => void, onEnd?: () => void): Promise<void> {
  const appId = (import.meta.env.VITE_TTS_APP_ID as string) || "";
  const accessToken = (import.meta.env.VITE_TTS_ACCESS_TOKEN as string) || "";

  // Try Volcengine TTS first
  if (appId && accessToken) {
    try {
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const reqId = "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const resp = await fetch("https://openspeech.bytedance.com/api/v1/tts", {
        method: "POST",
        headers: {
          "Authorization": "Bearer; " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app: { appid: appId, token: accessToken, cluster: "volc_tts_base" },
          user: { uid: "user_1" },
          audio: {
            voice_type: VOLC_VOICES.intellectual,
            encoding: "mp3",
            speed_ratio: 1.0,
            volume_ratio: 1.0,
            pitch_ratio: 1.0,
          },
          request: {
            reqid: reqId,
            text: text,
            text_type: "plain",
            operation: "query",
          },
        }),
      });

      if (resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        let audioData: ArrayBuffer | null = null;

        if (contentType.includes("json")) {
          // JSON response with base64 audio
          const json = await resp.json();
          const raw = json?.data || "";
          const b64 = typeof raw === "string" ? raw : raw?.audio || "";
          if (b64) {
            const binaryStr = atob(b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            audioData = bytes.buffer;
          }
        } else {
          // Binary audio response
          audioData = await resp.arrayBuffer();
        }

        if (audioData && audioData.byteLength > 100) {
          cancelTTS();
          const audioBuffer = await audioCtx.decodeAudioData(audioData);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          currentSource = source;
          onStart?.();
          source.start(0);
          return new Promise((resolve) => {
            source.onended = () => {
              currentSource = null;
              onEnd?.();
              resolve();
            };
          });
        }
      }
    } catch {} // Fall through to Web Speech
  }

  // Fallback: Web Speech API
  if (!window.speechSynthesis) {
    console.warn("Speech synthesis not supported");
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  const bestVoice = findBestChineseVoice();
  if (bestVoice) utterance.voice = bestVoice;

  onStart?.();
  window.speechSynthesis.speak(utterance);
  return new Promise((resolve) => {
    utterance.onend = () => { onEnd?.(); resolve(); };
    utterance.onerror = () => { onEnd?.(); resolve(); };
  });
}

export function cancelTTS(): void {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function preloadTTSSupport(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
}
