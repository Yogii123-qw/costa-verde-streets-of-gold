# Costa Verde — Streets of Gold

An original 3D open-world crime game built for the make.fun **gta6-01** coding bounty:
drive and fight through a coastal city, take on story missions, dodge the police,
and build your fortune. No assets from any existing game — all code and art are
original, built on Three.js.

**Play it:** https://yogii123-qw.github.io/costa-verde-streets-of-gold/game/

## Controls

Keyboard + mouse:

| Key | Action |
| --- | --- |
| W / A / S / D | Move / drive |
| Mouse drag | Camera |
| Click | Shoot (on foot) |
| E | Enter / exit car |
| Space | Jump |
| Shift | Sprint |
| R | Reload |
| P | Pause |
| M / H | Mute / toggle hints |

Touch (phone / tablet): a virtual joystick (bottom left) moves and drives;
on-screen buttons cover jump, sprint, enter car, reload, and pause. Drag
elsewhere to move the camera, tap to shoot.

## Run locally

```sh
node serve.ts
# then open http://localhost:8080
```

No build step — the game is plain static files under `game/`.

## Notes

- The graded make.fun submission is keyboard-only; the touch controls in
  `game/src/touch.js` (plus a one-line input hook in `game/src/main.js`) were
  added to this copy only, so the game can be tested on a phone.
- Camera/movement fix (18 Nov 2026, this copy only — the submitted bundle is
  unchanged): the driving camera used to sit in front of the car facing
  backwards, and on-foot movement ran towards the camera; both now follow the
  camera correctly, and entering a car snaps the camera behind it.
- Entry submitted to make.fun as `Costa Verde — Streets of Gold`
  (competition `gta6-01`, submission `01a1ec8b-14f7-73a5-b201-e80c34b8baf3`);
  results due 10 December 2026.
- `main.ts` is the entry handoff program that assembles the submission output
  (`game/` + screenshots + dossier) for the grader.
