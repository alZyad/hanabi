import firebase from "firebase/app";
import "firebase/database";
import { cloneDeep } from "lodash";
import IGameState, {
  cleanState,
  GameMode,
  IGameStatus,
  ILobbyState,
  IMessage,
  IMinimalGameState,
  IPlayer,
  rebuildGame,
} from "~/lib/state";
import { MAX_PLAYERS } from "~/lib/actions";
import { GAME_EXISTS_BUT_INVALID, parseGameState } from "~/lib/schemas/gameState";
import { parseMessages } from "~/lib/schemas/messages";
import { parseGameId } from "~/lib/schemas/params";
import { logFailedPromise } from "~/lib/errors";

function database() {
  if (!firebase.apps.length) {
    firebase.initializeApp({
      // Local database configuration using firebase-server
      ...(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && {
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      }),
      // Online database configuration
      ...(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      }),
    });
  }

  return firebase.database();
}

function toPublicGames(raw: unknown): IMinimalGameState[] {
  return Object.values((raw ?? {}) as Record<string, unknown>)
    .map(parseGameState)
    .filter((game): game is IMinimalGameState => game !== null && game !== GAME_EXISTS_BUT_INVALID)
    .filter(gameIsPublic);
}

export function loadPublicGames() {
  const ref = database()
    .ref("/games")
    // Only games created less than 10 minutes ago
    .orderByChild("createdAt")
    .startAt(Date.now() - 10 * 60 * 1000);

  return new Promise((resolve) => {
    ref
      .once("value", (event) => {
        resolve(toPublicGames(event.val()));
      })
      .catch(logFailedPromise);
  });
}

export function subscribeToPublicGames(callback: (games: IMinimalGameState[]) => void) {
  const ref = database()
    .ref("/games")
    // Only games created less than 10 minutes ago
    .orderByChild("createdAt")
    .startAt(Date.now() - 10 * 60 * 1000);

  const handler = ref.on("value", (event) => {
    callback(toPublicGames(event.val()));
  });

  return () => ref.off("value", handler);
}

export async function loadGame(gameId: string): Promise<LoadGameResult> {
  if (!parseGameId(gameId)) {
    return { ok: false, reason: "not-found" };
  }

  const ref = database().ref(`/games/${gameId}`);

  return new Promise<LoadGameResult>((resolve) => {
    ref.once("value", (event) => {
      resolve(toLoadResult(event.val()));
    });
  });
}

export type GameLoadFailure = "not-found" | "invalid";

export type LoadGameResult = { ok: true; game: IGameState | ILobbyState } | { ok: false; reason: GameLoadFailure };

function toLoadResult(raw: unknown): LoadGameResult {
  const parsed = parseGameState(raw);

  if (parsed === null) {
    return { ok: false, reason: "not-found" };
  }

  if (parsed === GAME_EXISTS_BUT_INVALID) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const game = rebuildGame(parsed);
    if (!game) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, game };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function subscribeToGame(
  gameId: string,
  callback: (game: IGameState | ILobbyState) => void,
  onFailure?: (reason: GameLoadFailure) => void
) {
  if (!parseGameId(gameId)) {
    onFailure?.("not-found");
    return () => undefined;
  }

  const ref = database().ref(`/games/${gameId}`);

  const handler = ref.on("value", (event) => {
    const result = toLoadResult(event.val());
    if (result.ok) {
      callback(result.game);
    } else {
      onFailure?.(result.reason);
    }
  });

  return () => ref.off("value", handler);
}

export async function updateGame(game: IGameState | ILobbyState) {
  window["hanab"] = cloneDeep(game);

  try {
    await database().ref(`/games/${game.id}`).set(cleanState(game));
  } catch (e) {
    console.debug(`DB Error: updateGame\n ${e}`);
    throw e;
  }
}

export async function addMessage(gameId: string, message: IMessage) {
  await database().ref(`/messages/${gameId}/${message.id}`).set(message);
}

export function subscribeToMessages(gameId: string, callback: (messages: IMessage[]) => void) {
  const ref = database().ref(`/messages/${gameId}`);

  // Keep a reference to this specific handler so cleanup only detaches our own
  // listener. Calling `ref.off()` with no arguments would remove *every* "value"
  // listener at this path, tearing down other components subscribed to the same
  // messages (e.g. the always-mounted MessagesTabs badge) when this one unmounts.
  const handler = ref.on("value", (event) => {
    callback(parseMessages(event.val()));
  });

  return () => ref.off("value", handler);
}

export interface IPlayerState {
  reaction?: string | null;
  notified?: boolean;
}

export function subscribeToPlayerStates(gameId: string, callback: (states: Record<number, IPlayerState>) => void) {
  const ref = database().ref(`/playerStates/${gameId}`);

  const handler = ref.on("value", (event) => {
    callback((event.val() ?? {}) as Record<number, IPlayerState>);
  });

  return () => ref.off("value", handler);
}

export async function setReaction(game: IGameState, player: IPlayer, reaction: string | null) {
  await database().ref(`/playerStates/${game.id}/${player.index}/reaction`).set(reaction);
}

export async function setNotification(game: IGameState, player: IPlayer, notified: boolean) {
  await database().ref(`/playerStates/${game.id}/${player.index}/notified`).set(notified);
}

function gameIsPublic(game: IMinimalGameState) {
  return (
    !game.options.private &&
    game.status === IGameStatus.LOBBY &&
    game.options.gameMode === GameMode.NETWORK &&
    game.players.length &&
    game.players.length < MAX_PLAYERS
  );
}
