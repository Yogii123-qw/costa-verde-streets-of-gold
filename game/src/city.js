// Costa Verde itself: a procedural low-poly sun-soaked modern city on a road grid.
// Buildings get canvas-painted window facades (no image files), the south edge is a
// beach and ocean, palms line the avenues, and street lamps glow at dusk. The builder
// also hands back the building AABBs the player and cars collide with, and a
// setTimeOfDay() that swings the sun, sky and lamps from bright day to neon dusk.
import * as THREE from 'three';

export const CITY_HALF = 160;
export const ROAD_LINES = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
const ROAD_W = 12;
const PALETTE = [0xf2e3c6, 0xf6c9a0, 0xa8d8d0, 0xf9f3e3, 0xe8a598, 0xcfd8dc, 0xf2d38a, 0x9fc3e8];

function facadeTexture(base, rng) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const cols = 4;
  const rows = 10;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const lit = rng.chance(0.35);
      g.fillStyle = lit ? '#ffe9a8' : 'rgba(20, 40, 60, 0.55)';
      g.fillRect(10 + x * 28, 12 + y * 24, 18, 14);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 0, 128, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5.2, 6), trunkMat);
  trunk.position.y = 2.6;
  trunk.rotation.z = rng.range(-0.08, 0.08);
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e5f, roughness: 1 });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.4, 4), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.3, 5.4, Math.sin(a) * 1.3);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    g.add(leaf);
  }
  const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshStandardMaterial({ color: 0x7a4a21 }));
  nuts.position.y = 5.0;
  g.add(nuts);
  return g;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const lamps = [];
  const lampHeads = [];
  const group = new THREE.Group();
  scene.add(group);

  const sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.9);
  scene.add(hemi);
  scene.background = new THREE.Color(0x87c5eb);
  scene.fog = new THREE.Fog(0x87c5eb, 260, 520);

  // Ground, roads, sidewalks, beach and ocean.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x33383f, roughness: 1 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xb9ac8f, roughness: 1 });
  for (const line of ROAD_LINES) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 380), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(line, 0.02, 0);
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(380, ROAD_W), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.02, line);
    group.add(ew);
    const nsW = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W + 8, 380), walkMat);
    nsW.rotation.x = -Math.PI / 2;
    nsW.position.set(line, 0.01, 0);
    group.add(nsW);
    const ewW = new THREE.Mesh(new THREE.PlaneGeometry(380, ROAD_W + 8), walkMat);
    ewW.rotation.x = -Math.PI / 2;
    ewW.position.set(0, 0.01, line);
    group.add(ewW);
  }
  // Centre dashes.
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xf5d76e, roughness: 1 });
  for (const line of ROAD_LINES) {
    for (let d = -170; d <= 170; d += 16) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(line, 0.04, d);
      group.add(dash);
    }
  }
  // Beach + ocean on the south edge (z > 180).
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 40),
    new THREE.MeshStandardMaterial({ color: 0xf0d9a0, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, 200);
  group.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 260),
    new THREE.MeshStandardMaterial({ color: 0x1e7fa8, roughness: 0.35, metalness: 0.1 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.0, 350);
  group.add(ocean);

  // Buildings, one per block cell, with parks and plazas left open.
  const facades = PALETTE.slice(0, 4).map((hex) => {
    const css = `#${hex.toString(16).padStart(6, '0')}`;
    return facadeTexture(css, rng);
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let ix = 0; ix < ROAD_LINES.length - 1; ix += 1) {
    for (let iz = 0; iz < ROAD_LINES.length - 1; iz += 1) {
      const cx = (ROAD_LINES[ix] + ROAD_LINES[ix + 1]) / 2;
      const cz = (ROAD_LINES[iz] + ROAD_LINES[iz + 1]) / 2;
      if (cz > 160) continue; // beach strip stays open
      const roll = rng.next();
      if (roll < 0.14) {
        // Park: palms + grass square.
        const park = new THREE.Mesh(
          new THREE.PlaneGeometry(26, 26),
          new THREE.MeshStandardMaterial({ color: 0x5da864, roughness: 1 }),
        );
        park.rotation.x = -Math.PI / 2;
        park.position.set(cx, 0.06, cz);
        group.add(park);
        for (let p = 0; p < 4; p += 1) {
          const palm = makePalm(rng);
          palm.position.set(cx + rng.range(-9, 9), 0, cz + rng.range(-9, 9));
          group.add(palm);
        }
        continue;
      }
      if (roll < 0.2) continue; // open plaza
      const w = rng.range(16, 26);
      const d = rng.range(16, 26);
      const h = rng.range(8, 46);
      const color = rng.pick(PALETTE);
      const mat = new THREE.MeshStandardMaterial({
        color,
        map: facades[rng.int(0, facades.length - 1)],
        roughness: 0.9,
      });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(cx + rng.range(-2, 2), h / 2, cz + rng.range(-2, 2));
      group.add(b);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.4, 1.6, d * 0.4),
        new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 1 }),
      );
      roof.position.set(b.position.x, h + 0.8, b.position.z);
      group.add(roof);
      colliders.push({
        x0: b.position.x - w / 2, x1: b.position.x + w / 2,
        z0: b.position.z - d / 2, z1: b.position.z + d / 2,
      });
    }
  }

  // Palms along the beach and the main avenue; lamps at intersections.
  for (let x = -150; x <= 150; x += 30) {
    const palm = makePalm(rng);
    palm.position.set(x, 0, 182);
    group.add(palm);
  }
  for (let x = -140; x <= 140; x += 40) {
    const palm = makePalm(rng);
    palm.position.set(x, 0, -6);
    group.add(palm);
  }
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c343c, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffdf80, emissiveIntensity: 0.15 });
  for (const lx of [-120, -40, 40, 120]) {
    for (const lz of [-120, -40, 40, 120]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 6), poleMat);
      pole.position.set(lx + 8, 3.5, lz + 8);
      group.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), headMat.clone());
      head.position.set(lx + 8, 7.1, lz + 8);
      group.add(head);
      lamps.push(head);
      lampHeads.push(head.material);
    }
  }

  // A glowing "COSTA VERDE" welcome arch over the main avenue — the city's own sign.
  const archMat = new THREE.MeshStandardMaterial({ color: 0xffb52e, emissive: 0xff9d00, emissiveIntensity: 0.35 });
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, 10, 1.2), archMat);
    post.position.set(side * 9, 5, -160);
    group.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(19.2, 1.6, 1.2), archMat);
  beam.position.set(0, 10.4, -160);
  group.add(beam);

  function setTimeOfDay(tod) {
    if (tod === 'dusk') {
      sun.color.set(0xff9a4d);
      sun.intensity = 1.9;
      sun.position.set(-140, 60, 120);
      hemi.intensity = 0.5;
      scene.background.set(0x2e2a55);
      scene.fog.color.set(0x2e2a55);
      for (const m of lampHeads) m.emissiveIntensity = 2.2;
    } else {
      sun.color.set(0xfff2d0);
      sun.intensity = 2.4;
      sun.position.set(120, 180, 60);
      hemi.intensity = 0.9;
      scene.background.set(0x87c5eb);
      scene.fog.color.set(0x87c5eb);
      for (const m of lampHeads) m.emissiveIntensity = 0.15;
    }
  }

  return { colliders, lamps, setTimeOfDay, group };
}

// Push a circle (player, car, ped) out of every building AABB it overlaps.
export function collideCircle(colliders, x, z, radius) {
  let px = x;
  let pz = z;
  for (const c of colliders) {
    const nx = Math.max(c.x0, Math.min(px, c.x1));
    const nz = Math.max(c.z0, Math.min(pz, c.z1));
    const dx = px - nx;
    const dz = pz - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        px = nx + (dx / d) * radius;
        pz = nz + (dz / d) * radius;
      } else {
        // Centre inside the box: push out along the smallest penetration axis.
        const left = px - c.x0;
        const right = c.x1 - px;
        const top = pz - c.z0;
        const bottom = c.z1 - pz;
        const m = Math.min(left, right, top, bottom);
        if (m === left) px = c.x0 - radius;
        else if (m === right) px = c.x1 + radius;
        else if (m === top) pz = c.z0 - radius;
        else pz = c.z1 + radius;
      }
    }
  }
  return { x: px, z: pz };
}

export function clampToCity(x, z, margin) {
  const lim = CITY_HALF + 22;
  return {
    x: Math.max(-lim, Math.min(lim, x)),
    z: Math.max(-lim - 8, Math.min(178, z)),
  };
}
