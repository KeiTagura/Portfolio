import type { AnimationClip, AnimationMixer, BufferGeometry, Color, Material, Mesh, Object3D, Points, Texture, Vector3, WebGLRenderTarget } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

type HeroThreeController = {
  destroy: () => void;
};

type HeroDebugGuiController = {
  destroy: () => void;
  dispose?: () => void;
};

type AsciiSamplePattern = "center" | "grid" | "circle6";
type AsciiShapeVectorMode = "2d" | "6d";
type AsciiDensityMode = "fixed-cell" | "fit-width";
type AsciiColorSamplingMode = "center" | "average" | "dominant";

type AsciiCharacterVector = {
  character: string;
  vector: number[];
};

type HeroModelSource = "procedural" | "url";
type HeroModelMaterialMode = "file" | "force-unlit" | "force-lit";
type HeroModelTextureSource = "embedded" | "external";
type HeroRenderMode = "normalOnly" | "edgeProjection" | "pixelSample";

type AsciiEdgeSource = {
  geometry: BufferGeometry;
  object: Object3D;
};

type AsciiSurfaceSource = {
  geometry: BufferGeometry;
  object: Object3D;
};

type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const CENTER_COLOR_SAMPLE_OFFSETS = [{ x: 0, y: 0 }] as const;
const AVERAGE_COLOR_SAMPLE_OFFSETS = [
  { x: -0.45, y: -0.45 },
  { x: 0, y: -0.45 },
  { x: 0.45, y: -0.45 },
  { x: -0.45, y: 0 },
  { x: 0, y: 0 },
  { x: 0.45, y: 0 },
  { x: -0.45, y: 0.45 },
  { x: 0, y: 0.45 },
  { x: 0.45, y: 0.45 },
] as const;

type TextureBackedMaterial = Material & {
  alphaTest?: number;
  color?: { clone: () => Color };
  map?: Texture | null;
  metalness?: number;
  opacity?: number;
  roughness?: number;
  side?: number;
  toneMapped?: boolean;
  transparent?: boolean;
};

type HeroThreeSettings = {
  enabled: boolean;
  mode: string;
  renderMode: HeroRenderMode;
  debugGui: {
    enabled: boolean;
    showInProduction: boolean;
    startOpen: boolean;
    width: number;
    enableWithQueryParam: boolean;
  };
  backgroundTitle: {
    enabled: boolean;
    text: string;
    normalColor: string;
    asciiColor: string;
    opacity: number;
    fontSize: string;
    x: string;
    y: string;
  };
  mediaOverlay: {
    visible: boolean;
    opacity: number;
  };
  fallbackTint: {
    color: string;
    blendMode: string;
  };
  modelSource: HeroModelSource;
  modelUrl: string;
  modelMaterialMode: HeroModelMaterialMode;
  modelTextureSource: HeroModelTextureSource;
  modelTextureUrl: string;
  modelAnimation: {
    enabled: boolean;
    clip: string;
    loop: boolean;
    clampWhenFinished: boolean;
    timeScale: number;
  };
  modelView: {
    cameraDistance: number;
    cameraY: number;
    cameraFov: number;
    modelFitSize: number;
    position: {
      x: number;
      y: number;
      z: number;
    };
  };
  asciiSide: "left" | "right";
  splitPosition: number;
  splitAngle: number;
  splitSoftness: number;
  showSplitLine: boolean;
  ascii: {
    enabled: boolean;
    densityMode: AsciiDensityMode;
    resolution: number;
    cellWidth: number;
    updateFPS: number;
    charset: string;
    invert: boolean;
    sampleCount: number;
    samplePattern: AsciiSamplePattern;
    contrast: number;
    brightness: number;
    gamma: number;
    edgeBoost: number;
    edgeThreshold: number;
    surfaceFill: boolean;
    surfaceFillStrength: number;
    surfacePointDensity: number;
    useDepthForBrightness: boolean;
    depthBrightnessStrength: number;
    useNormalLighting: boolean;
    normalLightingStrength: number;
    edgeDominance: number;
    pixelSampleDisableOnMobile: boolean;
    colorSampling: {
      enabled: boolean;
      mode: AsciiColorSamplingMode;
      strength: number;
      saturation: number;
      brightness: number;
      contrast: number;
      alpha: number;
      grayscaleFallback: boolean;
      sampleBackground: boolean;
      minAlpha: number;
      disableOnMobile: boolean;
    };
    cellAspect: number;
    fontSize: number;
    lineHeight: number;
    useShapeAwareLookup: boolean;
    shapeVectorMode: AsciiShapeVectorMode;
    useCachedLookup: boolean;
    lookupQuantization: number;
    maxCacheEntries: number;
    disableOnMobile: boolean;
  };
  enableOrbitControls: boolean;
  orbit: {
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    enablePan: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
    rotateSpeed: number;
    touchRotateSpeed: number;
    disableOnMobile: boolean;
  };
  maxPixelRatio: number;
  disableOnMobile: boolean;
};

const activeScenes = new WeakMap<HTMLElement, HeroThreeController>();
const pendingScenes = new WeakSet<HTMLElement>();

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAngle(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readSamplePattern(value: string | undefined): AsciiSamplePattern {
  return value === "center" || value === "circle6" || value === "grid" ? value : "grid";
}

function readShapeVectorMode(value: string | undefined): AsciiShapeVectorMode {
  return value === "2d" || value === "6d" ? value : "6d";
}

function readDensityMode(value: string | undefined): AsciiDensityMode {
  return value === "fit-width" ? "fit-width" : "fixed-cell";
}

function readColorSamplingMode(value: string | undefined): AsciiColorSamplingMode {
  return value === "center" || value === "dominant" || value === "average" ? value : "average";
}

function readRenderMode(value: string | undefined): HeroRenderMode {
  return value === "normalOnly" || value === "pixelSample" || value === "edgeProjection" ? value : "edgeProjection";
}

function readModelSource(value: string | undefined): HeroModelSource {
  return value === "url" ? "url" : "procedural";
}

function readModelMaterialMode(value: string | undefined): HeroModelMaterialMode {
  return value === "force-unlit" || value === "force-lit" || value === "file" ? value : "file";
}

function readModelTextureSource(value: string | undefined): HeroModelTextureSource {
  return value === "external" ? "external" : "embedded";
}

function normalizeCharset(value: string | undefined) {
  const characters = Array.from(value && value.length > 0 ? value : " .:-=+*#%@");
  return characters.length > 1 ? characters : [" ", characters[0] ?? "@"];
}

function readSettings(container: HTMLElement): HeroThreeSettings {
  const legacyAsciiResolution = container.dataset.asciiResolution ?? null;
  const minPolarAngle = clampNumber(parseNumber(container.dataset.orbitMinPolarAngle ?? null, 1.1), 0, Math.PI);
  const maxPolarAngle = clampNumber(parseNumber(container.dataset.orbitMaxPolarAngle ?? null, 2.05), 0, Math.PI);

  return {
    enabled: container.dataset.enabled !== "false",
    mode: container.dataset.mode ?? "three-ascii-split",
    renderMode: readRenderMode(container.dataset.renderMode),
    debugGui: {
      enabled: container.dataset.debugGuiEnabled === "true",
      showInProduction: container.dataset.debugGuiShowInProduction === "true",
      startOpen: container.dataset.debugGuiStartOpen !== "false",
      width: clampNumber(parseNumber(container.dataset.debugGuiWidth ?? null, 360), 220, 640),
      enableWithQueryParam: container.dataset.debugGuiEnableWithQueryParam !== "false",
    },
    backgroundTitle: {
      enabled: container.dataset.backgroundTitleEnabled === "true",
      text: container.dataset.backgroundTitleText ?? "",
      normalColor: container.dataset.backgroundTitleNormalColor ?? "rgba(244, 247, 251, 0.09)",
      asciiColor: container.dataset.backgroundTitleAsciiColor ?? "rgba(87, 213, 255, 0.18)",
      opacity: clampNumber(parseNumber(container.dataset.backgroundTitleOpacity ?? null, 1), 0, 1),
      fontSize: container.dataset.backgroundTitleFontSize ?? "clamp(5rem, 16vw, 13rem)",
      x: container.dataset.backgroundTitleX ?? "0%",
      y: container.dataset.backgroundTitleY ?? "0%",
    },
    mediaOverlay: {
      visible: container.dataset.mediaOverlayVisible !== "false",
      opacity: clampNumber(parseNumber(container.dataset.mediaOverlayOpacity ?? null, 1), 0, 1),
    },
    fallbackTint: {
      color: container.dataset.fallbackTintColor ?? "rgba(87, 213, 255, 0.22)",
      blendMode: container.dataset.fallbackTintBlendMode ?? "multiply",
    },
    modelSource: readModelSource(container.dataset.modelSource),
    modelUrl: container.dataset.modelUrl ?? "",
    modelMaterialMode: readModelMaterialMode(container.dataset.modelMaterialMode),
    modelTextureSource: readModelTextureSource(container.dataset.modelTextureSource),
    modelTextureUrl: container.dataset.modelTextureUrl ?? "",
    modelAnimation: {
      enabled: container.dataset.modelAnimationEnabled === "true",
      clip: container.dataset.modelAnimationClip ?? "first",
      loop: container.dataset.modelAnimationLoop !== "false",
      clampWhenFinished: container.dataset.modelAnimationClamp !== "false",
      timeScale: clampNumber(parseNumber(container.dataset.modelAnimationTimeScale ?? null, 1), 0.05, 4),
    },
    modelView: {
      cameraDistance: clampNumber(parseNumber(container.dataset.modelViewCameraDistance ?? null, 7.2), 2, 24),
      cameraY: clampNumber(parseNumber(container.dataset.modelViewCameraY ?? null, 0.55), -6, 6),
      cameraFov: clampNumber(parseNumber(container.dataset.modelViewCameraFov ?? null, 38), 18, 80),
      modelFitSize: clampNumber(parseNumber(container.dataset.modelViewFitSize ?? null, 2.8), 0.2, 12),
      position: {
        x: clampNumber(parseNumber(container.dataset.modelViewPositionX ?? null, 1.35), -12, 12),
        y: clampNumber(parseNumber(container.dataset.modelViewPositionY ?? null, 0.05), -12, 12),
        z: clampNumber(parseNumber(container.dataset.modelViewPositionZ ?? null, 0), -12, 12),
      },
    },
    asciiSide: container.dataset.asciiSide === "left" ? "left" : "right",
    splitPosition: clampNumber(parseNumber(container.dataset.splitPosition ?? null, 0.5), 0, 1),
    splitAngle: parseNumber(container.dataset.splitAngle ?? null, 0),
    splitSoftness: clampNumber(parseNumber(container.dataset.splitSoftness ?? null, 0.03), 0, 0.25),
    showSplitLine: container.dataset.showSplitLine !== "false",
    ascii: {
      enabled: container.dataset.asciiEnabled !== "false",
      densityMode: readDensityMode(container.dataset.asciiDensityMode),
      resolution: clampNumber(parseInteger(legacyAsciiResolution, 96), 20, 400),
      cellWidth: clampNumber(parseNumber(container.dataset.asciiCellWidth ?? null, 8), 2, 24),
      updateFPS: clampNumber(parseNumber(container.dataset.asciiUpdateFps ?? null, 30), 1, 60),
      charset: container.dataset.asciiCharset ?? " .:-=+*#%@",
      invert: container.dataset.asciiInvert === "true",
      sampleCount: clampNumber(parseInteger(container.dataset.asciiSampleCount ?? null, 4), 1, 16),
      samplePattern: readSamplePattern(container.dataset.asciiSamplePattern),
      contrast: clampNumber(parseNumber(container.dataset.asciiContrast ?? null, 1.4), 0.1, 4),
      brightness: clampNumber(parseNumber(container.dataset.asciiBrightness ?? null, 1), 0.1, 4),
      gamma: clampNumber(parseNumber(container.dataset.asciiGamma ?? null, 1), 0.1, 4),
      edgeBoost: clampNumber(parseNumber(container.dataset.asciiEdgeBoost ?? null, 0.35), 0, 2),
      edgeThreshold: clampNumber(parseNumber(container.dataset.asciiEdgeThreshold ?? null, 0.2), 0, 1),
      surfaceFill: container.dataset.asciiSurfaceFill === "true",
      surfaceFillStrength: clampNumber(parseNumber(container.dataset.asciiSurfaceFillStrength ?? null, 0.35), 0, 2),
      surfacePointDensity: clampNumber(parseNumber(container.dataset.asciiSurfacePointDensity ?? null, 0.25), 0, 1),
      useDepthForBrightness: container.dataset.asciiDepthBrightness === "true",
      depthBrightnessStrength: clampNumber(parseNumber(container.dataset.asciiDepthBrightnessStrength ?? null, 0.45), 0, 2),
      useNormalLighting: container.dataset.asciiNormalLighting === "true",
      normalLightingStrength: clampNumber(parseNumber(container.dataset.asciiNormalLightingStrength ?? null, 0.5), 0, 2),
      edgeDominance: clampNumber(parseNumber(container.dataset.asciiEdgeDominance ?? null, 0.8), 0, 2),
      pixelSampleDisableOnMobile: container.dataset.asciiPixelSampleDisableOnMobile === "true",
      colorSampling: {
        enabled: container.dataset.asciiColorSamplingEnabled === "true",
        mode: readColorSamplingMode(container.dataset.asciiColorSamplingMode),
        strength: clampNumber(parseNumber(container.dataset.asciiColorSamplingStrength ?? null, 1), 0, 1),
        saturation: clampNumber(parseNumber(container.dataset.asciiColorSamplingSaturation ?? null, 1), 0, 4),
        brightness: clampNumber(parseNumber(container.dataset.asciiColorSamplingBrightness ?? null, 1), 0, 4),
        contrast: clampNumber(parseNumber(container.dataset.asciiColorSamplingContrast ?? null, 1), 0, 4),
        alpha: clampNumber(parseNumber(container.dataset.asciiColorSamplingAlpha ?? null, 1), 0, 1),
        grayscaleFallback: container.dataset.asciiColorSamplingGrayscaleFallback === "true",
        sampleBackground: container.dataset.asciiColorSamplingSampleBackground === "true",
        minAlpha: clampNumber(parseNumber(container.dataset.asciiColorSamplingMinAlpha ?? null, 0.05), 0, 1),
        disableOnMobile: container.dataset.asciiColorSamplingDisableOnMobile === "true",
      },
      cellAspect: clampNumber(parseNumber(container.dataset.asciiCellAspect ?? null, 1.8), 0.5, 3),
      fontSize: clampNumber(parseNumber(container.dataset.asciiFontSize ?? null, 10), 4, 32),
      lineHeight: clampNumber(parseNumber(container.dataset.asciiLineHeight ?? null, 10), 4, 40),
      useShapeAwareLookup: container.dataset.asciiShapeAwareLookup === "true",
      shapeVectorMode: readShapeVectorMode(container.dataset.asciiShapeVectorMode),
      useCachedLookup: container.dataset.asciiCachedLookup !== "false",
      lookupQuantization: clampNumber(parseInteger(container.dataset.asciiLookupQuantization ?? null, 8), 2, 32),
      maxCacheEntries: clampNumber(parseInteger(container.dataset.asciiMaxCacheEntries ?? null, 10000), 1000, 100000),
      disableOnMobile: container.dataset.asciiDisableOnMobile === "true",
    },
    enableOrbitControls: container.dataset.orbitControls === "true",
    orbit: {
      enableDamping: container.dataset.orbitEnableDamping !== "false",
      dampingFactor: parseNumber(container.dataset.orbitDampingFactor ?? null, 0.06),
      enableZoom: container.dataset.orbitEnableZoom === "true",
      enablePan: container.dataset.orbitEnablePan === "true",
      autoRotate: container.dataset.orbitAutoRotate !== "false",
      autoRotateSpeed: parseNumber(container.dataset.orbitAutoRotateSpeed ?? null, 0.35),
      minPolarAngle: Math.min(minPolarAngle, maxPolarAngle),
      maxPolarAngle: Math.max(minPolarAngle, maxPolarAngle),
      minAzimuthAngle: parseAngle(container.dataset.orbitMinAzimuthAngle ?? null, -Infinity),
      maxAzimuthAngle: parseAngle(container.dataset.orbitMaxAzimuthAngle ?? null, Infinity),
      rotateSpeed: parseNumber(container.dataset.orbitRotateSpeed ?? null, 0.45),
      touchRotateSpeed: parseNumber(container.dataset.orbitTouchRotateSpeed ?? null, 0.35),
      disableOnMobile: container.dataset.orbitDisableOnMobile === "true",
    },
    maxPixelRatio: parseNumber(container.dataset.maxPixelRatio ?? null, 1.5),
    disableOnMobile: container.dataset.disableOnMobile === "true",
  };
}

function hasWebGLSupport() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function shouldSkipForMobile(settings: HeroThreeSettings) {
  return settings.disableOnMobile && window.matchMedia("(max-width: 720px)").matches;
}

function getAsciiSampleOffsets(pattern: AsciiSamplePattern, sampleCount: number) {
  if (pattern === "center" || sampleCount <= 1) {
    return [{ x: 0, y: 0 }];
  }

  if (pattern === "circle6") {
    const offsets = [
      { x: 0, y: 0 },
      { x: 0.34, y: 0 },
      { x: 0.17, y: 0.29 },
      { x: -0.17, y: 0.29 },
      { x: -0.34, y: 0 },
      { x: -0.17, y: -0.29 },
      { x: 0.17, y: -0.29 },
    ];

    for (let index = offsets.length; index < sampleCount; index += 1) {
      const angle = ((index - 1) / Math.max(1, sampleCount - 1)) * Math.PI * 2;
      const radius = index % 2 === 0 ? 0.44 : 0.22;
      offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }

    return offsets.slice(0, sampleCount);
  }

  const offsets = [
    { x: -0.24, y: -0.24 },
    { x: 0.24, y: -0.24 },
    { x: -0.24, y: 0.24 },
    { x: 0.24, y: 0.24 },
    { x: 0, y: 0 },
    { x: -0.36, y: 0 },
    { x: 0.36, y: 0 },
    { x: 0, y: -0.36 },
  ];

  for (let index = offsets.length; index < sampleCount; index += 1) {
    const columnCount = Math.ceil(Math.sqrt(sampleCount));
    const rowCount = Math.ceil(sampleCount / columnCount);
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    offsets.push({
      x: columnCount <= 1 ? 0 : column / (columnCount - 1) - 0.5,
      y: rowCount <= 1 ? 0 : row / (rowCount - 1) - 0.5,
    });
  }

  return offsets.slice(0, sampleCount);
}

function getShapeVectorSize(mode: AsciiShapeVectorMode) {
  return mode === "2d" ? 2 : 6;
}

function getShapeVectorIndex(mode: AsciiShapeVectorMode, localX: number, localY: number) {
  if (mode === "2d") {
    return localY < 0.5 ? 0 : 1;
  }

  const column = localX < 0.5 ? 0 : 1;
  const row = localY < 1 / 3 ? 0 : localY < 2 / 3 ? 1 : 2;
  return row * 2 + column;
}

function normalizeShapeVector(vector: number[]) {
  const maxValue = Math.max(...vector);
  if (maxValue <= 0) {
    return vector.map(() => 0);
  }

  return vector.map((value) => value / maxValue);
}

function applyShapeVectorContrast(vector: number[], contrast: number) {
  const maxValue = Math.max(...vector);
  if (maxValue <= 0 || contrast === 1) {
    return vector;
  }

  // Inspired by the article's contrast enhancement: normalize the vector,
  // apply an exponent, then map back to the original range. This sharpens
  // boundaries without changing the overall cell brightness as aggressively.
  return vector.map((value) => Math.pow(value / maxValue, contrast) * maxValue);
}

function createShapeVectorLookup(
  characters: string[],
  mode: AsciiShapeVectorMode,
  fontSize: number,
): AsciiCharacterVector[] {
  // This is intentionally a small CPU-side approximation of shape-aware ASCII:
  // character vectors are generated once, then animation frames compare against
  // cached, quantized cell vectors. It avoids the article's heavier brute-force
  // or GPU paths while keeping edge cells more directional than brightness only.
  const vectorSize = getShapeVectorSize(mode);
  const canvas = document.createElement("canvas");
  const width = 32;
  const height = 48;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return [];
  }

  const vectors = characters.map((character) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fff";
    context.font = `${Math.round(fontSize * 2.6)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(character, width * 0.5, height * 0.52);

    const pixels = context.getImageData(0, 0, width, height).data;
    const vector = Array.from({ length: vectorSize }, () => 0);
    const counts = Array.from({ length: vectorSize }, () => 0);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const localX = (x + 0.5) / width;
        const localY = (y + 0.5) / height;
        const vectorIndex = getShapeVectorIndex(mode, localX, localY);
        vector[vectorIndex] += pixels[(y * width + x) * 4 + 3] / 255;
        counts[vectorIndex] += 1;
      }
    }

    return {
      character,
      vector: normalizeShapeVector(vector.map((value, index) => value / Math.max(1, counts[index]))),
    };
  });

  return vectors;
}

function findShapeAwareCharacter(
  inputVector: number[],
  characterVectors: AsciiCharacterVector[],
  cache: Map<string, string>,
  useCache: boolean,
  quantization: number,
  maxCacheEntries: number,
) {
  if (characterVectors.length === 0) {
    return "";
  }

  const key = inputVector.map((value) => Math.round(clampNumber(value, 0, 1) * quantization)).join(",");
  if (useCache) {
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
  }

  let bestCharacter = characterVectors[0].character;
  let bestDistance = Infinity;

  for (const candidate of characterVectors) {
    let distance = 0;
    for (let index = 0; index < inputVector.length; index += 1) {
      const delta = inputVector[index] - candidate.vector[index];
      distance += delta * delta;
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCharacter = candidate.character;
    }
  }

  if (useCache && maxCacheEntries > 0) {
    if (cache.size >= maxCacheEntries) {
      cache.clear();
    }
    cache.set(key, bestCharacter);
  }

  return bestCharacter;
}

function disposeLoadedObject(object: Object3D) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) {
      return;
    }

    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material?.dispose();
    }
  });
}

function disposeTexture(texture: Texture | null) {
  texture?.dispose();
}

function getHeroDebugGuiRequest(settings: HeroThreeSettings) {
  const queryEnabled =
    settings.debugGui.enableWithQueryParam && new URLSearchParams(window.location.search).get("heroGui") === "1";
  const requested = settings.debugGui.enabled || queryEnabled;
  const productionBlocked = import.meta.env.PROD && !settings.debugGui.showInProduction;

  return {
    requested,
    productionBlocked,
    allowed: requested && !productionBlocked,
  };
}

async function loadHeroDebugGui(
  settings: HeroThreeSettings,
  container: HTMLElement,
  callbacks: {
    applyRenderMode: (config: HeroThreeSettings) => void;
    applySplitSettings: (config: HeroThreeSettings) => void;
    applyModelView: (config: HeroThreeSettings) => void;
    applyOrbitSettings: (config: HeroThreeSettings) => void;
    applyAsciiSettings: (config: HeroThreeSettings) => void;
    applyBackgroundTitleSettings: (config: HeroThreeSettings) => void;
    applyOverlaySettings: (config: HeroThreeSettings) => void;
    resetToDefaults: (config: HeroThreeSettings) => void;
  },
): Promise<HeroDebugGuiController | null> {
  const debugGuiRequest = getHeroDebugGuiRequest(settings);

  container.dataset.debugGuiRuntime = debugGuiRequest.allowed ? "loading" : "disabled";

  if (!debugGuiRequest.allowed) {
    if (debugGuiRequest.productionBlocked && debugGuiRequest.requested) {
      container.dataset.debugGuiRuntime = "blocked-production";
    }
    return null;
  }

  try {
    const { createHeroDebugGui, deepClonePlainConfig } = await import("./hero-debug-gui");
    const defaults = deepClonePlainConfig(settings);
    const controller = createHeroDebugGui({
      config: settings,
      defaults,
      callbacks,
      options: {
        startOpen: settings.debugGui.startOpen,
        width: settings.debugGui.width,
      },
    });

    container.dataset.debugGuiRuntime = "active";
    return controller;
  } catch (error) {
    console.warn("Hero debug GUI failed to load.", error);
    container.dataset.debugGuiRuntime = "failed";
    return null;
  }
}

async function createHeroThreeScene(container: HTMLElement): Promise<HeroThreeController | null> {
  const settings = readSettings(container);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = window.matchMedia("(max-width: 720px)").matches;
  const orbitEnabled = settings.enableOrbitControls && !(isSmallScreen && settings.orbit.disableOnMobile);
  const debugGuiRequested = getHeroDebugGuiRequest(settings).allowed;
  const requestedRenderMode =
    settings.renderMode === "pixelSample" && isSmallScreen && settings.ascii.pixelSampleDisableOnMobile
      ? "edgeProjection"
      : settings.renderMode;
  let activeRenderMode: HeroRenderMode = requestedRenderMode;
  let asciiRuntimeEnabled =
    activeRenderMode !== "normalOnly" && settings.ascii.enabled && !(isSmallScreen && settings.ascii.disableOnMobile);
  container.dataset.renderModeRequested = settings.renderMode;
  container.dataset.renderModeRuntime =
    settings.renderMode === "pixelSample" && requestedRenderMode === "edgeProjection"
      ? "pixelSample-disabled-mobile-edgeProjection"
      : activeRenderMode;

  if (shouldSkipForMobile(settings) || !hasWebGLSupport()) {
    container.dataset.sceneState = "fallback";
    return null;
  }

  const THREE = await import("three");
  const OrbitControlsClass = orbitEnabled || debugGuiRequested
    ? (await import("three/addons/controls/OrbitControls.js")).OrbitControls
    : null;
  const GLTFLoaderClass =
    settings.modelSource === "url" && settings.modelUrl
      ? (await import("three/addons/loaders/GLTFLoader.js")).GLTFLoader
      : null;
  const bounds = container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
  renderer.setSize(width, height, false);
  renderer.domElement.className = "hero-three-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.tabIndex = -1;
  renderer.domElement.style.touchAction = orbitEnabled ? (isSmallScreen ? "pan-y" : "none") : "auto";

  const asciiCanvas = document.createElement("canvas");
  asciiCanvas.className = "hero-ascii-canvas";
  asciiCanvas.setAttribute("aria-hidden", "true");
  const asciiContext = asciiCanvas.getContext("2d", { alpha: true });
  let backgroundTitle = settings.backgroundTitle.enabled && settings.backgroundTitle.text
    ? document.createElement("div")
    : null;

  if (backgroundTitle) {
    backgroundTitle.className = "hero-background-title";
    backgroundTitle.textContent = settings.backgroundTitle.text;
    backgroundTitle.setAttribute("aria-hidden", "true");
  }

  container.replaceChildren(...(backgroundTitle ? [backgroundTitle] : []), renderer.domElement, asciiCanvas);
  const visualRoot = container.closest<HTMLElement>("[data-hero-visual]");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(settings.modelView.cameraFov, width / height, 0.1, 120);
  camera.position.set(0, settings.modelView.cameraY, settings.modelView.cameraDistance);

  const root = new THREE.Group();
  root.position.set(settings.modelView.position.x, settings.modelView.position.y, settings.modelView.position.z);
  scene.add(root);
  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = "Hero procedural fallback";
  root.add(proceduralGroup);
  const proceduralBaseFitSize = settings.modelView.modelFitSize;

  let controls: OrbitControls | null = null;
  let resumeAutoRotateTimer = 0;
  let autoRotateRuntimeEnabled = settings.orbit.autoRotate && !reduceMotion;
  container.dataset.orbitAutoRotateRuntime = autoRotateRuntimeEnabled ? "enabled" : "disabled";

  function renderCameraChange() {
    if (!reduceMotion && !paused) {
      return;
    }

    renderNormalSide();
    renderAsciiLayer(performance.now());
  }

  function handleOrbitStart() {
    if (!controls || !autoRotateRuntimeEnabled) {
      return;
    }

    window.clearTimeout(resumeAutoRotateTimer);
    controls.autoRotate = false;
  }

  function handleOrbitEnd() {
    if (!controls || !autoRotateRuntimeEnabled) {
      return;
    }

    window.clearTimeout(resumeAutoRotateTimer);
    resumeAutoRotateTimer = window.setTimeout(() => {
      if (controls && !paused && !disposed) {
        controls.autoRotate = true;
      }
    }, 1200);
  }

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x57d5ff,
    emissive: 0x0b4e65,
    emissiveIntensity: 0.26,
    metalness: 0.38,
    roughness: 0.34,
    flatShading: true,
  });

  const innerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcf5a,
    emissive: 0x5b3b09,
    emissiveIntensity: 0.22,
    metalness: 0.2,
    roughness: 0.48,
    flatShading: true,
  });

  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0xbfefff,
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });

  const shardMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6f91,
    emissive: 0x3f1020,
    emissiveIntensity: 0.22,
    roughness: 0.58,
    metalness: 0.16,
    flatShading: true,
  });

  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x57d5ff,
    transparent: true,
    opacity: 0.13,
  });

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffcf5a,
    size: 0.022,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  const coreGeometry = new THREE.IcosahedronGeometry(1.12, 1);
  const innerGeometry = new THREE.OctahedronGeometry(0.42, 0);
  const shellGeometry = new THREE.IcosahedronGeometry(1.55, 1);
  const shardGeometry = new THREE.TetrahedronGeometry(0.16, 0);
  const coreEdgesGeometry = new THREE.EdgesGeometry(coreGeometry);
  const shellEdgesGeometry = new THREE.EdgesGeometry(shellGeometry);

  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  proceduralGroup.add(core);

  const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
  innerCore.position.set(0.06, 0.02, 0.08);
  proceduralGroup.add(innerCore);

  const wireShell = new THREE.Mesh(shellGeometry, wireMaterial);
  proceduralGroup.add(wireShell);

  const shards: Mesh[] = [];
  for (let index = 0; index < 20; index += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    const angle = (index / 20) * Math.PI * 2;
    const radius = 1.95 + (index % 5) * 0.18;
    shard.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.5) * 0.72, Math.sin(angle) * 0.9);
    shard.rotation.set(angle * 0.7, angle * 0.35, angle);
    shards.push(shard);
    proceduralGroup.add(shard);
  }

  const gridGeometry = new THREE.BufferGeometry();
  const gridPoints: number[] = [];
  const gridSize = 4.6;
  const gridStep = 0.46;
  for (let line = -5; line <= 5; line += 1) {
    const offset = line * gridStep;
    gridPoints.push(-gridSize, -1.75, offset, gridSize, -1.75, offset);
    gridPoints.push(offset, -1.75, -gridSize, offset, -1.75, gridSize);
  }
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
  const technicalGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
  technicalGrid.position.set(0, 0, -0.2);
  proceduralGroup.add(technicalGrid);

  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions: number[] = [];
  for (let index = 0; index < 140; index += 1) {
    const angle = index * 1.37;
    const radius = 1.4 + ((index * 17) % 100) / 38;
    particlePositions.push(
      Math.cos(angle) * radius,
      (((index * 29) % 100) / 100 - 0.5) * 3.2,
      Math.sin(angle) * radius * 0.72,
    );
  }
  particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
  const particles: Points = new THREE.Points(particleGeometry, particleMaterial);
  proceduralGroup.add(particles);

  const ambient = new THREE.AmbientLight(0x9fb8c8, 0.95);
  const key = new THREE.DirectionalLight(0x57d5ff, 2.25);
  key.position.set(-2.8, 3.2, 4.6);
  const rim = new THREE.DirectionalLight(0xffcf5a, 1.65);
  rim.position.set(3, -1.2, 2.2);
  scene.add(ambient, key, rim);

  const geometries: BufferGeometry[] = [
    coreGeometry,
    innerGeometry,
    shellGeometry,
    shardGeometry,
    coreEdgesGeometry,
    shellEdgesGeometry,
    gridGeometry,
    particleGeometry,
  ];
  const materials: Material[] = [
    coreMaterial,
    innerMaterial,
    wireMaterial,
    shardMaterial,
    gridMaterial,
    particleMaterial,
  ];
  let asciiEdgeSources: AsciiEdgeSource[] = [
    { geometry: coreEdgesGeometry, object: core },
    { geometry: shellEdgesGeometry, object: wireShell },
  ];
  let asciiSurfaceSources: AsciiSurfaceSource[] = [
    { geometry: coreGeometry, object: core },
    { geometry: innerGeometry, object: innerCore },
  ];
  let loadedModel: Object3D | null = null;
  let loadedModelMaxDimension = 0;
  let externalModelTexture: Texture | null = null;
  let modelMixer: AnimationMixer | null = null;
  let debugGuiController: HeroDebugGuiController | null = null;
  let pixelSampleTarget: WebGLRenderTarget | null = null;
  let pixelSampleBuffer: Uint8Array | null = null;
  let pixelSampleWidth = 0;
  let pixelSampleHeight = 0;
  const replacedModelMaterials = new Set<Material>();
  const modelOwnedTextures = new Set<Texture>();

  let frameId = 0;
  let lastFrameTime = 0;
  let lastAsciiUpdate = -Infinity;
  let disposed = false;
  let paused = document.visibilityState === "hidden";
  let effectiveAsciiUpdateFPS = isSmallScreen
    ? Math.min(settings.ascii.updateFPS, 15)
    : settings.ascii.updateFPS;
  let asciiUpdateInterval = reduceMotion ? Infinity : 1000 / effectiveAsciiUpdateFPS;
  let maxAsciiColumns = isSmallScreen
    ? Math.min(64, settings.ascii.resolution)
    : settings.ascii.resolution;
  let splitAngleRadians = THREE.MathUtils.degToRad(settings.splitAngle);
  let asciiCharacters = normalizeCharset(settings.ascii.charset);
  let effectiveAsciiSampleCount = isSmallScreen
    ? Math.min(settings.ascii.sampleCount, 2)
    : settings.ascii.sampleCount;
  let asciiSampleOffsets = getAsciiSampleOffsets(settings.ascii.samplePattern, effectiveAsciiSampleCount);
  let shapeVectorSize = getShapeVectorSize(settings.ascii.shapeVectorMode);
  let shapeCharacterVectors = settings.ascii.useShapeAwareLookup
    ? createShapeVectorLookup(asciiCharacters, settings.ascii.shapeVectorMode, settings.ascii.fontSize)
    : [];
  const shapeLookupCache = new Map<string, string>();
  let shapeResourceConfigKey = [
    settings.ascii.charset,
    settings.ascii.useShapeAwareLookup,
    settings.ascii.shapeVectorMode,
    settings.ascii.fontSize,
  ].join("|");
  let shapeLookupCacheConfigKey = [
    settings.ascii.charset,
    settings.ascii.useShapeAwareLookup,
    settings.ascii.shapeVectorMode,
    settings.ascii.lookupQuantization,
  ].join("|");
  let hasAngledSplit = Math.abs(splitAngleRadians) > 0.001;
  let shapeAwareRuntimeEnabled = settings.ascii.useShapeAwareLookup && shapeCharacterVectors.length > 0 && !isSmallScreen;
  let pixelSampleColorSamplingRuntimeEnabled =
    settings.renderMode === "pixelSample" &&
    settings.ascii.colorSampling.enabled &&
    !(isSmallScreen && settings.ascii.colorSampling.disableOnMobile);
  let slowShapeAwareFrames = 0;
  container.dataset.asciiRuntime = asciiRuntimeEnabled ? "active" : "disabled";
  if (settings.renderMode === "pixelSample") {
    container.dataset.pixelSampleRuntime = activeRenderMode === "pixelSample" ? "active" : "disabled-mobile";
  }
  container.dataset.asciiDensityRuntime = settings.ascii.densityMode;
  container.dataset.asciiEffectiveResolution = String(maxAsciiColumns);
  container.dataset.asciiEffectiveUpdateFps = String(effectiveAsciiUpdateFPS);
  container.dataset.asciiEffectiveSampleCount = String(effectiveAsciiSampleCount);
  container.dataset.asciiShapeRuntime = shapeAwareRuntimeEnabled ? "shape-aware" : "brightness";
  container.dataset.pixelSampleColorRuntime = pixelSampleColorSamplingRuntimeEnabled ? "active" : "disabled";

  function refreshAsciiRuntimeCache(config = settings) {
    effectiveAsciiUpdateFPS = isSmallScreen ? Math.min(config.ascii.updateFPS, 15) : config.ascii.updateFPS;
    asciiUpdateInterval = reduceMotion ? Infinity : 1000 / effectiveAsciiUpdateFPS;
    maxAsciiColumns = isSmallScreen ? Math.min(64, config.ascii.resolution) : config.ascii.resolution;
    effectiveAsciiSampleCount = isSmallScreen ? Math.min(config.ascii.sampleCount, 2) : config.ascii.sampleCount;
    asciiSampleOffsets = getAsciiSampleOffsets(config.ascii.samplePattern, effectiveAsciiSampleCount);
    asciiCharacters = normalizeCharset(config.ascii.charset);
    pixelSampleColorSamplingRuntimeEnabled =
      config.renderMode === "pixelSample" &&
      config.ascii.colorSampling.enabled &&
      !(isSmallScreen && config.ascii.colorSampling.disableOnMobile);

    const nextShapeResourceConfigKey = [
      config.ascii.charset,
      config.ascii.useShapeAwareLookup,
      config.ascii.shapeVectorMode,
      config.ascii.fontSize,
    ].join("|");
    const nextShapeLookupCacheConfigKey = [
      config.ascii.charset,
      config.ascii.useShapeAwareLookup,
      config.ascii.shapeVectorMode,
      config.ascii.lookupQuantization,
    ].join("|");

    if (nextShapeResourceConfigKey !== shapeResourceConfigKey) {
      shapeVectorSize = getShapeVectorSize(config.ascii.shapeVectorMode);
      shapeCharacterVectors = config.ascii.useShapeAwareLookup
        ? createShapeVectorLookup(asciiCharacters, config.ascii.shapeVectorMode, config.ascii.fontSize)
        : [];
      shapeLookupCache.clear();
      shapeAwareRuntimeEnabled = config.ascii.useShapeAwareLookup && shapeCharacterVectors.length > 0 && !isSmallScreen;
      slowShapeAwareFrames = 0;
      shapeResourceConfigKey = nextShapeResourceConfigKey;
      shapeLookupCacheConfigKey = nextShapeLookupCacheConfigKey;
    } else if (nextShapeLookupCacheConfigKey !== shapeLookupCacheConfigKey) {
      shapeLookupCache.clear();
      slowShapeAwareFrames = 0;
      shapeLookupCacheConfigKey = nextShapeLookupCacheConfigKey;
    }

    container.dataset.asciiDensityRuntime = config.ascii.densityMode;
    container.dataset.asciiEffectiveResolution = String(maxAsciiColumns);
    container.dataset.asciiEffectiveUpdateFps = String(effectiveAsciiUpdateFPS);
    container.dataset.asciiEffectiveSampleCount = String(effectiveAsciiSampleCount);
    container.dataset.asciiShapeRuntime = shapeAwareRuntimeEnabled ? "shape-aware" : "brightness";
    container.dataset.pixelSampleColorRuntime = pixelSampleColorSamplingRuntimeEnabled ? "active" : "disabled";
    lastAsciiUpdate = -Infinity;
  }

  function getAsciiCellMetrics(viewportWidth: number) {
    if (settings.ascii.densityMode === "fixed-cell") {
      const mobileSafeWidth = isSmallScreen ? viewportWidth / 64 : 0;
      const cellWidth = Math.max(settings.ascii.cellWidth, mobileSafeWidth);
      return {
        cellWidth,
        cellHeight: Math.max(settings.ascii.lineHeight, cellWidth * settings.ascii.cellAspect),
      };
    }

    const cellWidth = Math.max(6, viewportWidth / Math.max(16, maxAsciiColumns));
    return {
      cellWidth,
      cellHeight: Math.max(settings.ascii.lineHeight, cellWidth * settings.ascii.cellAspect),
    };
  }

  function disposePixelSampleTarget() {
    pixelSampleTarget?.dispose();
    pixelSampleTarget = null;
    pixelSampleBuffer = null;
    pixelSampleWidth = 0;
    pixelSampleHeight = 0;
  }

  function ensurePixelSampleTarget(width: number, height: number) {
    if (pixelSampleTarget && pixelSampleWidth === width && pixelSampleHeight === height && pixelSampleBuffer) {
      return;
    }

    disposePixelSampleTarget();
    pixelSampleTarget = new THREE.WebGLRenderTarget(width, height, {
      depthBuffer: true,
      stencilBuffer: false,
    });
    pixelSampleTarget.texture.name = "Hero pixel-sample ASCII source";
    pixelSampleBuffer = new Uint8Array(width * height * 4);
    pixelSampleWidth = width;
    pixelSampleHeight = height;
  }

  function createOrbitControlsIfNeeded() {
    if (controls || !OrbitControlsClass) {
      return controls;
    }

    controls = new OrbitControlsClass(camera, renderer.domElement);
    controls.target.copy(root.position);
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.ROTATE;
    controls.addEventListener("start", handleOrbitStart);
    controls.addEventListener("end", handleOrbitEnd);
    controls.addEventListener("change", renderCameraChange);
    return controls;
  }

  function configureOrbitControls(config = settings) {
    const controlsAllowed = config.enableOrbitControls && !(isSmallScreen && config.orbit.disableOnMobile);
    const activeControls = controlsAllowed ? createOrbitControlsIfNeeded() : controls;
    autoRotateRuntimeEnabled = controlsAllowed && config.orbit.autoRotate && !reduceMotion;
    container.dataset.orbitAutoRotateRuntime = autoRotateRuntimeEnabled ? "enabled" : "disabled";
    renderer.domElement.style.touchAction = controlsAllowed ? (isSmallScreen ? "pan-y" : "none") : "auto";

    if (!activeControls) {
      container.dataset.orbitActive = "false";
      return null;
    }

    activeControls.enabled = controlsAllowed;
    activeControls.target.copy(root.position);
    activeControls.enableDamping = config.orbit.enableDamping;
    activeControls.dampingFactor = config.orbit.dampingFactor;
    activeControls.enableZoom = config.orbit.enableZoom;
    activeControls.enablePan = config.orbit.enablePan;
    activeControls.autoRotate = autoRotateRuntimeEnabled;
    activeControls.autoRotateSpeed = config.orbit.autoRotateSpeed;
    activeControls.minPolarAngle = Math.min(config.orbit.minPolarAngle, config.orbit.maxPolarAngle);
    activeControls.maxPolarAngle = Math.max(config.orbit.minPolarAngle, config.orbit.maxPolarAngle);
    activeControls.minAzimuthAngle = -Infinity;
    activeControls.maxAzimuthAngle = Infinity;
    activeControls.rotateSpeed = isSmallScreen ? config.orbit.touchRotateSpeed : config.orbit.rotateSpeed;
    activeControls.update();
    container.dataset.orbitActive = controlsAllowed ? "true" : "false";
    return activeControls;
  }

  configureOrbitControls();

  async function loadExternalModelTexture() {
    if (settings.modelTextureSource !== "external" || !settings.modelTextureUrl) {
      container.dataset.modelTextureRuntime = "embedded";
      return null;
    }

    try {
      const texture = await new THREE.TextureLoader().loadAsync(settings.modelTextureUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
      container.dataset.modelTextureRuntime = "external";
      return texture;
    } catch (error) {
      console.warn("Hero model external texture failed to load; using model file textures.", error);
      container.dataset.modelTextureRuntime = "embedded-fallback";
      return null;
    }
  }

  function buildMaterialParameters(source: Material, textureOverride: Texture | null) {
    const material = source as TextureBackedMaterial;

    return {
      alphaTest: material.alphaTest,
      color: material.color?.clone() ?? 0xffffff,
      map: textureOverride ?? material.map ?? null,
      name: material.name,
      opacity: material.opacity,
      side: material.side,
      transparent: material.transparent,
    };
  }

  function createModelMaterial(source: Material, textureOverride: Texture | null) {
    const sourceMaterial = source as TextureBackedMaterial;
    const sharedParameters = buildMaterialParameters(source, textureOverride);

    if (sourceMaterial.map && sourceMaterial.map !== textureOverride) {
      modelOwnedTextures.add(sourceMaterial.map);
    }

    if (settings.modelMaterialMode === "force-unlit") {
      return new THREE.MeshBasicMaterial({
        ...sharedParameters,
        toneMapped: false,
          transparent: true,
          alphaTest: 0.5, // Adjust this value between 0.0 and 1.0
      });
    }

    if (settings.modelMaterialMode === "force-lit") {
      return new THREE.MeshStandardMaterial({
        ...sharedParameters,
        metalness: sourceMaterial.metalness ?? 0.12,
        roughness: sourceMaterial.roughness ?? 0.62,
      });
    }

    if (textureOverride) {
      sourceMaterial.map = textureOverride;
      sourceMaterial.needsUpdate = true;
    }

    return source;
  }

  function applyModelMaterialSettings(model: Object3D, textureOverride: Texture | null) {
    container.dataset.modelMaterialRuntime = settings.modelMaterialMode;

    model.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) {
        return;
      }

      mesh.castShadow = false;
      mesh.receiveShadow = false;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => {
          const nextMaterial = createModelMaterial(material, textureOverride);
          if (nextMaterial !== material) {
            replacedModelMaterials.add(material);
          }
          return nextMaterial;
        });
        return;
      }

      const nextMaterial = createModelMaterial(mesh.material, textureOverride);
      if (nextMaterial !== mesh.material) {
        replacedModelMaterials.add(mesh.material);
        mesh.material = nextMaterial;
      }
    });
  }

  function selectAnimationClip(clips: AnimationClip[]) {
    if (clips.length === 0) {
      return null;
    }

    if (settings.modelAnimation.clip === "first") {
      return clips[0];
    }

    return clips.find((clip) => clip.name === settings.modelAnimation.clip) ?? clips[0];
  }

  function setupModelAnimation(model: Object3D, clips: AnimationClip[]) {
    if (!settings.modelAnimation.enabled) {
      container.dataset.modelAnimationRuntime = "disabled";
      return;
    }

    if (reduceMotion) {
      container.dataset.modelAnimationRuntime = "disabled-reduced-motion";
      return;
    }

    const clip = selectAnimationClip(clips);
    if (!clip) {
      container.dataset.modelAnimationRuntime = "no-clips";
      return;
    }

    modelMixer?.stopAllAction();
    modelMixer = new THREE.AnimationMixer(model);
    const action = modelMixer.clipAction(clip);
    action.loop = settings.modelAnimation.loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = settings.modelAnimation.clampWhenFinished;
    action.timeScale = settings.modelAnimation.timeScale;
    action.play();
    container.dataset.modelAnimationRuntime = "playing";
    container.dataset.modelAnimationClipRuntime = clip.name || "first";
  }

  function disposeModelOverrideResources() {
    disposeTexture(externalModelTexture);
    externalModelTexture = null;
    modelOwnedTextures.forEach((texture) => texture.dispose());
    modelOwnedTextures.clear();
    replacedModelMaterials.forEach((material) => material.dispose());
    replacedModelMaterials.clear();
  }

  async function loadUrlModel() {
    if (!GLTFLoaderClass || !settings.modelUrl) {
      container.dataset.modelRuntime = "procedural";
      container.dataset.modelMaterialRuntime = "procedural";
      container.dataset.modelTextureRuntime = "not-requested";
      container.dataset.modelAnimationRuntime = "not-requested";
      return;
    }

    try {
      container.dataset.modelRuntime = "loading-url";
      const loader = new GLTFLoaderClass();
      const gltf = await loader.loadAsync(settings.modelUrl);

      if (disposed) {
        disposeLoadedObject(gltf.scene);
        return;
      }

      loadedModel = gltf.scene;
      loadedModel.name = "Hero URL model";
      externalModelTexture = await loadExternalModelTexture();
      if (disposed) {
        disposeModelOverrideResources();
        disposeLoadedObject(loadedModel);
        loadedModel = null;
        return;
      }

      const bounds = new THREE.Box3().setFromObject(loadedModel);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      if (Number.isFinite(maxDimension) && maxDimension > 0) {
        loadedModelMaxDimension = maxDimension;
        loadedModel.position.sub(center);
        loadedModel.scale.setScalar(settings.modelView.modelFitSize / maxDimension);
      }

      applyModelMaterialSettings(loadedModel, externalModelTexture);

      const loadedEdgeSources: AsciiEdgeSource[] = [];
      const loadedSurfaceSources: AsciiSurfaceSource[] = [];
      loadedModel.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh || !mesh.geometry) {
          return;
        }

        const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, 24);
        geometries.push(edgeGeometry);
        loadedEdgeSources.push({ geometry: edgeGeometry, object: mesh });
        loadedSurfaceSources.push({ geometry: mesh.geometry, object: mesh });
      });

      root.add(loadedModel);
      proceduralGroup.visible = false;
      if (loadedEdgeSources.length > 0) {
        asciiEdgeSources = loadedEdgeSources;
      }
      if (loadedSurfaceSources.length > 0) {
        asciiSurfaceSources = loadedSurfaceSources;
      }

      container.dataset.modelRuntime = "url";
      setupModelAnimation(loadedModel, gltf.animations);
      controls?.target.copy(root.position);
      controls?.update();
      renderNormalSide();
      renderAsciiLayer(performance.now(), true);
    } catch (error) {
      console.warn("Hero GLB model failed to load; using procedural fallback.", error);
      modelMixer?.stopAllAction();
      modelMixer = null;
      if (loadedModel) {
        root.remove(loadedModel);
        disposeLoadedObject(loadedModel);
      }
      disposeModelOverrideResources();
      loadedModel = null;
      loadedModelMaxDimension = 0;
      proceduralGroup.visible = true;
      asciiEdgeSources = [
        { geometry: coreEdgesGeometry, object: core },
        { geometry: shellEdgesGeometry, object: wireShell },
      ];
      asciiSurfaceSources = [
        { geometry: coreGeometry, object: core },
        { geometry: innerGeometry, object: innerCore },
      ];
      container.dataset.modelRuntime = "procedural-fallback";
      container.dataset.modelMaterialRuntime = "procedural-fallback";
      container.dataset.modelTextureRuntime = "not-requested";
      container.dataset.modelAnimationRuntime = "procedural-fallback";
      renderNormalSide();
      renderAsciiLayer(performance.now(), true);
    }
  }

  function setAsciiCanvasSize(nextWidth: number, nextHeight: number) {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio);
    asciiCanvas.width = Math.max(1, Math.floor(nextWidth * pixelRatio));
    asciiCanvas.height = Math.max(1, Math.floor(nextHeight * pixelRatio));
    asciiCanvas.style.width = `${nextWidth}px`;
    asciiCanvas.style.height = `${nextHeight}px`;
    asciiContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function renderNormalSide() {
    const drawingWidth = renderer.domElement.width;
    const drawingHeight = renderer.domElement.height;

    if (!asciiRuntimeEnabled || hasAngledSplit) {
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setViewport(0, 0, drawingWidth, drawingHeight);
      renderer.render(scene, camera);
      return;
    }

    const split = Math.floor(drawingWidth * settings.splitPosition);
    const softness =
      split <= 0 || split >= drawingWidth ? 0 : Math.floor(drawingWidth * settings.splitSoftness);
    const normalStart =
      settings.asciiSide === "right"
        ? 0
        : clampNumber(split - softness, 0, drawingWidth);
    const normalEnd =
      settings.asciiSide === "right"
        ? clampNumber(split + softness, 0, drawingWidth)
        : drawingWidth;
    const normalWidth = normalEnd - normalStart;

    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setViewport(0, 0, drawingWidth, drawingHeight);
    if (normalWidth > 0) {
      renderer.setScissor(normalStart, 0, normalWidth, drawingHeight);
      renderer.setScissorTest(true);
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
  }

  function projectWorldToScreen(point: Vector3, viewportWidth: number, viewportHeight: number) {
    const projected = point.clone().project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * viewportWidth,
      y: (-projected.y * 0.5 + 0.5) * viewportHeight,
      z: projected.z,
    };
  }

  function getLineCharacter(dx: number, dy: number) {
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx > ady * 1.8) return "-";
    if (ady > adx * 1.8) return "|";
    return dx * dy > 0 ? "\\" : "/";
  }

  function tuneAsciiValue(value: number) {
    const brightened = value * settings.ascii.brightness;
    const contrasted = (brightened - 0.5) * settings.ascii.contrast + 0.5;
    const clamped = clampNumber(contrasted, 0, 1);
    const gammaAdjusted = Math.pow(clamped, 1 / settings.ascii.gamma);
    return settings.ascii.invert ? 1 - gammaAdjusted : gammaAdjusted;
  }

  function getCharacterFromAsciiValue(value: number) {
    const index = Math.round(clampNumber(value, 0, 1) * (asciiCharacters.length - 1));
    return asciiCharacters[index] ?? " ";
  }

  function setAsciiRampColor(value: number, target: RgbaColor): RgbaColor {
    if (value > 0.72) {
      target.r = 255;
      target.g = 207;
      target.b = 90;
      target.a = 0.94;
      return target;
    }

    if (value > 0.42) {
      target.r = 87;
      target.g = 213;
      target.b = 255;
      target.a = 0.86;
      return target;
    }

    target.r = 191;
    target.g = 239;
    target.b = 255;
    target.a = 0.58;
    return target;
  }

  function formatRgba(color: RgbaColor) {
    return `rgba(${Math.round(clampNumber(color.r, 0, 255))}, ${Math.round(clampNumber(color.g, 0, 255))}, ${Math.round(clampNumber(color.b, 0, 255))}, ${clampNumber(color.a, 0, 1)})`;
  }

  function mixColorsTo(a: RgbaColor, b: RgbaColor, amount: number, target: RgbaColor): RgbaColor {
    const t = clampNumber(amount, 0, 1);

    target.r = a.r + (b.r - a.r) * t;
    target.g = a.g + (b.g - a.g) * t;
    target.b = a.b + (b.b - a.b) * t;
    target.a = a.a + (b.a - a.a) * t;
    return target;
  }

  function getPixelSampleValue(buffer: Uint8Array, x: number, y: number, width: number, height: number) {
    const clampedX = clampNumber(Math.round(x), 0, width - 1);
    const clampedY = clampNumber(Math.round(y), 0, height - 1);
    const flippedY = height - 1 - clampedY;
    const index = (flippedY * width + clampedX) * 4;
    const red = buffer[index] / 255;
    const green = buffer[index + 1] / 255;
    const blue = buffer[index + 2] / 255;
    const alpha = buffer[index + 3] / 255;
    return (red * 0.2126 + green * 0.7152 + blue * 0.0722) * alpha;
  }

  function getPixelColorAt(
    buffer: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number,
    target: RgbaColor,
  ): RgbaColor {
    const clampedX = clampNumber(Math.round(x), 0, width - 1);
    const clampedY = clampNumber(Math.round(y), 0, height - 1);
    const flippedY = height - 1 - clampedY;
    const index = (flippedY * width + clampedX) * 4;

    target.r = buffer[index] / 255;
    target.g = buffer[index + 1] / 255;
    target.b = buffer[index + 2] / 255;
    target.a = buffer[index + 3] / 255;
    return target;
  }

  function tuneSampledColorTo(color: RgbaColor, target: RgbaColor): RgbaColor {
    const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
    const saturation = settings.ascii.colorSampling.grayscaleFallback ? 0 : settings.ascii.colorSampling.saturation;
    const tuneChannel = (channel: number) => {
      const saturated = luminance + (channel - luminance) * saturation;
      const contrasted = (saturated - 0.5) * settings.ascii.colorSampling.contrast + 0.5;
      return clampNumber(contrasted * settings.ascii.colorSampling.brightness, 0, 1);
    };

    target.r = tuneChannel(color.r) * 255;
    target.g = tuneChannel(color.g) * 255;
    target.b = tuneChannel(color.b) * 255;
    target.a = clampNumber(color.a, 0, 1);
    return target;
  }

  function getPixelSampleColorTo(
    buffer: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number,
    sampleWidth: number,
    sampleHeight: number,
    target: RgbaColor,
    sampleScratch: RgbaColor,
  ) {
    const colorSampling = settings.ascii.colorSampling;
    const offsets =
      colorSampling.mode === "center"
        ? CENTER_COLOR_SAMPLE_OFFSETS
        : AVERAGE_COLOR_SAMPLE_OFFSETS;

    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 0;
    let samples = 0;

    for (const offset of offsets) {
      const sample = getPixelColorAt(buffer, x + offset.x * sampleWidth, y + offset.y * sampleHeight, width, height, sampleScratch);
      if (!colorSampling.sampleBackground && sample.a < colorSampling.minAlpha) {
        continue;
      }

      const weight = colorSampling.sampleBackground ? 1 : Math.max(sample.a, colorSampling.minAlpha);
      red += sample.r * weight;
      green += sample.g * weight;
      blue += sample.b * weight;
      alpha += sample.a;
      samples += weight;
    }

    if (samples <= 0) {
      return false;
    }

    target.r = red / samples;
    target.g = green / samples;
    target.b = blue / samples;
    target.a = alpha / offsets.length;

    tuneSampledColorTo(target, target);
    return true;
  }

  function getPixelSampleAsciiColorTo(
    buffer: Uint8Array,
    x: number,
    y: number,
    width: number,
    height: number,
    sampleWidth: number,
    sampleHeight: number,
    baseColor: RgbaColor,
    target: RgbaColor,
    sampledColor: RgbaColor,
    sampleScratch: RgbaColor,
  ) {
    if (!pixelSampleColorSamplingRuntimeEnabled) {
      target.r = baseColor.r;
      target.g = baseColor.g;
      target.b = baseColor.b;
      target.a = baseColor.a;
      return target;
    }

    const colorSampling = settings.ascii.colorSampling;
    const hasSample = getPixelSampleColorTo(buffer, x, y, width, height, sampleWidth, sampleHeight, sampledColor, sampleScratch);
    if (!hasSample) {
      target.r = baseColor.r;
      target.g = baseColor.g;
      target.b = baseColor.b;
      target.a = baseColor.a;
      return target;
    }

    mixColorsTo(baseColor, sampledColor, colorSampling.strength, target);
    target.a = baseColor.a * colorSampling.alpha;
    return target;
  }

  function getPixelSampleEdgeBoost(buffer: Uint8Array, x: number, y: number, width: number, height: number, value: number) {
    if (settings.ascii.edgeBoost <= 0) {
      return 0;
    }

    const right = getPixelSampleValue(buffer, x + 1, y, width, height);
    const down = getPixelSampleValue(buffer, x, y + 1, width, height);
    const edge = Math.max(Math.abs(value - right), Math.abs(value - down));
    return edge >= settings.ascii.edgeThreshold ? edge * settings.ascii.edgeBoost : 0;
  }

  function getCellEdgeStrength(intensity: number[], columns: number, rows: number, column: number, row: number, value: number) {
    let strongestDelta = 0;

    for (let y = -1; y <= 1; y += 1) {
      for (let x = -1; x <= 1; x += 1) {
        if (x === 0 && y === 0) {
          continue;
        }

        const nextColumn = column + x;
        const nextRow = row + y;
        if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) {
          continue;
        }

        const neighborValue = clampNumber(intensity[nextRow * columns + nextColumn] / 1.6, 0, 1);
        strongestDelta = Math.max(strongestDelta, Math.abs(value - neighborValue));
      }
    }

    return strongestDelta;
  }

  function addShapeSample(
    shapeVectors: number[],
    columns: number,
    column: number,
    row: number,
    localX: number,
    localY: number,
    weight: number,
  ) {
    if (!shapeAwareRuntimeEnabled) {
      return;
    }

    const cellIndex = row * columns + column;
    const vectorIndex = getShapeVectorIndex(
      settings.ascii.shapeVectorMode,
      clampNumber(localX, 0, 0.999),
      clampNumber(localY, 0, 0.999),
    );
    shapeVectors[cellIndex * shapeVectorSize + vectorIndex] += weight;
  }

  function getCellShapeVector(shapeVectors: number[], cellIndex: number, intensityValue: number) {
    const start = cellIndex * shapeVectorSize;
    const vector = Array.from({ length: shapeVectorSize }, (_, index) => shapeVectors[start + index] ?? 0);
    const normalized = normalizeShapeVector(vector);
    const contrasted = applyShapeVectorContrast(normalized, Math.max(1, settings.ascii.contrast));
    const tunedLevel = tuneAsciiValue(intensityValue);

    return contrasted.map((value) => clampNumber(value * Math.max(0.35, tunedLevel), 0, 1));
  }

  function drawAsciiLine(
    cells: string[],
    intensity: number[],
    cellKinds: Uint8Array,
    shapeVectors: number[],
    columns: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    xOffset: number,
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(dx, dy) / Math.max(cellWidth, cellHeight) * (1.2 + asciiSampleOffsets.length * 0.22)),
    );
    const character = getLineCharacter(dx, dy);
    const edgeWeight = 0.72 * (0.55 + settings.ascii.edgeDominance * 0.65);
    const sampleWeight = edgeWeight / Math.sqrt(asciiSampleOffsets.length);

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = x1 + dx * t - xOffset;
      const y = y1 + dy * t;

      for (const offset of asciiSampleOffsets) {
        const column = Math.floor((x + offset.x * cellWidth) / cellWidth);
        const row = Math.floor((y + offset.y * cellHeight) / cellHeight);

        if (column < 0 || column >= columns || row < 0 || row >= rows) {
          continue;
        }

        const index = row * columns + column;
        intensity[index] += sampleWeight;
        cellKinds[index] = 2;
        cells[index] = intensity[index] > 1.4 ? "#" : character;
        addShapeSample(
          shapeVectors,
          columns,
          column,
          row,
          (x + offset.x * cellWidth) / cellWidth - column,
          (y + offset.y * cellHeight) / cellHeight - row,
          sampleWeight,
        );
      }
    }
  }

  function drawAsciiPoint(
    cells: string[],
    intensity: number[],
    cellKinds: Uint8Array,
    shapeVectors: number[],
    columns: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    x: number,
    y: number,
    xOffset: number,
    weight = 0.5,
  ) {
    const localX = x - xOffset;
    const sampleWeight = weight / Math.sqrt(asciiSampleOffsets.length);

    for (const offset of asciiSampleOffsets) {
      const column = Math.floor((localX + offset.x * cellWidth) / cellWidth);
      const row = Math.floor((y + offset.y * cellHeight) / cellHeight);

      if (column < 0 || column >= columns || row < 0 || row >= rows) {
        continue;
      }

      const index = row * columns + column;
      intensity[index] += sampleWeight;
      cellKinds[index] = Math.max(cellKinds[index], 2);
      const level = intensity[index];
      cells[index] = level > 1.4 ? "@" : level > 0.9 ? "*" : level > 0.55 ? "+" : ".";
      addShapeSample(
        shapeVectors,
        columns,
        column,
        row,
        (localX + offset.x * cellWidth) / cellWidth - column,
        (y + offset.y * cellHeight) / cellHeight - row,
        sampleWeight,
      );
    }
  }

  function drawAsciiSurfacePoint(
    cells: string[],
    intensity: number[],
    cellKinds: Uint8Array,
    shapeVectors: number[],
    columns: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    x: number,
    y: number,
    xOffset: number,
    weight: number,
  ) {
    const localX = x - xOffset;
    const column = Math.floor(localX / cellWidth);
    const row = Math.floor(y / cellHeight);

    if (column < 0 || column >= columns || row < 0 || row >= rows) {
      return;
    }

    const index = row * columns + column;
    if (cellKinds[index] === 2 && intensity[index] > weight * (1 + settings.ascii.edgeDominance)) {
      return;
    }

    intensity[index] += weight;
    if (cellKinds[index] < 2) {
      cellKinds[index] = 1;
      cells[index] = weight > 0.46 ? "+" : weight > 0.28 ? ":" : ".";
    }

    addShapeSample(
      shapeVectors,
      columns,
      column,
      row,
      localX / cellWidth - column,
      y / cellHeight - row,
      weight * 0.65,
    );
  }

  function drawEdgesAsAscii(
    geometry: BufferGeometry,
    object: Object3D,
    cells: string[],
    intensity: number[],
    cellKinds: Uint8Array,
    shapeVectors: number[],
    columns: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    xOffset: number,
  ) {
    const position = geometry.getAttribute("position");
    const start = new THREE.Vector3();
    const end = new THREE.Vector3();

    object.updateWorldMatrix(true, false);

    for (let index = 0; index < position.count; index += 2) {
      start.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
      end.fromBufferAttribute(position, index + 1).applyMatrix4(object.matrixWorld);
      const a = projectWorldToScreen(start, viewportWidth, viewportHeight);
      const b = projectWorldToScreen(end, viewportWidth, viewportHeight);

      if (a.z < -1 || a.z > 1 || b.z < -1 || b.z > 1) {
        continue;
      }

      drawAsciiLine(cells, intensity, cellKinds, shapeVectors, columns, rows, cellWidth, cellHeight, a.x, a.y, b.x, b.y, xOffset);
    }
  }

  function getTriangleVertexIndex(indexAttribute: ReturnType<BufferGeometry["getIndex"]>, triangleIndex: number, corner: number) {
    return indexAttribute ? indexAttribute.getX(triangleIndex * 3 + corner) : triangleIndex * 3 + corner;
  }

  function getSurfaceWeight(projectedZ: number, normal: Vector3) {
    let weight = settings.ascii.surfaceFillStrength;

    if (settings.ascii.useDepthForBrightness) {
      const depthNearness = 1 - clampNumber((projectedZ + 1) * 0.5, 0, 1);
      weight *= 1 - settings.ascii.depthBrightnessStrength + depthNearness * settings.ascii.depthBrightnessStrength * 1.6;
    }

    if (settings.ascii.useNormalLighting) {
      const lightDirection = new THREE.Vector3(-0.35, 0.68, 0.64).normalize();
      const light = clampNumber(normal.dot(lightDirection) * 0.5 + 0.5, 0, 1);
      weight *= 1 - settings.ascii.normalLightingStrength + light * settings.ascii.normalLightingStrength;
    }

    return clampNumber(weight, 0, 2);
  }

  function drawSurfaceAsAscii(
    geometry: BufferGeometry,
    object: Object3D,
    cells: string[],
    intensity: number[],
    cellKinds: Uint8Array,
    shapeVectors: number[],
    columns: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    xOffset: number,
  ) {
    if (!settings.ascii.surfaceFill || settings.ascii.surfaceFillStrength <= 0 || settings.ascii.surfacePointDensity <= 0) {
      return;
    }

    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) {
      return;
    }

    const normalAttribute = geometry.getAttribute("normal");
    const indexAttribute = geometry.getIndex();
    const triangleCount = indexAttribute ? Math.floor(indexAttribute.count / 3) : Math.floor(position.count / 3);
    const density = isSmallScreen ? Math.min(settings.ascii.surfacePointDensity, 0.12) : settings.ascii.surfacePointDensity;
    const sampleStep = Math.max(1, Math.ceil(1 / Math.max(0.02, density)));
    const sampleBudget = isSmallScreen ? 260 : 900;
    const budgetStep = Math.max(1, Math.ceil(triangleCount / sampleBudget));
    const step = Math.max(sampleStep, budgetStep);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const center = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const normalA = new THREE.Vector3();
    const normalB = new THREE.Vector3();
    const normalC = new THREE.Vector3();

    object.updateWorldMatrix(true, false);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += step) {
      const ia = getTriangleVertexIndex(indexAttribute, triangleIndex, 0);
      const ib = getTriangleVertexIndex(indexAttribute, triangleIndex, 1);
      const ic = getTriangleVertexIndex(indexAttribute, triangleIndex, 2);

      a.fromBufferAttribute(position, ia);
      b.fromBufferAttribute(position, ib);
      c.fromBufferAttribute(position, ic);
      center.copy(a).add(b).add(c).multiplyScalar(1 / 3).applyMatrix4(object.matrixWorld);

      if (normalAttribute) {
        normalA.fromBufferAttribute(normalAttribute, ia);
        normalB.fromBufferAttribute(normalAttribute, ib);
        normalC.fromBufferAttribute(normalAttribute, ic);
        normal.copy(normalA).add(normalB).add(normalC).normalize();
      } else {
        normal.copy(c).sub(b).cross(a.clone().sub(b)).normalize();
      }
      normal.applyMatrix3(normalMatrix).normalize();

      const projected = projectWorldToScreen(center, viewportWidth, viewportHeight);
      if (projected.z < -1 || projected.z > 1) {
        continue;
      }

      drawAsciiSurfacePoint(
        cells,
        intensity,
        cellKinds,
        shapeVectors,
        columns,
        rows,
        cellWidth,
        cellHeight,
        projected.x,
        projected.y,
        xOffset,
        getSurfaceWeight(projected.z, normal),
      );
    }
  }

  function getSplitLineXAtY(split: number, viewportHeight: number, y: number) {
    return split + Math.tan(splitAngleRadians) * (y - viewportHeight * 0.5);
  }

  function createAsciiClipPath(viewportWidth: number, viewportHeight: number, split: number) {
    const topX = getSplitLineXAtY(split, viewportHeight, 0);
    const bottomX = getSplitLineXAtY(split, viewportHeight, viewportHeight);

    asciiContext?.beginPath();
    if (settings.asciiSide === "right") {
      asciiContext?.moveTo(topX, 0);
      asciiContext?.lineTo(viewportWidth, 0);
      asciiContext?.lineTo(viewportWidth, viewportHeight);
      asciiContext?.lineTo(bottomX, viewportHeight);
    } else {
      asciiContext?.moveTo(0, 0);
      asciiContext?.lineTo(topX, 0);
      asciiContext?.lineTo(bottomX, viewportHeight);
      asciiContext?.lineTo(0, viewportHeight);
    }
    asciiContext?.closePath();
  }

  function renderAsciiLayerUnsafe(time: number, force = false) {
    if (!asciiContext) {
      return;
    }

    if (!asciiRuntimeEnabled) {
      asciiContext.clearRect(0, 0, container.clientWidth, container.clientHeight);
      return;
    }

    if (!force && time - lastAsciiUpdate < asciiUpdateInterval) {
      return;
    }
    lastAsciiUpdate = time;

    const viewportWidth = container.clientWidth;
    const viewportHeight = container.clientHeight;
    const split = viewportWidth * settings.splitPosition;
    const softness = split <= 0 || split >= viewportWidth ? 0 : viewportWidth * settings.splitSoftness;
    const splitTop = getSplitLineXAtY(split, viewportHeight, 0);
    const splitBottom = getSplitLineXAtY(split, viewportHeight, viewportHeight);
    const splitMin = Math.min(splitTop, splitBottom);
    const splitMax = Math.max(splitTop, splitBottom);
    const asciiX =
      settings.asciiSide === "right"
        ? clampNumber(splitMin - softness, 0, viewportWidth)
        : 0;
    const asciiEnd =
      settings.asciiSide === "right"
        ? viewportWidth
        : clampNumber(splitMax + softness, 0, viewportWidth);
    const asciiWidth = asciiEnd - asciiX;

    if (asciiWidth <= 0) {
      asciiContext.clearRect(0, 0, viewportWidth, viewportHeight);
      return;
    }

    const { cellWidth, cellHeight } = getAsciiCellMetrics(viewportWidth);
    const columns = Math.max(1, Math.floor(asciiWidth / cellWidth));
    const rows = Math.max(1, Math.floor(viewportHeight / cellHeight));
    const cells = Array.from({ length: columns * rows }, () => " ");
    const intensity = Array.from({ length: columns * rows }, () => 0);
    const cellKinds = new Uint8Array(columns * rows);
    const shapeVectors = shapeAwareRuntimeEnabled
      ? Array.from({ length: columns * rows * shapeVectorSize }, () => 0)
      : [];
    const shapeFrameStart = performance.now();

    asciiSurfaceSources.forEach((source) => {
      drawSurfaceAsAscii(
        source.geometry,
        source.object,
        cells,
        intensity,
        cellKinds,
        shapeVectors,
        columns,
        rows,
        cellWidth,
        cellHeight,
        viewportWidth,
        viewportHeight,
        asciiX,
      );
    });

    asciiEdgeSources.forEach((source) => {
      drawEdgesAsAscii(
        source.geometry,
        source.object,
        cells,
        intensity,
        cellKinds,
        shapeVectors,
        columns,
        rows,
        cellWidth,
        cellHeight,
        viewportWidth,
        viewportHeight,
        asciiX,
      );
    });

    const point = new THREE.Vector3();
    shards.forEach((shard) => {
      shard.updateWorldMatrix(true, false);
      point.setFromMatrixPosition(shard.matrixWorld);
      const projected = projectWorldToScreen(point, viewportWidth, viewportHeight);
      if (projected.z >= -1 && projected.z <= 1) {
        drawAsciiPoint(cells, intensity, cellKinds, shapeVectors, columns, rows, cellWidth, cellHeight, projected.x, projected.y, asciiX, 0.62);
      }
    });

    const particlePositionsAttribute = particleGeometry.getAttribute("position");
    particles.updateWorldMatrix(true, false);
    for (let index = 0; index < particlePositionsAttribute.count; index += 3) {
      point.fromBufferAttribute(particlePositionsAttribute, index).applyMatrix4(particles.matrixWorld);
      const projected = projectWorldToScreen(point, viewportWidth, viewportHeight);
      if (projected.z >= -1 && projected.z <= 1) {
        drawAsciiPoint(cells, intensity, cellKinds, shapeVectors, columns, rows, cellWidth, cellHeight, projected.x, projected.y, asciiX, 0.28);
      }
    }

    asciiContext.clearRect(0, 0, viewportWidth, viewportHeight);
    const gradient = asciiContext.createLinearGradient(asciiX, 0, asciiX + asciiWidth, 0);
    if (settings.asciiSide === "right") {
      gradient.addColorStop(0, "rgba(8, 9, 13, 0.1)");
      gradient.addColorStop(Math.min(1, softness > 0 ? softness / asciiWidth : 0), "rgba(8, 9, 13, 0.76)");
      gradient.addColorStop(1, "rgba(8, 9, 13, 0.42)");
    } else {
      gradient.addColorStop(0, "rgba(8, 9, 13, 0.42)");
      gradient.addColorStop(Math.max(0, 1 - (softness > 0 ? softness / asciiWidth : 0)), "rgba(8, 9, 13, 0.76)");
      gradient.addColorStop(1, "rgba(8, 9, 13, 0.1)");
    }
    asciiContext.fillStyle = gradient;
    asciiContext.save();
    createAsciiClipPath(viewportWidth, viewportHeight, split);
    asciiContext.clip();
    asciiContext.fillRect(asciiX, 0, asciiWidth, viewportHeight);
    asciiContext.restore();

    asciiContext.save();
    createAsciiClipPath(viewportWidth, viewportHeight, split);
    asciiContext.clip();
    asciiContext.font = `${settings.ascii.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    asciiContext.textBaseline = "middle";
    asciiContext.textAlign = "center";
    asciiContext.shadowColor = "rgba(87, 213, 255, 0.35)";
    asciiContext.shadowBlur = 7;
    const rampColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const character = cells[index];
        if (character === " ") {
          continue;
        }

        let level = clampNumber(intensity[index] / 1.6, 0, 1);
        const edgeStrength = getCellEdgeStrength(intensity, columns, rows, column, row, level);
        const isEdge = edgeStrength >= settings.ascii.edgeThreshold;
        if (isEdge && settings.ascii.edgeBoost > 0) {
          level = clampNumber(level + edgeStrength * settings.ascii.edgeBoost, 0, 1);
        }

        const tunedLevel = tuneAsciiValue(level);
        const mappedCharacter =
          shapeAwareRuntimeEnabled && isEdge
            ? findShapeAwareCharacter(
                getCellShapeVector(shapeVectors, index, level),
                shapeCharacterVectors,
                shapeLookupCache,
                settings.ascii.useCachedLookup,
                settings.ascii.lookupQuantization,
                settings.ascii.maxCacheEntries,
              ) || character
            : getCharacterFromAsciiValue(tunedLevel);
        asciiContext.fillStyle = formatRgba(setAsciiRampColor(tunedLevel, rampColor));
        const characterX = asciiX + column * cellWidth + cellWidth * 0.5;
        const characterY = row * cellHeight + cellHeight * 0.55;
        const splitLineX = getSplitLineXAtY(split, viewportHeight, characterY);
        const signedDistance =
          settings.asciiSide === "right"
            ? characterX - splitLineX
            : splitLineX - characterX;
        let fade = 1;
        if (softness > 0) {
          fade = clampNumber((signedDistance + softness) / Math.max(1, softness * 2), 0, 1);
        } else if (signedDistance < 0) {
          continue;
        }

        asciiContext.globalAlpha = fade;
        asciiContext.fillText(mappedCharacter, characterX, characterY);
      }
    }

    asciiContext.globalAlpha = 1;
    asciiContext.restore();

    if (shapeAwareRuntimeEnabled && performance.now() - shapeFrameStart > 14) {
      slowShapeAwareFrames += 1;
      if (slowShapeAwareFrames >= 2) {
        shapeAwareRuntimeEnabled = false;
        shapeLookupCache.clear();
        container.dataset.asciiShapeRuntime = "fallback-brightness";
      }
    } else if (shapeAwareRuntimeEnabled) {
      slowShapeAwareFrames = 0;
      container.dataset.asciiShapeRuntime = "shape-aware";
    }

    if (settings.showSplitLine && split > 0 && split < viewportWidth) {
      const splitLineWidth = Math.max(10, softness * 0.6, 16);
      const splitGradient = asciiContext.createLinearGradient(split - splitLineWidth, 0, split + splitLineWidth, 0);
      splitGradient.addColorStop(0, "rgba(87, 213, 255, 0)");
      splitGradient.addColorStop(0.5, "rgba(255, 207, 90, 0.62)");
      splitGradient.addColorStop(1, "rgba(87, 213, 255, 0)");
      asciiContext.save();
      asciiContext.translate(split, viewportHeight * 0.5);
      asciiContext.rotate(splitAngleRadians);
      asciiContext.fillStyle = splitGradient;
      asciiContext.fillRect(-splitLineWidth, viewportHeight * -0.38, splitLineWidth * 2, viewportHeight * 0.76);
      asciiContext.restore();
    }
  }

  function renderPixelSampleAsciiLayerUnsafe(time: number, force = false) {
    if (!asciiContext) {
      return;
    }

    if (!asciiRuntimeEnabled) {
      asciiContext.clearRect(0, 0, container.clientWidth, container.clientHeight);
      return;
    }

    if (!force && time - lastAsciiUpdate < asciiUpdateInterval) {
      return;
    }
    lastAsciiUpdate = time;

    const viewportWidth = container.clientWidth;
    const viewportHeight = container.clientHeight;
    const split = viewportWidth * settings.splitPosition;
    const softness = split <= 0 || split >= viewportWidth ? 0 : viewportWidth * settings.splitSoftness;
    const splitTop = getSplitLineXAtY(split, viewportHeight, 0);
    const splitBottom = getSplitLineXAtY(split, viewportHeight, viewportHeight);
    const splitMin = Math.min(splitTop, splitBottom);
    const splitMax = Math.max(splitTop, splitBottom);
    const asciiX = settings.asciiSide === "right" ? clampNumber(splitMin - softness, 0, viewportWidth) : 0;
    const asciiEnd = settings.asciiSide === "right" ? viewportWidth : clampNumber(splitMax + softness, 0, viewportWidth);
    const asciiWidth = asciiEnd - asciiX;

    if (asciiWidth <= 0) {
      asciiContext.clearRect(0, 0, viewportWidth, viewportHeight);
      return;
    }

    const { cellWidth, cellHeight } = getAsciiCellMetrics(viewportWidth);
    const columns = Math.max(1, Math.floor(asciiWidth / cellWidth));
    const rows = Math.max(1, Math.floor(viewportHeight / cellHeight));
    const fullColumns = Math.max(1, Math.ceil(viewportWidth / cellWidth));
    const targetWidth = Math.max(16, Math.min(isSmallScreen ? 96 : 220, fullColumns));
    const targetHeight = Math.max(12, Math.min(isSmallScreen ? 80 : 140, rows));
    const targetSampleWidth = targetWidth / Math.max(1, fullColumns);
    const targetSampleHeight = targetHeight / Math.max(1, rows);

    ensurePixelSampleTarget(targetWidth, targetHeight);
    if (!pixelSampleTarget || !pixelSampleBuffer) {
      throw new Error("Pixel sample render target was not created.");
    }

    const previousTarget = renderer.getRenderTarget();
    const drawingWidth = renderer.domElement.width;
    const drawingHeight = renderer.domElement.height;
    renderer.setRenderTarget(pixelSampleTarget);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, targetWidth, targetHeight);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(pixelSampleTarget, 0, 0, targetWidth, targetHeight, pixelSampleBuffer);
    renderer.setRenderTarget(previousTarget);
    renderer.setViewport(0, 0, drawingWidth, drawingHeight);

    asciiContext.clearRect(0, 0, viewportWidth, viewportHeight);
    const gradient = asciiContext.createLinearGradient(asciiX, 0, asciiX + asciiWidth, 0);
    if (settings.asciiSide === "right") {
      gradient.addColorStop(0, "rgba(8, 9, 13, 0.1)");
      gradient.addColorStop(Math.min(1, softness > 0 ? softness / asciiWidth : 0), "rgba(8, 9, 13, 0.76)");
      gradient.addColorStop(1, "rgba(8, 9, 13, 0.42)");
    } else {
      gradient.addColorStop(0, "rgba(8, 9, 13, 0.42)");
      gradient.addColorStop(Math.max(0, 1 - (softness > 0 ? softness / asciiWidth : 0)), "rgba(8, 9, 13, 0.76)");
      gradient.addColorStop(1, "rgba(8, 9, 13, 0.1)");
    }

    asciiContext.save();
    createAsciiClipPath(viewportWidth, viewportHeight, split);
    asciiContext.clip();
    asciiContext.fillStyle = gradient;
    asciiContext.fillRect(asciiX, 0, asciiWidth, viewportHeight);
    asciiContext.font = `${settings.ascii.fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    asciiContext.textBaseline = "middle";
    asciiContext.textAlign = "center";
    asciiContext.shadowColor = "rgba(87, 213, 255, 0.28)";
    asciiContext.shadowBlur = 5;
    const baseColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };
    const characterColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };
    const sampledColor: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };
    const sampleScratch: RgbaColor = { r: 0, g: 0, b: 0, a: 1 };

    for (let row = 0; row < rows; row += 1) {
      const characterY = row * cellHeight + cellHeight * 0.55;
      const sampleY = (characterY / viewportHeight) * (targetHeight - 1);

      for (let column = 0; column < columns; column += 1) {
        const characterX = asciiX + column * cellWidth + cellWidth * 0.5;
        const splitLineX = getSplitLineXAtY(split, viewportHeight, characterY);
        const signedDistance = settings.asciiSide === "right" ? characterX - splitLineX : splitLineX - characterX;
        let fade = 1;
        if (softness > 0) {
          fade = clampNumber((signedDistance + softness) / Math.max(1, softness * 2), 0, 1);
        } else if (signedDistance < 0) {
          continue;
        }

        const sampleX = (characterX / viewportWidth) * (targetWidth - 1);
        const baseValue = getPixelSampleValue(pixelSampleBuffer, sampleX, sampleY, targetWidth, targetHeight);
        const edgeBoost = getPixelSampleEdgeBoost(pixelSampleBuffer, sampleX, sampleY, targetWidth, targetHeight, baseValue);
        const tunedLevel = tuneAsciiValue(clampNumber(baseValue + edgeBoost, 0, 1));
        const character = getCharacterFromAsciiValue(tunedLevel);
        if (character === " ") {
          continue;
        }

        setAsciiRampColor(tunedLevel, baseColor);
        characterColor.r = baseColor.r;
        characterColor.g = baseColor.g;
        characterColor.b = baseColor.b;
        characterColor.a = baseColor.a;
        if (pixelSampleColorSamplingRuntimeEnabled) {
          try {
            getPixelSampleAsciiColorTo(
              pixelSampleBuffer,
              sampleX,
              sampleY,
              targetWidth,
              targetHeight,
              targetSampleWidth,
              targetSampleHeight,
              baseColor,
              characterColor,
              sampledColor,
              sampleScratch,
            );
          } catch (error) {
            pixelSampleColorSamplingRuntimeEnabled = false;
            container.dataset.pixelSampleColorRuntime = "fallback-uncolored";
            console.warn("Hero pixel-sample color sampling failed; continuing with uncolored pixel-sample ASCII.", error);
          }
        }

        asciiContext.globalAlpha = fade;
        asciiContext.fillStyle = formatRgba(characterColor);
        asciiContext.fillText(character, characterX, characterY);
      }
    }

    asciiContext.globalAlpha = 1;
    asciiContext.restore();
  }

  function disablePixelSampleFallback(error: unknown, time: number, force: boolean) {
    console.warn("Hero pixel-sample ASCII renderer failed; falling back to edge-projection ASCII.", error);
    disposePixelSampleTarget();
    activeRenderMode = "edgeProjection";
    asciiRuntimeEnabled = settings.ascii.enabled && !(isSmallScreen && settings.ascii.disableOnMobile);
    container.dataset.renderModeRuntime = "pixelSample-fallback-edgeProjection";
    container.dataset.pixelSampleRuntime = "fallback-edgeProjection";
    lastAsciiUpdate = -Infinity;
    try {
      renderAsciiLayerUnsafe(time, force);
    } catch (edgeProjectionError) {
      disableAsciiFallback(edgeProjectionError);
    }
  }

  function disableAsciiFallback(error: unknown) {
    console.warn("Hero edge-projection ASCII renderer disabled; falling back to normal Three.js render.", error);
    asciiRuntimeEnabled = false;
    shapeAwareRuntimeEnabled = false;
    shapeLookupCache.clear();
    asciiContext?.clearRect(0, 0, container.clientWidth, container.clientHeight);
    container.dataset.renderModeRuntime = "normalOnly";
    container.dataset.asciiRuntime = "fallback-normal";
    container.dataset.asciiShapeRuntime = "fallback-brightness";
    renderNormalSide();
  }

  function renderAsciiLayer(time: number, force = false) {
    try {
      if (activeRenderMode === "pixelSample") {
        renderPixelSampleAsciiLayerUnsafe(time, force);
      } else {
        renderAsciiLayerUnsafe(time, force);
      }
      if (asciiRuntimeEnabled) {
        container.dataset.asciiRuntime = "active";
      }
    } catch (error) {
      if (activeRenderMode === "pixelSample") {
        disablePixelSampleFallback(error, time, force);
      } else {
        disableAsciiFallback(error);
      }
    }
  }

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) {
      return;
    }

    const nextWidth = Math.max(1, Math.floor(entry.contentRect.width));
    const nextHeight = Math.max(1, Math.floor(entry.contentRect.height));
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
    renderer.setSize(nextWidth, nextHeight, false);
    setAsciiCanvasSize(nextWidth, nextHeight);
    renderNormalSide();
    renderAsciiLayer(0, true);
  });

  function renderFrame(time: number) {
    const seconds = time * 0.001;
    const deltaSeconds = lastFrameTime > 0 ? Math.min(0.05, (time - lastFrameTime) * 0.001) : 0;
    lastFrameTime = time;
    const speed = reduceMotion ? 0 : 1;
    const float = reduceMotion ? 0 : Math.sin(seconds * 0.75) * 0.075;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(seconds * 1.15) * 0.035;

    root.position.y = settings.modelView.position.y + float;
    root.rotation.y = seconds * 0.12 * speed;
    root.rotation.x = -0.08;
    core.rotation.y = seconds * 0.34 * speed;
    core.rotation.x = seconds * 0.12 * speed;
    innerCore.rotation.y = -seconds * 0.5 * speed;
    innerCore.scale.setScalar(pulse);
    wireShell.rotation.y = -seconds * 0.22 * speed;
    particles.rotation.y = seconds * 0.08 * speed;
    technicalGrid.position.z = -0.2 + Math.sin(seconds * 0.35) * 0.05 * speed;

    shards.forEach((shard, index) => {
      const shardSpeed = speed * (0.003 + index * 0.00008);
      shard.rotation.x += shardSpeed;
      shard.rotation.y += shardSpeed * 1.7;
    });

    controls?.update();
    modelMixer?.update(deltaSeconds);
    renderNormalSide();
    renderAsciiLayer(time, reduceMotion);
  }

  function animate(time: number) {
    if (disposed) {
      return;
    }

    if (paused) {
      frameId = 0;
      return;
    }

    renderFrame(time);

    if (!reduceMotion) {
      frameId = window.requestAnimationFrame(animate);
    }
  }

  function handleVisibilityChange() {
    paused = document.visibilityState === "hidden";
    if (paused) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      return;
    }

    if (!reduceMotion && frameId === 0) {
      lastFrameTime = 0;
      frameId = window.requestAnimationFrame(animate);
    }
  }

  function applyRenderMode(config = settings) {
    const visualEnabled = config.enabled && !(isSmallScreen && config.disableOnMobile);
    const requestedMode =
      config.renderMode === "pixelSample" && isSmallScreen && config.ascii.pixelSampleDisableOnMobile
        ? "edgeProjection"
        : config.renderMode;

    activeRenderMode = requestedMode;
    asciiRuntimeEnabled =
      visualEnabled &&
      activeRenderMode !== "normalOnly" &&
      config.ascii.enabled &&
      !(isSmallScreen && config.ascii.disableOnMobile);
    pixelSampleColorSamplingRuntimeEnabled =
      activeRenderMode === "pixelSample" &&
      config.ascii.colorSampling.enabled &&
      !(isSmallScreen && config.ascii.colorSampling.disableOnMobile);

    if (activeRenderMode !== "pixelSample") {
      disposePixelSampleTarget();
    }

    renderer.domElement.style.display = visualEnabled ? "" : "none";
    asciiCanvas.style.display = visualEnabled && activeRenderMode !== "normalOnly" ? "" : "none";
    if (backgroundTitle) {
      backgroundTitle.style.display = visualEnabled && config.backgroundTitle.enabled ? "" : "none";
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.maxPixelRatio));
    renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight), false);
    setAsciiCanvasSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
    container.dataset.sceneState = visualEnabled
      ? reduceMotion
        ? "ready-reduced-motion"
        : "ready"
      : "fallback-debug-disabled";
    container.dataset.renderModeRequested = config.renderMode;
    container.dataset.renderModeRuntime =
      !visualEnabled
        ? "disabled"
        : config.renderMode === "pixelSample" && requestedMode === "edgeProjection"
          ? "pixelSample-disabled-mobile-edgeProjection"
          : activeRenderMode;
    container.dataset.asciiRuntime = asciiRuntimeEnabled ? "active" : "disabled";
    container.dataset.pixelSampleColorRuntime = pixelSampleColorSamplingRuntimeEnabled ? "active" : "disabled";

    if (!asciiRuntimeEnabled) {
      asciiContext?.clearRect(0, 0, container.clientWidth, container.clientHeight);
    }

    if (!visualEnabled) {
      renderer.clear();
      return;
    }

    renderNormalSide();
    renderAsciiLayer(performance.now(), true);
  }

  function applySplitSettings(config = settings) {
    splitAngleRadians = THREE.MathUtils.degToRad(config.splitAngle);
    hasAngledSplit = Math.abs(splitAngleRadians) > 0.001;

    visualRoot?.style.setProperty("--hero-split-position", `${clampNumber(config.splitPosition, 0, 1) * 100}%`);
    visualRoot?.style.setProperty("--hero-split-softness", `${clampNumber(config.splitSoftness, 0, 0.25) * 100}%`);
    visualRoot?.style.setProperty("--hero-split-line-color", `rgba(255, 207, 90, ${config.showSplitLine ? 0.22 : 0})`);
    visualRoot?.style.setProperty("--hero-background-title-gradient-angle", `${90 + config.splitAngle}deg`);
    visualRoot?.style.setProperty(
      "--hero-background-title-normal-color",
      config.asciiSide === "left" ? config.backgroundTitle.asciiColor : config.backgroundTitle.normalColor,
    );
    visualRoot?.style.setProperty(
      "--hero-background-title-ascii-color",
      config.asciiSide === "left" ? config.backgroundTitle.normalColor : config.backgroundTitle.asciiColor,
    );

    renderNormalSide();
    renderAsciiLayer(performance.now(), true);
  }

  function applyModelView(config = settings) {
    camera.fov = config.modelView.cameraFov;
    camera.position.set(0, config.modelView.cameraY, config.modelView.cameraDistance);
    camera.updateProjectionMatrix();
    root.position.set(config.modelView.position.x, config.modelView.position.y, config.modelView.position.z);

    if (loadedModel && loadedModelMaxDimension > 0) {
      loadedModel.scale.setScalar(config.modelView.modelFitSize / loadedModelMaxDimension);
    } else {
      proceduralGroup.scale.setScalar(config.modelView.modelFitSize / Math.max(0.001, proceduralBaseFitSize));
    }

    controls?.target.copy(root.position);
    controls?.update();
    renderNormalSide();
    renderAsciiLayer(performance.now(), true);
  }

  function applyOrbitSettings(config = settings) {
    configureOrbitControls(config);
    renderNormalSide();
    renderAsciiLayer(performance.now(), true);
  }

  function applyAsciiSettings(config = settings) {
    refreshAsciiRuntimeCache(config);
    applyRenderMode(config);
  }

  function applyBackgroundTitleSettings(config = settings) {
    if (config.backgroundTitle.enabled && config.backgroundTitle.text && !backgroundTitle) {
      backgroundTitle = document.createElement("div");
      backgroundTitle.className = "hero-background-title";
      backgroundTitle.setAttribute("aria-hidden", "true");
      container.insertBefore(backgroundTitle, renderer.domElement);
    }

    if (backgroundTitle) {
      backgroundTitle.textContent = config.backgroundTitle.text;
      backgroundTitle.style.display = config.enabled && config.backgroundTitle.enabled ? "" : "none";
    }

    visualRoot?.style.setProperty("--hero-background-title-opacity", String(config.backgroundTitle.opacity));
    visualRoot?.style.setProperty("--hero-background-title-font-size", config.backgroundTitle.fontSize);
    visualRoot?.style.setProperty("--hero-background-title-x", config.backgroundTitle.x);
    visualRoot?.style.setProperty("--hero-background-title-y", config.backgroundTitle.y);
    applySplitSettings(config);
  }

  function applyOverlaySettings(config = settings) {
    visualRoot?.style.setProperty(
      "--hero-media-overlay-opacity",
      String(config.mediaOverlay.visible ? clampNumber(config.mediaOverlay.opacity, 0, 1) : 0),
    );
    visualRoot?.style.setProperty("--hero-fallback-tint-color", config.fallbackTint.color);
    visualRoot?.style.setProperty("--hero-fallback-tint-blend-mode", config.fallbackTint.blendMode);
  }

  function applyAllRuntimeSettings(config = settings) {
    applyRenderMode(config);
    applySplitSettings(config);
    applyModelView(config);
    applyOrbitSettings(config);
    applyAsciiSettings(config);
    applyBackgroundTitleSettings(config);
    applyOverlaySettings(config);
  }

  resizeObserver.observe(container);
  setAsciiCanvasSize(width, height);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  void loadUrlModel();
  void loadHeroDebugGui(settings, container, {
    applyRenderMode,
    applySplitSettings,
    applyModelView,
    applyOrbitSettings,
    applyAsciiSettings,
    applyBackgroundTitleSettings,
    applyOverlaySettings,
    resetToDefaults: applyAllRuntimeSettings,
  }).then((controller) => {
    if (disposed) {
      controller?.destroy();
      return;
    }

    debugGuiController = controller;
  });

  renderFrame(0);
  if (!reduceMotion) {
    frameId = window.requestAnimationFrame(animate);
  }
  container.dataset.sceneState = reduceMotion ? "ready-reduced-motion" : "ready";

  return {
    destroy() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(resumeAutoRotateTimer);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controls?.removeEventListener("start", handleOrbitStart);
      controls?.removeEventListener("end", handleOrbitEnd);
      controls?.removeEventListener("change", renderCameraChange);
      controls?.dispose();
      debugGuiController?.destroy();
      debugGuiController = null;
      modelMixer?.stopAllAction();
      modelMixer = null;
      if (loadedModel) {
        disposeLoadedObject(loadedModel);
      }
      loadedModelMaxDimension = 0;

      disposeModelOverrideResources();
      disposePixelSampleTarget();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();

      container.replaceChildren();
      container.dataset.sceneState = "destroyed";
    },
  };
}

export function initHeroThreeScenes() {
  if (typeof window === "undefined") {
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-hero-three-scene]").forEach((container) => {
    if (activeScenes.has(container) || pendingScenes.has(container)) {
      return;
    }

    pendingScenes.add(container);
    createHeroThreeScene(container)
      .then((controller) => {
        if (controller) {
          activeScenes.set(container, controller);
        }
      })
      .catch((error) => {
        console.warn("Hero Three.js scene failed to initialize.", error);
        container.dataset.sceneState = "fallback";
      })
      .finally(() => {
        pendingScenes.delete(container);
      });
  });
}

export function destroyHeroThreeScenes() {
  if (typeof window === "undefined") {
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-hero-three-scene]").forEach((container) => {
    activeScenes.get(container)?.destroy();
    activeScenes.delete(container);
    pendingScenes.delete(container);
  });
}
