import { Vector } from "../../core/Vector";
import { RigidBody } from "../../core/RigidBody";
import { CALMNESS_MESSAGES } from "../../utils/Constants";

export class StatusDisplay {
  private totalMomentum: Vector = new Vector(0, 0);
  private totalAngularMomentum: number = 0;
  private momentumHistory: number[] = [];
  private lastTotalKineticEnergy: number = 0;

  constructor() {}

  updateMomentumDisplay(objects: RigidBody[]): void {
    this.totalMomentum = new Vector(0, 0);
    this.totalAngularMomentum = 0;
    let totalKineticEnergy = 0;

    for (const object of objects) {
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

    // system status indicator
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
      objectCountEl.textContent = objects.length.toString();
    }
  }

  updateCalmnessIndicator(recentCollisions: number): void {
    const calmnessText = document.getElementById("calmness-text");
    const momentumDisplay = document.getElementById("momentum-display");
    const energyDisplay = document.getElementById("energy-display");
    const activityDisplay = document.getElementById("activity-display");
    const indicator = document.getElementById("calmness-indicator");
    const toggle = document.getElementById(
      "calmness-indicator-toggle"
    ) as HTMLInputElement;

    if (
      !calmnessText ||
      !momentumDisplay ||
      !energyDisplay ||
      !activityDisplay ||
      !indicator
    ) {
      return;
    }

    if (toggle && !toggle.checked) {
      indicator.style.display = "none";
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

    if (energy < 1000 && momentum < 50 && recentCollisions === 0) {
      bgColor = "rgba(0, 50, 0, 0.8)"; // Dark green
      textColor = "#90EE90";
    } else if (energy < 5000 && momentum < 200 && recentCollisions <= 1) {
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

    const getCalmnessMessage = () => {
      const energyLevel = this.getEnergyLevel(energy);
      const activityLevel = this.getActivityLevel(
        recentCollisions,
        momentumChange
      );
      const energyMessages = (CALMNESS_MESSAGES as any)[energyLevel] || {};
      return (
        energyMessages[activityLevel] || `${energyLevel} - ${activityLevel}`
      );
    };

    calmnessText.textContent = getCalmnessMessage();
    momentumDisplay.textContent = momentum.toFixed(1);
    energyDisplay.textContent = this.getEnergyLevel(energy);
    activityDisplay.textContent = this.getActivityLevel(
      recentCollisions,
      momentumChange
    );

    indicator.style.background = bgColor;
    indicator.style.color = textColor;
    indicator.style.borderTop = `2px solid ${textColor}`;
    indicator.style.display = "block";
  }

  private getEnergyLevel(energy: number): string {
    if (energy < 5000) return "Low";
    if (energy < 30000) return "Moderate";
    return "High";
  }

  private getActivityLevel(
    recentCollisions: number,
    momentumChange: number
  ): string {
    if (recentCollisions > 3 || momentumChange > 100) return "Turbulent";
    if (recentCollisions > 1 || momentumChange > 50) return "Dynamic";
    return "Stable";
  }

  getTotalMomentum(): Vector {
    return this.totalMomentum;
  }

  getTotalAngularMomentum(): number {
    return this.totalAngularMomentum;
  }

  getLastTotalKineticEnergy(): number {
    return this.lastTotalKineticEnergy;
  }
}
