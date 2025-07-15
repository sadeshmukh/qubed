import { World } from "./simulation/World";
import { Box } from "./shapes/Box";
import { Vector } from "./core/Vector";

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

  // wait one frame
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

  // 1000X1000 world coords
  box1 = new Box(1, new Vector(200, 800), 80, 50);
  box2 = new Box(2, new Vector(750, 600), 60, 60);

  box1.setDebugMode(true);
  box2.setDebugMode(true);

  world.addObject(box1);
  world.addObject(box2);

  resetPhysics();
  isSetupComplete = true;
}

function resetPhysics() {
  if (!box1 || !box2) return;

  box1.reset(new Vector(200, 800), 0);
  box2.reset(new Vector(750, 600), 0);

  box1.applyImpulse(new Vector(50, 0));
  // box2.rotate(Math.PI / 4);

  box2.applyRotationImpulse(Math.PI / 16);
  // alternative:
  // box2.applyRotationImpulse(Math.PI / 4); // rotate exactly pi/4 rad
  // box2.applyAngularImpulse(10); // direct angular velocity change
}

window.addEventListener("resize", () => {
  squareSize = Math.min(window.innerWidth, window.innerHeight);
  setupCanvas(() => {});
});

let lastTime = performance.now();
let frameCount = 0;
const FIXED_TIMESTEP = 1 / 60; // 60 FPS as baseline

function update(currentTime: number): void {
  if (!isSetupComplete) {
    requestAnimationFrame(update);
    return;
  }

  let deltaTime: number;

  if (frameCount < 3) {
    // use fixed timestep for first few frames to ensure consistency
    deltaTime = FIXED_TIMESTEP;
  } else {
    deltaTime = (currentTime - lastTime) / 1000;
    deltaTime = Math.min(deltaTime, FIXED_TIMESTEP * 2); // max 2x normal timestep
    deltaTime = Math.max(deltaTime, FIXED_TIMESTEP / 2); // min 0.5x normal timestep
  }

  lastTime = currentTime;
  frameCount++;

  fpsValueElement.textContent = Math.round(1 / deltaTime).toString();

  world.tick(deltaTime);
  requestAnimationFrame(update);
}

setupCanvas(() => {
  setupPhysics();
  requestAnimationFrame((currentTime) => update(currentTime));
});
