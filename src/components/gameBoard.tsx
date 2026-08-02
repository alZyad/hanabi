import React from "react";
import { useTranslation } from "react-i18next";
import Board from "~/components/board";
import HomeButton from "~/components/homeButton";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { useColorBlindMode } from "~/hooks/userPreferences";
import { getMaximumPossibleScore, getMaximumScore, getScore } from "~/lib/actions";
import { IGameStatus } from "~/lib/state";

interface Props {
  onMenuClick?: () => void;
  onRollbackClick?: () => void;
}

export { CardWrapper } from "~/components/card";

export default function GameBoard(props: Props) {
  const { onMenuClick, onRollbackClick } = props;
  const { t } = useTranslation();

  const game = useGame();
  const colorBlindMode = useColorBlindMode();
  const selfPlayer = useSelfPlayer(game);
  const score = getScore(game);
  const maxScore = getMaximumScore(game);
  const maxPossibleScore = getMaximumPossibleScore(game);

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <Txt uppercase id="score" value={t("score", { score, maxPossibleScore })} />

          {maxScore !== maxPossibleScore && <Txt uppercase className="strike ml1 gray" value={maxScore} />}

          {game.actionsLeft > 0 && game.actionsLeft <= game.options.playersCount && (
            <Txt uppercase className="red ml2" value={t("turnsLeftDisclaimer", { count: game.actionsLeft })} />
          )}
        </div>
        <div className="flex">
          {game.options.allowRollback && selfPlayer && onRollbackClick && (
            <Button
              void
              disabled={game.status === IGameStatus.LOBBY}
              size={ButtonSize.TINY}
              text="⟲"
              onClick={() => onRollbackClick()}
            />
          )}
          {onMenuClick && <HomeButton void className="ml1" onClick={onMenuClick} />}
        </div>
      </div>

      <Board
        colorBlindMode={colorBlindMode}
        deckCount={game.drawPile.length}
        hints={game.tokens.hints}
        playedCards={game.playedCards}
        strikes={game.tokens.strikes}
        variant={game.options.variant}
      />
    </div>
  );
}
