// The HUD: wanted stars, cash, health, speed and objective in the DOM, plus a
// live minimap drawn on a small canvas — roads, the player arrow, traffic dots,
// police in red, pedestrians in grey, and the gold mission beacon.
const MAP_HALF = 185;
const MAP_SIZE = 180;

export function createHud() {
  const el = (id) => document.getElementById(id);
  const map = el('minimap');
  const mctx = map.getContext('2d');
  return {
    root: el('hud'),
    stars: el('stars'),
    cash: el('cash'),
    healthFill: el('healthfill'),
    speedo: el('speedo'),
    objective: el('obj-text'),
    msg: el('msg'),
    crosshair: el('crosshair'),
    map,
    mctx,
    show() { this.root.classList.add('on'); },
    hide() { this.root.classList.remove('on'); },
  };
}

function toMap(x, z) {
  return {
    x: ((x + MAP_HALF) / (MAP_HALF * 2)) * MAP_SIZE,
    y: ((z + MAP_HALF) / (MAP_HALF * 2)) * MAP_SIZE,
  };
}

export function updateHud(state) {
  const h = state.hud;
  const p = state.player;
  const stars = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  h.stars.textContent = stars;
  h.stars.classList.toggle('hot', state.wanted >= 3);
  h.cash.textContent = `$${Math.round(p.cash).toLocaleString('en-US')}`;
  h.healthFill.style.width = `${Math.max(0, Math.round(p.health))}%`;
  h.healthFill.style.background = p.health > 50
    ? 'linear-gradient(90deg,#37e07a,#a8ff6a)'
    : p.health > 25 ? 'linear-gradient(90deg,#e0a037,#ffd23e)' : 'linear-gradient(90deg,#e03737,#ff7a5a)';
  h.speedo.textContent = p.onFoot
    ? (p.car ? '' : `ON FOOT · AMMO ${p.ammo}/24`)
    : `SPEED ${Math.round(Math.abs(p.car.speed) * 3.6)} KM/H · ${p.car.stolen ? 'STOLEN' : 'YOUR CAR'}`;
  h.objective.textContent = state.objective;
  h.crosshair.style.display = (!p.onFoot || state.screen !== 'play') ? 'none' : 'block';
  if (state.msgT > 0) {
    h.msg.textContent = state.message;
    h.msg.style.opacity = Math.min(1, state.msgT);
  } else {
    h.msg.textContent = '';
  }
  drawMinimap(state);
}

function drawMinimap(state) {
  const c = state.hud.mctx;
  c.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  c.fillStyle = '#12283a';
  c.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  // Ocean strip at the bottom (south).
  c.fillStyle = '#1e7fa8';
  c.fillRect(0, MAP_SIZE - 12, MAP_SIZE, 12);
  // Roads.
  c.strokeStyle = '#5a6672';
  c.lineWidth = 4;
  for (let i = -160; i <= 160; i += 40) {
    const a = toMap(i, 0);
    c.beginPath(); c.moveTo(a.x, 0); c.lineTo(a.x, MAP_SIZE); c.stroke();
    const b = toMap(0, i);
    c.beginPath(); c.moveTo(0, b.y); c.lineTo(MAP_SIZE, b.y); c.stroke();
  }
  // Mission beacon.
  const m = state.missionMarker();
  if (m) {
    const p = toMap(m.x, m.z);
    c.fillStyle = '#ffd23e';
    c.beginPath(); c.arc(p.x, p.y, 5, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffd23e';
    c.lineWidth = 1.5;
    c.beginPath(); c.arc(p.x, p.y, 8 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2); c.stroke();
  }
  // Traffic (white), peds (grey), police (red).
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    const p = toMap(car.mesh.position.x, car.mesh.position.z);
    c.fillStyle = car.kind === 'police' ? '#ff5340' : '#dfe8ef';
    c.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  for (const ped of state.peds) {
    const p = toMap(ped.mesh.position.x, ped.mesh.position.z);
    c.fillStyle = '#8fa3b0';
    c.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
  // Player arrow, rotated to heading.
  const pp = toMap(state.playerPos().x, state.playerPos().z);
  c.save();
  c.translate(pp.x, pp.y);
  c.rotate(state.player.heading);
  c.fillStyle = '#37e07a';
  c.beginPath();
  c.moveTo(0, -6); c.lineTo(4.5, 5); c.lineTo(-4.5, 5); c.closePath();
  c.fill();
  c.restore();
  // North tick.
  c.fillStyle = '#cfe8ff';
  c.font = 'bold 9px sans-serif';
  c.fillText('N', 4, 11);
}
