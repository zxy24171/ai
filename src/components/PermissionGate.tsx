import React from 'react';

interface Props { onGrant: () => void; cameraError?: string | null; micError?: string | null; }

export const PermissionGate: React.FC<Props> = ({ onGrant, cameraError, micError }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-12 h-12 text-white">
            <circle cx="50" cy="40" r="18" fill="none" stroke="currentColor" strokeWidth="5" />
            <path d="M20 85 Q50 55 80 85" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">AI Vision Chat</h1>
        <p className="text-gray-400 text-lg">Open camera and mic to start a face-to-face AI conversation</p>
        <button onClick={onGrant} className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-lg transition-colors">
          Open Camera && Mic
        </button>
        {(cameraError || micError) && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-left">
            <p className="text-red-300 text-sm font-medium mb-1">Permission Error</p>
            {cameraError && <p className="text-red-200 text-sm">{cameraError}</p>}
            {micError && <p className="text-red-200 text-sm">{micError}</p>}
          </div>
        )}
      </div>
    </div>
  );
};