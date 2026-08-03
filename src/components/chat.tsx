import React from "react";
import { Trans, useTranslation } from "react-i18next";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame } from "~/hooks/game";
import { useMessages } from "~/hooks/messages";
import { IMessage } from "~/lib/state";

interface Props {
  dividerAfter?: number;
}

export default function Chat(props: Props) {
  const { dividerAfter } = props;
  const { t } = useTranslation();
  const game = useGame();
  const { messages } = useMessages(game.id);

  const reversed = [...messages].reverse();

  return (
    <div>
      {messages.length === 0 && <Txt className="gray" size={TxtSize.SMALL} value={t("noMessagesYet")} />}
      {reversed.map((message, i) => (
        <React.Fragment key={message.id}>
          <Message message={message} />
          {dividerAfter !== undefined && i === dividerAfter - 1 && i < reversed.length - 1 && (
            <div className="new-items-divider" />
          )}
        </React.Fragment>
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
      <Txt className="di gray" size={TxtSize.XSMALL}>
        {message.turn}
      </Txt>
      <span>&nbsp;</span>
      <Trans i18nKey="message">
        <Txt size={TxtSize.SMALL} value={player?.name} />
        <Txt className="white" size={TxtSize.SMALL} value={message.content} />
      </Trans>
    </div>
  );
}
