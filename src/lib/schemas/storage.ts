import { z } from "zod";
import { IColor } from "~/lib/state";

export function readLocalStorage<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;

    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

const numberValue = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const userPreferencesSchema = z
  .object({
    soundOnStrike: z.boolean().optional().catch(undefined),
    showFireworksAtGameEnd: z.boolean().optional().catch(undefined),
    codedHintMarkers: z.boolean().optional().catch(undefined),
    disableCardNotes: z.boolean().optional().catch(undefined),
    disableChopIndicator: z.boolean().optional().catch(undefined),
    colorBlindMode: z.boolean().optional().catch(undefined),
  })
  .catch({});

const cardNotesSchema = z.object({
  color: z.array(z.enum(IColor)).catch([]),
  number: z.array(numberValue).catch([]),
});

const gameNotesSchema = z
  .object({
    updatedAt: z.number().catch(0),
    cards: z.record(z.string(), cardNotesSchema).catch({}),
    chopMoved: z.array(z.string()).optional().catch(undefined),
  })
  .catch({ updatedAt: 0, cards: {} });

export const notesStoreSchema = z.record(z.string(), gameNotesSchema).catch({});

export const tutorialStepSchema = z.number().int().nonnegative();
