import type { Mesh } from "three";

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
  const asciiSide = container.dataset.asciiSide === "left" ? "left" : "right";

  return {
    mode: container.dataset.mode ?? "three-ascii-split",
    modelUrl: container.dataset.modelUrl ?? "",
    asciiSide,
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
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0.6, 6.8);

  const group = new THREE.Group();
  scene.add(group);

  const normalMaterial = new THREE.MeshStandardMaterial({
    color: 0x57d5ff,
    emissive: 0x0c526a,
    emissiveIntensity: 0.28,
    metalness: 0.42,
    roughness: 0.36,
    flatShading: true,
  });

  const asciiPreviewMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcf5a,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
  });

  const coreGeometry = new THREE.IcosahedronGeometry(1.35, 1);
  const core = new THREE.Mesh(coreGeometry, normalMaterial);
  core.position.x = settings.asciiSide === "right" ? -0.42 : 0.42;
  group.add(core);

  const wire = new THREE.Mesh(coreGeometry.clone(), asciiPreviewMaterial);
  wire.scale.setScalar(1.08);
  wire.position.x = settings.asciiSide === "right" ? 0.55 : -0.55;
  group.add(wire);

  const splitMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
  });
  const splitGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -1.9, 0),
    new THREE.Vector3(0, 1.9, 0),
  ]);
  const splitLine = new THREE.Line(splitGeometry, splitMaterial);
  splitLine.position.x = (settings.splitPosition - 0.5) * 2.4;
  group.add(splitLine);

  const shardMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6f91,
    emissive: 0x4c1224,
    emissiveIntensity: 0.24,
    roughness: 0.55,
    metalness: 0.18,
    flatShading: true,
  });
  const shardGeometry = new THREE.TetrahedronGeometry(0.18, 0);
  const shards: Mesh[] = [];

  for (let index = 0; index < 18; index += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    const angle = (index / 18) * Math.PI * 2;
    const radius = 2.0 + (index % 4) * 0.22;
    shard.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 0.78, Math.sin(angle) * 0.9);
    shard.rotation.set(angle, angle * 0.4, angle * 0.8);
    shards.push(shard);
    group.add(shard);
  }

  const asciiDotMaterial = new THREE.PointsMaterial({
    color: 0xffcf5a,
    size: Math.max(0.025, 1 / settings.asciiResolution * 2.8),
    transparent: true,
    opacity: 0.55,
  });
  const asciiDotGeometry = new THREE.BufferGeometry();
  const dotPositions: number[] = [];
  for (let index = 0; index < 90; index += 1) {
    const angle = index * 0.48;
    const radius = 1.15 + (index % 9) * 0.025;
    dotPositions.push(
      (settings.asciiSide === "right" ? 0.72 : -0.72) + Math.cos(angle) * radius * 0.38,
      Math.sin(angle * 1.8) * 1.15,
      Math.sin(angle) * radius * 0.34,
    );
  }
  asciiDotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
  const asciiDots = new THREE.Points(asciiDotGeometry, asciiDotMaterial);
  group.add(asciiDots);

  const ambient = new THREE.AmbientLight(0x9fb8c8, 1.15);
  const key = new THREE.DirectionalLight(0x57d5ff, 2.4);
  key.position.set(-2.8, 3.2, 4.6);
  const rim = new THREE.DirectionalLight(0xffcf5a, 1.8);
  rim.position.set(3, -1.2, 2.2);
  scene.add(ambient, key, rim);

  let pointerX = 0;
  let pointerY = 0;
  let frameId = 0;
  let disposed = false;

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
  });

  function handlePointerMove(event: PointerEvent) {
    if (!settings.enablePointerParallax) {
      return;
    }

    const rect = container.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  }

  function animate(time: number) {
    if (disposed) {
      return;
    }

    const seconds = time * 0.001;
    group.rotation.y = seconds * 0.22 + pointerX * 0.14;
    group.rotation.x = -0.08 + pointerY * 0.08;
    core.rotation.y = seconds * 0.38;
    wire.rotation.y = -seconds * 0.28;
    asciiDots.rotation.y = seconds * 0.18;

    shards.forEach((shard, index) => {
      shard.rotation.x += 0.004 + index * 0.0001;
      shard.rotation.y += 0.006;
    });

    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(animate);
  }

  resizeObserver.observe(container);
  container.addEventListener("pointermove", handlePointerMove, { passive: true });
  frameId = window.requestAnimationFrame(animate);
  container.dataset.sceneState = "ready";

  return {
    destroy() {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);

      coreGeometry.dispose();
      wire.geometry.dispose();
      splitGeometry.dispose();
      shardGeometry.dispose();
      asciiDotGeometry.dispose();
      normalMaterial.dispose();
      asciiPreviewMaterial.dispose();
      splitMaterial.dispose();
      shardMaterial.dispose();
      asciiDotMaterial.dispose();
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
