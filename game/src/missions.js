// The story: three jobs for the Marlin crew, plus free roam after the last one.
// Each mission is stages with a beacon, an objective line and a completion check;
// the mission module owns the beacon mesh and advances stages, the game owns the
// consequences (cash, wanted level, save).
import * as THREE from 'three';
import { spawnEnemies } from './combat.js';
import { clearWanted, addWanted } from './police.js';

export const MISSIONS = [
  {
    name: 'First Wheels',
    reward: 300,
    intro: 'Marla needs a driver. Steal a car on the avenue, then bring it to the beach lot.',
    stages: [
      { text: 'Steal a car — press E next to any parked or traffic car', marker: { x: -20, z: 120 }, check: (s) => !s.player.onFoot },
      { text: 'Drive the car to the beach lot marker', marker: { x: 40, z: 175 }, check: (s) => s.playerInCarNear(40, 175, 9) },
    ],
  },
  {
    name: 'The Pickup',
    reward: 600,
    intro: 'A package is waiting downtown. Grab it — and expect company on the way out.',
    stages: [
      { text: 'Drive to the pickup point downtown', marker: { x: 80, z: -40 }, check: (s) => s.distToPlayer(80, -40) < 8 },
      { text: 'Package grabbed! The cops are onto you — lose the heat and reach the safehouse', marker: { x: -120, z: -120 }, check: (s) => s.distToPlayer(-120, -120) < 9 && s.wanted === 0 },
    ],
  },
  {
    name: 'Harbor Heist',
    reward: 1200,
    intro: 'The Marlin crew keeps its ledger at the harbor. Take it — the guards will not hand it over.',
    stages: [
      { text: 'Get to the harbor gate', marker: { x: -140, z: 140 }, check: (s) => s.distToPlayer(-140, 140) < 9 },
      { text: 'Take out the Marlin guards', marker: { x: -150, z: 155 }, check: (s) => s.enemiesAlive() === 0 },
      { text: 'Grab the ledger from the crate', marker: { x: -152, z: 162 }, check: (s) => s.distToPlayer(-152, 162) < 5 },
      { text: 'Escape to the safehouse — the whole force is coming', marker: { x: -120, z: -120 }, check: (s) => s.distToPlayer(-120, -120) < 9 },
    ],
  },
];

let beacon = null;
let beaconRing = null;

function makeBeacon(scene) {
  if (!beacon) {
    beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 60, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    beaconRing.rotation.x = -Math.PI / 2;
    scene.add(beacon);
    scene.add(beaconRing);
  }
  return beacon;
}

export function startMission(state, index) {
  const m = MISSIONS[index];
  if (!m) return;
  state.mission.index = index;
  state.mission.stage = 0;
  state.mission.active = true;
  makeBeacon(state.scene);
  state.flash(`${m.name} — ${m.intro}`);
  state.audio.missionDone();
  applyStage(state);
}

export function applyStage(state) {
  const m = MISSIONS[state.mission.index];
  if (!m) return;
  const stage = m.stages[state.mission.stage];
  if (!stage) return;
  const b = makeBeacon(state.scene);
  b.position.set(stage.marker.x, 30, stage.marker.z);
  beaconRing.position.set(stage.marker.x, 0.15, stage.marker.z);
  b.visible = true;
  beaconRing.visible = true;
  state.objective = stage.text;
  // Stage side-effects.
  if (state.mission.index === 1 && state.mission.stage === 1) {
    addWanted(state, 2, 'The pickup was watched — 2 stars!');
    state.player.cash += 0;
  }
  if (state.mission.index === 2 && state.mission.stage === 1) {
    spawnEnemies(state, [[-148, 150], [-142, 158], [-156, 148], [-146, 164]]);
    state.flash('Guards! Take them out.');
  }
  if (state.mission.index === 2 && state.mission.stage === 3) {
    addWanted(state, 3, 'The harbor alarm is screaming — 3 stars!');
  }
}

export function updateMission(state, dt) {
  const m = MISSIONS[state.mission.index];
  if (!m || !state.mission.active) return;
  // Beacon pulse.
  if (beacon) {
    beacon.material.opacity = 0.16 + Math.sin(state.time * 3) * 0.07;
    beacon.rotation.y += dt * 0.6;
  }
  const stage = m.stages[state.mission.stage];
  if (!stage) return;
  if (stage.check(state)) {
    state.mission.stage += 1;
    if (state.mission.stage >= m.stages.length) {
      completeMission(state, m);
    } else {
      state.audio.pickup();
      applyStage(state);
    }
  }
}

function completeMission(state, m) {
  state.player.cash += m.reward;
  state.mission.active = false;
  if (beacon) { beacon.visible = false; beaconRing.visible = false; }
  state.audio.missionDone();
  state.flash(`${m.name} complete — +$${m.reward}`);
  state.save();
  if (state.mission.index === 1) clearWanted(state);
  if (state.mission.index === 2) clearWanted(state);
  const next = state.mission.index + 1;
  if (next < MISSIONS.length) {
    window.setTimeout(() => { if (state.screen === 'play') startMission(state, next); }, 2500);
    state.mission.index = next;
    state.mission.stage = 0;
  } else {
    state.mission.completed = true;
    state.save();
    window.setTimeout(() => state.showComplete(), 1800);
  }
}

// Called by combat when a guard goes down during Harbor Heist.
export function onEnemyDown(state) {
  if (state.mission.index === 2 && state.mission.stage === 1) {
    const left = state.enemiesAlive();
    if (left > 0) state.flash(`${left} guard${left === 1 ? '' : 's'} left`);
  }
}

export function hideBeacon() {
  if (beacon) { beacon.visible = false; beaconRing.visible = false; }
}
