// Vehicles: low-poly cars built from boxes, traffic that follows the road grid,
// parked cars to steal, and the enter/exit handshake with the player. A car is a
// THREE.Group plus a small state record; traffic never leaves the roads, and a
// stolen traffic car keeps driving away only in the sense that its driver is gone.
import * as THREE from 'three';
import { ROAD_LINES, collideCircle, clampToCity } from './city.js';

const CAR_COLORS = [0xd23b2e, 0x2e6fd2, 0xf2c230, 0x37b268, 0xe8e8e8, 0x222831, 0x8a4fd2, 0xff8c42, 0x19b8b8];
const WHEEL_GEO = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
const WHEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });

export function makeCarMesh(color, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: isPolice ? 0xf2f2f2 : color,
    roughness: 0.45,
    metalness: 0.25,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.5), paint);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.55, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2733, roughness: 0.2, metalness: 0.4 }),
  );
  cabin.position.set(0, 1.1, -0.2);
  g.add(cabin);
  if (isPolice) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.52), new THREE.MeshStandardMaterial({ color: 0x1438a8, roughness: 0.5 }));
    stripe.position.y = 0.62;
    g.add(stripe);
    const barMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.4 });
    const barMat2 = new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x2244ff, emissiveIntensity: 1.4 });
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), barMat);
    barR.position.set(-0.45, 1.5, -0.2);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), barMat2);
    barB.position.set(0.45, 1.5, -0.2);
    g.add(barR, barB);
    g.userData.lightR = barMat;
    g.userData.lightB = barMat2;
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffedb0, emissiveIntensity: 0.7 });
  for (const sx of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), headMat);
    head.position.set(sx, 0.62, 2.26);
    g.add(head);
  }
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    g.add(wheel);
  }
  return g;
}

function newCarRecord(scene, mesh, kind, opts) {
  const car = {
    mesh,
    kind, // 'traffic' | 'parked' | 'police' | 'player'
    speed: 0,
    heading: opts.heading ?? 0,
    axis: opts.axis ?? 'z',
    line: opts.line ?? 0,
    dir: opts.dir ?? 1,
    cruise: opts.cruise ?? 8,
    stolen: false,
    occupied: kind === 'traffic',
    flashT: 0,
  };
  mesh.position.set(opts.x ?? 0, 0, opts.z ?? 0);
  mesh.rotation.y = car.heading;
  scene.add(mesh);
  return car;
}

export function spawnTraffic(scene, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const line = rng.pick(ROAD_LINES);
    const along = rng.range(-150, 150);
    const dir = rng.chance(0.5) ? 1 : -1;
    const lane = dir > 0 ? 3 : -3;
    const x = axis === 'x' ? along : line + lane;
    const z = axis === 'x' ? line + lane : along;
    const heading = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const mesh = makeCarMesh(rng.pick(CAR_COLORS), false);
    const car = newCarRecord(scene, mesh, 'traffic', {
      x, z, heading, axis, line: line + lane, dir, cruise: rng.range(6, 11),
    });
    car.speed = car.cruise;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(scene, rng, spots) {
  const cars = [];
  for (const [x, z, heading] of spots) {
    const mesh = makeCarMesh(rng.pick(CAR_COLORS), false);
    const car = newCarRecord(scene, mesh, 'parked', { x, z, heading });
    cars.push(car);
  }
  return cars;
}

// Traffic follows its road line; at the city edge it turns onto a cross street.
export function updateTraffic(cars, dt, colliders, rng) {
  for (const car of cars) {
    if (car.kind !== 'traffic' || car.stolen) continue;
    const step = car.speed * dt;
    if (car.axis === 'x') car.mesh.position.x += car.dir * step;
    else car.mesh.position.z += car.dir * step;
    const along = car.axis === 'x' ? car.mesh.position.x : car.mesh.position.z;
    if (Math.abs(along) > 158) {
      const cross = rng.pick(ROAD_LINES);
      const ndir = rng.chance(0.5) ? 1 : -1;
      const lane = ndir > 0 ? 3 : -3;
      if (car.axis === 'x') {
        car.mesh.position.x = Math.max(-155, Math.min(155, car.mesh.position.x));
        car.axis = 'z';
        car.mesh.position.z = cross + lane;
        car.line = cross + lane;
        car.dir = ndir;
        car.heading = ndir > 0 ? 0 : Math.PI;
      } else {
        car.mesh.position.z = Math.max(-155, Math.min(155, car.mesh.position.z));
        car.axis = 'x';
        car.mesh.position.x = cross + lane;
        car.line = cross + lane;
        car.dir = ndir;
        car.heading = ndir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      car.mesh.rotation.y = car.heading;
    }
    // Gentle separation: slow down when another car is right ahead.
    for (const other of cars) {
      if (other === car || other.kind !== 'traffic') continue;
      const dx = other.mesh.position.x - car.mesh.position.x;
      const dz = other.mesh.position.z - car.mesh.position.z;
      if (dx * dx + dz * dz < 30 && car.speed > 3) car.speed = Math.max(3, car.speed - 6 * dt);
      else car.speed = Math.min(car.cruise, car.speed + 4 * dt);
    }
  }
}

export function nearestCar(cars, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.kind === 'police') continue;
    const dx = car.mesh.position.x - x;
    const dz = car.mesh.position.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Arcade driving: W accelerates, S brakes/reverses, A/D steer harder at speed,
// with soft building collision and a speed cap per car kind.
export function driveCar(car, input, dt, colliders, audio) {
  const maxSpeed = car.kind === 'police' ? 30 : 27;
  const accel = input.forward ? 16 : 0;
  const brake = input.back ? 22 : 0;
  car.speed += (accel - brake) * dt;
  if (!input.forward && !input.back) car.speed -= Math.sign(car.speed) * 8 * dt;
  if (Math.abs(car.speed) < 0.2 && !input.forward && !input.back) car.speed = 0;
  car.speed = Math.max(-9, Math.min(maxSpeed, car.speed));
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerRate = 1.9 * Math.min(1, Math.abs(car.speed) / 8);
  car.heading += steer * steerRate * dt * Math.sign(car.speed || 1);
  const nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
  const clamped = clampToCity(nx, nz, 0);
  const hit = collideCircle(colliders, clamped.x, clamped.z, 2.2);
  const crashed = Math.abs(hit.x - clamped.x) > 0.01 || Math.abs(hit.z - clamped.z) > 0.01;
  if (crashed && Math.abs(car.speed) > 6) {
    car.speed *= 0.45;
    if (audio) audio.crash();
  }
  car.mesh.position.x = hit.x;
  car.mesh.position.z = hit.z;
  car.mesh.rotation.y = car.heading;
  // Body lean into turns and acceleration.
  car.mesh.rotation.z = -steer * 0.04 * Math.min(1, Math.abs(car.speed) / 12);
  car.mesh.rotation.x = accel ? -0.015 : 0;
  if (audio) audio.engine(Math.abs(car.speed) / maxSpeed);
}
