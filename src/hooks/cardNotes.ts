import { useCallback, useSyncExternalStore } from "react";
import { IColor, IHintType, INumber } from "~/lib/state";

const STORAGE_KEY = "cardNotes";
// 3 days
const EXPIRATION_MS = 3 * 24 * 60 * 60 * 1000;

type RuledOutValue = { color: IColor; number: INumber };
type CardNotes = { [K in IHintType]: RuledOutValue[K][] };
type GameNotes = { updatedAt: number; cards: Record<string, CardNotes> };
type NotesStore = Record<string, GameNotes>;

const EMPTY_STORE: NotesStore = {};

let cache: NotesStore | null = null;
const listeners = new Set<() => void>();

function pruneExpiredGames(store: NotesStore): boolean {
  const now = Date.now();
  let changed = false;
  for (const gameId of Object.keys(store)) {
    if (now - store[gameId].updatedAt > EXPIRATION_MS) {
      delete store[gameId];
      changed = true;
    }
  }
  return changed;
}

function loadStore(): NotesStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const store: NotesStore = raw ? JSON.parse(raw) : {};
    if (pruneExpiredGames(store)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
    return store;
  } catch {
    return {};
  }
}

function read(): NotesStore {
  if (cache === null) cache = loadStore();
  return cache;
}

function write(next: NotesStore) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCardNotes(gameId: string) {
  const store = useSyncExternalStore(subscribe, read, () => EMPTY_STORE);

  const isOff = useCallback(
    <HintKind extends IHintType>(cardId: number, kind: HintKind, value: RuledOutValue[HintKind]) => {
      const ruledOut = store[gameId]?.cards?.[cardId]?.[kind];
      return ruledOut ? ruledOut.includes(value) : false;
    },
    [store, gameId]
  );

  const toggle = useCallback(
    <HintKind extends IHintType>(cardId: number, kind: HintKind, value: RuledOutValue[HintKind]) => {
      const prev = read();
      const next: NotesStore = { ...prev };
      const game = next[gameId] ?? { updatedAt: 0, cards: {} };
      const cards = { ...game.cards };
      const cardNotes: CardNotes = { color: [], number: [], ...cards[cardId] };
      const ruledOutForKind: RuledOutValue[HintKind][] = cardNotes[kind];
      const updated = ruledOutForKind.includes(value)
        ? ruledOutForKind.filter((v) => v !== value)
        : [...ruledOutForKind, value];

      cards[cardId] = { ...cardNotes, [kind]: updated };
      next[gameId] = { updatedAt: Date.now(), cards };

      write(next);
    },
    [gameId]
  );

  return { isOff, toggle };
}
