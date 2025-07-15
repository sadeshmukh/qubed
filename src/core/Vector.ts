export class Vector {
  constructor(public x: number, public y: number) {}

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

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector {
    const mag = this.magnitude();
    return mag > 0 ? this.divide(mag) : new Vector(0, 0);
  }

  dot(other: Vector): number {
    return this.x * other.x + this.y * other.y;
  }
}
