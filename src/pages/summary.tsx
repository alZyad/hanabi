import { useRouter } from "next/router";
import React, { useEffect } from "react";
import LoadingScreen from "~/components/loadingScreen";
import { parseGameId } from "~/lib/schemas/params";
import { logFailedPromise } from "~/lib/errors";

/**
 * Legacy route for /summary?gameId={gameId}
 * Redirects to /{gameId}/summary
 */
export default function Summary() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const gameId = parseGameId(router.query.gameId);
    const destination = gameId ? `/${gameId}/summary` : "/?error=invalid-game";

    router.replace(destination).catch(logFailedPromise);
  }, [router, router.isReady, router.query.gameId]);

  return <LoadingScreen />;
}
