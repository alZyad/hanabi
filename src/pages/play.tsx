import { useRouter } from "next/router";
import React, { useEffect } from "react";
import LoadingScreen from "~/components/loadingScreen";
import { parseGameId } from "~/lib/schemas/params";
import { logFailedPromise } from "~/lib/errors";

/**
 * Legacy route for /play?gameId={gameId}
 * Redirects to /{gameId}
 */
export default function Play() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const gameId = parseGameId(router.query.gameId);
    const destination = gameId ? `/${gameId}` : "/?error=invalid-game";

    router.replace(destination).catch(logFailedPromise);
  }, [router, router.isReady, router.query.gameId]);

  return <LoadingScreen />;
}
