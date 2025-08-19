// Import telemetry ring buffer for recipe imports

export type AbstainEvent = {
  at: string;
  source: 'video' | 'text' | 'image' | 'url';
  reason: string;
  support?: { ingredient?: number; step?: number };
  evidenceSizes?: { caption?: number; transcript?: number; ocr?: number };
};

const ABSTAIN_BUFFER_SIZE = 20;
const lastAbstains: AbstainEvent[] = [];

export function getRecentAbstains(): AbstainEvent[] {
  return [...lastAbstains];
}

export function recordAbstain(ev: Omit<AbstainEvent, 'at'> & { at?: string }): void {
  const withTime: AbstainEvent = { ...ev, at: ev.at || new Date().toISOString() } as AbstainEvent;
  lastAbstains.unshift(withTime);
  if (lastAbstains.length > ABSTAIN_BUFFER_SIZE) lastAbstains.pop();
}
