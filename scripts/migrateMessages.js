const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const dryRun = process.argv.includes("--dry-run");
const prefix = dryRun ? "[dry-run] " : "";
const base = (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "").replace(/\/$/, "");

function toMessages(raw) {
  if (raw == null) return [];
  const entries = Array.isArray(raw) ? raw : typeof raw === "object" ? Object.values(raw) : [];
  return entries.filter((entry) => entry != null && typeof entry === "object");
}

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.json();
}

async function writeJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status}`);
}

async function main() {
  if (!base) {
    console.error("Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL (expected in .env at repo root).");
    process.exit(1);
  }

  const games = (await readJson(`${base}/games.json`)) || {};

  let migratedGames = 0;
  let migratedMessages = 0;

  for (const [gameId, game] of Object.entries(games)) {
    const messages = toMessages(game && game.messages);
    if (messages.length === 0) continue;

    const keyed = {};
    messages.forEach((message, index) => {
      const id = message.id || `legacy-${index}`;
      keyed[id] = {
        id,
        content: message.content != null ? message.content : "",
        from: message.from != null ? message.from : -1,
        turn: message.turn != null ? message.turn : 0,
        sentAt: message.sentAt != null ? message.sentAt : index,
      };
    });

    migratedGames += 1;
    migratedMessages += messages.length;

    console.log(`${prefix}${gameId}: ${messages.length} message(s) -> /messages/${gameId}`);

    if (!dryRun) {
      const id = encodeURIComponent(gameId);
      await writeJson(`${base}/messages/${id}.json`, "PATCH", keyed);
      await writeJson(`${base}/games/${id}/messages.json`, "DELETE");
    }
  }

  console.log(`\n${prefix}Done: ${migratedGames} game(s), ${migratedMessages} message(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
