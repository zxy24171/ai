import { useCallback, useEffect, useRef, useState } from 'react';

export function useMicrophone() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const startMicrophone = useCallback(async () => {
    try {
      stopMicrophone();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      activeStreamRef.current = mediaStream;
      setStream(mediaStream);
      setEnabled(true);
      setError(null);
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' ? 'Mic permission denied' : 'Mic error: ' + err.message;
      setError(msg);
      setEnabled(false);
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (activeStreamRef.current) { activeStreamRef.current.getTracks().forEach((t) => t.stop()); activeStreamRef.current = null; }
    setStream(null);
    setEnabled(false);
  }, []);

  useEffect(() => { return () => { stopMicrophone(); }; }, [stopMicrophone]);

  return { stream, error, enabled, startMicrophone, stopMicrophone, setError };
}