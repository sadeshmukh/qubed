import { Vector } from "../../core/Vector";
import { RigidBody } from "../../core/RigidBody";
import { Box } from "../../shapes/Box";
import { NGon } from "../../shapes/NGon";

export interface ObjectSettings {
  type: string;
  mass: number;
  width: number;
  height: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
}

export class ObjectFactory {
  private createMode: boolean = false;
  private worldWidth: number;
  private worldHeight: number;
  private onObjectCreated?: (object: RigidBody) => void;
  private getExistingObjects?: () => RigidBody[];

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  setObjectCreatedCallback(callback: (object: RigidBody) => void): void {
    this.onObjectCreated = callback;
  }

  setGetExistingObjectsCallback(callback: () => RigidBody[]): void {
    this.getExistingObjects = callback;
  }

  setupCreatePanel(): void {
    const createBtn = document.getElementById(
      "create-btn"
    ) as HTMLButtonElement;
    const createPanel = document.getElementById(
      "create-panel"
    ) as HTMLDivElement;
    const placeModeCheckbox = document.getElementById(
      "place-mode"
    ) as HTMLInputElement;
    const createRandomBtn = document.getElementById(
      "create-random"
    ) as HTMLButtonElement;

    if (createBtn && createPanel) {
      createBtn.addEventListener("click", () => {
        this.closeAllPanelsExcept("create-panel");
        createPanel.style.display =
          createPanel.style.display === "none" ? "block" : "none";
      });
    }

    if (placeModeCheckbox) {
      placeModeCheckbox.addEventListener("change", () => {
        this.setExclusiveMode("create", placeModeCheckbox.checked);
      });
    }

    if (createRandomBtn) {
      createRandomBtn.addEventListener("click", () => {
        const existingObjects = this.getExistingObjects ? this.getExistingObjects() : [];
        const randomObject = this.createRandomObject(existingObjects);
        if (randomObject && this.onObjectCreated) {
          this.onObjectCreated(randomObject);
        }
      });
    }

    this.setupCreateFormControls();
  }

  private setupCreateFormControls(): void {
    const typeSelect = document.getElementById(
      "create-type"
    ) as HTMLSelectElement;
    const boxDimensions = document.getElementById(
      "box-dimensions"
    ) as HTMLDivElement;
    const ngonRadius = document.getElementById("ngon-radius") as HTMLDivElement;

    if (typeSelect) {
      typeSelect.addEventListener("change", () => {
        const isBox = typeSelect.value === "box";
        if (boxDimensions && ngonRadius) {
          boxDimensions.style.display = isBox ? "block" : "none";
          ngonRadius.style.display = isBox ? "none" : "block";
        }
      });
    }

    this.setupSliderValueUpdates();
  }

  private setupSliderValueUpdates(): void {
    const sliders = [
      { slider: "create-mass", value: "create-mass-value", precision: 1 },
      { slider: "create-width", value: "create-width-value", precision: 0 },
      { slider: "create-height", value: "create-height-value", precision: 0 },
      { slider: "create-radius", value: "create-radius-value", precision: 0 },
      { slider: "create-angular", value: "create-angular-value", precision: 1 },
    ];

    sliders.forEach(({ slider, value, precision }) => {
      const sliderEl = document.getElementById(slider) as HTMLInputElement;
      const valueEl = document.getElementById(value) as HTMLSpanElement;
      if (sliderEl && valueEl) {
        sliderEl.addEventListener("input", () => {
          const val = parseFloat(sliderEl.value);
          valueEl.textContent = val.toFixed(precision);
        });
      }
    });
  }

  setCreateMode(enabled: boolean): void {
    this.createMode = enabled;
    this.updateCanvasCursor();
  }

  private setExclusiveMode(
    mode: "inspector" | "delete" | "create",
    enabled: boolean
  ): void {
    if (enabled) {
      // Clear other modes
      this.createMode = false;
      const inspectorCheckbox = document.getElementById(
        "inspector-mode"
      ) as HTMLInputElement;
      const deleteCheckbox = document.getElementById(
        "delete-mode"
      ) as HTMLInputElement;

      if (inspectorCheckbox) inspectorCheckbox.checked = false;
      if (deleteCheckbox) deleteCheckbox.checked = false;

      // Set this mode
      if (mode === "create") {
        this.createMode = true;
        const placeModeCheckbox = document.getElementById(
          "place-mode"
        ) as HTMLInputElement;
        if (placeModeCheckbox) placeModeCheckbox.checked = true;
      }
    } else {
      if (mode === "create") {
        this.createMode = false;
      }
    }

    this.updateCanvasCursor();
  }

  getCreateMode(): boolean {
    return this.createMode;
  }

  private updateCanvasCursor(): void {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    canvas.classList.remove("create-cursor");
    if (this.createMode) {
      canvas.classList.add("create-cursor");
    }
  }

  createRandomObject(existingObjects?: RigidBody[]): RigidBody | null {
    const worldCenter = new Vector(this.worldWidth / 2, this.worldHeight / 2);
    let attempts = 0;
    let validPosition = false;
    let newPosition = worldCenter;
    const objects = existingObjects || [];

    while (!validPosition && attempts < 50) {
      newPosition = worldCenter.add(
        new Vector((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300)
      );

      validPosition = !this.checkOverlapAtPosition(newPosition, objects);
      attempts++;
    }

    if (validPosition) {
      return this.createObjectAtPosition(newPosition);
    }
    return null;
  }

  createObjectAtPosition(position: Vector): RigidBody {
    const settings = this.getCurrentObjectSettings();
    let newObject: RigidBody;

    if (settings.type === "box") {
      newObject = new Box(
        settings.mass,
        position,
        settings.width,
        settings.height
      );
    } else {
      const sidesMap: { [key: string]: number } = {
        triangle: 3,
        pentagon: 5,
        hexagon: 6,
        circle: 10,
      };
      const sides = sidesMap[settings.type] || 6;

      newObject = new NGon(settings.mass, position, settings.radius, sides);
    }

    // apply initial velocity and angular velocity!!
    newObject.velocity = new Vector(settings.velocityX, settings.velocityY);
    newObject.angularVelocity = settings.angularVelocity;

    return newObject;
  }

  handleCreateClick(
    event: MouseEvent,
    screenToWorld: (pos: Vector) => Vector,
    objects: RigidBody[]
  ): RigidBody | null {
    if (!this.createMode) return null;

    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const worldPos = screenToWorld(new Vector(screenX, screenY));

    // don't create if overlap
    if (this.checkOverlapAtPosition(worldPos, objects)) {
      return null;
    }

    return this.createObjectAtPosition(worldPos);
  }

  private checkOverlapAtPosition(
    position: Vector,
    objects: RigidBody[]
  ): boolean {
    const minDistance = 60;

    for (const object of objects) {
      const distance = object.position.subtract(position).magnitude();
      if (distance < minDistance) {
        return true;
      }
    }
    return false;
  }

  private getCurrentObjectSettings(): ObjectSettings {
    const typeSelect = document.getElementById(
      "create-type"
    ) as HTMLSelectElement;
    const massSlider = document.getElementById(
      "create-mass"
    ) as HTMLInputElement;
    const widthSlider = document.getElementById(
      "create-width"
    ) as HTMLInputElement;
    const heightSlider = document.getElementById(
      "create-height"
    ) as HTMLInputElement;
    const radiusSlider = document.getElementById(
      "create-radius"
    ) as HTMLInputElement;
    const velXInput = document.getElementById(
      "create-vel-x"
    ) as HTMLInputElement;
    const velYInput = document.getElementById(
      "create-vel-y"
    ) as HTMLInputElement;
    const angularSlider = document.getElementById(
      "create-angular"
    ) as HTMLInputElement;

    return {
      type: typeSelect?.value || "box",
      mass: parseFloat(massSlider?.value || "2"),
      width: parseInt(widthSlider?.value || "60"),
      height: parseInt(heightSlider?.value || "60"),
      radius: parseInt(radiusSlider?.value || "30"),
      velocityX: parseFloat(velXInput?.value || "0"),
      velocityY: parseFloat(velYInput?.value || "0"),
      angularVelocity: parseFloat(angularSlider?.value || "0"),
    };
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
