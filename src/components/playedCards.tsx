import { groupBy, last } from "lodash";
import React from "react";
import Card, { CardSize, CardWrapper, ICardContext } from "~/components/card";
import Tutorial, { ITutorialStep } from "~/components/tutorial";
import { useGame } from "~/hooks/game";
import { getColors } from "~/lib/actions";
import { GameVariant, ICard } from "~/lib/state";

interface Props {
  cards: ICard[];
  variant?: GameVariant;
}

export default function PlayedCards(props: Props) {
  const { cards, variant } = props;

  const game = useGame();
  const groupedCards = groupBy(cards, (c) => c.color);
  const colors = getColors(variant ?? game?.options?.variant);

  return (
    <Tutorial placement="bottom" step={ITutorialStep.PLAYED_CARDS}>
      <div className="flex flex-row mt1">
        {colors.map((color, i) => {
          const stack = groupedCards[color] ?? [];
          const topCard = last(stack);

          if (!topCard) {
            return <CardWrapper key={i} className="mr1" color={color} size={CardSize.MEDIUM} />;
          }
          return (
            <CardWrapper key={i} className="mr1 relative" color={color} size={CardSize.MEDIUM}>
              {stack.map((card, i) => (
                <Card
                  key={i}
                  card={card}
                  className="absolute"
                  context={ICardContext.PLAYED}
                  size={CardSize.MEDIUM}
                  style={{
                    top: `-${i * 2}px`,
                  }}
                />
              ))}
            </CardWrapper>
          );
        })}
      </div>
    </Tutorial>
  );
}
