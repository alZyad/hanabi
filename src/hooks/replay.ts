import React, { useContext } from "react";

export interface ReplayProps {
  cursor: number | null;
  moveCursor: (to: number | null) => void;
}

const defaultReplay: ReplayProps = {
  cursor: null,
  moveCursor: () => undefined,
};

export const ReplayContext = React.createContext<ReplayProps>(defaultReplay);

export function useReplay(): ReplayProps {
  return useContext(ReplayContext);
}
