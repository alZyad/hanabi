import React, { ReactElement } from "react";
import { ArrowContainer, Popover, PopoverPosition } from "react-tiny-popover";
import Txt, { TxtSize } from "~/components/ui/txt";
import { POPOVER_ARROW_COLOR, POPOVER_CONTENT_STYLE } from "~/components/popoverAppearance";

interface Props {
  isOpen: boolean;
  title: string;
  body: string;
  positions?: PopoverPosition[];
  onDismiss?: () => void;
  children: ReactElement;
}

export default function CardNotesOnboarding(props: Props) {
  const { isOpen, title, body, positions = ["top"], onDismiss, children } = props;

  if (!isOpen) return children;

  return (
    <Popover
      containerClassName="z-999"
      content={({ position, childRect, popoverRect }) => (
        <ArrowContainer
          arrowColor={POPOVER_ARROW_COLOR}
          arrowSize={10}
          arrowStyle={{ opacity: 1 }}
          childRect={childRect}
          popoverRect={popoverRect}
          position={position}
        >
          <div
            className="relative flex flex-column ba bw1 bg-white pa2 pa3-l pr1 pr2-l pv1 pv2-l br2 main-dark"
            style={POPOVER_CONTENT_STYLE}
          >
            {onDismiss && (
              <a className="absolute top-0 left-0 mt1 ml2 pointer" onClick={onDismiss}>
                <Txt value="×" />
              </a>
            )}
            <Txt className="ttu ml3" size={TxtSize.MEDIUM} value={title} />
            <div className="flex flex-column mt1 mt2-l">
              <Txt multiline className="ml4" value={body} />
            </div>
          </div>
        </ArrowContainer>
      )}
      isOpen={isOpen}
      positions={positions}
    >
      {children}
    </Popover>
  );
}
