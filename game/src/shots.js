// Staged screenshot scenes behind ?shot=chase|street|mission|drive (with &seed=N).
// Each one resets the world from the seed, puts Dario in a real gameplay situation
// and plays the real rules forward with a simple autopilot (hold W, steer toward the
// road ahead), so the frame is what a short game really looks like and the same seed
// always gives the same frame. The boot then paints it and sets window.__shotReady.
import { startMission, applyStage } from './missions.js';
import { addWanted } from './police.js';

const STEP = 1 / 60;

function putPlayerInCar(state, x, z, heading) {
  const p = state.player;
  const car = state.cars.find((c) => c.kind === 'parked');
  if (!car) return;
  car.mesh.position.set(x, 0, z);
  car.heading = heading;
  car.mesh.rotation.y = heading;
  car.speed = 0;
  // A bright red ride so the player's car reads clearly in every shot.
  const body = car.mesh.children[0];
  if (body && body.material && body.material.color) body.material.color.set(0xd23b2e);
  p.onFoot = false;
  p.car = car;
  car.kind = 'player';
  car.stolen = true;
  p.mesh.visible = false;
  p.mesh.position.copy(car.mesh.position);
}

function simulate(state, step, seconds, keys) {
  state.keys = { ...keys };
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i += 1) step(state, STEP);
  state.keys = {};
}

export function stageShot(name, state, helpers) {
  const { reset, step } = helpers;
  reset();
  state.screen = 'play';
  if (name === 'chase') {
    // Cover: wanted level 3, Dario in a stolen car, patrol cars closing in.
    startMission(state, 1);
    state.mission.stage = 1;
    applyStage(state);
    addWanted(state, 1, '');
    putPlayerInCar(state, 0, 40, Math.PI);
    state.camYaw = 0;
    state.camPitch = 0.32;
    simulate(state, step, 6, { KeyW: true });
    // Stage the payoff: patrol cars tucked in right behind the player's car,
    // matching its heading and speed, so the cover reads as a chase.
    const pc = state.player.car;
    if (pc) {
      const fx = Math.sin(pc.heading);
      const fz = Math.cos(pc.heading);
      const rx = Math.cos(pc.heading);
      const rz = -Math.sin(pc.heading);
      state.policeCars.forEach((cop, i) => {
        const behind = 11 + i * 7;
        const side = i === 0 ? 0 : (i % 2 === 0 ? -3.5 : 3.5);
        cop.mesh.position.set(
          pc.mesh.position.x - fx * behind + rx * side,
          0,
          pc.mesh.position.z - fz * behind + rz * side,
        );
        cop.heading = pc.heading;
        cop.speed = Math.max(10, pc.speed);
        cop.mesh.rotation.y = pc.heading;
      });
    }
  } else if (name === 'street') {
    // On foot at a downtown intersection, traffic and pedestrians around.
    state.player.mesh.position.set(0, 0, 0);
    state.player.heading = Math.PI;
    state.camYaw = 0;
    state.camPitch = 0.42;
    simulate(state, step, 5, { KeyW: true });
  } else if (name === 'mission') {
    // Harbor Heist in progress: guards up, Dario closing in on foot.
    startMission(state, 2);
    state.mission.stage = 1;
    applyStage(state);
    state.player.mesh.position.set(-136, 0, 146);
    const dx = -148 - -136;
    const dz = 152 - 146;
    state.camYaw = Math.atan2(-dx, -dz);
    state.camPitch = 0.28;
    simulate(state, step, 2.5, { KeyW: true });
  } else if (name === 'drive') {
    // Dusk cruise down the main avenue, city lights on.
    state.city.setTimeOfDay('dusk');
    putPlayerInCar(state, 0, 120, Math.PI);
    state.camYaw = 0;
    state.camPitch = 0.3;
    simulate(state, step, 5, { KeyW: true });
  } else {
    state.player.mesh.position.set(0, 0, 100);
    state.camYaw = 0;
    state.camPitch = 0.3;
    simulate(state, step, 2, { KeyW: true });
  }
  state.player.health = 100;
  state.screen = 'play';
  return 'play';
}
