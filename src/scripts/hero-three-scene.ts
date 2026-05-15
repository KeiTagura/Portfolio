import type { BufferGeometry, Material, Mesh, Object3D, Points, Vector3 } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

type HeroThreeController = {
  destroy: () => void;
};

type HeroThreeSettings = {
  mode: string;
  modelUrl: string;
  asciiSide: "left" | "right";
  splitPosition: number;
  splitAngle: number;
  splitSoftness: number;
  showSplitLine: boolean;
  asciiResolution: number;
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

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAngle(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readSettings(container: HTMLElement): HeroThreeSettings {
  return {
    mode: container.dataset.mode ?? "three-ascii-split",
    modelUrl: container.dataset.modelUrl ?? "",
    asciiSide: container.dataset.asciiSide === "left" ? "left" : "right",
    splitPosition: clampNumber(parseNumber(container.dataset.splitPosition ?? null, 0.5), 0, 1),
    splitAngle: parseNumber(container.dataset.splitAngle ?? null, 0),
    splitSoftness: clampNumber(parseNumber(container.dataset.splitSoftness ?? null, 0.03), 0, 0.25),
    showSplitLine: container.dataset.showSplitLine !== "false",
    asciiResolution: parseNumber(container.dataset.asciiResolution ?? null, 96),
    enableOrbitControls: container.dataset.orbitControls === "true",
    orbit: {
      enableDamping: container.dataset.orbitEnableDamping !== "false",
      dampingFactor: parseNumber(container.dataset.orbitDampingFactor ?? null, 0.06),
      enableZoom: container.dataset.orbitEnableZoom === "true",
      enablePan: container.dataset.orbitEnablePan === "true",
      autoRotate: container.dataset.orbitAutoRotate !== "false",
      autoRotateSpeed: parseNumber(container.dataset.orbitAutoRotateSpeed ?? null, 0.35),
      minPolarAngle: parseNumber(container.dataset.orbitMinPolarAngle ?? null, 1.1),
      maxPolarAngle: parseNumber(container.dataset.orbitMaxPolarAngle ?? null, 2.05),
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

async function createHeroThreeScene(container: HTMLElement): Promise<HeroThreeController | null> {
  const settings = readSettings(container);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmallScreen = window.matchMedia("(max-width: 720px)").matches;
  const orbitEnabled = settings.enableOrbitControls && !(isSmallScreen && settings.orbit.disableOnMobile);

  if (shouldSkipForMobile(settings) || !hasWebGLSupport()) {
    container.dataset.sceneState = "fallback";
    return null;
  }

  const THREE = await import("three");
  const OrbitControlsClass = orbitEnabled
    ? (await import("three/addons/controls/OrbitControls.js")).OrbitControls
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

  container.replaceChildren(renderer.domElement, asciiCanvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
  camera.position.set(0, 0.55, 7.2);

  const root = new THREE.Group();
  root.position.set(1.35, 0.05, 0);
  scene.add(root);

  let controls: OrbitControls | null = null;
  let resumeAutoRotateTimer = 0;
  const autoRotateEnabled = settings.orbit.autoRotate && !reduceMotion;

  function renderCameraChange() {
    renderNormalSide();
    renderAsciiLayer(performance.now(), true);
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
  root.add(core);

  const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
  innerCore.position.set(0.06, 0.02, 0.08);
  root.add(innerCore);

  const wireShell = new THREE.Mesh(shellGeometry, wireMaterial);
  root.add(wireShell);

  const shards: Mesh[] = [];
  for (let index = 0; index < 20; index += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    const angle = (index / 20) * Math.PI * 2;
    const radius = 1.95 + (index % 5) * 0.18;
    shard.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.5) * 0.72, Math.sin(angle) * 0.9);
    shard.rotation.set(angle * 0.7, angle * 0.35, angle);
    shards.push(shard);
    root.add(shard);
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
  root.add(technicalGrid);

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
  root.add(particles);

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

  let frameId = 0;
  let lastAsciiUpdate = -Infinity;
  let disposed = false;
  let paused = document.visibilityState === "hidden";
  const asciiUpdateInterval = reduceMotion ? Infinity : isSmallScreen ? 1000 / 8 : 1000 / 14;
  const maxAsciiColumns = isSmallScreen ? 42 : Math.max(48, Math.min(96, settings.asciiResolution));
  const splitAngleRadians = THREE.MathUtils.degToRad(settings.splitAngle);

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

  function drawAsciiLine(
    cells: string[],
    intensity: number[],
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
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(cellWidth, cellHeight) * 1.6));
    const character = getLineCharacter(dx, dy);

    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = x1 + dx * t - xOffset;
      const y = y1 + dy * t;
      const column = Math.floor(x / cellWidth);
      const row = Math.floor(y / cellHeight);

      if (column < 0 || column >= columns || row < 0 || row >= rows) {
        continue;
      }

      const index = row * columns + column;
      intensity[index] += 0.72;
      cells[index] = intensity[index] > 1.4 ? "#" : character;
    }
  }

  function drawAsciiPoint(
    cells: string[],
    intensity: number[],
    columns: number,
    rows: number,
    cellWidth: number,
    cellHeight: number,
    x: number,
    y: number,
    xOffset: number,
    weight = 0.5,
  ) {
    const column = Math.floor((x - xOffset) / cellWidth);
    const row = Math.floor(y / cellHeight);

    if (column < 0 || column >= columns || row < 0 || row >= rows) {
      return;
    }

    const index = row * columns + column;
    intensity[index] += weight;
    const level = intensity[index];
    cells[index] = level > 1.4 ? "@" : level > 0.9 ? "*" : level > 0.55 ? "+" : ".";
  }

  function drawEdgesAsAscii(
    geometry: BufferGeometry,
    object: Object3D,
    cells: string[],
    intensity: number[],
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

      drawAsciiLine(cells, intensity, columns, rows, cellWidth, cellHeight, a.x, a.y, b.x, b.y, xOffset);
    }
  }

  function renderAsciiLayer(time: number, force = false) {
    if (!asciiContext) {
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
    const asciiX =
      settings.asciiSide === "right"
        ? clampNumber(split - softness, 0, viewportWidth)
        : 0;
    const asciiEnd =
      settings.asciiSide === "right"
        ? viewportWidth
        : clampNumber(split + softness, 0, viewportWidth);
    const asciiWidth = asciiEnd - asciiX;
    const asciiFadeStart = settings.asciiSide === "right" ? split - softness : split + softness;
    const asciiFadeEnd = split;

    if (asciiWidth <= 0) {
      asciiContext.clearRect(0, 0, viewportWidth, viewportHeight);
      return;
    }

    const fullCellWidth = Math.max(8, viewportWidth / Math.max(32, maxAsciiColumns));
    const cellWidth = fullCellWidth;
    const cellHeight = fullCellWidth * 1.52;
    const columns = Math.max(1, Math.floor(asciiWidth / cellWidth));
    const rows = Math.max(1, Math.floor(viewportHeight / cellHeight));
    const cells = Array.from({ length: columns * rows }, () => " ");
    const intensity = Array.from({ length: columns * rows }, () => 0);

    drawEdgesAsAscii(
      coreEdgesGeometry,
      core,
      cells,
      intensity,
      columns,
      rows,
      cellWidth,
      cellHeight,
      viewportWidth,
      viewportHeight,
      asciiX,
    );
    drawEdgesAsAscii(
      shellEdgesGeometry,
      wireShell,
      cells,
      intensity,
      columns,
      rows,
      cellWidth,
      cellHeight,
      viewportWidth,
      viewportHeight,
      asciiX,
    );

    const point = new THREE.Vector3();
    shards.forEach((shard) => {
      shard.updateWorldMatrix(true, false);
      point.setFromMatrixPosition(shard.matrixWorld);
      const projected = projectWorldToScreen(point, viewportWidth, viewportHeight);
      if (projected.z >= -1 && projected.z <= 1) {
        drawAsciiPoint(cells, intensity, columns, rows, cellWidth, cellHeight, projected.x, projected.y, asciiX, 0.62);
      }
    });

    const particlePositionsAttribute = particleGeometry.getAttribute("position");
    particles.updateWorldMatrix(true, false);
    for (let index = 0; index < particlePositionsAttribute.count; index += 3) {
      point.fromBufferAttribute(particlePositionsAttribute, index).applyMatrix4(particles.matrixWorld);
      const projected = projectWorldToScreen(point, viewportWidth, viewportHeight);
      if (projected.z >= -1 && projected.z <= 1) {
        drawAsciiPoint(cells, intensity, columns, rows, cellWidth, cellHeight, projected.x, projected.y, asciiX, 0.28);
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
    asciiContext.fillRect(asciiX, 0, asciiWidth, viewportHeight);

    asciiContext.save();
    asciiContext.beginPath();
    asciiContext.rect(asciiX, 0, asciiWidth, viewportHeight);
    asciiContext.clip();
    asciiContext.font = `${Math.max(10, cellHeight * 0.86)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
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

        const level = Math.min(1, intensity[index]);
        asciiContext.fillStyle =
          level > 1.1 ? "rgba(255, 207, 90, 0.94)" : level > 0.64 ? "rgba(87, 213, 255, 0.86)" : "rgba(191, 239, 255, 0.58)";
        const characterX = asciiX + column * cellWidth + cellWidth * 0.5;
        let fade = 1;
        if (softness > 0) {
          if (settings.asciiSide === "right" && characterX < split) {
            fade = clampNumber((characterX - asciiFadeStart) / Math.max(1, asciiFadeEnd - asciiFadeStart), 0, 1);
          }

          if (settings.asciiSide === "left" && characterX > split) {
            fade = clampNumber((asciiFadeStart - characterX) / Math.max(1, asciiFadeStart - asciiFadeEnd), 0, 1);
          }
        }

        asciiContext.globalAlpha = fade;
        asciiContext.fillText(character, characterX, row * cellHeight + cellHeight * 0.55);
      }
    }

    asciiContext.globalAlpha = 1;
    asciiContext.restore();

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
    renderNormalSide();
    renderAsciiLayer(time, reduceMotion);
  }

  function animate(time: number) {
    if (disposed) {
      return;
    }

    if (!paused) {
      renderFrame(time);
    }

    if (!reduceMotion) {
      frameId = window.requestAnimationFrame(animate);
    }
  }

  function handleVisibilityChange() {
    paused = document.visibilityState === "hidden";
    if (!paused && !reduceMotion) {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(animate);
    }
  }

  resizeObserver.observe(container);
  setAsciiCanvasSize(width, height);
  document.addEventListener("visibilitychange", handleVisibilityChange);

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
    if (activeScenes.has(container)) {
      return;
    }

    createHeroThreeScene(container)
      .then((controller) => {
        if (controller) {
          activeScenes.set(container, controller);
        }
      })
      .catch((error) => {
        console.warn("Hero Three.js scene failed to initialize.", error);
        container.dataset.sceneState = "fallback";
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
  });
}
