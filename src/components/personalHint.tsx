import classnames from "classnames";
import React from "react";
import ColorSymbol from "~/components/colorSymbol";
import Txt from "~/components/ui/txt";
import { useCardNotes } from "~/hooks/cardNotes";
import { getColors, numbers } from "~/lib/actions";
import { GameVariant, ICard, IColor, IHintLevel } from "~/lib/state";

interface Props {
  card: ICard;
  gameId: string;
  variant: GameVariant;
  colorBlindMode: boolean;
}

function PersonalHint(props: Props) {
  const { card, gameId, variant, colorBlindMode } = props;

  const { isOff } = useCardNotes(gameId);

  const cardId = card.id;
  const hint = card.hint;
  if (cardId === undefined || !hint) return null;

  const possibleColors = getColors(variant).filter(
    (color) => hint.color[color] !== IHintLevel.IMPOSSIBLE && !isOff(cardId, "color", color)
  );
  const possibleNumbers = numbers.filter(
    (number) => hint.number[number] !== IHintLevel.IMPOSSIBLE && !isOff(cardId, "number", number)
  );

  if (possibleColors.length !== 1 || possibleNumbers.length !== 1) return null;

  const [color] = possibleColors;
  const [number] = possibleNumbers;
  if (color === undefined || number === undefined) return null;

  const bgColor = color === IColor.RAINBOW ? "rainbow-circle" : color;

  return (
    <div className="flex justify-center mt1">
      <div className="relative h2 w2 h2.5-l w2.5-l flex justify-center items-center">
        {colorBlindMode && <ColorSymbol boxed color={color} scale={1} />}
        <div
          className={classnames("card-hint-circle br-100 flex justify-center items-center", `txt-${color}-dark`, {
            [`bg-${bgColor} ba b--${color}`]: !colorBlindMode,
          })}
          style={colorBlindMode ? { transform: "translateY(2px)" } : undefined}
        >
          <Txt className="z-1" value={number} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(PersonalHint);
