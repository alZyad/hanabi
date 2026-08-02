import React, { useContext } from "react";
import { defaults } from "lodash";
import { readLocalStorage, userPreferencesSchema } from "~/lib/schemas/storage";

export interface UserPreferences {
  soundOnStrike?: boolean;
  showFireworksAtGameEnd?: boolean;
  codedHintMarkers?: boolean;
  disableCardNotes?: boolean;
  showChopIndicator?: boolean;
  colorBlindMode?: boolean;
}

type ValueAndSetter<T> = [T, (newValue: T) => void];

const DefaultPreferences: UserPreferences = {
  soundOnStrike: true,
  showFireworksAtGameEnd: true,
  codedHintMarkers: false,
  disableCardNotes: false,
  showChopIndicator: false,
  colorBlindMode: false,
};
export function loadUserPreferences(): UserPreferences {
  const loadedPreferences = readLocalStorage("userPreferences", userPreferencesSchema, {});
  return defaults({ ...loadedPreferences }, DefaultPreferences);
}

const LEGACY_COLOR_BLIND_MODE_KEY = "colorBlindMode";

function parseLegacyBoolean(raw: string): boolean | undefined {
  const normalized = raw.trim();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

export function migrateLegacyColorBlindMode(): void {
  if (typeof window === "undefined") return;

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_COLOR_BLIND_MODE_KEY);
    if (legacyRaw === null) return;

    const legacyValue = parseLegacyBoolean(legacyRaw);
    const current = readLocalStorage("userPreferences", userPreferencesSchema, {});

    if (legacyValue !== undefined && current.colorBlindMode === undefined) {
      window.localStorage.setItem("userPreferences", JSON.stringify({ ...current, colorBlindMode: legacyValue }));
    }

    window.localStorage.removeItem(LEGACY_COLOR_BLIND_MODE_KEY);
  } catch {
    return;
  }
}
export const UserPreferencesContext = React.createContext<ValueAndSetter<UserPreferences>>([
  DefaultPreferences,
  () => {
    console.warn("Unexpected attempt to change default User Preferences");
  },
]);

export function useUserPreferences(): ValueAndSetter<UserPreferences> {
  const [userPreferences, setUserPreferencesToContext] = useContext(UserPreferencesContext);

  return [
    userPreferences,
    (userPreferences: UserPreferences) => {
      setUserPreferencesToContext(userPreferences);
      if (window) {
        window.localStorage.setItem("userPreferences", JSON.stringify(userPreferences));
      }
    },
  ];
}

export function useColorBlindMode(): boolean {
  const [userPreferences] = useUserPreferences();
  return Boolean(userPreferences.colorBlindMode);
}
