import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cardNotesOnboardingDone";

export function useCardNotesOnboarding() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(STORAGE_KEY)) setActive(true);
  }, []);

  const dismiss = useCallback(() => {
    setActive(false);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
  }, []);

  return { active, dismiss };
}
