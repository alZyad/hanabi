import React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/ui/button";
import { Modal } from "~/components/ui/modal";
import Txt, { TxtSize } from "~/components/ui/txt";

interface Props {
  configuredCount: number;
  joinedCount: number;
  onClose: () => void;
  onFillWithBotsAndStart: () => void;
  onConfirm: () => void;
}

export default function AdjustPlayersModal(props: Props) {
  const { configuredCount, joinedCount, onClose, onFillWithBotsAndStart, onConfirm } = props;
  const { t } = useTranslation();

  const canFillWithBots = joinedCount < configuredCount;

  return (
    <Modal isOpen onRequestClose={onClose}>
      <div className="flex flex-column pa3" style={{ maxWidth: "22rem" }}>
        <Txt className="mb2" size={TxtSize.MEDIUM} value={t("adjustPlayersTitle")} />
        <Txt
          className="mb2 lavender"
          value={t(canFillWithBots ? "adjustPlayersContentFewer" : "adjustPlayersContentMore", {
            playersCount: configuredCount,
            joined: joinedCount,
          })}
        />
        <Txt className="mb4 lavender" value={t("adjustPlayersQuestion", { joined: joinedCount })} />
        <div className="flex flex-wrap justify-center items-center">
          {canFillWithBots && (
            <Button
              outlined
              className="mr2 mt2"
              id="fill-with-ai"
              text={t("fillWithAi")}
              onClick={() => {
                onClose();
                onFillWithBotsAndStart();
              }}
            />
          )}
          <Button outlined className="mr2 mt2" id="cancel-start" text={t("cancel")} onClick={onClose} />
          <Button
            primary
            className="mt2"
            id="confirm-start"
            text={t("confirmStart")}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
