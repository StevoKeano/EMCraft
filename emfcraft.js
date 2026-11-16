import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================================
   CONSTANTS
   ============================================================ */
const KE   = 8.9875517923e9;      // Coulomb constant  N·m²/C²
const EPS0 = 8.8541878128e-12;    // F/m
const MU0  = 1.25663706212e-6;    // H/m
const V    = (x, y, z) => new THREE.Vector3(x, y, z);
const deg  = THREE.MathUtils.degToRad;

/* ============================================================
   STATE
   ============================================================ */
const state = {
  preset: '1A',
  layer: null,
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

/* ============================================================
   COORDINATE GRIDS
   ============================================================ */
const gridGroups = {
  cartesian: new THREE.Group(),
  cylindrical: new THREE.Group(),
  spherical: new THREE.Group()
};
Object.values(gridGroups).forEach((g) => scene.add(g));

/* --- Cartesian --- */
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

/* --- Cylindrical (r, φ, y) --- */
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

/* --- Spherical (r, θ, φ) with polar axis +Y --- */
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
const K = 1.0;   // flow speed scale

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

/* --- point charges --- */
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

/* --- infinite line charge along +Z --- */
const LAMBDA = 1e-9; // C/m
function lineChargeField(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r < 0.05) return V(0, 0, 0);
  const mag = 2 * KE * LAMBDA / r;
  return V(x / r, 0, z / r).multiplyScalar(mag);
}

/* --- magnetostatic H fields (J = ∇ × H) --- */
function hCart(x, y, z, t) {
  return V(3, 7 * y, 2 * x);
}
function hCyl(x, y, z, t) {
  const r = Math.hypot(x, z);
  if (r < 1e-6) return V(0, 5, 0);
  const c = x / r, s = z / r;
  // H = 6r r̂ + 2r φ̂ + 5 ẑ   (φ̂ = (-sinφ, 0, cosφ) = (-s, 0, c))
  return V(6 * r * c + 2 * r * (-s), 5, 6 * r * s + 2 * r * c);
}

/* --- Faraday solenoid --- */
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
  return V(-s * Ephi, 0, c * Ephi);
}

/* --- Ampère–Maxwell charging capacitor --- */
const CAP_D = 0.55;   // half gap
const CAP_HW = 0.9;   // half plate width
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
  return V(-s * Hphi, 0, c * Hphi);
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
    hint: 'λ = 1 nC/m along ẑ. Flux per unit length through a strip subtending Δφ is Ψ/L = λ Δφ / (2π).',
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
    hint: 'Cartesian H = x̂ 3 + ŷ 7y + ẑ 2x → J = -ŷ 2 A/m². Cylindrical H = r̂ 6r + φ̂ 2r + ẑ 5 → J = ẑ 4 A/m².',
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
    qty: '\\Gamma_F',
    qtyText: 'Γ_F',
    kind: 'circulation'
  },
  gaussE: {
    name: "Gauss's Law for Electricity",
    integral: '\\oint_{\\partial V}\\mathbf{D}\\cdot d\\mathbf{s} = Q_{\\text{enc}} = \\varepsilon_0\\oint_{\\partial V}\\mathbf{E}\\cdot d\\mathbf{s}',
    differential: '\\nabla\\cdot\\mathbf{D} = \\rho',
    qty: '\\Phi_E',
    qtyText: 'Φ_E',
    kind: 'flux'
  },
  gaussB: {
    name: "Gauss's Law for Magnetism",
    integral: '\\oint_{\\partial V}\\mathbf{B}\\cdot d\\mathbf{s} = 0',
    differential: '\\nabla\\cdot\\mathbf{B} = 0',
    qty: '\\Phi_B',
    qtyText: 'Φ_B',
    kind: 'flux'
  },
  faraday: {
    name: "Faraday's Law",
    integral: '\\oint_{\\partial S}\\mathbf{E}\\cdot d\\mathbf{L} = -\\dfrac{d\\Phi_B}{dt}',
    differential: '\\nabla\\times\\mathbf{E} = -\\dfrac{\\partial\\mathbf{B}}{\\partial t}',
    qty: '\\Gamma_E',
    qtyText: 'Γ_E',
    kind: 'circulation'
  },
  ampere: {
    name: 'Ampère–Maxwell Law',
    integral: '\\oint_{\\partial S}\\mathbf{H}\\cdot d\\mathbf{L} = I_{\\text{enc}} + \\dfrac{d\\Phi_D}{dt}',
    differential: '\\nabla\\times\\mathbf{H} = \\mathbf{J} + \\dfrac{\\partial\\mathbf{D}}{\\partial t}',
    qty: '\\Gamma_H',
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
  wire.rotation.x = Math.PI / 2; // cylinder axis +y -> +z
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
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0