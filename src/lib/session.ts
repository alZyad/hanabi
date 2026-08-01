import { withIronSession } from "next-iron-session";
import { z } from "zod";
import { ID, uniqueId } from "~/lib/id";

const playerIdSchema = z.string().min(1);

export default function withSession(handler) {
  return withIronSession(handler, {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    password: process.env.COOKIE_PASSWORD!,
    cookieName: "hanab.cards",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production" ? true : false,
    },
  });
}

export async function getPlayerIdFromSession(req): Promise<ID> {
  const stored = playerIdSchema.safeParse(req.session.get("playerId"));
  if (stored.success) {
    return stored.data;
  }

  const playerId = uniqueId();
  req.session.set("playerId", playerId);
  await req.session.save();

  return playerId;
}
