export type NetworkQuality = 'good' | 'moderate' | 'poor' | 'offline';
export interface NetworkState { quality: NetworkQuality; downlink: number; rtt: number; isOnline: boolean; }

export function getNetworkState(): NetworkState {
  const conn = (navigator as any).connection as NetworkInformation | undefined;
  const isOnline = navigator.onLine;
  if (!isOnline) return { quality: 'offline', downlink: 0, rtt: Infinity, isOnline: false };
  if (!conn) return { quality: 'good', downlink: 10, rtt: 50, isOnline: true };
  const downlink = conn.downlink ?? 10;
  const rtt = conn.rtt ?? 50;
  let quality: NetworkQuality;
  if (downlink >= 5 && rtt < 100) quality = 'good';
  else if (downlink >= 1 && rtt < 500) quality = 'moderate';
  else quality = 'poor';
  return { quality, downlink, rtt, isOnline: true };
}

export function onNetworkChange(callback: (state: NetworkState) => void): () => void {
  const conn = (navigator as any).connection as NetworkInformation | undefined;
  const handler = () => callback(getNetworkState());
  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);
  conn?.addEventListener('change', handler);
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
    conn?.removeEventListener('change', handler);
  };
}

interface NetworkInformation {
  downlink: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}