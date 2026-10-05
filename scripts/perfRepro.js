/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Repro for slow hand expand/collapse (forced layouts from react-pose FLIP).
 *
 * Plays a bot game up to TURNS, then toggles hands under CPU throttling and
 * prints, per toggle, the number of forced layouts (getBoundingClientRect
 * calls) and the worst long-animation-frame.
 *
 * Setup:
 *   npx firebase-tools emulators:start --only database --project hanabi-local
 *   echo "NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://127.0.0.1:9000/?ns=hanabi-local" >> .env.local
 *   yarn build && yarn start
 *   npm i --no-save playwright-core
 *   TURNS=30 CPU=4 node scripts/perfRepro.js
 *
 * Env: BASE (http://localhost:3000), TURNS (30), CPU (4), BOTS (2), REPS (6), CHROMIUM (executable path)
 */
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3000";
const TURNS = +(process.env.TURNS || 30);
const CPU = +(process.env.CPU || 4);
const BOTS = +(process.env.BOTS || 2);
const REPS = +(process.env.REPS || 6);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  const context = await browser.newContext({
    viewport: { width: 412, height: 860 },
    deviceScaleFactor: 2.6,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    localStorage.setItem("userPreferences", JSON.stringify({ ...prefs, perfLogging: true }));
  });
  const page = await context.newPage();

  // Start a game against bots
  await page.goto(`${BASE}/new-game`);
  await page.click("#advanced-options");
  await page.selectOption("#bots-speed", "0");
  await page.click("#new-game");
  await page.waitForSelector("#player-name");
  await page.fill("#player-name", "Me");
  await page.click("#join-game");
  for (let i = 0; i < BOTS; i++) {
    await page.click("#add-ai");
    await sleep(500);
  }
  await page.click("#start-game");
  await page.waitForSelector('#player-game-self [data-card="A"]');

  // Play until the history is long enough
  const turns = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("hanabi.perfLog") || "[]")
          .filter((entry) => entry.kind === "update")
          .map((entry) => entry.turns)
          .pop() || 0
    );
  while ((await turns()) < TURNS) {
    if (await page.locator("#your-turn").count()) {
      await page.tap('#player-game-self [data-card="A"]').catch(() => undefined);
      await sleep(150);
      await page
        .tap("#discard:not([disabled])", { timeout: 500 })
        .catch(() => page.tap("#play", { timeout: 500 }).catch(() => undefined));
      await sleep(150);
      await page.mouse.click(200, 120);
    }
    await sleep(200);
  }
  await page.mouse.click(200, 120);
  await sleep(1500);

  // Measure toggles
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await page.evaluate(() => {
    window.__layouts = 0;
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      window.__layouts++;
      return original.call(this);
    };
    window.__frames = [];
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => window.__frames.push(Math.round(entry.duration)))
    ).observe({ type: "long-animation-frame" });
  });

  const steps = [
    ["self expand", () => page.tap('#player-game-self [data-card="A"]')],
    ["self collapse (tap card)", () => page.tap('#player-game-self [data-card="A"]')],
    ["self expand", () => page.tap('#player-game-self [data-card="A"]')],
    ["self collapse (tap outside)", () => page.mouse.click(200, 120)],
    ["other expand", () => page.tap("#player-game-1")],
    ["other collapse (tap outside)", () => page.mouse.click(200, 120)],
  ];
  const results = {};
  for (let i = 0; i < REPS; i++) {
    for (const [name, step] of steps) {
      await page.evaluate(() => {
        window.__layouts = 0;
        window.__frames = [];
      });
      await step();
      await sleep(700);
      const { layouts, frames } = await page.evaluate(() => ({ layouts: window.__layouts, frames: window.__frames }));
      (results[name] = results[name] || []).push({ layouts, frame: Math.max(0, ...frames) });
    }
  }

  console.log(`turns=${await turns()} cpu=x${CPU}`);
  for (const [name, runs] of Object.entries(results)) {
    const frames = runs.map((run) => run.frame);
    console.log(
      name.padEnd(30),
      `forced layouts: ${median(runs.map((run) => run.layouts))}`.padEnd(22),
      `long frame ms: median ${median(frames)}, max ${Math.max(...frames)}`
    );
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
