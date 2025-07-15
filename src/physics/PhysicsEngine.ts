import { PhysicsObject } from "../core/Object";
import { ForceGenerator } from "./ForceGenerator";
import { CollisionResolver } from "./CollisionResolver";
import { Vector } from "../core/Vector";

export class PhysicsEngine {
  private objects: PhysicsObject[] = [];
  private forceGenerators: ForceGenerator[] = [];
  private collisionResolver: CollisionResolver;
  private enableCollisions: boolean = true;

  constructor() {
    this.collisionResolver = new CollisionResolver(0.8); // default bounciness
  }

  addObject(object: PhysicsObject): void {
    this.objects.push(object);
  }

  removeObject(object: PhysicsObject): void {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  addForceGenerator(generator: ForceGenerator): void {
    this.forceGenerators.push(generator);
  }

  removeForceGenerator(generator: ForceGenerator): void {
    const index = this.forceGenerators.indexOf(generator);
    if (index > -1) {
      this.forceGenerators.splice(index, 1);
    }
  }

  clearForceGenerators(): void {
    this.forceGenerators = [];
  }

  update(): void {
    this.forceGenerators.forEach((generator) => {
      generator.applyForce(this.objects);
    });

    this.objects.forEach((object) => {
      object.update();
    });

    if (this.enableCollisions) {
      this.collisionResolver.resolveCollisions(this.objects);
    }
  }

  getObjects(): PhysicsObject[] {
    return this.objects;
  }

  getForceGenerators(): ForceGenerator[] {
    return this.forceGenerators;
  }

  setCollisionRestitution(restitution: number): void {
    this.collisionResolver.setRestitution(restitution);
  }

  getCollisionRestitution(): number {
    return this.collisionResolver.getRestitution();
  }

  setCollisionsEnabled(enabled: boolean): void {
    this.enableCollisions = enabled;
  }

  getCollisionsEnabled(): boolean {
    return this.enableCollisions;
  }

  setCollisionDebugMode(enabled: boolean): void {
    this.collisionResolver.setDebugMode(enabled);
  }

  getCollisionDebugMode(): boolean {
    return this.collisionResolver.getDebugMode();
  }

  // debug mode!
  getTotalMomentum(): Vector {
    return this.objects.reduce((total, obj) => {
      return total.add(obj.getMomentum());
    }, new Vector(0, 0));
  }

  // also debug mode!
  getTotalKineticEnergy(): number {
    return this.objects.reduce((total, obj) => {
      const velocity = obj.getVelocity();
      const speed = velocity.magnitude();
      return total + 0.5 * obj.getMass() * speed * speed;
    }, 0);
  }
}
