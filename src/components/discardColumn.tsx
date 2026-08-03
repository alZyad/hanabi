import React from "react";
import { useTranslation } from "react-i18next";
import DiscardArea from "~/components/discardArea";
import Tutorial, { ITutorialStep } from "~/components/tutorial";
import Button, { ButtonSize } from "~/components/ui/button";
import { useReplay } from "~/hooks/replay";

interface Props {
  className?: string;
  onReplay: () => void;
  onStopReplay: () => void;
}

export default function DiscardColumn(props: Props) {
  const { className, onReplay, onStopReplay } = props;
  const { t } = useTranslation();
  const replay = useReplay();

  return (
    <div className={className}>
      <Tutorial placement="left" step={ITutorialStep.DISCARD_PILE}>
        <DiscardArea />
      </Tutorial>
      <Button
        void
        className="tracked-tight"
        size={ButtonSize.TINY}
        text={replay.cursor === null ? t("rewind") : t("backToGame")}
        onClick={() => {
          if (replay.cursor === null) {
            onReplay();
          } else {
            onStopReplay();
          }
        }}
      />
    </div>
  );
}
