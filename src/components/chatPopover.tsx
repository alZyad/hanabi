import React, { CSSProperties, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Button, { ButtonSize } from "~/components/ui/button";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { addMessage } from "~/lib/firebase";
import { uniqueId } from "~/lib/id";
import { logFailedPromise } from "~/lib/errors";

interface Props {
  onClose: () => void;
  message: string;
  onMessageChange: (message: string) => void;
  style: CSSProperties;
}

export default function ChatPopover(props: Props) {
  const { onClose, message, onMessageChange } = props;

  const { t } = useTranslation();
  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = messageRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [messageRef]);

  function onSubmit() {
    if (selfPlayer?.index === undefined) return;
    if (!message.trim()) return;

    addMessage(game.id, {
      id: uniqueId(),
      content: message,
      from: selfPlayer.index,
      turn: game.turnsHistory.length,
      sentAt: Date.now(),
    }).catch(logFailedPromise);

    onMessageChange("");
    onClose();
  }

  function onClear() {
    onMessageChange("");
    messageRef.current?.focus();
  }

  return (
    <form
      className="flex flex-column items-center justify-center ba bw1 bg-white pa1 br2 gray"
      style={props.style}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <textarea
        ref={messageRef}
        className="bw0 f6 w5 pa2 br2"
        placeholder={t("sendMessagePlaceholder")}
        rows={4}
        value={message}
        onChange={(e) => {
          onMessageChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.keyCode === 13 /* enter */ && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="mt1 w-100 flex items-center justify-end">
        {message.length > 0 && (
          <button
            className="bn bg-transparent pa0 mr-auto gray pointer underline-hover"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <Txt size={TxtSize.SMALL} value={t("clearMessage")} />
          </button>
        )}
        <Button size={ButtonSize.SMALL} text={t("sendMessage")} type="submit" />
      </div>
    </form>
  );
}
