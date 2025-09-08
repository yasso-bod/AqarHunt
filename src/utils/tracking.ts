import { Listing } from '../types';

type Action = 'view' | 'open' | 'save';
export type Interaction = {
  id: string;
  city?: string;
  town?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  price?: number;
  ts: number;
  action: Action;
};

const KEY = 'aqar.tracking.v1';
const MAX_EVENTS = 300;

export function loadEvents(): Interaction[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Interaction[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(arr: Interaction[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX_EVENTS)));
  } catch { /* ignore */ }
}

export function logInteraction(listing: Partial<Listing>, action: Action = 'view') {
  if (!listing?.id) return;
  const ev: Interaction = {
    id: String(listing.id),
    city: listing.city,
    town: listing.town,
    property_type: listing.property_type,
    bedrooms: Number(listing.bedrooms) || undefined,
    bathrooms: Number(listing.bathrooms) || undefined,
    size: Number(listing.size) || undefined,
    price: Number(listing.price) || undefined,
    ts: Date.now(),
    action,
  };
  const arr = loadEvents();
  arr.push(ev);
  saveEvents(arr);
}

export function getProfile() {
  const arr = loadEvents();
  if (!arr.length) return null;

  const byCount = (key: keyof Interaction) => {
    const m = new Map<string, number>();
    for (const e of arr) {
      const v = String((e as any)[key] || '');
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };

  const avg = (key: keyof Interaction) => {
    let s = 0, c = 0;
    for (const e of arr) {
      const v = Number((e as any)[key]);
      if (!isFinite(v)) continue;
      s += v; c += 1;
    }
    return c ? s / c : undefined;
  };

  const recentIds = Array.from(new Set(arr.slice(-40).reverse().map(e => e.id))).slice(0, 6);

  return {
    topCities: byCount('city'),
    topTowns: byCount('town'),
    topTypes: byCount('property_type'),
    avgBedrooms: avg('bedrooms'),
    avgBathrooms: avg('bathrooms'),
    avgSize: avg('size'),
    avgPrice: avg('price'),
    recentIds,
  };
}