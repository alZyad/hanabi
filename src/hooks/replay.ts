import React, { useContext } from "react";

interface ReplayProps {
  cursor: number;
  moveCursor: (to: number | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const ReplayContext = React.createContext<ReplayProps>(null!);

export function useReplay() {
  return useContext<ReplayProps>(ReplayContext);
}
