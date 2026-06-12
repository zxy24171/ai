let lastHash: string | null = null;

function simpleHash(base64: string): string {
  const sample = base64.slice(0, 200) + base64.slice(-200);
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash) + sample.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function isDuplicateFrame(base64: string): boolean {
  if (!lastHash) { lastHash = simpleHash(base64); return false; }
  const h = simpleHash(base64);
  if (h === lastHash) return true;
  lastHash = h;
  return false;
}

export function resetFrameDedup() { lastHash = null; }