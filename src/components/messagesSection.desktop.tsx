import React from "react";
import Chat from "~/components/chat";
import DiscardColumn from "~/components/discardColumn";
import Logs from "~/components/logs";
import type { MessagesSectionProps } from "~/components/messagesSection";

export default function MessagesSectionDesktop(props: MessagesSectionProps) {
  const { interturn, onReplay, onStopReplay } = props;

  return (
    <div className="h4 pt0-l">
      <div className="flex justify-between h-100 pa1 pa2-l">
        <div className="flex flex-grow-1 h-100" style={{ minWidth: 0 }}>
          <div className="w-50 h-100 overflow-y-scroll pr3" style={{ minWidth: 0 }}>
            <Logs interturn={interturn} />
          </div>
          <div
            className="w-50 h-100 overflow-y-scroll pl3"
            style={{ minWidth: 0, borderLeft: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            <Chat />
          </div>
        </div>
        <DiscardColumn
          className="flex flex-column justify-between items-end"
          onReplay={onReplay}
          onStopReplay={onStopReplay}
        />
      </div>
    </div>
  );
}
