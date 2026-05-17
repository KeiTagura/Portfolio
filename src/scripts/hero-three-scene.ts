import type { AnimationClip, AnimationMixer, BufferGeometry, Color, Material, Mesh, Object3D, Points, Texture, Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

type HeroThreeController = {
  destroy: () => void;
};

type AsciiSamplePattern = "center" | "grid" | "circle6";
type AsciiShapeVectorMode = "2d" | "6d";

type AsciiCharacterVector = {
  character: string;
  vector: number[];
};

type HeroModelSource = "procedural" | "url";
type HeroModelMaterialMode = "file" | "force-unlit" | "force-lit";
type HeroModelTextureSource = "embedded" | "external";

type AsciiEdgeSource = {
  geometry: BufferGeometry;
  object: Object3D;
};

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
  mode: string;
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
  asciiSide: "left" | "right";
  splitPosition: number;
  splitAngle: number;
  splitSoftness: number;
  showSplitLine: boolean;
  ascii: {
    enabled: boolean;
    resolution: number;
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
    mode: container.dataset.mode ?? "three-ascii-split",
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
    asciiSide: container.dataset.asciiSide === "left" ? "left" : "right",
    splitPosition: clampNumber(parseNumber(container.dataset.splitPosition ?? null, 0.5), 0, 1),
    splitAngle: parseNumber(container.dataset.splitAngle ?? null, 0),
    splitSoftness: clampNumber(parseNumber(container.dataset.splitSoftness ?? null, 0.03), 0, 0.25),
    showSplitLine: container.dataset.showSplitLine !== "false",
    ascii: {
      enabled: container.dataset.asciiEnabled !== "false",
      resolution: clampNumber(parseInteger(legacyAsciiResolution, 96), 16, 180),
      updateFPS: clampNumber(parseNumber(container.dataset.asciiUpdateFps ?? null, 30), 1, 60),
      charset: container.dataset.asciiCharset ?? " .:-=+*#%@",
      invert: container.dataset.asciiInvert === "true",
      sampleCount: clampNumber(parseInteger(container.dataset.asciiSampleCount ?? null, 4), 1, 8),
      samplePattern: readSamplePattern(container.dataset.asciiSamplePattern),
      contrast: clampNumber(parseNumber(container.dataset.asciiContrast ?? null, 1.4), 0.2, 4),
      brightness: clampNumber(parseNumber(container.dataset.asciiBrightness ?? null, 1), 0, 3),
      gamma: clampNumber(parseNumber(container.dataset.asciiGamma ?? null, 1), 0.2, 3),
      edgeBoost: clampNumber(parseNumber(container.dataset.asciiEdgeBoost ?? null, 0.35), 0, 2),
      edgeThreshold: clampNumber(parseNumber(container.dataset.asciiEdgeThreshold ?? null, 0.2), 0, 1),
      cellAspect: clampNumber(parseNumber(container.dataset.asciiCellAspect ?? null, 1.8), 0.8, 3),
      fontSize: clampNumber(parseNumber(container.dataset.asciiFontSize ?? null, 10), 6, 24),
      lineHeight: clampNumber(parseNumber(container.dataset.asciiLineHeight ?? null, 10), 6, 32),
      useShapeAwareLookup: container.dataset.asciiShapeAwareLookup === "true",
      shapeVectorMode: readShapeVectorMode(container.dataset.asciiShapeVectorMode),
      useCachedLookup: container.dataset.asciiCachedLookup !== "false",
      lookupQuantization: clampNumber(parseInteger(container.dataset.asciiLookupQuantization ?? null, 8), 2, 32),
      maxCacheEntries: clampNumber(parseInteger(container.dataset.asciiMaxCacheEntries ?? null, 10000), 0, 50000),
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
    return [
      { x: 0, y: 0 },
      { x: 0.34, y: 0 },
      { x: 0.17, y: 0.29 },
      { x: -0.17, y: 0.29 },
      { x: -0.34, y: 0 },
      { x: -0.17, y: -0.29 },
      { x: 0.17, y: -0.29 },
    ].slice(0, sampleCount);
  }

  return [
    { x: -0.24, y: -0.24 },
    { x: 0.24, y: -0.24 },
    { x: -0.24, y: 0.24 },
    { x: 0.24, y: 0.24 },
    { x: 0, y: 0 },
    { x: -0.36, y: 0 },
    { x: 0.36, y: 0 },
    { x: 0, y: -0.36 },
  ].slice(0, sampleCount);
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

async function createHeroThreeScene(container: HTMLElement): Promise<HeroThreeController | null> {
  const settings = readSettings(container);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = window.matchMedia("(max-width: 720px)").matches;
  const orbitEnabled = settings.enableOrbitControls && !(isSmallScreen && settings.orbit.disableOnMobile);
  let asciiRuntimeEnabled = settings.ascii.enabled && !(isSmallScreen && settings.ascii.disableOnMobile);

  if (shouldSkipForMobile(settings) || !hasWebGLSupport()) {
    container.dataset.sceneState = "fallback";
    return null;
  }

  const THREE = await import("three");
  const OrbitControlsClass = orbitEnabled
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
  const backgroundTitle =
    container.dataset.backgroundTitleEnabled === "true" && container.dataset.backgroundTitleText
      ? document.createElement("div")
      : null;

  if (backgroundTitle) {
    backgroundTitle.className = "hero-background-title";
    backgroundTitle.textContent = container.dataset.backgroundTitleText ?? "";
    backgroundTitle.setAttribute("aria-hidden", "true");
  }

  container.replaceChildren(...(backgroundTitle ? [backgroundTitle] : []), renderer.domElement, asciiCanvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
  camera.position.set(0, 0.55, 7.2);

  const root = new THREE.Group();
  root.position.set(1.35, 0.05, 0);
  scene.add(root);
  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = "Hero procedural fallback";
  root.add(proceduralGroup);

  let controls: OrbitControls | null = null;
  let resumeAutoRotateTimer = 0;
  const autoRotateEnabled = settings.orbit.autoRotate && !reduceMotion;
  container.dataset.orbitAutoRotateRuntime = autoRotateEnabled ? "enabled" : "disabled";

  function renderCameraChange() {
    if (!reduceMotion && !paused) {
      return;
    }

    renderNormalSide();
    renderAsciiLayer(performance.now());
  }

  function handleOrbitStart() {
    if (!controls || !autoRotateEnabled) {
      return;
    }

    window.clearTimeout(resumeAutoRotateTimer);
    controls.autoRotate = false;
  }

  function handleOrbitEnd() {
    if (!controls || !autoRotateEnabled) {
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
  let loadedModel: Object3D | null = null;
  let externalModelTexture: Texture | null = null;
  let modelMixer: AnimationMixer | null = null;
  const replacedModelMaterials = new Set<Material>();
  const modelOwnedTextures = new Set<Texture>();

  let frameId = 0;
  let lastFrameTime = 0;
  let lastAsciiUpdate = -Infinity;
  let disposed = false;
  let paused = document.visibilityState === "hidden";
  const effectiveAsciiUpdateFPS = isSmallScreen
    ? Math.min(settings.ascii.updateFPS, 15)
    : settings.ascii.updateFPS;
  const asciiUpdateInterval = reduceMotion ? Infinity : 1000 / effectiveAsciiUpdateFPS;
  const maxAsciiColumns = isSmallScreen
    ? Math.min(64, settings.ascii.resolution)
    : settings.ascii.resolution;
  const splitAngleRadians = THREE.MathUtils.degToRad(settings.splitAngle);
  const asciiCharacters = normalizeCharset(settings.ascii.charset);
  const effectiveAsciiSampleCount = isSmallScreen
    ? Math.min(settings.ascii.sampleCount, 2)
    : settings.ascii.sampleCount;
  const asciiSampleOffsets = getAsciiSampleOffsets(settings.ascii.samplePattern, effectiveAsciiSampleCount);
  const shapeVectorSize = getShapeVectorSize(settings.ascii.shapeVectorMode);
  const shapeCharacterVectors = settings.ascii.useShapeAwareLookup
    ? createShapeVectorLookup(asciiCharacters, settings.ascii.shapeVectorMode, settings.ascii.fontSize)
    : [];
  const shapeLookupCache = new Map<string, string>();
  const hasAngledSplit = Math.abs(splitAngleRadians) > 0.001;
  let shapeAwareRuntimeEnabled = settings.ascii.useShapeAwareLookup && shapeCharacterVectors.length > 0 && !isSmallScreen;
  let slowShapeAwareFrames = 0;
  container.dataset.asciiRuntime = asciiRuntimeEnabled ? "active" : "disabled";
  container.dataset.asciiEffectiveResolution = String(maxAsciiColumns);
  container.dataset.asciiEffectiveUpdateFps = String(effectiveAsciiUpdateFPS);
  container.dataset.asciiEffectiveSampleCount = String(effectiveAsciiSampleCount);
  container.dataset.asciiShapeRuntime = shapeAwareRuntimeEnabled ? "shape-aware" : "brightness";

  if (OrbitControlsClass) {
    controls = new OrbitControlsClass(camera, renderer.domElement);
    controls.target.copy(root.position);
    controls.enableDamping = settings.orbit.enableDamping;
    controls.dampingFactor = settings.orbit.dampingFactor;
    controls.enableZoom = settings.orbit.enableZoom;
    controls.enablePan = settings.orbit.enablePan;
    controls.autoRotate = autoRotateEnabled;
    controls.autoRotateSpeed = settings.orbit.autoRotateSpeed;
    controls.minPolarAngle = settings.orbit.minPolarAngle;
    controls.maxPolarAngle = settings.orbit.maxPolarAngle;
    controls.minAzimuthAngle = settings.orbit.minAzimuthAngle;
    controls.maxAzimuthAngle = settings.orbit.maxAzimuthAngle;
    controls.rotateSpeed = isSmallScreen ? settings.orbit.touchRotateSpeed : settings.orbit.rotateSpeed;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.ROTATE;
    controls.addEventListener("start", handleOrbitStart);
    controls.addEventListener("end", handleOrbitEnd);
    controls.addEventListener("change", renderCameraChange);
    controls.update();
    renderer.domElement.style.touchAction = isSmallScreen ? "pan-y" : "none";
    container.dataset.orbitActive = "true";
  } else {
    container.dataset.orbitActive = "false";
  }

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
        loadedModel.position.sub(center);
        loadedModel.scale.setScalar(2.8 / maxDimension);
      }

      applyModelMaterialSettings(loadedModel, externalModelTexture);

      const loadedEdgeSources: AsciiEdgeSource[] = [];
      loadedModel.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh || !mesh.geometry) {
          return;
        }

        const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, 24);
        geometries.push(edgeGeometry);
        loadedEdgeSources.push({ geometry: edgeGeometry, object: mesh });
      });

      root.add(loadedModel);
      proceduralGroup.visible = false;
      if (loadedEdgeSources.length > 0) {
        asciiEdgeSources = loadedEdgeSources;
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
      proceduralGroup.visible = true;
      asciiEdgeSources = [
        { geometry: coreEdgesGeometry, object: core },
        { geometry: shellEdgesGeometry, object: wireShell },
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
    const sampleWeight = 0.72 / Math.sqrt(asciiSampleOffsets.length);

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

  function drawEdgesAsAscii(
    geometry: BufferGeometry,
    object: Object3D,
    cells: string[],
    intensity: number[],
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

      drawAsciiLine(cells, intensity, shapeVectors, columns, rows, cellWidth, cellHeight, a.x, a.y, b.x, b.y, xOffset);
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

    const fullCellWidth = Math.max(6, viewportWidth / Math.max(16, maxAsciiColumns));
    const cellWidth = fullCellWidth;
    const cellHeight = Math.max(settings.ascii.lineHeight, fullCellWidth * settings.ascii.cellAspect);
    const columns = Math.max(1, Math.floor(asciiWidth / cellWidth));
    const rows = Math.max(1, Math.floor(viewportHeight / cellHeight));
    const cells = Array.from({ length: columns * rows }, () => " ");
    const intensity = Array.from({ length: columns * rows }, () => 0);
    const shapeVectors = shapeAwareRuntimeEnabled
      ? Array.from({ length: columns * rows * shapeVectorSize }, () => 0)
      : [];
    const shapeFrameStart = performance.now();

    asciiEdgeSources.forEach((source) => {
      drawEdgesAsAscii(
        source.geometry,
        source.object,
        cells,
        intensity,
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
        drawAsciiPoint(cells, intensity, shapeVectors, columns, rows, cellWidth, cellHeight, projected.x, projected.y, asciiX, 0.62);
      }
    });

    const particlePositionsAttribute = particleGeometry.getAttribute("position");
    particles.updateWorldMatrix(true, false);
    for (let index = 0; index < particlePositionsAttribute.count; index += 3) {
      point.fromBufferAttribute(particlePositionsAttribute, index).applyMatrix4(particles.matrixWorld);
      const projected = projectWorldToScreen(point, viewportWidth, viewportHeight);
      if (projected.z >= -1 && projected.z <= 1) {
        drawAsciiPoint(cells, intensity, shapeVectors, columns, rows, cellWidth, cellHeight, projected.x, projected.y, asciiX, 0.28);
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
        asciiContext.fillStyle =
          tunedLevel > 0.72
            ? "rgba(255, 207, 90, 0.94)"
            : tunedLevel > 0.42
              ? "rgba(87, 213, 255, 0.86)"
              : "rgba(191, 239, 255, 0.58)";
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

  function disableAsciiFallback(error: unknown) {
    console.warn("Hero ASCII renderer disabled; falling back to normal Three.js render.", error);
    asciiRuntimeEnabled = false;
    shapeAwareRuntimeEnabled = false;
    shapeLookupCache.clear();
    asciiContext?.clearRect(0, 0, container.clientWidth, container.clientHeight);
    container.dataset.asciiRuntime = "fallback-normal";
    container.dataset.asciiShapeRuntime = "fallback-brightness";
    renderNormalSide();
  }

  function renderAsciiLayer(time: number, force = false) {
    try {
      renderAsciiLayerUnsafe(time, force);
      if (asciiRuntimeEnabled) {
        container.dataset.asciiRuntime = "active";
      }
    } catch (error) {
      disableAsciiFallback(error);
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

    root.position.y = 0.05 + float;
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

  resizeObserver.observe(container);
  setAsciiCanvasSize(width, height);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  void loadUrlModel();

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
      modelMixer?.stopAllAction();
      modelMixer = null;
      if (loadedModel) {
        disposeLoadedObject(loadedModel);
      }

      disposeModelOverrideResources();
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
