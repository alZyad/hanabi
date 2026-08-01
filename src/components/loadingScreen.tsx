import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { posedDiv } from "~/lib/posed";
import Txt, { TxtSize } from "~/components/ui/txt";

const Animation = posedDiv({
  attention: {
    opacity: 0.7,
    transition: {
      type: "spring",
      stiffness: 10,
      damping: 0,
    },
  },
});

export default function LoadingScreen() {
  const [pose, setPose] = useState<string>();
  const { t } = useTranslation();

  useEffect(() => {
    const interval = setTimeout(() => setPose("attention"), 100);

    return () => clearInterval(interval);
  });

  return (
    <div className="w-100 h-100 flex flex-column justify-center items-center bg-main-dark pa2 pv4-l ph3-l shadow-5 br3">
      <Animation pose={pose}>
        <Txt size={TxtSize.LARGE} value={t("loading")} />
      </Animation>
    </div>
  );
}
