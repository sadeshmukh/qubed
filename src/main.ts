import { World } from "./physics/World";
import { Box, Circle } from "./objects";
import { Vector } from "./core/Vector";
import { GravityForce, FrictionForce, BoundaryForce } from "./physics/forces";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

let squareSize = Math.min(window.innerWidth, window.innerHeight);

canvas.width = squareSize;
canvas.height = squareSize;
canvas.style.width = squareSize + "px";
canvas.style.height = squareSize + "px";

const world = new World(canvas, squareSize);
const physicsEngine = world.getPhysicsEngine();

window.addEventListener("resize", () => {
  squareSize = Math.min(window.innerWidth, window.innerHeight);

  canvas.width = squareSize;
  canvas.height = squareSize;
  canvas.style.width = squareSize + "px";
  canvas.style.height = squareSize + "px";

  world.updateSize(squareSize);

  const boundary = physicsEngine
    .getForceGenerators()
    .find((f) => f.constructor.name === "BoundaryForce") as any;
  if (boundary && boundary.setBounds) {
    boundary.setBounds(squareSize, squareSize);
  }
});

// end boilerplate

const gravity = new GravityForce(new Vector(0, 0.1));
const friction = new FrictionForce(0.005);
const boundary = new BoundaryForce(squareSize, squareSize, 0.6);

physicsEngine.addForceGenerator(gravity);
// physicsEngine.addForceGenerator(friction);
physicsEngine.addForceGenerator(boundary);

// boxes
for (let i = 0; i < 8; i++) {
  const size = 25 + Math.random() * 35;
  const box = new Box(
    Math.random() * (squareSize - size - 50) + 25,
    Math.random() * (squareSize / 2),
    size,
    size
  );

  box.setMass(size / 30);

  box.setVelocity(
    new Vector((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2)
  );
  world.addObject(box);
}

// circles
for (let i = 0; i < 3; i++) {
  const radius = 15 + Math.random() * 20;
  const circle = new Circle(
    Math.random() * (squareSize - radius * 2 - 50) + 25,
    Math.random() * (squareSize / 3),
    radius
  );
  circle.setMass(radius / 20);
  circle.setVelocity(
    new Vector((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2)
  );
  world.addObject(circle);
}

// BOUNCY
physicsEngine.setCollisionRestitution(0.8);

function update(): void {
  world.update();
  requestAnimationFrame(update);
}

canvas.addEventListener("click", (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (Math.random() > 0.5) {
    const size = 30 + Math.random() * 20;
    const newBox = new Box(mouseX - size / 2, mouseY - size / 2, size, size);
    newBox.setMass(size / 25);
    newBox.setVelocity(
      new Vector((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
    );
    world.addObject(newBox);
  } else {
    const radius = 15 + Math.random() * 15;
    const newCircle = new Circle(mouseX - radius, mouseY - radius, radius);
    newCircle.setMass(radius / 20);
    newCircle.setVelocity(
      new Vector((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
    );
    world.addObject(newCircle);
  }
});

document.addEventListener("keydown", (e: KeyboardEvent) => {
  switch (e.key.toLowerCase()) {
    case "d":
      physicsEngine.setCollisionDebugMode(
        !physicsEngine.getCollisionDebugMode()
      );
      console.log(
        `Debug mode: ${physicsEngine.getCollisionDebugMode() ? "ON" : "OFF"}`
      );
      break;
    case "1":
      physicsEngine.setCollisionRestitution(0.2);
      console.log("Low bounce");
      break;
    case "2":
      physicsEngine.setCollisionRestitution(0.6);
      console.log("Medium bounce");
      break;
    case "3":
      physicsEngine.setCollisionRestitution(0.95);
      console.log("High bounce");
      break;
  }
});

requestAnimationFrame(update);
