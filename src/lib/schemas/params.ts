import { z } from "zod";

export const gameIdSchema = z
  .string()
  .min(1)
  .max(768)
  .regex(/^[^.$#/[\]]+$/);

export function parseGameId(raw: unknown): string | null {
  const result = gameIdSchema.safeParse(raw);
  return result.success ? result.data : null;
}
