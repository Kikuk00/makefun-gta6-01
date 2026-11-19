// Round 2 effects: one small particle pool for everything that puffs, flashes or
// sparks — tire smoke on handbrake turns, exhaust, crash sparks, muzzle flashes and
// the cash-pickup sparkle. Cheap box meshes, recycled, no allocations per frame.
import * as THREE from 'three';

const POOL = 90;

export function createEffects(G) {
  const meshes = [];
  const parts = [];
  const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  for (let i = 0; i < POOL; i += 1) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    G.scene.add(mesh);
    meshes.push(mesh);
    parts.push({ mesh, life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0 });
  }
  let next = 0;

  function spawn(x, y, z, color, count, speed, life, grow) {
    for (let i = 0; i < count; i += 1) {
      const p = parts[next];
      next = (next + 1) % POOL;
      p.mesh.visible = true;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 0.9;
      p.mesh.position.set(x, y, z);
      const a = G.rng() * Math.PI * 2;
      const s = speed * (0.4 + G.rng() * 0.8);
      p.vx = Math.sin(a) * s;
      p.vz = Math.cos(a) * s;
      p.vy = speed * 0.5 * G.rng();
      p.life = life * (0.7 + G.rng() * 0.6);
      p.max = p.life;
      p.grow = grow;
    }
  }

  // A muzzle flash: a bright yellow-white burst at the gun, gone in a blink.
  function muzzleFlash(x, y, z) {
    spawn(x, y, z, 0xffe14d, 5, 2, 0.09, 2.2);
    spawn(x, y, z, 0xff8a2a, 3, 1.2, 0.12, 1.6);
  }

  // Grey tire smoke, kicked up behind a drifting car.
  function tireSmoke(x, y, z) {
    spawn(x, y, z, 0xbbbbbb, 2, 1.4, 0.7, 3.5);
  }

  // Dark exhaust puffs behind a hard-accelerating car.
  function exhaust(x, y, z) {
    spawn(x, y, z, 0x555555, 1, 0.8, 0.5, 2.5);
  }

  // Orange sparks and grey smoke from a crash.
  function crashSparks(x, y, z) {
    spawn(x, y, z, 0xffa02a, 8, 5, 0.4, 1.2);
    spawn(x, y, z, 0x777777, 4, 1.6, 0.8, 3);
  }

  // Gold sparkle when cash or a package is picked up.
  function goldSparkle(x, y, z) {
    spawn(x, y, z, 0xffd23c, 10, 2.5, 0.7, 1.8);
  }

  function update(dt) {
    for (const p of parts) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; p.mesh.material.opacity = 0; continue; }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy += 0.6 * dt;
      const s = 1 + (1 - p.life / p.max) * p.grow;
      p.mesh.scale.setScalar(s);
      p.mesh.material.opacity = 0.9 * (p.life / p.max);
    }
  }

  return { update, muzzleFlash, tireSmoke, exhaust, crashSparks, goldSparkle };
}
