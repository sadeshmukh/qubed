export const PHYSICS = {
  FORCE_SCALE: 1000, // can't keep too high -> physics instability
  TORQUE_SCALE: 1000, // Same scaling for torque

  GRAVITY: 0.5,
  // FRICTION: 0.99, // per tick
  // BOUNCE_DAMPING: 0.8,
} as const;

export const COLORS = {
  BACKGROUND: "#000",
  BOX: "#0066cc",
  PARTICLE: "#ff6b6b",
  BOUNDARY: "#333",
} as const;

export const CANVAS = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
} as const;
