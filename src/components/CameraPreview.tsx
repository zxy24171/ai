import React, { useEffect } from 'react';
import type { CameraResolution } from '../types';

interface Props { stream: MediaStream | null; videoRef: React.RefObject<HTMLVideoElement | null>; enabled: boolean; resolution: CameraResolution; }

export const CameraPreview: React.FC<Props> = ({ stream, videoRef, enabled, resolution }) => {
  useEffect(() => { if (videoRef.current && stream) (videoRef as any).current.srcObject = stream; }, [stream, videoRef]);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[4/3]">
      {enabled && stream ? (
        <>
          <video ref={videoRef as any} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 bg-black/60 text-gray-300 text-xs px-2 py-0.5 rounded">{resolution}</div>
          <div className="absolute bottom-2 right-2 text-gray-500 text-xs">AI Vision Chat</div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center space-y-2">
            <svg className="w-12 h-12 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <p className="text-sm">Camera off</p>
          </div>
        </div>
      )}
    </div>
  );
};
