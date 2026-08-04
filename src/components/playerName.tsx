import classnames from "classnames";
import React from "react";
import { useTranslation } from "react-i18next";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { IPlayer } from "~/lib/state";

export enum PlayerNameSize {
  SMALL = "small",
  MEDIUM = "medium",
}

const PlayerNameTextSizes = {
  [PlayerNameSize.SMALL]: TxtSize.SMALL,
  [PlayerNameSize.MEDIUM]: TxtSize.MEDIUM,
};

interface Props {
  player: IPlayer;
  size?: PlayerNameSize;
  explicit?: boolean;
  className?: string;
  reaction?: string;
  truncate?: boolean;
}

export default function PlayerName(props: Props) {
  const { player, size = PlayerNameSize.SMALL, explicit = false, truncate = false, className } = props;
  const { t } = useTranslation();

  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const you = !explicit && player.id === selfPlayer?.id;

  return (
    <Txt
      className={classnames("relative", truncate ? "db truncate" : "inline-flex items-center", className)}
      multiline={!truncate}
      size={PlayerNameTextSizes[size]}
      value={you ? t("you") : player.name}
    />
  );
}
