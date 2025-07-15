export interface Point {
  x: number;
  y: number;
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string = "white",
  width: number = 1
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function drawConnectedLines(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string = "white",
  width: number = 2
): void {
  if (points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string = "red",
  width: number = 2,
  fill: boolean = true
): void {
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

export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string = "white",
  width: number = 2,
  fill: boolean = true
): void {
  if (points.length < 2) return;

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
