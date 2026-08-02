import React, { ReactNode, useLayoutEffect, useRef } from "react";
import { ActionAreaType, ISelectedArea } from "~/components/actionArea";
import PlayerGame from "~/components/playerGame";
import Tutorial, { ITutorialStep } from "~/components/tutorial";
import { useCurrentPlayer, useGame, useSelfPlayer } from "~/hooks/game";
import { IAction, IPlayer } from "~/lib/state";

interface Props {
  displayStats: boolean;
  selectedArea: ISelectedArea;
  onSelectPlayer: (player: IPlayer, cardIndex: number) => void;
  onNotifyPlayer: (player: IPlayer) => void;
  onReaction: (reaction: string) => void;
  onCloseArea: () => void;
  onCommitAction: (action: IAction) => void;
}

function AutoHeight(props: { className?: string; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const apply = () => {
      outer.style.height = `${inner.offsetHeight}px`;
    };
    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className={props.className} style={{ overflow: "hidden", transition: "height 200ms ease-out" }}>
      <div ref={innerRef}>{props.children}</div>
    </div>
  );
}

export default function PlayersBoard(props: Props) {
  const { displayStats, selectedArea, onSelectPlayer, onNotifyPlayer, onReaction, onCloseArea, onCommitAction } = props;

  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const currentPlayer = useCurrentPlayer(game);

  const position = selfPlayer?.index ?? game.players.length;
  const otherPlayers = [...game.players.slice(position + 1), ...game.players.slice(0, position)];

  let selectedPlayer: IPlayer | undefined;
  let cardIndex: number | undefined;
  if (selectedArea.type === ActionAreaType.SELF_PLAYER) {
    selectedPlayer = game.players.find((player) => player.id === selectedArea.player.id);
    cardIndex = selectedArea.cardIndex;
  }
  if (selectedArea.type === ActionAreaType.OTHER_PLAYER) {
    selectedPlayer = game.players.find((player) => player.id === selectedArea.player.id);
  }

  return (
    <>
      <Tutorial step={ITutorialStep.OTHER_PLAYERS}>
        {otherPlayers.map((otherPlayer, i) => (
          <AutoHeight key={i} className="bb b--yellow bg-main-dark">
            <PlayerGame
              active={currentPlayer === otherPlayer}
              displayStats={displayStats}
              id={`player-game-${i + 1}`}
              player={otherPlayer}
              selected={selectedPlayer === otherPlayer}
              onCloseArea={onCloseArea}
              onCommitAction={onCommitAction}
              onNotifyPlayer={onNotifyPlayer}
              onSelectPlayer={onSelectPlayer}
            />
          </AutoHeight>
        ))}
      </Tutorial>
      {selfPlayer && (
        <Tutorial step={ITutorialStep.SELF_PLAYER}>
          <div className="mb4 flex flex-column flex-grow-1">
            <PlayerGame
              active={currentPlayer === selfPlayer}
              cardIndex={cardIndex}
              displayStats={displayStats}
              id="player-game-self"
              player={selfPlayer}
              selected={selectedPlayer === selfPlayer}
              self={true}
              onCloseArea={onCloseArea}
              onCommitAction={onCommitAction}
              onReaction={onReaction}
              onSelectPlayer={onSelectPlayer}
            />
          </div>
        </Tutorial>
      )}
    </>
  );
}
