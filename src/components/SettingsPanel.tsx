import React from 'react';
import type { CameraResolution, Language, CostMode, SessionSettings } from '../types';
interface Props { settings: SessionSettings; visible: boolean; onClose: () => void; onUpdate: (updates: Partial<SessionSettings>) => void; }
const RESOLUTIONS: CameraResolution[] = ['320x240','640x480','1280x720'];
const LANGUAGES: { value: Language; label: string }[] = [{ value: 'zh', label: '中文' }, { value: 'en', label: '英文' }, { value: 'auto', label: '自动' }];
const COST_MODES: { value: CostMode; label: string; desc: string }[] = [
  { value: 'off', label: 'Off', desc: '最高质量，费用最高' },
  { value: 'balanced', label: '均衡', desc: '推荐' },
  { value: 'aggressive', label: '省电', desc: '最低费用' },
];
export const SettingsPanel: React.FC<Props> = ({ settings, visible, onClose, onUpdate }) => {
  if (!visible) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm mx-4 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">设置</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-5 space-y-5">
        <div><label className="block text-sm font-medium text-gray-300 mb-2">摄像头分辨率</label>
          <div className="grid grid-cols-3 gap-2">{RESOLUTIONS.map((res) => (
            <button key={res} onClick={() => onUpdate({ cameraResolution: res })}
              className={'px-3 py-2 rounded-lg text-xs font-medium transition-colors '+(settings.cameraResolution===res?'bg-blue-600 text-white':'bg-gray-800 text-gray-400')}>{res}</button>
          ))}</div>
        </div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2">帧间隔: {settings.frameInterval}ms</label>
          <input type="range" min="200" max="2000" step="100" value={settings.frameInterval} onChange={(e)=>onUpdate({frameInterval:parseInt(e.target.value)})} className="w-full accent-blue-500" />
        </div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2">语言</label>
          <div className="grid grid-cols-3 gap-2">{LANGUAGES.map((l) => (
            <button key={l.value} onClick={()=>onUpdate({language:l.value})}
              className={'px-3 py-2 rounded-lg text-xs font-medium transition-colors '+(settings.language===l.value?'bg-blue-600 text-white':'bg-gray-800 text-gray-400')}>{l.label}</button>
          ))}</div>
        </div>
        <div><label className="block text-sm font-medium text-gray-300 mb-2">成本模式</label>
          <div className="space-y-1.5">{COST_MODES.map((mode)=>(
            <button key={mode.value} onClick={()=>onUpdate({costSaveMode:mode.value})}
              className={'w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors '+(settings.costSaveMode===mode.value?'bg-blue-600/20 border border-blue-500 text-blue-300':'bg-gray-800 text-gray-400')}>
              <span className="font-medium">{mode.label}</span><span className="ml-2 text-gray-500">{mode.desc}</span>
            </button>
          ))}</div>
        </div>
      </div>
    </div>
  </div>);
};