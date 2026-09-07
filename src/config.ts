export const CONFIG = {
  // Timeline Bounds.
  START_YEAR: 1995,
  END_YEAR: 2024,

  // Physics & Timing.
  TARGET_FPS: 60, // The frame rate baseline your speed math expects.
  PARTICLE_LIFETIME: 5.0, // How long a particle takes to traverse its arc in seconds.

  // Visuals & Sizing.
  BASE_SIZE_MULTIPLIER: 7, // Global scale modifier for light particles.
  ARC_STROKE: 0.1, // Thickness of the trade arcs.
  MIN_ARC_ALTITUDE: 0.05, // Minimum altitude for the arcs.
  MAX_ARC_ALTITUDE: 1.5, // Maximum altitude for the arcs.
  HOVER_PADDING: 1.5, // Safe clearance distance above the globe geometry to prevent clipping.
  EDGE_FADE_THRESHOLD: 0.01, // Smoothly scale down during the first/last 8% of flight.
};
