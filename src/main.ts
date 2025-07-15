const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

let squareSize = Math.min(window.innerWidth, window.innerHeight);

canvas.width = squareSize;
canvas.height = squareSize;
canvas.style.width = squareSize + "px";
canvas.style.height = squareSize + "px";

window.addEventListener("resize", () => {
  squareSize = Math.min(window.innerWidth, window.innerHeight);

  canvas.width = squareSize;
  canvas.height = squareSize;
  canvas.style.width = squareSize + "px";
  canvas.style.height = squareSize + "px";
});

// end boilerplate

function update(): void {
  requestAnimationFrame(update);
}

requestAnimationFrame(update);
