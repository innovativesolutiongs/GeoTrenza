import {
  SUSTAINED_MOVEMENT_MINUTES,
  SUSTAINED_STOP_MINUTES,
  EXTENDED_IDLE_MINUTES,
} from "../utils/eventDetectionConfig";

// Loosely typed because the function is called both with TypeORM Position
// entities and with raw rows from the JOIN-aware controller.
export interface PositionLike {
  id: string | number;
  device_id: string | number;
  recorded_at: string | Date;
  lat: number;
  lng: number;
  speed_kph: number | null;
  telemetry?: Record<string, unknown> | null;
}

export type DeviceType = "WIRED" | "MAGNETIC_BATTERY" | "ASSET_TRACKER" | string;

export type DetectedEventKind =
  | "ARRIVAL"
  | "DEPARTURE"
  | "EXTENDED_IDLE"
  | "ENGINE_STARTED"
  | "ENGINE_STOPPED";

export interface DetectedEvent {
  kind: DetectedEventKind;
  at: string; // ISO
  device_id: string;
  details?: Record<string, unknown>;
}

// ACC bit per Mobicom JT/T 808 V2.2 statusBits (matches parser at
// backend/ingestion/utils/statusParser.js): bit 0 set → ACC ON.
function accOn(p: PositionLike): boolean {
  const sb = (p.telemetry as Record<string, unknown> | undefined)?.["statusBits"];
  if (typeof sb !== "number") return false;
  return (sb & 0b1) !== 0;
}

function ts(p: PositionLike): number {
  return new Date(p.recorded_at).getTime();
}

const minutes = (a: PositionLike, b: PositionLike) =>
  Math.abs(ts(b) - ts(a)) / 60_000;

/**
 * Run state-aware event detection over a chronological position stream for a
 * single device. Caller must filter to device_type === "WIRED"; for other
 * device types we return an empty array. Pure function — no I/O.
 *
 * The classifier walks the stream once, tracking:
 *  - a candidate motion state (STOPPED | MOVING) plus the time it became a
 *    candidate; when it has been the candidate for SUSTAINED_*_MINUTES we
 *    commit it and (if it differs from prior committed state) emit
 *    ARRIVAL or DEPARTURE
 *  - ACC bit; emits ENGINE_STARTED / ENGINE_STOPPED on transition
 *  - if engine ON and motion-state STOPPED, accumulates idle time; on the
 *    first sample whose idle-accumulated duration crosses EXTENDED_IDLE_MINUTES
 *    we emit EXTENDED_IDLE (one shot per idle period)
 */
export function detectEvents(
  positions: PositionLike[],
  deviceType: DeviceType
): DetectedEvent[] {
  if (deviceType !== "WIRED") return [];
  if (positions.length === 0) return [];

  const sorted = [...positions].sort((a, b) => ts(a) - ts(b));
  const events: DetectedEvent[] = [];

  type Motion = "STOPPED" | "MOVING";
  const motionOf = (p: PositionLike): Motion =>
    (p.speed_kph ?? 0) > 0 ? "MOVING" : "STOPPED";

  let committedMotion: Motion | null = null;
  let committedAt: PositionLike | null = null;

  let candidate: Motion = motionOf(sorted[0]);
  let candidateSince: PositionLike = sorted[0];

  let prevAcc: boolean | null = null;
  let idleStart: PositionLike | null = null;
  let idleEmitted = false;

  const deviceId = String(sorted[0].device_id);

  for (const p of sorted) {
    // --- ACC transitions ---
    const acc = accOn(p);
    if (prevAcc === null) {
      prevAcc = acc;
    } else if (acc && !prevAcc) {
      events.push({
        kind: "ENGINE_STARTED",
        at: new Date(ts(p)).toISOString(),
        device_id: deviceId,
      });
      prevAcc = acc;
    } else if (!acc && prevAcc) {
      events.push({
        kind: "ENGINE_STOPPED",
        at: new Date(ts(p)).toISOString(),
        device_id: deviceId,
      });
      prevAcc = acc;
    }

    // --- Motion state machine (sustained-window commit) ---
    const motion = motionOf(p);
    if (motion !== candidate) {
      candidate = motion;
      candidateSince = p;
    } else {
      const sustainedMin = minutes(candidateSince, p);
      const threshold =
        candidate === "MOVING" ? SUSTAINED_MOVEMENT_MINUTES : SUSTAINED_STOP_MINUTES;
      if (sustainedMin >= threshold && committedMotion !== candidate) {
        if (committedMotion === "MOVING" && candidate === "STOPPED") {
          events.push({
            kind: "ARRIVAL",
            at: new Date(ts(candidateSince)).toISOString(),
            device_id: deviceId,
            details: {
              arrived_at: new Date(ts(candidateSince)).toISOString(),
              lat: candidateSince.lat,
              lng: candidateSince.lng,
            },
          });
        } else if (committedMotion === "STOPPED" && candidate === "MOVING") {
          const arrivedAt = committedAt ? ts(committedAt) : null;
          events.push({
            kind: "DEPARTURE",
            at: new Date(ts(candidateSince)).toISOString(),
            device_id: deviceId,
            details: {
              departed_at: new Date(ts(candidateSince)).toISOString(),
              time_at_location_min:
                arrivedAt != null
                  ? Math.round((ts(candidateSince) - arrivedAt) / 60_000)
                  : null,
              from_lat: committedAt?.lat,
              from_lng: committedAt?.lng,
            },
          });
        }
        committedMotion = candidate;
        committedAt = candidateSince;
      }
    }

    // --- Extended idle (engine on but not moving for > 30 min) ---
    if (acc && motion === "STOPPED") {
      if (idleStart === null) {
        idleStart = p;
        idleEmitted = false;
      } else if (!idleEmitted && minutes(idleStart, p) >= EXTENDED_IDLE_MINUTES) {
        events.push({
          kind: "EXTENDED_IDLE",
          at: new Date(ts(p)).toISOString(),
          device_id: deviceId,
          details: {
            idle_started_at: new Date(ts(idleStart)).toISOString(),
            idle_duration_min: Math.round(minutes(idleStart, p)),
            lat: idleStart.lat,
            lng: idleStart.lng,
            // fuel_implications placeholder — Stage 4 will compute cost.
          },
        });
        idleEmitted = true;
      }
    } else {
      idleStart = null;
      idleEmitted = false;
    }
  }

  return events;
}
