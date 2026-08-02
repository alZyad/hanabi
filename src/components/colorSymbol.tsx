import { SvgImage } from "~/components/ui/svgImage";
import { IColor } from "~/lib/state";

export const ColorsToSymbols = {
  [IColor.RED]: require("~/images/symbols/heart.svg"),
  [IColor.GREEN]: require("~/images/symbols/clove.svg"),
  [IColor.BLUE]: require("~/images/symbols/spade.svg"),
  [IColor.WHITE]: require("~/images/symbols/diamond.svg"),
  [IColor.YELLOW]: require("~/images/symbols/star.svg"),
  [IColor.ORANGE]: require("~/images/symbols/cloud.svg"),
  [IColor.MULTICOLOR]: require("~/images/symbols/wheel.svg"),
  [IColor.RAINBOW]: require("~/images/symbols/rainbow.svg"),
};

interface Props {
  color: IColor;
  scale?: number;
  boxed?: boolean;
}

export default function ColorSymbol(props: Props) {
  const { color, scale = 1.4, boxed = false } = props;

  const svg = ColorsToSymbols[color];

  if (!svg) {
    return null;
  }

  if (boxed) {
    return (
      <div className="absolute w-100 h-100 flex justify-center items-center">
        <div className="card-symbol-box flex justify-center items-center" style={{ transform: `scale(${scale})` }}>
          <SvgImage svg={svg} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute w-100 h-100 flex justify-center items-center" style={{ transform: `scale(${scale})` }}>
      <SvgImage svg={svg} />
    </div>
  );
}
