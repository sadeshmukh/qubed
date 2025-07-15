import { PhysicsObject } from "../core/Object";

export interface ForceGenerator {
  applyForce(objects: PhysicsObject[]): void;
}
