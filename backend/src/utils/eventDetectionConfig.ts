// Thresholds for the position-stream event detector (see services/eventDetection.ts).
// Pilot feedback will adjust — these are the starting points called out in the
// Stage 3c spec.
export const SUSTAINED_MOVEMENT_MINUTES = 5;
export const SUSTAINED_STOP_MINUTES = 5;
export const EXTENDED_IDLE_MINUTES = 30;
