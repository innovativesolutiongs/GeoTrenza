import type { Position } from "../store/positionSlice";

export interface InterpolatedPosition {
  lat: number;
  lng: number;
  ageSeconds: number;
}

const EARTH_RADIUS_KM = 6371;

// Forward-project a position by speed × elapsed time along its last heading.
// Pure function; tests pin `now` to assert exact projections. Callers gate
// invocation on classifier state — this function does NOT decide whether to
// extrapolate, it just does the math when asked.
export function interpolatePosition(position: Position, now: number): InterpolatedPosition {
  const recordedMs = new Date(position.recorded_at).getTime();
  const ageSeconds = Math.max(0, (now - recordedMs) / 1000);

  if (position.speed_kph === null || position.speed_kph === 0) {
    return { lat: position.lat, lng: position.lng, ageSeconds };
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
  };
}
