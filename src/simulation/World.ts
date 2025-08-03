import { Object } from "../core/Object";
import { RigidBody } from "../core/RigidBody";
import { Wall } from "../shapes/Wall";
import { Vector } from "../core/Vector";
import { CollisionSystem } from "../collision/CollisionSystem";
import { CollisionInfo } from "../collision/CollisionInfo";
import {
  WORLD,
  PHYSICS,
  WIND,
  COLORS,
  setWindForce,
  applyColorTheme,
} from "../utils/Constants";
import { Box } from "../shapes/Box";
import { NGon } from "../shapes/NGon";

interface FadingContactPoint {
  position: Vector;
  timeCreated: number;
}

export class World {
  objects: Object[] = [];
  walls: Wall[] = [];
  ctx: CanvasRenderingContext2D | null = null;
  private contactPoints: Vector[] = [];
  private fadingContactPoints: FadingContactPoint[] = [];
  private collisions: CollisionInfo[] = [];
  private currentTime: number = 0;
  private timeSpeed: number = 1.0;
  private inspectorMode: boolean = false;
  private selectedObject: RigidBody | null = null;
  private currentTheme: string = "default";
  private isPaused: boolean = false;
  private contactPointDuration: number = 1.0;
  private createMode: boolean = false;
  private pendingObjectSettings: any = null;

  worldWidth: number = WORLD.COORDINATE_SYSTEM;
  worldHeight: number = WORLD.COORDINATE_SYSTEM;
  private screenWidth: number = WORLD.COORDINATE_SYSTEM;
  private screenHeight: number = WORLD.COORDINATE_SYSTEM;

  addObject(object: Object) {
    this.objects.push(object);
  }

  addWall(wall: Wall) {
    this.walls.push(wall);
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setScreenSize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  worldToScreen(worldPos: Vector): Vector {
    const x = (worldPos.x / this.worldWidth) * this.screenWidth;
    const y = (worldPos.y / this.worldHeight) * this.screenHeight;
    return new Vector(x, y);
  }

  screenToWorld(screenPos: Vector): Vector {
    const x = (screenPos.x / this.screenWidth) * this.worldWidth;
    const y = (screenPos.y / this.screenHeight) * this.worldHeight;
    return new Vector(x, y);
  }

  update(dt: number) {
    if (!this.isPaused) {
      const scaledDt = dt * this.timeSpeed;
      this.currentTime += scaledDt;

      const clampedDt = Math.min(scaledDt, PHYSICS.MAX_TIMESTEP);
      const subSteps = Math.ceil(clampedDt / PHYSICS.MIN_TIMESTEP);
      const subDt = clampedDt / subSteps;

      for (let i = 0; i < subSteps; i++) {
        this.updateObjects(subDt);
        this.checkBounds();
        this.checkCollisions();
        this.resolveCollisions();
      }
    }

    this.updateFadingContactPoints();
    this.render();

    if (this.selectedObject) {
      this.updateInspector();
    }
  }

  updateObjects(dt: number) {
    for (const object of this.objects) {
      if (object instanceof RigidBody && WIND.ENABLED) {
        const invertedWindForce = new Vector(WIND.FORCE.x, WIND.FORCE.y);
        object.applyForce(invertedWindForce);
      }
      object.update(dt);
    }
  }

  checkBounds() {
    const worldOrigin = new Vector(this.worldWidth / 2, this.worldHeight / 2);
    const margin = 50;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const pos = object.position;

        if (
          pos.x < -margin ||
          pos.x > this.worldWidth + margin ||
          pos.y < -margin ||
          pos.y > this.worldHeight + margin
        ) {
          object.position = worldOrigin;
          object.velocity = new Vector(0, 0);
          object.angularVelocity = 0;
        }
      }
    }
  }

  checkCollisions() {
    this.collisions = [];
    this.contactPoints = [];

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.clearContactPoints();
      }
    }

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        for (const wall of this.walls) {
          const info = CollisionSystem.checkWallCollision(object, wall);
          if (info) {
            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            this.addFadingContactPoint(info.contactPoint);
            object.setContactPoints([info.contactPoint]);
          }
        }
      }
    }

    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const obj1 = this.objects[i];
        const obj2 = this.objects[j];

        if (obj1 instanceof RigidBody && obj2 instanceof RigidBody) {
          const info = CollisionSystem.checkCollision(obj1, obj2);
          if (info) {
            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            this.addFadingContactPoint(info.contactPoint);
            obj1.setContactPoints([info.contactPoint]);
            obj2.setContactPoints([info.contactPoint]);
          }
        }
      }
    }
  }

  private resolveCollisions() {
    for (const info of this.collisions) {
      CollisionSystem.resolveCollision(info);
    }
  }

  render() {
    if (!this.ctx) {
      return;
    }

    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.ctx.save();
    this.ctx.scale(
      this.screenWidth / this.worldWidth,
      this.screenHeight / this.worldHeight
    );

    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.worldWidth, this.worldHeight);
    this.ctx.clip();

    for (const object of this.objects) {
      object.draw(this.ctx);
    }

    for (const wall of this.walls) {
      wall.draw(this.ctx);
    }

    this.drawDebugInfo();

    this.ctx.restore();
  }

  private addFadingContactPoint(position: Vector) {
    // check for existing contact point near position - then don't add and increase original
    const threshold = 3.0;
    const recentTime = 0.1;

    for (const existing of this.fadingContactPoints) {
      const distance = existing.position.subtract(position).magnitude();
      const age = this.currentTime - existing.timeCreated;

      if (distance < threshold && age < recentTime) {
        return;
      }
    }

    this.fadingContactPoints.push({
      position: position,
      timeCreated: this.currentTime,
    });
  }

  private updateFadingContactPoints() {
    this.fadingContactPoints = this.fadingContactPoints.filter(
      (point) =>
        this.currentTime - point.timeCreated < this.contactPointDuration
    );
  }

  private drawDebugInfo() {
    if (!this.ctx) {
      return;
    }

    // draw contact points
    for (const fadingPoint of this.fadingContactPoints) {
      const age = this.currentTime - fadingPoint.timeCreated;
      const alpha = Math.max(0, 1 - age / this.contactPointDuration);

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = COLORS.CONTACT_POINT;
      this.ctx.shadowColor = COLORS.CONTACT_POINT;
      this.ctx.shadowBlur = 15 * alpha;
      this.ctx.beginPath();
      this.ctx.arc(
        fadingPoint.position.x,
        fadingPoint.position.y,
        6,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    this.ctx.globalAlpha = 1.0;
  }

  public setupControlPanel() {
    const controlBtn = document.getElementById(
      "control-btn"
    ) as HTMLButtonElement;
    const controlPanel = document.getElementById(
      "control-panel"
    ) as HTMLDivElement;

    if (!controlBtn || !controlPanel) return;

    controlBtn.addEventListener("click", () => {
      controlPanel.style.display =
        controlPanel.style.display === "none" ? "block" : "none";
    });

    this.loadSettings();

    const windX = document.getElementById("wind-x") as HTMLInputElement;
    const windY = document.getElementById("wind-y") as HTMLInputElement;
    const windEnabled = document.getElementById(
      "wind-enabled"
    ) as HTMLInputElement;

    if (windX && windY && windEnabled) {
      const updateWind = () => {
        const x = parseFloat(windX.value);
        const y = parseFloat(windY.value);
        setWindForce(new Vector(x, y));
        WIND.ENABLED = windEnabled.checked;
        this.saveSettings();
      };

      windX.addEventListener("input", updateWind);
      windY.addEventListener("input", updateWind);
      windEnabled.addEventListener("change", updateWind);
    }

    this.setupPhysicsControls();
    this.setupTimeSpeedControl();
    this.setupContactDurationControl();
    this.setupThemeControls();
    this.setupInspectorMode();
    this.setupPauseButton();
    this.setupCreateModal();
    this.setupActionButtons();
  }

  private setupPhysicsControls() {
    const restitutionSlider = document.getElementById(
      "restitution"
    ) as HTMLInputElement;
    const restitutionValue = document.getElementById(
      "restitution-value"
    ) as HTMLSpanElement;
    const frictionSlider = document.getElementById(
      "friction"
    ) as HTMLInputElement;
    const frictionValue = document.getElementById(
      "friction-value"
    ) as HTMLSpanElement;
    const airResistanceSlider = document.getElementById(
      "air-resistance"
    ) as HTMLInputElement;
    const airResistanceValue = document.getElementById(
      "air-resistance-value"
    ) as HTMLSpanElement;

    if (restitutionSlider && restitutionValue) {
      restitutionSlider.addEventListener("input", () => {
        const value = parseFloat(restitutionSlider.value);
        restitutionValue.textContent = value.toString();
        // modify from Constants.ts
      });
    }

    if (frictionSlider && frictionValue) {
      frictionSlider.addEventListener("input", () => {
        const value = parseFloat(frictionSlider.value);
        frictionValue.textContent = value.toString();
      });
    }

    if (airResistanceSlider && airResistanceValue) {
      airResistanceSlider.addEventListener("input", () => {
        const value = parseFloat(airResistanceSlider.value);
        airResistanceValue.textContent = value.toString();
      });
    }
  }

  private setupActionButtons() {
    const resetBtn = document.getElementById(
      "reset-objects"
    ) as HTMLButtonElement;
    const debugBtn = document.getElementById(
      "toggle-debug"
    ) as HTMLButtonElement;
    const resetSettingsBtn = document.getElementById(
      "reset-settings"
    ) as HTMLButtonElement;

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        this.resetObjects();
      });
    }

    if (debugBtn) {
      debugBtn.addEventListener("click", () => {
        this.toggleDebugMode();
      });
    }

    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener("click", () => {
        this.resetSettings();
      });
    }
  }

  private resetObjects() {
    const worldCenter = new Vector(this.worldWidth / 2, this.worldHeight / 2);
    const rigidBodies = this.objects.filter(
      (obj) => obj instanceof RigidBody
    ) as RigidBody[];
    const placedPositions: Vector[] = [];

    for (const object of rigidBodies) {
      let attempts = 0;
      let validPosition = false;
      let newPosition = worldCenter;

      while (!validPosition && attempts < 50) {
        newPosition = worldCenter.add(
          new Vector((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300)
        );

        // check if overlap with existing objects
        validPosition = true;
        for (const placedPos of placedPositions) {
          const distance = newPosition.subtract(placedPos).magnitude();
          if (distance < 80) {
            validPosition = false;
            break;
          }
        }
        attempts++;
      }

      if (validPosition) {
        object.position = newPosition;
        object.velocity = new Vector(0, 0);
        object.angularVelocity = 0;
        object.rotation = 0;
        placedPositions.push(newPosition);
      }
    }

    // clear contact points
    this.fadingContactPoints = [];
  }

  private toggleDebugMode() {
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.setDebugMode(!object.debugMode);
      }
    }
  }

  private setupTimeSpeedControl() {
    const timeSpeedSlider = document.getElementById(
      "time-speed"
    ) as HTMLInputElement;
    const timeSpeedValue = document.getElementById(
      "time-speed-value"
    ) as HTMLSpanElement;

    if (timeSpeedSlider && timeSpeedValue) {
      timeSpeedSlider.addEventListener("input", () => {
        this.timeSpeed = parseFloat(timeSpeedSlider.value);
        timeSpeedValue.textContent = `${this.timeSpeed.toFixed(1)}x`;
        this.saveSettings();
      });
    }
  }

  private setupThemeControls() {
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;

    if (themeSelect) {
      themeSelect.addEventListener("change", () => {
        this.applyTheme(themeSelect.value);
      });
    }
  }

  private applyTheme(theme: string) {
    this.currentTheme = theme;
    const themes = {
      default: {
        background: "#0a0a0f",
        box: "#3b82f6",
        hexagon: "#f59e0b",
        particle: "#ef4444",
        boundary: "#374151",
        contactPoint: "#fbbf24",
        velocityVector: "#10b981",
        angularVector: "#f472b6",
      },
      neon: {
        background: "#000509",
        box: "#00ffff",
        hexagon: "#ff00ff",
        particle: "#ffff00",
        boundary: "#ff0080",
        contactPoint: "#00ff00",
        velocityVector: "#ff8000",
        angularVector: "#8000ff",
      },
      sunset: {
        background: "#1a0f0a",
        box: "#ff6b35",
        hexagon: "#f7931e",
        particle: "#ffd23f",
        boundary: "#c1272d",
        contactPoint: "#ffad3b",
        velocityVector: "#ff8c69",
        angularVector: "#ff69b4",
      },
      minimal: {
        background: "#fafafa",
        box: "#2d3748",
        hexagon: "#4a5568",
        particle: "#718096",
        boundary: "#1a202c",
        contactPoint: "#e53e3e",
        velocityVector: "#38a169",
        angularVector: "#805ad5",
      },
    };

    const selectedTheme =
      themes[theme as keyof typeof themes] || themes.default;
    applyColorTheme(selectedTheme);
    this.saveSettings();
  }

  private setupInspectorMode() {
    const inspectorCheckbox = document.getElementById(
      "inspector-mode"
    ) as HTMLInputElement;
    const inspectorPanel = document.getElementById(
      "object-inspector"
    ) as HTMLDivElement;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (inspectorCheckbox && inspectorPanel && canvas) {
      inspectorCheckbox.addEventListener("change", () => {
        this.inspectorMode = inspectorCheckbox.checked;
        inspectorPanel.style.display = this.inspectorMode ? "block" : "none";

        if (this.inspectorMode) {
          canvas.classList.add("inspector-cursor");
          this.setupCanvasClickHandler();
        } else {
          canvas.classList.remove("inspector-cursor");
          this.selectedObject = null;
        }
        this.saveSettings();
      });
    }
  }

  private setupCanvasClickHandler() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (canvas) {
      canvas.addEventListener("click", (event) => {
        if (!this.inspectorMode) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        const worldPos = this.screenToWorld(new Vector(screenX, screenY));

        // find the clicked object
        for (const object of this.objects) {
          if (object instanceof RigidBody) {
            const distance = object.position.subtract(worldPos).magnitude();
            if (distance < 50) {
              this.selectedObject = object;
              this.updateInspector();
              break;
            }
          }
        }
      });
    }
  }

  private updateInspector() {
    if (!this.selectedObject) return;

    const typeEl = document.getElementById("inspector-type") as HTMLSpanElement;
    const massEl = document.getElementById("inspector-mass") as HTMLSpanElement;
    const velocityEl = document.getElementById(
      "inspector-velocity"
    ) as HTMLSpanElement;
    const angularEl = document.getElementById(
      "inspector-angular"
    ) as HTMLSpanElement;

    if (typeEl && massEl && velocityEl && angularEl) {
      typeEl.textContent = this.selectedObject.constructor.name;
      massEl.textContent = this.selectedObject.mass.toFixed(1);
      velocityEl.textContent = this.selectedObject.velocity
        .magnitude()
        .toFixed(1);
      angularEl.textContent = this.selectedObject.angularVelocity.toFixed(2);
    }

    // render object in INSPECTOR canvas
    this.renderInspectorObject();
  }

  private renderInspectorObject() {
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

      const color = sides === 6 ? COLORS.HEXAGON : COLORS.PARTICLE;
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

  private setupContactDurationControl() {
    const durationSlider = document.getElementById(
      "contact-duration"
    ) as HTMLInputElement;
    const durationValue = document.getElementById(
      "contact-duration-value"
    ) as HTMLSpanElement;

    if (durationSlider && durationValue) {
      durationSlider.addEventListener("input", () => {
        this.contactPointDuration = parseFloat(durationSlider.value);
        durationValue.textContent = `${this.contactPointDuration.toFixed(1)}s`;
        this.saveSettings();
      });
    }
  }

  private setupPauseButton() {
    const pauseBtn = document.getElementById("pause-btn") as HTMLButtonElement;

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        this.isPaused = !this.isPaused;
        pauseBtn.textContent = this.isPaused ? "Play" : "Pause";
        pauseBtn.classList.toggle("paused", this.isPaused);
      });
    }
  }

  private setupCreateModal() {
    const createBtn = document.getElementById(
      "create-btn"
    ) as HTMLButtonElement;
    const modal = document.getElementById("create-modal") as HTMLDivElement;
    const closeBtn = document.getElementById(
      "close-modal"
    ) as HTMLButtonElement;
    const cancelBtn = document.getElementById(
      "create-cancel"
    ) as HTMLButtonElement;
    const confirmBtn = document.getElementById(
      "create-confirm"
    ) as HTMLButtonElement;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (createBtn && modal) {
      createBtn.addEventListener("click", () => {
        this.openCreateModal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.closeCreateModal();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this.closeCreateModal();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        this.startCreateMode();
      });
    }

    // Set up the dynamic form controls
    this.setupCreateFormControls();

    // Set up canvas click handler for creation
    if (canvas) {
      canvas.addEventListener("click", (event) => {
        if (this.createMode) {
          this.handleCreateClick(event);
        }
      });
    }
  }

  private setupCreateFormControls() {
    const typeSelect = document.getElementById(
      "create-type"
    ) as HTMLSelectElement;
    const boxDimensions = document.getElementById(
      "box-dimensions"
    ) as HTMLDivElement;
    const ngonRadius = document.getElementById("ngon-radius") as HTMLDivElement;

    // type change
    if (typeSelect) {
      typeSelect.addEventListener("change", () => {
        const isBox = typeSelect.value === "box";
        if (boxDimensions && ngonRadius) {
          boxDimensions.style.display = isBox ? "block" : "none";
          ngonRadius.style.display = isBox ? "none" : "block";
        }
      });
    }

    // value update
    const massSlider = document.getElementById(
      "create-mass"
    ) as HTMLInputElement;
    const massValue = document.getElementById(
      "create-mass-value"
    ) as HTMLSpanElement;
    if (massSlider && massValue) {
      massSlider.addEventListener("input", () => {
        massValue.textContent = parseFloat(massSlider.value).toFixed(1);
      });
    }

    const widthSlider = document.getElementById(
      "create-width"
    ) as HTMLInputElement;
    const widthValue = document.getElementById(
      "create-width-value"
    ) as HTMLSpanElement;
    if (widthSlider && widthValue) {
      widthSlider.addEventListener("input", () => {
        widthValue.textContent = widthSlider.value;
      });
    }

    const heightSlider = document.getElementById(
      "create-height"
    ) as HTMLInputElement;
    const heightValue = document.getElementById(
      "create-height-value"
    ) as HTMLSpanElement;
    if (heightSlider && heightValue) {
      heightSlider.addEventListener("input", () => {
        heightValue.textContent = heightSlider.value;
      });
    }

    const radiusSlider = document.getElementById(
      "create-radius"
    ) as HTMLInputElement;
    const radiusValue = document.getElementById(
      "create-radius-value"
    ) as HTMLSpanElement;
    if (radiusSlider && radiusValue) {
      radiusSlider.addEventListener("input", () => {
        radiusValue.textContent = radiusSlider.value;
      });
    }

    const angularSlider = document.getElementById(
      "create-angular"
    ) as HTMLInputElement;
    const angularValue = document.getElementById(
      "create-angular-value"
    ) as HTMLSpanElement;
    if (angularSlider && angularValue) {
      angularSlider.addEventListener("input", () => {
        angularValue.textContent = parseFloat(angularSlider.value).toFixed(1);
      });
    }
  }

  private openCreateModal() {
    const modal = document.getElementById("create-modal") as HTMLDivElement;
    const body = document.body;

    if (modal) {
      modal.style.display = "flex";
      body.classList.add("modal-open");
    }
  }

  private closeCreateModal() {
    const modal = document.getElementById("create-modal") as HTMLDivElement;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const body = document.body;

    if (modal) {
      modal.style.display = "none";
      body.classList.remove("modal-open");
    }

    if (canvas) {
      canvas.classList.remove("create-cursor");
    }

    this.createMode = false;
    this.pendingObjectSettings = null;
  }

  private startCreateMode() {
    // gather all settings from the form
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

    this.pendingObjectSettings = {
      type: typeSelect?.value || "box",
      mass: parseFloat(massSlider?.value || "2"),
      width: parseInt(widthSlider?.value || "60"),
      height: parseInt(heightSlider?.value || "60"),
      radius: parseInt(radiusSlider?.value || "30"),
      velocityX: parseFloat(velXInput?.value || "0"),
      velocityY: parseFloat(velYInput?.value || "0"),
      angularVelocity: parseFloat(angularSlider?.value || "0"),
    };

    this.createMode = true;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      canvas.classList.add("create-cursor");
    }

    this.closeCreateModal();
  }

  private handleCreateClick(event: MouseEvent) {
    if (!this.createMode || !this.pendingObjectSettings) return;

    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const worldPos = this.screenToWorld(new Vector(screenX, screenY));

    // don't create if overlap
    if (this.checkOverlapAtPosition(worldPos)) {
      return;
    }

    this.createObjectAtPosition(worldPos);
  }

  private checkOverlapAtPosition(position: Vector): boolean {
    const minDistance = 60;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const distance = object.position.subtract(position).magnitude();
        if (distance < minDistance) {
          return true;
        }
      }
    }
    return false;
  }

  private createObjectAtPosition(position: Vector) {
    if (!this.pendingObjectSettings) return;

    const settings = this.pendingObjectSettings;
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

    // apply initial velocity and angular velocity
    newObject.velocity = new Vector(settings.velocityX, settings.velocityY);
    newObject.angularVelocity = settings.angularVelocity;

    this.addObject(newObject);

    this.createMode = false;
    this.pendingObjectSettings = null;

    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      canvas.classList.remove("create-cursor");
    }
  }

  private saveSettings() {
    const settings = {
      windForce: { x: WIND.FORCE.x, y: WIND.FORCE.y },
      windEnabled: WIND.ENABLED,
      timeSpeed: this.timeSpeed,
      contactPointDuration: this.contactPointDuration,
      theme: this.currentTheme,
      inspectorMode: this.inspectorMode,
    };

    try {
      localStorage.setItem("qubed-settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("Failed to save settings to localStorage:", e);
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem("qubed-settings");
      if (!saved) return;

      const settings = JSON.parse(saved);

      // apply wind settings
      if (settings.windForce) {
        setWindForce(new Vector(settings.windForce.x, settings.windForce.y));
        const windX = document.getElementById("wind-x") as HTMLInputElement;
        const windY = document.getElementById("wind-y") as HTMLInputElement;
        if (windX && windY) {
          windX.value = settings.windForce.x.toString();
          windY.value = settings.windForce.y.toString();
        }
      }

      if (settings.windEnabled !== undefined) {
        WIND.ENABLED = settings.windEnabled;
        const windEnabled = document.getElementById(
          "wind-enabled"
        ) as HTMLInputElement;
        if (windEnabled) windEnabled.checked = settings.windEnabled;
      }

      // apply time speed
      if (settings.timeSpeed !== undefined) {
        this.timeSpeed = settings.timeSpeed;
        const timeSpeedSlider = document.getElementById(
          "time-speed"
        ) as HTMLInputElement;
        const timeSpeedValue = document.getElementById(
          "time-speed-value"
        ) as HTMLSpanElement;
        if (timeSpeedSlider && timeSpeedValue) {
          timeSpeedSlider.value = settings.timeSpeed.toString();
          timeSpeedValue.textContent = `${settings.timeSpeed.toFixed(1)}x`;
        }
      }

      if (settings.contactPointDuration !== undefined) {
        this.contactPointDuration = settings.contactPointDuration;
        const durationSlider = document.getElementById(
          "contact-duration"
        ) as HTMLInputElement;
        const durationValue = document.getElementById(
          "contact-duration-value"
        ) as HTMLSpanElement;
        if (durationSlider && durationValue) {
          durationSlider.value = settings.contactPointDuration.toString();
          durationValue.textContent = `${settings.contactPointDuration.toFixed(
            1
          )}s`;
        }
      }

      if (settings.theme) {
        this.currentTheme = settings.theme;
        const themeSelect = document.getElementById(
          "theme-select"
        ) as HTMLSelectElement;
        if (themeSelect) themeSelect.value = settings.theme;
        this.applyTheme(settings.theme);
      }
    } catch (e) {
      console.warn("Failed to load settings from localStorage:", e);
    }
  }

  private resetSettings() {
    try {
      localStorage.removeItem("qubed-settings");
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }

    setWindForce(new Vector(0, 0.05));
    WIND.ENABLED = true;
    this.timeSpeed = 1.0;
    this.contactPointDuration = 1.0;
    this.currentTheme = "default";
    this.inspectorMode = false;
    this.selectedObject = null;

    const windX = document.getElementById("wind-x") as HTMLInputElement;
    const windY = document.getElementById("wind-y") as HTMLInputElement;
    const windEnabled = document.getElementById(
      "wind-enabled"
    ) as HTMLInputElement;
    const timeSpeedSlider = document.getElementById(
      "time-speed"
    ) as HTMLInputElement;
    const timeSpeedValue = document.getElementById(
      "time-speed-value"
    ) as HTMLSpanElement;
    const durationSlider = document.getElementById(
      "contact-duration"
    ) as HTMLInputElement;
    const durationValue = document.getElementById(
      "contact-duration-value"
    ) as HTMLSpanElement;
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    const inspectorCheckbox = document.getElementById(
      "inspector-mode"
    ) as HTMLInputElement;
    const inspectorPanel = document.getElementById(
      "object-inspector"
    ) as HTMLDivElement;

    if (windX) windX.value = "0";
    if (windY) windY.value = "0.05";
    if (windEnabled) windEnabled.checked = true;
    if (timeSpeedSlider) timeSpeedSlider.value = "1";
    if (timeSpeedValue) timeSpeedValue.textContent = "1.0x";
    if (durationSlider) durationSlider.value = "1";
    if (durationValue) durationValue.textContent = "1.0s";
    if (themeSelect) themeSelect.value = "default";
    if (inspectorCheckbox) inspectorCheckbox.checked = false;
    if (inspectorPanel) inspectorPanel.style.display = "none";

    // apply default theme
    this.applyTheme("default");
  }
}
