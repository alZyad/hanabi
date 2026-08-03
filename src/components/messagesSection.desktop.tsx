import React from "react";
import DiscardColumn from "~/components/discardColumn";
import MessagesLog from "~/components/messagesLog";
import type { MessagesSectionProps } from "~/components/messagesSection";

export default function MessagesSectionDesktop(props: MessagesSectionProps) {
  const { interturn, onReplay, onStopReplay } = props;

  return (
    <div className="h4 pt0-l overflow-y-scroll">
      <div className="flex justify-between h-100 pa1 pa2-l">
        <MessagesLog interturn={interturn} />
        <DiscardColumn
          className="flex flex-column justify-between items-end"
          onReplay={onReplay}
          onStopReplay={onStopReplay}
        />
      </div>
    </div>
  );
}
