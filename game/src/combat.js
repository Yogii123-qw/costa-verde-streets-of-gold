// Combat: a pistol with a tracer, reload, and mission guards who shoot back.
// Shots are raycasts from the camera through the crosshair; hitting a pedestrian
// or a guard in front of witnesses is a crime and raises the wanted level.
import * as THREE from 'three';

const RAY = new THREE.Raycaster();
const CENTER = new THREE.Vector2(0, 0);
const MAG = 24;

export function makeEnemyMesh() {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x3a2f2f, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5f, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.35), suit);
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), skin);
  head.position.y = 1.64;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  cap.position.y = 1.82;
  g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.24), suit);
  legL.position.set(-0.15, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;
  g.add(legL, legR);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  gun.position.set(0.3, 1.2, 0.3);
  g.add(gun);
  return g;
}

export function spawnEnemies(state, positions) {
  for (const [x, z] of positions) {
    const mesh = makeEnemyMesh();
    mesh.position.set(x, 0, z);
    state.scene.add(mesh);
    state.enemies.push({ mesh, health: 100, shootT: state.rng.range(0.6, 1.6), alive: true });
  }
}

export function shoot(state) {
  const p = state.player;
  if (p.onFoot === false || p.reloadT > 0 || p.fireT > 0) return false;
  if (p.ammo <= 0) {
    state.audio.click();
    state.flash('Out of ammo — press R to reload');
    return false;
  }
  p.ammo -= 1;
  p.fireT = 0.18;
  state.stats.shots += 1;
  state.audio.gunshot();
  RAY.setFromCamera(CENTER, state.camera);
  RAY.far = 80;
  const targets = [];
  for (const e of state.enemies) if (e.alive) targets.push(e.mesh);
  for (const ped of state.peds) targets.push(ped.mesh);
  const hits = RAY.intersectObjects(targets, true);
  // Tracer from the muzzle to the hit point (or 60 m out).
  const from = state.camera.position.clone();
  const to = hits.length > 0 ? hits[0].point.clone() : RAY.ray.at(60, new THREE.Vector3());
  addTracer(state, from, to);
  if (hits.length > 0) {
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== state.scene) obj = obj.parent;
    const enemy = state.enemies.find((e) => e.mesh === obj);
    if (enemy) {
      enemy.health -= 34;
      if (enemy.health <= 0 && enemy.alive) {
        enemy.alive = false;
        enemy.mesh.rotation.x = -Math.PI / 2;
        enemy.mesh.position.y = 0.3;
        state.flash('Guard down');
        state.mission.onEnemyDown(state);
      }
    } else {
      // Hit a pedestrian: a crime, witnessed.
      state.police.addWanted(state, 1, 'Witnesses saw that — 1 star');
      state.peds = state.peds.filter((ped) => ped.mesh !== obj);
      state.scene.remove(obj);
    }
  }
  // The shot itself is loud: nearby peds flee, nearby cops notice.
  const pp = state.playerPos();
  state.pedsScare(pp.x, pp.z, 30);
  return true;
}

function addTracer(state, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }));
  state.scene.add(line);
  state.tracers.push({ line, life: 0.09 });
}

export function updateTracers(state, dt) {
  for (let i = state.tracers.length - 1; i >= 0; i -= 1) {
    const t = state.tracers[i];
    t.life -= dt;
    t.line.material.opacity = Math.max(0, t.life / 0.09);
    if (t.life <= 0) {
      state.scene.remove(t.line);
      t.line.geometry.dispose();
      state.tracers.splice(i, 1);
    }
  }
}

// Guards stand their ground and fire back when Dario is in range.
export function updateEnemies(state, dt) {
  const pp = state.playerPos();
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = pp.x - e.mesh.position.x;
    const dz = pp.z - e.mesh.position.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    e.mesh.rotation.y = Math.atan2(dx, dz);
    e.shootT -= dt;
    if (d < 42 && e.shootT <= 0) {
      e.shootT = state.rng.range(1.0, 1.8);
      state.audio.enemyShot();
      const target = new THREE.Vector3(pp.x, 1.2, pp.z);
      addTracer(state, e.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0)), target);
      if (d < 34 && state.rng.chance(0.45)) {
        state.damagePlayer(9, 'shot by a Marlin guard');
      }
    }
  }
}

export function reload(state) {
  const p = state.player;
  if (p.reloadT > 0 || p.ammo >= MAG) return;
  p.reloadT = 1.1;
  state.audio.click();
}

export function updateReload(state, dt) {
  const p = state.player;
  if (p.reloadT > 0) {
    p.reloadT -= dt;
    if (p.reloadT <= 0) {
      p.ammo = MAG;
      state.flash('Reloaded');
    }
  }
  if (p.fireT > 0) p.fireT -= dt;
}
