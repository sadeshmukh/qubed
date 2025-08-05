import { Vector } from "../core/Vector";
import { Theme, getTheme } from "./themes";

export let PHYSICS = {
  FORCE_SCALE: 1000,
  TORQUE_SCALE: 1000,
  RESTITUTION: 0.8,
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
};

export function updatePhysicsSettings(settings: Partial<typeof PHYSICS>): void {
  PHYSICS = { ...PHYSICS, ...settings };
}

export let WIND = {
  FORCE: new Vector(0, 0.05),
  ENABLED: false,
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
  TRAIL: "#ffffff",
};

export let CURRENT_THEME: Theme = getTheme("default");

let colorIndex = 0;
const objectColorMap = new Map<object, string>();

export function getNextObjectColor(object: object): string {
  if (objectColorMap.has(object)) {
    return objectColorMap.get(object)!;
  }

  const color =
    CURRENT_THEME.objectPalette[
      colorIndex % CURRENT_THEME.objectPalette.length
    ];
  colorIndex++;
  objectColorMap.set(object, color);
  return color;
}

export function resetObjectColors() {
  colorIndex = 0;
  objectColorMap.clear();
}

export function applyColorTheme(themeName: string) {
  CURRENT_THEME = getTheme(themeName);

  COLORS.BACKGROUND = CURRENT_THEME.background;
  COLORS.BOX = CURRENT_THEME.box;
  COLORS.HEXAGON = CURRENT_THEME.hexagon;
  COLORS.PARTICLE = CURRENT_THEME.particle;
  COLORS.BOUNDARY = CURRENT_THEME.boundary;
  COLORS.CONTACT_POINT = CURRENT_THEME.contactPoint;
  COLORS.VELOCITY_VECTOR = CURRENT_THEME.velocityVector;
  COLORS.ANGULAR_VECTOR = CURRENT_THEME.angularVector;
  COLORS.TRAIL = CURRENT_THEME.trail;

  resetObjectColors();
}

export const CANVAS = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
} as const;

export const CALMNESS_MESSAGES = {
  Low: {
    Stable: "And all was still",
    Dynamic: "I see traces of motion...",
    Turbulent: "Just you wait a moment",
  },
  Moderate: {
    Stable: "A little motion, not too much",
    Dynamic: "Right in the middle",
    Turbulent: "The chaos takes a breath",
  },
  High: {
    Stable: "Find stability in the chaos",
    Dynamic: "Just a step away",
    Turbulent: "WHOAH",
  },
} as const;
