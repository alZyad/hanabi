import { withIronSession } from "next-iron-session";
import { z } from "zod";
import { ID, uniqueId } from "~/lib/id";
import { serverEnv } from "~/lib/schemas/env";

const playerIdSchema = z.string().min(1);

export default function withSession(handler) {
  return (...args) =>
    withIronSession(handler, {
      password: serverEnv().COOKIE_PASSWORD,
      cookieName: "hanab.cards",
      cookieOptions: {
        secure: process.env.NODE_ENV === "production" ? true : false,
      },
    })(...args);
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
