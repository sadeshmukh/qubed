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
  console.log(advancement);

  // periodic lines left/right along this triangle
  // my guess is that proportional distance from center is equal distances

  for (let i = 1; i < 40; i++) {
    const xBounds = {
      left: 0,
      right: squareSize, // for testing
    };

    // const yDiff = (squareSize - center.y) / i;
    // const yCoord = center.y + yDiff;

    // drawLine(xBounds.left, yCoord, xBounds.right, yCoord);

    const t = i / 40; // normalizes it to frac
    const perspectiveT = 1 - Math.pow(1 - t, 1 / 2); // exponential curve
    const yCoord = center.y + (squareSize - center.y) * perspectiveT;

    drawLine(xBounds.left, yCoord, xBounds.right, yCoord);
  }

  // angle enclosed: ~150 deg, calculated by looking at either extreme
  // atan((center.x + perspectiveSpacing * (squareSize / 4)) / (squareSize - center.y))

  // verticalish lines with proper perspective spacing
  const viewerDistance = 10;
  const lineDepth = 10;

  const numVerticalLines = 60;
  for (let i = 1; i < numVerticalLines; i++) {
    const gridPosition = (i - numVerticalLines / 2) * 0.386; // calibrated to 150 deg

    const perspectiveSpacing = (gridPosition * viewerDistance) / lineDepth;
    const startXPos = center.x + perspectiveSpacing * (squareSize / 4);

    drawLine(startXPos, squareSize, center.x, center.y);
  }

  // FOV angle calculation, courtesy GPT
  const edgeGridPosLeft = (1 - numVerticalLines / 2) * 0.386;

  const edgeSpacingLeft = (edgeGridPosLeft * viewerDistance) / lineDepth;

  const edgeXLeft = center.x + edgeSpacingLeft * (squareSize / 4);

  const verticalDistance = squareSize - center.y;
  const edgeAngle = Math.atan(
    Math.abs(edgeXLeft - center.x) / verticalDistance
  );

  const totalAngleRadians = edgeAngle * 2;
  const totalAngleDegrees = totalAngleRadians * (180 / Math.PI);

  // console.log(`angle: ${totalAngleDegrees.toFixed(1)}`); // 150 deg

  // draw triangle
  const trianglePointsLeft = [
    { x: center.x, y: center.y },
    { x: edgeXLeft, y: center.y },
    { x: edgeXLeft, y: center.y + verticalDistance },
  ];
  drawPolygon(trianglePointsLeft, "black", 2, true);

  const edgeXRight = center.x - edgeSpacingLeft * (squareSize / 4);
  const trianglePointsRight = [
    { x: center.x, y: center.y },
    { x: edgeXRight, y: center.y },
    { x: edgeXRight, y: center.y + verticalDistance },
  ];
  drawPolygon(trianglePointsRight, "black", 2, true);

  requestAnimationFrame(update);
}

// since the last lines only enclose approx 150 deg, instead of stopping the horizontal lines drawn, just draw over a triangle to cover it

requestAnimationFrame(update);
