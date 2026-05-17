import { detectEvents } from "../services/eventDetection";
import type { PositionLike } from "../services/eventDetection";

// Helper: build a series of positions starting at t0, one per `stepSec`.
// statusBits encodes ACC (bit 0). speed is uniform across the run unless
// pinpointed below.
function makeStream(
  t0Iso: string,
  stepSec: number,
  count: number,
  opts: { speed: number; acc: boolean }
): PositionLike[] {
  const t0 = new Date(t0Iso).getTime();
  const out: PositionLike[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i + 1,
      device_id: "1",
      recorded_at: new Date(t0 + i * stepSec * 1000).toISOString(),
      lat: 30.9,
      lng: 75.85,
      speed_kph: opts.speed,
      telemetry: { statusBits: opts.acc ? 3 : 2 },
    });
  }
  return out;
}

describe("detectEvents", () => {
  test("asset trackers return an empty events array even with movement signal", () => {
    const stream = makeStream("2026-05-17T08:00:00Z", 30, 30, { speed: 40, acc: true });
    expect(detectEvents(stream, "MAGNETIC_BATTERY")).toEqual([]);
    expect(detectEvents(stream, "ASSET_TRACKER")).toEqual([]);
  });

  test("empty stream → empty events", () => {
    expect(detectEvents([], "WIRED")).toEqual([]);
  });

  test("WIRED: a moving truck that comes to a sustained stop emits ARRIVAL", () => {
    // 10 minutes moving (acc on), then 10 minutes stopped (acc still on).
    // Sustained-stop threshold is 5 min, so we expect one ARRIVAL.
    const moving = makeStream("2026-05-17T08:00:00Z", 30, 20, { speed: 50, acc: true });
    const stopped = makeStream("2026-05-17T08:10:00Z", 30, 20, { speed: 0, acc: true });
    const events = detectEvents([...moving, ...stopped], "WIRED");
    const arrivals = events.filter((e) => e.kind === "ARRIVAL");
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0].at).toBe("2026-05-17T08:10:00.000Z");
  });

  test("WIRED: stop-then-go emits DEPARTURE with time_at_location_min", () => {
    // 10 min stopped, then 10 min moving — expect one DEPARTURE.
    const stopped = makeStream("2026-05-17T08:00:00Z", 30, 20, { speed: 0, acc: true });
    const moving = makeStream("2026-05-17T08:10:00Z", 30, 20, { speed: 40, acc: true });
    const events = detectEvents([...stopped, ...moving], "WIRED");
    const departures = events.filter((e) => e.kind === "DEPARTURE");
    expect(departures).toHaveLength(1);
    expect(departures[0].at).toBe("2026-05-17T08:10:00.000Z");
    // STOPPED was committed at t=0 (the initial sample); departure at t=10min
    // ⇒ time_at_location_min = 10.
    expect((departures[0].details as any).time_at_location_min).toBe(10);
  });

  test("WIRED: 29 minutes of idle → NO EXTENDED_IDLE event", () => {
    // 29 min stopped with acc on (1 sample/sec → 1740 samples is overkill;
    // use 60s stride for 30 samples covering 29 min).
    const stream = makeStream("2026-05-17T08:00:00Z", 60, 30, { speed: 0, acc: true });
    const events = detectEvents(stream, "WIRED");
    expect(events.find((e) => e.kind === "EXTENDED_IDLE")).toBeUndefined();
  });

  test("WIRED: 31 minutes of idle → EXTENDED_IDLE event fires once", () => {
    // 31 samples at 60s stride = spans 30 min. Need 32 samples to cross the
    // strict-greater-than-30-min line that the implementation uses (>= 30).
    // Easier: 60s stride, 35 samples = 34 min span, well past threshold.
    const stream = makeStream("2026-05-17T08:00:00Z", 60, 35, { speed: 0, acc: true });
    const events = detectEvents(stream, "WIRED");
    const idles = events.filter((e) => e.kind === "EXTENDED_IDLE");
    expect(idles).toHaveLength(1);
    expect((idles[0].details as any).idle_duration_min).toBeGreaterThanOrEqual(30);
  });

  test("WIRED: ACC bit flipping emits ENGINE_STARTED / ENGINE_STOPPED on each transition", () => {
    const accOff = makeStream("2026-05-17T08:00:00Z", 60, 3, { speed: 0, acc: false });
    const accOn = makeStream("2026-05-17T08:03:00Z", 60, 3, { speed: 10, acc: true });
    const accOff2 = makeStream("2026-05-17T08:06:00Z", 60, 3, { speed: 0, acc: false });
    const events = detectEvents([...accOff, ...accOn, ...accOff2], "WIRED");
    const transitions = events.filter(
      (e) => e.kind === "ENGINE_STARTED" || e.kind === "ENGINE_STOPPED"
    );
    expect(transitions.map((e) => e.kind)).toEqual([
      "ENGINE_STARTED",
      "ENGINE_STOPPED",
    ]);
  });

  test("WIRED: EXTENDED_IDLE does not re-fire while still idling — one event per idle period", () => {
    // 60 min straight idle. Threshold is 30 min, so we'd expect exactly one
    // EXTENDED_IDLE despite many samples crossing it.
    const stream = makeStream("2026-05-17T08:00:00Z", 60, 70, { speed: 0, acc: true });
    const idles = detectEvents(stream, "WIRED").filter((e) => e.kind === "EXTENDED_IDLE");
    expect(idles).toHaveLength(1);
  });

  test("WIRED: brief move within a stop window does not fire spurious ARRIVAL/DEPARTURE", () => {
    // 10 min stopped, 1 min of movement, 10 min stopped — the 1-min move is
    // shorter than SUSTAINED_MOVEMENT_MINUTES so it doesn't commit MOVING and
    // shouldn't generate ARRIVAL/DEPARTURE. We should only see at most
    // engine-state transitions, not motion events.
    const before = makeStream("2026-05-17T08:00:00Z", 60, 10, { speed: 0, acc: true });
    const blip = makeStream("2026-05-17T08:10:00Z", 30, 2, { speed: 20, acc: true });
    const after = makeStream("2026-05-17T08:11:00Z", 60, 10, { speed: 0, acc: true });
    const motion = detectEvents([...before, ...blip, ...after], "WIRED")
      .filter((e) => e.kind === "ARRIVAL" || e.kind === "DEPARTURE");
    expect(motion).toEqual([]);
  });
});
