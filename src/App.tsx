import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionGate } from './components/PermissionGate';
import { CameraPreview } from './components/CameraPreview';
import { ChatMessageList } from './components/ChatMessageList';
import { StatusBar } from './components/StatusBar';
import { SettingsPanel } from './components/SettingsPanel';
import { OfflineNotice } from './components/OfflineNotice';
import { CostDashboard } from './components/CostDashboard';
import { useCamera } from './hooks/useCamera';
import { useMicrophone } from './hooks/useMicrophone';
import { useMultimodalChat } from './hooks/useMultimodalChat';
import { warmupAPI } from './lib/apiProxy';
import { getCostProfile } from './lib/costConfig';
import { textToSpeech, cancelTTS, preloadTTSSupport } from './lib/ttsService';
import { startSTT, stopSTT, preloadSTT } from './lib/sttService';
import { setInterruptHandler, clearInterruptHandler } from './lib/speechInterrupt';
import { setIdleConfig, clearIdleTimer } from './lib/autoSleep';
import { getNetworkState, onNetworkChange } from './lib/networkDetect';
import type { NetworkQuality } from './lib/networkDetect';
import type { CostMode } from './types';

const ERR_401 = 'API Key 无效或已过期，请检查 .env 配置';
const ERR_NETWORK = '网络连接失败，请检查网络后重试';
const ERR_TIMEOUT = '请求超时，请检查网络连接';
const ERR_DEFAULT = '操作失败，请重试';

function friendlyError(err: any): string {
  const msg: string = err?.message || err?.error?.message || String(err || '');
  if (!msg || msg === 'unknown' || msg === '[object Object]') return ERR_DEFAULT;
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) return ERR_NETWORK;
  if (msg.includes('401') || msg.includes('API key') || msg.includes('api key') || msg.includes('ApiKey') || msg.includes('API Key')) return ERR_401;
  if (msg.includes('402')) return 'API 余额不足，请充值';
  if (msg.includes('403')) return '权限不足，请检查 API Key';
  if (msg.includes('429')) return '请求过于频繁，请稍后重试';
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('timed out')) return ERR_TIMEOUT;
  return msg.length > 80 ? msg.slice(0, 80) + '...' : msg;
}

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
  const sttSessionRef = useRef(0);
  const sttTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { preloadTTSSupport(); preloadSTT(); }, []);

  const handleGrant = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([camera.startCamera(), mic.startMicrophone()]);
      warmupAPI(); // Pre-warm API connection
      setPhase('chat');
    } catch (err: any) { setError(friendlyError(err)); }
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
      } else {
        setError('AI 暂时无法回应，请重试');
      }
    } catch (err: any) { console.error(err); setError(friendlyError(err)); }
  }, [chat, camera, chat.session.settings.costSaveMode]);

  const handleSendText = useCallback(async () => {
    if (chat.isProcessing) return;
    const content = textInput.trim();
    if (!content) return;
    setTextInput('');
    await doSendAndSpeak(content);
  }, [chat.isProcessing, textInput, doSendAndSpeak]);

  // Voice: sync startSTT, session guard, 400ms delay, 12s timeout
  const handleVoiceStart = useCallback(() => {
    if (isRecordingRef.current) return;
    setError(null); cancelTTS();
    setIsRecording(true); isRecordingRef.current = true;
    const session = ++sttSessionRef.current;
    if (sttTimeoutRef.current) clearTimeout(sttTimeoutRef.current);
    sttTimeoutRef.current = setTimeout(() => {
      if (session === sttSessionRef.current && isRecordingRef.current) {
        setIsRecording(false); isRecordingRef.current = false; stopSTT();
        setError('听不到声音，请检查麦克风是否正常');
      }
    }, 12000);
    startSTT().then((text) => {
      if (session !== sttSessionRef.current) return;
      if (sttTimeoutRef.current) { clearTimeout(sttTimeoutRef.current); sttTimeoutRef.current = null; }
      if (text.trim()) {
        doSendAndSpeak(text.trim());
      } else {
        setError('没听到声音，请再说一遍');
      }
    }).catch((err) => {
      if (session !== sttSessionRef.current) return;
      if (sttTimeoutRef.current) { clearTimeout(sttTimeoutRef.current); sttTimeoutRef.current = null; }
      setError(friendlyError(err));
    });
  }, [doSendAndSpeak]);

  const handleVoiceEnd = useCallback(() => {
    if (!isRecordingRef.current) return;
    setIsRecording(false); isRecordingRef.current = false;
    if (sttTimeoutRef.current) { clearTimeout(sttTimeoutRef.current); sttTimeoutRef.current = null; }
    setTimeout(() => { stopSTT(); }, 800);
  }, []);

  const handleToggleCamera = useCallback(() => { camera.enabled ? camera.stopCamera() : camera.startCamera(); }, [camera]);
  const handleToggleMic = useCallback(() => { mic.enabled ? mic.stopMicrophone() : mic.startMicrophone(); }, [mic]);
  const handleToggleCostMode = useCallback(() => {
    const modes: CostMode[] = ['off', 'balanced', 'aggressive'];
    const idx = modes.indexOf(chat.session.settings.costSaveMode);
    const next = modes[(idx + 1) % modes.length]!;
    chat.updateSettings({ costSaveMode: next }); chat.updateCostMetrics({ currentMode: next });
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

  if (phase === 'permission') return <PermissionGate onGrant={handleGrant} cameraError={camera.error} micError={mic.error} />;

  const profile = getCostProfile(chat.session.settings.costSaveMode);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {networkQuality === 'offline' && <OfflineNotice />}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 p-4 pb-2 md:pb-4 flex flex-col">
          <CameraPreview stream={camera.stream} videoRef={camera.videoRef} enabled={camera.enabled} resolution={camera.resolution} />
          <div className="mt-3 flex justify-center">
            <button onMouseDown={handleVoiceStart} onMouseUp={handleVoiceEnd}
              onMouseLeave={() => { if (isRecordingRef.current) handleVoiceEnd(); }}
              onTouchStart={handleVoiceStart} onTouchEnd={handleVoiceEnd}
              className={'w-16 h-16 rounded-full flex items-center justify-center transition-all ' + (isRecording ? 'bg-red-600 scale-110 shadow-lg shadow-red-600/30' : 'bg-gray-800 hover:bg-gray-700 hover:scale-105')}
              disabled={!mic.enabled}>
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            {!mic.enabled ? '麦克风已关闭' : isRecording ? '松开发送' : '按住说话'}
          </p>
          <div className="mt-3 flex gap-2">
            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendText(); }}
              placeholder="输入消息..." disabled={chat.isProcessing}
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
              <span className="font-medium mr-1">错误:</span>{error}
            </div>
          )}
          <div className="mt-2">
            <CostDashboard costMetrics={chat.costMetrics} />
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 border-l border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={'w-2 h-2 rounded-full ' + (networkQuality === 'good' ? 'bg-green-500' : networkQuality === 'moderate' ? 'bg-yellow-500' : 'bg-red-500')} />
              <span className="text-sm text-gray-300">聊天</span>
              <span className="text-xs text-gray-600">{profile.label} | 豆包</span>
            </div>
            <button onClick={chat.clearSession} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800">清空</button>
          </div>
          <ChatMessageList messages={chat.messages} streamingText={chat.streamingText} isProcessing={chat.isProcessing} />
        </div>
      </div>
      <StatusBar cameraEnabled={camera.enabled} micEnabled={mic.enabled} isRecording={isRecording} isSpeaking={isSpeaking}
        isProcessing={chat.isProcessing} costMetrics={chat.costMetrics}
        onToggleCamera={handleToggleCamera} onToggleMic={handleToggleMic}
        onToggleSettings={() => setShowSettings(true)} onToggleCostMode={handleToggleCostMode} />
      <SettingsPanel settings={chat.session.settings} visible={showSettings} onClose={() => setShowSettings(false)}
        onUpdate={(updates) => { chat.updateSettings(updates); if (updates.cameraResolution && updates.cameraResolution !== camera.resolution) camera.switchResolution(updates.cameraResolution); }} />
    </div>
  );
};

export default App;