import React from 'react';
import type { CostMode, CostMetrics } from '../types';

interface Props {
  cameraEnabled: boolean; micEnabled: boolean; isRecording: boolean; isSpeaking: boolean; isProcessing: boolean;
  costMetrics: CostMetrics;
  onToggleCamera: () => void; onToggleMic: () => void; onToggleSettings: () => void; onToggleCostMode: () => void;
}

const modeLabels: Record<CostMode, string> = { off: 'Off', balanced: 'Balanced', aggressive: 'Eco' };

export const StatusBar: React.FC<Props> = ({ cameraEnabled, micEnabled, isRecording, isSpeaking, isProcessing, costMetrics, onToggleCamera, onToggleMic, onToggleSettings, onToggleCostMode }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-t border-gray-800">
      <div className="flex items-center gap-3">
        <button onClick={onToggleCamera} className={'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ' + (cameraEnabled ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500')}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          {cameraEnabled ? 'Cam On' : 'Cam Off'}
        </button>
        <button onClick={onToggleMic} className={'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ' + (micEnabled ? (isRecording ? 'bg-red-900/40 text-red-400 animate-pulse' : 'bg-green-900/40 text-green-400') : 'bg-gray-800 text-gray-500')}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          {isRecording ? 'Listening' : micEnabled ? 'Mic On' : 'Mic Off'}
        </button>
        {isSpeaking && <span className="flex items-center gap-1 text-xs text-blue-400"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />AI speaking</span>}
        {isProcessing && <span className="text-xs text-yellow-400">Thinking...</span>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggleCostMode} className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700">{modeLabels[costMetrics.currentMode]}</button>
        <div className="text-xs text-gray-500">~</div>
        <button onClick={onToggleSettings} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>
      </div>
    </div>
  );
};