import classnames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Chat from "~/components/chat";
import Logs from "~/components/logs";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { useMessages } from "~/hooks/messages";

type Tab = "history" | "chat";

interface Props {
  interturn: boolean;
}

export default function MessagesTabs(props: Props) {
  const { interturn } = props;
  const { t } = useTranslation();
  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const { messages, loaded } = useMessages(game.id);

  const turnsCount = game.turnsHistory.length;
  const messagesCount = messages.length;

  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [seenTurns, setSeenTurns] = useState(turnsCount);
  const [seenMessages, setSeenMessages] = useState(0);
  const messagesBaselined = useRef(false);

  useEffect(() => {
    setSeenTurns(game.turnsHistory.length);
    setSeenMessages(0);
    messagesBaselined.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  useEffect(() => {
    if (activeTab === "history") setSeenTurns(turnsCount);
  }, [activeTab, turnsCount]);

  useEffect(() => {
    if (activeTab === "chat") {
      // While viewing the chat, everything is considered seen.
      setSeenMessages(messagesCount);
      messagesBaselined.current = true;
    } else if (!messagesBaselined.current && loaded) {
      // Snapshot the count once the initial messages have loaded, even if it is
      // zero. This way any message that arrives afterwards is counted as unread,
      // including the very first message of the game.
      setSeenMessages(messagesCount);
      messagesBaselined.current = true;
    }
  }, [activeTab, messagesCount, loaded]);

  const unreadHistory = Math.max(0, turnsCount - seenTurns);
  // Count only messages from other players: a message you sent yourself (via the
  // chat popover, which is available regardless of the active tab) should never
  // raise an unread badge on your own screen.
  const unreadChat = messages.slice(seenMessages).filter((message) => message.from !== selfPlayer?.index).length;

  return (
    <div className="flex flex-column flex-grow-1 h-100 mr2" style={{ minWidth: 0 }}>
      <div className="flex items-center" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <Tab
          active={activeTab === "history"}
          label={t("history")}
          unread={activeTab === "history" ? 0 : unreadHistory}
          onClick={() => setActiveTab("history")}
        />
        <Tab
          active={activeTab === "chat"}
          label={t("chat")}
          unread={activeTab === "chat" ? 0 : unreadChat}
          onClick={() => setActiveTab("chat")}
        />
      </div>

      <div className="flex-grow-1 overflow-y-scroll pt1">
        {activeTab === "history" ? <Logs interturn={interturn} /> : <Chat />}
      </div>
    </div>
  );
}

interface TabProps {
  label: string;
  active: boolean;
  unread: number;
  onClick: () => void;
}

function Tab(props: TabProps) {
  const { label, active, unread, onClick } = props;

  return (
    <button
      className={classnames(
        "flex items-center bg-transparent bn pointer outline-0 ttu tracked pv2 ph3",
        active ? "txt-yellow" : "lavender"
      )}
      style={{
        borderBottom: `2px solid ${active ? "var(--color-yellow)" : "transparent"}`,
        marginBottom: -1,
        transition: "color 150ms ease, border-color 150ms ease",
      }}
      type="button"
      onClick={onClick}
    >
      <Txt multiline={false} size={TxtSize.SMALL} value={label} />
      {unread > 0 && (
        <span
          key={unread}
          className="badge-pop br-pill bg-cta main-dark tc fw6 ml2"
          style={{ minWidth: 16, height: 16, lineHeight: "16px", fontSize: 10, padding: "0 4px" }}
        >
          {unread > 9 ? "+" : unread}
        </span>
      )}
    </button>
  );
}
