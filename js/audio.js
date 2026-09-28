// Tiny synthesized sounds (no audio files needed).
window.GS = window.GS || {};

GS.Audio = (function () {
  let ctx = null, noise = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function env(gain, t, vol, dur) {
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  }

  function shot(power = 1) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400 + 1800 / power;
    const g = ctx.createGain(); env(g, t, 0.35 * Math.min(power, 1.5), 0.12 * power);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t); src.stop(t + 0.4);
  }

  function tone(freq, dur, vol = 0.15, type = 'square', slide = 1) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = ctx.createGain(); env(g, t, vol, dur);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function squelch(vol, dur, cutoff) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain(); env(g, t, vol, dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t); src.stop(t + dur + 0.05);
  }

  return {
    init,
    shot,
    splat: () => { squelch(0.35, 0.25, 900); tone(160, 0.3, 0.08, 'sawtooth', 0.4); },
    growl: (size = 1) => tone(140 / Math.sqrt(size), 0.6, 0.05, 'sawtooth', 0.6),
    laser: () => tone(1500, 0.09, 0.07, 'sawtooth', 0.35),
    rocket: () => { squelch(0.3, 0.5, 2500); tone(200, 0.4, 0.06, 'sawtooth', 2); },
    boom: () => { squelch(0.7, 0.9, 1800); tone(90, 0.7, 0.25, 'sine', 0.4); },
    hurt: () => { tone(260, 0.25, 0.14, 'square', 0.5); squelch(0.2, 0.15, 600); },
    hit: (bull) => tone(bull ? 1320 : 880, 0.12, 0.12, 'triangle', 1.2),
    empty: () => tone(200, 0.05, 0.1, 'square'),
    reload: () => { tone(300, 0.06, 0.08); setTimeout(() => tone(500, 0.06, 0.08), 180); },
    end: () => { tone(523, 0.2, 0.12, 'triangle'); setTimeout(() => tone(392, 0.4, 0.12, 'triangle'), 220); },
  };
})();
