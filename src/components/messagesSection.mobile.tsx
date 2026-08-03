import React from "react";
import DiscardColumn from "~/components/discardColumn";
import MessagesTabs from "~/components/messagesTabs";
import type { MessagesSectionProps } from "~/components/messagesSection";

export default function MessagesSectionMobile(props: MessagesSectionProps) {
  const { interturn, onReplay, onStopReplay } = props;

  return (
    <div className="pt0-l">
      <div className="flex justify-between pl1 pl2-l" style={{ height: "10rem" }}>
        <MessagesTabs interturn={interturn} />
        <DiscardColumn
          className="flex flex-column justify-between items-end flex-shrink-0 pt3 ph1 pb1 ph2-l pb2-l"
          onReplay={onReplay}
          onStopReplay={onStopReplay}
        />
      </div>
    </div>
  );
}
