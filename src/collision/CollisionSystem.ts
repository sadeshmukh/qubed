import { RigidBody } from "../core/RigidBody";
import { Wall } from "../shapes/Wall";
import { Vector } from "../core/Vector";
import { CollisionInfo } from "./CollisionInfo";
import { Box } from "../shapes/Box";
import { NGon } from "../shapes/NGon";
import { PHYSICS } from "../utils/Constants";

interface BoundingBox {
  min: Vector;
  max: Vector;
}

export class CollisionSystem {
  private static getBoundingBox(body: RigidBody): BoundingBox {
    if (body instanceof Box || body instanceof NGon) {
      const corners = body.getCollisionPoints();
      const xs = corners.map((c) => c.x);
      const ys = corners.map((c) => c.y);
      return {
        min: new Vector(Math.min(...xs), Math.min(...ys)),
        max: new Vector(Math.max(...xs), Math.max(...ys)),
      };
    }
    throw new Error("Unsupported body type");
  }

  private static checkBoundingBoxCollision(
    bodyA: RigidBody,
    bodyB: RigidBody
  ): boolean {
    const boxA = CollisionSystem.getBoundingBox(bodyA);
    const boxB = CollisionSystem.getBoundingBox(bodyB);

    const velocityA = bodyA.velocity.magnitude();
    const velocityB = bodyB.velocity.magnitude();
    const maxVelocity = Math.max(velocityA, velocityB);
    const dynamicMargin = PHYSICS.BOUNDING_BOX_MARGIN + maxVelocity * 0.1;

    return !(
      boxA.max.x + dynamicMargin < boxB.min.x ||
      boxA.min.x - dynamicMargin > boxB.max.x ||
      boxA.max.y + dynamicMargin < boxB.min.y ||
      boxA.min.y - dynamicMargin > boxB.max.y
    );
  }

  private static pointLineDistance(
    point: Vector,
    lineStart: Vector,
    lineEnd: Vector
  ): { distance: number; closestPoint: Vector } {
    const lineVec = lineEnd.subtract(lineStart);
    const pointVec = point.subtract(lineStart);

    const lineLengthSq = lineVec.dot(lineVec);
    if (lineLengthSq === 0) {
      return { distance: pointVec.magnitude(), closestPoint: lineStart };
    }

    const t = Math.max(0, Math.min(1, pointVec.dot(lineVec) / lineLengthSq));
    const closestPoint = lineStart.add(lineVec.multiply(t));
    const distance = point.subtract(closestPoint).magnitude();

    return { distance, closestPoint };
  }

  private static checkBoxBoxCollision(
    polygon1: RigidBody,
    polygon2: RigidBody
  ): CollisionInfo | null {
    const corners1 = polygon1.getCollisionPoints();
    const corners2 = polygon2.getCollisionPoints();

    let minPenetration = Infinity;
    let contactPoint = new Vector();
    let collisionNormal = new Vector();
    let foundCollision = false;

    for (const corner of corners1) {
      const edges2 = [];
      for (let i = 0; i < corners2.length; i++) {
        const start = corners2[i];
        const end = corners2[(i + 1) % corners2.length];
        edges2.push({ start, end });
      }

      for (const edge of edges2) {
        const { distance, closestPoint } = CollisionSystem.pointLineDistance(
          corner,
          edge.start,
          edge.end
        );

        if (distance < 1.0) {
          const lineVec = edge.end.subtract(edge.start);
          let normal = new Vector(-lineVec.y, lineVec.x).normalize();
          const toCorner = corner.subtract(closestPoint);

          if (normal.dot(toCorner) < 0) {
            normal = normal.multiply(-1);
          }

          if (distance < minPenetration) {
            minPenetration = distance;
            contactPoint = closestPoint;
            collisionNormal = normal;
            foundCollision = true;
          }
        }
      }
    }

    for (const corner of corners2) {
      const edges1 = [];
      for (let i = 0; i < corners1.length; i++) {
        const start = corners1[i];
        const end = corners1[(i + 1) % corners1.length];
        edges1.push({ start, end });
      }

      for (const edge of edges1) {
        const { distance, closestPoint } = CollisionSystem.pointLineDistance(
          corner,
          edge.start,
          edge.end
        );

        if (distance < 1.0) {
          const lineVec = edge.end.subtract(edge.start);
          let normal = new Vector(-lineVec.y, lineVec.x).normalize();
          const toCorner = corner.subtract(closestPoint);

          if (normal.dot(toCorner) < 0) {
            normal = normal.multiply(-1);
          }

          if (distance < minPenetration) {
            minPenetration = distance;
            contactPoint = closestPoint;
            collisionNormal = normal.multiply(-1);
            foundCollision = true;
          }
        }
      }
    }

    if (foundCollision) {
      return new CollisionInfo(
        polygon1,
        polygon2,
        contactPoint,
        collisionNormal,
        minPenetration
      );
    }

    return null;
  }

  public static checkCollision(
    bodyA: RigidBody,
    bodyB: RigidBody
  ): CollisionInfo | null {
    if (!CollisionSystem.checkBoundingBoxCollision(bodyA, bodyB)) {
      return null;
    }

    if (
      (bodyA instanceof Box || bodyA instanceof NGon) &&
      (bodyB instanceof Box || bodyB instanceof NGon)
    ) {
      const info = CollisionSystem.checkBoxBoxCollision(bodyB, bodyA);
      if (info) {
        return new CollisionInfo(
          bodyA,
          bodyB,
          info.contactPoint,
          info.normal.multiply(-1),
          info.penetrationDepth
        );
      }
    } else if (
      (bodyA instanceof Box || bodyA instanceof NGon) &&
      (bodyB instanceof Box || bodyB instanceof NGon)
    ) {
      return CollisionSystem.checkBoxBoxCollision(bodyA, bodyB);
    }

    return null;
  }

  public static checkWallCollision(
    body: RigidBody,
    wall: Wall
  ): CollisionInfo | null {
    const wallStart = wall.start;
    const wallEnd = wall.end;
    const wallNormal = wall.getNormal();

    if (body instanceof Box || body instanceof NGon) {
      const corners = body.getCollisionPoints();
      let deepestPenetration = 0;
      let deepestPoint = new Vector();
      let contactNormal = new Vector();

      for (const corner of corners) {
        const rel = corner.subtract(wallStart);
        const wallDir = wallEnd.subtract(wallStart).normalize();
        const proj = rel.dot(wallDir);
        const wallLength = wallEnd.subtract(wallStart).magnitude();

        if (proj >= 0 && proj <= wallLength) {
          const dist = Math.abs(rel.dot(wallNormal));

          if (dist < wall.thickness / 2) {
            const penetration = wall.thickness / 2 - dist;

            if (penetration > deepestPenetration) {
              deepestPenetration = penetration;
              deepestPoint = corner;

              const toCorner = corner.subtract(
                wallStart.add(wallDir.multiply(proj))
              );
              const projectedDistance = toCorner.dot(wallNormal);

              if (projectedDistance > 0) {
                contactNormal = wallNormal;
              } else {
                contactNormal = wallNormal.multiply(-1);
              }
            }
          }
        }
      }

      if (deepestPenetration > 0) {
        return new CollisionInfo(
          body,
          wall,
          deepestPoint,
          contactNormal,
          deepestPenetration
        );
      }
    }

    return null;
  }

  public static resolveCollision(info: CollisionInfo): void {
    const { bodyA, bodyB, contactPoint, normal, penetrationDepth } = info;

    if (bodyB instanceof Wall) {
      CollisionSystem.resolveWallCollision(
        bodyA,
        bodyB,
        contactPoint,
        normal,
        penetrationDepth
      );
    } else {
      CollisionSystem.resolveBodyCollision(
        bodyA,
        bodyB,
        contactPoint,
        normal,
        penetrationDepth
      );
    }
  }

  private static resolveWallCollision(
    body: RigidBody,
    wall: Wall,
    contactPoint: Vector,
    normal: Vector,
    penetrationDepth: number
  ): void {
    const restitution = PHYSICS.RESTITUTION;
    const friction = PHYSICS.FRICTION;

    const r = contactPoint.subtract(body.position);
    const pointVelocity = body.velocity.add(
      new Vector(-r.y * body.angularVelocity, r.x * body.angularVelocity)
    );

    const velocityAlongNormal = pointVelocity.dot(normal);

    if (velocityAlongNormal > 0) return;

    const rCrossN = r.cross(normal);
    const invEffectiveMass =
      1 / body.mass + (rCrossN * rCrossN) / body.momentOfInertia;

    const impulseMagnitude =
      (-(1 + restitution) * velocityAlongNormal) / invEffectiveMass;
    const impulse = normal.multiply(impulseMagnitude);

    body.applyImpulseAtPoint(impulse, contactPoint);

    const tangent = normal.perpendicular();
    const tangentVelocity = pointVelocity.dot(tangent);

    if (Math.abs(tangentVelocity) > 0.01) {
      const frictionImpulseMagnitude =
        (-tangentVelocity * friction) / invEffectiveMass;
      const frictionImpulse = tangent.multiply(frictionImpulseMagnitude);
      body.applyImpulseAtPoint(frictionImpulse, contactPoint);
    }

    if (penetrationDepth > PHYSICS.PENETRATION_SLOP) {
      const correctionAmount =
        Math.max(penetrationDepth - PHYSICS.PENETRATION_SLOP, 0) *
        PHYSICS.PERCENT_CORRECTION;
      const correction = normal.multiply(correctionAmount);
      body.position = body.position.add(correction);
    }
  }

  private static resolveBodyCollision(
    bodyA: RigidBody,
    bodyB: RigidBody,
    contactPoint: Vector,
    normal: Vector,
    penetrationDepth: number
  ): void {
    const restitution = PHYSICS.RESTITUTION;
    const friction = PHYSICS.FRICTION;

    const r1 = contactPoint.subtract(bodyA.position);
    const r2 = contactPoint.subtract(bodyB.position);

    const pointVelocity1 = bodyA.velocity.add(
      new Vector(-r1.y * bodyA.angularVelocity, r1.x * bodyA.angularVelocity)
    );
    const pointVelocity2 = bodyB.velocity.add(
      new Vector(-r2.y * bodyB.angularVelocity, r2.x * bodyB.angularVelocity)
    );

    const relativeVelocity = pointVelocity1.subtract(pointVelocity2);
    const velocityAlongNormal = relativeVelocity.dot(normal);

    if (velocityAlongNormal > 0) return;

    const r1CrossN = r1.cross(normal);
    const r2CrossN = r2.cross(normal);
    const invEffectiveMass =
      1 / bodyA.mass +
      1 / bodyB.mass +
      (r1CrossN * r1CrossN) / bodyA.momentOfInertia +
      (r2CrossN * r2CrossN) / bodyB.momentOfInertia;

    const impulseMagnitude =
      (-(1 + restitution) * velocityAlongNormal) / invEffectiveMass;
    const impulse = normal.multiply(impulseMagnitude);

    bodyA.applyImpulseAtPoint(impulse, contactPoint);
    bodyB.applyImpulseAtPoint(impulse.multiply(-1), contactPoint);

    const tangent = normal.perpendicular();
    const tangentVelocity = relativeVelocity.dot(tangent);

    if (Math.abs(tangentVelocity) > 0.01) {
      const frictionImpulseMagnitude =
        (-tangentVelocity * friction) / invEffectiveMass;
      const frictionImpulse = tangent.multiply(frictionImpulseMagnitude);

      bodyA.applyImpulseAtPoint(frictionImpulse, contactPoint);
      bodyB.applyImpulseAtPoint(frictionImpulse.multiply(-1), contactPoint);
    }

    if (penetrationDepth > PHYSICS.PENETRATION_SLOP) {
      const totalInvMass = 1 / bodyA.mass + 1 / bodyB.mass;
      const correctionAmount =
        Math.max(penetrationDepth - PHYSICS.PENETRATION_SLOP, 0) *
        PHYSICS.PERCENT_CORRECTION;
      const correction = normal.multiply(correctionAmount / totalInvMass);

      bodyA.position = bodyA.position.add(correction.multiply(1 / bodyA.mass));
      bodyB.position = bodyB.position.subtract(
        correction.multiply(1 / bodyB.mass)
      );
    }
  }
}
