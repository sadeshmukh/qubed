import { Object } from "./Object";
import { Vector } from "./Vector";

export class RigidBody extends Object {
  // position: Vector;
  velocity: Vector;

  rotation: number;
  angularVelocity: number;

  mass: number;
  momentOfInertia: number; // inertial resistance

  private forceAccumulator: Vector;
  private torqueAccumulator: number;

  constructor(
    mass: number,
    momentOfInertia: number,
    position: Vector = new Vector(),
    rotation: number = 0
  ) {
    super(position);

    this.position = position;
    this.velocity = new Vector();

    this.rotation = rotation;
    this.angularVelocity = 0;

    this.mass = mass;
    this.momentOfInertia = momentOfInertia;

    this.forceAccumulator = new Vector();
    this.torqueAccumulator = 0;
  }

  applyForce(force: Vector): void {
    // apply at center of mass w/o rotation
    this.forceAccumulator = this.forceAccumulator.add(force);
  }

  applyForceAtPoint(force: Vector, point: Vector): void {
    // apply with rotation about point
    this.forceAccumulator = this.forceAccumulator.add(force);

    const r = point.subtract(this.position);
    const torque = r.cross(force);
    this.torqueAccumulator += torque;
  }

  applyTorque(torque: number): void {
    this.torqueAccumulator += torque;
  }

  integrate(deltaTime: number): void {
    const acceleration = this.forceAccumulator.divide(this.mass); // a = F/m
    const angularAcceleration = this.torqueAccumulator / this.momentOfInertia; // α = torque/I

    this.velocity = this.velocity.add(acceleration.multiply(deltaTime)); // v = v + at
    this.angularVelocity += angularAcceleration * deltaTime;

    this.position = this.position.add(this.velocity.multiply(deltaTime));
    this.rotation += this.angularVelocity * deltaTime;

    this.forceAccumulator = new Vector();
    this.torqueAccumulator = 0;
  }

  getWorldPoint(localPoint: Vector): Vector {
    const rotatedPoint = localPoint.rotate(this.rotation);
    return this.position.add(rotatedPoint);
  }

  getPointVelocity(worldPoint: Vector): Vector {
    const r = worldPoint.subtract(this.position);
    const tangentialVelocity = new Vector(-r.y, r.x).multiply(
      this.angularVelocity
    );
    return this.velocity.add(tangentialVelocity);
  }
}
