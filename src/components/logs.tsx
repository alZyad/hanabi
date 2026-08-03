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
  dividerAfter?: number;
}

export default function Logs(props: Props) {
  const { interturn, dividerAfter } = props;
  const { t } = useTranslation();

  const game = useGame();
  const replay = useReplay();
  const selfPlayer = useSelfPlayer(game);

  const PoseItem = replay.cursor ? posedDiv() : Item;
  const turnsCount = game.turnsHistory.length;

  return (
    <div className="relative">
      <PoseGroup>
        {[...game.turnsHistory].reverse().flatMap((turn, i) => {
          const turnNumber = turnsCount - i;
          const nodes = [
            <PoseItem key={turnNumber}>
              <Turn
                showDrawn={!interturn && game.players[turn.action.from]?.id !== selfPlayer?.id}
                turn={turn}
                turnNumber={turnNumber}
              />
            </PoseItem>,
          ];

          if (dividerAfter !== undefined && i === dividerAfter - 1 && dividerAfter < turnsCount) {
            nodes.push(<Divider key="new-items-divider" className="new-items-divider" />);
          }

          return nodes;
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
const Divider = posedDiv({});
