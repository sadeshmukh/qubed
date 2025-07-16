import { RigidBody } from "../core/RigidBody";
import { Vector } from "../core/Vector";
import { drawPolygon, Point } from "../rendering/DrawingUtils";

export class Box extends RigidBody {
  width: number;
  height: number;

  constructor(
    mass: number,
    position: Vector,
    width: number,
    height: number,
    rotation: number = 0
  ) {
    const momentOfInertia = (1 / 12) * mass * (width ** 2 + height ** 2);
    super(mass, momentOfInertia, position, rotation);
    this.width = width;
    this.height = height;
  }

  drawShape(ctx: CanvasRenderingContext2D) {
    drawPolygon(ctx, this.getPoints(), "blue", 2, true);
  }

  getPoints(): Point[] {
    const points = [
      { x: -this.width / 2, y: -this.height / 2 },
      { x: this.width / 2, y: -this.height / 2 },
      { x: this.width / 2, y: this.height / 2 },
      { x: -this.width / 2, y: this.height / 2 },
    ];
    return points.map((point) =>
      this.getWorldPoint(new Vector(point.x, point.y))
    );
  }

  getCollisionPoints(): Vector[] {
    return this.getPoints().map((point) => new Vector(point.x, point.y));
  }
}
