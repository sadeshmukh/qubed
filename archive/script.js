const canvas = document.getElementById("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let squareSize = Math.min(canvas.width, canvas.height);

canvas.width = squareSize;
canvas.height = squareSize;

window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  squareSize = Math.min(canvas.width, canvas.height);
  canvas.width = squareSize;
  canvas.height = squareSize;
};

const ctx = canvas.getContext("2d");

function drawLine(x1, y1, x2, y2, color = "white", width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawConnectedLines(points, color = "white", width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function drawCircle(x, y, radius, color = "red", width = 2, fill = true) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.stroke();
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawPolygon(points, color = "white", width = 2, fill = true) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// let's do some physics simulation

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  subtract(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  multiply(scalar) {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  divide(scalar) {
    return new Vector(this.x / scalar, this.y / scalar);
  }
}

Vector.prototype.add = function (other) {
  return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.subtract = function (other) {
  return new Vector(this.x - other.x, this.y - other.y);
};

Vector.prototype.multiply = function (scalar) {
  return new Vector(this.x * scalar, this.y * scalar);
};

Vector.prototype.divide = function (scalar) {
  return new Vector(this.x / scalar, this.y / scalar);
};

class CollisionBox {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class Object {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.collisionBox = new CollisionBox(x, y, width, height);
    this.velocity = new Vector(0, 0);
    // this.acceleration = {
    //   x: 0,
    //   y: 0,
    // };
    this.mass = 1;
    this.width = width;
    this.height = height;
  }

  draw(ctx) {
    ctx.fillStyle = "red";
    // default to 4 points at corners
    const points = [
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height },
    ];
    drawPolygon(points, "red", 2, true);
  }

  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.collisionBox.x = this.x;
    this.collisionBox.y = this.y;
  }

  checkCollision(other) {
    // simplistic square collision detection
    return (
      this.collisionBox.x < other.collisionBox.x + other.collisionBox.width &&
      this.collisionBox.x + this.collisionBox.width > other.collisionBox.x &&
      this.collisionBox.y < other.collisionBox.y + other.collisionBox.height &&
      this.collisionBox.y + this.collisionBox.height > other.collisionBox.y
    );
  }

  applyForce(force) {
    this.velocity = this.velocity.add(force.multiply(this.mass));
  }
}

class Box extends Object {
  constructor(x, y, width, height) {
    super(x, y, width, height);
  }

  draw(ctx) {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class PhysicsEngine {
  constructor() {
    this.objects = [];
  }

  addObject(object) {
    this.objects.push(object);
  }

  update() {
    this.objects.forEach((object) => {
      object.update();
    });
  }
}

class World {
  constructor() {
    this.objects = [];
    this.physicsEngine = new PhysicsEngine();
  }

  addObject(object) {
    this.objects.push(object);
    this.physicsEngine.addObject(object);
  }

  update() {
    ctx.clearRect(0, 0, squareSize, squareSize);
    this.physicsEngine.update();
    this.objects.forEach((object) => {
      object.draw(ctx);
    });
  }
}

const world = new World();

const box = new Box(100, 100, 100, 100);

function update() {
  world.update();
  requestAnimationFrame(update);
}

requestAnimationFrame(update);
