import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
   CONSTANTS
   ============================================================ */
const KE   = 8.9875517923e9;
const EPS0 = 8.8541878128e-12;
const MU0  = 1.25663706212e-6;
const V    = (x, y, z) => new THREE.Vector3(x, y, z);
const deg  = THREE.MathUtils.degToRad;

/* ============================================================
   STATE
   ============================================================ */
const state = {
  preset: '1A',
  layer: 'v',
  density: 7,
  probe: { x: 1.2, y: 1.0, z: 0.8 },
  axis: 'z',
  surface: 'none',
  R: 1.2,
  spos: { x: 0, y: 0, z: 0 },
  tilt: 0,
  spin: 0,
  showNormals: false,
  showArrows: true,
  showStream: false,
  omega: 1.5,
  playing: true,
  t: 0,
  grid: 'cartesian',
  cat: 'Vector Calculus'
};

/* ============================================================
   RENDERER / SCENE / CAMERA
   ============================================================ */
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x090d16, 1);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x090d16, 0.03);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4.8, 3.8, 5.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.minDistance = 2;
controls.maxDistance = 24;

/* ============================================================
   LIGHTING
   ============================================================ */
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
dirLight.position.set(5, 8, 6);
scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
rimLight.position.set(-6, -3, -5);
scene.add(rimLight);

/* ============================================================
   HELPERS
   ============================================================ */
function line(color, a, b, opacity = 0.85) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geo, mat);
}

function makeLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = color;
  ctx.font = 'bold 44px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.55, 0.275, 1);
  return sprite;
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
  while (g.children.length) g.remove(g.children[0]);
}

function fmtNum(v) {
  if (!isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a >= 1e4 || a < 1e-3) return v.toExponential(2);
  return v.toFixed(3);
}
function fmtVec(v) {
  return `(${fmtNum(v.x)}, ${fmtNum(v.y)}, ${fmtNum(v.z)})`;
}

/* ============================================================
   COORDINATE GRIDS
   ============================================================ */
const gridGroups = {
  cartesian: new THREE.Group(),
  cylindrical: new THREE.Group(),
  spherical: new THREE.Group()
};
Object.values(gridGroups).forEach((g) => scene.add(g));

(function buildCartesian() {
  const g = gridGroups.cartesian;
  const floor = new THREE.GridHelper(8, 16, 0x1e293b, 0x1e293b);
  floor.position.y = -2.4;
  g.add(floor);
  g.add(line(0xef4444, V(-3.2, 0, 0), V(3.2, 0, 0)));
  g.add(line(0x22c55e, V(0, -3.2, 0), V(0, 3.2, 0)));
  g.add(line(0x3b82f6, V(0, 0, -3.2), V(0, 0, 3.2)));
  const lx = makeLabel('X', '#ef4444'); lx.position.set(3.45, 0, 0); g.add(lx);
  const ly = makeLabel('Y', '#22c55e'); ly.position.set(0, 3.45, 0); g.add(ly);
  const lz = makeLabel('Z', '#3b82f6'); lz.position.set(0, 0, 3.45); g.add(lz);
})();

(function buildCylindrical() {
  const g = gridGroups.cylindrical;
  const ringMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  for (const r of [0.5, 1, 1.5, 2, 2.5]) {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(V(r * Math.cos(a), 0, r * Math.sin(a)));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(line(0x1e293b, V(0, 0, 0), V(2.5 * Math.cos(a), 0, 2.5 * Math.sin(a))));
  }
  g.add(line(0x3b82f6, V(0, -2.5, 0), V(0, 2.5, 0)));
  const lr = makeLabel('r', '#38bdf8'); lr.position.set(2.65, 0, 0); g.add(lr);
  const lp = makeLabel('φ', '#fbbf24'); lp.position.set(0, 0, 2.65); g.add(lp);
})();

(function buildSpherical() {
  const g = gridGroups.spherical;
  const R = 2.5;
  const ringMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
  for (const th of [30, 60, 90, 120, 150]) {
    const t = deg(th);
    const r = R * Math.sin(t);
    const y = R * Math.cos(t);
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(V(r * Math.cos(a), y, r * Math.sin(a)));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pts = [];
    for (let j = 0; j <= 64; j++) {
      const t = (j / 64) * Math.PI;
      pts.push(V(R * Math.sin(t) * Math.cos(a), R * Math.cos(t), R * Math.sin(t) * Math.sin(a)));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
  }
  const lt = makeLabel('θ', '#22c55e'); lt.position.set(0, 2.65, 0); g.add(lt);
})();

function setGrid(name) {
  state.grid = name;
  for (const k in gridGroups) gridGroups[k].visible = (k === name);
}

/* ============================================================
   FIELD FUNCTIONS
   ============================================================ */
const K = 1.0;

function shearFn(x, y, z, t) {
  if (y < -1 || y > 1) return V(0, 0, 0);
  return V(K * Math.sin(Math.PI * (y + 1) / 2), 0, 0);
}
function shearCurlFn(x, y, z, t) {
  if (y < -1 || y > 1) return V(0, 0, 0);
  return V(0, 0, -(Math.PI * K / 2) * Math.cos(Math.PI * (y + 1) / 2));
}

const FIELD_FN = {
  uniform:      (x, y, z, t) => V(K, 0, 0),
  shear:        shearFn,
  shearCurl:    shearCurlFn,
  irrot:        (x, y, z, t) => V(y, x, 0),
  rot:          (x, y, z, t) => V(x * x, 2 * y * z, -x * x),
  rotCurl:      (x, y, z, t) => V(-2 * y, 2 * x, 0),
  doubleCurl:   (x, y, z, t) => V(2 * x, 4 * x * y * y * z, 0),
  doubleCurl1:  (x, y, z, t) => V(-4 * x * y * y, 0, 4 * y * y * z),
  doubleCurl2:  (x, y, z, t) => V(8 * y * z, 0, 8 * x * y)
};

function makePointChargeField(charges) {
  return (x, y, z, t) => {
    const P = V(x, y, z);
    const E = V(0, 0, 0);
    for (const c of charges) {
      const R = new THREE.Vector3().subVectors(P, c.p);
      const r = R.length();
      if (r < 1e-6) continue;
      E.add(R.multiplyScalar(KE * c.q / (r * r * r)));
    }
    return E;
  };
}

function sphToCart(r, thetaDeg, phiDeg) {
  const th = deg(thetaDeg);
  const ph = deg(phiDeg);
  return V(r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph));
}

const CH2B = [
  { q:  30e-9, p: V(0,  2, 0) },
  { q: -30e-9, p: V(0, -2, 0) }
];
const CH2C = [
  { q: -7e-9, p: sphToCart(1, 75, 10) },
  { q:  3e-9, p: sphToCart(5, 30, 90) }
];

const LAMBDA = 1e-9;
function lineChargeField(x, y, z, t) {
  const r = Math.hypot(x, y);
  if (r < 0.05) return V(0, 0, 0);
  const mag = 2 * KE * LAMBDA / r;
  return V(x / r, y / r, 0).multiplyScalar(mag);
}

function hCart(x, y, z, t) {
  return V(3, 7 * y, 2 * x);
}
function hCyl(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r < 1e-6) return V(0, 5, 0);
  const c = x / r, s = z / r;
  // H = 6r r̂ + 2r φ̂ + 5 ẑ_cyl ; φ̂ = (s, 0, -c) for a right-handed frame about +y
  return V(6 * r * c + 2 * r * s, 5, 6 * r * s - 2 * r * c);
}

const SOL_R = 0.7;
const B0 = 1.0;
function solenoidB(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r > SOL_R) return V(0, 0, 0);
  return V(0, B0 * Math.cos(state.omega * t), 0);
}
function solenoidE(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r < 0.05) return V(0, 0, 0);
  const dBdt = -B0 * state.omega * Math.sin(state.omega * t);
  const Ephi = -dBdt * (r < SOL_R ? r / 2 : (SOL_R * SOL_R) / (2 * r));
  const c = x / r, s = z / r;
  return V(s * Ephi, 0, -c * Ephi);
}

const CAP_D = 0.55;
const CAP_HW = 0.9;
const E0 = 1.0;
function capE(x, y, z, t) {
  const ay = Math.abs(y), ax = Math.abs(x), az = Math.abs(z);
  if (ay < CAP_D && ax < CAP_HW && az < CAP_HW) {
    return V(0, E0 * Math.sin(state.omega * t), 0);
  }
  return V(0, 0, 0);
}
function capDdt(x, y, z, t) {
  const ay = Math.abs(y), ax = Math.abs(x), az = Math.abs(z);
  if (ay < CAP_D && ax < CAP_HW && az < CAP_HW) {
    return V(0, EPS0 * E0 * state.omega * Math.cos(state.omega * t), 0);
  }
  return V(0, 0, 0);
}
function capJ(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r < 0.07 && Math.abs(y) > CAP_D) {
    return V(0, 1.0 * Math.sin(state.omega * t), 0);
  }
  return V(0, 0, 0);
}
function capH(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r < 0.05) return V(0, 0, 0);
  const c = x / r, s = z / r;
  let Hphi;
  if (Math.abs(y) < CAP_D && r < CAP_HW) {
    Hphi = (r / 2) * EPS0 * E0 * state.omega * Math.cos(state.omega * t);
  } else {
    Hphi = 0.35 / r;
  }
  return V(s * Hphi, 0, -c * Hphi);
}

/* ============================================================
   PRESETS
   ============================================================ */
const PRESETS = {
  '1A': {
    cat: 'Vector Calculus',
    label: '1A · Uniform Flow (Water Trough)',
    hint: 'v = x̂ K. Parallel uniform arrows; ∇ × v = 0 everywhere.',
    law: 'curl',
    layers: [{ key: 'v', label: 'v = x̂ K', color: 0x38bdf8, fn: FIELD_FN.uniform }],
    primary: 'v',
    units: { field: 'm/s', curl: '1/s', div: '1/s' },
    integralUnit: 'm²/s',
    dynamic: false,
    extras: buildTroughWalls
  },
  '1B': {
    cat: 'Vector Calculus',
    label: '1B · Sinusoidal Shear Flow',
    hint: 'v = x̂ K sin(πy/b), walls at y = ±1. ∇ × v = -ẑ (πK/b) cos(πy/b): clockwise on the left half, zero at the centre, counter-clockwise on the right half.',
    law: 'curl',
    layers: [
      { key: 'v', label: 'v = x̂ K sin(πy/b)', color: 0x38bdf8, fn: FIELD_FN.shear },
      { key: 'curl', label: '∇ × v', color: 0x34d399, fn: FIELD_FN.shearCurl }
    ],
    primary: 'v',
    units: { field: 'm/s', curl: '1/s', div: '1/s' },
    integralUnit: 'm²/s',
    dynamic: false,
    extras: buildTroughWalls
  },
  '1C': {
    cat: 'Vector Calculus',
    label: '1C · Irrotational Shear Field',
    hint: 'F = x̂ y + ŷ x. ∂Fy/∂x = 1 and ∂Fx/∂y = 1 produce equal and opposite torques → ∇ × F = 0.',
    law: 'curl',
    layers: [{ key: 'F', label: 'F = x̂ y + ŷ x', color: 0x38bdf8, fn: FIELD_FN.irrot }],
    primary: 'F',
    units: { field: 'm/s', curl: '1/s', div: '1/s' },
    integralUnit: 'm²/s',
    dynamic: false,
    extras: null
  },
  '1D': {
    cat: 'Vector Calculus',
    label: '1D · Rotational Curl Field',
    hint: 'F = x̂ x² + ŷ 2yz - ẑ x². Curl streamlines form concentric circles x² + y² = R².',
    law: 'curl',
    layers: [
      { key: 'F', label: 'F = x̂ x² + ŷ 2yz - ẑ x²', color: 0x38bdf8, fn: FIELD_FN.rot },
      { key: 'curl', label: '∇ × F = -x̂ 2y + ŷ 2x', color: 0x34d399, fn: FIELD_FN.rotCurl }
    ],
    primary: 'F',
    units: { field: 'm/s', curl: '1/s', div: '1/s' },
    integralUnit: 'm²/s',
    dynamic: false,
    extras: null
  },
  '1E': {
    cat: 'Vector Calculus',
    label: '1E · Double Curl / Wave Operator',
    hint: 'F = x̂ 2x + ŷ 4xy²z. Toggle F, ∇ × F, and ∇ × ∇ × F.',
    law: 'curl',
    layers: [
      { key: 'F', label: 'F = x̂ 2x + ŷ 4xy²z', color: 0x38bdf8, fn: FIELD_FN.doubleCurl },
      { key: 'curl', label: '∇ × F = -x̂ 4xy² + ẑ 4y²z', color: 0x34d399, fn: FIELD_FN.doubleCurl1 },
      { key: 'curl2', label: '∇ × ∇ × F = x̂ 8yz + ẑ 8xy', color: 0xfbbf24, fn: FIELD_FN.doubleCurl2 }
    ],
    primary: 'F',
    units: { field: 'm/s', curl: '1/s', div: '1/s' },
    integralUnit: 'm²/s',
    dynamic: false,
    extras: null
  },
  '2A': {
    cat: 'Electrostatics',
    label: '2A · Infinite Line Charge & Strip Flux',
    hint: 'λ = 1 nC/m along ẑ. Flux per unit length through a strip subtending Δφ is Ψ/L = λ Δφ / (2πε₀).',
    law: 'gaussE',
    layers: [{ key: 'E', label: 'E = (λ / 2πε₀ r) r̂', color: 0x38bdf8, fn: lineChargeField }],
    primary: 'E',
    units: { field: 'V/m', curl: 'V/m²', div: 'V/m²' },
    integralUnit: 'V·m',
    dynamic: false,
    extras: buildLineChargeExtras
  },
  '2B': {
    cat: 'Electrostatics',
    label: '2B · Rectangular Two-Charge Dipole',
    hint: 'Q₁ = +30 nC at (0, 2, 0), Q₂ = -30 nC at (0, -2, 0). Probe shows E₁, E₂, R₁, R₂ and the resultant E.',
    law: 'gaussE',
    layers: [{ key: 'E', label: 'E = Σ k Q R / |R|³', color: 0x38bdf8, fn: makePointChargeField(CH2B) }],
    primary: 'E',
    units: { field: 'V/m', curl: 'V/m²', div: 'V/m²' },
    integralUnit: 'V·m',
    dynamic: false,
    extras: buildDipoleExtras
  },
  '2C': {
    cat: 'Electrostatics',
    label: '2C · Spherical Two-Charge System',
    hint: 'Q₁ = -7 nC at (1 m, 75°, 10°), Q₂ = +3 nC at (5 m, 30°, 90°), probe at (2 m, 45°, 45°). Shows Cartesian and local spherical components.',
    law: 'gaussE',
    layers: [{ key: 'E', label: 'E = Σ k Q R / |R|³', color: 0x38bdf8, fn: makePointChargeField(CH2C) }],
    primary: 'E',
    units: { field: 'V/m', curl: 'V/m²', div: 'V/m²' },
    integralUnit: 'V·m',
    dynamic: false,
    extras: buildSphericalChargesExtras
  },
  '2D': {
    cat: 'Magnetostatics',
    label: '2D · Current Density J = ∇ × H',
    hint: 'Cartesian H = x̂ 3 + ŷ 7y + ẑ 2x → J_y = -2 A/m². Cylindrical H = r̂ 6r + φ̂ 2r + ẑ 5 → J_z = 4 A/m².',
    law: 'ampere',
    layers: [
      { key: 'Hcart', label: 'H = x̂ 3 + ŷ 7y + ẑ 2x', color: 0xf472b6, fn: hCart },
      { key: 'Hcyl',  label: 'H = r̂ 6r + φ̂ 2r + ẑ 5', color: 0xfbbf24, fn: hCyl }
    ],
    primary: 'Hcart',
    units: { field: 'A/m', curl: 'A/m²', div: 'A/m²' },
    integralUnit: 'A',
    dynamic: false,
    extras: buildCurrentExtras
  },
  '3A': {
    cat: 'Dynamic Maxwell',
    label: "3A · Faraday's Law Solenoid",
    hint: 'B(t) = B₀ cos(ωt) ẑ inside the coil. Circulating E lags B by 90°: ∇ × E = -∂B/∂t = -jωμH.',
    law: 'faraday',
    layers: [
      { key: 'B', label: 'B(t) = B₀ cos(ωt) ẑ', color: 0xf472b6, fn: solenoidB },
      { key: 'E', label: 'E_φ = -(r/2) dB/dt', color: 0x38bdf8, fn: solenoidE }
    ],
    primary: 'E',
    units: { field: 'V/m', curl: 'V/m²', div: 'V/m²' },
    integralUnit: 'V',
    dynamic: true,
    extras: buildSolenoidExtras
  },
  '3B': {
    cat: 'Dynamic Maxwell',
    label: '3B · Ampère–Maxwell Charging Capacitor',
    hint: 'Conduction current J = σE in the wires becomes displacement current ∂D/∂t = jωεE between the plates; H rings around both.',
    law: 'ampere',
    layers: [
      { key: 'E',   label: 'E (gap field)',        color: 0x38bdf8, fn: capE },
      { key: 'J',   label: 'J = σE (wires)',       color: 0xfbbf24, fn: capJ },
      { key: 'Ddt', label: '∂D/∂t = jωεE (gap)',   color: 0x34d399, fn: capDdt },
      { key: 'H',   label: 'H (rings)',            color: 0xf472b6, fn: capH }
    ],
    primary: 'H',
    units: { field: 'A/m', curl: 'A/m²', div: 'A/m²' },
    integralUnit: 'A',
    dynamic: true,
    extras: buildCapacitorExtras
  }
};

/* ============================================================
   LAW METADATA
   ============================================================ */
const LAWS = {
  curl: {
    name: 'Curl & Circulation (Stokes)',
    integral: '\\oint_{\\partial S}\\mathbf{F}\\cdot d\\mathbf{L} = \\int_S (\\nabla\\times\\mathbf{F})\\cdot d\\mathbf{s}',
    differential: '\\nabla\\times\\mathbf{F} = \\left(\\partial_y F_z-\\partial_z F_y,\\; \\partial_z F_x-\\partial_x F_z,\\; \\partial_x F_y-\\partial_y F_x\\right)',
    qtyText: 'Γ_F',
    kind: 'circulation'
  },
  gaussE: {
    name: "Gauss's Law for Electricity",
    integral: '\\oint_{\\partial V}\\mathbf{D}\\cdot d\\mathbf{s} = Q_{\\text{enc}} = \\varepsilon_0\\oint_{\\partial V}\\mathbf{E}\\cdot d\\mathbf{s}',
    differential: '\\nabla\\cdot\\mathbf{D} = \\rho',
    qtyText: 'Φ_E',
    kind: 'flux'
  },
  gaussB: {
    name: "Gauss's Law for Magnetism",
    integral: '\\oint_{\\partial V}\\mathbf{B}\\cdot d\\mathbf{s} = 0',
    differential: '\\nabla\\cdot\\mathbf{B} = 0',
    qtyText: 'Φ_B',
    kind: 'flux'
  },
  faraday: {
    name: "Faraday's Law",
    integral: '\\oint_{\\partial S}\\mathbf{E}\\cdot d\\mathbf{L} = -\\dfrac{d\\Phi_B}{dt}',
    differential: '\\nabla\\times\\mathbf{E} = -\\dfrac{\\partial\\mathbf{B}}{\\partial t}',
    qtyText: 'Γ_E',
    kind: 'circulation'
  },
  ampere: {
    name: 'Ampère–Maxwell Law',
    integral: '\\oint_{\\partial S}\\mathbf{H}\\cdot d\\mathbf{L} = I_{\\text{enc}} + \\dfrac{d\\Phi_D}{dt}',
    differential: '\\nabla\\times\\mathbf{H} = \\mathbf{J} + \\dfrac{\\partial\\mathbf{D}}{\\partial t}',
    qtyText: 'Γ_H',
    kind: 'circulation'
  }
};

/* ============================================================
   EXTRA GEOMETRY BUILDERS
   ============================================================ */
function buildTroughWalls() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0.10,
    side: THREE.DoubleSide, roughness: 0.7, metalness: 0.1, depthWrite: false
  });
  for (const y of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), mat);
    wall.rotation.x = -Math.PI / 2;
    wall.position.y = y;
    g.add(wall);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.4, 4.4)),
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5 })
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = y;
    g.add(edge);
  }
  return g;
}

function chargeSphere(color, radius = 0.16) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.65, roughness: 0.35, metalness: 0.1
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), mat));
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.7, 24, 16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, depthWrite: false })
  );
  g.add(glow);
  return g;
}

function buildLineChargeExtras() {
  const g = new THREE.Group();
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 4.4, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.45, roughness: 0.45, metalness: 0.5
    })
  );
  wire.rotation.x = Math.PI / 2;
  g.add(wire);
  return g;
}

function buildDipoleExtras() {
  const g = new THREE.Group();
  const a = chargeSphere(0xef4444);
  a.position.set(0, 2, 0);
  const b = chargeSphere(0x3b82f6);
  b.position.set(0, -2, 0);
  g.add(a, b);
  return g;
}

function buildSphericalChargesExtras() {
  const g = new THREE.Group();
  const a = chargeSphere(0x3b82f6);
  a.position.copy(CH2C[0].p);
  const b = chargeSphere(0xef4444);
  b.position.copy(CH2C[1].p);
  g.add(a, b);
  return g;
}

function buildCurrentExtras() {
  const g = new THREE.Group();
  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 4.0, 14),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.4, roughness: 0.45, metalness: 0.6
    })
  );
  g.add(wire);
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.5 })
  );
  arrow.position.y = 2.1;
  g.add(arrow);
  return g;
}

function buildSolenoidExtras() {
  const g = new THREE.Group();
  const pts = [];
  const turns = 8;
  const H = 1.6;
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2 * turns;
    const y = (i / 240 - 0.5) * H;
    pts.push(V(Math.cos(a) * SOL_R, y, Math.sin(a) * SOL_R));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 240, 0.025, 8, false);
  g.add(new THREE.Mesh(
    tube,
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.6
    })
  ));
  return g;
}

function buildCapacitorExtras() {
  const g = new THREE.Group();
  const posMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.3
  });
  const negMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.3
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.8), posMat);
  top.position.y = CAP_D;
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.8), negMat);
  bottom.position.y = -CAP_D;
  g.add(top, bottom);

  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.6
  });
  const topLead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 12), wireMat);
  topLead.position.set(0, CAP_D + 0.5, 0);
  const bottomLead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 12), wireMat);
  bottomLead.position.set(0, -CAP_D - 0.5, 0);
  g.add(topLead, bottomLead);
  return g;
}

/* ============================================================
   NUMERICAL CURL / DIVERGENCE
   ============================================================ */
const DH = 0.05;

function computeCurl(fn, x, y, z, t) {
  const fxp = fn(x + DH, y, z, t), fxm = fn(x - DH, y, z, t);
  const fyp = fn(x, y + DH, z, t), fym = fn(x, y - DH, z, t);
  const fzp = fn(x, y, z + DH, t), fzm = fn(x, y, z - DH, t);
  return V(
    (fyp.z - fym.z) / (2 * DH) - (fzp.y - fzm.y) / (2 * DH),
    (fzp.x - fzm.x) / (2 * DH) - (fxp.z - fxm.z) / (2 * DH),
    (fxp.y - fxm.y) / (2 * DH) - (fyp.x - fym.x) / (2 * DH)
  );
}

function computeDiv(fn, x, y, z, t) {
  const fxp = fn(x + DH, y, z, t), fxm = fn(x - DH, y, z, t);
  const fyp = fn(x, y + DH, z, t), fym = fn(x, y - DH, z, t);
  const fzp = fn(x, y, z + DH, t), fzm = fn(x, y, z - DH, t);
  return (fxp.x - fxm.x) / (2 * DH) + (fyp.y - fym.y) / (2 * DH) + (fzp.z - fzm.z) / (2 * DH);
}

/* ============================================================
   PRESET / LAYER ACCESSORS
   ============================================================ */
function presetObj() { return PRESETS[state.preset]; }
function currentLayer() {
  const p = presetObj();
  return p.layers.find((l) => l.key === state.layer)
    || p.layers.find((l) => l.key === p.primary)
    || p.layers[0];
}
function activeFieldFn() { return currentLayer().fn; }

/* ============================================================
   INSTANCED FIELD ARROWS
   ============================================================ */
const arrowsGroup = new THREE.Group();
scene.add(arrowsGroup);

let arrowMesh = null;
let arrowPositions = [];

function makeArrowGeometry() {
  const shaft = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8);
  shaft.translate(0, 0.21, 0);
  const head = new THREE.ConeGeometry(0.055, 0.16, 10);
  head.translate(0, 0.42 + 0.08, 0);
  return mergeGeometries([shaft, head]);
}

function rebuildArrows() {
  disposeGroup(arrowsGroup);
  arrowMesh = null;
  arrowPositions = [];
  if (!state.showArrows) return;

  const n = state.density;
  const span = 2.2;
  const step = n > 1 ? (2 * span) / (n - 1) : 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        arrowPositions.push(V(-span + i * step, -span + j * step, -span + k * step));
      }
    }
  }

  const layer = currentLayer();
  const mat = new THREE.MeshStandardMaterial({
    color: layer.color,
    emissive: layer.color,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.2
  });
  arrowMesh = new THREE.InstancedMesh(makeArrowGeometry(), mat, arrowPositions.length);
  arrowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  arrowsGroup.add(arrowMesh);
  updateArrows();
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _up = V(0, 1, 0);
const _s = new THREE.Vector3();
const _dir = new THREE.Vector3();

function updateArrows() {
  if (!arrowMesh) return;
  const fn = activeFieldFn();
  for (let i = 0; i < arrowPositions.length; i++) {
    const p = arrowPositions[i];
    const F = fn(p.x, p.y, p.z, state.t);
    const mag = F.length();
    if (mag < 1e-9) {
      _m4.makeScale(0, 0, 0);
      arrowMesh.setMatrixAt(i, _m4);
      continue;
    }
    _dir.copy(F).normalize();
    _q.setFromUnitVectors(_up, _dir);
    const len = 0.35 + 0.25 * Math.min(1, mag / 2);
    _s.set(len, len, len);
    _m4.compose(p, _q, _s);
    arrowMesh.setMatrixAt(i, _m4);
  }
  arrowMesh.instanceMatrix.needsUpdate = true;
}

/* ============================================================
   RK2 STREAMLINES OF THE CURL FIELD
   ============================================================ */
const streamGroup = new THREE.Group();
scene.add(streamGroup);
let streamDirty = true;

function integrateStreamline(seed, fn) {
  const pts = [seed.clone()];
  let p = seed.clone();
  const dt = 0.05;
  for (let i = 0; i < 70; i++) {
    const k1 = computeCurl(fn, p.x, p.y, p.z, state.t);
    if (k1.length() < 1e-6) break;
    const mid = p.clone().addScaledVector(k1, dt * 0.5);
    const k2 = computeCurl(fn, mid.x, mid.y, mid.z, state.t);
    const next = p.clone().addScaledVector(k2, dt);
    if (next.length() > 3.0) break;
    pts.push(next);
    p = next;
  }
  return pts;
}

function buildStreamlines() {
  disposeGroup(streamGroup);
  streamDirty = false;
  if (!state.showStream) return;

  const fn = activeFieldFn();
  const n = Math.min(state.density, 6);
  const span = 1.8;
  const step = n > 1 ? (2 * span) / (n - 1) : 0;
  const mat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.75 });

  let count = 0;
  for (let i = 0; i < n && count < 30; i++) {
    for (let j = 0; j < n && count < 30; j++) {
      for (const y of [0, -0.9, 0.9]) {
        if (count >= 30) break;
        const seed = V(-span + i * step, y, -span + j * step);
        const pts = integrateStreamline(seed, fn);
        if (pts.length < 3) continue;
        streamGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
        count++;
      }
    }
  }
}

/* ============================================================
   PADDLEWHEEL PROBE
   ============================================================ */
const paddle = new THREE.Group();
scene.add(paddle);

const paddleBlades = new THREE.Group();
const paddleMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.5
});
paddle.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), paddleMat));
for (let i = 0; i < 4; i++) {
  const holder = new THREE.Group();
  holder.rotation.y = (i * Math.PI) / 2;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.1), paddleMat);
  blade.position.set(0.25, 0, 0);
  holder.add(blade);
  paddleBlades.add(holder);
}
paddle.add(paddleBlades);

const paddleReadout = document.getElementById('paddle-readout');

function axisVector() {
  if (state.axis === 'x') return V(1, 0, 0);
  if (state.axis === 'y') return V(0, 1, 0);
  return V(0, 0, 1);
}

function updatePaddle(dt) {
  const fn = activeFieldFn();
  const p = state.probe;
  const F = fn(p.x, p.y, p.z, state.t);
  const curl = computeCurl(fn, p.x, p.y, p.z, state.t);
  const nHat = axisVector();
  const rate = curl.dot(nHat);

  paddle.position.set(p.x, p.y, p.z);
  paddle.quaternion.setFromUnitVectors(V(0, 1, 0), nHat);
  paddleBlades.rotation.y += rate * dt * 1.5;

  paddleReadout.textContent =
    `probe  (${fmtNum(p.x)}, ${fmtNum(p.y)}, ${fmtNum(p.z)})\n` +
    `F      ${fmtVec(F)}\n` +
    `∇×F    ${fmtVec(curl)}\n` +
    `(∇×F)·n̂ = ${fmtNum(rate)}`;
}

/* ============================================================
   INTEGRATION GEOMETRY + NUMERICAL INTEGRALS
   ============================================================ */
const integGroup = new THREE.Group();
integGroup.rotation.order = 'YXZ';
scene.add(integGroup);

const normalsGroup = new THREE.Group();
scene.add(normalsGroup);

let integSamples = [];
let integLoop = [];

function transformPoint(p) {
  const v = p.clone();
  v.applyAxisAngle(V(0, 1, 0), deg(state.spin));
  v.applyAxisAngle(V(1, 0, 0), deg(state.tilt));
  v.add(V(state.spos.x, state.spos.y, state.spos.z));
  return v;
}

function transformDir(d) {
  const v = d.clone();
  v.applyAxisAngle(V(0, 1, 0), deg(state.spin));
  v.applyAxisAngle(V(1, 0, 0), deg(state.tilt));
  return v;
}

function buildIntegral() {
  disposeGroup(integGroup);
  disposeGroup(normalsGroup);
  integSamples = [];
  integLoop = [];

  integGroup.position.set(state.spos.x, state.spos.y, state.spos.z);
  integGroup.rotation.y = deg(state.spin);
  integGroup.rotation.x = deg(state.tilt);

  if (state.surface === 'none') return;

  const R = state.R;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, transparent: true, opacity: 0.12,
    side: THREE.DoubleSide, roughness: 0.6, metalness: 0.1, depthWrite: false
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 });

  if (state.surface === 'sphere') {
    integGroup.add(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), mat));
    integGroup.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(R, 16, 12)), edgeMat
    ));
    const NT = 20, NP = 32;
    for (let i = 0; i < NT; i++) {
      const th1 = (i / NT) * Math.PI, th2 = ((i + 1) / NT) * Math.PI;
      const thm = (th1 + th2) / 2;
      for (let j = 0; j < NP; j++) {
        const ph1 = (j / NP) * Math.PI * 2, ph2 = ((j + 1) / NP) * Math.PI * 2;
        const phm = (ph1 + ph2) / 2;
        const dir = V(Math.sin(thm) * Math.cos(phm), Math.cos(thm), Math.sin(thm) * Math.sin(phm));
        const p = dir.clone().multiplyScalar(R);
        const dA = R * R * Math.sin(thm) * (th2 - th1) * (ph2 - ph1);
        integSamples.push({ p: transformPoint(p), n: transformDir(dir), dA });
      }
    }
  } else if (state.surface === 'cylinder') {
    integGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * R, 32, 1, false), mat));
    integGroup.add(new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.CylinderGeometry(R, R, 2 * R, 16, 4)), edgeMat
    ));
    const NP = 32, NY = 12;
    for (let j = 0; j < NP; j++) {
      const ph1 = (j / NP) * Math.PI * 2, ph2 = ((j + 1) / NP) * Math.PI * 2;
      const phm = (ph1 + ph2) / 2;
      for (let i = 0; i < NY; i++) {
        const y1 = -R + (i / NY) * 2 * R, y2 = -R + ((i + 1) / NY) * 2 * R;
        const ym = (y1 + y2) / 2;
        const p = V(R * Math.cos(phm), ym, R * Math.sin(phm));
        const n = V(Math.cos(phm), 0, Math.sin(phm));
        integSamples.push({ p: transformPoint(p), n: transformDir(n), dA: R * (ph2 - ph1) * (y2 - y1) });
      }
    }
    const NR = 8;
    for (const sgn of [1, -1]) {
      for (let i = 0; i < NR; i++) {
        const r1 = (i / NR) * R, r2 = ((i + 1) / NR) * R, rm = (r1 + r2) / 2;
        for (let j = 0; j < NP; j++) {
          const ph1 = (j / NP) * Math.PI * 2, ph2 = ((j + 1) / NP) * Math.PI * 2;
          const phm = (ph1 + ph2) / 2;
          const p = V(rm * Math.cos(phm), sgn * R, rm * Math.sin(phm));
          integSamples.push({
            p: transformPoint(p), n: transformDir(V(0, sgn, 0)),
            dA: rm * (r2 - r1) * (ph2 - ph1)
          });
        }
      }
    }
  } else if (state.surface === 'cube') {
    integGroup.add(new THREE.Mesh(new THREE.BoxGeometry(2 * R, 2 * R, 2 * R), mat));
    integGroup.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * R, 2 * R, 2 * R)), edgeMat
    ));
    const N = 8;
    const faces = [
      { n: V(1, 0, 0), axis: 'x' }, { n: V(-1, 0, 0), axis: 'x' },
      { n: V(0, 1, 0), axis: 'y' }, { n: V(0, -1, 0), axis: 'y' },
      { n: V(0, 0, 1), axis: 'z' }, { n: V(0, 0, -1), axis: 'z' }
    ];
    for (const f of faces) {
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const u1 = -R + (i / N) * 2 * R, u2 = -R + ((i + 1) / N) * 2 * R;
          const v1 = -R + (j / N) * 2 * R, v2 = -R + ((j + 1) / N) * 2 * R;
          const um = (u1 + u2) / 2, vm = (v1 + v2) / 2;
          let p;
          if (f.axis === 'x') p = V(f.n.x * R, um, vm);
          else if (f.axis === 'y') p = V(um, f.n.y * R, vm);
          else p = V(um, vm, f.n.z * R);
          integSamples.push({
            p: transformPoint(p), n: transformDir(f.n),
            dA: (u2 - u1) * (v2 - v1)
          });
        }
      }
    }
  } else if (state.surface === 'sheet') {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R), mat);
    sheet.rotation.x = -Math.PI / 2;
    integGroup.add(sheet);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(2 * R, 2 * R)), edgeMat
    );
    edge.rotation.x = -Math.PI / 2;
    integGroup.add(edge);
    const N = 12;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const u1 = -R + (i / N) * 2 * R, u2 = -R + ((i + 1) / N) * 2 * R;
        const v1 = -R + (j / N) * 2 * R, v2 = -R + ((j + 1) / N) * 2 * R;
        const um = (u1 + u2) / 2, vm = (v1 + v2) / 2;
        integSamples.push({
          p: transformPoint(V(um, 0, vm)), n: transformDir(V(0, 1, 0)),
          dA: (u2 - u1) * (v2 - v1)
        });
      }
    }
  } else if (state.surface === 'loop-circle') {
    const pts = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(V(R * Math.cos(a), 0, R * Math.sin(a)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    integGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 96, 0.022, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.5
      })
    ));
    for (let i = 0; i < N; i++) {
      const a1 = (i / N) * Math.PI * 2, a2 = ((i + 1) / N) * Math.PI * 2;
      const p1 = transformPoint(V(R * Math.cos(a1), 0, R * Math.sin(a1)));
      const p2 = transformPoint(V(R * Math.cos(a2), 0, R * Math.sin(a2)));
      integLoop.push({ a: p1, b: p2 });
    }
  } else if (state.surface === 'loop-rect') {
    const corners = [
      V(-R, 0, -R), V(R, 0, -R), V(R, 0, R), V(-R, 0, R)
    ];
    const N = 24;
    for (let c = 0; c < 4; c++) {
      const a = corners[c], b = corners[(c + 1) % 4];
      for (let i = 0; i < N; i++) {
        const t1 = i / N, t2 = (i + 1) / N;
        const p1 = transformPoint(a.clone().lerp(b, t1));
        const p2 = transformPoint(a.clone().lerp(b, t2));
        integLoop.push({ a: p1, b: p2 });
      }
    }
    const pts = corners.map((c) => transformPoint(c));
    pts.push(pts[0]);
    integGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 })
    ));
  }

  if (state.showNormals) {
    const nMat = new THREE.MeshStandardMaterial({
      color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.2
    });
    const geo = new THREE.ConeGeometry(0.035, 0.16, 8);
    geo.translate(0, 0.08, 0);
    const stride = Math.max(1, Math.floor(integSamples.length / 60));
    for (let i = 0; i < integSamples.length; i += stride) {
      const s = integSamples[i];
      const m = new THREE.Mesh(geo, nMat);
      m.position.copy(s.p);
      m.quaternion.setFromUnitVectors(V(0, 1, 0), s.n);
      normalsGroup.add(m);
    }
  }
}

function computeFlux() {
  const fn = activeFieldFn();
  let total = 0;
  for (const s of integSamples) {
    const F = fn(s.p.x, s.p.y, s.p.z, state.t);
    total += F.dot(s.n) * s.dA;
  }
  return total;
}

function computeCirculation() {
  const fn = activeFieldFn();
  let total = 0;
  for (const seg of integLoop) {
    const mid = seg.a.clone().add(seg.b).multiplyScalar(0.5);
    const F = fn(mid.x, mid.y, mid.z, state.t);
    const dL = seg.b.clone().sub(seg.a);
    total += F.dot(dL);
  }
  return total;
}

/* ============================================================
   KATEX + HUD
   ============================================================ */
function renderTex(el, tex) {
  if (!el) return;
  if (typeof window.katex === 'undefined') {
    el.textContent = tex;
    return;
  }
  try {
    window.katex.render(tex, el, { throwOnError: false, displayMode: false });
  } catch (e) {
    el.textContent = tex;
  }
}

const hudTitle = document.getElementById('hud-title');
const hudIntegral = document.getElementById('hud-integral');
const hudDifferential = document.getElementById('hud-differential');
const hudCurl = document.getElementById('hud-curl');
const hudDiv = document.getElementById('hud-div');
const hudQty = document.getElementById('hud-qty');
const hudValue = document.getElementById('hud-value');
const hudBadge = document.getElementById('hud-badge');
const hudNote = document.getElementById('hud-note');
const hudLegend = document.getElementById('hud-legend');

function updateHUD() {
  const p = presetObj();
  const law = LAWS[p.law];
  const layer = currentLayer();
  const fn = layer.fn;
  const pr = state.probe;

  hudTitle.textContent = `${p.label} — ${law.name}`;
  renderTex(hudIntegral, law.integral);
  renderTex(hudDifferential, law.differential);

  const curl = computeCurl(fn, pr.x, pr.y, pr.z, state.t);
  const div = computeDiv(fn, pr.x, pr.y, pr.z, state.t);
  hudCurl.textContent = fmtVec(curl);
  hudDiv.textContent = fmtNum(div);

  hudQty.textContent = law.qtyText;

  let value = 0;
  let unit = p.integralUnit;
  if (law.kind === 'flux') {
    value = computeFlux();
    if (state.surface === 'none') value = 0;
  } else {
    value = computeCirculation();
    if (state.surface === 'none') value = 0;
  }

  hudValue.textContent = fmtNum(value);
  const a = Math.abs(value);
  hudBadge.className = 'badge ' + (a < 1e-6 ? 'zero' : value > 0 ? 'pos' : 'neg');
  hudBadge.textContent = a < 1e-6 ? 'zero' : value > 0 ? 'positive' : 'negative';

  const notes = [];
  if (state.surface === 'none') {
    notes.push('No integration surface selected — pick a geometry to evaluate the integral.');
  } else {
    notes.push(`Numerically integrated over ${integSamples.length || integLoop.length} samples (unit: ${unit}).`);
  }
  if (p.law === 'gaussE' && state.preset === '2A') {
    const dphi = deg(state.extra);
    const psi = (LAMBDA * dphi) / (2 * Math.PI * EPS0);
    notes.push(`Strip flux per unit length: Ψ/L = λΔφ/(2πε₀) = ${fmtNum(psi)} V·m for Δφ = ${state.extra}°.`);
  }
  if (p.law === 'gaussB') notes.push('Net magnetic flux through any closed surface is zero (no monopoles).');
  hudNote.textContent = notes.join(' ');

  hudLegend.innerHTML = '';
  for (const l of p.layers) {
    const span = document.createElement('span');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = '#' + l.color.toString(16).padStart(6, '0');
    span.appendChild(dot);
    span.appendChild(document.createTextNode(l.label));
    hudLegend.appendChild(span);
  }
}

/* ============================================================
   PRESET / LAYER UI
   ============================================================ */
const presetSelect = document.getElementById('preset-select');
const presetHint = document.getElementById('preset-hint');
const layerSelect = document.getElementById('layer-select');
const extraSec = document.getElementById('extra-sec');
const extraLabel = document.getElementById('extra-label');
const extraVal = document.getElementById('extra-val');
const extraSlider = document.getElementById('extra-slider');

for (const key in PRESETS) {
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = PRESETS[key].label;
  presetSelect.appendChild(opt);
}

function fillLayers() {
  layerSelect.innerHTML = '';
  const p = presetObj();
  for (const l of p.layers) {
    const opt = document.createElement('option');
    opt.value = l.key;
    opt.textContent = l.label;
    layerSelect.appendChild(opt);
  }
  layerSelect.value = state.layer;
}

function applyPreset(key) {
  state.preset = key;
  const p = PRESETS[key];
  state.layer = p.primary;
  presetHint.textContent = p.hint;
  fillLayers();
  extraSec.style.display = p.extras ? 'block' : 'none';
  if (p.extras) {
    extraLabel.textContent = 'Δφ';
    extraSlider.value = state.extra;
    extraVal.textContent = state.extra + '°';
  }
  rebuildArrows();
  buildStreamlines();
  updateHUD();
}

presetSelect.addEventListener('change', () => applyPreset(presetSelect.value));
layerSelect.addEventListener('change', () => {
  state.layer = layerSelect.value;
  rebuildArrows();
  buildStreamlines();
  updateHUD();
});
extraSlider.addEventListener('input', () => {
  state.extra = Number(extraSlider.value);
  extraVal.textContent = state.extra + '°';
  updateHUD();
});

/* ============================================================
   LEFT PANEL CONTROLS
   ============================================================ */
function bindRange(id, key, apply, fmt) {
  const el = document.getElementById(id);
  const out = document.getElementById(id + '-val');
  el.addEventListener('input', () => {
    const v = Number(el.value);
    apply(v);
    if (out) out.textContent = fmt ? fmt(v) : v.toFixed(2);
  });
}

bindRange('density', 'density', (v) => {
  state.density = v;
  rebuildArrows();
  buildStreamlines();
});
bindRange('probe-x', 'probe-x', (v) => { state.probe.x = v; });
bindRange('probe-y', 'probe-y', (v) => { state.probe.y = v; });
bindRange('probe-z', 'probe-z', (v) => { state.probe.z = v; });
bindRange('R', 'R', (v) => { state.R = v; buildIntegral(); updateHUD(); });
bindRange('sx', 'sx', (v) => { state.spos.x = v; buildIntegral(); updateHUD(); });
bindRange('sy', 'sy', (v) => { state.spos.y = v; buildIntegral(); updateHUD(); });
bindRange('sz', 'sz', (v) => { state.spos.z = v; buildIntegral(); updateHUD(); });
bindRange('tilt', 'tilt', (v) => { state.tilt = v; buildIntegral(); updateHUD(); }, (v) => String(v));
bindRange('spin', 'spin', (v) => { state.spin = v; buildIntegral(); updateHUD(); }, (v) => String(v));

document.getElementById('axis-select').addEventListener('change', (e) => {
  state.axis = e.target.value;
});

document.getElementById('surface-select').addEventListener('change', (e) => {
  state.surface = e.target.value;
  buildIntegral();
  updateHUD();
});

document.getElementById('chk-normals').addEventListener('change', (e) => {
  state.showNormals = e.target.checked;
  buildIntegral();
});
document.getElementById('chk-arrows').addEventListener('change', (e) => {
  state.showArrows = e.target.checked;
  rebuildArrows();
});
document.getElementById('chk-stream').addEventListener('change', (e) => {
  state.showStream = e.target.checked;
  buildStreamlines();
});

document.getElementById('grid-select').addEventListener('change', (e) => {
  setGrid(e.target.value);
});

/* ============================================================
   TOP BAR CONTROLS
   ============================================================ */
const btnPlay = document.getElementById('btn-play');
btnPlay.addEventListener('click', () => {
  state.playing = !state.playing;
  btnPlay.textContent = state.playing ? 'Pause' : 'Play';
  btnPlay.classList.toggle('active', state.playing);
});

const omegaSlider = document.getElementById('omega');
const omegaVal = document.getElementById('omega-val');
omegaSlider.addEventListener('input', () => {
  state.omega = Number(omegaSlider.value);
  omegaVal.textContent = state.omega.toFixed(2);
});

document.getElementById('btn-reset-cam').addEventListener('click', () => {
  camera.position.set(4.8, 3.8, 5.8);
  controls.target.set(0, 0, 0);
  controls.update();
});

document.querySelectorAll('#topbar .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#topbar .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.cat = tab.dataset.cat;
    const first = Object.keys(PRESETS).find((k) => PRESETS[k].cat === state.cat);
    if (first) {
      presetSelect.value = first;
      applyPreset(first);
    }
  });
});

/* ============================================================
   RIGHT DRAWER — MAXWELL CARDS
   ============================================================ */
const MAXWELL = [
  {
    title: "Gauss's Law (E)",
    integral: '\\oint_{\\partial V}\\mathbf{D}\\cdot d\\mathbf{s} = Q_{\\text{enc}}',
    differential: '\\nabla\\cdot\\mathbf{D} = \\rho',
    phasor: '\\nabla\\cdot\\mathbf{D} = \\rho',
    bridge: 'Flux of D out of a closed surface equals enclosed free charge.'
  },
  {
    title: "Gauss's Law (B)",
    integral: '\\oint_{\\partial V}\\mathbf{B}\\cdot d\\mathbf{s} = 0',
    differential: '\\nabla\\cdot\\mathbf{B} = 0',
    phasor: '\\nabla\\cdot\\mathbf{B} = 0',
    bridge: 'No magnetic monopoles — B lines close on themselves.'
  },
  {
    title: "Faraday's Law",
    integral: '\\oint_{\\partial S}\\mathbf{E}\\cdot d\\mathbf{L} = -\\dfrac{d\\Phi_B}{dt}',
    differential: '\\nabla\\times\\mathbf{E} = -\\dfrac{\\partial\\mathbf{B}}{\\partial t}',
    phasor: '\\nabla\\times\\mathbf{E} = -j\\omega\\mathbf{B}',
    bridge: 'Changing magnetic flux induces circulating E.'
  },
  {
    title: 'Ampère–Maxwell Law',
    integral: '\\oint_{\\partial S}\\mathbf{H}\\cdot d\\mathbf{L} = I_{\\text{enc}} + \\dfrac{d\\Phi_D}{dt}',
    differential: '\\nabla\\times\\mathbf{H} = \\mathbf{J} + \\dfrac{\\partial\\mathbf{D}}{\\partial t}',
    phasor: '\\nabla\\times\\mathbf{H} = \\mathbf{J} + j\\omega\\mathbf{D}',
    bridge: 'Conduction plus displacement current source H circulation.'
  }
];

const maxwellCards = document.getElementById('maxwell-cards');
const segForm = document.getElementById('seg-form');
const segTime = document.getElementById('seg-time');
const drawerState = { form: 'integral', time: 'td' };

function renderMaxwell() {
  maxwellCards.innerHTML = '';
  for (const m of MAXWELL) {
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = m.title;
    card.appendChild(title);

    const eq = document.createElement('div');
    eq.className = 'eq';
    let tex;
    if (drawerState.form === 'integral') tex = m.integral;
    else tex = drawerState.time === 'phasor' ? m.phasor : m.differential;
    renderTex(eq, tex);
    card.appendChild(eq);

    const bridge = document.createElement('div');
    bridge.className = 'bridge';
    bridge.textContent = m.bridge;
    card.appendChild(bridge);
    maxwellCards.appendChild(card);
  }
}

segForm.querySelectorAll('button').forEach((b) => {
  b.addEventListener('click', () => {
    segForm.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    drawerState.form = b.dataset.form;
    renderMaxwell();
  });
});
segTime.querySelectorAll('button').forEach((b) => {
  b.addEventListener('click', () => {
    segTime.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    drawerState.time = b.dataset.time;
    renderMaxwell();
  });
});

const constitutive = document.getElementById('constitutive');
[
  '\\mathbf{D} = \\varepsilon_0\\mathbf{E}',
  '\\mathbf{B} = \\mu_0\\mathbf{H}',
  '\\mathbf{J} = \\sigma\\mathbf{E}'
].forEach((tex) => {
  const eq = document.createElement('div');
  eq.className = 'eq';
  renderTex(eq, tex);
  constitutive.appendChild(eq);
});

/* ============================================================
   RIGHT DRAWER — DUALITY TABLE
   ============================================================ */
const DUALITY = [
  ['Field', '\\mathbf{E}', '\\mathbf{H}'],
  ['Flux density', '\\mathbf{D} = \\varepsilon\\mathbf{E}', '\\mathbf{B} = \\mu\\mathbf{H}'],
  ['Source', '\\rho_e', '\\rho_m'],
  ['Current', '\\mathbf{J}_e', '\\mathbf{J}_m'],
  ['Gauss law', '\\nabla\\cdot\\mathbf{D} = \\rho_e', '\\nabla\\cdot\\mathbf{B} = \\rho_m'],
  ['Faraday / Ampère', '\\nabla\\times\\mathbf{E} = -\\partial_t\\mathbf{B} - \\mathbf{J}_m', '\\nabla\\times\\mathbf{H} = \\partial_t\\mathbf{D} + \\mathbf{J}_e'],
  ['Impedance', '\\eta = \\sqrt{\\mu/\\varepsilon}', '\\eta^{-1} = \\sqrt{\\varepsilon/\\mu}']
];

const dualityBody = document.getElementById('duality-body');
for (const row of DUALITY) {
  const tr = document.createElement('tr');
  const td0 = document.createElement('td');
  td0.className = 'k';
  td0.textContent = row[0];
  tr.appendChild(td0);
  const td1 = document.createElement('td');
  td1.className = 'e';
  renderTex(td1, row[1]);
  tr.appendChild(td1);
  const td2 = document.createElement('td');
  td2.className = 'm';
  renderTex(td2, row[2]);
  tr.appendChild(td2);
  dualityBody.appendChild(tr);
}

/* ============================================================
   RIGHT DRAWER — COORDINATE CONVERTER
   ============================================================ */
const convSystem = document.getElementById('conv-system');
const convA = document.getElementById('conv-a');
const convB = document.getElementById('conv-b');
const convC = document.getElementById('conv-c');
const convL1 = document.getElementById('conv-l1');
const convL2 = document.getElementById('conv-l2');
const convL3 = document.getElementById('conv-l3');
const convOut = document.getElementById('conv-out');

function updateConvLabels() {
  if (convSystem.value === 'rect') { convL1.textContent = 'x'; convL2.textContent = 'y'; convL3.textContent = 'z'; }
  else if (convSystem.value === 'cyl') { convL1.textContent = 'r'; convL2.textContent = 'φ (deg)'; convL3.textContent = 'z'; }
  else { convL1.textContent = 'r'; convL2.textContent = 'θ (deg)'; convL3.textContent = 'φ (deg)'; }
}

function toCartesian(sys, a, b, c) {
  if (sys === 'rect') return V(a, b, c);
  if (sys === 'cyl') return V(a * Math.cos(deg(b)), c, a * Math.sin(deg(b)));
  return sphToCart(a, b, c);
}

function updateConv() {
  const sys = convSystem.value;
  const a = Number(convA.value), b = Number(convB.value), c = Number(convC.value);
  const p = toCartesian(sys, a, b, c);
  const r = p.length();
  const rho = Math.hypot(p.x, p.z);
  const phi = Math.atan2(p.z, p.x);
  const theta = r > 1e-9 ? Math.acos(p.y / r) : 0;
  convOut.textContent =
    `Cartesian:   (${fmtNum(p.x)}, ${fmtNum(p.y)}, ${fmtNum(p.z)})\n` +
    `Cylindrical: (r=${fmtNum(rho)}, φ=${fmtNum(phi * 180 / Math.PI)}°, z=${fmtNum(p.z)})\n` +
    `Spherical:   (r=${fmtNum(r)}, θ=${fmtNum(theta * 180 / Math.PI)}°, φ=${fmtNum(phi * 180 / Math.PI)}°)`;
  return p;
}

convSystem.addEventListener('change', () => { updateConvLabels(); updateConv(); });
[convA, convB, convC].forEach((el) => el.addEventListener('input', updateConv));

document.getElementById('conv-jump').addEventListener('click', () => {
  const p = updateConv();
  state.probe.x = THREE.MathUtils.clamp(p.x, -2.5, 2.5);
  state.probe.y = THREE.MathUtils.clamp(p.y, -2.5, 2.5);
  state.probe.z = THREE.MathUtils.clamp(p.z, -2.5, 2.5);
  document.getElementById('probe-x').value = state.probe.x;
  document.getElementById('probe-y').value = state.probe.y;
  document.getElementById('probe-z').value = state.probe.z;
  document.getElementById('probe-x-val').textContent = state.probe.x.toFixed(2);
  document.getElementById('probe-y-val').textContent = state.probe.y.toFixed(2);
  document.getElementById('probe-z-val').textContent = state.probe.z.toFixed(2);
  controls.target.copy(p);
  camera.position.copy(p).add(V(3.5, 2.8, 4.2));
  controls.update();
});

/* ============================================================
   RIGHT DRAWER — SUPERPOSITION SANDBOX
   ============================================================ */
const chargeOut = document.getElementById('charge-out');
const chargeIds = ['q1', 'q2', 'q3'];
const posIds = [['c1a', 'c1b', 'c1c'], ['c2a', 'c2b', 'c2c'], ['c3a', 'c3b', 'c3c']];

function readCharges() {
  const list = [];
  for (let i = 0; i < 3; i++) {
    const q = Number(document.getElementById(chargeIds[i]).value) * 1e-9;
    const p = V(
      Number(document.getElementById(posIds[i][0]).value),
      Number(document.getElementById(posIds[i][1]).value),
      Number(document.getElementById(posIds[i][2]).value)
    );
    if (q !== 0) list.push({ q, p });
  }
  return list;
}

function updateCharges() {
  const charges = readCharges();
  const fn = makePointChargeField(charges);
  const pr = state.probe;
  const E = fn(pr.x, pr.y, pr.z, state.t);
  const lines = [`Probe E at (${fmtNum(pr.x)}, ${fmtNum(pr.y)}, ${fmtNum(pr.z)}):`];
  lines.push(`  |E| = ${fmtNum(E.length())} V/m`);
  lines.push(`  E   = ${fmtVec(E)}`);
  for (const c of charges) {
    const R = V(pr.x - c.p.x, pr.y - c.p.y, pr.z - c.p.z);
    const r = R.length();
    const Ei = r > 1e-9 ? R.clone().multiplyScalar(KE * c.q / (r * r * r)) : V(0, 0, 0);
    lines.push(`  Q=${fmtNum(c.q * 1e9)} nC at (${fmtNum(c.p.x)}, ${fmtNum(c.p.y)}, ${fmtNum(c.p.z)}): E_i = ${fmtVec(Ei)}`);
  }
  chargeOut.textContent = lines.join('\n');
}

[...chargeIds, ...posIds.flat()].forEach((id) => {
  document.getElementById(id).addEventListener('input', updateCharges);
});

/* ============================================================
   DRAWER TOGGLE + TABS
   ============================================================ */
const drawer = document.getElementById('drawer');
const drawerToggle = document.getElementById('drawer-toggle');
drawerToggle.addEventListener('click', () => {
  drawer.classList.toggle('collapsed');
  drawerToggle.innerHTML = drawer.classList.contains('collapsed') ? '&lsaquo;' : '&rsaquo;';
});

document.querySelectorAll('.dtab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dtab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.dpanel').forEach((p) => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + tab.dataset.panel);
    if (panel) panel.classList.add('active');
  });
});

/* ============================================================
   RESIZE + RENDER LOOP
   ============================================================ */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.playing) state.t += dt * state.omega;

  const p = presetObj();
  if (p.dynamic) {
    updateArrows();
    if (state.showStream) buildStreamlines();
    updateHUD();
  }
  updatePaddle(dt);
  controls.update();
  renderer.render(scene, camera);
}

/* ============================================================
   BOOT
   ============================================================ */
state.extra = 60;
setGrid(state.grid);
applyPreset(state.preset);
buildIntegral();
updateConvLabels();
updateConv();
updateCharges();
renderMaxwell();
animate();
