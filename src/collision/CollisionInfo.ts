import { Vector } from "../core/Vector";
import { RigidBody } from "../core/RigidBody";

export class CollisionInfo {
  public bodyA: RigidBody;
  public bodyB: RigidBody;
  public contactPoint: Vector;
  public normal: Vector;
  public penetrationDepth: number;

  constructor(
    bodyA: RigidBody,
    bodyB: RigidBody,
    contactPoint: Vector,
    normal: Vector,
    penetrationDepth: number
  ) {
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.contactPoint = contactPoint;
    this.normal = normal;
    this.penetrationDepth = penetrationDepth;
  }
}
