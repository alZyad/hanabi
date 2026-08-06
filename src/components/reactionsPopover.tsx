import React, { CSSProperties } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";

const ClearReaction = "⊘";
const Reactions = [
  ["👍", "👏", "🤩", "❤️", "😻", "🎉", "🥳", "🔥", "💃"],
  ["🤔", "👀", "🙏", "😅", "🫣", "😬", "😱", "🤯", "🫠"],
  ["🤦", "😭", "👎", "♻️", "🙃", "💅", "❓", "😂", "🤭"],
];

interface Props {
  onReaction: (reaction: string | null) => void;
  onClose: () => void;
  hasReaction?: boolean;
  style?: CSSProperties;
}

export default function ReactionsPopover(props: Props) {
  const { onReaction, onClose, hasReaction } = props;

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
      {hasReaction && (
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
