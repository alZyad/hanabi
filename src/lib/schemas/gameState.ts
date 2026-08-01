import { z } from "zod";
import { MaxHints } from "~/lib/actions";
import { GameMode, GameVariant, IColor, IGameHintsLevel, IGameStatus, IMinimalGameState } from "~/lib/state";

function toArray(value: unknown): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value as Record<string, unknown>);
  return [];
}

function strictArray<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess(toArray, z.array(item));
}

function lenientArray<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess(
    (value) => toArray(value).filter((entry) => entry != null && typeof entry === "object"),
    z.array(item)
  );
}

const droppableBool = z.boolean().catch(false);

const numberValue = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("play"), from: z.number().int(), cardIndex: z.number().int() }),
  z.object({ action: z.literal("discard"), from: z.number().int(), cardIndex: z.number().int() }),
  z.object({
    action: z.literal("hint"),
    from: z.number().int(),
    to: z.number().int(),
    type: z.enum(["color", "number"]),
    value: z.union([z.enum(IColor), numberValue]),
    cardsIndex: z.array(z.number().int()).optional(),
  }),
]);

const turnSchema = z.object({ action: actionSchema });

const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().catch(""),
  bot: droppableBool,
  index: z.number().int().optional(),
  reaction: z.string().nullish().catch(undefined),
  lastAction: actionSchema.optional().catch(undefined),
  notified: z.boolean().optional().catch(undefined),
});

const optionsSchema = z.object({
  id: z.string().min(1),
  seed: z.string().min(1),
  variant: z.enum(GameVariant),
  playersCount: z.number().int().min(2).max(5),
  hintsLevel: z.enum(IGameHintsLevel).catch(IGameHintsLevel.NONE),
  gameMode: z.enum(GameMode).catch(GameMode.NETWORK),
  botsWait: z.number().catch(1000),
  allowRollback: droppableBool,
  preventLoss: droppableBool,
  private: droppableBool,
  turnsHistory: droppableBool,
  colorBlindMode: droppableBool,
  tutorial: z.boolean().optional().catch(undefined),
});

const messageSchema = z.object({
  id: z.string().catch(""),
  content: z.string().catch(""),
  from: z.number().catch(-1),
  turn: z.number().catch(0),
});

const reviewCommentSchema = z.object({
  playerId: z.string().catch(""),
  afterTurnNumber: z.number().catch(0),
  comment: z.string().optional().catch(undefined),
});

const gameStateSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(IGameStatus),
    options: optionsSchema,
    players: strictArray(playerSchema),
    tokens: z.object({ hints: z.number(), strikes: z.number() }).catch({ hints: MaxHints, strikes: 0 }),
    currentPlayer: z.number().catch(0),
    actionsLeft: z.number().catch(0),
    turnsHistory: strictArray(turnSchema),
    messages: lenientArray(messageSchema).catch([]),
    reviewComments: lenientArray(reviewCommentSchema).catch([]),
    createdAt: z.number().catch(0),
    startedAt: z.number().optional().catch(undefined),
    endedAt: z.number().optional().catch(undefined),
    synced: z.boolean().catch(false),
    nextGameId: z
      .string()
      .nullish()
      .transform((value) => value ?? null),
  })
  .refine((state) => state.status === IGameStatus.LOBBY || state.players.length > 0, {
    message: "A non-lobby game must have at least one player",
  });

export const GAME_EXISTS_BUT_INVALID = Symbol("game-exists-but-invalid");

export type ParsedGame = IMinimalGameState | null | typeof GAME_EXISTS_BUT_INVALID;

function omitUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedDeep) as T;
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        output[key] = omitUndefinedDeep(entry);
      }
    }
    return output as T;
  }

  return value;
}

export function parseGameState(raw: unknown): ParsedGame {
  if (raw == null) return null;

  const result = gameStateSchema.safeParse(raw);
  if (!result.success) {
    return GAME_EXISTS_BUT_INVALID;
  }

  return omitUndefinedDeep(result.data) as IMinimalGameState;
}
