import { ForceGenerator } from "../ForceGenerator";
import { PhysicsObject } from "../../core/Object";

export class FrictionForce implements ForceGenerator {
  private coefficient: number;

  constructor(coefficient: number = 0.01) {
    this.coefficient = coefficient;
  }

  applyForce(objects: PhysicsObject[]): void {
    objects.forEach((obj) => {
      const velocity = obj.getVelocity();
      const friction = velocity.multiply(-this.coefficient);
      obj.applyForce(friction);
    });
  }

  setCoefficient(coefficient: number): void {
    this.coefficient = coefficient;
  }

  getCoefficient(): number {
    return this.coefficient;
  }
}
