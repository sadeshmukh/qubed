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

  getAxes(): Vector[] {
    const points = this.getPoints();
    const axes: Vector[] = [];
    for (let i = 0; i < points.length; i++) {
      const p1 = new Vector(points[i].x, points[i].y);
      const p2 = new Vector(
        points[(i + 1) % points.length].x,
        points[(i + 1) % points.length].y
      );
      const edge = p2.subtract(p1);
      axes.push(edge.perpendicular().normalize());
    }
    return axes;
  }

  project(axis: Vector): { min: number; max: number } {
    const points = this.getCollisionPoints();
    let min = points[0].dot(axis);
    let max = min;
    for (let i = 1; i < points.length; i++) {
      const p = points[i].dot(axis);
      if (p < min) {
        min = p;
      } else if (p > max) {
        max = p;
      }
    }
    return { min, max };
  }

  contains(point: Vector): boolean {
    const localPoint = point.subtract(this.position).rotate(-this.rotation);
    return (
      Math.abs(localPoint.x) <= this.width / 2 &&
      Math.abs(localPoint.y) <= this.height / 2
    );
  }
}
