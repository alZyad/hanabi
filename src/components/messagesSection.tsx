import React from "react";
import MessagesSectionDesktop from "~/components/messagesSection.desktop";
import MessagesSectionMobile from "~/components/messagesSection.mobile";
import { useMediaQuery } from "~/hooks/mediaQuery";

export interface MessagesSectionProps {
  interturn: boolean;
  onReplay: () => void;
  onStopReplay: () => void;
}

export default function MessagesSection(props: MessagesSectionProps) {
  const isDesktop = useMediaQuery("(min-width: 650px)");

  return isDesktop ? <MessagesSectionDesktop {...props} /> : <MessagesSectionMobile {...props} />;
}
