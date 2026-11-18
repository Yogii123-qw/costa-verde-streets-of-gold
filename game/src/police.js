// The wanted system: 0–5 stars. Crimes add heat; police cars spawn up to the star
// count and chase the player, flashing their light bars and ramming. Heat cools when
// the player stays out of trouble and out of sight — lose the tail, lose the stars.
import * as THREE from 'three';
import { makeCarMesh, driveCar } from './vehicles.js';
import { ROAD_LINES } from './city.js';

export function addWanted(state, stars, reason) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + stars));
  state.heat = 1;
  state.quietT = 0;
  if (stars > 0 && reason) state.flash(reason);
}

export function spawnPoliceCar(state, nearX, nearZ) {
  const line = ROAD_LINES.reduce((a, b) => (Math.abs(b - nearX) < Math.abs(a - nearX) ? b : a));
  const mesh = makeCarMesh(0, true);
  const car = {
    mesh, kind: 'police', speed: 0, heading: 0,
    axis: 'z', line, dir: 1, cruise: 26, stolen: false, occupied: true, flashT: 0,
  };
  mesh.position.set(line + 3, 0, nearZ + 24);
  state.scene.add(mesh);
  state.policeCars.push(car);
  return car;
}

function steerToward(car, tx, tz, dt) {
  const dx = tx - car.mesh.position.x;
  const dz = tz - car.mesh.position.z;
  const want = Math.atan2(dx, dz);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  car.speed = Math.min(30, car.speed + 14 * dt);
  const nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.x = nx;
  car.mesh.position.z = nz;
  car.mesh.rotation.y = car.heading;
}

export function updatePolice(state, dt) {
  const playerPos = state.playerPos();
  // Keep the fleet at the wanted level (cap 5 cars on the road at once).
  const wantCount = Math.min(state.wanted, 5);
  while (state.policeCars.length < wantCount) {
    spawnPoliceCar(state, playerPos.x + (state.rng.next() - 0.5) * 40, playerPos.z + (state.rng.next() - 0.5) * 40);
  }
  // Siren while any cop is out.
  state.audio.siren(state.policeCars.length > 0);
  let nearest = Infinity;
  for (const car of state.policeCars) {
    steerToward(car, playerPos.x, playerPos.z, dt);
    car.flashT += dt;
    const on = Math.floor(car.flashT * 6) % 2 === 0;
    if (car.mesh.userData.lightR) {
      car.mesh.userData.lightR.emissiveIntensity = on ? 2.5 : 0.2;
      car.mesh.userData.lightB.emissiveIntensity = on ? 0.2 : 2.5;
    }
    const dx = car.mesh.position.x - playerPos.x;
    const dz = car.mesh.position.z - playerPos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    nearest = Math.min(nearest, d);
    // Ramming hurts: on foot it knocks Dario down, in a car it shakes him up.
    if (d < 3.2) {
      if (state.player.onFoot) {
        state.damagePlayer(14 * dt * 3, 'run over by a patrol car');
      } else {
        state.damagePlayer(4 * dt, 'rammed by police');
        car.speed *= 0.6;
      }
      // Bounce the cop back so it does not sit on top of the player.
      car.mesh.position.x += (dx / Math.max(0.1, d)) * 2;
      car.mesh.position.z += (dz / Math.max(0.1, d)) * 2;
    }
  }
  // Heat cools only when the player is quiet and the nearest cop is far away.
  if (state.wanted > 0) {
    if (nearest > 55) state.quietT += dt;
    else state.quietT = 0;
    if (state.quietT > 12) {
      state.wanted -= 1;
      state.quietT = 0;
      state.flash(state.wanted > 0 ? `Heat dropping — ${state.wanted} star${state.wanted === 1 ? '' : 's'} left` : 'You lost them. Clean.');
      if (state.wanted === 0) {
        for (const car of state.policeCars) state.scene.remove(car.mesh);
        state.policeCars.length = 0;
      }
    }
  }
  // Trim the fleet when the wanted level drops for other reasons (mission clears).
  while (state.policeCars.length > Math.max(state.wanted, 0)) {
    const car = state.policeCars.pop();
    state.scene.remove(car.mesh);
  }
}

export function clearWanted(state) {
  state.wanted = 0;
  state.heat = 0;
  state.quietT = 0;
  for (const car of state.policeCars) state.scene.remove(car.mesh);
  state.policeCars.length = 0;
  state.audio.siren(false);
}
