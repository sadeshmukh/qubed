export class Vector {
  constructor(public x: number = 0, public y: number = 0) {}

  add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector {
    return new Vector(this.x / scalar, this.y / scalar);
  }

  dot(other: Vector): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector): number {
    return this.x * other.y - this.y * other.x;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector {
    const mag = this.magnitude();
    return mag > 0 ? new Vector(this.x / mag, this.y / mag) : new Vector();
  }

  rotate(angle: number): Vector {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  perpendicular(): Vector {
    return new Vector(-this.y, this.x);
  }
}

export const zero = new Vector(0, 0);
