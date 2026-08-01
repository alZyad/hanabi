import classnames from "classnames";
import React from "react";
import { Trans } from "react-i18next";
import Card, { CardSize, ICardContext, PositionMap } from "~/components/card";
import Hint from "~/components/hint";
import PlayerName from "~/components/playerName";
import { ReviewCommentPopover } from "~/components/reviewComments";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import {
  GameMode,
  GameVariant,
  ICard,
  IDiscardAction,
  IGameHintsLevel,
  IHintAction,
  IHintLevel,
  IPlayAction,
  isDiscardAction,
  isHintAction,
  isPlayAction,
  ITurn,
} from "~/lib/state";

interface Props {
  turn: ITurn;
  showDrawn: boolean;
  showPosition?: boolean;
  turnNumber?: number;
}

export default function Turn(props: Props) {
  const { turn, showDrawn, showPosition = true } = props;
  const game = useGame();
  const selfPlayer = useSelfPlayer(game);

  const isViewingOwnActions = turn.action.from === selfPlayer?.index;
  const isViewingOwnReceivedHint = isHintAction(turn.action) && turn.action.to === selfPlayer?.index;

  const fromPlayer = game.players[turn.action.from];
  if (!fromPlayer) return null;

  const playerNameFrom = <PlayerName explicit={game.options.gameMode === GameMode.PASS_AND_PLAY} player={fromPlayer} />;

  let textualTurn: React.ReactNode;
  let drawnTurn: React.ReactNode;

  if (isHintAction(turn.action)) {
    const toPlayer = game.players[turn.action.to];
    const playerNameTo = toPlayer && (
      <PlayerName explicit={game.options.gameMode === GameMode.PASS_AND_PLAY} player={toPlayer} />
    );

    if (isViewingOwnActions) {
      textualTurn = (
        <Trans i18nKey="youGaveHintTurn">
          You hinted {playerNameTo} about their <HintValue action={turn.action} />
        </Trans>
      );
    } else if (isViewingOwnReceivedHint) {
      textualTurn = (
        <Trans i18nKey="somebodyHintedYouTurn">
          {playerNameFrom} hinted you about <HintValue action={turn.action} />
        </Trans>
      );
    } else {
      textualTurn = (
        <Trans i18nKey="somebodyHintedSomebodyTurn">
          {playerNameFrom} hinted {playerNameTo} about <HintValue action={turn.action} />
        </Trans>
      );
    }

    if (showPosition) {
      textualTurn = (
        <>
          {textualTurn}
          <CardPosition action={turn.action} />
        </>
      );
    }
  } else if (isDiscardAction(turn.action) && turn.action.card) {
    textualTurn = isViewingOwnActions ? (
      <Trans i18nKey="youDiscardedTurn">
        You discarded your
        <TurnCard
          card={turn.action.card}
          colorBlindMode={game.options.colorBlindMode}
          context={ICardContext.DISCARDED}
          variant={game.options.variant}
        />
      </Trans>
    ) : (
      <Trans i18nKey="somebodyDiscardedTurn">
        {playerNameFrom} discarded their
        <TurnCard
          card={turn.action.card}
          colorBlindMode={game.options.colorBlindMode}
          context={ICardContext.DISCARDED}
          variant={game.options.variant}
        />
      </Trans>
    );

    if (showPosition) {
      textualTurn = (
        <>
          {textualTurn}
          <CardPosition action={turn.action} />
        </>
      );
    }
  } else if (isPlayAction(turn.action) && turn.action.card) {
    textualTurn = isViewingOwnActions ? (
      turn.failed ? (
        <Trans i18nKey="youPlayedStrikeTurn">
          You caused a <span className="txt-strike">strike</span> playing
          <TurnCard
            card={turn.action.card}
            colorBlindMode={game.options.colorBlindMode}
            context={ICardContext.PLAYED}
            variant={game.options.variant}
          />
        </Trans>
      ) : (
        <Trans i18nKey="youPlayedTurn">
          You played
          <TurnCard
            card={turn.action.card}
            colorBlindMode={game.options.colorBlindMode}
            context={ICardContext.PLAYED}
            variant={game.options.variant}
          />
        </Trans>
      )
    ) : turn.failed ? (
      <Trans i18nKey="somebodyPlayedStrikeTurn">
        {playerNameFrom} caused a <span className="txt-strike">strike</span> playing
        <TurnCard
          card={turn.action.card}
          colorBlindMode={game.options.colorBlindMode}
          context={ICardContext.PLAYED}
          variant={game.options.variant}
        />
      </Trans>
    ) : (
      <Trans i18nKey="somebodyPlayedTurn">
        {playerNameFrom} played
        <TurnCard
          card={turn.action.card}
          colorBlindMode={game.options.colorBlindMode}
          context={ICardContext.PLAYED}
          variant={game.options.variant}
        />
      </Trans>
    );

    if (showPosition) {
      textualTurn = (
        <>
          {textualTurn}
          <CardPosition action={turn.action} />
        </>
      );
    }
  }

  if (showDrawn && turn.card) {
    drawnTurn = (
      <Trans i18nKey={isViewingOwnActions ? "whatYouDrewTurn" : "whatTheyDrewTurn"}>
        and drew
        <DrawnCard card={turn.card} colorBlindMode={game.options.colorBlindMode} variant={game.options.variant} />
      </Trans>
    );
  }

  return (
    <div className="dib">
      {props.turnNumber ? (
        <Txt className={classnames("di gray")} size={TxtSize.XSMALL}>
          {props.turnNumber}
        </Txt>
      ) : (
        ""
      )}
      <span>&nbsp;</span>
      <Txt className="di">
        {/* The player action and the card they have drawn, if applicable */}
        {props.turnNumber !== undefined && <ReviewCommentPopover showAlways={false} turnNumber={props.turnNumber} />}
        &nbsp;
        {textualTurn}
        {drawnTurn}
      </Txt>
    </div>
  );
}

const TurnCard = ({
  card,
  context,
  variant,
  colorBlindMode,
}: {
  card: ICard;
  context: ICardContext;
  variant: GameVariant;
  colorBlindMode: boolean;
}) => (
  <span className="dib">
    <Card
      card={card}
      className="mr1"
      colorBlindMode={colorBlindMode}
      context={context}
      hintsLevel={IGameHintsLevel.NONE}
      size={CardSize.XSMALL}
      variant={variant}
    />
  </span>
);

const HintValue = ({ action }: { action: IHintAction }) => (
  <span className="dib">
    <Hint className="mr1" hint={IHintLevel.POSSIBLE} type={action.type} value={action.value} />
  </span>
);

const CardPosition = ({ action }: { action: IDiscardAction | IPlayAction | IHintAction }) =>
  action.action === "hint" ? (
    <Txt
      className="gray mr1"
      size={TxtSize.XSMALL}
      value={`${(action?.cardsIndex ?? []).map((index) => PositionMap[index]).join(", ")}`}
    />
  ) : (
    <Txt className="gray mr1" size={TxtSize.XSMALL} value={`${PositionMap[action.cardIndex]}`} />
  );

const DrawnCard = ({
  card,
  variant,
  colorBlindMode,
}: {
  card: ICard;
  variant: GameVariant;
  colorBlindMode: boolean;
}) => (
  <span className="dib">
    <Card
      card={card}
      className="mr1"
      colorBlindMode={colorBlindMode}
      context={ICardContext.DRAWN}
      hintsLevel={IGameHintsLevel.NONE}
      size={CardSize.XSMALL}
      variant={variant}
    />
  </span>
);
