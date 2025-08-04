import { CURRENT_THEME, applyColorTheme } from "../../utils/Constants";
import { getTextureColor, TEXTURE_OPTIONS, THEMES } from "../../utils/themes";

export class ThemeManager {
  private currentTheme: string = "default";
  private backgroundTexture: string = "dots";
  private textureImages: Map<string, HTMLImageElement> = new Map();
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  constructor() {}

  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  setupThemeControls(): void {
    const themeSelect = document.getElementById(
      "theme-select"
    ) as HTMLSelectElement;
    if (!themeSelect) return;

    themeSelect.innerHTML = "";

    const themeEntries = Object.keys(THEMES) as Array<keyof typeof THEMES>;
    themeEntries.forEach((key) => {
      const theme = THEMES[key];
      const option = document.createElement("option");
      option.value = key;
      option.textContent = theme.name;
      themeSelect.appendChild(option);
    });

    themeSelect.value = this.currentTheme;

    themeSelect.addEventListener("change", () => {
      this.applyTheme(themeSelect.value);
    });
  }

  setupBackgroundTexture(): void {
    const textureSelect = document.getElementById(
      "background-texture"
    ) as HTMLSelectElement;

    if (textureSelect) {
      textureSelect.innerHTML = "";

      for (const key in TEXTURE_OPTIONS) {
        const texture = TEXTURE_OPTIONS[key];
        const option = document.createElement("option");
        option.value = key;
        option.textContent = texture.name;
        textureSelect.appendChild(option);
      }

      textureSelect.value = this.backgroundTexture;
      textureSelect.addEventListener("change", () => {
        this.backgroundTexture = textureSelect.value;
      });
    }
  }

  applyTheme(theme: string): void {
    this.currentTheme = theme;
    applyColorTheme(theme);
  }

  getCurrentTheme(): string {
    return this.currentTheme;
  }

  setCurrentTheme(theme: string): void {
    this.currentTheme = theme;
  }

  getBackgroundTexture(): string {
    return this.backgroundTexture;
  }

  setBackgroundTexture(texture: string): void {
    this.backgroundTexture = texture;
  }

  drawBackgroundTexture(ctx: CanvasRenderingContext2D): void {
    if (!ctx || this.backgroundTexture === "none") {
      return;
    }

    ctx.save();
    ctx.globalAlpha = CURRENT_THEME.textureOpacity;

    const textureOption = TEXTURE_OPTIONS[this.backgroundTexture];

    if (textureOption?.url) {
      this.drawExternalTexture(ctx, textureOption.url);
    } else {
      // manually draw builints
      switch (this.backgroundTexture) {
        case "grid":
          this.drawGridTexture(ctx);
          break;
        case "dots":
          this.drawDotsTexture(ctx);
          break;
        case "fabric":
          this.drawFabricTexture(ctx);
          break;
        default:
          break;
      }
    }

    ctx.restore();
  }

  private drawGridTexture(ctx: CanvasRenderingContext2D): void {
    const gridSize = 50;
    ctx.strokeStyle = getTextureColor(CURRENT_THEME);
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.screenWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.screenHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= this.screenHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.screenWidth, y);
      ctx.stroke();
    }
  }

  private drawDotsTexture(ctx: CanvasRenderingContext2D): void {
    const dotSpacing = 30;
    const dotSize = 2;
    ctx.fillStyle = getTextureColor(CURRENT_THEME);

    for (let x = dotSpacing; x < this.screenWidth; x += dotSpacing) {
      for (let y = dotSpacing; y < this.screenHeight; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawFabricTexture(ctx: CanvasRenderingContext2D): void {
    const weaveSize = 4;
    ctx.fillStyle = getTextureColor(CURRENT_THEME);

    for (let x = 0; x < this.screenWidth; x += weaveSize * 2) {
      for (let y = 0; y < this.screenHeight; y += weaveSize * 2) {
        if ((x / weaveSize + y / weaveSize) % 2) {
          ctx.fillRect(x, y, weaveSize, weaveSize);
          ctx.fillRect(x + weaveSize, y + weaveSize, weaveSize, weaveSize);
        }
      }
    }
  }

  private drawExternalTexture(
    ctx: CanvasRenderingContext2D,
    url: string
  ): void {
    let image = this.textureImages.get(url);

    if (!image) {
      image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        // re-render when image loads
        // note: this would need to be connected to the main render loop
      };

      image.onerror = () => {
        this.textureImages.delete(url);
      };

      image.src = url;
      this.textureImages.set(url, image);

      // fallback to dots while loading
      this.drawDotsTexture(ctx);
      return;
    }

    if (image.complete && image.naturalWidth > 0) {
      const pattern = ctx.createPattern(image, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      }
    } else {
      this.drawDotsTexture(ctx);
    }
  }
}
