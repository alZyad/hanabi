import classnames from "classnames";
import React, { CSSProperties, HTMLAttributes, MouseEventHandler, ReactNode, useState } from "react";
import ColorSymbol from "~/components/colorSymbol";
import { ReceivedHints } from "~/components/receivedHintsPopover";
import Txt, { TxtSize } from "~/components/ui/txt";
import useLongPress from "~/hooks/longPress";
import { getColors, numbers } from "~/lib/actions";
import { GameVariant, ICard, ICardHint, IColor, IGameHintsLevel, IHintLevel, IHintType, INumber } from "~/lib/state";

export enum CardSize {
  XSMALL = "xsmall",
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  FLEX = "flex",
}

const CardClasses = {
  [CardSize.XSMALL]: "h1.25 w1.25 h2-l w2-l",
  [CardSize.SMALL]: "h1.5 w1.5",
  [CardSize.MEDIUM]: "h2 w2 h2.5-l w2.5-l",
  [CardSize.LARGE]: "card-large",
  [CardSize.FLEX]: "flex-square",
};

const CardTextSizes = {
  [CardSize.XSMALL]: TxtSize.XSMALL,
  [CardSize.SMALL]: TxtSize.SMALL,
  [CardSize.MEDIUM]: TxtSize.MEDIUM,
  [CardSize.LARGE]: TxtSize.MEDIUM,
};

export const PositionMap = {
  0: "A",
  1: "B",
  2: "C",
  3: "D",
  4: "E",
};

export enum ICardContext {
  SELF_PLAYER,
  OTHER_PLAYER,
  TARGETED_PLAYER,
  PLAYED,
  DISCARDED,
  DRAWN,
  OTHER,
}

interface CardWrapperProps extends HTMLAttributes<HTMLElement> {
  color: string;
  colorBlindMode: boolean;
  size?: CardSize;
  playable?: boolean;
  context?: ICardContext;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler;
  children?: ReactNode;
}

export function CardWrapper(props: CardWrapperProps) {
  const {
    color,
    colorBlindMode,
    size = CardSize.MEDIUM,
    playable = false,
    context,
    className = "",
    style = {},
    onClick,
    children,
    ...attributes
  } = props;

  const sizeClass = CardClasses[size];

  return (
    <div
      className={classnames(
        "relative flex items-center justify-center br1 ba",
        sizeClass,
        className,
        `bg-${color}`,
        { "shadow-2": size.includes("large") },
        { "shadow-1": size.includes("medium") },
        { pointer: playable },
        { grow: context === ICardContext.TARGETED_PLAYER }
      )}
      style={style}
      onClick={onClick}
      {...attributes}
    >
      {colorBlindMode && <ColorSymbol color={color as IColor} />}
      {children}
    </div>
  );
}

interface CardPartialHintProps {
  card: ICard;
  size: CardSize;
  colorBlindMode: boolean;
}

/**
 * Players can't view their own cards.
 * However, we'll show them sure values/colors from their received hints when applicable.
 * - Sure numbers will be displayed
 * - Sure colors will be displayed
 * - Sure (including rainbow) colors will display a rainbow background and a colored border
 */
function CardPartialHint(props: CardPartialHintProps) {
  const { card, size, colorBlindMode } = props;

  const displayColorSymbol = colorBlindMode && card.hint?.color[card.color] === IHintLevel.SURE;
  let className = "";

  // when card is sure, apply a colored background and border using the card color
  if (card.hint?.color[card.color] === IHintLevel.SURE) {
    const color = card.color === IColor.RAINBOW ? `rainbow-circle` : card.color;

    className = classnames(`txt-${card.color}-dark`, {
      [`bg-${color} ba b--${card.color}`]: !displayColorSymbol,
    });
  }

  // when they are only 2 possible cards and one of them is rainbow,
  // apply a rainbow background and a thick border using the other possible color
  const possibleColors = Object.keys(card.hint?.color ?? {}).filter(
    (color) => card.hint?.color[color] === IHintLevel.POSSIBLE
  );
  if (card.hint?.color.rainbow === IHintLevel.POSSIBLE && possibleColors.length === 2) {
    const possibleColor = possibleColors.find((color) => color !== IColor.RAINBOW);

    className = classnames(`bg-rainbow-circle ba b--${possibleColor}-clear`, {
      "bw1.5": size !== CardSize.LARGE,
      "bw2": size === CardSize.LARGE,
    });
  }

  return (
    <>
      <div
        className={classnames("top-0 br-100 w-50 flex justify-center items-center", className, {
          [`txt-white-dark`]: card.hint?.color[card.color] !== IHintLevel.SURE,
        })}
        style={{ aspectRatio: "1" }}
      >
        {card.hint?.number[card.number] === IHintLevel.SURE && <Txt className="z-1" value={card.number} />}
      </div>
      {displayColorSymbol && <ColorSymbol color={card.color} />}
    </>
  );
}

interface FocusHintChipProps {
  kind: IHintType;
  value: IColor | INumber;
  level: IHintLevel;
  colorBlindMode: boolean;
}

function FocusHintChip(props: FocusHintChipProps) {
  const { kind, value, level, colorBlindMode } = props;

  const impossible = level === IHintLevel.IMPOSSIBLE;
  const sure = level === IHintLevel.SURE;
  const displaySymbol = colorBlindMode && kind === "color";

  return (
    <div
      className={classnames("fh-chip relative flex items-center justify-center outline-main-dark white", {
        "fh-chip--color": kind === "color",
        "fh-chip--number": kind === "number",
        "o-30": impossible,
        [`bg-${value}`]: kind === "color" && (!displaySymbol || sure),
        "bg-white-20": kind === "number",
        "ba b--white": sure,
        "ba b--white-40": kind === "number" && !sure,
      })}
    >
      {kind === "number" && <Txt className="b" size={TxtSize.XXSMALL} value={value} />}
      {displaySymbol && <ColorSymbol color={value as IColor} />}
      {impossible && <div className="absolute w-100 o-80 rotate-135 bg-white" style={{ height: "1px" }} />}
    </div>
  );
}

function FocusValueArea(props: { children: ReactNode }) {
  return <div className="fh-value-area absolute flex items-center justify-center">{props.children}</div>;
}

interface FocusHintPanelProps {
  variant: GameVariant;
  cardHint: ICardHint;
  colorBlindMode: boolean;
}

const FocusHintPanel = React.memo(function FocusHintPanel(props: FocusHintPanelProps) {
  const { variant, cardHint, colorBlindMode } = props;
  const colors = getColors(variant);

  return (
    <div className="fh-panel absolute left-0 right-0 bottom-0 flex flex-column items-center bg-black-60 br1">
      <div className="fh-row">
        {colors.map((color) => (
          <div key={color} className="fh-cell">
            <FocusHintChip colorBlindMode={colorBlindMode} kind="color" level={cardHint.color[color]} value={color} />
          </div>
        ))}
      </div>
      <div className="fh-row">
        {numbers.map((number) => (
          <div key={number} className="fh-cell fh-cell--number">
            <FocusHintChip
              colorBlindMode={colorBlindMode}
              kind="number"
              level={cardHint.number[number]}
              value={number}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

interface Props {
  card: ICard;
  context: ICardContext;
  variant: GameVariant;
  colorBlindMode: boolean;
  hintsLevel: IGameHintsLevel;
  hidden?: boolean;
  position?: number;
  selected?: boolean;
  playable?: boolean;
  size?: CardSize;
  className?: string;
  style?: CSSProperties;
  onSelectCard?: (position: number) => void;
  focusPanelReady?: boolean;
}

function Card(props: Props) {
  const {
    card,
    context,
    variant,
    colorBlindMode,
    hintsLevel,
    hidden = false,
    playable = true,
    size = CardSize.MEDIUM,
    className = "",
    style = {},
    position = null,
    selected = false,
    onSelectCard,
    focusPanelReady = true,
  } = props;

  const [allHintsPopoverIsOpen, setAllHintsPopoverIsOpen] = useState(false);

  const color = hidden ? "gray-light" : card.color;

  const number = hidden ? null : card.number;

  const valueClassName = classnames("b", { [`txt-${color}-dark`]: !colorBlindMode, "main-dark": colorBlindMode });

  const displayHints =
    hintsLevel !== IGameHintsLevel.NONE &&
    [ICardContext.OTHER_PLAYER, ICardContext.TARGETED_PLAYER, ICardContext.SELF_PLAYER].includes(context);

  const hints = card.receivedHints || [];
  const cardHint = card.hint;
  const longPressProps = useLongPress(() => {
    if (hints.length > 0) {
      setAllHintsPopoverIsOpen(true);
    }
  });
  return (
    <CardWrapper
      className={classnames({ "bw1 z-5": selected }, className)}
      color={color}
      colorBlindMode={colorBlindMode}
      context={context}
      data-card={position !== null ? PositionMap[position] : undefined}
      playable={playable}
      size={size}
      style={{
        ...style,
        ...(selected && { transform: "scale(1.20)" }),
        userSelect: "none",
      }}
      onClick={(e) => {
        if (allHintsPopoverIsOpen) {
          e.stopPropagation();
          return;
        }
        if (onSelectCard && position !== null) {
          e.stopPropagation();
          onSelectCard(position);
          return;
        }
      }}
      {...longPressProps}
    >
      {/* Card value */}
      {displayHints && size === CardSize.LARGE ? (
        <FocusValueArea>
          <Txt className={valueClassName} size={CardTextSizes[size]} value={number} />
        </FocusValueArea>
      ) : (
        <Txt className={classnames(valueClassName, "absolute")} size={CardTextSizes[size]} value={number} />
      )}

      {/* Card position */}
      {position !== null && size === CardSize.LARGE && (
        <Txt className="absolute left-0 top-0 ma1 black-40" value={PositionMap[position]} />
      )}

      {/* Whether the card has received hints */}
      {position !== null && (
        <ReceivedHints
          allHintsOpen={allHintsPopoverIsOpen}
          hints={hints}
          onActivationChange={function (shouldActivate: boolean) {
            return setAllHintsPopoverIsOpen(shouldActivate);
          }}
        />
      )}

      {/* show positive hints with a larger type */}
      {displayHints &&
        hidden &&
        (size === CardSize.LARGE ? (
          <FocusValueArea>
            <CardPartialHint card={card} colorBlindMode={colorBlindMode} size={size} />
          </FocusValueArea>
        ) : (
          <CardPartialHint card={card} colorBlindMode={colorBlindMode} size={size} />
        ))}

      {/* show other hints, including negative hints */}
      {displayHints && size === CardSize.LARGE && cardHint && focusPanelReady && (
        <FocusHintPanel cardHint={cardHint} colorBlindMode={colorBlindMode} variant={variant} />
      )}
    </CardWrapper>
  );
}

export default React.memo(Card);
