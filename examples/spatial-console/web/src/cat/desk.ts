import * as THREE from "three";
import { DrawableSurface, asDrawable } from "../html-in-canvas";
import { elementToCanvasMatrix, multiply, transformPoint } from "../projection";
import { untransformPoint, viewportToTrackpadUV } from "./trackpad";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { KEY_CELLS, KEYBOARD_ROWS, KEYBOARD_WIDTH_UNITS, keyCell, pawForCode, type Paw } from "./keyboard-layout";
import { TaperedTube, contactShadowTexture, flatSlab, roundedRect, slab, woodPlan, woodTexture } from "./art";
import { Wobble, clampToReach, pressAgainst } from "./reach";

// World units: 1 = 10 cm. The laptop sits at the origin with its keyboard
// facing the camera (+z); the typist — the cat — is behind the camera side.

const LAPTOP = { width: 3.1, depth: 2.15, thickness: 0.08 };
const KEY_UNIT = 0.178;
const KEY_SIZE = 0.155;
const KEYBOARD_BACK_Z = -0.92;
const TABLET = { width: 1.46, depth: 1.98 };
const PHONE = { width: 0.74, depth: 1.5 };
const TRACKPAD = { width: 1.15, depth: 0.72, centerZ: 0.6 };
const PAW_HOVER = 0.28;
const SLAP_MS = 150;
// The cat is modelled at head radius 0.72 and drawn at CAT_SCALE, which puts
// its head near a real cat's ~11 cm. It sits back from the laptop so that its
// head stays below the main camera's line of sight to the trackpad.
const CAT_SCALE = 0.75;
const CAT_Z = 2.9;
// Arms are poles, as in the reference gif: pinned at the armpit and the
// wrist, no elbow, and they stretch to wherever the paw goes. The white sock
// at the wrist keeps its length; only the black pole stretches.
const SOCK_LENGTH = 0.3;
// The mug: a paw stops against its wall (rim radius plus a paw) and can reach
// anywhere within CUP_REACH of it, past the keyboard's back line.
const CUP_CONTACT = 0.36 + 0.1;
const CUP_REACH = 0.85;
// A bat at the saucer rocks the mug toward, but never past, MUG_MAX_TILT.
const MUG_MAX_TILT = 0.5;
const MUG_TIP_SPEED = 3.4;
const WOOD_SEED = 20260922;

/** Unlit, colour-exact material for a drawn DOM snapshot (see scene.ts). */
function screenMaterial(map: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      varying vec2 vUv;
      void main() { gl_FragColor = texture2D(map, vUv); }
    `,
    toneMapped: false,
  });
}

interface Screen {
  element: HTMLIFrameElement;
  surface: DrawableSurface;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  size: { width: number; height: number };
  matrix: number[];
}

interface PawState {
  side: "left" | "right";
  rest: THREE.Vector3;
  target: THREE.Vector3;
  position: THREE.Vector3;
  slapStart: number;
  /** Smoothed height above the surface, so changing rest spots never pops. */
  hover: number;
  /** The paw; its position is the wrist the arm solves to. */
  mesh: THREE.Group;
  arm: { pole: THREE.Mesh; sock: THREE.Mesh; armpit: THREE.Mesh };
  localShoulder: THREE.Vector3;
  shoulder: THREE.Vector3;
}

/** Which device the cat is attending to: the last one input came through. */
export type Device = "laptop" | "tablet" | "phone";
export type PawMode = "keys" | "trackpad" | "tablet" | "phone";

export interface Desk {
  /**
   * Wire keyboard and pointer listeners on the desk's window, or on a device
   * frame's window when `frame` is given (input inside a frame never reaches
   * the desk's window).
   */
  listen(win: Window, frame?: HTMLIFrameElement): void;
  screenToWindow(element: HTMLIFrameElement, x: number, y: number): { x: number; y: number };
  debug: {
    pawWorld(side: "left" | "right"): { x: number; y: number; z: number };
    pawScreen(side: "left" | "right"): { x: number; y: number };
    keyWorld(code: string): { x: number; y: number; z: number } | null;
    trackpadWorld(u: number, v: number): { x: number; y: number; z: number };
    trackpadUV(): { u: number; v: number };
    screenPoint(element: HTMLIFrameElement, ex: number, ey: number): { x: number; y: number };
    /** World point on a device screen for an element-px point on it. */
    screenWorld(element: HTMLIFrameElement, ex: number, ey: number): { x: number; y: number; z: number };
    uploads(): Record<string, number>;
    lastSlap(): { code: string; paw: Paw; at: number } | null;
    /** The last tap on a tablet or phone screen, in that screen's element px. */
    lastTap(): { device: Device; paw: "left" | "right"; x: number; y: number; at: number } | null;
    attention(): Device;
    /** Smoothed lean: -1 fully toward the tablet, +1 toward the phone. */
    lean(): number;
    pawMode(side: "left" | "right"): PawMode;
    catWorld(): { x: number; y: number; z: number };
    /** Where paws may reach: a top-down box, plus a disc around the mug. */
    reach(): { minX: number; maxX: number; minZ: number; maxZ: number; cup: { x: number; z: number; r: number } };
    /** The mug: its centre, its tilt and the coffee's slosh (radians), its spin. */
    cup(): { x: number; z: number; tilt: number; slosh: number; spin: number; contact: number };
    /** Window px for a world point. */
    project(x: number, y: number, z: number): { x: number; y: number };
    /** The paw's current scroll stroke, element px; decays to 0. */
    scrollStroke(): number;
    /**
     * The arm this frame: its length armpit-to-wrist, and how far its root and
     * tip sit from the live shoulder socket and the paw (both pinned, so 0).
     */
    arm(side: "left" | "right"): { length: number; socketGap: number; wristGap: number };
  };
}

export function createDesk(canvas: HTMLCanvasElement, screens: {
  laptop: HTMLIFrameElement;
  tablet: HTMLIFrameElement;
  phone: HTMLIFrameElement;
}): Desk {
  const drawable = asDrawable(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Lit surfaces are tone mapped; the device screens opt out (screenMaterial)
  // so the DOM they show keeps its exact colours.
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const gl = renderer.getContext() as WebGL2RenderingContext;

  const scene = new THREE.Scene();
  const backdrop = new THREE.Color(0x2e2824);
  scene.background = backdrop;
  // The desk fades into the backdrop instead of ending at a hard edge.
  scene.fog = new THREE.Fog(backdrop, 7, 16);
  // Something for metal and glass to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.4;
  pmrem.dispose();

  // Over the typist's shoulder, looking down at the desk (reference photo).
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0.25, 5.2, 5.6);
  camera.lookAt(0, 0.55, -0.7);
  // `?view=side|front|top` inspects the cat's modelling from other angles;
  // input still works because hit testing follows whatever camera renders.
  const INSPECT_VIEWS: Record<string, [THREE.Vector3Tuple, THREE.Vector3Tuple]> = {
    side: [[6.5, 1.4, 1.2], [0, 0.7, 1.2]],
    front: [[2.6, 1.8, -1.6], [0, 0.9, 1.6]],
    top: [[0.05, 8, 1.6], [0.05, 0, 1.2]],
  };
  const inspect = INSPECT_VIEWS[new URLSearchParams(location.search).get("view") ?? ""];
  if (inspect) {
    camera.position.set(...inspect[0]);
    camera.lookAt(...inspect[1]);
  }

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x4a3b2e, 0.35));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
  sun.position.set(-4, 9, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // Framed to the visible desk so the map's texels are not spent off-screen.
  sun.shadow.camera.left = -6.5;
  sun.shadow.camera.right = 6.5;
  sun.shadow.camera.top = 6.5;
  sun.shadow.camera.bottom = -6.5;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 22;
  sun.shadow.radius = 4;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  // Cool rim from beyond the laptop: from over the cat's shoulder this is
  // what separates its dark fur from the desk.
  const rim = new THREE.DirectionalLight(0xbcd4ff, 1.1);
  rim.position.set(1.5, 3.5, -5);
  scene.add(rim);

  const wood = woodTexture(woodPlan(WOOD_SEED, 9));
  wood.repeat.set(2, 1.5);
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 20),
    new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 0.5, roughness: 0.62 }),
  );
  desk.rotation.x = -Math.PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  // Soft darkening where objects meet the desk; the shadow map alone leaves
  // flat objects looking like they float.
  const shadowTex = contactShadowTexture();
  const contactShadow = (parent: THREE.Object3D, width: number, depth: number, opacity: number, y = 0.003) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowTex, transparent: true, opacity, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y;
    m.renderOrder = -1;
    parent.add(m);
    return m;
  };

  const aluminium = new THREE.MeshStandardMaterial({ color: 0xd4d6da, metalness: 0.9, roughness: 0.32 });
  const darkAluminium = new THREE.MeshStandardMaterial({ color: 0x8e9196, metalness: 0.9, roughness: 0.4 });
  const blackGlass = new THREE.MeshPhysicalMaterial({ color: 0x08080a, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  const keycap = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.55 });
  const castAndReceive = <T extends THREE.Object3D>(o: T): T => {
    o.castShadow = o.receiveShadow = true;
    return o;
  };

  // --- laptop -------------------------------------------------------------
  const laptop = new THREE.Group();
  scene.add(laptop);
  const base = castAndReceive(new THREE.Mesh(flatSlab(LAPTOP.width, LAPTOP.depth, LAPTOP.thickness, 0.12, 0.025), aluminium));
  base.position.y = LAPTOP.thickness / 2;
  laptop.add(base);
  contactShadow(laptop, LAPTOP.width + 0.5, LAPTOP.depth + 0.5, 0.55);

  // The keys sit in a darker well, as on the reference machine.
  const keyWell = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRect(KEYBOARD_WIDTH_UNITS * KEY_UNIT + 0.08, KEYBOARD_ROWS * KEY_UNIT + 0.06, 0.03)),
    new THREE.MeshStandardMaterial({ color: 0x2b2c30, roughness: 0.6 }),
  );
  keyWell.rotation.x = -Math.PI / 2;
  keyWell.position.set(0, LAPTOP.thickness + 0.001, KEYBOARD_BACK_Z + (KEYBOARD_ROWS * KEY_UNIT) / 2);
  keyWell.receiveShadow = true;
  laptop.add(keyWell);

  const keyTopY = LAPTOP.thickness + 0.02;
  const keyToWorld = (code: string) => {
    const cell = keyCell(code);
    if (!cell) return null;
    const x = (cell.x - KEYBOARD_WIDTH_UNITS / 2) * KEY_UNIT;
    const z = KEYBOARD_BACK_Z + cell.row * KEY_UNIT + KEY_UNIT / 2;
    return new THREE.Vector3(x, keyTopY, z);
  };
  const cells = [...KEY_CELLS.values()].filter((c) => c.code !== "ArrowDown");
  const keys = new THREE.InstancedMesh(new RoundedBoxGeometry(KEY_SIZE, 0.03, KEY_SIZE, 2, 0.012), keycap, cells.length);
  const keyIndex = new Map<string, number>();
  const keyMatrix = (i: number, depress: number) => {
    const cell = cells[i];
    const p = keyToWorld(cell.code)!;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(p.x, keyTopY - 0.015 - depress, p.z),
      new THREE.Quaternion(),
      new THREE.Vector3(
        (cell.width * KEY_UNIT - (KEY_UNIT - KEY_SIZE)) / KEY_SIZE,
        1,
        cell.code.startsWith("Arrow") ? KEY_SIZE * 0.9 : 1,
      ),
    );
    keys.setMatrixAt(i, m);
  };
  cells.forEach((cell, i) => {
    keyIndex.set(cell.code, i);
    keyMatrix(i, 0);
  });
  keyIndex.set("ArrowDown", keyIndex.get("ArrowUp")!);
  keys.castShadow = true;
  keys.receiveShadow = true;
  laptop.add(keys);

  const trackpad = new THREE.Mesh(
    flatSlab(TRACKPAD.width, TRACKPAD.depth, 0.006, 0.06, 0.002),
    new THREE.MeshStandardMaterial({ color: 0xa9acb2, metalness: 0.5, roughness: 0.28 }),
  );
  trackpad.position.set(0, LAPTOP.thickness + 0.001, TRACKPAD.centerZ);
  trackpad.receiveShadow = true;
  laptop.add(trackpad);

  const hingeBarrel = castAndReceive(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, LAPTOP.width - 0.7, 24), darkAluminium));
  hingeBarrel.rotation.z = Math.PI / 2;
  hingeBarrel.position.set(0, LAPTOP.thickness, -LAPTOP.depth / 2 + 0.01);
  laptop.add(hingeBarrel);

  // Lid hinged on the base's back edge, opened ~110 degrees.
  const hinge = new THREE.Group();
  hinge.position.set(0, LAPTOP.thickness, -LAPTOP.depth / 2);
  hinge.rotation.x = -0.33;
  laptop.add(hinge);
  const lidHeight = 2.05;
  const lid = castAndReceive(new THREE.Mesh(slab(LAPTOP.width, lidHeight, 0.05, 0.12, 0.018), aluminium));
  lid.position.set(0, lidHeight / 2, -0.025);
  hinge.add(lid);
  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(LAPTOP.width - 0.06, lidHeight - 0.06, 0.1)), blackGlass);
  bezel.position.set(0, lidHeight / 2, 0.001);
  hinge.add(bezel);
  const webcam = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), new THREE.MeshStandardMaterial({ color: 0x1d2530, roughness: 0.2 }));
  webcam.position.set(0, lidHeight - 0.075, 0.002);
  hinge.add(webcam);

  // --- tablet and phone, lying flat: aluminium body, black glass face ------
  const handheld = (width: number, depth: number, thickness: number, corner: number) => {
    const group = new THREE.Group();
    const body = castAndReceive(new THREE.Mesh(flatSlab(width, depth, thickness - 0.006, corner, 0.02), aluminium));
    body.position.y = (thickness - 0.006) / 2;
    const face = new THREE.Mesh(flatSlab(width - 0.02, depth - 0.02, 0.006, corner - 0.01, 0.002), blackGlass);
    face.position.y = thickness - 0.003;
    face.receiveShadow = true;
    group.add(body, face);
    contactShadow(group, width + 0.35, depth + 0.35, 0.5);
    scene.add(group);
    return group;
  };
  const tablet = handheld(TABLET.width, TABLET.depth, 0.07, 0.13);
  tablet.position.set(-2.95, 0, 0.35);
  tablet.rotation.y = 0.38;
  const phone = handheld(PHONE.width, PHONE.depth, 0.06, 0.1);
  phone.position.set(2.75, 0, 0.3);
  phone.rotation.y = -0.28;

  // --- coffee, because the reference has coffee ---------------------------
  const cup = new THREE.Group();
  cup.position.set(-2.3, 0, -1.75);
  cup.rotation.y = -0.6;
  scene.add(cup);
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xf7f5f0, roughness: 0.25, clearcoat: 0.6 });
  const lathe = (points: [number, number][]) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  const saucer = castAndReceive(new THREE.Mesh(
    lathe([[0, 0], [0.45, 0], [0.5, 0.02], [0.62, 0.05], [0.64, 0.07], [0.6, 0.07], [0.48, 0.045], [0.3, 0.035], [0, 0.035]]),
    porcelain,
  ));
  // A closed profile: out along the outside, back down the inside, so the
  // mug has a wall and a floor.
  const mug = castAndReceive(new THREE.Mesh(
    lathe([[0, 0], [0.27, 0], [0.295, 0.015], [0.33, 0.3], [0.36, 0.55], [0.36, 0.56], [0.335, 0.56], [0.31, 0.3], [0.28, 0.06], [0, 0.06]]),
    porcelain,
  ));
  mug.position.y = 0.035;
  const handle = castAndReceive(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 12, 32, Math.PI), porcelain));
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(0.335, 0.33, 0);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.328, 48), new THREE.MeshPhysicalMaterial({ color: 0x1f130b, roughness: 0.1, clearcoat: 1 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.52;
  cup.add(saucer);
  contactShadow(cup, 1.6, 1.6, 0.5);
  // The mug rocks on its base rim in a world-aligned rig; it spins inside it,
  // and the coffee stays in the rig (a disc does not care about spin).
  const mugRig = new THREE.Group();
  mugRig.position.copy(cup.position);
  scene.add(mugRig);
  const mugSpin = new THREE.Group();
  mugSpin.rotation.y = cup.rotation.y;
  mugSpin.add(mug, handle);
  mugRig.add(mugSpin, coffee);

  // --- notebook and pencil, to balance the cup ------------------------------
  const notebook = new THREE.Group();
  notebook.position.set(2.6, 0, -1.9);
  notebook.rotation.y = 0.3;
  scene.add(notebook);
  const cover = castAndReceive(new THREE.Mesh(flatSlab(1.15, 1.55, 0.07, 0.04, 0.012), new THREE.MeshStandardMaterial({ color: 0x9b7650, roughness: 0.9 })));
  cover.position.y = 0.035;
  const band = castAndReceive(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.074, 1.56), new THREE.MeshStandardMaterial({ color: 0x2a2522, roughness: 0.7 })));
  band.position.set(0.42, 0.037, 0);
  notebook.add(cover, band);
  contactShadow(notebook, 1.5, 1.9, 0.45);
  const pencil = new THREE.Group();
  pencil.position.set(2.0, 0.028, -1.2);
  pencil.rotation.y = 1.15;
  scene.add(pencil);
  const along = (m: THREE.Mesh, x: number) => {
    m.rotation.z = -Math.PI / 2;
    m.position.x = x;
    m.castShadow = true;
    pencil.add(m);
  };
  along(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.0, 6), new THREE.MeshStandardMaterial({ color: 0xe0a93b, roughness: 0.5 })), 0);
  along(new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0xd9b48a, roughness: 0.8 })), 0.56);
  along(new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.06, 16), darkAluminium), -0.53);
  along(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.07, 16), new THREE.MeshStandardMaterial({ color: 0xe58f94, roughness: 0.8 })), -0.59);
  contactShadow(pencil, 1.3, 0.16, 0.35, -0.025);

  // --- screens (live iframes) ---------------------------------------------
  const makeScreen = (element: HTMLIFrameElement, width: number, place: (plane: THREE.Mesh) => void): Screen => {
    const size = { width: element.offsetWidth, height: element.offsetHeight };
    const surface = new DrawableSurface(canvas, gl, element);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, width * (size.height / size.width)),
      screenMaterial(new THREE.ExternalTexture(surface.texture)),
    );
    mesh.visible = false;
    place(mesh);
    return { element, surface, mesh, size, matrix: [] };
  };
  const all: Screen[] = [
    makeScreen(screens.laptop, 2.8, (plane) => {
      plane.position.set(0, lidHeight / 2 + 0.03, 0.003);
      hinge.add(plane);
    }),
    makeScreen(screens.tablet, 1.3, (plane) => {
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.072;
      tablet.add(plane);
    }),
    makeScreen(screens.phone, 0.63, (plane) => {
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = 0.062;
      phone.add(plane);
    }),
  ];

  // --- the cat --------------------------------------------------------------
  // Near-black fur needs sheen to show its form; pure black reads as a hole.
  const fur = new THREE.MeshPhysicalMaterial({
    color: 0x161519,
    roughness: 0.8,
    sheen: 0.4,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0x46434f),
    envMapIntensity: 0.4,
  });
  const whiteFur = new THREE.MeshPhysicalMaterial({ color: 0xf1ede6, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) });
  const pink = new THREE.MeshStandardMaterial({ color: 0xd99aa0, roughness: 0.7 });
  const furMesh = (geometry: THREE.BufferGeometry, material: THREE.Material = fur) => castAndReceive(new THREE.Mesh(geometry, material));

  const cat = new THREE.Group();
  cat.scale.setScalar(CAT_SCALE);
  cat.position.set(0.05, 0, CAT_Z);
  scene.add(cat);
  contactShadow(cat, 3.0, 3.2, 0.6, 0.004 / CAT_SCALE).position.z = 0.5;

  // Seated upright, as in the reference: haunches at the back, a torso rising
  // to a near-vertical chest, the head on top of the chest, and the shoulders
  // at the front of the chest below the chin, where a cat's forelegs start.
  const body = furMesh(new THREE.SphereGeometry(0.9, 40, 28));
  body.scale.set(0.95, 0.95, 1.05);
  body.position.set(0, 0.8, 0.45);
  cat.add(body);
  for (const side of [-1, 1]) {
    const haunch = furMesh(new THREE.SphereGeometry(0.55, 28, 20));
    haunch.scale.set(0.85, 0.85, 1.25);
    haunch.position.set(side * 0.55, 0.42, 0.75);
    cat.add(haunch);
  }
  // Chest: the shoulders sit inside it, so the arms' roots stay buried
  // however far the cat leans.
  const chest = furMesh(new THREE.SphereGeometry(0.6, 32, 20));
  chest.scale.set(1.05, 1.2, 0.9);
  chest.position.set(0, 0.95, -0.35);
  cat.add(chest);
  const ruff = furMesh(new THREE.SphereGeometry(0.45, 28, 20));
  ruff.scale.set(1.2, 0.8, 1);
  ruff.position.set(0, 1.45, -0.2);
  cat.add(ruff);
  // A tuxedo cat: white bib down the chest and a white muzzle.
  const bib = furMesh(new THREE.SphereGeometry(0.45, 24, 16), whiteFur);
  bib.scale.set(0.9, 1.1, 0.6);
  bib.position.set(0, 1.0, -0.68);
  cat.add(bib);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.75, -0.4);
  cat.add(headGroup);
  const head = furMesh(new THREE.SphereGeometry(0.6, 40, 28));
  head.scale.set(1.12, 0.95, 0.95);
  headGroup.add(head);
  const muzzle = furMesh(new THREE.SphereGeometry(0.24, 24, 16), whiteFur);
  muzzle.scale.set(1.25, 0.8, 0.75);
  muzzle.position.set(0, -0.18, -0.5);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), pink);
  nose.position.set(0, -0.08, -0.66);
  headGroup.add(muzzle, nose);
  const ears: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const cheek = furMesh(new THREE.SphereGeometry(0.3, 24, 16));
    cheek.scale.set(1, 0.85, 0.9);
    cheek.position.set(side * 0.36, -0.16, -0.2);
    headGroup.add(cheek);
    // Ears ride on the head so they follow its tilt and turn.
    const ear = new THREE.Group();
    ear.position.set(side * 0.36, 0.42, -0.02);
    ear.rotation.set(-0.12, 0, side * -0.3);
    const outer = furMesh(new THREE.ConeGeometry(0.24, 0.5, 24).scale(1, 1, 0.45));
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 24).scale(1, 1, 0.3), pink);
    inner.position.set(0, -0.04, -0.06);
    ear.add(outer, inner);
    headGroup.add(ear);
    ears.push(ear);
  }

  // Tail: curls from behind the cat round its right side and forward onto
  // the desk, where the camera can see it (the desk behind the cat is below
  // the frame); it sways, and a key mash makes it flick.
  const tail = new TaperedTube(40, 12);
  const tailMesh = furMesh(tail.geometry);
  const tailTip = furMesh(new THREE.SphereGeometry(1, 16, 12));
  cat.add(tailMesh, tailTip);
  const TAIL_REST = [
    new THREE.Vector3(0, 0.3, 1.3),
    new THREE.Vector3(0.8, 0.13, 1.9),
    new THREE.Vector3(1.45, 0.13, 1.2),
    new THREE.Vector3(1.5, 0.13, 0.4),
    new THREE.Vector3(1.3, 0.14, -0.2),
    new THREE.Vector3(0.95, 0.16, -0.45),
  ];
  const tailCurve = new THREE.CatmullRomCurve3(TAIL_REST.map((p) => p.clone()));
  const TAIL_TIP_RADIUS = 0.075;
  const poseTail = (seconds: number, flick: number) => {
    const speed = 1 + flick * 2.5;
    TAIL_REST.forEach((rest, i) => {
      const weight = i / (TAIL_REST.length - 1);
      const phase = seconds * 1.3 * speed + i * 0.8;
      tailCurve.points[i].set(
        rest.x + Math.sin(phase) * 0.14 * weight,
        rest.y + (i === TAIL_REST.length - 1 ? Math.max(0, Math.sin(seconds * 0.9)) * 0.22 + flick * 0.25 : 0),
        rest.z + Math.cos(phase) * 0.1 * weight,
      );
    });
    tailCurve.updateArcLengths();
    tail.update(tailCurve, (u) => 0.13 + (TAIL_TIP_RADIUS - 0.13) * u);
    tailCurve.getPointAt(1, tailTip.position);
    tailTip.scale.setScalar(TAIL_TIP_RADIUS);
  };

  // Shoulders are in the cat's frame, so they travel with a lean.
  const catShoulder = (side: number) => new THREE.Vector3(side * 0.4, 1.0, -0.5);
  const makePaw = (side: "left" | "right"): PawState => {
    const sign = side === "left" ? -1 : 1;
    const restKey = side === "left" ? "KeyF" : "KeyJ";
    // Targets are contact points on a surface; the pose adds the hover height.
    const rest = keyToWorld(restKey)!.add(new THREE.Vector3(0, 0, 0.1));
    // The paw: a pad with four toes along its front edge.
    const mesh = new THREE.Group();
    const pad = furMesh(new THREE.SphereGeometry(0.15, 24, 16), whiteFur);
    pad.scale.set(1, 0.6, 1.2);
    mesh.add(pad);
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.42;
      const toe = furMesh(new THREE.SphereGeometry(0.052, 12, 10), whiteFur);
      toe.scale.set(1, 0.8, 1);
      toe.position.set(Math.sin(a) * 0.12, 0.012, -Math.cos(a) * 0.15);
      mesh.add(toe);
    }
    // The pole tapers from armpit to sock; cylinders are unit height, scaled
    // to length each frame.
    const bone = (bottom: number, top: number, material: THREE.Material = fur) =>
      furMesh(new THREE.CylinderGeometry(top, bottom, 1, 18, 1, true), material);
    const pole = bone(0.13, 0.1);
    const sock = bone(0.1, 0.092, whiteFur);
    const armpit = furMesh(new THREE.SphereGeometry(0.13, 18, 12));
    scene.add(mesh, pole, sock, armpit);
    return {
      side,
      rest,
      target: rest.clone(),
      position: rest.clone(),
      slapStart: -Infinity,
      hover: PAW_HOVER,
      mesh,
      arm: { pole, sock, armpit },
      localShoulder: catShoulder(sign),
      shoulder: cat.localToWorld(catShoulder(sign)),
    };
  };
  const paws = { left: makePaw("left"), right: makePaw("right") };

  // --- input -> puppet ------------------------------------------------------
  let lastSlap: { code: string; paw: Paw; at: number } | null = null;
  let lastTap: { device: Device; paw: "left" | "right"; x: number; y: number; at: number } | null = null;
  let lastPointerAt = -Infinity;
  let lastRightKeyAt = -Infinity;
  const trackpadUV = new THREE.Vector2(0.5, 0.5);
  const keyDepress = new Map<number, number>();
  // The tablet is on the cat's left, so the left paw works it; the phone is
  // on the right, so the right paw does.
  let attention: Device = "laptop";
  let lean = 0;
  const deviceOf = (frame?: HTMLIFrameElement): Device =>
    frame === screens.tablet ? "tablet" : frame === screens.phone ? "phone" : "laptop";
  const pawFor = (device: "tablet" | "phone") => (device === "tablet" ? paws.left : paws.right);
  // Where each handheld's paw last hovered or tapped, in screen element px.
  const hoverAt: Record<"tablet" | "phone", { x: number; y: number } | null> = { tablet: null, phone: null };
  const screenFor = (device: Device) => all.find((s) => s.element === screens[device])!;

  // How far a paw reaches, as a top-down box around the scene: from the back
  // row of keys (so a paw never pushes into the lid) to the back of the cat,
  // and out to the outermost corners of the tablet and phone; plus a disc
  // around the mug, so it can just be reached. A pointer dragged off a
  // screen's edge pins the paw at the edge of that region.
  const outermostX = (device: THREE.Group, size: { width: number; depth: number }, side: number) => {
    device.updateMatrixWorld(true);
    const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.Vector3((sx * size.width) / 2, 0, (sz * size.depth) / 2)));
    return side * Math.max(...corners.map((c) => side * c.applyMatrix4(device.matrixWorld).x));
  };
  cat.updateMatrixWorld(true);
  const REACH = {
    minX: outermostX(tablet, TABLET, -1),
    maxX: outermostX(phone, PHONE, 1),
    minZ: KEYBOARD_BACK_Z,
    maxZ: new THREE.Box3().setFromObject(body).max.z,
  };
  const cupDisc = { x: cup.position.x, z: cup.position.z, r: CUP_REACH };

  // The mug. A paw pressing into it bumps it (it leans away, by how hard) and
  // spins it a little by which side it was hit; a bat at the saucer rocks it
  // on its rim to the edge of tipping. The coffee lags the mug, so it sloshes.
  const mugTilt = new Wobble(40, 3, MUG_MAX_TILT);
  const slosh = new Wobble(110, 2.2, 0.14);
  let mugSpinSpeed = 0;
  let pressing = false;
  const bump = { x: 0, z: 0 };
  // A click (or a drag) on the mug or saucer: the left paw goes there; a
  // click also knocks the mug when the paw arrives.
  let cupPoke: { point: THREE.Vector3; until: number; knock: boolean } | null = null;
  const raycaster = new THREE.Raycaster();
  const cupHit = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1), camera);
    return raycaster.intersectObjects([saucer, mug, handle, coffee], false)[0]?.point ?? null;
  };
  const pokeCup = (at: THREE.Vector3, knock: boolean) => {
    const now = performance.now();
    cupPoke = { point: new THREE.Vector3(at.x, 0.04, at.z), until: now + 700, knock };
    if (knock) paws.left.slapStart = now;
  };
  // Rock on the base rim: the rim point on the side the mug leans toward
  // stays put while the mug turns about it.
  const MUG_RIM = { radius: 0.295, y: 0.035 };
  const tiltQuaternion = (t: { x: number; z: number }) => {
    const angle = Math.hypot(t.x, t.z);
    return angle < 1e-6 ? new THREE.Quaternion() : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(t.z / angle, 0, -t.x / angle), angle);
  };
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const poseMug = (dt: number) => {
    // Leaning away from a pressing paw, by how hard it presses.
    mugTilt.step(dt, bump);
    const angle = mugTilt.magnitude;
    const q = tiltQuaternion(mugTilt.tilt);
    const rim = angle < 1e-6 ? new THREE.Vector3() : new THREE.Vector3((mugTilt.tilt.x / angle) * MUG_RIM.radius, MUG_RIM.y, (mugTilt.tilt.z / angle) * MUG_RIM.radius);
    mugRig.quaternion.copy(q);
    mugRig.position.copy(cup.position).add(rim).sub(rim.clone().applyQuaternion(q));
    // The coffee wants to stay level, so relative to the mug it tilts back
    // against it, and overshoots.
    slosh.step(dt, { x: -mugTilt.tilt.x * 0.8, z: -mugTilt.tilt.z * 0.8 });
    coffee.quaternion.copy(tiltQuaternion(slosh.tilt)).multiply(flat);
    mugSpin.rotation.y += mugSpinSpeed * dt;
    mugSpinSpeed *= Math.exp(-dt * 3);
  };

  const trackpadToWorld = (u: number, v: number) =>
    new THREE.Vector3(
      (u - 0.5) * TRACKPAD.width * 0.9,
      LAPTOP.thickness + 0.004,
      TRACKPAD.centerZ + (v - 0.5) * TRACKPAD.depth * 0.9,
    );

  const screenWorld = (element: HTMLIFrameElement, ex: number, ey: number) => {
    const s = all.find((sc) => sc.element === element)!;
    const { width, height } = s.mesh.geometry.parameters;
    s.mesh.updateWorldMatrix(true, false);
    return s.mesh.localToWorld(new THREE.Vector3((ex / s.size.width - 0.5) * width, (0.5 - ey / s.size.height) * height, 0));
  };

  const slap = (code: string) => {
    const paw = pawForCode(code);
    const now = performance.now();
    lastSlap = { code, paw, at: now };
    const at = keyToWorld(code) ?? keyToWorld(paw === "left" ? "KeyF" : "KeyJ")!;
    const sides: ("left" | "right")[] = paw === "both" ? ["left", "right"] : [paw];
    for (const side of sides) {
      const p = paws[side];
      // Space: each paw hits its own half of the bar.
      const target = code === "Space" ? at.clone().add(new THREE.Vector3(side === "left" ? -0.35 : 0.35, 0, 0)) : at.clone();
      p.target.copy(target);
      p.slapStart = now;
      if (side === "right") lastRightKeyAt = now;
    }
    const i = keyIndex.get(code);
    if (i !== undefined) keyDepress.set(i, now);
  };

  // A paw on a tablet or phone taps where it is told, in screen element px.
  const tapScreen = (device: "tablet" | "phone", x: number, y: number) => {
    const p = pawFor(device);
    const now = performance.now();
    hoverAt[device] = { x, y };
    p.target.copy(screenWorld(screens[device], x, y));
    p.slapStart = now;
    lastTap = { device, paw: p.side, x, y, at: now };
  };
  const hoverScreen = (device: "tablet" | "phone", x: number, y: number) => {
    hoverAt[device] = { x, y };
    pawFor(device).target.copy(screenWorld(screens[device], x, y));
  };

  // Scrolling: the wheel scrolls the frame under the pointer natively; the
  // paw mimes it. On the laptop it strokes the trackpad (two-finger scroll),
  // on a tablet or phone it swipes the screen. Negative = toward the top of
  // the screen / away from the cat, the way a finger moves to scroll down.
  let scrollStroke = 0;
  const STROKE_LIMIT = 80;
  const onWheel = (device: Device, deltaY: number) => {
    attention = device;
    if (device === "laptop") lastPointerAt = performance.now();
    scrollStroke = THREE.MathUtils.clamp(scrollStroke - deltaY * 0.25, -STROKE_LIMIT, STROKE_LIMIT);
  };

  // Typing on a tablet or phone: the paw taps the key on the device's
  // on-screen keyboard. A key that keyboard lacks (digits, modifiers) is
  // tapped along the focused field at its place across a keyboard instead.
  const typeOnScreen = (device: "tablet" | "phone", code: string) => {
    const doc = screens[device].contentDocument!;
    const onScreenKey = doc.querySelector(`[data-device-keyboard][data-open] [data-key-code="${code}"]`);
    if (onScreenKey) {
      const r = onScreenKey.getBoundingClientRect();
      tapScreen(device, r.left + r.width / 2, r.top + r.height / 2);
      return;
    }
    const field = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement.getBoundingClientRect() : null;
    const s = screenFor(device);
    const cell = keyCell(code);
    const across = cell ? (cell.x + cell.width / 2) / KEYBOARD_WIDTH_UNITS : 0.5;
    if (field) tapScreen(device, field.left + field.width * (0.1 + 0.8 * across), field.top + field.height / 2);
    else tapScreen(device, s.size.width * across, s.size.height / 2);
  };

  // The trackpad drives the laptop's viewport: the paw sits where the pointer
  // is within the laptop screen, pinned to the pad's edge when it is off it.
  const pointerAt = (x: number, y: number) => {
    lastPointerAt = performance.now();
    const laptopScreen = all[0];
    const rect = canvas.getBoundingClientRect();
    const m = laptopScreen.matrix.length ? laptopScreen.matrix : screenMatrix(laptopScreen);
    const inViewport = untransformPoint(m, x - rect.left, y - rect.top);
    if (!inViewport) return;
    const { u, v } = viewportToTrackpadUV(inViewport, laptopScreen.size);
    trackpadUV.set(u, v);
  };

  // The device an event came through is the one the cat attends to: the
  // mouse is only ever over one screen, and keys go to the focused frame.
  // Typing holds the cat's attention on the device taking the keys: the
  // pointer drifting over another device does not pull the cat (and a paw)
  // across until the keys go quiet. A click still does; it is deliberate.
  const KEY_HOLD_MS = 800;
  let keysHeld: { device: Device; until: number } | null = null;
  // The latest held-off pointer move, replayed when the hold ends so a pointer
  // that came to rest over another device still turns the cat to it.
  let deferredMove: ReturnType<typeof setTimeout> | undefined;
  const listen: Desk["listen"] = (win, frame) => {
    const device = deviceOf(frame);
    win.addEventListener(
      "keydown",
      (e) => {
        attention = device;
        keysHeld = { device, until: performance.now() + KEY_HOLD_MS };
        if (device === "laptop") slap(e.code);
        else typeOnScreen(device, e.code);
      },
      true,
    );
    const move = (e: PointerEvent) => {
      clearTimeout(deferredMove);
      // Dragging across the mug or saucer on the desk reaches for it.
      const onCup = !frame && e.buttons & 1 ? cupHit(e.clientX, e.clientY) : null;
      if (onCup) return pokeCup(onCup, false);
      if (keysHeld && keysHeld.device !== device && performance.now() < keysHeld.until) {
        deferredMove = setTimeout(() => move(e), keysHeld.until - performance.now() + 1);
        return;
      }
      attention = device;
      if (device === "laptop") {
        const p = frame ? screenToWindow(frame, e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
        pointerAt(p.x, p.y);
      } else {
        hoverScreen(device, e.clientX, e.clientY);
      }
    };
    win.addEventListener("pointermove", move, true);
    win.addEventListener("wheel", (e) => onWheel(device, e.deltaY), { capture: true, passive: true });
    win.addEventListener(
      "pointerdown",
      (e) => {
        keysHeld = null;
        // A click on the mug or saucer bats at it.
        const onCup = frame ? null : cupHit(e.clientX, e.clientY);
        if (onCup) return pokeCup(onCup, true);
        move(e);
        if (device === "laptop") paws.right.slapStart = performance.now();
        else tapScreen(device, e.clientX, e.clientY);
      },
      true,
    );
  };

  // --- resize ----------------------------------------------------------------
  let cssSize = { width: canvas.clientWidth, height: canvas.clientHeight };
  const resize = () => {
    cssSize = { width: canvas.clientWidth, height: canvas.clientHeight };
    renderer.setSize(cssSize.width, cssSize.height, false);
    camera.aspect = cssSize.width / cssSize.height;
    // Preserve the desk's horizontal framing in narrow windows. Keeping a
    // fixed vertical FOV crops the tablet and phone as the aspect shrinks.
    // Inspector views retain their deliberately close camera framing.
    if (!inspect) camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(40 / 2)) * Math.max(1, 1.6 / camera.aspect)));
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const screenMatrix = (s: Screen) => {
    const mvp = multiply(camera.projectionMatrix.elements, multiply(camera.matrixWorldInverse.elements, s.mesh.matrixWorld.elements));
    const params = s.mesh.geometry.parameters;
    return elementToCanvasMatrix({
      modelViewProjection: mvp,
      planeWidth: params.width,
      planeHeight: params.height,
      elementWidth: s.size.width,
      elementHeight: s.size.height,
      canvasWidth: cssSize.width,
      canvasHeight: cssSize.height,
    });
  };

  const screenToWindow: Desk["screenToWindow"] = (element, x, y) => {
    const s = all.find((sc) => sc.element === element)!;
    const rect = canvas.getBoundingClientRect();
    const p = transformPoint(s.matrix.length ? s.matrix : screenMatrix(s), x, y);
    return { x: rect.left + p.x, y: rect.top + p.y };
  };

  // --- per-frame puppet pose -------------------------------------------------
  const up = new THREE.Vector3(0, 1, 0);
  const pawMode = (side: "left" | "right", now: number): PawMode => {
    if (side === "left") return attention === "tablet" ? "tablet" : "keys";
    if (attention === "phone") return "phone";
    return attention === "laptop" && now - lastPointerAt < 2500 && now - lastRightKeyAt > 450 ? "trackpad" : "keys";
  };
  const posePaw = (p: PawState, now: number, dt: number) => {
    const mode = pawMode(p.side, now);
    if (mode === "trackpad") {
      p.target.copy(trackpadToWorld(trackpadUV.x, trackpadUV.y));
      p.target.z += (scrollStroke / STROKE_LIMIT) * TRACKPAD.depth * 0.4;
    } else if ((mode === "tablet" || mode === "phone") && hoverAt[mode]) {
      const at = hoverAt[mode]!;
      p.target.copy(screenWorld(screens[mode], at.x, at.y + scrollStroke));
    }
    // While the cat leans over to the tablet or phone, its other paw rests on
    // the trackpad's corner on that side instead of stretching back across
    // its body to the home keys.
    const resting = mode === "keys" && attention === (p.side === "right" ? "tablet" : "phone");
    // A click or drag on the mug sends the left paw there. Otherwise a paw not
    // busy with a pointer or a recent key drifts home: to the keys, or to that
    // trackpad corner while leaning.
    const poking = p.side === "left" && cupPoke !== null && now < cupPoke.until;
    if (poking) p.target.copy(cupPoke!.point);
    else if (mode === "keys" && now - p.slapStart > 600 && !(p.side === "right" && now - lastPointerAt < 2500)) {
      const home = resting ? trackpadToWorld(p.side === "right" ? 0.08 : 0.92, 0.92) : p.rest;
      p.target.lerp(home, 1 - Math.exp(-dt * 3));
    }
    // A paw working a handheld stays on its own side of the laptop: no
    // further in than the trackpad's nearest edge, however far a drag goes.
    if (mode === "tablet") p.target.x = Math.min(p.target.x, -TRACKPAD.width / 2);
    if (mode === "phone") p.target.x = Math.max(p.target.x, TRACKPAD.width / 2);
    // Only the left paw, on the tablet's side, can reach the mug.
    if (p.side === "right") {
      const reached = clampToReach(p.target, REACH);
      p.target.x = reached.x;
      p.target.z = reached.z;
    } else {
      const against = pressAgainst(clampToReach(p.target, REACH, cupDisc), p.shoulder, cupDisc, CUP_CONTACT);
      p.target.x = against.x;
      p.target.z = against.z;
      const lean = Math.min(against.press * 0.3, 0.12);
      bump.x = against.away.x * lean;
      bump.z = against.away.z * lean;
      if (against.press > 0 && !pressing) mugSpinSpeed += Math.sign(against.lateral || 1) * 1.2;
      pressing = against.press > 0;
    }
    p.position.lerp(p.target, 1 - Math.exp(-dt * 28));
    // Slap: a fast drop onto the surface and a slower rebound.
    const t = (now - p.slapStart) / SLAP_MS;
    const drop = t >= 0 && t < 1 ? Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * 0.4) : 0;
    p.hover += ((mode === "keys" && !resting ? PAW_HOVER : 0.05) - p.hover) * (1 - Math.exp(-dt * 12));
    p.mesh.position.set(p.position.x, p.position.y + 0.07 + (p.hover - 0.07) * (1 - drop), p.position.z);
  };
  const placeArm = (p: PawState) => {
    p.shoulder.copy(p.localShoulder);
    cat.localToWorld(p.shoulder);
    const wrist = p.mesh.position;
    const along = new THREE.Vector3().subVectors(wrist, p.shoulder);
    const length = along.length();
    const sockStart = wrist.clone().addScaledVector(along, -Math.min(SOCK_LENGTH, length * 0.5) / (length || 1));
    placeBone(p.arm.pole, p.shoulder, sockStart);
    placeBone(p.arm.sock, sockStart, wrist);
    p.arm.armpit.position.copy(p.shoulder);
    // The paw points along the arm.
    p.mesh.rotation.y = Math.atan2(-along.x, -along.z);
  };
  const placeBone = (bone: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    bone.position.copy(from).addScaledVector(dir, 0.5);
    bone.scale.set(1, Math.max(length, 1e-4), 1);
    bone.quaternion.setFromUnitVectors(up, dir.divideScalar(length || 1));
  };

  // --- paint loop -------------------------------------------------------------
  let lastFrame = performance.now();
  let tailFlick = 0;
  drawable.onpaint = (event) => {
    const changed = new Set(event.changedElements ?? []);
    for (const s of all) if (s.surface.paint(changed)) s.mesh.visible = true;
    renderer.resetState();

    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    scrollStroke *= Math.exp(-dt * 4);
    // Lean toward the attended device: slide over, turn to face it, tilt in.
    const leanTarget = attention === "tablet" ? -1 : attention === "phone" ? 1 : 0;
    lean += (leanTarget - lean) * (1 - Math.exp(-dt * 6));
    cat.position.set(0.05 + lean * 0.95, 0, CAT_Z - Math.abs(lean) * 0.1);
    cat.rotation.set(0, -lean * 0.42, -lean * 0.14);
    cat.updateMatrixWorld();
    posePaw(paws.left, now, dt);
    posePaw(paws.right, now, dt);
    placeArm(paws.left);
    placeArm(paws.right);
    if (cupPoke?.knock && paws.left.position.distanceTo(cupPoke.point) < 0.25) {
      const away = new THREE.Vector3().subVectors(cupPoke.point, paws.left.shoulder).setY(0).normalize();
      mugTilt.kick({ x: away.x, z: away.z }, MUG_TIP_SPEED);
      mugSpinSpeed += 0.8;
      cupPoke.knock = false;
    }
    poseMug(dt);
    for (const [i, at] of keyDepress) {
      const age = now - at;
      keyMatrix(i, age < 120 ? 0.018 : 0);
      if (age >= 120) keyDepress.delete(i);
    }
    keys.instanceMatrix.needsUpdate = true;
    const mashing = lastSlap && now - lastSlap.at < 400 ? 1 : 0;
    headGroup.rotation.z = Math.sin(now / 90) * 0.04 * (mashing ? 1 : 0.2);
    // Look toward the attended device a little more than the body turns.
    headGroup.rotation.y = -lean * 0.25;
    const seconds = now / 1000;
    // Breathing, a lazy tail, and an ear twitch every few seconds.
    const breath = Math.sin((seconds * Math.PI * 2) / 3.4) * 0.012;
    body.scale.set(1, 1.1 * (1 + breath), 0.9 * (1 + breath * 0.6));
    tailFlick += ((mashing ? 1 : 0) - tailFlick) * (1 - Math.exp(-dt * 4));
    poseTail(seconds, tailFlick);
    ears.forEach((ear, i) => {
      const side = i === 0 ? -1 : 1;
      const twitch = (now + i * 2600) % (5300 + i * 800) < 160 ? 0.35 : 0;
      ear.rotation.z = side * -(0.3 + twitch);
    });

    renderer.render(scene, camera);
    for (const s of all) {
      s.matrix = screenMatrix(s);
      s.surface.setGeometry(s.matrix);
    }
    drawable.requestPaint();
  };
  drawable.requestPaint();

  const toScreen = (v: THREE.Vector3) => {
    const rect = canvas.getBoundingClientRect();
    const p = v.clone().project(camera);
    return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
  };
  const plain = (v: THREE.Vector3) => ({ x: v.x, y: v.y, z: v.z });

  return {
    listen,
    screenToWindow,
    debug: {
      pawWorld: (side) => plain(paws[side].mesh.position),
      pawScreen: (side) => toScreen(paws[side].mesh.position),
      keyWorld: (code) => {
        const k = keyToWorld(code);
        return k ? plain(k) : null;
      },
      trackpadWorld: (u, v) => plain(trackpadToWorld(u, v)),
      trackpadUV: () => ({ u: trackpadUV.x, v: trackpadUV.y }),
      screenPoint: (element, ex, ey) => screenToWindow(element, ex, ey),
      uploads: () => Object.fromEntries(all.map((s) => [s.element.id, s.surface.uploads])),
      screenWorld: (element, ex, ey) => plain(screenWorld(element, ex, ey)),
      lastSlap: () => lastSlap,
      lastTap: () => lastTap,
      attention: () => attention,
      lean: () => lean,
      pawMode: (side) => pawMode(side, performance.now()),
      catWorld: () => plain(cat.position),
      reach: () => ({ ...REACH, cup: { ...cupDisc } }),
      cup: () => ({ x: cupDisc.x, z: cupDisc.z, tilt: mugTilt.magnitude, slosh: slosh.magnitude, spin: mugSpin.rotation.y - cup.rotation.y, contact: CUP_CONTACT }),
      project: (x, y, z) => toScreen(new THREE.Vector3(x, y, z)),
      scrollStroke: () => scrollStroke,
      arm: (side) => {
        const p = paws[side];
        const socket = p.localShoulder.clone();
        cat.localToWorld(socket);
        const { pole, sock } = p.arm;
        // Recover each cylinder's ends from its placement.
        const end = (bone: THREE.Mesh, sign: 1 | -1) =>
          new THREE.Vector3(0, sign * 0.5, 0).applyQuaternion(bone.quaternion).multiplyScalar(bone.scale.y).add(bone.position);
        return {
          length: +end(pole, -1).distanceTo(end(sock, 1)).toFixed(4),
          socketGap: +end(pole, -1).distanceTo(socket).toFixed(4),
          wristGap: +end(sock, 1).distanceTo(p.mesh.position).toFixed(4),
        };
      },
    },
  };
}
