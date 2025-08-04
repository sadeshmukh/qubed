import { World } from "./simulation/NewWorld";
import { Box } from "./shapes/Box";
import { Vector } from "./core/Vector";
import { Wall } from "./shapes/Wall";
import { NGon } from "./shapes/NGon";
import { WORLD } from "./utils/Constants";

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
let pentagon: NGon;
let hexagon: NGon;
let triangle: NGon;
let manysided: NGon;

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
  world.setScreenSize(squareSize, squareSize);

  box1 = new Box(2, new Vector(200, 200), 80, 50);
  box2 = new Box(2, new Vector(750, 200), 60, 60);
  pentagon = new NGon(1.5, new Vector(300, 500), 40, 5);
  hexagon = new NGon(1.8, new Vector(600, 400), 35, 6);
  triangle = new NGon(1.5, new Vector(500, 500), 30, 3);
  manysided = new NGon(1.5, new Vector(700, 500), 30, 10);

  // box1.setDebugMode(true);
  // box2.setDebugMode(true);
  // pentagon.setDebugMode(true);
  // hexagon.setDebugMode(true);
  // triangle.setDebugMode(true);

  world.addObject(box1);
  world.addObject(box2);
  world.addObject(pentagon);
  world.addObject(hexagon);
  world.addObject(manysided);
  world.addObject(triangle);
  box1.applyImpulse(new Vector(-500, 0));
  box2.rotate(Math.PI / 8);
  box1.applyRotationImpulse(Math.PI / 64);
  pentagon.applyImpulse(new Vector(4000, -2000));
  hexagon.applyImpulse(new Vector(2000, -1000));
  hexagon.applyRotationImpulse(Math.PI / 32);

  const wallThickness = WORLD.WALL_THICKNESS;
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

  world.setupControlPanel();
  isSetupComplete = true;
}

window.addEventListener("resize", () => {
  squareSize = Math.min(window.innerWidth, window.innerHeight);
  if (world) {
    world.setScreenSize(squareSize, squareSize);
  }
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
