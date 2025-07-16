import { World } from "./simulation/World";
import { Box } from "./shapes/Box";
import { Vector } from "./core/Vector";
import { Wall } from "./shapes/Wall";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

const fpsValueElement = document.getElementById("fps-value") as HTMLSpanElement;

let squareSize = Math.min(window.innerWidth, window.innerHeight);
let isSetupComplete = false;
let box1: Box;
let box2: Box;
let world: World;

function setupCanvas(callback: () => void) {
  canvas.width = squareSize;
  canvas.height = squareSize;
  canvas.style.width = squareSize + "px";
  canvas.style.height = squareSize + "px";
  requestAnimationFrame(() => {
    callback();
  });
}

function setupPhysics() {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not found");
  }

  world = new World();
  world.setContext(ctx);

  box1 = new Box(2, new Vector(200, 800), 80, 50);
  box2 = new Box(2, new Vector(750, 600), 60, 60);

  box1.setDebugMode(true);
  box2.setDebugMode(true);

  world.addObject(box1);
  world.addObject(box2);

  const wallThickness = 50;
  const margin = wallThickness / 2;

  const leftWall = new Wall(
    new Vector(margin, margin),
    new Vector(margin, world.worldHeight - margin),
    wallThickness
  );
  const rightWall = new Wall(
    new Vector(world.worldWidth - margin, margin),
    new Vector(world.worldWidth - margin, world.worldHeight - margin),
    wallThickness
  );
  const topWall = new Wall(
    new Vector(margin, margin),
    new Vector(world.worldWidth - margin, margin),
    wallThickness
  );
  const bottomWall = new Wall(
    new Vector(margin, world.worldHeight - margin),
    new Vector(world.worldWidth - margin, world.worldHeight - margin),
    wallThickness
  );

  world.addWall(leftWall);
  world.addWall(rightWall);
  world.addWall(topWall);
  world.addWall(bottomWall);

  resetPhysics();
  isSetupComplete = true;
}

function resetPhysics() {
  if (!box1 || !box2) return;

  box1.reset(new Vector(200, 800), 0);
  box2.reset(new Vector(750, 800), 0);

  box1.applyImpulse(new Vector(-10000, 0));
  box2.rotate(Math.PI / 8);
  box1.applyRotationImpulse(Math.PI / 64);
}

window.addEventListener("resize", () => {
  squareSize = Math.min(window.innerWidth, window.innerHeight);
  setupCanvas(() => {});
});

let lastTime = performance.now();
let frameCount = 0;
const FIXED_TIMESTEP = 1 / 60;

function update(currentTime: number, tick: number): void {
  tick++;

  if (!isSetupComplete) {
    requestAnimationFrame((currentTime) => update(currentTime, tick));
    return;
  }

  let deltaTime: number;

  if (frameCount < 3) {
    deltaTime = FIXED_TIMESTEP;
  } else {
    deltaTime = (currentTime - lastTime) / 1000;
    deltaTime = Math.min(deltaTime, FIXED_TIMESTEP * 2);
    deltaTime = Math.max(deltaTime, FIXED_TIMESTEP / 2);
  }

  lastTime = currentTime;
  frameCount++;

  if (tick % 30 === 0) {
    fpsValueElement.textContent = Math.round(1 / deltaTime).toString();
  }
  world.update(deltaTime);
  requestAnimationFrame((currentTime) => update(currentTime, tick));
}

setupCanvas(() => {
  setupPhysics();
  requestAnimationFrame((currentTime) => update(currentTime, 0));
});
