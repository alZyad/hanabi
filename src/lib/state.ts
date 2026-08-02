import { defaults, omit } from "lodash";
import { commitAction, dealHands, joinGame, newGame } from "./actions";
import { ID } from "./id";

/**
 * game state
 */

export default interface IGameState {
  id: string;
  status: IGameStatus;
  playedCards: ICard[];
  drawPile: ICard[];
  discardPile: ICard[];
  players: IPlayer[];
  tokens: ITokens;
  currentPlayer: number;
  options: IGameOptions;
  // this is initiated as the number of players + 1 and serves for
  // the last round of game when the draw is empty
  actionsLeft: number;
  turnsHistory: ITurn[];
  messages: IMessage[];
  reviewComments: IReviewComment[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  synced: boolean;
  // Replay mode
  originalGame?: IGameState;
  nextGameId?: string | null;
}

export interface ILobbyState {
  id: string;
  status: IGameStatus.LOBBY;
  players: IMinimalPlayer[];
  options: IGameOptions;
  messages: IMessage[];
  reviewComments: IReviewComment[];
  createdAt: number;
  synced: boolean;
  nextGameId?: string | null;
}

export type IMinimalTurn = { action: IAction };

export type IMinimalGameState = Omit<
  IGameState,
  "players" | "turnsHistory" | "playedCards" | "drawPile" | "discardPile" | "originalGame"
> & {
  players: IMinimalPlayer[];
  turnsHistory?: IMinimalTurn[];
  playedCards?: ICard[];
  drawPile?: ICard[];
  discardPile?: ICard[];
};

export function isLobby(state: IGameState | ILobbyState): state is ILobbyState {
  return state.status === IGameStatus.LOBBY;
}

/**
 * Subtypes of the game state
 */

export interface IGameOptions {
  id: string;
  variant: GameVariant;
  playersCount: number;
  allowRollback: boolean;
  preventLoss: boolean;
  seed: string;
  private: boolean;
  hintsLevel: IGameHintsLevel;
  turnsHistory: boolean;
  botsWait: number;
  gameMode: GameMode;
  tutorial?: boolean;
}

export enum GameVariant {
  CLASSIC = "classic",
  MULTICOLOR = "multicolor",
  RAINBOW = "rainbow",
  CRITICAL_RAINBOW = "criticalRainbow",
  ORANGE = "orange",
  SEQUENCE = "sequence",
}

export enum GameMode {
  NETWORK = "network",
  PASS_AND_PLAY = "pass_and_play",
}

export enum IGameHintsLevel {
  // Direct hints & game deductions are displayed (TBD)
  ALL = "all",
  // Direct hints are displayed
  DIRECT = "direct",
  // No hints displayed
  NONE = "none",
}

export enum IGameStatus {
  LOBBY = "lobby",
  ONGOING = "ongoing",
  OVER = "over",
}

export enum IColor {
  RED = "red",
  GREEN = "green",
  BLUE = "blue",
  WHITE = "white",
  YELLOW = "yellow",
  MULTICOLOR = "multicolor",
  RAINBOW = "rainbow",
  ORANGE = "orange",
}

export enum IInsightColor {
  Play = "#B7E1BC",
  Discard = "#fdfd96",
  Other = "#666",
  Dangerous = "#820000",
  Hint = "#A2D3F6",
}

export type INumber = 1 | 2 | 3 | 4 | 5;

export enum IHintLevel {
  IMPOSSIBLE = 0,
  POSSIBLE = 1,
  SURE = 2,
}

// an array of 2 (direct hint), 1 (still possible), or 0 (impossible)
// e.g. a color hint onto a card turns all but one values to 0, and one value to 2.
// a color hint onto a card give all the other cards in the hand a 0 for that color.
// it's something public, i.e. information that has been given
// to all players
export interface ICardHint {
  color: { [key in IColor]: IHintLevel };
  number: { [key in 0 | 1 | 2 | 3 | 4 | 5]: IHintLevel };
}

export type IHand = IHandCard[];

export interface ICard {
  color: IColor;
  number: INumber;
  hint?: ICardHint;
  id?: number;
  receivedHints?: ITurn<IHintAction>[];
}

export interface IHandCard extends ICard {
  hint: ICardHint;
}

export type IAction = ICardAction | IDiscardAction | IPlayAction | IHintAction;
export type IActionType = "discard" | "play" | "hint";

export interface ICardAction {
  action: "discard" | "play";
  from: number;
  card?: ICard;
  cardIndex: number;
}
export interface IDiscardAction {
  action: "discard";
  from: number;
  card?: ICard;
  cardIndex: number;
}

export interface IPlayAction {
  action: "play";
  from: number;
  card?: ICard;
  cardIndex: number;
}

export type IHintType = "color" | "number";

export interface IHintAction {
  action: "hint";
  from: number;
  to: number;
  type: IHintType;
  value: IColor | INumber;
  cardsIndex?: number[];
}

export interface IReviewComment {
  playerId: string;
  afterTurnNumber: number;
  comment?: string;
}
export interface IColorHintAction extends IHintAction {
  type: "color";
  value: IColor;
}

export interface INumberHintAction extends IHintAction {
  type: "number";
  value: INumber;
}

export interface ITurn<A extends IAction = IAction> {
  action: A;
  card?: ICard;
  failed?: boolean;
}

export interface IMessage {
  id: ID;
  content: string;
  from: number;
  turn: number;
}

export interface IPlayer {
  id: string;
  name: string;
  hand: IHand;
  reaction?: string;
  lastAction?: IAction;
  index: number;
  notified?: boolean;
  bot: boolean;
}

export type IMinimalPlayer = Omit<IPlayer, "hand" | "index"> & { index?: number };

// the *remaining* strikes and hints.
// There are 8 hints and 3 strikes to begin with.
export interface ITokens {
  hints: number;
  strikes: number;
}

export function rebuildLobby(state: IMinimalGameState): ILobbyState {
  return {
    id: state.id,
    status: IGameStatus.LOBBY,
    options: state.options,
    players: (state.players || []).map((player, index) => ({ ...omit(player, "hand"), index })),
    messages: state.messages ?? [],
    reviewComments: state.reviewComments ?? [],
    createdAt: state.createdAt,
    synced: false,
    nextGameId: state.nextGameId ?? null,
  };
}

export function rebuildGame(state: IMinimalGameState | null): IGameState | ILobbyState | null {
  if (!state) {
    return null;
  }

  if (state.status === IGameStatus.LOBBY) {
    return rebuildLobby(state);
  }

  let newState = newGame(state.options);

  (state.players || []).forEach((player) => {
    newState = joinGame(newState, player);
  });

  newState = dealHands(newState);

  (state.turnsHistory || []).forEach((turn) => {
    newState = commitAction(newState, turn.action);
  });

  newState.messages = state.messages ?? [];
  newState.status = state.status;
  newState.createdAt = state.createdAt;
  newState.nextGameId = state.nextGameId ?? null;
  newState.reviewComments = state.reviewComments ?? [];

  return newState;
}

export function cleanState(state: IGameState | ILobbyState): Partial<IMinimalGameState> {
  const base: Partial<IMinimalGameState> = {
    ...omit(state, ["playedCards", "drawPile", "discardPile"]),
    players: state.players.map((player) => omit(player, "hand")) as IMinimalPlayer[],
  };

  if (isLobby(state)) {
    return base;
  }

  return {
    ...base,
    turnsHistory: state.turnsHistory.map((turn) => ({
      action: omit(turn.action, ["card"]) as IAction,
    })),
  };
}

// empty arrays are returned as null in Firebase, so we fill
// them back to avoid having to type check everywhere
export function fillEmptyValues<T extends IMinimalGameState>(state: T | null): T | null {
  if (!state) {
    return null;
  }

  return defaults(state, {
    playedCards: [],
    drawPile: [],
    discardPile: [],
    messages: [],
    players: (state.players || []).map((player) =>
      defaults(player, {
        hand: [],
      })
    ),
    turnsHistory: [],
    reviewComments: [],
  }) as T;
}

export function isHintAction(action: IAction): action is IHintAction {
  return action.action === "hint";
}
export function isDiscardAction(action: IAction): action is IDiscardAction {
  return action.action === "discard";
}
export function isPlayAction(action: IAction): action is IPlayAction {
  return action.action === "play";
}
export function isCardAction(action: IAction): action is ICardAction {
  return isDiscardAction(action) || isPlayAction(action);
}

export function isColorHintAction(action: IHintAction): action is IColorHintAction {
  return action.type === "color";
}
export function isNumberHintAction(action: IHintAction): action is INumberHintAction {
  return action.type === "number";
}
