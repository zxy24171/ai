let idleTimer: ReturnType<typeof setTimeout> | null = null;
let onSleepCallback: (() => void) | null = null;
let currentTimeout = 15;

export function resetIdleTimer(): void {
  clearIdleTimer();
  if (onSleepCallback && currentTimeout > 0) {
    idleTimer = setTimeout(() => { onSleepCallback?.(); }, currentTimeout * 60 * 1000);
  }
}

export function setIdleConfig(timeoutMinutes: number, callback: () => void): void {
  currentTimeout = timeoutMinutes;
  onSleepCallback = callback;
  resetIdleTimer();
}

export function onUserActivity(): void { resetIdleTimer(); }
export function clearIdleTimer(): void { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } }