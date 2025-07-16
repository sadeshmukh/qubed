import { Object } from "../core/Object";
import { Vector } from "../core/Vector";
import { drawLine } from "../rendering/DrawingUtils";
import { Collidable } from "../core/Collidable";

export class Wall extends Object implements Collidable {
  start: Vector;
  end: Vector;
  thickness: number;
  direction: Vector;

  constructor(
    start: Vector,
    end: Vector,
    thickness: number = 10,
    direction?: Vector
  ) {
    super(start);
    this.start = start;
    this.end = end;
    this.thickness = thickness;

    if (direction) {
      this.direction = direction.normalize();
    } else {
      const wallVector = this.end.subtract(this.start);
      this.direction = wallVector.normalize();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "#333";
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    drawLine(ctx, this.start.x, this.start.y, this.end.x, this.end.y);
  }

  drawContactPoint(ctx: CanvasRenderingContext2D, contactPoint: Vector) {
    const wallStart = this.start;
    const wallEnd = this.end;
    const wallVector = wallEnd.subtract(wallStart);
    const wallDir = wallVector.normalize();
    const wallLength = wallVector.magnitude();

    const rel = contactPoint.subtract(wallStart);
    const proj = rel.dot(wallDir);
    const clampedProj = Math.max(0, Math.min(wallLength, proj));
    const wallContactPoint = wallStart.add(wallDir.multiply(clampedProj));

    const segmentLength = this.thickness * 2;
    const segmentStart = wallContactPoint.subtract(
      wallDir.multiply(segmentLength / 2)
    );
    const segmentEnd = wallContactPoint.add(
      wallDir.multiply(segmentLength / 2)
    );

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    drawLine(ctx, segmentStart.x, segmentStart.y, segmentEnd.x, segmentEnd.y);
  }

  getNormal(): Vector {
    const normal = new Vector(-this.direction.y, this.direction.x);
    return normal.normalize();
  }

  getLength(): number {
    return this.end.subtract(this.start).magnitude();
  }

  getCollisionPoints(): Vector[] {
    return [this.start, this.end];
  }

  getBoundingBox(): { min: Vector; max: Vector } {
    const minX = Math.min(this.start.x, this.end.x);
    const minY = Math.min(this.start.y, this.end.y);
    const maxX = Math.max(this.start.x, this.end.x);
    const maxY = Math.max(this.start.y, this.end.y);

    return {
      min: new Vector(minX, minY),
      max: new Vector(maxX, maxY),
    };
  }

  getPosition(): Vector {
    return this.position;
  }

  getVelocity(): Vector {
    return new Vector(0, 0);
  }

  applyImpulse(impulse: Vector): void {}

  move(delta: Vector): void {}
}
