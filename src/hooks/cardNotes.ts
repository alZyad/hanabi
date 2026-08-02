import { useCallback, useSyncExternalStore } from "react";
import { notesStoreSchema, readLocalStorage } from "~/lib/schemas/storage";
import { IColor, IHintType, INumber } from "~/lib/state";

const STORAGE_KEY = "cardNotes";
// 3 days
const EXPIRATION_MS = 3 * 24 * 60 * 60 * 1000;

type RuledOutValue = { color: IColor; number: INumber };
type CardNotes = { [K in IHintType]: RuledOutValue[K][] };
type GameNotes = { updatedAt: number; cards: Record<string, CardNotes>; chopMoved?: string[] };
type NotesStore = Record<string, GameNotes>;

const EMPTY_STORE: NotesStore = {};

let cache: NotesStore | null = null;
const listeners = new Set<() => void>();

function pruneExpiredGames(store: NotesStore): boolean {
  const now = Date.now();
  let changed = false;
  for (const gameId of Object.keys(store)) {
    const game = store[gameId];
    if (game && now - game.updatedAt > EXPIRATION_MS) {
      delete store[gameId];
      changed = true;
    }
  }
  return changed;
}

function loadStore(): NotesStore {
  if (typeof window === "undefined") return EMPTY_STORE;

  const store = readLocalStorage(STORAGE_KEY, notesStoreSchema, {});
  if (pruneExpiredGames(store)) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  return store;
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

function updateGame(gameId: string, update: (game: GameNotes) => GameNotes) {
  const prev = read();
  const game = prev[gameId] ?? { updatedAt: 0, cards: {} };
  write({ ...prev, [gameId]: { ...update(game), updatedAt: Date.now() } });
}

function updateCard(gameId: string, cardId: number, update: (notes: CardNotes) => CardNotes) {
  updateGame(gameId, (game) => {
    const cards = { ...game.cards };
    cards[cardId] = update({ color: [], number: [], ...cards[cardId] });
    return { ...game, cards };
  });
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
      updateCard(gameId, cardId, (notes) => {
        const ruledOut: RuledOutValue[HintKind][] = notes[kind];
        const updated = ruledOut.includes(value) ? ruledOut.filter((v) => v !== value) : [...ruledOut, value];
        return { ...notes, [kind]: updated };
      });
    },
    [gameId]
  );

  const isChopMoved = useCallback(
    (cardId: number) => store[gameId]?.chopMoved?.includes(String(cardId)) ?? false,
    [store, gameId]
  );

  const toggleChopMoved = useCallback(
    (cardId: number) => {
      updateGame(gameId, (game) => {
        const key = String(cardId);
        const current = game.chopMoved ?? [];
        const chopMoved = current.includes(key) ? current.filter((id) => id !== key) : [...current, key];
        return { ...game, chopMoved };
      });
    },
    [gameId]
  );

  return { isOff, toggle, isChopMoved, toggleChopMoved };
}
