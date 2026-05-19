import GUI from "lil-gui";

type PlainConfig = Record<string, unknown>;

type HeroDebugConfigShape = {
  enabled: boolean;
  renderMode: "normalOnly" | "edgeProjection" | "pixelSample";
  disableOnMobile: boolean;
  maxPixelRatio: number;
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
    rotateSpeed: number;
    touchRotateSpeed: number;
    disableOnMobile: boolean;
  };
  ascii: {
    enabled: boolean;
    densityMode: "fixed-cell" | "fit-width";
    resolution: number;
    cellWidth: number;
    updateFPS: number;
    charset: string;
    invert: boolean;
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
    cellAspect: number;
    fontSize: number;
    lineHeight: number;
    sampleCount: number;
    samplePattern: "center" | "grid" | "circle6";
    useShapeAwareLookup: boolean;
    shapeVectorMode: "2d" | "6d";
    useCachedLookup: boolean;
    lookupQuantization: number;
    maxCacheEntries: number;
    pixelSampleDisableOnMobile: boolean;
    disableOnMobile: boolean;
  };
  asciiSide: "left" | "right";
  splitPosition: number;
  splitAngle: number;
  splitSoftness: number;
  showSplitLine: boolean;
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
};

export type HeroDebugGuiCallbacks<Config extends PlainConfig> = {
  applyRenderMode?: (config: Config) => void;
  applySplitSettings?: (config: Config) => void;
  applyModelView?: (config: Config) => void;
  applyOrbitSettings?: (config: Config) => void;
  applyAsciiSettings?: (config: Config) => void;
  applyBackgroundTitleSettings?: (config: Config) => void;
  applyOverlaySettings?: (config: Config) => void;
  resetToDefaults?: (config: Config) => void;
};

export type HeroDebugGuiOptions<Config extends PlainConfig> = {
  config: Config;
  defaults?: Config;
  callbacks?: HeroDebugGuiCallbacks<Config>;
  options?: {
    startOpen?: boolean;
    width?: number;
  };
};

export type HeroDebugGuiController<Config extends PlainConfig> = {
  config: Config;
  defaults: Config;
  gui: GUI;
  stringifyConfig: () => string;
  reset: () => void;
  dispose: () => void;
  destroy: () => void;
};

function isPlainObject(value: unknown): value is PlainConfig {
  return Boolean(value) && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

export function deepClonePlainConfig<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deepClonePlainConfig(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, deepClonePlainConfig(item)]),
    ) as T;
  }

  return value;
}

function replacePlainConfig(target: PlainConfig, source: PlainConfig) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.entries(deepClonePlainConfig(source)).forEach(([key, value]) => {
    target[key] = value;
  });
}

function formatObjectKey(key: string) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function stringifyValue(value: unknown, depth: number): string {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return "NaN";
    }
    if (value === Infinity) {
      return "Infinity";
    }
    if (value === -Infinity) {
      return "-Infinity";
    }
    return String(value);
  }

  if (typeof value === "boolean" || value === null) {
    return String(value);
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `[\n${value.map((item) => `${nextIndent}${stringifyValue(item, depth + 1)},`).join("\n")}\n${indent}]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return "{}";
    }

    return `{\n${entries
      .map(([key, item]) => `${nextIndent}${formatObjectKey(key)}: ${stringifyValue(item, depth + 1)},`)
      .join("\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
}

export function stringifyHeroVisualConfig(config: PlainConfig) {
  return stringifyValue(config, 0);
}

function getPasteFriendlyConfig(config: PlainConfig) {
  return stringifyHeroVisualConfig(deepClonePlainConfig(config));
}

function updateGuiDisplays(gui: GUI) {
  gui.controllersRecursive().forEach((controller) => {
    controller.updateDisplay();
  });
}

function logHeroVisualConfig(config: PlainConfig) {
  const formatted = getPasteFriendlyConfig(config);
  console.group("Current heroVisual config");
  console.log(formatted);
  console.log(deepClonePlainConfig(config));
  console.groupEnd();
}

async function copyHeroVisualConfigToClipboard(config: PlainConfig) {
  const formatted = getPasteFriendlyConfig(config);

  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API is unavailable.");
    }

    await navigator.clipboard.writeText(formatted);
    console.info("Copied current heroVisual config to clipboard.");
  } catch (error) {
    console.warn("Could not copy heroVisual config to clipboard; logging it instead.", error);
    logHeroVisualConfig(config);
  }
}

function applyAllCallbacks<Config extends PlainConfig>(
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  callbacks.applyRenderMode?.(config);
  callbacks.applySplitSettings?.(config);
  callbacks.applyModelView?.(config);
  callbacks.applyOrbitSettings?.(config);
  callbacks.applyAsciiSettings?.(config);
  callbacks.applyBackgroundTitleSettings?.(config);
  callbacks.applyOverlaySettings?.(config);
}

function addRenderModeFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("Render Mode");
  const apply = () => callbacks.applyRenderMode?.(config);

  folder.add(heroConfig, "enabled").name("enabled").onChange(apply);
  folder
    .add(heroConfig, "renderMode", ["normalOnly", "edgeProjection", "pixelSample"])
    .name("renderMode")
    .onChange(apply);
  folder.add(heroConfig, "disableOnMobile").name("disableOnMobile").onChange(apply);
  folder.add(heroConfig, "maxPixelRatio", 0.5, 2, 0.05).name("maxPixelRatio").onChange(apply);

  return folder;
}

function addSplitFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("Split");
  const apply = () => callbacks.applySplitSettings?.(config);

  folder.add(heroConfig, "asciiSide", ["left", "right"]).name("asciiSide").onChange(apply);
  folder.add(heroConfig, "splitPosition", 0, 1, 0.01).name("splitPosition").onChange(apply);
  folder.add(heroConfig, "splitAngle", -45, 45, 1).name("splitAngle").onChange(apply);
  folder.add(heroConfig, "splitSoftness", 0, 0.25, 0.005).name("splitSoftness").onChange(apply);
  folder.add(heroConfig, "showSplitLine").name("showSplitLine").onChange(apply);

  return folder;
}

function addModelViewFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("Model View");
  const positionFolder = folder.addFolder("position");
  const apply = () => callbacks.applyModelView?.(config);

  folder.add(heroConfig.modelView, "cameraDistance", 1, 20, 0.1).name("cameraDistance").onChange(apply);
  folder.add(heroConfig.modelView, "cameraY", -5, 5, 0.05).name("cameraY").onChange(apply);
  folder.add(heroConfig.modelView, "cameraFov", 10, 90, 1).name("cameraFov").onChange(apply);
  folder.add(heroConfig.modelView, "modelFitSize", 0.5, 12, 0.1).name("modelFitSize").onChange(apply);
  positionFolder.add(heroConfig.modelView.position, "x", -10, 10, 0.05).name("x").onChange(apply);
  positionFolder.add(heroConfig.modelView.position, "y", -10, 10, 0.05).name("y").onChange(apply);
  positionFolder.add(heroConfig.modelView.position, "z", -10, 10, 0.05).name("z").onChange(apply);

  return folder;
}

function addOrbitControlsFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("Orbit Controls");
  const apply = () => callbacks.applyOrbitSettings?.(config);

  folder.add(heroConfig, "enableOrbitControls").name("enableOrbitControls").onChange(apply);
  folder.add(heroConfig.orbit, "enableDamping").name("enableDamping").onChange(apply);
  folder.add(heroConfig.orbit, "dampingFactor", 0, 0.25, 0.005).name("dampingFactor").onChange(apply);
  folder.add(heroConfig.orbit, "enableZoom").name("enableZoom").onChange(apply);
  folder.add(heroConfig.orbit, "enablePan").name("enablePan").onChange(apply);
  folder.add(heroConfig.orbit, "autoRotate").name("autoRotate").onChange(apply);
  folder.add(heroConfig.orbit, "autoRotateSpeed", -3, 3, 0.01).name("autoRotateSpeed").onChange(apply);
  folder.add(heroConfig.orbit, "minPolarAngle", 0, Math.PI, 0.01).name("minPolarAngle").onChange(apply);
  folder.add(heroConfig.orbit, "maxPolarAngle", 0, Math.PI, 0.01).name("maxPolarAngle").onChange(apply);
  folder.add(heroConfig.orbit, "rotateSpeed", 0, 3, 0.01).name("rotateSpeed").onChange(apply);
  folder.add(heroConfig.orbit, "touchRotateSpeed", 0, 3, 0.01).name("touchRotateSpeed").onChange(apply);
  folder.add(heroConfig.orbit, "disableOnMobile").name("disableOnMobile").onChange(apply);

  return folder;
}

function addAsciiCoreFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  applyAsciiSettings: () => void,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("ASCII Core");

  folder.add(heroConfig.ascii, "enabled").name("enabled").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "densityMode", ["fixed-cell", "fit-width"]).name("densityMode").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "resolution", 20, 400, 1).name("resolution").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "cellWidth", 2, 24, 1).name("cellWidth").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "updateFPS", 1, 60, 1).name("updateFPS").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "charset").name("charset").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "invert").name("invert").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "contrast", 0.1, 4, 0.01).name("contrast").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "brightness", 0.1, 4, 0.01).name("brightness").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "gamma", 0.1, 4, 0.01).name("gamma").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "edgeBoost", 0, 2, 0.01).name("edgeBoost").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "edgeThreshold", 0, 1, 0.01).name("edgeThreshold").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "cellAspect", 0.5, 3, 0.01).name("cellAspect").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "fontSize", 4, 32, 1).name("fontSize").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "lineHeight", 4, 40, 1).name("lineHeight").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "disableOnMobile").name("disableOnMobile").onChange(applyAsciiSettings);

  return folder;
}

function addAsciiSurfaceShadingFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  applyAsciiSettings: () => void,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("ASCII Surface / Shading");

  folder.add(heroConfig.ascii, "surfaceFill").name("surfaceFill").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "surfaceFillStrength", 0, 2, 0.01).name("surfaceFillStrength").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "surfacePointDensity", 0, 1, 0.01).name("surfacePointDensity").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "useDepthForBrightness").name("useDepthForBrightness").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "depthBrightnessStrength", 0, 2, 0.01).name("depthBrightnessStrength").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "useNormalLighting").name("useNormalLighting").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "normalLightingStrength", 0, 2, 0.01).name("normalLightingStrength").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "edgeDominance", 0, 2, 0.01).name("edgeDominance").onChange(applyAsciiSettings);

  return folder;
}

function addAsciiSamplingShapeLookupFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  applyAsciiSettings: () => void,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("ASCII Sampling / Shape Lookup");

  folder.add(heroConfig.ascii, "sampleCount", 1, 16, 1).name("sampleCount").onChange(applyAsciiSettings);
  folder
    .add(heroConfig.ascii, "samplePattern", ["center", "grid", "circle6"])
    .name("samplePattern")
    .onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "useShapeAwareLookup").name("useShapeAwareLookup").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "shapeVectorMode", ["6d"]).name("shapeVectorMode").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "useCachedLookup").name("useCachedLookup").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "lookupQuantization", 2, 32, 1).name("lookupQuantization").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "maxCacheEntries", 1000, 100000, 1000).name("maxCacheEntries").onChange(applyAsciiSettings);
  folder.add(heroConfig.ascii, "pixelSampleDisableOnMobile").name("pixelSampleDisableOnMobile").onChange(applyAsciiSettings);

  return folder;
}

function addBackgroundTitleFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("Background Title");
  const apply = () => callbacks.applyBackgroundTitleSettings?.(config);

  folder.add(heroConfig.backgroundTitle, "enabled").name("enabled").onChange(apply);
  folder.add(heroConfig.backgroundTitle, "text").name("text").onChange(apply);
  folder.addColor(heroConfig.backgroundTitle, "normalColor").name("normalColor").onChange(apply);
  folder.addColor(heroConfig.backgroundTitle, "asciiColor").name("asciiColor").onChange(apply);
  folder.add(heroConfig.backgroundTitle, "opacity", 0, 1, 0.01).name("opacity").onChange(apply);
  folder.add(heroConfig.backgroundTitle, "fontSize").name("fontSize").onChange(apply);
  folder.add(heroConfig.backgroundTitle, "x").name("x").onChange(apply);
  folder.add(heroConfig.backgroundTitle, "y").name("y").onChange(apply);

  return folder;
}

function addOverlayFallbackFolder<Config extends PlainConfig>(
  gui: GUI,
  config: Config,
  callbacks: HeroDebugGuiCallbacks<Config>,
) {
  const heroConfig = config as Config & HeroDebugConfigShape;
  const folder = gui.addFolder("Overlay / Fallback");
  const blendModes = [
    "normal",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
  ];
  const apply = () => callbacks.applyOverlaySettings?.(config);

  folder.add(heroConfig.mediaOverlay, "visible").name("mediaOverlay.visible").onChange(apply);
  folder.add(heroConfig.mediaOverlay, "opacity", 0, 1, 0.01).name("mediaOverlay.opacity").onChange(apply);
  folder.addColor(heroConfig.fallbackTint, "color").name("fallbackTint.color").onChange(apply);
  folder.add(heroConfig.fallbackTint, "blendMode", blendModes).name("fallbackTint.blendMode").onChange(apply);

  return folder;
}

function addUtilityFolder(
  gui: GUI,
  actions: {
    reset: () => void;
    copyConfig: () => void;
    logConfig: () => void;
  },
) {
  const folder = gui.addFolder("Utility");

  folder.add(actions, "reset").name("Reset to site.ts defaults");
  folder.add(actions, "copyConfig").name("Copy current heroVisual config");
  folder.add(actions, "logConfig").name("Log current heroVisual config");

  return folder;
}

export function createHeroDebugGui<Config extends PlainConfig>({
  config,
  defaults,
  callbacks = {},
  options = {},
}: HeroDebugGuiOptions<Config>): HeroDebugGuiController<Config> {
  const originalDefaults = deepClonePlainConfig(defaults ?? config);
  let disposed = false;
  let asciiApplyTimeout = 0;
  const gui = new GUI({
    title: "Hero Debug",
    width: options.width ?? 360,
  });

  if (options.startOpen === false) {
    gui.close();
  } else {
    gui.open();
  }

  function stringifyConfig() {
    return getPasteFriendlyConfig(config);
  }

  function reset() {
    window.clearTimeout(asciiApplyTimeout);
    asciiApplyTimeout = 0;
    replacePlainConfig(config, originalDefaults);
    if (callbacks.resetToDefaults) {
      callbacks.resetToDefaults(config);
    } else {
      applyAllCallbacks(config, callbacks);
    }
    updateGuiDisplays(gui);
  }

  function copyConfig() {
    void copyHeroVisualConfigToClipboard(config);
  }

  function logConfig() {
    logHeroVisualConfig(config);
  }

  function scheduleAsciiApply() {
    window.clearTimeout(asciiApplyTimeout);
    asciiApplyTimeout = window.setTimeout(() => {
      asciiApplyTimeout = 0;
      if (!disposed) {
        callbacks.applyAsciiSettings?.(config);
      }
    }, 80);
  }

  function dispose() {
    disposed = true;
    window.clearTimeout(asciiApplyTimeout);
    asciiApplyTimeout = 0;
    gui.destroy();
  }

  addRenderModeFolder(gui, config, callbacks);
  addSplitFolder(gui, config, callbacks);
  addModelViewFolder(gui, config, callbacks);
  addOrbitControlsFolder(gui, config, callbacks);
  addAsciiCoreFolder(gui, config, scheduleAsciiApply);
  addAsciiSurfaceShadingFolder(gui, config, scheduleAsciiApply);
  addAsciiSamplingShapeLookupFolder(gui, config, scheduleAsciiApply);
  addBackgroundTitleFolder(gui, config, callbacks);
  addOverlayFallbackFolder(gui, config, callbacks);
  addUtilityFolder(gui, {
    reset,
    copyConfig,
    logConfig,
  });

  return {
    config,
    defaults: originalDefaults,
    gui,
    stringifyConfig,
    reset,
    dispose,
    destroy: dispose,
  };
}
