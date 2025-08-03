import { Vector } from "../core/Vector";

export const PHYSICS = {
  FORCE_SCALE: 1000,
  TORQUE_SCALE: 1000,
  RESTITUTION: 1,
  FRICTION: 0.3,
  PENETRATION_SLOP: 0.1,
  PERCENT_CORRECTION: 0.9,
  AIR_RESISTANCE: 1,
  ANGULAR_DAMPING: 1,
  BOUNDING_BOX_MARGIN: 20,
  MAX_VELOCITY: 600,
  MAX_ANGULAR_VELOCITY: 8,
  MIN_TIMESTEP: 1 / 240,
  MAX_TIMESTEP: 1 / 60,
} as const;

export let WIND = {
  FORCE: new Vector(0, 0.05),
  ENABLED: true,
};

export function setWindForce(force: Vector): void {
  WIND.FORCE = force;
}

export function toggleWind(): void {
  WIND.ENABLED = !WIND.ENABLED;
}

export const WORLD = {
  COORDINATE_SYSTEM: 1000,
  WALL_THICKNESS: 50,
  WALL_MARGIN_RATIO: 0.025,
} as const;

export let COLORS = {
  BACKGROUND: "#0a0a0f",
  BOX: "#3b82f6",
  HEXAGON: "#f59e0b",
  PARTICLE: "#ef4444",
  BOUNDARY: "#374151",
  CONTACT_POINT: "#fbbf24",
  VELOCITY_VECTOR: "#10b981",
  ANGULAR_VECTOR: "#f472b6",
};

export function applyColorTheme(theme: {[key: string]: string}) {
  COLORS.BACKGROUND = theme.background || COLORS.BACKGROUND;
  COLORS.BOX = theme.box || COLORS.BOX;
  COLORS.HEXAGON = theme.hexagon || COLORS.HEXAGON;
  COLORS.PARTICLE = theme.particle || COLORS.PARTICLE;
  COLORS.BOUNDARY = theme.boundary || COLORS.BOUNDARY;
  COLORS.CONTACT_POINT = theme.contactPoint || COLORS.CONTACT_POINT;
  COLORS.VELOCITY_VECTOR = theme.velocityVector || COLORS.VELOCITY_VECTOR;
  COLORS.ANGULAR_VECTOR = theme.angularVector || COLORS.ANGULAR_VECTOR;
}

export const CANVAS = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
} as const;
