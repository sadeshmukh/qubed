import { RigidBody } from "../../core/RigidBody";
import { COLORS } from "../../utils/Constants";
import { getNextObjectColor } from "../../utils/Constants";

export class Inspector {
  private selectedObject: RigidBody | null = null;
  private inspectorMode: boolean = false;

  constructor() {}

  setInspectorMode(enabled: boolean): void {
    this.inspectorMode = enabled;
    this.updateInspectorPanel();
  }

  getInspectorMode(): boolean {
    return this.inspectorMode;
  }

  setSelectedObject(object: RigidBody | null): void {
    this.selectedObject = object;
    if (object) {
      this.updateInspector();
    }
  }

  getSelectedObject(): RigidBody | null {
    return this.selectedObject;
  }

  private updateInspectorPanel(): void {
    const inspectorPanel = document.getElementById(
      "object-inspector"
    ) as HTMLDivElement;
    if (inspectorPanel) {
      inspectorPanel.style.display = this.inspectorMode ? "block" : "none";
      if (!this.inspectorMode) {
        this.selectedObject = null;
      }
    }
  }

  updateInspector(): void {
    if (!this.selectedObject) return;

    const typeEl = document.getElementById("inspector-type") as HTMLSpanElement;
    const massEl = document.getElementById("inspector-mass") as HTMLSpanElement;
    const velocityEl = document.getElementById(
      "inspector-velocity"
    ) as HTMLSpanElement;
    const angularEl = document.getElementById(
      "inspector-angular"
    ) as HTMLSpanElement;
    const kineticEl = document.getElementById(
      "inspector-kinetic"
    ) as HTMLSpanElement;
    const rotationalEl = document.getElementById(
      "inspector-rotational"
    ) as HTMLSpanElement;

    if (typeEl && massEl && velocityEl && angularEl) {
      typeEl.textContent = this.selectedObject.constructor.name;
      massEl.textContent = this.selectedObject.mass.toFixed(1);
      velocityEl.textContent = this.selectedObject.velocity
        .magnitude()
        .toFixed(1);
      angularEl.textContent = this.selectedObject.angularVelocity.toFixed(2);
    }
    if (kineticEl && rotationalEl) {
      const kinetic =
        (this.selectedObject.velocity.magnitude() ** 2 *
          this.selectedObject.mass) /
        2;
      const rotational =
        (this.selectedObject.angularVelocity ** 2 *
          this.selectedObject.momentOfInertia) /
        2;
      kineticEl.textContent = kinetic.toFixed(2);
      rotationalEl.textContent = rotational.toFixed(2);
    }

    this.renderInspectorObject();
  }

  private renderInspectorObject(): void {
    const inspectorCanvas = document.getElementById(
      "inspector-canvas"
    ) as HTMLCanvasElement;
    const ctx = inspectorCanvas.getContext("2d");

    if (!ctx || !this.selectedObject) return;

    ctx.clearRect(0, 0, 120, 120);
    ctx.save();

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, 120, 120);

    // center and scale the object
    ctx.translate(60, 60);
    ctx.save(); // save state, doesn't affect velocity arrow
    ctx.rotate(this.selectedObject.rotation);

    if (this.selectedObject.constructor.name === "Box") {
      const box = this.selectedObject as any;
      const width = box.width * 0.5;
      const height = box.height * 0.5;

      ctx.strokeStyle = COLORS.BOX;
      ctx.fillStyle = COLORS.BOX + "40";
      ctx.lineWidth = 2;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.strokeRect(-width / 2, -height / 2, width, height);
    } else if (this.selectedObject.constructor.name === "NGon") {
      const ngon = this.selectedObject as any;
      const radius = ngon.radius * 0.6;
      const sides = ngon.sides;

      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const color = getNextObjectColor(this.selectedObject);
      ctx.strokeStyle = color;
      ctx.fillStyle = color + "40";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    // restore so velocity arrow isn't affected
    ctx.restore();

    // draw velocity arrow
    if (this.selectedObject.velocity.magnitude() > 0.1) {
      const vel = this.selectedObject.velocity.normalize().multiply(25);
      ctx.strokeStyle = COLORS.VELOCITY_VECTOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vel.x, vel.y);
      ctx.stroke();

      // arrow head
      const arrowSize = 4;
      const angle = Math.atan2(vel.y, vel.x);
      ctx.beginPath();
      ctx.moveTo(vel.x, vel.y);
      ctx.lineTo(
        vel.x - arrowSize * Math.cos(angle - 0.3),
        vel.y - arrowSize * Math.sin(angle - 0.3)
      );
      ctx.moveTo(vel.x, vel.y);
      ctx.lineTo(
        vel.x - arrowSize * Math.cos(angle + 0.3),
        vel.y - arrowSize * Math.sin(angle + 0.3)
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  setupInspectorMode(): void {
    const inspectorCheckbox = document.getElementById(
      "inspector-mode"
    ) as HTMLInputElement;

    if (inspectorCheckbox) {
      inspectorCheckbox.addEventListener("change", () => {
        this.setExclusiveMode("inspector", inspectorCheckbox.checked);
      });
    }
  }

  private setExclusiveMode(
    mode: "inspector" | "delete" | "create",
    enabled: boolean
  ): void {
    if (enabled) {
      // Clear other modes
      this.inspectorMode = false;
      const deleteCheckbox = document.getElementById(
        "delete-mode"
      ) as HTMLInputElement;
      const placeModeCheckbox = document.getElementById(
        "place-mode"
      ) as HTMLInputElement;

      if (deleteCheckbox) deleteCheckbox.checked = false;
      if (placeModeCheckbox) placeModeCheckbox.checked = false;

      // Set this mode
      if (mode === "inspector") {
        this.inspectorMode = true;
        const inspectorCheckbox = document.getElementById(
          "inspector-mode"
        ) as HTMLInputElement;
        if (inspectorCheckbox) inspectorCheckbox.checked = true;
      }
    } else {
      if (mode === "inspector") {
        this.inspectorMode = false;
      }
    }

    this.updateCanvasCursor();
    this.updateInspectorPanel();
  }

  private updateCanvasCursor(): void {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    canvas.classList.remove("inspector-cursor");
    if (this.inspectorMode) {
      canvas.classList.add("inspector-cursor");
    }
  }
}