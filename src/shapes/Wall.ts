import { Vector } from "../core/Vector";
import { drawPolygon, Point } from "../rendering/DrawingUtils";
import { RigidBody } from "../core/RigidBody";
import { COLORS } from "../utils/Constants";

export class Wall extends RigidBody {
  start: Vector;
  end: Vector;
  thickness: number;
  private normal: Vector;

  constructor(start: Vector, end: Vector, thickness: number = 10) {
    const wallVector = end.subtract(start);
    const position = start.add(wallVector.multiply(0.5));
    super(Number.MAX_VALUE, Number.MAX_VALUE, position);
    this.start = start;
    this.end = end;
    this.thickness = thickness;
    this.normal = wallVector.perpendicular().normalize();
  }
  drawShape(ctx: CanvasRenderingContext2D) {
    drawPolygon(ctx, this.getPoints(), COLORS.BOUNDARY, 2, true);
  }

  getNormal(): Vector {
    return this.normal;
  }
  getPoints(): Point[] {
    const wallVector = this.end.subtract(this.start);
    const halfThickness = this.thickness / 2;

    const p1 = this.start.add(this.normal.multiply(halfThickness));
    const p2 = this.end.add(this.normal.multiply(halfThickness));
    const p3 = this.end.subtract(this.normal.multiply(halfThickness));
    const p4 = this.start.subtract(this.normal.multiply(halfThickness));

    return [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p3.x, y: p3.y },
      { x: p4.x, y: p4.y },
    ];
  }
}
