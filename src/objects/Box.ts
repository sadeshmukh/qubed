import { PhysicsObject } from "../core/Object";
import { Vector } from "../core/Vector";
import { Circle } from "./Circle";

export class Box extends PhysicsObject {
  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  checkCollision(other: PhysicsObject): boolean {
    if (other instanceof Box) {
      return this.checkBoxToBox(other);
    } else if (other instanceof Circle) {
      return this.checkBoxToCircle(other);
    } else {
      // Fallback to treating unknown objects as circles
      return this.checkBoxToCircleFallback(other);
    }
  }

  private checkBoxToBox(other: Box): boolean {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }

  private checkBoxToCircle(circle: Circle): boolean {
    const circleCenter = circle.getCenter();

    // Find closest point on box to circle center
    const closestX = Math.max(
      this.x,
      Math.min(circleCenter.x, this.x + this.width)
    );
    const closestY = Math.max(
      this.y,
      Math.min(circleCenter.y, this.y + this.height)
    );

    // Calculate distance between circle center and closest point
    const dx = circleCenter.x - closestX;
    const dy = circleCenter.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < circle.getCollisionRadius();
  }

  private checkBoxToCircleFallback(other: PhysicsObject): boolean {
    const otherCenter = other.getCenter();

    // Find closest point on box to other object's center
    const closestX = Math.max(
      this.x,
      Math.min(otherCenter.x, this.x + this.width)
    );
    const closestY = Math.max(
      this.y,
      Math.min(otherCenter.y, this.y + this.height)
    );

    // Calculate distance between other object's center and closest point
    const dx = otherCenter.x - closestX;
    const dy = otherCenter.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < other.getCollisionRadius();
  }

  getCollisionRadius(): number {
    return Math.sqrt(this.width * this.width + this.height * this.height) / 2;
  }
}
