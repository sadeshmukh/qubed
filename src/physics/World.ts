import { PhysicsObject } from "../core/Object";
import { PhysicsEngine } from "./PhysicsEngine";

export class World {
  private objects: PhysicsObject[] = [];
  private physicsEngine: PhysicsEngine;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number;

  constructor(canvas: HTMLCanvasElement, size: number) {
    this.canvas = canvas;
    this.size = size;
    this.physicsEngine = new PhysicsEngine();

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(
        "Failed to get canvas context - canvas most likely does not exist"
      );
    }
    this.ctx = context;
  }

  addObject(object: PhysicsObject): void {
    this.objects.push(object);
    this.physicsEngine.addObject(object);
  }

  removeObject(object: PhysicsObject): void {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
      this.physicsEngine.removeObject(object);
    }
  }

  update(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.physicsEngine.update();
    this.objects.forEach((object) => {
      object.draw(this.ctx);
    });
  }

  updateSize(newSize: number): void {
    this.size = newSize;
  }

  getObjects(): PhysicsObject[] {
    return this.objects;
  }

  getPhysicsEngine(): PhysicsEngine {
    return this.physicsEngine;
  }
}
