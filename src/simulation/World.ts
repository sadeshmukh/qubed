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
  CURRENT_THEME,
  CALMNESS_MESSAGES,
  setWindForce,
  applyColorTheme,
  getNextObjectColor,
  resetObjectColors,
  updatePhysicsSettings,
} from "../utils/Constants";
import { getTextureColor, TEXTURE_OPTIONS, THEMES } from "../utils/themes";
import { Box } from "../shapes/Box";
import { NGon } from "../shapes/NGon";
import { AudioSystem } from "../audio/AudioSystem";

interface FadingContactPoint {
  position: Vector;
  timeCreated: number;
}

interface CollisionRecord {
  timestamp: number;
  count: number;
}

interface ObjectPair {
  obj1Id: number;
  obj2Id: number;
  noCollisionUntil: number;
  lastSeparationTime: number;
}

export class World {
  objects: Object[] = [];
  walls: Wall[] = [];
  ctx: CanvasRenderingContext2D | null = null;
  private audioSystem: AudioSystem;
  private contactPoints: Vector[] = [];
  private fadingContactPoints: FadingContactPoint[] = [];
  private collisions: CollisionInfo[] = [];
  private processedCollisions: Set<string> = new Set();
  private currentTime: number = 0;
  private timeSpeed: number = 1.0;
  private inspectorMode: boolean = false;
  private selectedObject: RigidBody | null = null;
  private currentTheme: string = "default";
  private isPaused: boolean = false;
  private contactPointDuration: number = 1.0;
  private createMode: boolean = false;
  private cursorTrailEnabled: boolean = false;
  private cursorTrailLength: number = 10;
  private cursorTrailFade: number = 0.8;
  private cursorTrailPoints: Array<{ position: Vector; time: number }> = [];
  private backgroundTexture: string = "none";
  private textureImages: Map<string, HTMLImageElement> = new Map();
  private deleteMode: boolean = false;
  private totalMomentum: Vector = new Vector(0, 0);
  private totalAngularMomentum: number = 0;
  private momentumHistory: number[] = [];
  private lastTotalKineticEnergy: number = 0;
  private recentCollisions: number = 0;
  private frameSkipCounter: number = 0;
  private lastCollisionCheck: number = 0;
  private collisionHistory: Map<string, CollisionRecord> = new Map();
  private objectPairStates: Map<string, ObjectPair> = new Map();
  private readonly COLLISION_THRESHOLD = 5;
  private readonly TIME_WINDOW = 2000;
  private readonly NO_COLLISION_DURATION = 1000;

  worldWidth: number = WORLD.COORDINATE_SYSTEM;
  worldHeight: number = WORLD.COORDINATE_SYSTEM;

  constructor() {
    this.audioSystem = new AudioSystem();
    this.audioSystem.initialize();
  }
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

    if (this.frameSkipCounter % 5 === 0) {
      this.updateMomentumDisplay();
      this.updateCalmnessIndicator();
    }

    // Update audio based on object velocities
    this.updateAudio();

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
    this.processedCollisions.clear();
    this.recentCollisions = 0;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.clearContactPoints();
      }
    }

    // optimize: skip detailed collision checks if there are too many objects
    // also means problems :D
    const shouldSkipDetailedChecks = this.objects.length > 25;
    this.frameSkipCounter++;

    // wall collisions (always check these)
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        for (const wall of this.walls) {
          const info = CollisionSystem.checkWallCollision(object, wall);
          if (info) {
            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            this.addFadingContactPoint(info.contactPoint);
            object.setContactPoints([info.contactPoint]);

            // deduped wall collision sound
            const objectId = this.objects.indexOf(object);
            const collisionKey = `wall-${objectId}`;
            if (!this.processedCollisions.has(collisionKey)) {
              this.processedCollisions.add(collisionKey);
              this.recentCollisions++;
              const velocity = object.velocity.magnitude();
              const objectSize = this.getObjectSize(object);
              const objectMass = this.getObjectMass(object);
              this.audioSystem.playCollisionSound(
                velocity,
                true,
                objectSize,
                objectMass
              );
            }
          }
        }
      }
    }

    if (shouldSkipDetailedChecks && this.frameSkipCounter % 2 !== 0) {
      return;
    }

    // use spatial partitioning for performance with many objects
    if (this.objects.length > 15) {
      this.checkCollisionsOptimized();
    } else {
      this.checkCollisionsBruteForce();
    }
  }

  private checkCollisionsBruteForce() {
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const obj1 = this.objects[i];
        const obj2 = this.objects[j];

        if (obj1 instanceof RigidBody && obj2 instanceof RigidBody) {
          const obj1Id = this.objects.indexOf(obj1);
          const obj2Id = this.objects.indexOf(obj2);
          const pairKey = `${Math.min(obj1Id, obj2Id)}-${Math.max(
            obj1Id,
            obj2Id
          )}`;

          // skip collision if in no-collision state
          // secret sauce behind the cheat of avoiding bad collisions
          if (this.shouldSkipCollision(pairKey)) {
            this.applySeparationForce(obj1, obj2);
            continue;
          }

          const info = CollisionSystem.checkCollision(obj1, obj2);
          if (info) {
            this.trackCollision(pairKey);

            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            this.addFadingContactPoint(info.contactPoint);
            obj1.setContactPoints([info.contactPoint]);
            obj2.setContactPoints([info.contactPoint]);

            // deduped object collision sound
            const collisionKey = `obj-${Math.min(obj1Id, obj2Id)}-${Math.max(
              obj1Id,
              obj2Id
            )}`;
            if (!this.processedCollisions.has(collisionKey)) {
              this.processedCollisions.add(collisionKey);
              this.recentCollisions++;
              const relativeVelocity = obj1.velocity
                .subtract(obj2.velocity)
                .magnitude();
              const averageSize =
                (this.getObjectSize(obj1) + this.getObjectSize(obj2)) / 2;
              const averageMass =
                (this.getObjectMass(obj1) + this.getObjectMass(obj2)) / 2;
              this.audioSystem.playCollisionSound(
                relativeVelocity,
                false,
                averageSize,
                averageMass
              );
            }
          }
        }
      }
    }
  }

  private checkCollisionsOptimized() {
    // partition world into cell
    const cellSize = 150;
    const cells: Map<string, RigidBody[]> = new Map();

    // place objects into cells
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const cellX = Math.floor(object.position.x / cellSize);
        const cellY = Math.floor(object.position.y / cellSize);
        const cellKey = `${cellX},${cellY}`;

        if (!cells.has(cellKey)) {
          cells.set(cellKey, []);
        }
        cells.get(cellKey)!.push(object);
      }
    }

    // check collisions only within current + adjacent cells
    for (const [cellKey, cellObjects] of cells) {
      for (let i = 0; i < cellObjects.length; i++) {
        for (let j = i + 1; j < cellObjects.length; j++) {
          const obj1 = cellObjects[i];
          const obj2 = cellObjects[j];

          const obj1Id = this.objects.indexOf(obj1);
          const obj2Id = this.objects.indexOf(obj2);
          const pairKey = `${Math.min(obj1Id, obj2Id)}-${Math.max(
            obj1Id,
            obj2Id
          )}`;

          // skip collision if in no-collision state
          if (this.shouldSkipCollision(pairKey)) {
            this.applySeparationForce(obj1, obj2);
            continue;
          }

          const info = CollisionSystem.checkCollision(obj1, obj2);
          if (info) {
            this.trackCollision(pairKey);

            this.collisions.push(info);
            this.contactPoints.push(info.contactPoint);
            this.addFadingContactPoint(info.contactPoint);
            obj1.setContactPoints([info.contactPoint]);
            obj2.setContactPoints([info.contactPoint]);

            const collisionKey = `obj-${Math.min(obj1Id, obj2Id)}-${Math.max(
              obj1Id,
              obj2Id
            )}`;
            if (!this.processedCollisions.has(collisionKey)) {
              this.processedCollisions.add(collisionKey);
              this.recentCollisions++;
              const relativeVelocity = obj1.velocity
                .subtract(obj2.velocity)
                .magnitude();
              const averageSize =
                (this.getObjectSize(obj1) + this.getObjectSize(obj2)) / 2;
              const averageMass =
                (this.getObjectMass(obj1) + this.getObjectMass(obj2)) / 2;
              this.audioSystem.playCollisionSound(
                relativeVelocity,
                false,
                averageSize,
                averageMass
              );
            }
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

    this.drawBackgroundTexture();

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
    this.drawCursorTrail();

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

  private drawCursorTrail() {
    if (
      !this.ctx ||
      !this.cursorTrailEnabled ||
      this.cursorTrailPoints.length < 2
    ) {
      return;
    }

    this.ctx.save();
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    for (let i = 1; i < this.cursorTrailPoints.length; i++) {
      const prev = this.cursorTrailPoints[i - 1];
      const curr = this.cursorTrailPoints[i];

      const alpha = (i / this.cursorTrailPoints.length) * this.cursorTrailFade;
      this.ctx.globalAlpha = alpha;
      this.ctx.strokeStyle = COLORS.TRAIL;

      this.ctx.beginPath();
      this.ctx.moveTo(prev.position.x, prev.position.y);
      this.ctx.lineTo(curr.position.x, curr.position.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private updateAudio(): void {
    if (!this.audioSystem) return;

    // max  velocity for wind
    let maxVelocity = 0;
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const velocity = object.velocity.magnitude();
        if (velocity > maxVelocity) {
          maxVelocity = velocity;
        }
      }
    }

    // don't block the render loop
    this.audioSystem.updateWindSound(maxVelocity);
  }

  private getObjectSize(object: RigidBody): number {
    if (object instanceof Box) {
      return Math.max(object.width, object.height);
    } else if (object instanceof NGon) {
      return object.radius * 2;
    }
    return 30;
  }

  private getObjectMass(object: RigidBody): number {
    return object.mass;
  }

  private setupAudioPanel(): void {
    const audioBtn = document.getElementById("audio-btn") as HTMLButtonElement;
    const audioPanel = document.getElementById("audio-panel") as HTMLDivElement;

    if (audioBtn && audioPanel) {
      audioBtn.addEventListener("click", () => {
        this.closeAllPanelsExcept("audio-panel");
        audioPanel.style.display =
          audioPanel.style.display === "none" ? "block" : "none";
      });
    }

    const audioEnabled = document.getElementById(
      "audio-enabled"
    ) as HTMLInputElement;
    if (audioEnabled) {
      audioEnabled.addEventListener("change", () => {
        this.audioSystem.updateSettings({ enabled: audioEnabled.checked });
        this.saveSettings();
      });
    }

    const masterVolume = document.getElementById(
      "master-volume"
    ) as HTMLInputElement;
    const masterVolumeValue = document.getElementById(
      "master-volume-value"
    ) as HTMLSpanElement;
    if (masterVolume && masterVolumeValue) {
      masterVolume.addEventListener("input", () => {
        const volume = parseInt(masterVolume.value) / 100;
        this.audioSystem.updateSettings({ volume });
        masterVolumeValue.textContent = `${masterVolume.value}%`;
        this.saveSettings();
      });
    }

    const collisionSounds = document.getElementById(
      "collision-sounds"
    ) as HTMLInputElement;
    if (collisionSounds) {
      collisionSounds.addEventListener("change", () => {
        this.audioSystem.updateSettings({
          collisionSoundsEnabled: collisionSounds.checked,
        });
        this.saveSettings();
      });
    }

    const collisionVolume = document.getElementById(
      "collision-volume"
    ) as HTMLInputElement;
    const collisionVolumeValue = document.getElementById(
      "collision-volume-value"
    ) as HTMLSpanElement;
    if (collisionVolume && collisionVolumeValue) {
      collisionVolume.addEventListener("input", () => {
        const volume = parseInt(collisionVolume.value) / 100;
        this.audioSystem.updateSettings({ collisionVolume: volume });
        collisionVolumeValue.textContent = `${collisionVolume.value}%`;
        this.saveSettings();
      });
    }

    const windSounds = document.getElementById(
      "wind-sounds"
    ) as HTMLInputElement;
    if (windSounds) {
      windSounds.addEventListener("change", () => {
        this.audioSystem.updateSettings({
          windSoundsEnabled: windSounds.checked,
        });
        this.saveSettings();
      });
    }

    const windVolume = document.getElementById(
      "wind-volume"
    ) as HTMLInputElement;
    const windVolumeValue = document.getElementById(
      "wind-volume-value"
    ) as HTMLSpanElement;
    if (windVolume && windVolumeValue) {
      windVolume.addEventListener("input", () => {
        const volume = parseInt(windVolume.value) / 100;
        this.audioSystem.updateSettings({ windVolume: volume });
        windVolumeValue.textContent = `${windVolume.value}%`;
        this.saveSettings();
      });
    }

    const windThreshold = document.getElementById(
      "wind-threshold"
    ) as HTMLInputElement;
    const windThresholdValue = document.getElementById(
      "wind-threshold-value"
    ) as HTMLSpanElement;
    if (windThreshold && windThresholdValue) {
      windThreshold.addEventListener("input", () => {
        const threshold = parseInt(windThreshold.value);
        this.audioSystem.updateSettings({ windThreshold: threshold });
        windThresholdValue.textContent = windThreshold.value;
        this.saveSettings();
      });
    }

    const testCollision = document.getElementById(
      "test-collision"
    ) as HTMLButtonElement;
    const testWall = document.getElementById("test-wall") as HTMLButtonElement;
    const testWind = document.getElementById("test-wind") as HTMLButtonElement;

    if (testCollision) {
      testCollision.addEventListener("click", () => {
        this.audioSystem.testCollisionSound();
      });
    }

    if (testWall) {
      testWall.addEventListener("click", () => {
        this.audioSystem.testWallSound();
      });
    }

    if (testWind) {
      testWind.addEventListener("click", () => {
        this.audioSystem.testWindSound();
      });
    }
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
      this.closeAllPanelsExcept("control-panel");
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
    this.setupThemeControls();
    this.setupBackgroundTexture();
    this.setupInspectorMode();
    this.setupDeleteMode();
    this.setupMomentumMonitoring();
    this.setupPauseButton();
    this.setupCreatePanel();
    this.setupCursorPanel();
    this.setupAudioPanel();
    this.setupActionButtons();

    // Set up canvas click handler once after all modes are initialized
    this.setupCanvasClickHandler();
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
        updatePhysicsSettings({ RESTITUTION: value });
        this.saveSettings();
      });
    }

    if (frictionSlider && frictionValue) {
      frictionSlider.addEventListener("input", () => {
        const value = parseFloat(frictionSlider.value);
        frictionValue.textContent = value.toString();
        updatePhysicsSettings({ FRICTION: value });
        this.saveSettings();
      });
    }

    if (airResistanceSlider && airResistanceValue) {
      airResistanceSlider.addEventListener("input", () => {
        const value = parseFloat(airResistanceSlider.value);
        airResistanceValue.textContent = value.toString();
        updatePhysicsSettings({ AIR_RESISTANCE: value });
        this.saveSettings();
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
    const bouncyBtn = document.getElementById(
      "bouncy-mode"
    ) as HTMLButtonElement;
    const realisticBtn = document.getElementById(
      "realistic-mode"
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

    if (bouncyBtn) {
      bouncyBtn.addEventListener("click", () => {
        this.setBouncyMode();
      });
    }

    if (realisticBtn) {
      realisticBtn.addEventListener("click", () => {
        this.setRealisticMode();
      });
    }
  }

  private resetObjects() {
    this.objects = this.objects.slice(0, 2);

    resetObjectColors();

    if (this.objects.length >= 1 && this.objects[0] instanceof RigidBody) {
      const obj1 = this.objects[0] as RigidBody;
      obj1.position = new Vector(200, 200);
      obj1.velocity = new Vector(-500, 0);
      obj1.angularVelocity = Math.PI / 64;
      obj1.rotation = 0;
    }

    if (this.objects.length >= 2 && this.objects[1] instanceof RigidBody) {
      const obj2 = this.objects[1] as RigidBody;
      obj2.position = new Vector(750, 200);
      obj2.velocity = new Vector(0, 0);
      obj2.angularVelocity = 0;
      obj2.rotation = Math.PI / 8;
    }

    // clear contact points
    this.fadingContactPoints = [];
    this.selectedObject = null;
  }

  private toggleDebugMode() {
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.setDebugMode(!object.debugMode);
      }
    }
  }

  private setBouncyMode() {
    updatePhysicsSettings({
      RESTITUTION: 1.0,
      FRICTION: 0.0,
      AIR_RESISTANCE: 1.0,
    });

    this.updatePhysicsUI();
    this.saveSettings();
  }

  private setRealisticMode() {
    updatePhysicsSettings({
      RESTITUTION: 0.7,
      FRICTION: 0.4,
      AIR_RESISTANCE: 0.995,
    });

    this.updatePhysicsUI();
    this.saveSettings();
  }

  private updatePhysicsUI() {
    // update the UI sliders to reflect current physics values
    // this is why react exists
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
      restitutionSlider.value = PHYSICS.RESTITUTION.toString();
      restitutionValue.textContent = PHYSICS.RESTITUTION.toString();
    }

    if (frictionSlider && frictionValue) {
      frictionSlider.value = PHYSICS.FRICTION.toString();
      frictionValue.textContent = PHYSICS.FRICTION.toString();
    }

    if (airResistanceSlider && airResistanceValue) {
      airResistanceSlider.value = PHYSICS.AIR_RESISTANCE.toString();
      airResistanceValue.textContent = PHYSICS.AIR_RESISTANCE.toString();
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
    if (!themeSelect) return;

    // clear any existing static options and repopulate from THEMES
    themeSelect.innerHTML = "";

    const themeEntries = globalThis.Object.keys(THEMES) as Array<
      keyof typeof THEMES
    >;
    themeEntries.forEach((key) => {
      const theme = THEMES[key];
      const option = document.createElement("option");
      option.value = key;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });

    // set current selection based on loaded settings or default
    themeSelect.value = this.currentTheme;

    themeSelect.addEventListener("change", () => {
      this.applyTheme(themeSelect.value);
    });
  }

  private applyTheme(theme: string) {
    this.currentTheme = theme;
    applyColorTheme(theme);
    this.saveSettings();
  }

  private setExclusiveMode(
    mode: "inspector" | "delete" | "create",
    enabled: boolean
  ) {
    if (enabled) {
      this.inspectorMode = false;
      this.deleteMode = false;
      this.createMode = false;

      const inspectorCheckbox = document.getElementById(
        "inspector-mode"
      ) as HTMLInputElement;
      const deleteCheckbox = document.getElementById(
        "delete-mode"
      ) as HTMLInputElement;
      const placeModeCheckbox = document.getElementById(
        "place-mode"
      ) as HTMLInputElement;

      if (inspectorCheckbox) inspectorCheckbox.checked = false;
      if (deleteCheckbox) deleteCheckbox.checked = false;
      if (placeModeCheckbox) placeModeCheckbox.checked = false;

      switch (mode) {
        case "inspector":
          this.inspectorMode = true;
          if (inspectorCheckbox) inspectorCheckbox.checked = true;
          break;
        case "delete":
          this.deleteMode = true;
          if (deleteCheckbox) deleteCheckbox.checked = true;
          break;
        case "create":
          this.createMode = true;
          if (placeModeCheckbox) placeModeCheckbox.checked = true;
          break;
      }
    } else {
      switch (mode) {
        case "inspector":
          this.inspectorMode = false;
          break;
        case "delete":
          this.deleteMode = false;
          break;
        case "create":
          this.createMode = false;
          break;
      }
    }

    this.updateCanvasCursor();
    this.updateInspectorPanel();
  }

  private updateCanvasCursor() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    canvas.classList.remove("inspector-cursor", "create-cursor");
    canvas.style.cursor = "default";

    if (this.inspectorMode) {
      canvas.classList.add("inspector-cursor");
    } else if (this.createMode) {
      canvas.classList.add("create-cursor");
    } else if (this.deleteMode) {
      canvas.style.cursor = "crosshair";
    }
  }

  private updateInspectorPanel() {
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

  private setupInspectorMode() {
    const inspectorCheckbox = document.getElementById(
      "inspector-mode"
    ) as HTMLInputElement;

    if (inspectorCheckbox) {
      inspectorCheckbox.addEventListener("change", () => {
        this.setExclusiveMode("inspector", inspectorCheckbox.checked);
        this.saveSettings();
      });
    }
  }

  private canvasClickHandler = (event: MouseEvent) => {
    if (this.createMode) {
      this.handleCreateClick(event);
      return;
    }

    if (!this.inspectorMode && !this.deleteMode) return;

    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const worldPos = this.screenToWorld(new Vector(screenX, screenY));

    // find the clicked object
    for (let i = 0; i < this.objects.length; i++) {
      const object = this.objects[i];
      if (object instanceof RigidBody) {
        const distance = object.position.subtract(worldPos).magnitude();
        if (distance < 50) {
          if (this.deleteMode) {
            this.objects.splice(i, 1);
          } else if (this.inspectorMode) {
            this.selectedObject = object;
            this.updateInspector();
          }
          break;
        }
      }
    }
  };

  private canvasMouseMoveHandler = (event: MouseEvent) => {
    if (!this.cursorTrailEnabled) return;

    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const worldPos = this.screenToWorld(new Vector(screenX, screenY));

    this.cursorTrailPoints.push({
      position: worldPos,
      time: this.currentTime,
    });

    // keep only recent points
    while (this.cursorTrailPoints.length > this.cursorTrailLength) {
      this.cursorTrailPoints.shift();
    }
  };

  private setupCanvasClickHandler() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (canvas) {
      canvas.removeEventListener("click", this.canvasClickHandler);
      canvas.removeEventListener("mousemove", this.canvasMouseMoveHandler);

      canvas.addEventListener("click", this.canvasClickHandler);
      canvas.addEventListener("mousemove", this.canvasMouseMoveHandler);
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

  private setupCreatePanel() {
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
        this.saveSettings();
      });
    }

    if (createRandomBtn) {
      createRandomBtn.addEventListener("click", () => {
        this.createRandomObject();
      });
    }

    // Set up the dynamic form controls
    this.setupCreateFormControls();
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

  private createRandomObject() {
    const worldCenter = new Vector(this.worldWidth / 2, this.worldHeight / 2);
    let attempts = 0;
    let validPosition = false;
    let newPosition = worldCenter;

    while (!validPosition && attempts < 50) {
      newPosition = worldCenter.add(
        new Vector((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300)
      );

      validPosition = !this.checkOverlapAtPosition(newPosition);
      attempts++;
    }

    if (validPosition) {
      this.createObjectAtPosition(newPosition);
    }
  }

  private setupCursorPanel() {
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

    this.setupCursorTracking();
  }

  private closeAllPanelsExcept(exceptId?: string) {
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

  private handleCreateClick(event: MouseEvent) {
    if (!this.createMode) return;

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

    // apply initial velocity and angular velocity
    newObject.velocity = new Vector(settings.velocityX, settings.velocityY);
    newObject.angularVelocity = settings.angularVelocity;

    this.addObject(newObject);
  }

  private getCurrentObjectSettings() {
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

  private setupCursorTracking() {
    // Cursor tracking is now handled in setupCursorTrackingForCanvas
    // which is called from setupCanvasClickHandler
  }

  private setupDeleteMode() {
    const deleteCheckbox = document.getElementById(
      "delete-mode"
    ) as HTMLInputElement;

    if (deleteCheckbox) {
      deleteCheckbox.addEventListener("change", () => {
        this.setExclusiveMode("delete", deleteCheckbox.checked);
        this.saveSettings();
      });
    }
  }

  private setupMomentumMonitoring() {
    // TODO
  }

  private updateMomentumDisplay() {
    this.totalMomentum = new Vector(0, 0);
    this.totalAngularMomentum = 0;
    let totalKineticEnergy = 0;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        // mv
        const momentum = object.velocity.multiply(object.mass);
        this.totalMomentum = this.totalMomentum.add(momentum);

        // Iw
        this.totalAngularMomentum +=
          object.momentOfInertia * object.angularVelocity;

        const linearKE = 0.5 * object.mass * object.velocity.magnitude() ** 2;
        const rotationalKE =
          0.5 * object.momentOfInertia * object.angularVelocity ** 2;
        totalKineticEnergy += linearKE + rotationalKE;
      }
    }

    // for system status indicator
    this.lastTotalKineticEnergy = totalKineticEnergy;

    const momentumMagnitude = this.totalMomentum.magnitude();
    this.momentumHistory.push(momentumMagnitude);
    if (this.momentumHistory.length > 20) {
      this.momentumHistory.shift();
    }

    const linearMomentumEl = document.getElementById("linear-momentum");
    const angularMomentumEl = document.getElementById("angular-momentum");
    const objectCountEl = document.getElementById("object-count");

    if (linearMomentumEl) {
      linearMomentumEl.textContent = this.totalMomentum.magnitude().toFixed(1);
    }
    if (angularMomentumEl) {
      angularMomentumEl.textContent = Math.abs(
        this.totalAngularMomentum
      ).toFixed(1);
    }
    if (objectCountEl) {
      objectCountEl.textContent = this.objects.length.toString();
    }
  }

  private trackCollision(pairKey: string): void {
    const now = performance.now();
    const record = this.collisionHistory.get(pairKey) || {
      timestamp: now,
      count: 0,
    };

    if (now - record.timestamp > this.TIME_WINDOW) {
      record.timestamp = now;
      record.count = 1;
    } else {
      record.count++;
    }

    this.collisionHistory.set(pairKey, record);

    // check if threshold is exceeded
    if (record.count >= this.COLLISION_THRESHOLD) {
      this.activateNoCollisionState(pairKey, now);
    }
  }

  private activateNoCollisionState(pairKey: string, currentTime: number): void {
    // why this hack?
    // no matter what I do, they seem to want to get entangled anyways
    // so just straight up force them apart and hope it works (doesn't look too weird)
    const [obj1Id, obj2Id] = pairKey.split("-").map(Number);
    const obj1 = this.objects[obj1Id] as RigidBody;
    const obj2 = this.objects[obj2Id] as RigidBody;

    if (!obj1 || !obj2) return;

    // direction (norm)
    const direction = obj2.position.subtract(obj1.position).normalize();

    // immediate correction
    const relativeVelocity = obj1.velocity.subtract(obj2.velocity);
    const velocityAlongNormal = relativeVelocity.dot(direction);

    if (velocityAlongNormal < 0) {
      const separationSpeed = 100;
      const impulse = direction.multiply(separationSpeed);

      const totalMass = obj1.mass + obj2.mass;
      const impulse1 = impulse.multiply(-obj2.mass / totalMass);
      const impulse2 = impulse.multiply(obj1.mass / totalMass);

      obj1.velocity = obj1.velocity.add(impulse1);
      obj2.velocity = obj2.velocity.add(impulse2);
    }

    this.objectPairStates.set(pairKey, {
      obj1Id,
      obj2Id,
      noCollisionUntil: currentTime + this.NO_COLLISION_DURATION,
      lastSeparationTime: currentTime,
    });

    this.collisionHistory.delete(pairKey);
  }

  private shouldSkipCollision(pairKey: string): boolean {
    const pairState = this.objectPairStates.get(pairKey);
    if (!pairState) return false;

    const now = performance.now();

    if (now > pairState.noCollisionUntil) {
      this.objectPairStates.delete(pairKey);
      return false;
    }

    return true;
  }

  private applySeparationForce(obj1: RigidBody, obj2: RigidBody): void {
    const direction = obj2.position.subtract(obj1.position);
    const distance = direction.magnitude();

    if (distance === 0) return;

    const normalizedDirection = direction.normalize();
    const minDistance = 80;

    if (distance < minDistance) {
      const separationStrength = (minDistance - distance) * 0.5;
      const force = normalizedDirection.multiply(separationStrength);

      obj1.applyForce(force.multiply(-1));
      obj2.applyForce(force);
    }
  }

  private updateCalmnessIndicator() {
    const calmnessText = document.getElementById("calmness-text");
    const momentumDisplay = document.getElementById("momentum-display");
    const energyDisplay = document.getElementById("energy-display");
    const activityDisplay = document.getElementById("activity-display");
    const indicator = document.getElementById("calmness-indicator");

    if (
      !calmnessText ||
      !momentumDisplay ||
      !energyDisplay ||
      !activityDisplay ||
      !indicator
    ) {
      return;
    }

    const momentum = this.totalMomentum.magnitude();
    const energy = this.lastTotalKineticEnergy;

    let momentumChange = 0;
    if (this.momentumHistory.length > 1) {
      const recent = this.momentumHistory.slice(-5);
      const older = this.momentumHistory.slice(-10, -5);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg =
        older.length > 0
          ? older.reduce((a, b) => a + b, 0) / older.length
          : recentAvg;
      momentumChange = Math.abs(recentAvg - olderAvg);
    }

    let bgColor: string;
    let textColor: string;

    if (energy < 1000 && momentum < 50 && this.recentCollisions === 0) {
      bgColor = "rgba(0, 50, 0, 0.8)"; // Dark green
      textColor = "#90EE90";
    } else if (energy < 5000 && momentum < 200 && this.recentCollisions <= 1) {
      bgColor = "rgba(0, 30, 50, 0.8)"; // Dark blue
      textColor = "#87CEEB";
    } else if (energy < 15000 && momentum < 500) {
      bgColor = "rgba(50, 50, 0, 0.8)"; // Dark yellow
      textColor = "#FFD700";
    } else if (energy < 30000 || momentum < 1000) {
      bgColor = "rgba(70, 35, 0, 0.8)"; // Dark orange
      textColor = "#FFA500";
    } else {
      bgColor = "rgba(70, 0, 0, 0.8)"; // Dark red
      textColor = "#FF6B6B";
    }

    // retrieve text
    const getCalmnessMessage = () => {
      const energyLevel = getEnergyLevel();
      const activityLevel = getActivityLevel();
      const energyMessages = (CALMNESS_MESSAGES as any)[energyLevel] || {};
      return (
        energyMessages[activityLevel] || `${energyLevel} - ${activityLevel}`
      );
    };

    const getEnergyLevel = () => {
      if (energy < 5000) return "Low";
      if (energy < 30000) return "Moderate";
      return "High";
    };

    const getActivityLevel = () => {
      if (this.recentCollisions > 3 || momentumChange > 100) return "Turbulent";
      if (this.recentCollisions > 1 || momentumChange > 50) return "Dynamic";
      return "Stable";
    };

    calmnessText.textContent = getCalmnessMessage();
    momentumDisplay.textContent = momentum.toFixed(1);
    energyDisplay.textContent = getEnergyLevel();
    activityDisplay.textContent = getActivityLevel();

    indicator.style.background = bgColor;
    indicator.style.color = textColor;
    indicator.style.borderTop = `2px solid ${textColor}`;
  }

  private setupBackgroundTexture() {
    const textureSelect = document.getElementById(
      "background-texture"
    ) as HTMLSelectElement;

    if (textureSelect) {
      // clear existing options
      textureSelect.innerHTML = "";

      // populate options from TEXTURE_OPTIONS
      for (const key in TEXTURE_OPTIONS) {
        const texture = TEXTURE_OPTIONS[key];
        const option = document.createElement("option");
        option.value = key;
        option.textContent = texture.name;
        textureSelect.appendChild(option);
      }

      textureSelect.addEventListener("change", () => {
        this.backgroundTexture = textureSelect.value;
        this.saveSettings();
      });
    }
  }

  private drawBackgroundTexture() {
    if (!this.ctx || this.backgroundTexture === "none") {
      return;
    }

    this.ctx.save();
    this.ctx.globalAlpha = CURRENT_THEME.textureOpacity;

    const textureOption = TEXTURE_OPTIONS[this.backgroundTexture];

    if (textureOption?.url) {
      this.drawExternalTexture(textureOption.url);
    } else {
      // manually draw built-in textures
      switch (this.backgroundTexture) {
        case "grid":
          this.drawGridTexture();
          break;
        case "dots":
          this.drawDotsTexture();
          break;
        case "fabric":
          this.drawFabricTexture();
          break;
        default:
          break;
      }
    }

    this.ctx.restore();
  }

  private drawGridTexture() {
    if (!this.ctx) return;

    const gridSize = 50;
    this.ctx.strokeStyle = getTextureColor(CURRENT_THEME);
    this.ctx.lineWidth = 1;

    // vertical lines
    for (let x = 0; x <= this.screenWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.screenHeight);
      this.ctx.stroke();
    }

    // horizontal lines
    for (let y = 0; y <= this.screenHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.screenWidth, y);
      this.ctx.stroke();
    }
  }

  private drawDotsTexture() {
    if (!this.ctx) return;

    const dotSpacing = 30;
    const dotSize = 2;
    this.ctx.fillStyle = getTextureColor(CURRENT_THEME);

    for (let x = dotSpacing; x < this.screenWidth; x += dotSpacing) {
      for (let y = dotSpacing; y < this.screenHeight; y += dotSpacing) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }


  private drawFabricTexture() {
    if (!this.ctx) return;

    const weaveSize = 4;
    this.ctx.fillStyle = getTextureColor(CURRENT_THEME);

    for (let x = 0; x < this.screenWidth; x += weaveSize * 2) {
      for (let y = 0; y < this.screenHeight; y += weaveSize * 2) {
        // create a simple weave pattern
        if ((x / weaveSize + y / weaveSize) % 2) {
          this.ctx.fillRect(x, y, weaveSize, weaveSize);
          this.ctx.fillRect(x + weaveSize, y + weaveSize, weaveSize, weaveSize);
        }
      }
    }
  }

  private drawExternalTexture(url: string) {
    if (!this.ctx) return;

    let image = this.textureImages.get(url);

    if (!image) {
      image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        this.render();
      };

      image.onerror = () => {
        this.textureImages.delete(url);
      };

      image.src = url;
      this.textureImages.set(url, image);

      // fallback to dots while loading
      this.drawDotsTexture();
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      const pattern = this.ctx.createPattern(image, "repeat");
      if (pattern) {
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      }
    } else {
      this.drawDotsTexture();
    }
  }

  private saveSettings() {
    const settings = {
      windForce: { x: WIND.FORCE.x, y: WIND.FORCE.y },
      windEnabled: WIND.ENABLED,
      timeSpeed: this.timeSpeed,
      theme: this.currentTheme,
      inspectorMode: this.inspectorMode,
      backgroundTexture: this.backgroundTexture,
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


      if (settings.theme) {
        this.currentTheme = settings.theme;
        const themeSelect = document.getElementById(
          "theme-select"
        ) as HTMLSelectElement;
        if (themeSelect) themeSelect.value = settings.theme;
        this.applyTheme(settings.theme);
      }

      if (settings.backgroundTexture) {
        this.backgroundTexture = settings.backgroundTexture;
        const textureSelect = document.getElementById(
          "background-texture"
        ) as HTMLSelectElement;
        if (textureSelect) textureSelect.value = settings.backgroundTexture;
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
    this.currentTheme = "default";
    this.inspectorMode = false;
    this.selectedObject = null;
    this.backgroundTexture = "none";

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
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    const inspectorCheckbox = document.getElementById(
      "inspector-mode"
    ) as HTMLInputElement;
    const inspectorPanel = document.getElementById(
      "object-inspector"
    ) as HTMLDivElement;
    const textureSelect = document.getElementById(
      "background-texture"
    ) as HTMLSelectElement;

    if (windX) windX.value = "0";
    if (windY) windY.value = "0.05";
    if (windEnabled) windEnabled.checked = true;
    if (timeSpeedSlider) timeSpeedSlider.value = "1";
    if (timeSpeedValue) timeSpeedValue.textContent = "1.0x";
    if (themeSelect) themeSelect.value = "default";
    if (inspectorCheckbox) inspectorCheckbox.checked = false;
    if (inspectorPanel) inspectorPanel.style.display = "none";
    if (textureSelect) textureSelect.value = "none";

    // apply default theme
    this.applyTheme("default");
  }
}
