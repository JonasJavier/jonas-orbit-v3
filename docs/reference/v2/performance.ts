export type GraphicsQuality = "high" | "balanced" | "low" | "fallback";

export interface DeviceCapabilities {
  supportsWebGL: boolean;
  supportsWebGL2: boolean;
  dpr: number;
  screenWidth: number;
  screenHeight: number;
  pixelCount: number;
  isMobile: boolean;
  memoryLimit?: number;
  cpuCores: number;
  reducedMotion: boolean;
  touchScreen: boolean;
}

export function detectCapabilities(): DeviceCapabilities {
  const isClient = typeof window !== "undefined";

  if (!isClient) {
    return {
      supportsWebGL: false,
      supportsWebGL2: false,
      dpr: 1,
      screenWidth: 1920,
      screenHeight: 1080,
      pixelCount: 2073600,
      isMobile: false,
      cpuCores: 4,
      reducedMotion: false,
      touchScreen: false,
    };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const screenWidth = window.screen.width || window.innerWidth;
  const screenHeight = window.screen.height || window.innerHeight;
  const pixelCount = screenWidth * screenHeight * dpr;

  let supportsWebGL = false;
  let supportsWebGL2 = false;
  if (!/jsdom/i.test(navigator.userAgent)) {
    try {
      const canvas = document.createElement("canvas");
      supportsWebGL = !!canvas.getContext("webgl");
      supportsWebGL2 = !!canvas.getContext("webgl2");
    } catch {
      supportsWebGL = false;
      supportsWebGL2 = false;
    }
  }

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    screenWidth < 768;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const cpuCores = navigator.hardwareConcurrency || 4;

  let memoryLimit: number | undefined;
  if ("deviceMemory" in navigator) {
    memoryLimit = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  }

  return {
    supportsWebGL,
    supportsWebGL2,
    dpr,
    screenWidth,
    screenHeight,
    pixelCount,
    isMobile,
    memoryLimit,
    cpuCores,
    reducedMotion,
    touchScreen,
  };
}

export function selectQualityLevel(caps: DeviceCapabilities): GraphicsQuality {
  if (!caps.supportsWebGL) return "fallback";
  if (caps.reducedMotion) return "low";
  if (caps.isMobile || caps.pixelCount > 5000000) {
    if (caps.memoryLimit && caps.memoryLimit < 4) return "low";
    return "balanced";
  }
  if (caps.cpuCores <= 4 || (caps.memoryLimit && caps.memoryLimit < 8)) return "balanced";
  return "high";
}

export function getDprForQuality(quality: GraphicsQuality): number {
  switch (quality) {
    case "high":
      return 2;
    case "balanced":
      return 1.5;
    case "low":
      return 1;
    case "fallback":
      return 1;
  }
}
