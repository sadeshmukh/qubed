import { Vector } from "../core/Vector";

export interface AudioSettings {
  enabled: boolean;
  volume: number;
  collisionSoundsEnabled: boolean;
  windSoundsEnabled: boolean;
  collisionVolume: number;
  windVolume: number;
  windThreshold: number;
}

// I'm not going to pretend I understand half the code
// I just know that it somewhat works? I'll change some sounds later
// turns out there's a lot of sounds you can make with straight up oscillators
// and filters and stuff

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private settings: AudioSettings;
  private windOscillator: OscillatorNode | null = null;
  private windGainNode: GainNode | null = null;
  private isWindPlaying = false;
  private lastCollisionTime = 0;
  private collisionCooldown = 50; // ms between collision sounds

  constructor() {
    this.settings = {
      enabled: true,
      volume: 0.9,
      collisionSoundsEnabled: true,
      windSoundsEnabled: true,
      collisionVolume: 0.9,
      windVolume: 0.8,
      windThreshold: 200, // velocity threshold for wind sounds
    };
  }

  private async ensureAudioContext(): Promise<boolean> {
    if (this.audioContext && this.audioContext.state !== "closed") {
      if (this.audioContext.state === "suspended") {
        try {
          await this.audioContext.resume();
        } catch (error) {
          console.warn("AudioSystem: Failed to resume audio context:", error);
          return false;
        }
      }
      return true;
    }

    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      return true;
    } catch (error) {
      console.warn("AudioSystem: Failed to create audio context:", error);
      return false;
    }
  }

  async initialize(): Promise<void> {
    console.log(
      "AudioSystem: Ready to create audio context on first user interaction"
    );
  }

  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  async playCollisionSound(
    velocity: number,
    isWallCollision: boolean = false,
    objectSize: number = 30,
    objectMass: number = 2
  ): Promise<void> {
    if (!this.settings.enabled || !this.settings.collisionSoundsEnabled) {
      return;
    }

    if (!(await this.ensureAudioContext())) {
      return;
    }

    const now = performance.now();
    if (now - this.lastCollisionTime < this.collisionCooldown) {
      return;
    }
    this.lastCollisionTime = now;

    if (!this.audioContext) {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();

      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const normalizedVelocity = Math.min(velocity / 600, 1);
      const sizeMultiplier = Math.max(0.3, Math.min(2.0, objectSize / 30));
      const massMultiplier = Math.max(0.5, Math.min(3.0, objectMass / 2));

      const getMaterialType = (mass: number) => {
        if (mass < 1.0) return "light"; // glass? plastic? idek
        if (mass < 2.5) return "medium"; // wood you believe it
        if (mass < 4.0) return "heavy"; // am stone
        return "very_heavy"; // dense
      };

      const materialType = getMaterialType(objectMass);
      const materialVariation = Math.random() * 0.3 + 0.85;

      if (isWallCollision) {
        const baseFreq = 50 / sizeMultiplier / Math.sqrt(massMultiplier);
        oscillator.frequency.setValueAtTime(
          baseFreq + normalizedVelocity * 80,
          this.audioContext.currentTime
        );
        filterNode.type = "lowpass";
        filterNode.frequency.setValueAtTime(
          300 + normalizedVelocity * 500,
          this.audioContext.currentTime
        );
        filterNode.Q.setValueAtTime(
          0.8 + massMultiplier * 0.3,
          this.audioContext.currentTime
        );
        oscillator.type = massMultiplier > 2 ? "square" : "triangle";
      } else {
        let baseFreq: number;
        let waveType: OscillatorType;
        let filterType: BiquadFilterType;
        let qValue: number;

        switch (materialType) {
          case "light":
            baseFreq = (200 / sizeMultiplier) * materialVariation;
            waveType = "triangle";
            filterType = "highpass";
            qValue = 2.5;
            break;

          case "medium":
            baseFreq = (120 / sizeMultiplier) * materialVariation;
            waveType = "triangle";
            filterType = "bandpass";
            qValue = 1.8;
            break;

          case "heavy":
            baseFreq = (80 / sizeMultiplier) * materialVariation;
            waveType = "sawtooth";
            filterType = "lowpass";
            qValue = 1.2;
            break;

          case "very_heavy":
            baseFreq = (50 / sizeMultiplier) * materialVariation;
            waveType = "square";
            filterType = "lowpass";
            qValue = 0.8;
            break;
        }

        oscillator.frequency.setValueAtTime(
          baseFreq + normalizedVelocity * (baseFreq * 0.8),
          this.audioContext.currentTime
        );

        oscillator.type = waveType;
        filterNode.type = filterType;

        const filterFreq = Math.max(
          200,
          baseFreq * 3 + normalizedVelocity * 800
        );
        filterNode.frequency.setValueAtTime(
          filterFreq,
          this.audioContext.currentTime
        );
        filterNode.Q.setValueAtTime(qValue, this.audioContext.currentTime);
      }

      const sizeVolumeBoost = Math.min(3.0, sizeMultiplier);
      const volume =
        this.settings.volume *
        this.settings.collisionVolume *
        Math.max(0.3, normalizedVelocity) *
        2.5 *
        sizeVolumeBoost;
      const attackTime = velocity > 300 ? 0.005 : 0.02;
      const releaseTime = velocity > 300 ? 0.1 : 0.2;

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume,
        this.audioContext.currentTime + attackTime
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + releaseTime
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + releaseTime);
    } catch (error) {
      console.warn("AudioSystem: Failed to play collision sound:", error);
    }
  }

  async updateWindSound(maxVelocity: number): Promise<void> {
    if (!this.settings.enabled || !this.settings.windSoundsEnabled) {
      this.stopWindSound();
      return;
    }

    if (!(await this.ensureAudioContext())) {
      this.stopWindSound();
      return;
    }

    const shouldPlayWind = maxVelocity > this.settings.windThreshold;

    if (shouldPlayWind && !this.isWindPlaying) {
      this.startWindSound();
    } else if (!shouldPlayWind && this.isWindPlaying) {
      this.stopWindSound();
    }

    if (this.isWindPlaying && this.windGainNode) {
      const normalizedVelocity = Math.min(
        (maxVelocity - this.settings.windThreshold) / 400,
        1
      );
      const baseVolume =
        this.settings.volume *
        this.settings.windVolume *
        Math.max(0.5, normalizedVelocity) *
        2.0;

      try {
        this.windGainNode.gain.linearRampToValueAtTime(
          baseVolume * 1.5,
          this.audioContext!.currentTime + 0.1
        );

        const userData = (this.windGainNode as any).userData;
        if (userData && userData.windGain2) {
          userData.windGain2.gain.linearRampToValueAtTime(
            baseVolume * 0.8,
            this.audioContext!.currentTime + 0.1
          );
        }
      } catch (error) {}
    }
  }

  private startWindSound(): void {
    if (!this.audioContext || this.isWindPlaying) return;

    try {
      this.windOscillator = this.audioContext.createOscillator();
      this.windGainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();

      this.windOscillator.connect(filterNode);
      filterNode.connect(this.windGainNode);
      this.windGainNode.connect(this.audioContext.destination);

      this.windOscillator.type = "triangle";
      this.windOscillator.frequency.setValueAtTime(
        40,
        this.audioContext.currentTime
      );

      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(this.windGainNode.gain);
      lfo.frequency.setValueAtTime(2, this.audioContext.currentTime);
      lfo.type = "sine";
      lfoGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);

      filterNode.type = "lowpass";
      filterNode.frequency.setValueAtTime(120, this.audioContext.currentTime);
      filterNode.Q.setValueAtTime(0.3, this.audioContext.currentTime);

      this.windGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.windOscillator.start();
      lfo.start();

      this.isWindPlaying = true;
    } catch (error) {
      console.warn("AudioSystem: Failed to start ambient sound:", error);
      this.isWindPlaying = false;
    }
  }

  private stopWindSound(): void {
    if (!this.isWindPlaying || !this.windOscillator || !this.windGainNode)
      return;

    try {
      this.windGainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext!.currentTime + 0.2
      );
      this.windOscillator.stop(this.audioContext!.currentTime + 0.2);
    } catch (error) {
      console.warn("AudioSystem: Failed to stop wind sound:", error);
    }

    this.windOscillator = null;
    this.windGainNode = null;
    this.isWindPlaying = false;
  }

  async testCollisionSound(): Promise<void> {
    await this.playCollisionSound(400, false);
  }

  async testWallSound(): Promise<void> {
    await this.playCollisionSound(600, true);
  }

  async testWindSound(): Promise<void> {
    if (!(await this.ensureAudioContext())) {
      return;
    }

    const originalThreshold = this.settings.windThreshold;
    this.settings.windThreshold = 0;

    await this.updateWindSound(500);

    setTimeout(() => {
      this.settings.windThreshold = originalThreshold;
      this.updateWindSound(0);
    }, 3000);
  }

  dispose(): void {
    this.stopWindSound();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
