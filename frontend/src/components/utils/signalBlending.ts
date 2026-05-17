import type { Position } from "../store/positionSlice";

// Decide whether to freeze a marker in place (skip dead reckoning) based on
// telemetry signals from the device. These hints override the speed/heading
// math when the device is reporting "I'm sitting still" by other channels.
//
// Mobicom JT/T 808 V2.2 statusBits layout (from
// backend/ingestion/utils/statusParser.js, the source of truth):
//   bit 0 = ACC. set → ACC ON; cleared → ACC OFF.
//   bit 1 = GPS fix valid.
// Note: the Stage 3b task spec described bit-0-SET as "ACC off"; that's
// inverted from the parser and from the spec. We follow the parser here —
// freeze when ACC is OFF (bit 0 cleared), not when it is set.
export function shouldFreezeMarker(position: Position): boolean {
  const t = position.telemetry ?? {};

  // Explicit accelerometer hint: payload like { accelerometer: { x, y, z } }
  // with all-zero values means the unit is not vibrating → stationary.
  const accel = t["accelerometer"] as
    | { x?: number; y?: number; z?: number }
    | undefined;
  if (
    accel &&
    typeof accel === "object" &&
    accel.x === 0 &&
    accel.y === 0 &&
    accel.z === 0
  ) {
    return true;
  }

  // ACC OFF (engine off) → don't extrapolate.
  const statusBits = t["statusBits"];
  if (typeof statusBits === "number") {
    const accOn = (statusBits & 0b1) !== 0;
    if (!accOn) return true;
  }

  // Reported speed is exactly 0 → we'd return the original lat/lng anyway, but
  // we declare it here so callers can distinguish "frozen by signal" from
  // "frozen by zero speed" if they need to.
  if (position.speed_kph === 0) return true;

  return false;
}
