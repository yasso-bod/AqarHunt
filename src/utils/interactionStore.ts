// Lightweight client-side store for tracking user interactions (views/saves)
// Data is kept per-device in localStorage; safe to swap to Supabase later.

const KEY = 'ah.events.v1';

type Event =
  | { type: 'view'; listingId: string; ts: number }
  | { type: 'save'; listingId: string; ts: number };

function read(): Event[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function write(arr: Event[]) {
  // keep only most recent 500
  localStorage.setItem(KEY, JSON.stringify(arr.slice(-500)));
}

export function logView(listingId: string) {
  const arr = read();
  arr.push({ type: 'view', listingId, ts: Date.now() });
  write(arr);
}

export function logSave(listingId: string) {
  const arr = read();
  arr.push({ type: 'save', listingId, ts: Date.now() });
  write(arr);
}

export function getSignals() {
  const arr = read().sort((a, b) => b.ts - a.ts);
  const viewed = arr.filter(e => e.type === 'view').map(e => e.listingId);
  const saved  = arr.filter(e => e.type === 'save').map(e => e.listingId);
  return { viewed, saved };
}