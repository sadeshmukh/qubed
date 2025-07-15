import { PhysicsObject } from "../core/Object";
import { Vector } from "../core/Vector";
import { drawCircle } from "../rendering/DrawingUtils";
import { Box } from "./Box";

export class Circle extends PhysicsObject {
  private radius: number;

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius * 2, radius * 2);
    this.radius = radius;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const centerX = this.x + this.radius;
    const centerY = this.y + this.radius;
    drawCircle(ctx, centerX, centerY, this.radius, "#ff6b6b", 2, true);
  }

  checkCollision(other: PhysicsObject): boolean {
    if (other instanceof Circle) {
      return this.checkCircleToCircle(other);
    } else if (other instanceof Box) {
      return this.checkCircleToBox(other);
    } else {
      // Fallback to circle-based collision
      return this.checkCircleToCircle(other);
    }
  }

  private checkCircleToCircle(other: PhysicsObject): boolean {
    const center1 = this.getCenter();
    const center2 = other.getCenter();
    const distance = center1.subtract(center2).magnitude();
    const combinedRadius = this.radius + other.getCollisionRadius();
    return distance < combinedRadius - 0.1; // prevent micro-collisions
  }

  private checkCircleToBox(box: Box): boolean {
    const circleCenter = this.getCenter();
    const boxCenter = box.getCenter();

    // find closest point on box to circle center
    const closestX = Math.max(
      box.x,
      Math.min(circleCenter.x, box.x + box.getWidth())
    );
    const closestY = Math.max(
      box.y,
      Math.min(circleCenter.y, box.y + box.getHeight())
    );

    // calculate distance between circle center and closest point
    const dx = circleCenter.x - closestX;
    const dy = circleCenter.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.radius - 0.1; // prevent micro-collisions
  }

  getRadius(): number {
    return this.radius;
  }

  getCollisionRadius(): number {
    return this.radius;
  }

  getCenter(): Vector {
    return new Vector(this.x + this.radius, this.y + this.radius);
  }
}
