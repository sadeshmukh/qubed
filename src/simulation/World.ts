import { Object } from "../core/Object";
import { RigidBody } from "../core/RigidBody";
import { Wall } from "../shapes/Wall";
import { Vector } from "../core/Vector";

export class World {
  objects: Object[] = [];
  walls: Wall[] = [];
  ctx: CanvasRenderingContext2D | null = null;
  private contactPoints: Array<{ wall: Wall; point: Vector }> = [];
  private boxContactPoints: Array<{ point: Vector }> = [];

  worldWidth: number = 1000;
  worldHeight: number = 1000;

  addObject(object: Object) {
    this.objects.push(object);
  }

  addWall(wall: Wall) {
    this.walls.push(wall);
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  update(dt: number) {
    this.updateObjects(dt);
    this.checkCollisions();
    this.render();
  }

  updateObjects(dt: number) {
    for (const object of this.objects) {
      object.update(dt);
    }
  }

  checkCollisions() {
    this.contactPoints = [];
    this.boxContactPoints = [];

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        for (const wall of this.walls) {
          this.checkWallCollision(object, wall);
        }
      }
    }

    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const obj1 = this.objects[i];
        const obj2 = this.objects[j];

        if (obj1 instanceof RigidBody && obj2 instanceof RigidBody) {
          this.checkBoxBoxCollision(obj1, obj2);
        }
      }
    }
  }

  private checkWallCollision(rigidBody: RigidBody, wall: Wall) {
    const corners = rigidBody.getCollisionPoints();
    const wallNormal = wall.getNormal();
    const wallStart = wall.start;
    const wallEnd = wall.end;
    const wallVector = wallEnd.subtract(wallStart);
    const wallDir = wallVector.normalize();
    const wallLength = wallVector.magnitude();

    let deepestPenetration = 0;
    let deepestPoint = new Vector();
    let contactNormal = new Vector();

    for (const corner of corners) {
      const rel = corner.subtract(wallStart);
      const dist = rel.dot(wallNormal);
      const proj = rel.dot(wallDir);

      if (
        proj >= 0 &&
        proj <= wallLength &&
        Math.abs(dist) < wall.thickness / 2
      ) {
        const penetration = wall.thickness / 2 - Math.abs(dist);

        if (penetration > deepestPenetration) {
          deepestPenetration = penetration;
          deepestPoint = corner;
          contactNormal = dist < 0 ? wallNormal.multiply(-1) : wallNormal;
        }
      }
    }

    if (deepestPenetration > 0) {
      this.contactPoints.push({ wall, point: deepestPoint });
      this.resolveWallCollision(
        rigidBody,
        wall,
        deepestPenetration,
        contactNormal,
        deepestPoint
      );
    }
  }

  private checkBoxBoxCollision(box1: RigidBody, box2: RigidBody) {
    const corners1 = box1.getCollisionPoints();
    const corners2 = box2.getCollisionPoints();

    let deepestPenetration = 0;
    let contactPoint = new Vector();
    let contactNormal = new Vector();

    for (const corner1 of corners1) {
      const bounds2 = box2.getBoundingBox();

      if (
        corner1.x >= bounds2.min.x &&
        corner1.x <= bounds2.max.x &&
        corner1.y >= bounds2.min.y &&
        corner1.y <= bounds2.max.y
      ) {
        const distToMinX = corner1.x - bounds2.min.x;
        const distToMaxX = bounds2.max.x - corner1.x;
        const distToMinY = corner1.y - bounds2.min.y;
        const distToMaxY = bounds2.max.y - corner1.y;

        const minDistX = Math.min(distToMinX, distToMaxX);
        const minDistY = Math.min(distToMinY, distToMaxY);

        if (minDistX < minDistY) {
          const penetration = minDistX;
          if (penetration > deepestPenetration) {
            deepestPenetration = penetration;
            contactPoint = corner1;
            contactNormal =
              distToMinX < distToMaxX ? new Vector(-1, 0) : new Vector(1, 0);
          }
        } else {
          const penetration = minDistY;
          if (penetration > deepestPenetration) {
            deepestPenetration = penetration;
            contactPoint = corner1;
            contactNormal =
              distToMinY < distToMaxY ? new Vector(0, -1) : new Vector(0, 1);
          }
        }
      }
    }

    for (const corner2 of corners2) {
      const bounds1 = box1.getBoundingBox();

      if (
        corner2.x >= bounds1.min.x &&
        corner2.x <= bounds1.max.x &&
        corner2.y >= bounds1.min.y &&
        corner2.y <= bounds1.max.y
      ) {
        const distToMinX = corner2.x - bounds1.min.x;
        const distToMaxX = bounds1.max.x - corner2.x;
        const distToMinY = corner2.y - bounds1.min.y;
        const distToMaxY = bounds1.max.y - corner2.y;

        const minDistX = Math.min(distToMinX, distToMaxX);
        const minDistY = Math.min(distToMinY, distToMaxY);

        if (minDistX < minDistY) {
          const penetration = minDistX;
          if (penetration > deepestPenetration) {
            deepestPenetration = penetration;
            contactPoint = corner2;
            contactNormal =
              distToMinX < distToMaxX ? new Vector(1, 0) : new Vector(-1, 0);
          }
        } else {
          const penetration = minDistY;
          if (penetration > deepestPenetration) {
            deepestPenetration = penetration;
            contactPoint = corner2;
            contactNormal =
              distToMinY < distToMaxY ? new Vector(0, 1) : new Vector(0, -1);
          }
        }
      }
    }

    if (deepestPenetration > 0) {
      this.boxContactPoints.push({ point: contactPoint });
      this.resolveBoxBoxCollision(
        box1,
        box2,
        deepestPenetration,
        contactNormal,
        contactPoint
      );
    }
  }

  private resolveBoxBoxCollision(
    box1: RigidBody,
    box2: RigidBody,
    penetration: number,
    normal: Vector,
    contactPoint: Vector
  ) {
    const restitution = 0.7;
    const friction = 0.2;
    const penetrationSlop = 1.0;
    const percentCorrection = 0.8;

    const r1 = contactPoint.subtract(box1.getPosition());
    const r2 = contactPoint.subtract(box2.getPosition());
    const pointVelocity1 = box1
      .getVelocity()
      .add(
        new Vector(-r1.y * box1.angularVelocity, r1.x * box1.angularVelocity)
      );
    const pointVelocity2 = box2
      .getVelocity()
      .add(
        new Vector(-r2.y * box2.angularVelocity, r2.x * box2.angularVelocity)
      );
    const relativePointVelocity = pointVelocity1.subtract(pointVelocity2);
    const velocityAlongNormal = relativePointVelocity.dot(normal);

    if (velocityAlongNormal > 0) return;

    const invMass1 = 1 / box1.mass;
    const invMass2 = 1 / box2.mass;
    const invI1 = 1 / box1.momentOfInertia;
    const invI2 = 1 / box2.momentOfInertia;

    const r1CrossN = r1.cross(normal);
    const r2CrossN = r2.cross(normal);
    const invEffectiveMass =
      invMass1 +
      invMass2 +
      r1CrossN * r1CrossN * invI1 +
      r2CrossN * r2CrossN * invI2;

    const impulseMagnitude =
      (-(1 + restitution) * velocityAlongNormal) / invEffectiveMass;
    const impulse = normal.multiply(impulseMagnitude);

    box1.applyImpulse(impulse);
    box2.applyImpulse(impulse.multiply(-1));
    box1.applyAngularImpulse(r1.cross(impulse));
    box2.applyAngularImpulse(r2.cross(impulse.multiply(-1)));

    const tangent = new Vector(-normal.y, normal.x);
    const velocityAlongTangent = relativePointVelocity.dot(tangent);
    const frictionImpulse = tangent.multiply(-velocityAlongTangent * friction);

    box1.applyImpulse(frictionImpulse);
    box2.applyImpulse(frictionImpulse.multiply(-1));
    box1.applyAngularImpulse(r1.cross(frictionImpulse));
    box2.applyAngularImpulse(r2.cross(frictionImpulse.multiply(-1)));

    if (penetration > penetrationSlop) {
      const correction = normal.multiply(
        (percentCorrection * (penetration - penetrationSlop)) / 2
      );
      box1.move(correction.multiply(-1));
      box2.move(correction);
    }
  }

  private resolveWallCollision(
    rigidBody: RigidBody,
    wall: Wall,
    penetration: number,
    normal: Vector,
    contactPoint: Vector
  ) {
    const restitution = 0.7;
    const friction = 0.2;
    const penetrationSlop = 1.0;
    const percentCorrection = 0.8;

    const r = contactPoint.subtract(rigidBody.getPosition());
    const pointVelocity = rigidBody
      .getVelocity()
      .add(
        new Vector(
          -r.y * rigidBody.angularVelocity,
          r.x * rigidBody.angularVelocity
        )
      );
    const velocityAlongNormal = pointVelocity.dot(normal);

    if (velocityAlongNormal < 0) {
      const invMass = 1 / rigidBody.mass;
      const invI = 1 / rigidBody.momentOfInertia;
      const rCrossN = r.cross(normal);
      const invEffectiveMass = invMass + rCrossN * rCrossN * invI;

      const impulseMagnitude =
        (-(1 + restitution) * velocityAlongNormal) / invEffectiveMass;
      const impulse = normal.multiply(impulseMagnitude);

      rigidBody.applyImpulse(impulse);
      rigidBody.applyAngularImpulse(r.cross(impulse));

      const tangent = new Vector(-normal.y, normal.x);
      const velocityAlongTangent = pointVelocity.dot(tangent);
      const frictionImpulse = tangent.multiply(
        -velocityAlongTangent * friction
      );
      rigidBody.applyImpulse(frictionImpulse);
      rigidBody.applyAngularImpulse(r.cross(frictionImpulse));
    }

    if (penetration > penetrationSlop) {
      const correction = normal.multiply(
        percentCorrection * (penetration - penetrationSlop)
      );
      rigidBody.move(correction);
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();
    this.ctx.translate(0, this.ctx.canvas.height);
    this.ctx.scale(1, -1);
    this.ctx.scale(
      this.ctx.canvas.width / this.worldWidth,
      this.ctx.canvas.height / this.worldHeight
    );

    for (const wall of this.walls) {
      wall.draw(this.ctx);
    }

    for (const contact of this.contactPoints) {
      contact.wall.drawContactPoint(this.ctx, contact.point);
    }

    for (const contact of this.boxContactPoints) {
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      this.ctx.beginPath();
      this.ctx.arc(contact.point.x, contact.point.y, 8, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (const object of this.objects) {
      object.draw(this.ctx);
    }

    this.drawDebugInfo();
    this.ctx.restore();
  }

  private drawDebugInfo() {
    if (!this.ctx) return;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const bounds = object.getBoundingBox();
        this.ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
          bounds.min.x,
          bounds.min.y,
          bounds.max.x - bounds.min.x,
          bounds.max.y - bounds.min.y
        );

        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.beginPath();
        this.ctx.arc(
          object.getPosition().x,
          object.getPosition().y,
          3,
          0,
          Math.PI * 2
        );
        this.ctx.fill();

        const collisionPoints = object.getCollisionPoints();
        this.ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
        for (const point of collisionPoints) {
          this.ctx.beginPath();
          this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }
}
