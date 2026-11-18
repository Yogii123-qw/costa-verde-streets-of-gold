// Touch controls overlay — TEST COPY ONLY, not part of the graded make.fun submission.
// Drives the game's existing keyboard-input path (window.__cvInput) so the game logic
// itself is untouched: a virtual joystick for WASD movement plus buttons for the
// action keys. Only activates on touch devices.
(function () {
  'use strict';

  var isTouch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    || 'ontouchstart' in window;
  if (!isTouch) return;

  function input() { return window.__cvInput || null; }

  var css = [
    '#cv-touch { position: fixed; inset: 0; z-index: 6; pointer-events: none; display: none; }',
    '#cv-touch.on { display: block; }',
    '#cv-stick { position: absolute; left: 18px; bottom: 26px; width: 118px; height: 118px;',
    '  border-radius: 50%; background: rgba(255,255,255,0.10); border: 1.5px solid rgba(255,255,255,0.35);',
    '  pointer-events: auto; touch-action: none; }',
    '#cv-knob { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; border-radius: 50%;',
    '  background: rgba(255,210,62,0.85); transform: translate(-50%, -50%);',
    '  box-shadow: 0 2px 10px rgba(0,0,0,0.5); }',
    '#cv-btns { position: absolute; right: 14px; bottom: 22px; display: flex; flex-direction: column;',
    '  gap: 10px; align-items: flex-end; pointer-events: none; }',
    '.cv-btn { pointer-events: auto; touch-action: none; min-width: 64px; height: 52px; padding: 0 14px;',
    '  border-radius: 26px; border: 1.5px solid rgba(255,255,255,0.4); color: #fff;',
    '  background: rgba(8,18,28,0.55); font: 700 13px/1.2 system-ui, sans-serif; letter-spacing: 1px; }',
    '.cv-btn:active { background: rgba(255,210,62,0.55); color: #12200a; }',
    '.cv-btn.small { height: 40px; font-size: 11px; }'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'cv-touch';
  root.innerHTML =
    '<div id="cv-stick"><div id="cv-knob"></div></div>' +
    '<div id="cv-btns">' +
    '<button class="cv-btn" data-hold="Space" type="button">LOMPAT</button>' +
    '<button class="cv-btn" data-hold="ShiftLeft" type="button">LARI</button>' +
    '<button class="cv-btn" data-tap="KeyE" type="button">MOBIL</button>' +
    '<button class="cv-btn" data-tap="KeyR" type="button">ISI ULANG</button>' +
    '<button class="cv-btn small" data-tap="KeyP" type="button">JEDA</button>' +
    '</div>';
  document.body.appendChild(root);

  // Show only while actually playing (no title/pause/game-over overlay visible).
  setInterval(function () {
    var blocked = document.querySelector('.overlay:not(.hidden)');
    root.classList.toggle('on', !blocked);
  }, 400);

  // --- Joystick: sets KeyW/KeyA/KeyS/KeyD in the game's keys object. ---
  var stick = document.getElementById('cv-stick');
  var knob = document.getElementById('cv-knob');
  var stickId = null;
  var RADIUS = 44;

  function setMove(dx, dy) {
    var inp = input();
    if (!inp) return;
    inp.keys.KeyW = dy < -12;
    inp.keys.KeyS = dy > 12;
    inp.keys.KeyA = dx < -12;
    inp.keys.KeyD = dx > 12;
  }

  function stickMove(e) {
    var r = stick.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > RADIUS) { dx = dx / len * RADIUS; dy = dy / len * RADIUS; }
    knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    setMove(dx, dy);
  }

  function stickEnd(e) {
    if (e.pointerId !== stickId) return;
    stickId = null;
    knob.style.transform = 'translate(-50%, -50%)';
    setMove(0, 0);
  }

  stick.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    stickId = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    stickMove(e);
  });
  stick.addEventListener('pointermove', function (e) {
    if (e.pointerId !== stickId) return;
    e.preventDefault();
    stickMove(e);
  });
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);

  // --- Buttons: hold-type set keys while pressed; tap-type fire one pressed event. ---
  root.querySelectorAll('.cv-btn').forEach(function (btn) {
    var hold = btn.getAttribute('data-hold');
    var tap = btn.getAttribute('data-tap');
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var inp = input();
      if (!inp) return;
      if (hold) inp.keys[hold] = true;
      if (tap) inp.pressed.add(tap);
    });
    function release(e) {
      e.preventDefault();
      var inp = input();
      if (inp && hold) inp.keys[hold] = false;
    }
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    // Block the emulated mouse click so a tap never also counts as a shot.
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
  });
})();
