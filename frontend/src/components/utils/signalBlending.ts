import type { Position } from "../store/positionSlice";
import {
  WIRED_STALE_SECONDS,
  WIRED_OFFLINE_SECONDS,
  ASSET_TRACKER_STALE_SECONDS,
  ASSET_TRACKER_OFFLINE_SECONDS,
} from "./constants";
import type { MarkerState } from "./constants";

// Classify a position into a marker state. The decision tree differs per
// device_type because magnetic-battery / asset-tracker units don't have an
// engine line and report statusBits=0 in their normal stationary state.
//
// Mobicom JT/T 808 V2.2 statusBits (matches the parser at
// backend/ingestion/utils/statusParser.js):
//   bit 0 → ACC ON when set, ACC OFF when cleared.
export function classifyMarker(position: Position, now: number): MarkerState {
  const ageSeconds = Math.max(
    0,
    (now - new Date(position.recorded_at).getTime()) / 1000
  );
  const speed = position.speed_kph ?? 0;
  const isWired = position.device_type === "WIRED";

  if (isWired) {
    const statusBits = position.telemetry?.["statusBits"];
    const accOn = typeof statusBits === "number" ? (statusBits & 0b1) !== 0 : true;

    if (ageSeconds > WIRED_OFFLINE_SECONDS) return "OFFLINE";
    if (!accOn) return "OFFLINE";
    if (ageSeconds > WIRED_STALE_SECONDS) return "DELAYED";
    return speed > 0 ? "ACTIVE_MOVING" : "ACTIVE_IDLE";
  }

  // MAGNETIC_BATTERY / ASSET_TRACKER (and anything we add later without an
  // engine signal): ignore ACC bit entirely. Movement is the only motion cue.
  if (ageSeconds > ASSET_TRACKER_OFFLINE_SECONDS) return "OFFLINE";
  if (ageSeconds > ASSET_TRACKER_STALE_SECONDS) return "DELAYED";
  return speed > 0 ? "ACTIVE_MOVING" : "STATIONARY";
}

// Dead reckoning only animates ACTIVE_MOVING markers; everything else stays
// pinned to its source coordinates.
export function shouldExtrapolate(state: MarkerState): boolean {
  return state === "ACTIVE_MOVING";
}
