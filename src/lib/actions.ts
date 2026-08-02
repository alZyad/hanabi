import assert from "assert";
import { cloneDeep, findIndex, flatMap, last, range, shuffle, zipObject } from "lodash";
import mem from "mem";
import { shuffle as shuffleSeed } from "shuffle-seed";
import { generateShuffleSeed, nextGameId } from "./id";
import IGameState, {
  GameVariant,
  IAction,
  ICard,
  ICardHint,
  IColor,
  IGameOptions,
  IGameStatus,
  IHand,
  IHintAction,
  IHintLevel,
  ILobbyState,
  IMinimalPlayer,
  INumber,
  isCardAction,
  isHintAction,
  ITurn,
} from "./state";

export const numbers: INumber[] = [1, 2, 3, 4, 5];

const startingHandSize = { 2: 5, 3: 5, 4: 4, 5: 4 };
export const MaxHints = 8;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;

export function handSizeForPlayerCount(playersCount: number): number {
  return startingHandSize[Math.max(MIN_PLAYERS, Math.min(playersCount, MAX_PLAYERS))];
}

export function isPlayable(card: ICard, playedCards: ICard[]): boolean {
  const isPreviousHere =
    card.number === 1 || findIndex(playedCards, (c) => card.number === c.number + 1 && card.color === c.color) > -1; // first card on the pile // previous card belongs to the playedCards

  const isSameNotHere = findIndex(playedCards, (c) => c.number === card.number && c.color === card.color) === -1;

  return isPreviousHere && isSameNotHere;
}

/**
 * Side effect function that applies the given hint on a given hand's cards
 */
function applyHint(hand: IHand, hint: IHintAction, game: IGameState) {
  const isRainbowVariant =
    game.options.variant === GameVariant.RAINBOW || game.options.variant === GameVariant.CRITICAL_RAINBOW;
  const isSequenceVariant = game.options.variant === GameVariant.SEQUENCE;

  const cardsIndex: number[] = [];
  hint.cardsIndex = cardsIndex;

  hand.forEach((card, index) => {
    const cardHint = card.hint;
    if (!cardHint) {
      return;
    }

    if (matchHint(game, hint, card)) {
      cardsIndex.push(index);

      if (!card.receivedHints) {
        card.receivedHints = [];
      }
      card.receivedHints.push({ action: hint });

      // positive hint on card - mark all other values as impossible (except rainbow)
      Object.keys(cardHint[hint.type])
        .filter((value) => {
          return isRainbowVariant ? value !== IColor.RAINBOW : true;
        })
        .filter((value) => {
          if (hint.type === "number" && isSequenceVariant) {
            return value < hint.value;
          }
          return value != hint.value;
        })
        .forEach((value) => {
          cardHint[hint.type][value] = IHintLevel.IMPOSSIBLE;
        });
    } else {
      // negative hint on card - mark as impossible
      cardHint[hint.type][hint.value] = IHintLevel.IMPOSSIBLE;

      if (hint.type === "number" && isSequenceVariant) {
        range(hint.value as INumber, 6).forEach((n) => {
          cardHint.number[n] = IHintLevel.IMPOSSIBLE;
        });
      }

      // for color hints, also mark rainbow as impossible
      if (hint.type === "color") {
        cardHint.color.rainbow = IHintLevel.IMPOSSIBLE;
      }
    }

    // if there's only one possible color, make it sure
    const onlyPossibleColors = Object.keys(cardHint.color).filter(
      (color) => cardHint.color[color] === IHintLevel.POSSIBLE
    );
    if (onlyPossibleColors.length === 1) {
      const [onlyColor] = onlyPossibleColors;
      if (onlyColor) {
        cardHint.color[onlyColor] = IHintLevel.SURE;
      }
    }

    // if there's only one possible number, make it sure
    const onlyPossibleNumbers = Object.keys(cardHint.number).filter(
      (number) => cardHint.number[number] === IHintLevel.POSSIBLE
    );
    if (onlyPossibleNumbers.length === 1) {
      const [onlyNumber] = onlyPossibleNumbers;
      if (onlyNumber) {
        cardHint.number[onlyNumber] = IHintLevel.SURE;
      }
    }
  });
}

export function emptyHint(options: IGameOptions): ICardHint {
  return {
    color: {
      [IColor.BLUE]: 1,
      [IColor.RED]: 1,
      [IColor.GREEN]: 1,
      [IColor.YELLOW]: 1,
      [IColor.WHITE]: 1,
      [IColor.MULTICOLOR]: options.variant === GameVariant.MULTICOLOR ? 1 : 0,
      [IColor.RAINBOW]: 1, // Should never be used directly
      [IColor.ORANGE]: options.variant === GameVariant.ORANGE ? 1 : 0,
    },
    number: { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
  };
}

export function matchColor(colorA: IColor, colorB: IColor) {
  return colorA === colorB || colorA === IColor.RAINBOW || colorB === IColor.RAINBOW;
}

export function matchNumber(game: IGameState, numberA: INumber, numberB: INumber) {
  if (game.options.variant === GameVariant.SEQUENCE) {
    return numberA >= numberB;
  }

  return numberA === numberB;
}

export function matchHint(game: IGameState, hint: IHintAction, card: ICard) {
  return hint.type === "color"
    ? matchColor(card.color, hint.value as IColor)
    : matchNumber(game, card.number, hint.value as INumber);
}

export function isGameOver(state: IGameState) {
  return (
    state.actionsLeft <= 0 ||
    state.tokens.strikes >= 3 ||
    getMaximumPossibleScore(state) === (state.playedCards || []).length
  );
}

export function commitAction<A extends IAction>(state: IGameState, action: A): IGameState {
  const actionIsntFromCurrentPlayer = action.from !== state.currentPlayer;
  const isSelfHinting = isHintAction(action) && action.from == action.to;
  const isHintingWithoutTokens = action.action === "hint" && state.tokens.hints === 0;

  if (actionIsntFromCurrentPlayer || isHintingWithoutTokens || isSelfHinting) {
    return state;
  }

  // the function should be pure
  const s = cloneDeep(state) as IGameState;
  let playFailed: boolean | null = null;

  const player = s.players[action.from];

  if (!player) {
    return state;
  }

  let newCard: ICard | null = null;
  if (isCardAction(action)) {
    if (!player.hand) {
      return state;
    }
    const [card] = player.hand.splice(action.cardIndex, 1);
    if (!card) {
      throw new Error(`Invalid action: no card at index ${action.cardIndex} for player ${action.from}`);
    }
    action.card = card;
    /** PLAY */
    if (action.action === "play") {
      if (isPlayable(card, s.playedCards)) {
        playFailed = false;
        s.playedCards.push(card);
        if (card.number === 5) {
          // play a 5, win a hint
          if (s.tokens.hints < MaxHints) s.tokens.hints += 1;
        }
      } else {
        // strike !
        playFailed = true;
        s.tokens.strikes += 1;
        s.discardPile.push(card);
      }
    } else {
      /** DISCARD */
      if (s.tokens.hints < MaxHints) {
        s.discardPile.push(card);
        s.tokens.hints += 1;
      } else {
        throw new Error("Invalid action, cannot discard when the hints are maxed out!");
      }
    }

    // in both cases (play, discard) we need to remove a card from the hand and get a new one
    if (s.drawPile && s.drawPile.length) {
      newCard = s.drawPile.pop() ?? null;
      if (newCard) {
        player.hand.unshift({ ...newCard, hint: emptyHint(state.options) });
      }
    }
  }

  /** HINT */
  if (isHintAction(action)) {
    const toPlayer = s.players[action.to];

    if (!toPlayer?.hand) {
      return state;
    }

    s.tokens.hints -= 1;
    applyHint(toPlayer.hand, action, s);
  }

  // there's no card in the pile (or the last card was just drawn)
  // decrease the actionsLeft counter.
  // The game ends when it reaches 0.
  if (!s.drawPile || s.drawPile.length === 0) {
    s.actionsLeft -= 1;
  }

  // update player
  s.currentPlayer = (s.currentPlayer + 1) % s.options.playersCount;

  // update history
  const turn: ITurn = { action };
  if (newCard) {
    turn.card = newCard;
  }
  if (playFailed !== null) {
    turn.failed = playFailed;
  }
  s.turnsHistory.push(turn);

  if (isGameOver(s)) {
    s.status = IGameStatus.OVER;
    s.endedAt = Date.now();
  }

  return s;
}

/**
 * Rollback the state for the given amount of turns
 */
export const getStateAtTurn = mem(
  (state: IGameState, turnIndex: number) => {
    let newState = newGame(state.options);

    state.players.forEach((player) => {
      newState = joinGame(newState, player);
    });

    newState = dealHands(newState);

    state.turnsHistory.slice(0, turnIndex).forEach((turn) => {
      newState = commitAction(newState, turn.action);
    });

    newState.status = IGameStatus.ONGOING;
    newState.createdAt = state.createdAt;

    return newState;
  },
  {
    cacheKey: ([state, turn]) => `${state.id}-${turn}`,
  }
);

export function getColors(variant?: GameVariant) {
  switch (variant) {
    case GameVariant.MULTICOLOR:
      return [IColor.BLUE, IColor.GREEN, IColor.RED, IColor.WHITE, IColor.YELLOW, IColor.MULTICOLOR];
    case GameVariant.RAINBOW:
    case GameVariant.CRITICAL_RAINBOW:
      return [IColor.BLUE, IColor.GREEN, IColor.RED, IColor.WHITE, IColor.YELLOW, IColor.RAINBOW];
    case GameVariant.ORANGE:
      return [IColor.BLUE, IColor.GREEN, IColor.RED, IColor.WHITE, IColor.YELLOW, IColor.ORANGE];
    case GameVariant.CLASSIC:
    default:
      return [IColor.BLUE, IColor.GREEN, IColor.RED, IColor.WHITE, IColor.YELLOW];
  }
}

export function getHintableColors(state: IGameState) {
  return getColors(state.options.variant).filter((color) => color !== IColor.RAINBOW);
}

export function getScore(state: IGameState) {
  return state.playedCards.length;
}

export function getMaximumScore(state: IGameState) {
  switch (state.options.variant) {
    case GameVariant.MULTICOLOR:
    case GameVariant.RAINBOW:
    case GameVariant.CRITICAL_RAINBOW:
    case GameVariant.ORANGE:
      return 30;
    case GameVariant.CLASSIC:
    default:
      return 25;
  }
}

export function getPlayedCardsPile(state: IGameState): { [key in IColor]: INumber } {
  const colors = getColors(state.options.variant);

  return zipObject(
    colors,
    colors.map((color) => {
      const topCard = last(state.playedCards.filter((card) => card.color === color));

      return topCard ? topCard.number : 0;
    })
  ) as { [key in IColor]: INumber };
}

/**
 * Compute the max possible score with remaining cards in hand & deck
 * Doesn't take in account remaining turns
 */
export function getMaximumPossibleScore(state: IGameState): number {
  const playableCards = [...state.drawPile, ...flatMap(state.players, (p) => p.hand ?? [])];
  const playedCardsPile = getPlayedCardsPile(state);

  let maxScore = getMaximumScore(state);

  Object.keys(playedCardsPile).forEach((color) => {
    let value = playedCardsPile[color];

    while (value < 5) {
      const nextCard = playableCards.find((card) => card.color === color && card.number === value + 1);

      if (!nextCard) {
        maxScore -= 5 - value;
        break;
      }
      value += 1;
    }
  });

  return maxScore;
}

export function joinGame(state: IGameState, player: IMinimalPlayer): IGameState {
  const game = cloneDeep(state) as IGameState;

  game.players = game.players || [];
  game.players.push({ ...player, hand: [], index: game.players.length });

  return game;
}

export function dealHands(state: IGameState): IGameState {
  const game = cloneDeep(state) as IGameState;

  game.players.forEach((player) => {
    const dealt = game.drawPile.splice(0, startingHandSize[game.options.playersCount]);
    player.hand = dealt.map((card) => ({ ...card, hint: emptyHint(game.options) }));
  });

  return game;
}

export function buildDeck(options: IGameOptions) {
  const baseColors = [IColor.WHITE, IColor.BLUE, IColor.RED, IColor.GREEN, IColor.YELLOW];
  const cards = flatMap(baseColors, (color) => [
    { number: 1, color },
    { number: 1, color },
    { number: 1, color },
    { number: 2, color },
    { number: 2, color },
    { number: 3, color },
    { number: 3, color },
    { number: 4, color },
    { number: 4, color },
    { number: 5, color },
  ]);

  if (options.variant === GameVariant.MULTICOLOR) {
    cards.push(
      { number: 1, color: IColor.MULTICOLOR },
      { number: 2, color: IColor.MULTICOLOR },
      { number: 3, color: IColor.MULTICOLOR },
      { number: 4, color: IColor.MULTICOLOR },
      { number: 5, color: IColor.MULTICOLOR }
    );
  }

  if (options.variant === GameVariant.ORANGE) {
    cards.push(
      { number: 1, color: IColor.ORANGE },
      { number: 1, color: IColor.ORANGE },
      { number: 1, color: IColor.ORANGE },
      { number: 2, color: IColor.ORANGE },
      { number: 2, color: IColor.ORANGE },
      { number: 3, color: IColor.ORANGE },
      { number: 3, color: IColor.ORANGE },
      { number: 4, color: IColor.ORANGE },
      { number: 4, color: IColor.ORANGE },
      { number: 5, color: IColor.ORANGE }
    );
  }

  if (options.variant === GameVariant.RAINBOW) {
    cards.push(
      { number: 1, color: IColor.RAINBOW },
      { number: 1, color: IColor.RAINBOW },
      { number: 1, color: IColor.RAINBOW },
      { number: 2, color: IColor.RAINBOW },
      { number: 2, color: IColor.RAINBOW },
      { number: 3, color: IColor.RAINBOW },
      { number: 3, color: IColor.RAINBOW },
      { number: 4, color: IColor.RAINBOW },
      { number: 4, color: IColor.RAINBOW },
      { number: 5, color: IColor.RAINBOW }
    );
  }

  if (options.variant === GameVariant.CRITICAL_RAINBOW) {
    cards.push(
      { number: 1, color: IColor.RAINBOW },
      { number: 2, color: IColor.RAINBOW },
      { number: 3, color: IColor.RAINBOW },
      { number: 4, color: IColor.RAINBOW },
      { number: 5, color: IColor.RAINBOW }
    );
  }

  return cards;
}

export function deckSize(options: IGameOptions): number {
  return buildDeck(options).length;
}

export function createLobby(options: IGameOptions): ILobbyState {
  return {
    id: options.id,
    status: IGameStatus.LOBBY,
    players: [],
    options,
    reviewComments: [],
    createdAt: Date.now(),
    synced: false,
  };
}

export function joinLobby(lobby: ILobbyState, player: IMinimalPlayer): ILobbyState {
  const nextLobby = cloneDeep(lobby) as ILobbyState;

  nextLobby.players = nextLobby.players || [];
  nextLobby.players.push({ ...player, index: nextLobby.players.length });

  return nextLobby;
}

export function newGame(options: IGameOptions): IGameState {
  assert(options.playersCount >= MIN_PLAYERS && options.playersCount <= MAX_PLAYERS);

  options = { ...options, variant: options.variant ?? GameVariant.CLASSIC };

  const cards = buildDeck(options).map((c, i) => ({ ...c, id: i }));

  const deck = shuffleSeed(cards, options.seed);

  const currentPlayer = shuffleSeed(range(options.playersCount), options.seed)[0];

  return {
    id: options.id,
    status: IGameStatus.LOBBY,
    playedCards: [],
    drawPile: deck,
    discardPile: [],
    players: [],
    tokens: {
      hints: MaxHints,
      strikes: 0,
    },
    currentPlayer,
    options,
    actionsLeft: options.playersCount + 1, // this will be decreased when the draw pile is empty
    turnsHistory: [],
    createdAt: Date.now(),
    synced: false,
    reviewComments: [],
  };
}

export function startGameFromLobby(lobby: ILobbyState, startedAt: number): IGameState {
  let nextGame = newGame({ ...lobby.options, playersCount: lobby.players.length });

  lobby.players.forEach((player) => {
    nextGame = joinGame(nextGame, player);
  });

  nextGame = dealHands(nextGame);

  nextGame.status = IGameStatus.ONGOING;
  nextGame.startedAt = startedAt;
  nextGame.createdAt = lobby.createdAt;

  return nextGame;
}

export function recreateGame(game: IGameState): ILobbyState {
  let nextLobby = createLobby({
    ...game.options,
    id: game.nextGameId || nextGameId(),
    seed: generateShuffleSeed(),
  });

  shuffle(game.players).forEach((player) => {
    nextLobby = joinLobby(nextLobby, player);
  });

  return nextLobby;
}
