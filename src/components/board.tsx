import React from "react";
import { useTranslation } from "react-i18next";
import { CardWrapper } from "~/components/card";
import PlayedCards from "~/components/playedCards";
import TokenSpace from "~/components/tokenSpace";
import Txt, { TxtSize } from "~/components/ui/txt";
import { GameVariant, ICard } from "~/lib/state";

export function DeckPile(props: { count: number }) {
  const { count } = props;
  const { t } = useTranslation();
  const low = count <= 5;

  return (
    <div className="mr2 relative flex flex-column items-center">
      <CardWrapper color={low ? "strikes" : "main"} colorBlindMode={false}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="absolute" style={{ top: `-${i / 2}px` }}>
            <CardWrapper color={low ? "strikes" : "main"} colorBlindMode={false}>
              <Txt className="outline-main-dark" size={TxtSize.MEDIUM} value={i + 1} />
            </CardWrapper>
          </div>
        ))}
      </CardWrapper>
      {low ? (
        <Txt className="red mt1" value={t("cardLeft", { pileLength: count })} />
      ) : (
        <Txt className="gray mt1" value={t("deck")} />
      )}
    </div>
  );
}

interface Props {
  playedCards: ICard[];
  deckCount: number;
  hints: number;
  strikes: number;
  variant: GameVariant;
  colorBlindMode: boolean;
}

export default function Board(props: Props) {
  const { playedCards, deckCount, hints, strikes, variant, colorBlindMode } = props;
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-end justify-between">
      <div className="flex flex-column mb3">
        <PlayedCards cards={playedCards} colorBlindMode={colorBlindMode} variant={variant} />
      </div>
      <div className="flex flex-row mt2 justify-right items-end ml2">
        <DeckPile count={deckCount} />
        <div className="tc">
          <TokenSpace hints={hints} strikes={strikes} />
          <Txt className="gray mt1" value={t("tokens")} />
        </div>
      </div>
    </div>
  );
}
