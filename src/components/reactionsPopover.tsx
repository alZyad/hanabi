import React, { CSSProperties } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";

const ClearReaction = "⊘";
const Reactions = [
  ["👍", "👏", "🤩", "❤️", "😻", "🎉", "🥳", "🔥", "💃"],
  ["🤔", "👀", "🙏", "😅", "🫣", "😬", "😱", "🤯", "🫠"],
  ["🤦", "😭", "👎", "♻️", "🙃", "💅", "❓", "😂", "🤭"],
];

interface Props {
  onReaction: (reaction: string) => void;
  onClose: () => void;
  style?: CSSProperties;
}

export default function ReactionsPopover(props: Props) {
  const { onReaction, onClose } = props;

  const game = useGame();
  const selfPlayer = useSelfPlayer(game);

  return (
    <div
      className="flex flex-column items-center justify-center ba bw1 bg-white pa2 pt3 pr3 br2 gray"
      style={props.style}
    >
      {Reactions.map((row, rowIndex) => (
        <div key={rowIndex} className="flex items-center justify-center">
          {row.map((reaction, i) => (
            <a
              key={i}
              className="mh1 pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onReaction(null);
                setTimeout(() => {
                  onReaction(reaction);
                });
              }}
            >
              <Txt size={TxtSize.MEDIUM} value={reaction} />
            </a>
          ))}
        </div>
      ))}
      {selfPlayer.reaction && (
        <a
          className="mt2 pointer"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onReaction(null);
          }}
        >
          <Txt size={TxtSize.MEDIUM} value={ClearReaction} />
        </a>
      )}
    </div>
  );
}
