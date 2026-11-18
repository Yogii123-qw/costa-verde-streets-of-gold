// Dario Cruz on foot and behind the wheel: WASD movement relative to the camera,
// sprint, jump, entering and stealing cars with E, and the third-person chase camera
// that follows him — low and close on foot, high and far in a car.
import * as THREE from 'three';
import { collideCircle, clampToCity } from './city.js';
import { nearestCar, driveCar } from './vehicles.js';
import { addWanted } from './police.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x1f7a6d, roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d5f, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.72, 0.34), jacket);
  torso.position.y = 1.06;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
  head.position.y = 1.64;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.5), new THREE.MeshStandardMaterial({ color: 0xd23b2e }));
  cap.position.y = 1.83;
  g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.24), pants);
  legL.position.set(-0.15, 0.36, 0);
  const legR = legL.clone();
  legR.position.x = 0.15;
  g.add(legL, legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.17), jacket);
  armL.position.set(-0.38, 1.06, 0);
  const armR = armL.clone();
  armR.position.x = 0.38;
  g.add(armL, armR);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.55), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  gun.position.set(0.38, 1.0, 0.3);
  g.add(gun);
  g.userData = { legL, legR, armL, armR, gun, walkPhase: 0 };
  return g;
}

export function updatePlayer(state, dt) {
  const p = state.player;
  const k = state.keys;
  if (p.health <= 0) return;
  if (p.onFoot) {
    const fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const strafe = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    const sprint = k.ShiftLeft || k.ShiftRight;
    const speed = sprint ? 9.5 : 5.8;
    const sin = Math.sin(state.camYaw);
    const cos = Math.cos(state.camYaw);
    let mx = (-sin * fwd + cos * strafe);
    let mz = (-cos * fwd - sin * strafe);
    const len = Math.sqrt(mx * mx + mz * mz);
    if (len > 0) { mx /= len; mz /= len; }
    const nx = p.mesh.position.x + mx * speed * dt;
    const nz = p.mesh.position.z + mz * speed * dt;
    const clamped = clampToCity(nx, nz, 0);
    const hit = collideCircle(state.city.colliders, clamped.x, clamped.z, 0.6);
    p.mesh.position.x = hit.x;
    p.mesh.position.z = hit.z;
    if (len > 0) {
      p.heading = Math.atan2(mx, mz);
      p.mesh.rotation.y = p.heading;
    }
    // Jump with a little gravity.
    if (k.Space && p.groundY === 0) { p.vy = 7; p.groundY = 0.001; }
    if (p.groundY > 0 || p.vy !== 0) {
      p.vy -= 22 * dt;
      p.mesh.position.y += p.vy * dt;
      if (p.mesh.position.y <= 0) { p.mesh.position.y = 0; p.vy = 0; p.groundY = 0; }
    }
    const u = p.mesh.userData;
    if (len > 0) {
      u.walkPhase += dt * speed * 1.6;
      const swing = Math.sin(u.walkPhase) * 0.55;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.7;
      u.armR.rotation.x = swing * 0.7;
    } else {
      u.legL.rotation.x *= 0.8;
      u.legR.rotation.x *= 0.8;
      u.armL.rotation.x *= 0.8;
      u.armR.rotation.x *= 0.8;
    }
    // Slow health regen on foot, away from trouble.
    if (state.wanted === 0 && p.health < 100) p.health = Math.min(100, p.health + 2 * dt);
  } else if (p.car) {
    driveCar(p.car, {
      forward: !!k.KeyW,
      back: !!k.KeyS,
      left: !!k.KeyA,
      right: !!k.KeyD,
    }, dt, state.city.colliders, state.audio);
    p.mesh.position.copy(p.car.mesh.position);
    p.mesh.visible = false;
  }
}

export function tryEnterCar(state) {
  const p = state.player;
  if (!p.onFoot) {
    // Get out: step to the side of the car.
    const car = p.car;
    if (!car) return;
    p.onFoot = true;
    p.car = null;
    car.kind = car.stolen ? 'parked' : car.kind;
    p.mesh.visible = true;
    p.mesh.position.set(car.mesh.position.x + 2.5, 0, car.mesh.position.z);
    p.mesh.rotation.y = car.heading;
    state.audio.carDoor();
    state.audio.engineOff();
    return;
  }
  const car = nearestCar(state.cars, p.mesh.position.x, p.mesh.position.z, 4.5);
  if (!car) { state.flash('No car close enough — walk up to one and press E'); return; }
  p.onFoot = false;
  p.car = car;
  car.kind = 'player';
  car.speed = 0;
  if (car.occupied) {
    car.occupied = false;
    car.stolen = true;
    state.stats.carsStolen += 1;
    addWanted(state, 1, 'Car stolen — 1 star');
  } else if (car.kind === 'parked' || car.stolen) {
    state.stats.carsStolen += 1;
    if (!car.stolen) addWanted(state, 1, 'Car stolen — 1 star');
    car.stolen = true;
  }
  p.mesh.visible = false;
  state.audio.carDoor();
  state.flash(car.stolen ? 'You took the car' : 'Behind the wheel');
}

export function updateCamera(state, dt) {
  const p = state.player;
  const target = p.onFoot
    ? p.mesh.position.clone().add(new THREE.Vector3(0, 1.7, 0))
    : (p.car ? p.car.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)) : p.mesh.position.clone());
  // When driving, ease the camera behind the car; on foot it stays where the mouse put it.
  if (!p.onFoot && p.car && Math.abs(p.car.speed) > 2) {
    const behind = p.car.heading + Math.PI;
    let diff = behind - state.camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.camYaw += diff * Math.min(1, dt * 1.6);
  }
  const dist = p.onFoot ? 8.5 : 12;
  const pitch = Math.max(0.12, Math.min(1.1, state.camPitch));
  const cx = target.x - Math.sin(state.camYaw) * Math.cos(pitch) * dist;
  const cz = target.z - Math.cos(state.camYaw) * Math.cos(pitch) * dist;
  const cy = target.y + Math.sin(pitch) * dist + 1.2;
  state.camera.position.set(cx, Math.max(1.2, cy), cz);
  state.camera.lookAt(target);
}
