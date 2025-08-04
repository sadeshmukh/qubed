import { RigidBody } from "../core/RigidBody";
import { Vector } from "../core/Vector";
import { drawPolygon, Point } from "../rendering/DrawingUtils";
import { getNextObjectColor } from "../utils/Constants";

export class NGon extends RigidBody {
  static readonly TYPE = "NGon";
  radius: number;
  sides: number;

  constructor(
    mass: number,
    position: Vector,
    radius: number,
    sides: number,
    rotation: number = 0
  ) {
    if (sides < 3) {
      throw new Error("NGon must have at least 3 sides");
    }

    const momentOfInertia = (1 / 2) * mass * radius * radius;
    super(mass, momentOfInertia, position, rotation);
    this.radius = radius;
    this.sides = sides;
  }

  getType(): string {
    return NGon.TYPE;
  }

  drawShape(ctx: CanvasRenderingContext2D) {
    const color = getNextObjectColor(this);
    drawPolygon(ctx, this.getPoints(), color, 3, true);
  }

  getPoints(): Point[] {
    const points: Point[] = [];
    const angleStep = (2 * Math.PI) / this.sides;

    for (let i = 0; i < this.sides; i++) {
      const angle = i * angleStep;
      const localPoint = new Vector(
        Math.cos(angle) * this.radius,
        Math.sin(angle) * this.radius
      );
      const worldPoint = this.getWorldPoint(localPoint);
      points.push({ x: worldPoint.x, y: worldPoint.y });
    }

    return points;
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
      const projection = points[i].dot(axis);
      if (projection < min) {
        min = projection;
      }
      if (projection > max) {
        max = projection;
      }
    }

    return { min, max };
  }

  contains(point: Vector): boolean {
    const points = this.getCollisionPoints();
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const pi = points[i];
      const pj = points[j];

      if (
        pi.y > point.y !== pj.y > point.y &&
        point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x
      ) {
        inside = !inside;
      }
    }

    return inside;
  }
}
