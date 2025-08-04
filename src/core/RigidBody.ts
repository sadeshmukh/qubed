import { Object } from "./Object";
import { Vector } from "./Vector";
import { PHYSICS, COLORS } from "../utils/Constants";
import { drawVector, drawLine } from "../rendering/DrawingUtils";
import { Collidable } from "./Collidable";

export class RigidBody extends Object implements Collidable {
  velocity: Vector;
  rotation: number;
  public angularVelocity: number;
  mass: number;
  momentOfInertia: number;
  private forceAccumulator: Vector;
  private torqueAccumulator: number;
  debugMode: boolean = false;
  private contactPoints: Vector[] = [];

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
    this.forceAccumulator = this.forceAccumulator.add(force);
  }

  applyForceAtPoint(force: Vector, point: Vector): void {
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

  applyImpulseAtPoint(impulse: Vector, point: Vector): void {
    this.velocity = this.velocity.add(impulse.divide(this.mass));
    const r = point.subtract(this.position);
    const torque = r.cross(impulse);
    this.angularVelocity += torque / this.momentOfInertia;
  }

  applyAngularImpulse(angularImpulse: number): void {
    this.angularVelocity += angularImpulse / this.momentOfInertia;
  }

  applyRotationImpulse(targetRotationRadians: number): void {
    const requiredAngularVelocity = targetRotationRadians * 60;
    const angularImpulse = requiredAngularVelocity * this.momentOfInertia;
    this.applyAngularImpulse(angularImpulse);
  }

  rotate(radians: number): void {
    this.rotation += radians;
  }

  integrate(dt: number): void {
    const clampedDeltaTime = Math.min(dt, 1 / 120);

    const scaledForce = this.forceAccumulator.multiply(PHYSICS.FORCE_SCALE);
    const scaledTorque = this.torqueAccumulator * PHYSICS.TORQUE_SCALE;

    const acceleration = scaledForce.divide(this.mass);
    const angularAcceleration = scaledTorque / this.momentOfInertia;

    this.velocity = this.velocity.add(acceleration.multiply(clampedDeltaTime));
    this.angularVelocity += angularAcceleration * clampedDeltaTime;

    this.position = this.position.add(this.velocity.multiply(clampedDeltaTime));
    this.rotation += this.angularVelocity * clampedDeltaTime;

    // Apply air resistance properly as a damping force over time
    const airResistanceCoeff = 1 - (1 - PHYSICS.AIR_RESISTANCE) * clampedDeltaTime * 60;
    this.velocity = this.velocity.multiply(airResistanceCoeff);
    
    const angularDampingCoeff = 1 - (1 - PHYSICS.ANGULAR_DAMPING) * clampedDeltaTime * 60;
    this.angularVelocity *= angularDampingCoeff;

    const velocityMagnitude = this.velocity.magnitude();
    if (velocityMagnitude > PHYSICS.MAX_VELOCITY) {
      this.velocity = this.velocity.multiply(
        PHYSICS.MAX_VELOCITY / velocityMagnitude
      );
    }

    if (Math.abs(this.angularVelocity) > PHYSICS.MAX_ANGULAR_VELOCITY) {
      this.angularVelocity =
        Math.sign(this.angularVelocity) * PHYSICS.MAX_ANGULAR_VELOCITY;
    }

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

  getCollisionPoints(): Vector[] {
    return [this.position];
  }

  getBoundingBox(): { min: Vector; max: Vector } {
    const points = this.getCollisionPoints();
    let minX = points[0].x,
      minY = points[0].y;
    let maxX = points[0].x,
      maxY = points[0].y;

    for (const point of points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      min: new Vector(minX, minY),
      max: new Vector(maxX, maxY),
    };
  }

  getPosition(): Vector {
    return this.position;
  }

  getVelocity(): Vector {
    return this.velocity;
  }

  move(delta: Vector): void {
    this.position = this.position.add(delta);
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

  setContactPoints(points: Vector[]): void {
    this.contactPoints = points;
  }

  clearContactPoints(): void {
    this.contactPoints = [];
  }

  update(dt: number): void {
    this.integrate(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawShape(ctx);
    if (this.debugMode) {
      this.drawDebugVectors(ctx);
    }
  }

  protected drawShape(ctx: CanvasRenderingContext2D): void {
    super.draw(ctx);
  }

  private drawDebugVectors(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (this.velocity.magnitude() > 0.01) {
      drawVector(ctx, this.velocity, COLORS.VELOCITY_VECTOR, 2, "length");
    }

    if (Math.abs(this.angularVelocity) > 0.001) {
      const radius = 15;
      const arcLength = Math.min(Math.abs(this.angularVelocity) * 2, Math.PI);

      ctx.strokeStyle = COLORS.ANGULAR_VECTOR;
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

    for (const contactPoint of this.contactPoints) {
      ctx.fillStyle = COLORS.CONTACT_POINT;
      ctx.beginPath();
      ctx.arc(contactPoint.x, contactPoint.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // glow
      ctx.shadowColor = COLORS.CONTACT_POINT;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
