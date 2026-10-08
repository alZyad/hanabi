import usePrevious from "~/hooks/previous";

/**
 * PoseGroup's `flipMove` makes every child measure itself (a forced layout each)
 * and start a FLIP animation on *every* render, even when nothing moved.
 * Only enable it on the render where the list of keys actually changed.
 */
export function useFlipMove(keys: string): boolean {
  const previousKeys = usePrevious(keys);

  return previousKeys !== undefined && previousKeys !== keys;
}
