import React, { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useMessages } from "~/hooks/messages";
import { addMessage } from "~/lib/firebase";
import { logFailedPromise } from "~/lib/errors";
import { uniqueId } from "~/lib/id";
import { ILobbyState, IMinimalPlayer } from "~/lib/state";

interface Props {
  lobby: ILobbyState;
  selfPlayer?: IMinimalPlayer;
}

export default function LobbyChat(props: Props) {
  const { lobby, selfPlayer } = props;
  const { t } = useTranslation();
  const { messages } = useMessages(lobby.id);
  const [message, setMessage] = useState("");

  const canSend = selfPlayer?.index !== undefined;
  const reversed = [...messages].reverse();

  function onSubmit() {
    if (selfPlayer?.index === undefined) return;
    if (!message.trim()) return;

    addMessage(lobby.id, {
      id: uniqueId(),
      content: message,
      from: selfPlayer.index,
      turn: 0,
      sentAt: Date.now(),
    }).catch(logFailedPromise);

    setMessage("");
  }

  return (
    <div className="flex flex-column">
      <Txt className="mb2 ttu txt-yellow" size={TxtSize.SMALL} value={t("chat")} />

      {canSend && (
        <form
          className="flex items-center mb2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            className="flex-grow-1 mr2 pa2 br2 bn f6 bg-white gray"
            placeholder={t("sendMessagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button disabled={!message.trim()} size={ButtonSize.SMALL} text={t("sendMessage")} type="submit" />
        </form>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: "8.5rem" }}>
        {reversed.length === 0 && <Txt className="gray" size={TxtSize.SMALL} value={t("noMessagesYet")} />}
        {reversed.map((msg) => {
          const player = lobby.players[msg.from];

          return (
            <div key={msg.id} className="lavender mb1">
              <Trans i18nKey="message">
                <Txt size={TxtSize.SMALL} value={player?.name} />
                <Txt className="white" size={TxtSize.SMALL} value={msg.content} />
              </Trans>
            </div>
          );
        })}
      </div>
    </div>
  );
}
