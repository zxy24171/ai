export function textToSpeech(text: string, language = 'zh-CN', onStart?: () => void, onEnd?: () => void): void {
  if (!window.speechSynthesis) { console.warn('[TTS] Not supported'); onEnd?.(); return; }

  window.speechSynthesis.cancel();
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = language;
  u.rate = 0.95;
  u.pitch = 1.15;
  u.volume = 1.0;

  // Pick the best Chinese voice available
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['Microsoft Xiaoxiao','Microsoft Yunxi','Microsoft Yunjian','Microsoft Huihui','Microsoft Yaoyao'];
  for (const name of preferred) {
    const found = voices.find((v: SpeechSynthesisVoice) => v.name.includes(name));
    if (found) { u.voice = found; break; }
  }
  if (!u.voice) {
    const zh = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('zh'));
    if (zh) u.voice = zh;
  }

  const voiceName = u.voice ? u.voice.name : 'default';
  const isOnline = u.voice ? u.voice.name.includes('Online') : false;
  console.log('[TTS] Voice:', voiceName);
  console.log('[TTS] Speaking...');
  onStart?.();

  const timer = setTimeout(function() { console.warn('[TTS] Timeout'); window.speechSynthesis.cancel(); onEnd?.(); }, 15000);

  u.onend = function() { clearTimeout(timer); console.log('[TTS] Done'); onEnd?.(); };

  u.onerror = function(e) {
    clearTimeout(timer);
    const err = e.error || 'unknown';
    console.warn('[TTS] Error:', err, 'on', voiceName);

    // If online voice failed, retry once with a local voice
    if (isOnline && err === 'synthesis-failed') {
      console.warn('[TTS] Online voice failed, retrying with local voice...');
      const localVoice = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('zh') && !v.name.includes('Online'));
      if (localVoice && localVoice.name !== voiceName) {
        const u2 = new SpeechSynthesisUtterance(text);
        u2.lang = language; u2.rate = 0.95; u2.pitch = 1.15; u2.volume = 1.0;
        u2.voice = localVoice;
        console.log('[TTS] Retry with:', localVoice.name);
        u2.onend = function() { console.log('[TTS] Done (retry)'); onEnd?.(); };
        u2.onerror = function() { console.warn('[TTS] Retry also failed'); onEnd?.(); };
        setTimeout(function() { window.speechSynthesis.speak(u2); }, 50);
        return;
      }
    }
    onEnd?.();
  };

  setTimeout(function() { window.speechSynthesis.speak(u); }, 100);
}

export function cancelTTS(): void {
  if (window.speechSynthesis) { window.speechSynthesis.cancel(); window.speechSynthesis.cancel(); }
}

export function preloadTTSSupport(): void {
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
}