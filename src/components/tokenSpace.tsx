import classnames from "classnames";
import { range } from "lodash";
import React from "react";
import Tutorial, { ITutorialStep } from "~/components/tutorial";
import Txt, { TxtSize } from "~/components/ui/txt";
import { MaxHints } from "~/lib/actions";

interface TokenProps {
  color: string;
  amount: number;
}

/**
 * Retourne la couleur du halo (glow) à afficher autour des jetons d'indice,
 * en fonction du nombre d'indices restants. Retourne `undefined` s'il ne faut
 * afficher aucun halo (cas des valeurs intermédiaires).
 */
function hintGlowColor(amount: number): string | undefined {
  if (amount === MaxHints) return "#ffffff"; // blanc : au maximum d'indices
  if (amount === 1) return "#ed8936"; // orange : plus qu'un seul indice
  if (amount === 0) return "rgb(192, 21, 21)"; // rouge : plus aucun indice
  return undefined; // entre 2 et 7 : aucun halo
}

/**
 * Construit le style CSS du halo à partir d'une couleur.
 * On utilise `drop-shadow` (et non `box-shadow`) car ce filtre épouse la forme
 * ronde du jeton : plus d'effet de « carré » disgracieux. On empile deux ombres
 * pour obtenir un halo doux et lumineux.
 */
function glowStyle(glowColor: string | undefined) {
  if (!glowColor) return undefined;

  return { filter: `drop-shadow(0 0 2px ${glowColor}) drop-shadow(0 0 5px ${glowColor})` };
}

export function Token(props: TokenProps) {
  const { color, amount } = props;

  // Le halo ne concerne que les jetons d'indice ("hints"), pas les échecs.
  const glow = color === "hints" ? glowStyle(hintGlowColor(amount)) : undefined;

  if (!amount) {
    return (
      <Txt
        className={classnames(
          "ba flex items-center justify-center br-100 h1.5 w1.5 o-70 gray ba ml2",
          `bg-${color}`,
          `b--${color}`
        )}
        size={TxtSize.SMALL}
        style={glow}
        value={0}
      />
    );
  }

  return (
    <div className="relative h1.5 w1.5 ml2" style={glow}>
      {range(amount).map((i) => (
        <Txt
          key={i}
          className={classnames(
            "outline-main-dark absolute ba flex items-center justify-center br-100 h1.5 w1.5 ba mr2",
            `bg-${color}`,
            `b--${color}`
          )}
          size={TxtSize.SMALL}
          style={{
            top: `-${i * 3}px`,
          }}
          value={i + 1}
        />
      ))}
    </div>
  );
}

interface Props {
  hints: number;
  strikes: number;
}

export default function TokenSpace(props: Props) {
  const { hints, strikes } = props;

  return (
    <div className="flex nl2">
      <Tutorial placement="bottom" step={ITutorialStep.HINT_TOKENS}>
        <Token amount={hints} color="hints" />
      </Tutorial>
      <Tutorial placement="bottom" step={ITutorialStep.STRIKE_TOKENS}>
        <Token amount={strikes} color="strikes" />
      </Tutorial>
    </div>
  );
}
