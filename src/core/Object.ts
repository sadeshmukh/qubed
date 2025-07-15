import { Vector } from "./Vector";
import { drawPolygon } from "../rendering/DrawingUtils";

export abstract class PhysicsObject {
  protected position: Vector;
  protected velocity: Vector;
  protected mass: number;
  protected width: number;
  protected height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.position = new Vector(x, y);
    this.velocity = new Vector(0, 0);
    this.mass = 1;
    this.width = width;
    this.height = height;
  }

  get x(): number {
    return this.position.x;
  }

  set x(value: number) {
    this.position.x = value;
  }

  get y(): number {
    return this.position.y;
  }

  set y(value: number) {
    this.position.y = value;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const points = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height },
    ];
    drawPolygon(ctx, points, "red", 2, true);
  }

  update(): void {
    // stop micro-movements
    if (Math.abs(this.velocity.x) < 0.01) {
      this.velocity.x = 0;
    }
    if (Math.abs(this.velocity.y) < 0.05) {
      this.velocity.y = 0;
    }

    this.x += this.velocity.x;
    this.y += this.velocity.y;
  }

  abstract checkCollision(other: PhysicsObject): boolean;

  applyForce(force: Vector): void {
    this.velocity = this.velocity.add(force.divide(this.mass));
  }

  getVelocity(): Vector {
    return this.velocity;
  }

  setVelocity(velocity: Vector): void {
    this.velocity = velocity;
  }

  getMass(): number {
    return this.mass;
  }

  setMass(mass: number): void {
    this.mass = mass;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getMomentum(): Vector {
    return this.velocity.multiply(this.mass);
  }

  getCollisionRadius(): number {
    return Math.max(this.width, this.height) / 2;
  }

  getCenter(): Vector {
    return new Vector(this.x + this.width / 2, this.y + this.height / 2);
  }
}
