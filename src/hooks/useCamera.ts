import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraResolution } from '../types';
import { captureFrame } from '../lib/frameCapture';
import { detectMotion, resetMotionDetection } from '../lib/motionDetect';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [resolution, setResolution] = useState<CameraResolution>('640x480');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (res?: CameraResolution) => {
    const targetRes = res ?? resolution;
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: { width: { ideal: parseInt(targetRes.split('x')[0]!) }, height: { ideal: parseInt(targetRes.split('x')[1]!) }, frameRate: { ideal: 30 }, facingMode: 'user' },
        audio: false,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreamRef.current = mediaStream;
      setStream(mediaStream);
      setEnabled(true);
      setError(null);
      setResolution(targetRes);
      resetMotionDetection();
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' ? 'Camera permission denied' : err.name === 'NotFoundError' ? 'No camera found' : 'Camera error: ' + err.message;
      setError(msg);
      setEnabled(false);
    }
  }, [resolution]);

  const stopCamera = useCallback(() => {
    if (activeStreamRef.current) { activeStreamRef.current.getTracks().forEach((t) => t.stop()); activeStreamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStream(null);
    setEnabled(false);
  }, []);

  const switchResolution = useCallback(async (newRes: CameraResolution) => {
    if (enabled) await startCamera(newRes); else setResolution(newRes);
  }, [enabled, startCamera]);

  const grabFrame = useCallback((jpegQuality?: number): string | null => {
    if (!videoRef.current || !stream) return null;
    return captureFrame(videoRef.current, { resolution, jpegQuality: jpegQuality ?? 60 });
  }, [resolution, stream]);

  const checkMotion = useCallback((threshold?: number): { score: number; hasMotion: boolean } => {
    if (!videoRef.current) return { score: 0, hasMotion: false };
    return detectMotion(videoRef.current, 160, 120, threshold ?? 0.05);
  }, []);

  useEffect(() => { return () => { stopCamera(); }; }, [stopCamera]);

  return { stream, error, enabled, resolution, videoRef, startCamera, stopCamera, switchResolution, grabFrame, checkMotion, setError };
}
