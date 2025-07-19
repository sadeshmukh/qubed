import { Object } from "../core/Object";
import { RigidBody } from "../core/RigidBody";
import { Wall } from "../shapes/Wall";
import { Vector } from "../core/Vector";
import { CollisionSystem } from "../collision/CollisionSystem";
import { CollisionInfo } from "../collision/CollisionInfo";
import { WORLD, PHYSICS, WIND } from "../utils/Constants";

export class World {
  objects: Object[] = [];
  walls: Wall[] = [];
  ctx: CanvasRenderingContext2D | null = null;
  private contactPoints: Vector[] = [];
  private collisions: CollisionInfo[] = [];

  worldWidth: number = WORLD.COORDINATE_SYSTEM;
  worldHeight: number = WORLD.COORDINATE_SYSTEM;
  private screenWidth: number = WORLD.COORDINATE_SYSTEM;
  private screenHeight: number = WORLD.COORDINATE_SYSTEM;

  addObject(object: Object) {
    this.objects.push(object);
  }

  addWall(wall: Wall) {
    this.walls.push(wall);
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setScreenSize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  worldToScreen(worldPos: Vector): Vector {
    const x = (worldPos.x / this.worldWidth) * this.screenWidth;
    const y = (worldPos.y / this.worldHeight) * this.screenHeight;
    return new Vector(x, y);
  }

  screenToWorld(screenPos: Vector): Vector {
    const x = (screenPos.x / this.screenWidth) * this.worldWidth;
    const y = (screenPos.y / this.screenHeight) * this.worldHeight;
    return new Vector(x, y);
  }

  update(dt: number) {
    const clampedDt = Math.min(dt, PHYSICS.MAX_TIMESTEP);
    const subSteps = Math.ceil(clampedDt / PHYSICS.MIN_TIMESTEP);
    const subDt = clampedDt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      this.updateObjects(subDt);
      this.checkBounds();
      this.checkCollisions();
      this.resolveCollisions();
    }

    this.render();
  }

  updateObjects(dt: number) {
    for (const object of this.objects) {
      if (object instanceof RigidBody && WIND.ENABLED) {
        const invertedWindForce = new Vector(WIND.FORCE.x, -WIND.FORCE.y);
        object.applyForce(invertedWindForce);
      }
      object.update(dt);
    }
  }

  checkBounds() {
    const worldOrigin = new Vector(this.worldWidth / 2, this.worldHeight / 2);
    const margin = 50;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const pos = object.position;

        if (
          pos.x < -margin ||
          pos.x > this.worldWidth + margin ||
          pos.y < -margin ||
          pos.y > this.worldHeight + margin
        ) {
          object.position = worldOrigin;
          object.velocity = new Vector(0, 0);
          object.angularVelocity = 0;
        }
      }
    }
  }

  checkCollisions() {
    this.collisions = [];
    this.contactPoints = [];

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.clearContactPoints();
      }
    }

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        for (const wall of this.walls) {
          const info = CollisionSystem.checkWallCollision(object, wall);
          if (info) {
            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            object.setContactPoints([info.contactPoint]);
          }
        }
      }
    }

    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const obj1 = this.objects[i];
        const obj2 = this.objects[j];

        if (obj1 instanceof RigidBody && obj2 instanceof RigidBody) {
          const info = CollisionSystem.checkCollision(obj1, obj2);
          if (info) {
            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            obj1.setContactPoints([info.contactPoint]);
            obj2.setContactPoints([info.contactPoint]);
          }
        }
      }
    }
  }

  private resolveCollisions() {
    for (const info of this.collisions) {
      CollisionSystem.resolveCollision(info);
    }
  }

  render() {
    if (!this.ctx) {
      return;
    }

    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

    this.ctx.save();
    this.ctx.scale(
      this.screenWidth / this.worldWidth,
      this.screenHeight / this.worldHeight
    );

    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.worldWidth, this.worldHeight);
    this.ctx.clip();

    for (const object of this.objects) {
      object.draw(this.ctx);
    }

    for (const wall of this.walls) {
      wall.draw(this.ctx);
    }

    this.drawDebugInfo();

    this.ctx.restore();
  }

  private drawDebugInfo() {
    if (!this.ctx) {
      return;
    }

    for (const contactPoint of this.contactPoints) {
      this.ctx.fillStyle = "red";
      this.ctx.beginPath();
      this.ctx.arc(contactPoint.x, contactPoint.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
