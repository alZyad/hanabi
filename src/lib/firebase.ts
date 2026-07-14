import firebase from "firebase/app";
import "firebase/database";
import { cloneDeep } from "lodash";
import IGameState, {
  cleanState,
  fillEmptyValues,
  GameMode,
  IGameStatus,
  IMessage,
  IPlayer,
  rebuildGame,
} from "~/lib/state";
import { MAX_PLAYERS } from "~/lib/actions";
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

export function loadPublicGames() {
  const ref = database()
    .ref("/games")
    // Only games created less than 10 minutes ago
    .orderByChild("createdAt")
    .startAt(Date.now() - 10 * 60 * 1000);

  return new Promise((resolve) => {
    ref
      .once("value", (event) => {
        const games = Object.values(event.val() || {})
          .map(fillEmptyValues)
          // Game is public
          .filter(gameIsPublic);

        resolve(games);
      })
      .catch(logFailedPromise);
  });
}

export function subscribeToPublicGames(callback: (games: IGameState[]) => void) {
  const ref = database()
    .ref("/games")
    // Only games created less than 10 minutes ago
    .orderByChild("createdAt")
    .startAt(Date.now() - 10 * 60 * 1000);

  ref.on("value", (event) => {
    const games = Object.values(event.val() || {})
      .map(fillEmptyValues)
      // Game is public
      .filter(gameIsPublic);

    callback(games);
  });

  return () => ref.off();
}

export async function loadGame(gameId: string) {
  const ref = database().ref(`/games/${gameId}`);

  return new Promise<IGameState>((resolve) => {
    ref.once("value", (event) => {
      resolve(rebuildGame(fillEmptyValues(event.val())));
    });
  });
}

let debugClientId: string;
function clientId() {
  if (!debugClientId) {
    debugClientId = Math.random().toString(36).slice(2, 8);
  }
  return debugClientId;
}

function logDebug(gameId: string, entry: Record<string, unknown>) {
  try {
    database()
      .ref(`/logs/${gameId}`)
      .push({ t: Date.now(), client: clientId(), ...entry })
      .catch(logFailedPromise);
  } catch (e) {
    console.debug(`DB Error: logDebug\n ${e}`);
  }
}

function lastActionLabel(game: IGameState) {
  const turn = game.turnsHistory[game.turnsHistory.length - 1];
  if (!turn) return "-";

  const a = turn.action;
  if (a.action === "hint") {
    return `hint p${a.from}->p${a.to} ${a.type}:${a.value}`;
  }
  return `${a.action} p${a.from} c${a.cardIndex}`;
}

export function subscribeToGame(gameId: string, callback: (game: IGameState) => void) {
  const ref = database().ref(`/games/${gameId}`);
  let lastTurns = -1;

  ref.on("value", (event) => {
    const game = rebuildGame(fillEmptyValues(event.val() as IGameState));

    const turns = game.turnsHistory.length;
    const dropBy = lastTurns > turns ? lastTurns - turns : 0;
    logDebug(gameId, {
      dir: "in",
      source: "snapshot",
      turns,
      currentPlayer: game.currentPlayer,
      status: game.status,
      action: lastActionLabel(game),
      ...(dropBy > 0 && { drop: dropBy }),
    });
    lastTurns = turns;

    callback(game);
  });

  return () => ref.off();
}

export async function updateGame(game: IGameState, source = "unknown") {
  window["hanab"] = cloneDeep(game);

  logDebug(game.id, {
    dir: "out",
    source,
    turns: game.turnsHistory.length,
    currentPlayer: game.currentPlayer,
    status: game.status,
    action: lastActionLabel(game),
  });

  try {
    await database().ref(`/games/${game.id}`).set(cleanState(game));
  } catch (e) {
    console.debug(`DB Error: updateGame\n ${e}`);
    throw e;
  }
}

export async function addMessage(gameId: string, message: IMessage) {
  await database()
    .ref(`/games/${gameId}/messages`)
    .transaction((messages) => {
      return [...(messages || []), message];
    });
}

export async function setReaction(game: IGameState, player: IPlayer, reaction: string) {
  await database().ref(`/games/${game.id}/players/${player.index}/reaction`).set(reaction);
}

export async function setNotification(game: IGameState, player: IPlayer, notified: boolean) {
  await database().ref(`/games/${game.id}/players/${player.index}/notified`).set(notified);
}

function gameIsPublic(game: IGameState) {
  return (
    !game.options.private &&
    game.status === IGameStatus.LOBBY &&
    game.options.gameMode === GameMode.NETWORK &&
    game.players.length &&
    game.players.length < MAX_PLAYERS
  );
}
