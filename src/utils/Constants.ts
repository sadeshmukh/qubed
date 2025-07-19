import { Vector } from "../core/Vector";

export const PHYSICS = {
  FORCE_SCALE: 1000,
  TORQUE_SCALE: 1000,
  RESTITUTION: 1,
  FRICTION: 0.3,
  PENETRATION_SLOP: 0.5,
  PERCENT_CORRECTION: 0.8,
  GRAVITY: 1,
  AIR_RESISTANCE: 1,
  ANGULAR_DAMPING: 1,
  BOUNDING_BOX_MARGIN: 20,
  MAX_VELOCITY: 600,
  MAX_ANGULAR_VELOCITY: 8,
  MIN_TIMESTEP: 1 / 240,
  MAX_TIMESTEP: 1 / 60,
} as const;

export let WIND = {
  FORCE: new Vector(0, -0.05),
  ENABLED: true,
};

export const WORLD = {
  COORDINATE_SYSTEM: 1000,
  WALL_THICKNESS: 50,
  WALL_MARGIN_RATIO: 0.025,
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
