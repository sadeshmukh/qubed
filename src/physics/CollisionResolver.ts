import { PhysicsObject } from "../core/Object";
import { Vector } from "../core/Vector";
import { Box } from "../objects/Box";
import { Circle } from "../objects/Circle";

export class CollisionResolver {
  private restitution: number;
  private debugMode: boolean = false;

  constructor(restitution: number = 0.8) {
    this.restitution = restitution;
  }

  resolveCollisions(objects: PhysicsObject[]): void {
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const objA = objects[i];
        const objB = objects[j];

        if (objA.checkCollision(objB)) {
          this.resolveCollision(objA, objB);
        }
      }
    }
  }

  private resolveCollision(objA: PhysicsObject, objB: PhysicsObject): void {
    if (objA instanceof Circle && objB instanceof Circle) {
      this.resolveCircleToCircle(objA, objB);
    } else if (objA instanceof Box && objB instanceof Box) {
      this.resolveBoxToBox(objA, objB);
    } else if (objA instanceof Circle && objB instanceof Box) {
      this.resolveCircleToBox(objA, objB);
    } else if (objA instanceof Box && objB instanceof Circle) {
      this.resolveBoxToCircle(objA, objB);
    } else {
      // fallback to circle-based collision
      this.resolveCircleToCircle(objA, objB);
    }
  }

  private resolveCircleToCircle(
    circleA: PhysicsObject,
    circleB: PhysicsObject
  ): void {
    const posA = circleA.getCenter();
    const posB = circleB.getCenter();
    const velA = circleA.getVelocity();
    const velB = circleB.getVelocity();

    const collision = posB.subtract(posA);
    const distance = collision.magnitude();

    if (distance === 0) {
      const avgVel = velA.add(velB).multiply(0.5);
      circleA.setVelocity(avgVel.multiply(-1));
      circleB.setVelocity(avgVel);
      return;
    }

    const normal = collision.divide(distance);
    const radiusA = circleA.getCollisionRadius();
    const radiusB = circleB.getCollisionRadius();
    const overlap = radiusA + radiusB - distance;

    if (overlap > 0) {
      const separationDistance = overlap / 2 + 0.1;
      const separation = normal.multiply(separationDistance);

      const totalMass = circleA.getMass() + circleB.getMass();
      const ratioA = circleB.getMass() / totalMass;
      const ratioB = circleA.getMass() / totalMass;

      circleA.x -= separation.x * ratioA;
      circleA.y -= separation.y * ratioA;
      circleB.x += separation.x * ratioB;
      circleB.y += separation.y * ratioB;
    }

    this.applyImpulse(circleA, circleB, normal);
  }

  private resolveBoxToBox(boxA: Box, boxB: Box): void {
    const centerA = boxA.getCenter();
    const centerB = boxB.getCenter();
    const collision = centerB.subtract(centerA);

    const overlapX =
      (boxA.getWidth() + boxB.getWidth()) / 2 - Math.abs(collision.x);
    const overlapY =
      (boxA.getHeight() + boxB.getHeight()) / 2 - Math.abs(collision.y);

    if (overlapX <= 0 || overlapY <= 0) return;

    let normal: Vector;
    let separationDistance: number;

    if (overlapX < overlapY) {
      normal = new Vector(collision.x > 0 ? 1 : -1, 0);
      separationDistance = overlapX / 2 + 0.1;
    } else {
      normal = new Vector(0, collision.y > 0 ? 1 : -1);
      separationDistance = overlapY / 2 + 0.1;
    }

    const separation = normal.multiply(separationDistance);
    const totalMass = boxA.getMass() + boxB.getMass();
    const ratioA = boxB.getMass() / totalMass;
    const ratioB = boxA.getMass() / totalMass;

    boxA.x -= separation.x * ratioA;
    boxA.y -= separation.y * ratioA;
    boxB.x += separation.x * ratioB;
    boxB.y += separation.y * ratioB;

    this.applyImpulse(boxA, boxB, normal);
  }

  private resolveCircleToBox(circle: Circle, box: Box): void {
    const circleCenter = circle.getCenter();
    const boxCenter = box.getCenter();

    // find closest point on box to circle center
    const closestX = Math.max(
      box.x,
      Math.min(circleCenter.x, box.x + box.getWidth())
    );
    const closestY = Math.max(
      box.y,
      Math.min(circleCenter.y, box.y + box.getHeight())
    );
    const closestPoint = new Vector(closestX, closestY);

    // calculate collision normal (from closest point to circle center)
    const collision = circleCenter.subtract(closestPoint);
    const distance = collision.magnitude();

    if (distance === 0) {
      // circle center is inside box, push out along shortest axis
      const toCenter = circleCenter.subtract(boxCenter);
      const xDist = box.getWidth() / 2 - Math.abs(toCenter.x);
      const yDist = box.getHeight() / 2 - Math.abs(toCenter.y);

      if (xDist < yDist) {
        collision.x = toCenter.x > 0 ? 1 : -1;
        collision.y = 0;
      } else {
        collision.x = 0;
        collision.y = toCenter.y > 0 ? 1 : -1;
      }
    }

    const normal = distance > 0 ? collision.divide(distance) : collision;
    const overlap = circle.getRadius() - distance;

    if (overlap > 0) {
      const separationDistance = overlap + 0.1;
      const separation = normal.multiply(separationDistance);

      const totalMass = circle.getMass() + box.getMass();
      const ratioCircle = box.getMass() / totalMass;
      const ratioBox = circle.getMass() / totalMass;

      circle.x += separation.x * ratioCircle;
      circle.y += separation.y * ratioCircle;
      box.x -= separation.x * ratioBox;
      box.y -= separation.y * ratioBox;
    }

    this.applyImpulse(circle, box, normal);
  }

  private resolveBoxToCircle(box: Box, circle: Circle): void {
    this.resolveCircleToBox(circle, box);
  }

  private applyImpulse(
    objA: PhysicsObject,
    objB: PhysicsObject,
    normal: Vector
  ): void {
    const velA = objA.getVelocity();
    const velB = objB.getVelocity();

    const relativeVelocity = velA.subtract(velB);
    const velAlongNormal =
      relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

    if (velAlongNormal > 0) return;

    const massA = objA.getMass();
    const massB = objB.getMass();
    const e = this.restitution * 0.8;

    const j = (-(1 + e) * velAlongNormal) / (1 / massA + 1 / massB);
    const impulse = normal.multiply(j * 0.9);

    const deltaVelA = impulse.multiply(1 / massA);
    const deltaVelB = impulse.multiply(1 / massB);

    const newVelA = velA.subtract(deltaVelA);
    const newVelB = velB.add(deltaVelB);

    // damping to reduce energy
    const dampingFactor = 0.98;
    objA.setVelocity(newVelA.multiply(dampingFactor));
    objB.setVelocity(newVelB.multiply(dampingFactor));

    if (this.debugMode) {
      console.log("COLLISION:", {
        velAlongNormal: velAlongNormal.toFixed(3),
        impulseScalar: j.toFixed(3),
        massA: massA.toFixed(2),
        massB: massB.toFixed(2),
        restitution: e.toFixed(2),
        oldVelA: `(${velA.x.toFixed(2)}, ${velA.y.toFixed(2)})`,
        newVelA: `(${newVelA.x.toFixed(2)}, ${newVelA.y.toFixed(2)})`,
        oldVelB: `(${velB.x.toFixed(2)}, ${velB.y.toFixed(2)})`,
        newVelB: `(${newVelB.x.toFixed(2)}, ${newVelB.y.toFixed(2)})`,
      });
    }
  }

  setRestitution(restitution: number): void {
    this.restitution = Math.max(0, Math.min(1, restitution));
  }

  getRestitution(): number {
    return this.restitution;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  getDebugMode(): boolean {
    return this.debugMode;
  }
}
