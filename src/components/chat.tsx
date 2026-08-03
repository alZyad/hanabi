import React from "react";
import { Trans, useTranslation } from "react-i18next";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame } from "~/hooks/game";
import { useMessages } from "~/hooks/messages";
import { IMessage } from "~/lib/state";

export default function Chat() {
  const { t } = useTranslation();
  const game = useGame();
  const { messages } = useMessages(game.id);

  return (
    <div>
      {messages.length === 0 && <Txt className="gray" size={TxtSize.SMALL} value={t("noMessagesYet")} />}
      {[...messages].reverse().map((message) => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  );
}

interface MessageProps {
  message: IMessage;
}

function Message(props: MessageProps) {
  const { message } = props;

  const game = useGame();
  const player = game.players[message.from];

  return (
    <div className="lavender">
      <Trans i18nKey="message">
        <Txt size={TxtSize.SMALL} value={player?.name} />
        <Txt className="white" size={TxtSize.SMALL} value={message.content} />
      </Trans>
    </div>
  );
}
