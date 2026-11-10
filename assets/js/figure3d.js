// Personnage 3D original (pas un modèle du jeu) qui porte le loadout. Chargé à la demande par le planner.
import * as THREE from "../vendor/three-0.160.0.module.min.js";

const INK = 0x101014, CRIMSON = 0x8e1c25, GOLD = 0xc9a45c;
const MAX_TURN = 1.05; // environ 60° de chaque côté : au-delà, les armes (images plates) deviennent des traits

const cloth = (c = INK, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 });

function lathe(points, mat, seg = 28, folds = 0) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  if (folds) { // plis verticaux du tissu, plus marqués vers l'ourlet
    const p = g.attributes.position, top = Math.max(...points.map((q) => q[1])), bot = Math.min(...points.map((q) => q[1]));
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = 1 + folds * ((top - y) / (top - bot)) * Math.sin(a * 9);
      p.setXYZ(i, x * k, y, z * k);
    }
    g.computeVertexNormals();
  }
  return new THREE.Mesh(g, mat);
}
function limb(r1, r2, len, mat) { // cylindre orienté vers le bas depuis son origine
  const g = new THREE.CylinderGeometry(r1, r2, len, 14); g.translate(0, -len / 2, 0);
  return new THREE.Mesh(g, mat);
}
function ribbon(points, width, mat) { // bande de tissu le long d'une courbe
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const n = 40, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPoint(t), w = width * (1 - t * 0.6);
    pos.push(p.x, p.y + w / 2, p.z, p.x, p.y - w / 2, p.z);
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = mat.clone(); m.side = THREE.DoubleSide;
  return new THREE.Mesh(g, m);
}

function buildBody() {
  const body = new THREE.Group(), dark = cloth(), robe = cloth(0x15151b, 0.95), skin = cloth(0x2a2224, 0.7);
  // jambes et bottes
  for (const x of [-0.09, 0.09]) {
    const leg = limb(0.065, 0.05, 0.62, dark); leg.position.set(x, 0.7, 0); body.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.2), dark); boot.position.set(x, 0.045, 0.03); body.add(boot);
  }
  // robe : jupe évasée, fendue par le vent
  const skirt = lathe([[0.4, 0.3], [0.36, 0.42], [0.28, 0.7], [0.2, 0.92], [0.17, 1.02]], robe, 72, 0.07);
  skirt.scale.set(1, 1, 0.8); body.add(skirt);
  const tail = lathe([[0.001, 0.25], [0.34, 0.3], [0.3, 0.6], [0.001, 0.9]], robe, 12);
  tail.scale.set(0.55, 1, 0.25); tail.position.set(-0.14, 0.02, -0.18); tail.rotation.z = -0.25; body.add(tail);
  // buste
  const torso = lathe([[0.17, 1.0], [0.19, 1.15], [0.23, 1.36], [0.2, 1.45], [0.07, 1.5]], dark);
  torso.scale.set(1, 1, 0.68); body.add(torso);
  // ceinture dorée + pan
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.182, 0.178, 0.07, 28, 1, true), cloth(GOLD, 0.5)); sash.scale.set(1, 1, 0.72); sash.position.y = 1.02; sash.material.side = THREE.DoubleSide; body.add(sash);
  body.add(ribbon([[-0.12, 1.0, 0.1], [-0.2, 0.86, 0.14], [-0.3, 0.72, 0.1], [-0.42, 0.6, 0.02]], 0.06, cloth(GOLD, 0.5)));
  // col croisé
  const collar = ribbon([[-0.08, 1.48, 0.1], [0, 1.34, 0.15], [0.07, 1.22, 0.15]], 0.035, cloth(CRIMSON, 0.6)); body.add(collar);
  // épaules
  for (const x of [-0.21, 0.21]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), dark); s.position.set(x, 1.42, 0); body.add(s); }
  // cou, tête, chignon, queue de cheval
  const neck = limb(0.045, 0.05, 0.1, skin); neck.position.y = 1.56; body.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin); head.scale.set(0.92, 1.15, 1); head.position.y = 1.65; body.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.104, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), dark); hair.scale.set(0.95, 1.15, 1.05); hair.position.set(0, 1.655, -0.006); hair.rotation.x = -0.35; body.add(hair);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), dark); knot.position.set(0, 1.79, -0.04); body.add(knot);
  body.add(ribbon([[0, 1.78, -0.07], [0.02, 1.7, -0.2], [0.08, 1.58, -0.3], [0.16, 1.46, -0.38]], 0.06, dark));
  // écharpe rouge dans le vent
  body.add(ribbon([[0.02, 1.5, -0.08], [-0.15, 1.46, -0.25], [-0.38, 1.38, -0.42], [-0.62, 1.32, -0.5]], 0.11, cloth(CRIMSON, 0.7)));
  body.add(ribbon([[0.05, 1.48, -0.1], [-0.08, 1.36, -0.32], [-0.28, 1.2, -0.5], [-0.45, 1.06, -0.62]], 0.08, cloth(CRIMSON, 0.7)));
  // bras gauche (manche large, pendant)
  const lArm = new THREE.Group(); lArm.position.set(-0.23, 1.42, 0); lArm.rotation.z = -0.18; body.add(lArm);
  lArm.add(limb(0.055, 0.05, 0.3, dark));
  const sleeve = limb(0.06, 0.13, 0.32, robe); sleeve.position.y = -0.26; sleeve.material = sleeve.material.clone(); sleeve.material.side = THREE.DoubleSide; lArm.add(sleeve);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), skin); lHand.position.y = -0.6; lArm.add(lHand);
  // bras droit (tient l'arme principale)
  const rArm = new THREE.Group(); rArm.position.set(0.23, 1.42, 0); rArm.rotation.set(-0.15, 0, 0.32); body.add(rArm);
  rArm.add(limb(0.055, 0.048, 0.3, dark));
  const fore = new THREE.Group(); fore.position.y = -0.3; fore.rotation.set(-0.45, 0, -0.18); rArm.add(fore);
  fore.add(limb(0.048, 0.04, 0.27, dark));
  const hand = new THREE.Group(); hand.position.y = -0.3; fore.add(hand);
  hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin));
  return { body, hand };
}

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(160,190,230,.55)"); g.addColorStop(1, "rgba(160,190,230,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shadowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,.75)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

export function mount(el) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "fig3d";
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 240 / 420, 0.1, 20);
  camera.position.set(0, 1.05, 4.9); camera.lookAt(0, 1.0, 0);

  scene.add(new THREE.HemisphereLight(0x8a96b0, 0x1a0c0e, 0.8));
  const key = new THREE.DirectionalLight(0xe8e4f0, 1.6); key.position.set(2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3344, 4.5); rim.position.set(-2.5, 2, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x86a6cb, 2.2); rim2.position.set(3, 1.5, -2.5); scene.add(rim2);

  const root = new THREE.Group(); scene.add(root);
  const { body, hand } = buildBody(); root.add(body);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.6), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; root.add(shadow);

  const slots = { held: new THREE.Group(), back: new THREE.Group(), ph1: new THREE.Group(), ph2: new THREE.Group() };
  hand.add(slots.held); slots.held.rotation.set(0.35, 0, 0.1);
  slots.back.position.set(0, 1.18, -0.19); slots.back.rotation.z = 0.62; body.add(slots.back);
  slots.ph1.position.set(-0.5, 1.62, 0.12); root.add(slots.ph1);
  slots.ph2.position.set(0.52, 1.74, -0.05); root.add(slots.ph2);
  const glow = glowTexture();
  for (const k of ["ph1", "ph2"]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, depthWrite: false, transparent: true })); s.scale.set(0.5, 0.5, 1); s.material.opacity = 0.6; s.renderOrder = -1; slots[k].add(s); }

  const loader = new THREE.TextureLoader(), cache = new Map();
  const texture = (url) => {
    if (!cache.has(url)) cache.set(url, new Promise((ok) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; ok(t); }, undefined, () => ok(null))));
    return cache.get(url);
  };
  // plan texturé dont l'origine est le point de prise (grip) de l'arme
  async function weapon(slot, it, len, opts = {}) {
    const g = slot.userData.mesh; if (g) { slot.remove(g); g.geometry.dispose(); g.material.dispose(); slot.userData.mesh = null; }
    if (!it) return;
    const id = (slot.userData.id = it.url), t = await texture(it.url);
    if (!t || slot.userData.id !== id) return;
    const [gx, gy, ar] = it.grip || [0.5, 0.5, t.image.width / t.image.height];
    const h = ar > 1 ? len / ar : len, w = h * ar;
    const geo = new THREE.PlaneGeometry(w, h);
    if (!opts.center) geo.translate(-(gx - 0.5) * w, -(0.5 - gy) * h, 0);
    const mat = opts.ghost
      ? new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.92, color: 0xdfe9ff, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.25, color: opts.dim ? 0x9a9a9a : 0xffffff });
    const m = new THREE.Mesh(geo, mat); slot.add(m); slot.userData.mesh = m;
  }

  let turn = 0.35, vel = 0, drag = null, idle = 0, visible = true, raf = 0, last = performance.now();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, t: turn }; canvas.setPointerCapture(e.pointerId); idle = 0; kick(); });
  canvas.addEventListener("pointermove", (e) => { if (!drag) return; const nt = drag.t + (e.clientX - drag.x) * 0.01; vel = nt - turn; turn = nt; kick(); });
  const up = () => { drag = null; }; canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); vel = e.key === "ArrowLeft" ? -0.06 : 0.06; idle = 0; kick(); } });

  function resize() {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { resize(); kick(); }).observe(el);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(el);

  function frame(now) {
    raf = 0; const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag) { turn += vel; vel *= 0.9; if (Math.abs(vel) < 1e-4) vel = 0; idle += dt; }
    if (turn > MAX_TURN) { turn = MAX_TURN; vel = 0; } if (turn < -MAX_TURN) { turn = -MAX_TURN; vel = 0; }
    if (!still && !drag && idle > 4 && !vel) turn += Math.sin(now / 2600) * 0.0012;
    root.rotation.y = turn;
    const tt = now / 1000;
    slots.ph1.position.y = 1.62 + (still ? 0 : Math.sin(tt * 1.3) * 0.035);
    slots.ph2.position.y = 1.72 + (still ? 0 : Math.sin(tt * 1.3 + 2) * 0.035);
    for (const k of ["ph1", "ph2"]) slots[k].rotation.y = -turn * 0.6; // les spectres restent tournés vers la caméra
    renderer.render(scene, camera);
    if (visible && (!still || drag || vel)) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  resize(); kick();

  return {
    update(items) { // items : [principale, secondaire, edge1, edge2] avec { url, grip }
      weapon(slots.held, items[0], items[0] && items[0].grip && items[0].grip[2] > 0.8 ? 0.75 : 1.0).then(kick);
      weapon(slots.back, items[1], 1.1, { dim: true, center: true }).then(kick);
      weapon(slots.ph1, items[2], 0.5, { ghost: true, center: true }).then(kick);
      weapon(slots.ph2, items[3], 0.5, { ghost: true, center: true }).then(kick);
    },
  };
}
