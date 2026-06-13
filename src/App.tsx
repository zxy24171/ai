import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionGate } from './components/PermissionGate';
import { CameraPreview } from './components/CameraPreview';
import { ChatMessageList } from './components/ChatMessageList';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { OfflineNotice } from './components/OfflineNotice';
import { useCamera } from './hooks/useCamera';
import { useMicrophone } from './hooks/useMicrophone';
import { useMultimodalChat } from './hooks/useMultimodalChat';
import { getCostProfile } from './lib/costConfig';
import { textToSpeech, cancelTTS, preloadTTSSupport } from './lib/ttsService';
import { startSTT, stopSTT } from './lib/sttService';
import { setInterruptHandler, clearInterruptHandler } from './lib/speechInterrupt';
import { setIdleConfig, clearIdleTimer } from './lib/autoSleep';
import { getNetworkState, onNetworkChange } from './lib/networkDetect';
import type { NetworkQuality } from './lib/networkDetect';
import type { CostMode } from './types';

const App: React.FC = () => {
  const [phase, setPhase] = useState<'permission' | 'chat'>('permission');
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('good');
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camera = useCamera();
  const mic = useMicrophone();
  const chat = useMultimodalChat();
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const latestFrameRef = useRef<string | null>(null);

  useEffect(() => { preloadTTSSupport(); }, []);

  const handleGrant = useCallback(async () => {
    await Promise.all([camera.startCamera(), mic.startMicrophone()]);
    setPhase('chat');
  }, [camera, mic]);

  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    const profile = getCostProfile(chat.session.settings.costSaveMode);
    frameIntervalRef.current = setInterval(() => {
      if (!camera.enabled || !camera.videoRef.current) return;
      const motion = camera.checkMotion(profile.motionThreshold);
      if (profile.enableMotionDetect && !motion.hasMotion) return;
      latestFrameRef.current = camera.grabFrame(profile.jpegQuality);
    }, profile.frameIntervalMs);
  }, [camera, chat.session.settings.costSaveMode]);

  const doSendAndSpeak = useCallback(async (text: string) => {
    setError(null);
    try {
      const profile = getCostProfile(chat.session.settings.costSaveMode);
      const frame = latestFrameRef.current ?? camera.grabFrame(profile.jpegQuality);
      latestFrameRef.current = null;
      const aiText = await chat.sendMessage(text, frame ? [frame] : undefined, undefined, chat.session.settings.costSaveMode);
      if (aiText) {
        setIsSpeaking(true);
        const lang = chat.session.settings.language === 'en' ? 'en-US' : 'zh-CN';
        await textToSpeech(aiText, lang, undefined, () => setIsSpeaking(false));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send message. Check API key and console.');
    }
  }, [chat, camera, chat.session.settings.costSaveMode]);

  const handleSendText = useCallback(async () => {
    if (chat.isProcessing) return;
    const content = textInput.trim();
    if (!content) return;
    setTextInput('');
    await doSendAndSpeak(content);
  }, [chat.isProcessing, textInput, doSendAndSpeak]);

  const handleVoiceStart = useCallback(() => {
    if (isRecording) return;
    cancelTTS();
    setIsRecording(true);
    isRecordingRef.current = true;
  }, [isRecording]);

  const handleVoiceEnd = useCallback(async () => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const lang = chat.session.settings.language === 'en' ? 'en-US' : 'zh-CN';
    startSTT(lang)
      .then(async (text) => {
        if (text.trim()) {
          await doSendAndSpeak(text.trim());
        }
      })
      .catch((err) => {
        console.error('STT error:', err);
        setError('Speech recognition: ' + err.message);
      });
    return () => { stopSTT(); };
  }, [isRecording, doSendAndSpeak, chat.session.settings.language]);

  const handleToggleCamera = useCallback(() => { camera.enabled ? camera.stopCamera() : camera.startCamera(); }, [camera]);
  const handleToggleMic = useCallback(() => { mic.enabled ? mic.stopMicrophone() : mic.startMicrophone(); }, [mic]);

  const handleToggleCostMode = useCallback(() => {
    const modes: CostMode[] = ['off', 'balanced', 'aggressive'];
    const idx = modes.indexOf(chat.session.settings.costSaveMode);
    const next = modes[(idx + 1) % modes.length]!;
    chat.updateSettings({ costSaveMode: next });
  }, [chat.session.settings.costSaveMode, chat]);

  const handleSleep = useCallback(() => { camera.stopCamera(); mic.stopMicrophone(); setPhase('permission'); }, [camera, mic]);

  useEffect(() => {
    const cleanup = onNetworkChange((s) => setNetworkQuality(s.quality));
    setNetworkQuality(getNetworkState().quality);
    return cleanup;
  }, []);

  useEffect(() => {
    if (phase === 'chat' && camera.enabled) startFrameCapture();
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current); };
  }, [phase, camera.enabled, chat.session.settings.costSaveMode, startFrameCapture]);

  useEffect(() => {
    if (phase === 'chat') {
      const profile = getCostProfile(chat.session.settings.costSaveMode);
      if (profile.enableAutoSleep) setIdleConfig(profile.autoSleepMinutes, handleSleep);
    }
    return () => clearIdleTimer();
  }, [phase, chat.session.settings.costSaveMode, handleSleep]);

  useEffect(() => { setInterruptHandler(() => setIsSpeaking(false)); return () => clearInterruptHandler(); }, []);

  if (phase === 'permission') {
    return <PermissionGate onGrant={handleGrant} cameraError={camera.error} micError={mic.error} />;
  }

  const profile = getCostProfile(chat.session.settings.costSaveMode);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {networkQuality === 'offline' && <OfflineNotice />}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 p-4 pb-2 md:pb-4 flex flex-col">
          <CameraPreview stream={camera.stream} videoRef={camera.videoRef} enabled={camera.enabled} resolution={camera.resolution} />
          <div className="mt-3 flex justify-center">
            <button
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceEnd}
              onMouseLeave={() => { if (isRecordingRef.current) handleVoiceEnd(); }}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceEnd}
              className={
                'w-16 h-16 rounded-full flex items-center justify-center transition-all ' +
                (isRecording ? 'bg-red-600 scale-110 shadow-lg shadow-red-600/30' : 'bg-gray-800 hover:bg-gray-700 hover:scale-105')
              }
              disabled={!mic.enabled}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            {!mic.enabled ? 'Mic off' : isRecording ? 'Release to send' : 'Hold to speak'}
          </p>
          <div className="mt-3 flex gap-2">
            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
              placeholder="Type a message..." disabled={chat.isProcessing}
              className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 placeholder-gray-500" />
            <button onClick={handleSendText} disabled={chat.isProcessing || !textInput.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-900/40 border border-red-700 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col min-h-0 border-l border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={'w-2 h-2 rounded-full ' + (networkQuality === 'good' ? 'bg-green-500' : networkQuality === 'moderate' ? 'bg-yellow-500' : 'bg-red-500')} />
              <span className="text-sm text-gray-300">Chat</span>
              <span className="text-xs text-gray-600">{profile.label} | Doubao</span>
            </div>
            <button onClick={chat.clearSession} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800">Clear</button>
          </div>
          <ChatMessageList messages={chat.messages} streamingText={chat.streamingText} isProcessing={chat.isProcessing} />
        </div>
      </div>
      <StatusBar
        cameraEnabled={camera.enabled} micEnabled={mic.enabled} isRecording={isRecording}
        isSpeaking={isSpeaking} isProcessing={chat.isProcessing} costMetrics={chat.costMetrics}
        onToggleCamera={handleToggleCamera} onToggleMic={handleToggleMic}
        onToggleSettings={() => setShowSettings(true)} onToggleCostMode={handleToggleCostMode} />
      <SettingsPanel settings={chat.session.settings} visible={showSettings}
        onClose={() => setShowSettings(false)}
        onUpdate={(updates) => {
          chat.updateSettings(updates);
          if (updates.cameraResolution && updates.cameraResolution !== camera.resolution) {
            camera.switchResolution(updates.cameraResolution);
          }
        }} />
    </div>
  );
};

export default App;
