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
  resetObjectColors,
} from "../utils/Constants";
import { AudioSystem } from "../audio/AudioSystem";

import { UIManager } from "./components/UIManager";
import { Inspector } from "./components/Inspector";
import { ObjectFactory } from "./components/ObjectFactory";
import { ThemeManager } from "./components/ThemeManager";
import { StatusDisplay } from "./components/StatusDisplay";
import { InputHandler } from "./components/InputHandler";

// Thank you claude for the componentization  ^^

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

  // sim state
  private contactPoints: Vector[] = [];
  private fadingContactPoints: FadingContactPoint[] = [];
  private collisions: CollisionInfo[] = [];
  private processedCollisions: Set<string> = new Set();
  private currentTime: number = 0;
  private isPaused: boolean = false;
  private contactPointDuration: number = 1.0;

  // collision optimization
  private frameSkipCounter: number = 0;
  private collisionHistory: Map<string, CollisionRecord> = new Map();
  private objectPairStates: Map<string, ObjectPair> = new Map();
  private readonly COLLISION_THRESHOLD = 5;
  private readonly TIME_WINDOW = 2000;
  private readonly NO_COLLISION_DURATION = 1000;

  // coords
  worldWidth: number = WORLD.COORDINATE_SYSTEM;
  worldHeight: number = WORLD.COORDINATE_SYSTEM;
  private screenWidth: number = WORLD.COORDINATE_SYSTEM;
  private screenHeight: number = WORLD.COORDINATE_SYSTEM;

  private audioSystem: AudioSystem;
  private uiManager: UIManager;
  private inspector: Inspector;
  private objectFactory: ObjectFactory;
  private themeManager: ThemeManager;
  private statusDisplay: StatusDisplay;
  private inputHandler: InputHandler;

  constructor() {
    this.audioSystem = new AudioSystem();
    this.audioSystem.initialize();

    this.uiManager = new UIManager(this.audioSystem);
    this.inspector = new Inspector();
    this.objectFactory = new ObjectFactory(this.worldWidth, this.worldHeight);
    this.themeManager = new ThemeManager();
    this.statusDisplay = new StatusDisplay();
    this.inputHandler = new InputHandler();
  }

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
    this.themeManager.setScreenSize(width, height);
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
      const scaledDt = dt * this.uiManager.getTimeSpeed();
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
      this.statusDisplay.updateMomentumDisplay(
        this.objects.filter((obj) => obj instanceof RigidBody) as RigidBody[]
      );
      this.statusDisplay.updateCalmnessIndicator(this.getRecentCollisions());
    }

    this.updateAudio();
    this.render();

    if (this.inspector.getSelectedObject()) {
      this.inspector.updateInspector();
    }

    this.inputHandler.updateTime(this.currentTime);
  }

  private updateObjects(dt: number) {
    for (const object of this.objects) {
      if (object instanceof RigidBody && WIND.ENABLED) {
        const invertedWindForce = new Vector(WIND.FORCE.x, WIND.FORCE.y);
        object.applyForce(invertedWindForce);
      }
      object.update(dt);
    }
  }

  private checkBounds() {
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

  private checkCollisions() {
    this.collisions = [];
    this.contactPoints = [];
    this.processedCollisions.clear();

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.clearContactPoints();
      }
    }

    const shouldSkipDetailedChecks = this.objects.length > 25;
    this.frameSkipCounter++;

    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        for (const wall of this.walls) {
          const info = CollisionSystem.checkWallCollision(object, wall);
          if (info) {
            this.handleWallCollision(info, object);
          }
        }
      }
    }

    if (shouldSkipDetailedChecks && this.frameSkipCounter % 2 !== 0) {
      return;
    }

    if (this.objects.length > 15) {
      this.checkCollisionsOptimized();
    } else {
      this.checkCollisionsBruteForce();
    }
  }

  private handleWallCollision(info: CollisionInfo, object: RigidBody) {
    this.collisions.push(info);
    this.contactPoints.push(info.contactPoint);
    this.addFadingContactPoint(info.contactPoint);
    object.setContactPoints([info.contactPoint]);

    const objectId = this.objects.indexOf(object);
    const collisionKey = `wall-${objectId}`;
    if (!this.processedCollisions.has(collisionKey)) {
      this.processedCollisions.add(collisionKey);
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

  private checkCollisionsBruteForce() {
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const obj1 = this.objects[i];
        const obj2 = this.objects[j];

        if (obj1 instanceof RigidBody && obj2 instanceof RigidBody) {
          this.handleObjectCollision(obj1, obj2, i, j);
        }
      }
    }
  }

  private checkCollisionsOptimized() {
    const cellSize = 150;
    const cells: Map<string, RigidBody[]> = new Map();

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

    for (const [cellKey, cellObjects] of cells) {
      for (let i = 0; i < cellObjects.length; i++) {
        for (let j = i + 1; j < cellObjects.length; j++) {
          const obj1 = cellObjects[i];
          const obj2 = cellObjects[j];
          const obj1Id = this.objects.indexOf(obj1);
          const obj2Id = this.objects.indexOf(obj2);
          this.handleObjectCollision(obj1, obj2, obj1Id, obj2Id);
        }
      }
    }
  }

  private handleObjectCollision(
    obj1: RigidBody,
    obj2: RigidBody,
    obj1Id: number,
    obj2Id: number
  ) {
    const pairKey = `${Math.min(obj1Id, obj2Id)}-${Math.max(obj1Id, obj2Id)}`;

    if (this.shouldSkipCollision(pairKey)) {
      this.applySeparationForce(obj1, obj2);
      return;
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

  private resolveCollisions() {
    for (const info of this.collisions) {
      CollisionSystem.resolveCollision(info);
    }
  }

  private render() {
    if (!this.ctx) return;

    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    this.themeManager.drawBackgroundTexture(this.ctx);

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

    this.inputHandler.drawCursorTrail(this.ctx, COLORS.TRAIL);

    this.ctx.restore();
  }

  private drawDebugInfo() {
    if (!this.ctx) return;

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

  private updateAudio(): void {
    if (!this.audioSystem) return;

    let maxVelocity = 0;
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        const velocity = object.velocity.magnitude();
        if (velocity > maxVelocity) {
          maxVelocity = velocity;
        }
      }
    }

    this.audioSystem.updateWindSound(maxVelocity);
  }

  private addFadingContactPoint(position: Vector) {
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

  private getObjectSize(object: RigidBody): number {
    if (object.getType() === "Box") {
      const box = object as any;
      return Math.max(box.width, box.height);
    } else if (object.getType() === "NGon") {
      const ngon = object as any;
      return ngon.radius * 2;
    }
    return 30;
  }

  private getObjectMass(object: RigidBody): number {
    return object.mass;
  }

  private getRecentCollisions(): number {
    return this.processedCollisions.size;
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

    if (record.count >= this.COLLISION_THRESHOLD) {
      this.activateNoCollisionState(pairKey, now);
    }
  }

  private activateNoCollisionState(pairKey: string, currentTime: number): void {
    const [obj1Id, obj2Id] = pairKey.split("-").map(Number);
    const obj1 = this.objects[obj1Id] as RigidBody;
    const obj2 = this.objects[obj2Id] as RigidBody;

    if (!obj1 || !obj2) return;

    const direction = obj2.position.subtract(obj1.position).normalize();
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

  public setupControlPanel() {
    this.uiManager.setupControlPanel();
    this.inspector.setupInspectorMode();
    this.objectFactory.setupCreatePanel();
    // Set up object factory callbacks
    this.objectFactory.setObjectCreatedCallback((obj) => this.addObject(obj));
    this.objectFactory.setGetExistingObjectsCallback(
      () =>
        this.objects.filter((obj) => obj instanceof RigidBody) as RigidBody[]
    );
    this.themeManager.setupThemeControls();
    this.themeManager.setupBackgroundTexture();
    this.inputHandler.setupDeleteMode();
    this.inputHandler.setupCursorPanel();
    this.setupActionButtons();
    this.setupPauseButton();
    this.setupCanvasClickHandler();
  }

  private setupActionButtons() {
    const resetBtn = document.getElementById(
      "reset-objects"
    ) as HTMLButtonElement;
    const debugBtn = document.getElementById(
      "toggle-debug"
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

  private setupCanvasClickHandler() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const clickHandler = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldPos = this.screenToWorld(new Vector(screenX, screenY));

      // Handle create mode first
      if (this.objectFactory.getCreateMode()) {
        const rigidObjects = this.objects.filter(
          (obj) => obj instanceof RigidBody
        ) as RigidBody[];
        const newObject = this.objectFactory.handleCreateClick(
          event,
          (pos) => this.screenToWorld(pos),
          rigidObjects
        );
        if (newObject) {
          this.addObject(newObject);
        }
        return;
      }

      // Find clicked object for inspector/delete modes
      const rigidObjects = this.objects.filter(
        (obj) => obj instanceof RigidBody
      ) as RigidBody[];
      const clickedObject = this.inputHandler.findObjectAtPosition(
        worldPos,
        rigidObjects
      );

      if (clickedObject) {
        if (this.inspector.getInspectorMode()) {
          this.inspector.setSelectedObject(clickedObject);
        } else if (this.inputHandler.getDeleteMode()) {
          const index = this.objects.indexOf(clickedObject);
          if (index !== -1) {
            this.objects.splice(index, 1);
          }
        }
      }
    };

    const mouseMoveHandler = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldPos = this.screenToWorld(new Vector(screenX, screenY));

      // Update time and let input handler process the mouse move
      this.inputHandler.updateTime(this.currentTime);
      this.inputHandler.handleMouseMove(worldPos);
    };

    canvas.removeEventListener("click", clickHandler);
    canvas.removeEventListener("mousemove", mouseMoveHandler);
    canvas.addEventListener("click", clickHandler);
    canvas.addEventListener("mousemove", mouseMoveHandler);
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

    this.fadingContactPoints = [];
    this.inspector.setSelectedObject(null);
  }

  private toggleDebugMode() {
    for (const object of this.objects) {
      if (object instanceof RigidBody) {
        object.setDebugMode(!object.debugMode);
      }
    }
  }
}
