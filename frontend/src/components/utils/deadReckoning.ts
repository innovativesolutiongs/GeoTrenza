import type { Position } from "../store/positionSlice";

export interface InterpolatedPosition {
  lat: number;
  lng: number;
  ageSeconds: number;
  isStale: boolean;   // ageSeconds > STALE_THRESHOLD_SEC — visual warning
  isFrozen: boolean;  // ageSeconds > FREEZE_THRESHOLD_SEC — stop extrapolating
}

// Tuning knobs. STALE is when we lose visual trust; FREEZE is when we stop
// extrapolating entirely (dead reckoning past two minutes diverges too far).
const STALE_THRESHOLD_SEC = 60;
const FREEZE_THRESHOLD_SEC = 120;
const EARTH_RADIUS_KM = 6371;

// Forward-project a position by speed × elapsed time along its last heading.
// Pure function; no React, no time source other than the `now` arg so tests
// can pin the clock.
export function interpolatePosition(position: Position, now: number): InterpolatedPosition {
  const recordedMs = new Date(position.recorded_at).getTime();
  const ageSeconds = Math.max(0, (now - recordedMs) / 1000);
  const isStale = ageSeconds > STALE_THRESHOLD_SEC;
  const isFrozen = ageSeconds > FREEZE_THRESHOLD_SEC;

  // No speed → no projection. Same for null heading/speed.
  if (
    position.speed_kph === null ||
    position.speed_kph === 0 ||
    isFrozen
  ) {
    return { lat: position.lat, lng: position.lng, ageSeconds, isStale, isFrozen };
  }

  const distanceKm = position.speed_kph * (ageSeconds / 3600);
  const headingRad = ((position.heading_deg ?? 0) * Math.PI) / 180;
  const latRad = (position.lat * Math.PI) / 180;
  const lngRad = (position.lng * Math.PI) / 180;
  const angularDist = distanceKm / EARTH_RADIUS_KM;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDist) +
      Math.cos(latRad) * Math.sin(angularDist) * Math.cos(headingRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(headingRad) * Math.sin(angularDist) * Math.cos(latRad),
      Math.cos(angularDist) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
    ageSeconds,
    isStale,
    isFrozen,
  };
}
