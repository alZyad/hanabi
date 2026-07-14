import classnames from "classnames";
import React from "react";
import ColorSymbol from "~/components/colorSymbol";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useColorBlindMode, useGame } from "~/hooks/game";
import { useCardNotes } from "~/hooks/cardNotes";
import { getColors, numbers } from "~/lib/actions";
import { ICard, IColor, IHintLevel, IHintType, INumber } from "~/lib/state";

interface Props {
  card: ICard;
}

interface ChipProps {
  card: ICard;
  kind: IHintType;
  value: IColor | INumber;
}

function Chip(props: ChipProps) {
  const { card, kind, value } = props;

  const game = useGame();
  const colorBlindMode = useColorBlindMode();
  const { isOff, toggle } = useCardNotes(game.id);

  const level = kind === "color" ? card.hint.color[value] : card.hint.number[value];
  const impossible = level === IHintLevel.IMPOSSIBLE;
  const sure = level === IHintLevel.SURE;
  const toggleable = level === IHintLevel.POSSIBLE;
  const off = toggleable && isOff(card.id, kind, value);
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
      onClick={() => toggleable && toggle(card.id, kind, value)}
    >
      {kind === "number" && <Txt className="white b" size={TxtSize.XSMALL} value={value} />}
      {kind === "color" && colorBlindMode && <ColorSymbol color={value as IColor} />}
      {dimmed && <div className="absolute w-100 o-80 rotate-135 bg-white" style={{ height: "1px" }} />}
    </div>
  );
}

export default function CardNotesArea(props: Props) {
  const { card } = props;

  const game = useGame();
  const colors = getColors(game.options.variant);

  return (
    <div className="w3 w3.5-l flex flex-column items-center bg-black-30 br1 pa1 mt1 br1">
      <div className="ph-row ph-row-colors">
        {colors.map((color) => (
          <Chip key={color} card={card} kind="color" value={color} />
        ))}
      </div>
      <div className="ph-row">
        {numbers.map((number) => (
          <Chip key={number} card={card} kind="number" value={number} />
        ))}
      </div>
      <style global jsx>{`
        .ph-row {
          display: flex;
          width: 100%;
        }
        .ph-row-colors {
          flex-wrap: wrap;
          justify-content: center;
        }
        .ph-row-colors .ph-chip {
          flex: 0 0 calc(27%);
        }
        .ph-chip {
          flex: 1 1 0;
          aspect-ratio: 1 / 1;
          margin: 1px;
        }
      `}</style>
    </div>
  );
}
