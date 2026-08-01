import React, { useContext } from "react";
import { defaults } from "lodash";
import { readLocalStorage, userPreferencesSchema } from "~/lib/schemas/storage";

export interface UserPreferences {
  soundOnStrike?: boolean;
  showFireworksAtGameEnd?: boolean;
  codedHintMarkers?: boolean;
  disableCardNotes?: boolean;
}

type ValueAndSetter<T> = [T, (newValue: T) => void];

const DefaultPreferences: UserPreferences = {
  soundOnStrike: true,
  showFireworksAtGameEnd: true,
  codedHintMarkers: false,
  disableCardNotes: false,
};
export function loadUserPreferences(): UserPreferences {
  const loadedPreferences = readLocalStorage("userPreferences", userPreferencesSchema, {});
  return defaults({ ...loadedPreferences }, DefaultPreferences);
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
