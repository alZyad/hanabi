import { isEqual } from "lodash";
import { useRef } from "react";
import { ICard } from "~/lib/state";

export function useStableCards(cards: ICard[]): ICard[] {
  const previous = useRef<ICard[]>([]);

  const stable = cards.map((card) => {
    const prior = card.id === undefined ? undefined : previous.current.find((c) => c.id === card.id);
    return prior && isEqual(prior, card) ? prior : card;
  });

  previous.current = stable;

  return stable;
}
