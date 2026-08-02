import { z } from "zod";
import { IMessage } from "~/lib/state";

const messageSchema = z.object({
  id: z.string().catch(""),
  content: z.string().catch(""),
  from: z.number().catch(-1),
  turn: z.number().catch(0),
  sentAt: z.number().catch(0),
});

export function parseMessages(raw: unknown): IMessage[] {
  const entries = raw != null && typeof raw === "object" ? Object.values(raw as Record<string, unknown>) : [];

  return entries
    .flatMap((entry) => {
      const result = messageSchema.safeParse(entry);
      return result.success ? [result.data] : [];
    })
    .sort((a, b) => a.sentAt - b.sentAt);
}
