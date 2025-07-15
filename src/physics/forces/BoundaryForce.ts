import { ForceGenerator } from "../ForceGenerator";
import { PhysicsObject } from "../../core/Object";
import { Vector } from "../../core/Vector";

export class BoundaryForce implements ForceGenerator {
  private width: number;
  private height: number;
  private damping: number;

  constructor(width: number, height: number, damping: number = 0.8) {
    this.width = width;
    this.height = height;
    this.damping = damping;
  }

  applyForce(objects: PhysicsObject[]): void {
    objects.forEach((obj) => {
      const velocity = obj.getVelocity();
      let newVelocity = velocity;
      let newX = obj.x;
      let newY = obj.y;

      // left
      if (obj.x <= 0) {
        newX = 0;
        newVelocity = new Vector(
          Math.abs(velocity.x) * this.damping,
          velocity.y
        );
      }
      // right
      else if (obj.x + obj.getWidth() >= this.width) {
        newX = this.width - obj.getWidth();
        newVelocity = new Vector(
          -Math.abs(velocity.x) * this.damping,
          velocity.y
        );
      }

      // top
      if (obj.y <= 0) {
        newY = 0;
        newVelocity = new Vector(
          newVelocity.x,
          Math.abs(velocity.y) * this.damping
        );
      }
      // bottom
      else if (obj.y + obj.getHeight() >= this.height) {
        newY = this.height - obj.getHeight();
        newVelocity = new Vector(
          newVelocity.x,
          -Math.abs(velocity.y) * this.damping
        );

        // microbouncing
        if (Math.abs(newVelocity.y) < 0.2) {
          newVelocity = new Vector(newVelocity.x, 0);
        }
      }

      obj.x = newX;
      obj.y = newY;
      obj.setVelocity(newVelocity);
    });
  }

  setBounds(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setDamping(damping: number): void {
    this.damping = damping;
  }
}
