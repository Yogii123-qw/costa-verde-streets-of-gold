// Pedestrians: low-poly walkers who stroll the sidewalks between random
// intersections, bob as they walk, and run away from gunfire. They make the city
// feel lived in — and hurting one in front of a cop is a crime, like everything else.
import * as THREE from 'three';
import { ROAD_LINES } from './city.js';

const SHIRTS = [0xe86a5a, 0x4a90d9, 0xf2c230, 0x7ac74f, 0xffffff, 0x9b59b6, 0xff8c42];
const SKINS = [0xe8b88a, 0xc98d5f, 0x8a5a3b, 0xf2c9a0];

export function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: rng.pick(SHIRTS), roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2c343c, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: rng.pick(SKINS), roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirt);
  torso.position.y = 1.05;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  head.position.y = 1.62;
  g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pants);
  legL.position.set(-0.14, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.14;
  g.add(legL, legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.16), shirt);
  armL.position.set(-0.36, 1.05, 0);
  const armR = armL.clone();
  armR.position.x = 0.36;
  g.add(armL, armR);
  g.userData = { legL, legR, armL, armR, phase: rng.range(0, Math.PI * 2) };
  return g;
}

function randomSidewalkPoint(rng) {
  const line = rng.pick(ROAD_LINES);
  const along = rng.range(-150, 150);
  if (rng.chance(0.5)) return { x: line + 8.5, z: along };
  return { x: along, z: line + 8.5 };
}

export function spawnPedestrians(scene, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePedMesh(rng);
    const p = randomSidewalkPoint(rng);
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    const target = randomSidewalkPoint(rng);
    peds.push({
      mesh,
      speed: rng.range(1.1, 2.2),
      target,
      flee: 0,
      heading: rng.range(0, Math.PI * 2),
      walkPhase: rng.range(0, Math.PI * 2),
    });
  }
  return peds;
}

export function scarePeds(peds, x, z, radius) {
  for (const ped of peds) {
    const dx = ped.mesh.position.x - x;
    const dz = ped.mesh.position.z - z;
    if (dx * dx + dz * dz < radius * radius) {
      ped.flee = 3;
      const d = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
      ped.target = { x: ped.mesh.position.x + (dx / d) * 40, z: ped.mesh.position.z + (dz / d) * 40 };
    }
  }
}

export function updatePedestrians(peds, dt, rng) {
  for (const ped of peds) {
    if (ped.flee > 0) ped.flee -= dt;
    const dx = ped.target.x - ped.mesh.position.x;
    const dz = ped.target.z - ped.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1.5) {
      ped.target = randomSidewalkPoint(rng);
      continue;
    }
    const speed = ped.flee > 0 ? ped.speed * 2.6 : ped.speed;
    const vx = (dx / dist) * speed * dt;
    const vz = (dz / dist) * speed * dt;
    ped.mesh.position.x += vx;
    ped.mesh.position.z += vz;
    ped.heading = Math.atan2(dx, dz);
    ped.mesh.rotation.y = ped.heading;
    ped.walkPhase += dt * speed * 5;
    const swing = Math.sin(ped.walkPhase) * 0.5;
    const u = ped.mesh.userData;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
    ped.mesh.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.05;
  }
}
