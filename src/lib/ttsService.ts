let voicesLoaded = false;

function ensureVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) voicesLoaded = true;
  return voices;
}

function pickChineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = ensureVoices();
  const preferred = ['Microsoft Xiaoxiao','Microsoft Yunxi','Microsoft Yunjian','Microsoft Huihui','Microsoft Yaoyao',
    'Microsoft Kangkang','Microsoft Zhuoxi','Google 汉语'];
  for (const name of preferred) {
    const found = voices.find((v: SpeechSynthesisVoice) => v.name.includes(name));
    if (found) return found;
  }
  // Fallback: any Chinese voice
  const zh = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('zh'));
  if (zh) return zh;
  // Last resort: any voice at all
  return voices[0];
}

export function textToSpeech(text: string, language = 'zh-CN', onStart?: () => void, onEnd?: () => void): void {
  if (!window.speechSynthesis) { console.warn('[TTS] Not supported'); onEnd?.(); return; }

  // Cancel any ongoing speech (double-cancel is a Chromium workaround)
  window.speechSynthesis.cancel();
  window.speechSynthesis.cancel();

  // If voices haven't loaded yet, listen for the event and retry
  if (!voicesLoaded) {
    window.speechSynthesis.onvoiceschanged = function() {
      voicesLoaded = true;
      window.speechSynthesis.onvoiceschanged = null;
    };
    // Also trigger loading
    window.speechSynthesis.getVoices();
  }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = language;
  u.rate = 0.95;
  u.pitch = 1.15;
  u.volume = 1.0;

  const voice = pickChineseVoice();
  if (voice) {
    u.voice = voice;
    console.log('[TTS] Voice:', voice.name);
  } else {
    console.warn('[TTS] No voice found, using default');
  }

  console.log('[TTS] Speaking:', text.slice(0, 50));
  onStart?.();

  const timer = setTimeout(function() {
    console.warn('[TTS] Timeout after 15s');
    window.speechSynthesis.cancel();
    onEnd?.();
  }, 15000);

  u.onend = function() {
    clearTimeout(timer);
    console.log('[TTS] Done');
    onEnd?.();
  };

  u.onerror = function(e) {
    clearTimeout(timer);
    const err = e.error || 'unknown';
    console.warn('[TTS] Error:', err);

    // Chrome/Edge sometimes fails on first utterance — retry once with delay
    if (err === 'synthesis-failed' || err === 'canceled') {
      console.warn('[TTS] Retrying once...');
      const u2 = new SpeechSynthesisUtterance(text);
      u2.lang = language; u2.rate = 0.95; u2.pitch = 1.15; u2.volume = 1.0;
      if (voice) u2.voice = voice;
      u2.onend = function() { console.log('[TTS] Done (retry)'); onEnd?.(); };
      u2.onerror = function() { console.warn('[TTS] Retry failed'); onEnd?.(); };
      setTimeout(function() { window.speechSynthesis.speak(u2); }, 200);
      return;
    }
    onEnd?.();
  };

  // Small delay to ensure cancel() completes (Chromium workaround)
  setTimeout(function() { window.speechSynthesis.speak(u); }, 150);
}

export function cancelTTS(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.cancel();
  }
}

export function preloadTTSSupport(): void {
  if (!window.speechSynthesis) return;
  // Trigger voice loading
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
  }
  window.speechSynthesis.onvoiceschanged = function() {
    voicesLoaded = true;
    window.speechSynthesis.onvoiceschanged = null;
  };
  // Warm-up: speak and immediately cancel to allocate audio resources
  try {
    const warmup = new SpeechSynthesisUtterance(' ');
    warmup.volume = 0;
    warmup.onend = function() { /* warmup done */ };
    window.speechSynthesis.speak(warmup);
    setTimeout(function() { window.speechSynthesis.cancel(); }, 50);
  } catch {}
}
