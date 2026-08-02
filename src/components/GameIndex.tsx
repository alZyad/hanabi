import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { Game } from "~/components/game";
import LobbyView from "~/components/lobbyView";
import useConnectivity from "~/hooks/connectivity";
import { GameContext } from "~/hooks/game";
import { loadUserPreferences, UserPreferencesContext } from "~/hooks/userPreferences";
import { IPlayerState, subscribeToGame, subscribeToPlayerStates } from "~/lib/firebase";
import IGameState, { ILobbyState, IMinimalPlayer, IPlayer, isLobby } from "~/lib/state";

function mergePlayerStates<T extends IGameState | ILobbyState>(game: T, playerStates: Record<number, IPlayerState>): T {
  if (Object.keys(playerStates).length === 0) return game;

  return {
    ...game,
    players: (game.players as Array<IPlayer | IMinimalPlayer>).map((player) => {
      const state = playerStates[player.index as number];
      if (!state) return player;
      return { ...player, reaction: state.reaction ?? undefined, notified: state.notified ?? undefined };
    }),
  } as T;
}

function SsrFreeGameIndex(props: { host: string; game: IGameState | ILobbyState }) {
  const { game: initialGame, host } = props;
  const [userPreferences, setUserPreferences] = useState(loadUserPreferences());
  const [game, setGame] = useState<IGameState | ILobbyState>(initialGame);
  const [playerStates, setPlayerStates] = useState<Record<number, IPlayerState>>({});
  const online = useConnectivity();
  const router = useRouter();
  /**
   * Load game from database
   */
  useEffect(() => {
    if (!online) return;

    return subscribeToGame(
      game.id as string,
      (game) => {
        setGame({ ...game, synced: true });
      },
      (reason) => {
        router.push(reason === "not-found" ? "/404" : "/?error=invalid-game");
      }
    );
  }, [online, game?.id, router]);

  useEffect(() => {
    if (!online) return;

    return subscribeToPlayerStates(game.id as string, setPlayerStates);
  }, [online, game?.id]);

  const mergedGame = useMemo(() => mergePlayerStates(game, playerStates), [game, playerStates]);

  return (
    <UserPreferencesContext.Provider value={[userPreferences, setUserPreferences]}>
      {isLobby(mergedGame) ? (
        <LobbyView host={host} lobby={mergedGame} onStateChange={setGame} />
      ) : (
        <GameContext.Provider value={mergedGame}>
          <Game onGameChange={setGame} />
        </GameContext.Provider>
      )}
    </UserPreferencesContext.Provider>
  );
}

const GameIndex = dynamic(() => Promise.resolve(SsrFreeGameIndex), {
  ssr: false,
});
export default GameIndex;
