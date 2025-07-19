import { drawCircle } from "../rendering/DrawingUtils";
import { Vector } from "./Vector";

export class Object {
  constructor(public position: Vector) {}

  update(dt: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    drawCircle(ctx, this.position, 10, "red");
  }
}
