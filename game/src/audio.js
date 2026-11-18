// All sound and music is synthesized live with WebAudio — no audio files, no
// network. A tiny step-sequenced bassline and hats loop under the game, and every
// action (engine, siren, gunshot, pickup, mission jingle) is an oscillator or a
// filtered noise burst. The context starts on the first user gesture only.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let step = 0;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      // No context before a real user gesture: headless screenshot runs stay
      // silent instead of spamming autoplay warnings, and real play (which
      // starts from a button click) unlocks sound normally.
      const ua = navigator.userActivation;
      if (ua && !ua.hasBeenActive && !ua.isActive) return false;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    } catch { /* audio is decoration, never a crash */ }
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq || 1200;
      const g = ctx.createGain();
      g.gain.value = vol || 0.3;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start();
    } catch { /* ignore */ }
  }

  // A minor-key street groove: bass walks A–F–C–G while a hat ticks eighth notes.
  const BASS = [55, 55, 65.41, 55, 43.65, 43.65, 49, 55];
  function musicStep() {
    if (!ctx || muted) return;
    const beat = 0.24;
    const bass = BASS[step % BASS.length];
    tone(bass, beat * 1.8, 'triangle', 0.22);
    if (step % 2 === 0) tone(bass * 4, 0.08, 'square', 0.03);
    if (step % 4 === 2) tone(880, 0.12, 'sine', 0.04);
    noise(0.03, 0.05, 6000);
    step += 1;
    musicTimer = window.setTimeout(musicStep, beat * 1000);
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    startMusic() {
      if (!ensure()) return;
      if (musicTimer !== null) return;
      step = 0;
      musicStep();
    },
    stopMusic() { if (musicTimer !== null) { window.clearTimeout(musicTimer); musicTimer = null; } },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },
    gunshot() { noise(0.14, 0.5, 900); tone(160, 0.1, 'square', 0.18, 60); },
    enemyShot() { noise(0.1, 0.22, 700); },
    pickup() { tone(660, 0.09, 'sine', 0.25); window.setTimeout(() => tone(990, 0.14, 'sine', 0.25), 90); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'triangle', 0.28), i * 110)); },
    missionFail() { [330, 262, 196].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'sawtooth', 0.12), i * 140)); },
    carDoor() { noise(0.08, 0.25, 500); tone(120, 0.08, 'square', 0.1, 70); },
    crash() { noise(0.3, 0.4, 400); },
    hurt() { tone(220, 0.15, 'sawtooth', 0.15, 110); },
    click() { tone(1200, 0.04, 'square', 0.08); },
    engine(speed01) {
      if (!ensure() || muted) { this.engineOff(); return; }
      try {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth';
          engineGain.gain.value = 0;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 500;
          engineOsc.connect(f);
          f.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        engineOsc.frequency.setTargetAtTime(50 + speed01 * 140, ctx.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(0.02 + speed01 * 0.05, ctx.currentTime, 0.1);
      } catch { /* ignore */ }
    },
    engineOff() {
      try { if (engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch { /* ignore */ }
    },
    siren(on) {
      if (!ensure()) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenGain = ctx.createGain();
          sirenOsc.type = 'sine';
          sirenOsc.frequency.value = 700;
          sirenGain.gain.value = muted ? 0 : 0.045;
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 0.8;
          lfoGain.gain.value = 260;
          lfo.connect(lfoGain);
          lfoGain.connect(sirenOsc.frequency);
          sirenOsc.connect(sirenGain);
          sirenGain.connect(master);
          sirenOsc.start();
          lfo.start();
          sirenOsc._lfo = lfo;
        } else if (!on && sirenOsc) {
          const o = sirenOsc;
          const l = o._lfo;
          sirenOsc = null;
          try { o.stop(); if (l) l.stop(); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    },
  };
}
