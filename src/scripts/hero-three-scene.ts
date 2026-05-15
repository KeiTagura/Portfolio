import type { BufferGeometry, Material, Mesh, Points } from "three";

type HeroThreeController = {
  destroy: () => void;
};

type HeroThreeSettings = {
  mode: string;
  modelUrl: string;
  asciiSide: "left" | "right";
  splitPosition: number;
  asciiResolution: number;
  enablePointerParallax: boolean;
  maxPixelRatio: number;
  disableOnMobile: boolean;
};

const activeScenes = new WeakMap<HTMLElement, HeroThreeController>();

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSettings(container: HTMLElement): HeroThreeSettings {
  return {
    mode: container.dataset.mode ?? "three-ascii-split",
    modelUrl: container.dataset.modelUrl ?? "",
    asciiSide: container.dataset.asciiSide === "left" ? "left" : "right",
    splitPosition: parseNumber(container.dataset.splitPosition ?? null, 0.5),
    asciiResolution: parseNumber(container.dataset.asciiResolution ?? null, 96),
    enablePointerParallax: container.dataset.pointerParallax === "true",
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
  const allowPointerParallax =
    settings.enablePointerParallax && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (shouldSkipForMobile(settings) || !hasWebGLSupport()) {
    container.dataset.sceneState = "fallback";
    return null;
  }

  const THREE = await import("three");
  const bounds = container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
  renderer.setSize(width, height, false);
  renderer.domElement.className = "hero-three-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
  camera.position.set(0, 0.55, 7.2);

  const root = new THREE.Group();
  root.position.set(1.35, 0.05, 0);
  scene.add(root);

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

  let pointerX = 0;
  let pointerY = 0;
  let frameId = 0;
  let disposed = false;
  let paused = document.visibilityState === "hidden";

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
    renderer.render(scene, camera);
  });

  function handlePointerMove(event: PointerEvent) {
    if (!allowPointerParallax) {
      return;
    }

    const rect = container.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function renderFrame(time: number) {
    const seconds = time * 0.001;
    const speed = reduceMotion ? 0 : 1;
    const float = reduceMotion ? 0 : Math.sin(seconds * 0.75) * 0.075;
    const pulse = reduceMotion ? 1 : 1 + Math.sin(seconds * 1.15) * 0.035;

    root.position.y = 0.05 + float;
    root.rotation.y = seconds * 0.16 * speed + pointerX * 0.1;
    root.rotation.x = -0.08 + pointerY * 0.06;
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

    renderer.render(scene, camera);
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
  container.addEventListener("pointermove", handlePointerMove, { passive: true });
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
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

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
