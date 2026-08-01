import { groupBy, last } from "lodash";
import React from "react";
import Card, { CardSize, CardWrapper, ICardContext } from "~/components/card";
import Tutorial, { ITutorialStep } from "~/components/tutorial";
import { getColors } from "~/lib/actions";
import { GameVariant, IGameHintsLevel, ICard } from "~/lib/state";

interface Props {
  cards: ICard[];
  variant: GameVariant;
  colorBlindMode: boolean;
}

export default function PlayedCards(props: Props) {
  const { cards, variant, colorBlindMode } = props;

  const groupedCards = groupBy(cards, (c) => c.color);
  const colors = getColors(variant);

  return (
    <Tutorial placement="bottom" step={ITutorialStep.PLAYED_CARDS}>
      <div className="flex flex-row mt1">
        {colors.map((color, i) => {
          const stack = groupedCards[color] ?? [];
          const topCard = last(stack);

          if (!topCard) {
            return (
              <CardWrapper
                key={i}
                className="mr1"
                color={color}
                colorBlindMode={colorBlindMode}
                size={CardSize.MEDIUM}
              />
            );
          }
          return (
            <CardWrapper
              key={i}
              className="mr1 relative"
              color={color}
              colorBlindMode={colorBlindMode}
              size={CardSize.MEDIUM}
            >
              {stack.map((card, i) => (
                <Card
                  key={card.id ?? i}
                  card={card}
                  className="absolute card-land"
                  colorBlindMode={colorBlindMode}
                  context={ICardContext.PLAYED}
                  hintsLevel={IGameHintsLevel.NONE}
                  size={CardSize.MEDIUM}
                  style={{
                    top: `-${i * 2}px`,
                  }}
                  variant={variant}
                />
              ))}
            </CardWrapper>
          );
        })}
      </div>
    </Tutorial>
  );
}
