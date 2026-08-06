const STORAGE_KEY = "hanabi.perfLog";
const MAX_ENTRIES = 1000;

export type PerfEntry =
  | {
      t: number;
      kind: "update";
      turns: number;
      total: number;
      parse: number;
      rebuild: number;
      render: number;
    }
  | { t: number; kind: "aiSim"; turns: number; ms: number }
  | { t: number; kind: "hand"; action: "expand" | "collapse"; render: number; paint: number };

let entries: PerfEntry[] | null = null;

function load(): PerfEntry[] {
  if (entries) return entries;
  if (typeof window === "undefined") {
    entries = [];
    return entries;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    entries = raw ? (JSON.parse(raw) as PerfEntry[]) : [];
  } catch {
    entries = [];
  }
  return entries;
}

export const perfDebug = {
  enabled: false,
  receivedAt: null as number | null,
  parseMs: 0,
  rebuildMs: 0,
  turns: 0,
  handToggleAt: null as number | null,

  record(entry: PerfEntry) {
    if (!perfDebug.enabled || typeof window === "undefined") return;
    const log = load();
    log.push(entry);
    if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
      return;
    }
  },

  getLog(): PerfEntry[] {
    return [...load()];
  },

  clear() {
    entries = [];
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
  },
};
