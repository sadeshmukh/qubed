import { Vector } from "./Vector";

export interface CollisionInfo {
  normal: Vector;
  penetration: number;
  contactPoint: Vector;
}

export interface Collidable {
  getCollisionPoints(): Vector[];
  getBoundingBox(): { min: Vector; max: Vector };
  getPosition(): Vector;
  getVelocity(): Vector;
  applyImpulse(impulse: Vector): void;
  move(delta: Vector): void;
}
