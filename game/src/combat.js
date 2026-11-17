// Combat: fists up close, a pistol once Lena hands you one, and the armed guards who
// work the harbor. Hits are hitscan rays from the player; guards shoot back on a timer.
import * as THREE from 'three';
import { PLAYER, WANTED } from './config.js';
import { createPedMesh } from './pedestrians.js';

export function createCombat(G) {
  const guards = [];
  let fireCooldown = 0;
  let punchCooldown = 0;
  let tracer = null;
  let tracerUntil = 0;

  function spawnGuard(x, z) {
    const mesh = createPedMesh(G.rng);
    mesh.group.children[0].material = new THREE.MeshLambertMaterial({ color: 0x3a2e22 });
    mesh.group.position.set(x, 0, z);
    G.scene.add(mesh.group);
    const guard = {
      mesh, pos: mesh.group.position, heading: 0, hp: 100,
      shootTimer: 1 + G.rng() * 2, dead: false, walkPhase: 0,
    };
    guards.push(guard);
    return guard;
  }

  function clearGuards() {
    for (const g of guards) G.scene.remove(g.mesh.group);
    guards.length = 0;
  }

  function rayHit(from, dir, maxDist, targets) {
    let best = null;
    let bestD = maxDist;
    for (const t of targets) {
      if (t.dead) continue;
      // Treat the target as a vertical capsule at (x, z), 1.8 m tall.
      const ox = t.pos.x - from.x;
      const oz = t.pos.z - from.z;
      const along = ox * dir.x + oz * dir.z;
      if (along < 0 || along > bestD) continue;
      const px = from.x + dir.x * along;
      const pz = from.z + dir.z * along;
      const perp = Math.hypot(t.pos.x - px, t.pos.z - pz);
      if (perp < 0.9) { best = t; bestD = along; }
    }
    return { target: best, dist: bestD };
  }

  function showTracer(from, to) {
    if (!tracer) {
      tracer = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0xffe9a8 }),
      );
      G.scene.add(tracer);
    }
    const pts = tracer.geometry.attributes.position;
    pts.setXYZ(0, from.x, from.y, from.z);
    pts.setXYZ(1, to.x, to.y, to.z);
    pts.needsUpdate = true;
    tracer.visible = true;
    tracerUntil = G.time + 0.07;
  }

  function shoot() {
    const player = G.player.state;
    if (fireCooldown > 0 || player.inCar) return;
    fireCooldown = PLAYER.fireInterval;
    G.audio.shot();
    const from = { x: player.pos.x, y: 1.5, z: player.pos.z };
    const dir = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
    const hit = rayHit(from, dir, 60, guards);
    const end = {
      x: from.x + dir.x * hit.dist,
      y: 1.5,
      z: from.z + dir.z * hit.dist,
    };
    showTracer(from, end);
    if (hit.target) {
      hit.target.hp -= PLAYER.pistolDamage;
      if (hit.target.hp <= 0) {
        hit.target.dead = true;
        hit.target.mesh.group.rotation.x = -Math.PI / 2 + 0.15;
        G.cash += 25;
        G.hud.banner('Guard down — +$25');
      }
    }
    G.police.addHeat(WANTED.shoot);
    G.peds.update(0, { x: player.pos.x, z: player.pos.z, r: 25 });
  }

  function punch() {
    const player = G.player.state;
    if (punchCooldown > 0 || player.inCar) return;
    punchCooldown = 0.45;
    G.audio.punch();
    const px = player.pos.x;
    const pz = player.pos.z;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    let hitSomething = false;
    for (const target of [...guards, ...G.peds.peds]) {
      if (target.dead || (target.down !== undefined && target.down > 0)) continue;
      const dx = target.pos.x - px;
      const dz = target.pos.z - pz;
      const d = Math.hypot(dx, dz);
      if (d < PLAYER.punchRange && (dx * fx + dz * fz) / (d || 1) > 0.4) {
        hitSomething = true;
        if (target.hp !== undefined) {
          target.hp -= PLAYER.punchDamage;
          if (target.hp <= 0) {
            target.dead = true;
            target.mesh.group.rotation.x = -Math.PI / 2 + 0.15;
            G.cash += 25;
          }
        } else {
          G.peds.knockDown(target, px, pz);
          G.police.addHeat(WANTED.hitPed);
          if (target.down > 0) G.police.addHeat(5);
        }
      }
    }
    void hitSomething;
  }

  function update(dt) {
    fireCooldown = Math.max(0, fireCooldown - dt);
    punchCooldown = Math.max(0, punchCooldown - dt);
    if (tracer && G.time > tracerUntil) tracer.visible = false;
    const player = G.player.state;
    for (const guard of guards) {
      if (guard.dead) continue;
      const dx = player.pos.x - guard.pos.x;
      const dz = player.pos.z - guard.pos.z;
      const d = Math.hypot(dx, dz);
      guard.heading = Math.atan2(dx, dz);
      guard.mesh.group.rotation.y = guard.heading;
      if (d < 28 && !player.inCar) {
        guard.shootTimer -= dt;
        if (guard.shootTimer <= 0) {
          guard.shootTimer = 1.4 + G.rng() * 0.8;
          G.audio.shot();
          showTracer({ x: guard.pos.x, y: 1.4, z: guard.pos.z }, { x: player.pos.x, y: 1.2, z: player.pos.z });
          if (G.rng() < 0.55) G.player.damage(8, guard.pos.x, guard.pos.z);
        }
      } else if (d > 8) {
        // Patrol back toward the warehouse when the player is far.
        const wx = G.city.locations.warehouse.x - guard.pos.x;
        const wz = G.city.locations.warehouse.z - guard.pos.z;
        const wd = Math.hypot(wx, wz);
        if (wd > 6) {
          guard.heading = Math.atan2(wx, wz);
          guard.pos.x += Math.sin(guard.heading) * 2.2 * dt;
          guard.pos.z += Math.cos(guard.heading) * 2.2 * dt;
          guard.walkPhase += dt * 8;
          const swing = Math.sin(guard.walkPhase) * 0.4;
          guard.mesh.legL.rotation.x = swing;
          guard.mesh.legR.rotation.x = -swing;
          guard.mesh.group.rotation.y = guard.heading;
        }
      }
    }
  }

  return { guards, spawnGuard, clearGuards, shoot, punch, update };
}
