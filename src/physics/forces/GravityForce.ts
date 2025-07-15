import { ForceGenerator } from "../ForceGenerator";
import { PhysicsObject } from "../../core/Object";
import { Vector } from "../../core/Vector";

export class GravityForce implements ForceGenerator {
  private gravity: Vector;

  constructor(gravity: Vector = new Vector(0, 0.5)) {
    this.gravity = gravity;
  }

  applyForce(objects: PhysicsObject[]): void {
    objects.forEach((obj) => {
      obj.applyForce(this.gravity);
    });
  }

  setGravity(gravity: Vector): void {
    this.gravity = gravity;
  }

  getGravity(): Vector {
    return this.gravity;
  }
}
