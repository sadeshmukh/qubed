import { Object } from "./Object";
import { Vector } from "./Vector";
import { PHYSICS } from "../utils/Constants";
import { drawVector, drawLine } from "../rendering/DrawingUtils";

export class RigidBody extends Object {
  // position: Vector;
  velocity: Vector;

  rotation: number;
  angularVelocity: number;

  mass: number;
  momentOfInertia: number; // inertial resistance

  private forceAccumulator: Vector;
  private torqueAccumulator: number;

  debugMode: boolean = false;

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

  applyImpulse(impulse: Vector): void {
    this.velocity = this.velocity.add(impulse.divide(this.mass));
  }

  applyAngularImpulse(angularImpulse: number): void {
    // J = angular impulse, ω = ω + J/I
    this.angularVelocity += angularImpulse / this.momentOfInertia;
  }

  applyRotationImpulse(targetRotationRadians: number): void {
    const requiredAngularVelocity = targetRotationRadians * 60; // Scale for reasonable speed
    const angularImpulse = requiredAngularVelocity * this.momentOfInertia;
    this.applyAngularImpulse(angularImpulse);
  }

  rotate(radians: number): void {
    this.rotation += radians;
  }

  integrate(dt: number): void {
    // large timesteps cause instability
    const clampedDeltaTime = Math.min(dt, 1 / 120); // Max 120 FPS minimum

    const scaledForce = this.forceAccumulator.multiply(PHYSICS.FORCE_SCALE);
    const scaledTorque = this.torqueAccumulator * PHYSICS.TORQUE_SCALE;

    const acceleration = scaledForce.divide(this.mass); // a = F/m
    const angularAcceleration = scaledTorque / this.momentOfInertia; // α = torque/I

    this.velocity = this.velocity.add(acceleration.multiply(clampedDeltaTime)); // v = v + at
    this.angularVelocity += angularAcceleration * clampedDeltaTime;
    // friction damping?
    // this.velocity = this.velocity.multiply(0.999);
    // this.angularVelocity *= 0.999;

    this.position = this.position.add(this.velocity.multiply(clampedDeltaTime));
    this.rotation += this.angularVelocity * clampedDeltaTime;

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

  getForceAccumulator(): Vector {
    return this.forceAccumulator;
  }

  getTorqueAccumulator(): number {
    return this.torqueAccumulator;
  }

  reset(position: Vector, rotation: number = 0): void {
    this.position = position;
    this.velocity = new Vector();
    this.rotation = rotation;
    this.angularVelocity = 0;
    this.forceAccumulator = new Vector();
    this.torqueAccumulator = 0;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  update(dt: number): void {
    this.integrate(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // draw shape to be overridden by subclasses
    this.drawShape(ctx);

    if (this.debugMode) {
      this.drawDebugVectors(ctx);
    }
  }

  // override this method in subclasses to draw the actual shape
  protected drawShape(ctx: CanvasRenderingContext2D): void {
    super.draw(ctx);
  }

  private drawDebugVectors(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (this.velocity.magnitude() > 0.01) {
      drawVector(ctx, this.velocity, "lime", 2, "length");
    }

    if (Math.abs(this.angularVelocity) > 0.001) {
      const radius = 15;
      const arcLength = Math.min(Math.abs(this.angularVelocity) * 2, Math.PI);

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.angularVelocity > 0) {
        ctx.arc(0, 0, radius, 0, arcLength);
      } else {
        ctx.arc(0, 0, radius, 0, -arcLength);
      }
      ctx.stroke();

      const arrowAngle = this.angularVelocity > 0 ? arcLength : -arcLength;
      const arrowX = Math.cos(arrowAngle) * radius;
      const arrowY = Math.sin(arrowAngle) * radius;

      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - Math.cos(arrowAngle - 0.3) * 5,
        arrowY - Math.sin(arrowAngle - 0.3) * 5
      );
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - Math.cos(arrowAngle + 0.3) * 5,
        arrowY - Math.sin(arrowAngle + 0.3) * 5
      );
      ctx.stroke();
    }

    ctx.restore();
  }
}
