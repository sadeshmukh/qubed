import { drawCircle } from "../rendering/DrawingUtils";
import { Vector } from "./Vector";

// rigidbody physics

export class Object {
  constructor(public position: Vector) {}

  update(dt: number) {}

  draw(ctx: CanvasRenderingContext2D) {
    // by default draw red circle
    drawCircle(ctx, this.position.x, this.position.y, 10, "red");
  }
}
