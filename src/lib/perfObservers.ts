import { PerfScript, perfDebug } from "~/lib/perfDebug";

/**
 * Browser-level instrumentation, only running while perf logging is enabled.
 * Goal: explain freezes that happen outside of the code paths we time ourselves.
 */

const STALL_TICK_MS = 250;
const STALL_THRESHOLD_MS = 500;
const SLOW_INTERACTION_MS = 100;
const LONG_FRAME_MS = 150;
const MAX_SCRIPTS = 6;

// Not in TypeScript's DOM lib yet
interface LoafScript {
  invoker: string;
  invokerType: string;
  sourceURL: string;
  sourceFunctionName: string;
  sourceCharPosition: number;
  duration: number;
  forcedStyleAndLayoutDuration: number;
  pauseDuration: number;
}
interface LoafEntry extends PerformanceEntry {
  blockingDuration: number;
  renderStart: number;
  styleAndLayoutStart: number;
  firstUIEventTimestamp: number;
  scripts: LoafScript[];
}
interface EventTimingEntry extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  target: Node | null;
  interactionId?: number;
}

const round = Math.round;

function toEpoch(performanceTime: number) {
  return round(performance.timeOrigin + performanceTime);
}

function heapMb(): number | undefined {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? round(memory.usedJSHeapSize / 1e6) : undefined;
}

/**
 * Short, readable description of an element: closest element with an id + the element itself
 */
function describe(node: Node | null): string {
  if (!(node instanceof Element)) return "";
  const self = `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}`;
  const owner = node.closest("[id]");
  const card = node.closest("[data-card]")?.getAttribute("data-card");

  return [owner && owner !== node ? `#${owner.id}` : null, card ? `card ${card}` : null, self]
    .filter(Boolean)
    .join(" > ");
}

function shortSource(url: string) {
  return url.replace(/^.*\/_next\//, "");
}

function supported(type: string) {
  return typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes(type);
}

function recordSession() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };

  perfDebug.record({
    t: Date.now(),
    kind: "session",
    build: process.env.SENTRY_RELEASE || "dev",
    ua: nav.userAgent,
    dpr: window.devicePixelRatio,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    connection: nav.connection?.effectiveType,
    apis: ["long-animation-frame", "event", "longtask"].filter(supported),
  });
}

export function startPerfObservers(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const cleanups: (() => void)[] = [];
  recordSession();

  // Last pointerdown, to measure how long a tap waited before the hand toggled
  const onPointerDown = (event: PointerEvent) => {
    perfDebug.lastPointerDownAt = event.timeStamp;
  };
  window.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  cleanups.push(() => window.removeEventListener("pointerdown", onPointerDown, { capture: true }));

  let lastTick = performance.now();

  // Background / foreground: explains gaps that are not freezes
  let visibilityChangedAt = performance.now();
  const onVisibility = () => {
    const now = performance.now();
    perfDebug.record({
      t: Date.now(),
      kind: "visibility",
      state: document.visibilityState,
      ms: round(now - visibilityChangedAt),
    });
    visibilityChangedAt = now;
    lastTick = now;
    if (document.visibilityState === "hidden") perfDebug.flush();
  };
  document.addEventListener("visibilitychange", onVisibility);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

  const lifecycleEvents = ["freeze", "resume", "pagehide", "pageshow"];
  const onLifecycle = (event: Event) => {
    perfDebug.record({ t: Date.now(), kind: "lifecycle", event: event.type });
    if (event.type === "freeze" || event.type === "pagehide") perfDebug.flush();
  };
  lifecycleEvents.forEach((name) => document.addEventListener(name, onLifecycle));
  window.addEventListener("pagehide", onLifecycle);
  cleanups.push(() => {
    lifecycleEvents.forEach((name) => document.removeEventListener(name, onLifecycle));
    window.removeEventListener("pagehide", onLifecycle);
  });

  // Stall detector: a timer firing late means the main thread was busy (any browser, incl. Safari)
  const interval = setInterval(() => {
    const now = performance.now();
    const late = now - lastTick - STALL_TICK_MS;
    lastTick = now;
    if (document.visibilityState !== "visible") return;
    if (late < STALL_THRESHOLD_MS) return;
    perfDebug.record({ t: Date.now(), kind: "stall", ms: round(late), heap: heapMb() });
  }, STALL_TICK_MS);
  cleanups.push(() => clearInterval(interval));

  // Slow interactions: input delay, handler time, and time until the result was painted.
  // A tap dispatches many events (pointerdown, mousedown, click...): keep one entry per tap, its slowest event.
  if (supported("event")) {
    const recordedInteractions: number[] = [];
    const observer = new PerformanceObserver((list) => {
      const slowest = new Map<number, { entry: EventTimingEntry; target: string }>();
      (list.getEntries() as EventTimingEntry[]).forEach((entry) => {
        const id = entry.interactionId;
        if (!id || entry.duration < SLOW_INTERACTION_MS || recordedInteractions.includes(id)) return;
        const current = slowest.get(id);
        const target = describe(entry.target) || current?.target || "";
        if (!current || entry.duration > current.entry.duration) slowest.set(id, { entry, target });
        else if (!current.target) current.target = target;
      });

      slowest.forEach(({ entry, target }, id) => {
        recordedInteractions.push(id);
        if (recordedInteractions.length > 50) recordedInteractions.shift();
        perfDebug.record({
          t: toEpoch(entry.startTime),
          kind: "interaction",
          event: entry.name,
          target,
          ms: round(entry.duration),
          input: round(entry.processingStart - entry.startTime),
          handler: round(entry.processingEnd - entry.processingStart),
          present: round(entry.startTime + entry.duration - entry.processingEnd),
        });
      });
    });
    observer.observe({
      type: "event",
      buffered: false,
      durationThreshold: SLOW_INTERACTION_MS,
    } as PerformanceObserverInit);
    cleanups.push(() => observer.disconnect());
  }

  // Long frames, with the scripts responsible (source positions map back through the build's source maps)
  if (supported("long-animation-frame")) {
    const observer = new PerformanceObserver((list) => {
      (list.getEntries() as LoafEntry[]).forEach((entry) => {
        if (entry.duration < LONG_FRAME_MS) return;
        const end = entry.startTime + entry.duration;
        const scripts: PerfScript[] = [...entry.scripts]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, MAX_SCRIPTS)
          .map((script) => ({
            invoker: script.invoker,
            type: script.invokerType,
            source: shortSource(script.sourceURL),
            fn: script.sourceFunctionName,
            char: script.sourceCharPosition,
            ms: round(script.duration),
            layout: round(script.forcedStyleAndLayoutDuration),
            pause: round(script.pauseDuration),
          }));

        perfDebug.record({
          t: toEpoch(entry.startTime),
          kind: "loaf",
          ms: round(entry.duration),
          blocking: round(entry.blockingDuration),
          render: entry.renderStart ? round(end - entry.renderStart) : 0,
          layout: entry.styleAndLayoutStart ? round(end - entry.styleAndLayoutStart) : 0,
          input: entry.firstUIEventTimestamp ? round(entry.firstUIEventTimestamp - entry.startTime) : undefined,
          heap: heapMb(),
          scripts,
        });
      });
    });
    observer.observe({ type: "long-animation-frame", buffered: false });
    cleanups.push(() => observer.disconnect());
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    perfDebug.flush();
  };
}
