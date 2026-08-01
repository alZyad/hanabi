import classnames from "classnames";
import React from "react";
import ColorSymbol from "~/components/colorSymbol";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useCardNotes } from "~/hooks/cardNotes";
import { getColors, numbers } from "~/lib/actions";
import { GameVariant, ICard, IColor, IHintLevel, IHintType, INumber } from "~/lib/state";

interface Props {
  card: ICard;
  gameId: string;
  variant: GameVariant;
  colorBlindMode: boolean;
}

interface ChipProps {
  card: ICard;
  kind: IHintType;
  value: IColor | INumber;
  gameId: string;
  colorBlindMode: boolean;
}

function Chip(props: ChipProps) {
  const { card, kind, value, gameId, colorBlindMode } = props;

  const { isOff, toggle } = useCardNotes(gameId);

  const level = kind === "color" ? card.hint?.color[value] : card.hint?.number[value];
  const impossible = level === IHintLevel.IMPOSSIBLE;
  const sure = level === IHintLevel.SURE;
  const toggleable = level === IHintLevel.POSSIBLE;
  const off = toggleable && card.id !== undefined && isOff(card.id, kind, value);
  const dimmed = impossible || off;

  return (
    <div
      className={classnames("ph-chip relative flex items-center justify-center br-100 outline-main-dark", {
        "pointer": toggleable,
        "o-30": dimmed,
        "ba b--white": sure,
        [`bg-${value}`]: kind === "color",
        "bg-white-20 ba b--white-40": kind === "number",
      })}
      onClick={() => toggleable && card.id !== undefined && toggle(card.id, kind, value)}
    >
      {kind === "number" && <Txt className="white b" size={TxtSize.XXSMALL} value={value} />}
      {kind === "color" && colorBlindMode && <ColorSymbol color={value as IColor} />}
      {dimmed && <div className="absolute w-100 o-80 rotate-135 bg-white" style={{ height: "1px" }} />}
    </div>
  );
}

function CardNotesArea(props: Props) {
  const { card, gameId, variant, colorBlindMode } = props;

  const colors = getColors(variant);

  return (
    <div className="w-card-large flex flex-column items-center bg-black-30 br1 pv1 ph0.5 mt1 br1">
      <div className="ph-row">
        {colors.map((color) => (
          <Chip key={color} card={card} colorBlindMode={colorBlindMode} gameId={gameId} kind="color" value={color} />
        ))}
      </div>
      <div className="ph-row">
        {numbers.map((number) => (
          <Chip key={number} card={card} colorBlindMode={colorBlindMode} gameId={gameId} kind="number" value={number} />
        ))}
      </div>
    </div>
  );
}

export default React.memo(CardNotesArea);
