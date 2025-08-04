import { Vector } from "../../core/Vector";
import {
  PHYSICS,
  WIND,
  setWindForce,
  updatePhysicsSettings,
} from "../../utils/Constants";
import { AudioSystem } from "../../audio/AudioSystem";

export interface UISettings {
  windForce: { x: number; y: number };
  windEnabled: boolean;
  timeSpeed: number;
  theme: string;
  inspectorMode: boolean;
  backgroundTexture: string;
}

export class UIManager {
  private audioSystem: AudioSystem;
  private timeSpeed: number = 1.0;
  private currentTheme: string = "default";
  private backgroundTexture: string = "none";

  constructor(audioSystem: AudioSystem) {
    this.audioSystem = audioSystem;
  }

  setupControlPanel(): void {
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
    this.setupPhysicsControls();
    this.setupTimeSpeedControl();
    this.setupActionButtons();
    this.setupAudioPanel();
  }

  private setupPhysicsControls(): void {
    this.setupWindControls();
    this.setupPhysicsSliders();
  }

  private setupWindControls(): void {
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
  }

  private setupPhysicsSliders(): void {
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

  private setupTimeSpeedControl(): void {
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

  private setupActionButtons(): void {
    const resetSettingsBtn = document.getElementById(
      "reset-settings"
    ) as HTMLButtonElement;
    const bouncyBtn = document.getElementById(
      "bouncy-mode"
    ) as HTMLButtonElement;
    const realisticBtn = document.getElementById(
      "realistic-mode"
    ) as HTMLButtonElement;

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

    this.setupAudioControls();
  }

  private setupAudioControls(): void {
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

    this.setupCollisionSounds();
    this.setupWindSounds();
    this.setupAudioTests();
  }

  private setupCollisionSounds(): void {
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
  }

  private setupWindSounds(): void {
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
  }

  private setupAudioTests(): void {
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

  private setBouncyMode(): void {
    updatePhysicsSettings({
      RESTITUTION: 1.0,
      FRICTION: 0.0,
      AIR_RESISTANCE: 1.0,
    });

    this.updatePhysicsUI();
    this.saveSettings();
  }

  private setRealisticMode(): void {
    updatePhysicsSettings({
      RESTITUTION: 0.7,
      FRICTION: 0.4,
      AIR_RESISTANCE: 0.995,
    });

    this.updatePhysicsUI();
    this.saveSettings();
  }

  private updatePhysicsUI(): void {
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

  getTimeSpeed(): number {
    return this.timeSpeed;
  }

  getCurrentTheme(): string {
    return this.currentTheme;
  }

  getBackgroundTexture(): string {
    return this.backgroundTexture;
  }

  saveSettings(): void {
    const settings: UISettings = {
      windForce: { x: WIND.FORCE.x, y: WIND.FORCE.y },
      windEnabled: WIND.ENABLED,
      timeSpeed: this.timeSpeed,
      theme: this.currentTheme,
      inspectorMode: false, // handled by inspector component
      backgroundTexture: this.backgroundTexture,
    };

    try {
      localStorage.setItem("qubed-settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("Failed to save settings to localStorage:", e);
    }
  }

  loadSettings(): void {
    try {
      const saved = localStorage.getItem("qubed-settings");
      if (!saved) return;

      const settings: UISettings = JSON.parse(saved);

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
      }

      if (settings.backgroundTexture) {
        this.backgroundTexture = settings.backgroundTexture;
      }
    } catch (e) {
      console.warn("Failed to load settings from localStorage:", e);
    }
  }

  resetSettings(): void {
    try {
      localStorage.removeItem("qubed-settings");
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }

    setWindForce(new Vector(0, 0.05));
    WIND.ENABLED = true;
    this.timeSpeed = 1.0;
    this.currentTheme = "default";
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

    if (windX) windX.value = "0";
    if (windY) windY.value = "0.05";
    if (windEnabled) windEnabled.checked = true;
    if (timeSpeedSlider) timeSpeedSlider.value = "1";
    if (timeSpeedValue) timeSpeedValue.textContent = "1.0x";
  }
}
