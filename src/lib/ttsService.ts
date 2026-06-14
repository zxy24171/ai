let currentSource: AudioBufferSourceNode | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (voicesLoaded && cachedVoices.length > 0) { resolve(); return; }
    const cb = () => { cachedVoices = window.speechSynthesis.getVoices(); if (cachedVoices.length > 0) { voicesLoaded = true; window.speechSynthesis.removeEventListener("voiceschanged", cb); resolve(); } };
    cachedVoices = window.speechSynthesis.getVoices(); if (cachedVoices.length > 0) { voicesLoaded = true; resolve(); return; }
    window.speechSynthesis.addEventListener("voiceschanged", cb);
  });
}
function findBestChineseVoice(): SpeechSynthesisVoice | null {
  const names = ["Microsoft Xiaoxiao","Microsoft Yunxi","Microsoft Yunjian","Microsoft Huihui","Microsoft Yaoyao","Google 普通话","Tingting"];
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices(); cachedVoices = voices;
  for (const name of names) { const found = voices.find((v) => v.name.includes(name)); if (found) return found; }
  return voices.find((v) => v.lang.startsWith("zh")) || null;
}
export async function textToSpeech(text: string, language = "zh-CN", onStart?: () => void, onEnd?: () => void): Promise<void> {
  if (!window.speechSynthesis) { console.warn("[TTS] Speech synthesis not supported"); onEnd?.(); return; }
  await ensureVoicesLoaded(); window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = language; u.rate = 0.95; u.pitch = 1.15; u.volume = 1.0;
  const v = findBestChineseVoice(); if (v) { u.voice = v; console.log("[TTS] Using voice:", v.name); }
  onStart?.(); window.speechSynthesis.speak(u);
  return new Promise((resolve) => { u.onend = () => { onEnd?.(); resolve(); }; u.onerror = () => { onEnd?.(); resolve(); }; });
}
export function cancelTTS(): void {
  if (currentSource) { try { currentSource.stop(); } catch {} currentSource = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
export function preloadTTSSupport(): void { if (window.speechSynthesis) window.speechSynthesis.getVoices(); }