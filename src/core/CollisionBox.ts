export class CollisionBox {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}

  intersects(other: CollisionBox): boolean {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}
