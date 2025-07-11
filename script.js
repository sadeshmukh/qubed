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

// keep so we know it works
ctx.fillStyle = "red";
ctx.fillRect(0, 0, 20, 20);

// internal representation of the game

let currentTime = Date.now();
let lastTime = currentTime;

const initialTime = currentTime;

function drawLine(x1, y1, x2, y2, color = "white", width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
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

function update() {
  currentTime = Date.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // draw bounds to vanishing point at center from bottom left, bottom right
  const center = {
    x: squareSize / 2,
    y: squareSize / 4,
  };

  // draw two lines that border to horizon

  // drawLine(0, center.y, squareSize, center.y, "white", 5);

  const divergence = 50;

  // drawLine(0, squareSize, center.x - divergence, center.y);

  // drawLine(squareSize, squareSize, center.x + divergence, center.y);

  drawCircle(center.x, center.y, 10);

  const advancement = (currentTime - initialTime) / 1000;

  // periodic lines left/right along this triangle
  // my guess is that proportional distance from center is equal distances

  for (let i = 1; i < 20; i++) {
    const xBounds = {
      left: 0,
      right: squareSize, // for testing
    };

    const yDiff = (squareSize - center.y) / i;
    const yCoord = center.y + yDiff;

    drawLine(xBounds.left, yCoord, xBounds.right, yCoord);
  }
}

requestAnimationFrame(update);
