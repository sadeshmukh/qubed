import { ForceGenerator } from "../ForceGenerator";
import { PhysicsObject } from "../../core/Object";
import { Vector } from "../../core/Vector";

export class WindForce implements ForceGenerator {
  private wind: Vector;

  constructor(wind: Vector) {
    this.wind = wind;
  }

  applyForce(objects: PhysicsObject[]): void {
    objects.forEach((obj) => {
      obj.applyForce(this.wind);
    });
  }

  setWind(wind: Vector): void {
    this.wind = wind;
  }

  getWind(): Vector {
    return this.wind;
  }
}
