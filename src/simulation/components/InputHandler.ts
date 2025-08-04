import { Vector } from "../../core/Vector";
import { RigidBody } from "../../core/RigidBody";

export class InputHandler {
  private deleteMode: boolean = false;
  private cursorTrailEnabled: boolean = false;
  private cursorTrailLength: number = 10;
  private cursorTrailFade: number = 0.8;
  private cursorTrailPoints: Array<{ position: Vector; time: number }> = [];
  private currentTime: number = 0;

  constructor() {}

  getCursorTrailEnabled(): boolean {
    return this.cursorTrailEnabled;
  }

  handleMouseMove(worldPos: Vector): void {
    if (!this.cursorTrailEnabled) return;

    this.cursorTrailPoints.push({
      position: worldPos,
      time: this.currentTime,
    });

    // Keep only recent points
    while (this.cursorTrailPoints.length > this.cursorTrailLength) {
      this.cursorTrailPoints.shift();
    }
  }

  setupDeleteMode(): void {
    const deleteCheckbox = document.getElementById(
      "delete-mode"
    ) as HTMLInputElement;

    if (deleteCheckbox) {
      deleteCheckbox.addEventListener("change", () => {
        this.setExclusiveMode("delete", deleteCheckbox.checked);
      });
    }
  }

  setupCursorPanel(): void {
    const cursorBtn = document.getElementById(
      "cursor-btn"
    ) as HTMLButtonElement;
    const cursorPanel = document.getElementById(
      "cursor-panel"
    ) as HTMLDivElement;
    const trailCheckbox = document.getElementById(
      "cursor-trail"
    ) as HTMLInputElement;
    const trailLengthSlider = document.getElementById(
      "trail-length"
    ) as HTMLInputElement;
    const trailLengthValue = document.getElementById(
      "trail-length-value"
    ) as HTMLSpanElement;
    const trailFadeSlider = document.getElementById(
      "trail-fade"
    ) as HTMLInputElement;
    const trailFadeValue = document.getElementById(
      "trail-fade-value"
    ) as HTMLSpanElement;

    if (cursorBtn && cursorPanel) {
      cursorBtn.addEventListener("click", () => {
        this.closeAllPanelsExcept("cursor-panel");
        cursorPanel.style.display =
          cursorPanel.style.display === "none" ? "block" : "none";
      });
    }

    if (trailCheckbox) {
      trailCheckbox.addEventListener("change", () => {
        this.cursorTrailEnabled = trailCheckbox.checked;
        if (!this.cursorTrailEnabled) {
          this.cursorTrailPoints = [];
        }
      });
    }

    if (trailLengthSlider && trailLengthValue) {
      trailLengthSlider.addEventListener("input", () => {
        this.cursorTrailLength = parseInt(trailLengthSlider.value);
        trailLengthValue.textContent = trailLengthSlider.value;
      });
    }

    if (trailFadeSlider && trailFadeValue) {
      trailFadeSlider.addEventListener("input", () => {
        this.cursorTrailFade = parseFloat(trailFadeSlider.value);
        trailFadeValue.textContent = parseFloat(trailFadeSlider.value).toFixed(
          1
        );
      });
    }
  }

  setupCanvasHandlers(
    screenToWorld: (pos: Vector) => Vector,
    onObjectClick: (object: RigidBody) => void,
    onObjectDelete: (object: RigidBody) => void,
    onCreateClick: (position: Vector) => void
  ): void {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (canvas) {
      const clickHandler = (event: MouseEvent) => {
        this.handleCanvasClick(
          event,
          screenToWorld,
          onObjectClick,
          onObjectDelete,
          onCreateClick
        );
      };

      const mouseMoveHandler = (event: MouseEvent) => {
        this.handleCanvasMouseMove(event, screenToWorld);
      };

      canvas.removeEventListener("click", clickHandler);
      canvas.removeEventListener("mousemove", mouseMoveHandler);

      canvas.addEventListener("click", clickHandler);
      canvas.addEventListener("mousemove", mouseMoveHandler);
    }
  }

  private handleCanvasClick(
    event: MouseEvent,
    screenToWorld: (pos: Vector) => Vector,
    onObjectClick: (object: RigidBody) => void,
    onObjectDelete: (object: RigidBody) => void,
    onCreateClick: (position: Vector) => void
  ): void {
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const worldPos = screenToWorld(new Vector(screenX, screenY));

    // Handle create mode - this needs to be handled in World with objects array
    onCreateClick(worldPos);
  }

  private handleCanvasMouseMove(
    event: MouseEvent,
    screenToWorld: (pos: Vector) => Vector
  ): void {
    if (!this.cursorTrailEnabled) return;

    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const worldPos = screenToWorld(new Vector(screenX, screenY));

    this.cursorTrailPoints.push({
      position: worldPos,
      time: this.currentTime,
    });

    // keep only recent points
    while (this.cursorTrailPoints.length > this.cursorTrailLength) {
      this.cursorTrailPoints.shift();
    }
  }

  setDeleteMode(enabled: boolean): void {
    this.deleteMode = enabled;
    this.updateCanvasCursor();
  }

  private setExclusiveMode(
    mode: "inspector" | "delete" | "create",
    enabled: boolean
  ): void {
    if (enabled) {
      // Clear other modes
      this.deleteMode = false;
      const inspectorCheckbox = document.getElementById(
        "inspector-mode"
      ) as HTMLInputElement;
      const placeModeCheckbox = document.getElementById(
        "place-mode"
      ) as HTMLInputElement;

      if (inspectorCheckbox) inspectorCheckbox.checked = false;
      if (placeModeCheckbox) placeModeCheckbox.checked = false;

      // Set this mode
      if (mode === "delete") {
        this.deleteMode = true;
        const deleteCheckbox = document.getElementById(
          "delete-mode"
        ) as HTMLInputElement;
        if (deleteCheckbox) deleteCheckbox.checked = true;
      }
    } else {
      if (mode === "delete") {
        this.deleteMode = false;
      }
    }

    this.updateCanvasCursor();
  }

  getDeleteMode(): boolean {
    return this.deleteMode;
  }

  private updateCanvasCursor(): void {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    if (this.deleteMode) {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "default";
    }
  }

  updateTime(time: number): void {
    this.currentTime = time;
  }

  drawCursorTrail(ctx: CanvasRenderingContext2D, trailColor: string): void {
    if (!ctx || !this.cursorTrailEnabled || this.cursorTrailPoints.length < 2) {
      return;
    }

    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < this.cursorTrailPoints.length; i++) {
      const prev = this.cursorTrailPoints[i - 1];
      const curr = this.cursorTrailPoints[i];

      const alpha = (i / this.cursorTrailPoints.length) * this.cursorTrailFade;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = trailColor;

      ctx.beginPath();
      ctx.moveTo(prev.position.x, prev.position.y);
      ctx.lineTo(curr.position.x, curr.position.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  findObjectAtPosition(
    position: Vector,
    objects: RigidBody[]
  ): RigidBody | null {
    for (const object of objects) {
      const distance = object.position.subtract(position).magnitude();
      if (distance < 50) {
        return object;
      }
    }
    return null;
  }

  private closeAllPanelsExcept(exceptId?: string): void {
    const controlPanel = document.getElementById(
      "control-panel"
    ) as HTMLDivElement;
    const createPanel = document.getElementById(
      "create-panel"
    ) as HTMLDivElement;
    const cursorPanel = document.getElementById(
      "cursor-panel"
    ) as HTMLDivElement;
    const audioPanel = document.getElementById("audio-panel") as HTMLDivElement;

    if (controlPanel && exceptId !== "control-panel")
      controlPanel.style.display = "none";
    if (createPanel && exceptId !== "create-panel")
      createPanel.style.display = "none";
    if (cursorPanel && exceptId !== "cursor-panel")
      cursorPanel.style.display = "none";
    if (audioPanel && exceptId !== "audio-panel")
      audioPanel.style.display = "none";
  }
}
