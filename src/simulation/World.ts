import { Object } from "../core/Object";

export class World {
  objects: Object[] = [];
  ctx: CanvasRenderingContext2D | null = null;

  worldWidth: number = 1000;
  worldHeight: number = 1000;

  addObject(object: Object) {
    this.objects.push(object);
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  tick(dt: number) {
    this.updateObjects(dt);
    this.render();
  }

  updateObjects(dt: number) {
    for (const object of this.objects) {
      object.update(dt);
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // flip y axis for bottom-up canvas
    this.ctx.save();
    this.ctx.translate(0, this.ctx.canvas.height);
    this.ctx.scale(1, -1);

    this.ctx.scale(
      this.ctx.canvas.width / this.worldWidth,
      this.ctx.canvas.height / this.worldHeight
    );

    for (const object of this.objects) {
      object.draw(this.ctx);
    }

    this.ctx.restore();
  }
}
