// Stage 3b refinement: per-device-type thresholds for marker state.
// Tunable — pilot feedback will adjust. Keep these as the single source of
// truth so signal blending, dead reckoning, and tests stay in lockstep.

export const WIRED_STALE_SECONDS = 60;
export const WIRED_OFFLINE_SECONDS = 120;

export const ASSET_TRACKER_STALE_SECONDS = 60;
export const ASSET_TRACKER_OFFLINE_SECONDS = 1800; // 30 minutes

export type DeviceType = "WIRED" | "MAGNETIC_BATTERY" | "ASSET_TRACKER";

// 5-state classifier output, drives marker color and popup label.
export type MarkerState =
  | "ACTIVE_MOVING"
  | "ACTIVE_IDLE"
  | "STATIONARY"
  | "DELAYED"
  | "OFFLINE";

// Tailwind-ish palette. Map from MarkerState to color + popup label.
export const MARKER_COLORS: Record<MarkerState, string> = {
  ACTIVE_MOVING: "#22c55e",
  ACTIVE_IDLE: "#22c55e",
  STATIONARY: "#3b82f6",
  DELAYED: "#eab308",
  OFFLINE: "#ef4444",
};

export const MARKER_LABELS: Record<MarkerState, string> = {
  ACTIVE_MOVING: "Active — Moving",
  ACTIVE_IDLE: "Active — Idle",
  STATIONARY: "Parked",
  DELAYED: "Connection delayed",
  OFFLINE: "Offline",
};
