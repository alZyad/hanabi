import React, { useContext } from "react";
import { useReplay } from "~/hooks/replay";
import { useSession } from "~/hooks/session";
import { getStateAtTurn } from "~/lib/actions";
import IGameState, { fillEmptyValues, GameMode, IPlayer } from "~/lib/state";

export const GameContext = React.createContext<IGameState | null>(null);

export function useGame(): IGameState {
  const game = useContext(GameContext);
  const replay = useReplay();

  if (!game) {
    throw new Error("useGame must be used within a GameContext.Provider holding an active game");
  }

  if (replay && replay.cursor !== null) {
    return {
      ...(fillEmptyValues(getStateAtTurn(game, replay.cursor)) ?? game),
      originalGame: game,
      reviewComments: [...game.reviewComments],
    };
  }

  return game;
}

export function useCurrentPlayer(game: IGameState) {
  return game.players[game.currentPlayer];
}

export function useSelfPlayer(game: IGameState): IPlayer | undefined {
  const { playerId } = useSession();
  const currentPlayer = useCurrentPlayer(game);

  if (game.options.gameMode === GameMode.NETWORK) {
    return game.players.find((p) => p.id === playerId);
  }

  if (game.options.gameMode === GameMode.PASS_AND_PLAY) {
    return currentPlayer ?? undefined;
  }
}
