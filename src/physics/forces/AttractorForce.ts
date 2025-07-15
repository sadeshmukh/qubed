import { ForceGenerator } from "../ForceGenerator";
import { PhysicsObject } from "../../core/Object";
import { Vector } from "../../core/Vector";

export class AttractorForce implements ForceGenerator {
  private center: Vector;
  private strength: number;
  private minDistance: number;

  constructor(
    center: Vector,
    strength: number = 0.1,
    minDistance: number = 20
  ) {
    this.center = center;
    this.strength = strength;
    this.minDistance = minDistance;
  }

  applyForce(objects: PhysicsObject[]): void {
    objects.forEach((obj) => {
      const objPos = new Vector(obj.x, obj.y);
      const direction = this.center.subtract(objPos);
      const distance = Math.max(direction.magnitude(), this.minDistance);

      if (distance > 0) {
        const force = direction.normalize().multiply(this.strength / distance);
        obj.applyForce(force);
      }
    });
  }

  setCenter(center: Vector): void {
    this.center = center;
  }

  getCenter(): Vector {
    return this.center;
  }

  setStrength(strength: number): void {
    this.strength = strength;
  }

  getStrength(): number {
    return this.strength;
  }
}
