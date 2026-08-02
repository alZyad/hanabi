import json from "big-json";
import { program } from "commander";
import fs from "fs";
import { omit } from "lodash";
import { Sequelize } from "sequelize";
import { JsonObject } from "type-fest";
import { getMaximumPossibleScore, getScore } from "../src/lib/actions";
import IGameState, { IMinimalGameState, rebuildGame } from "../src/lib/state";

interface Database {
  games: Array<{
    id: string;
    options: JsonObject;
  }>;
}

const sequelize = new Sequelize("postgres://postgres@localhost:5432/hanabi", {
  logging: false,
});

program
  .name("convert-database")
  .option("-p, --path <path>", "Path of the JSON database dump")
  .action(async ({ path }) => {
    await sequelize.authenticate();

    const db = await new Promise<Database>((resolve) => {
      const readStream = fs.createReadStream(path, { flags: "r", encoding: "utf-8" });
      const parseStream = json.createParseStream();

      readStream.pipe(parseStream);

      parseStream.on("data", (db: Database) => {
        resolve(db);
      });
    });

    await Promise.all(
      Object.values((db.games as unknown) as Partial<IGameState>[]).map(async (game) => {
        const id = game.id;
        const options = JSON.stringify(game.options);
        const state = JSON.stringify(omit(game, ["id", "options", "history"]));
        const fullState = rebuildGame((game as unknown) as IMinimalGameState) as IGameState;

        const score = getScore(fullState);
        const maxPossibleScore = getMaximumPossibleScore(fullState);
        const playersCount = fullState.players.length;
        const variant = fullState.options.variant;
        const colorblindMode = (game.options as { colorBlindMode?: boolean } | undefined)?.colorBlindMode ?? false;
        const rawMessages = (game as { messages?: unknown }).messages;
        const messagesCount =
          rawMessages == null ? 0 : Array.isArray(rawMessages) ? rawMessages.length : Object.keys(rawMessages).length;

        await sequelize.query(`
          INSERT INTO "games"
            ("id", "options", "state", "full_state", "score", "max_possible_score", "players_count", "variant", "colorblind_mode", "messages_count")
          VALUES
            ('${id}', '${options}', '${state}', '${fullState}', ${score}, ${maxPossibleScore}, ${playersCount}, '${variant}', ${colorblindMode}, ${messagesCount})
          ON CONFLICT DO NOTHING
        `);

        console.log(`Inserted game ${id}`);
      })
    );
  })
  .parse(process.argv);
