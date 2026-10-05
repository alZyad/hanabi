import React from "react";
import MessagesSectionDesktop from "~/components/messagesSection.desktop";
import MessagesSectionMobile from "~/components/messagesSection.mobile";
import { useMediaQuery } from "~/hooks/mediaQuery";

export interface MessagesSectionProps {
  interturn: boolean;
  onReplay: () => void;
  onStopReplay: () => void;
}

function MessagesSection(props: MessagesSectionProps) {
  const isDesktop = useMediaQuery("(min-width: 650px)");

  return isDesktop ? <MessagesSectionDesktop {...props} /> : <MessagesSectionMobile {...props} />;
}

// Memoized so that toggling a hand (local state in <Game>) does not re-render the whole history.
export default React.memo(MessagesSection);
