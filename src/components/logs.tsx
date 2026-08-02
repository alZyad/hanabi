import React from "react";
import { useTranslation } from "react-i18next";
import { PoseGroup } from "react-pose";
import { ReviewCommentPopover } from "~/components/reviewComments";
import Turn from "~/components/turn";
import Tutorial, { ITutorialStep } from "~/components/tutorial";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { useReplay } from "~/hooks/replay";
import { posedDiv } from "~/lib/posed";

interface Props {
  interturn: boolean;
}

export default function Logs(props: Props) {
  const { interturn } = props;
  const { t } = useTranslation();

  const game = useGame();
  const replay = useReplay();
  const selfPlayer = useSelfPlayer(game);

  const PoseItem = replay.cursor ? posedDiv() : Item;

  return (
    <div className="relative">
      <PoseGroup>
        {[...game.turnsHistory].reverse().map((turn, i) => {
          const turnNumber = game.turnsHistory.length - i;
          return (
            <PoseItem key={turnNumber}>
              <Turn
                showDrawn={!interturn && game.players[turn.action.from]?.id !== selfPlayer?.id}
                turn={turn}
                turnNumber={turnNumber}
              />
            </PoseItem>
          );
        })}
      </PoseGroup>

      <Tutorial placement="bottom" step={ITutorialStep.WELCOME}>
        <ReviewCommentPopover showAlways={false} turnNumber={0} />
        &nbsp;
        <Txt
          className="lavender"
          size={TxtSize.SMALL}
          value={game.turnsHistory.length ? t("gameStarted") : t("gameStarts")}
        />
      </Tutorial>
    </div>
  );
}

const Item = posedDiv({ enter: { y: 0 }, exit: { y: -100 } });
