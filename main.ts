// Costa Verde — "Streets of Gold", a gta6-01 open-world crime game for make.fun.
//
// This program hands the game in: it copies the playable static game in game/ and
// the four screenshots in screenshots/ from beside this file into /output (or
// $MAKEFUN_OUTPUT_DIR outside the grader), then writes /output/dossier.json with
// buildDossier from the kit's vendored library, vendor/makefun-game.ts.
//
// Run it locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play the game first with:  node serve.ts   (then http://localhost:8080)

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => statSync(join(shotsDir, f)).isFile()) : [];
if (shots.length < 3 || shots.length > 4) fail(`expected 3 or 4 screenshots, found ${shots.length}`);
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) fail(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the dossier's
// text budget; the rest refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files in all, or a path under game/ over 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

const gameFiles = readdirSync(join(outDir, 'game'), { recursive: true }).length;
console.log(`Costa Verde handed in: ${gameFiles} game entries, ${shots.length} screenshots -> ${outDir}`);
console.log(`dossier.json: ${dossier.length} bytes`);
