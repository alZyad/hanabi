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
  showPossibilities: boolean;
}

interface ChipProps {
  kind: IHintType;
  value: IColor | INumber;
  eliminated: boolean;
  colorBlindMode: boolean;
}

function HintChip(props: ChipProps) {
  const { kind, value, eliminated, colorBlindMode } = props;
  const bgColor = value === IColor.RAINBOW ? "rainbow-circle" : value;

  return (
    <div
      className={classnames("pf-chip relative flex items-center justify-center br-100 outline-main-dark", {
        "o-30": eliminated,
        [`bg-${bgColor}`]: kind === "color",
        "bg-white-20 ba b--white-40": kind === "number",
      })}
    >
      {kind === "number" && <Txt className="white b" size={TxtSize.XXSMALL} value={value} />}
      {kind === "color" && colorBlindMode && <ColorSymbol color={value as IColor} scale={1} />}
      {eliminated && <div className="absolute w-100 o-80 rotate-135 bg-white" style={{ height: "1px" }} />}
    </div>
  );
}

interface GroupProps {
  kind: IHintType;
  remaining: (IColor | INumber)[];
  eliminated: (IColor | INumber)[];
  colorBlindMode: boolean;
}

function HintGroup(props: GroupProps) {
  const { kind, remaining, eliminated, colorBlindMode } = props;

  if (eliminated.length === 0) return null;

  const showRemaining = eliminated.length >= 2;
  const values = showRemaining ? remaining : eliminated;

  return (
    <div className="pf-group">
      {values.map((value) => (
        <HintChip key={value} colorBlindMode={colorBlindMode} eliminated={!showRemaining} kind={kind} value={value} />
      ))}
    </div>
  );
}

function PersonalHint(props: Props) {
  const { card, gameId, variant, colorBlindMode, showPossibilities } = props;

  const { isOff } = useCardNotes(gameId);

  const cardId = card.id;
  const hint = card.hint;
  if (cardId === undefined || !hint) return null;

  const isColorOut = (color: IColor) => hint.color[color] === IHintLevel.IMPOSSIBLE || isOff(cardId, "color", color);
  const isNumberOut = (number: INumber) =>
    hint.number[number] === IHintLevel.IMPOSSIBLE || isOff(cardId, "number", number);

  const colorRemaining = getColors(variant).filter((color) => !isColorOut(color));
  const colorEliminated = getColors(variant).filter(isColorOut);
  const numberRemaining = numbers.filter((number) => !isNumberOut(number));
  const numberEliminated = numbers.filter(isNumberOut);

  if (colorRemaining.length === 1 && numberRemaining.length === 1) {
    const [color] = colorRemaining;
    const [number] = numberRemaining;
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

  if (!showPossibilities) return null;

  if (colorEliminated.length === 0 && numberEliminated.length === 0) return null;

  return (
    <div className="pf-panel mt1">
      <HintGroup colorBlindMode={colorBlindMode} eliminated={colorEliminated} kind="color" remaining={colorRemaining} />
      <HintGroup
        colorBlindMode={colorBlindMode}
        eliminated={numberEliminated}
        kind="number"
        remaining={numberRemaining}
      />
    </div>
  );
}

export default React.memo(PersonalHint);
