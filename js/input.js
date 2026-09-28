// Keyboard/mouse (pointer lock) and touch controls, merged into one state object.
window.GS = window.GS || {};

GS.Input = (function () {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('is-touch');

  const state = {
    isTouch,
    moveX: 0, moveY: 0,       // -1..1 (x = strafe, y = forward)
    lookX: 0, lookY: 0,       // accumulated look delta in pixels, consumed each frame
    fire: false,              // trigger held
    firePressed: false,       // trigger went down this frame (for semi-auto)
    jump: false,
    reload: false,
    zoomToggle: false,
    weapon: -1,               // requested weapon index, -1 = none
    weaponStep: 0,            // +1 / -1 cycle
    locked: false,
    enabled: false,
  };
  const keys = {};
  let onUnlock = () => {};

  // ---------- Desktop ----------
  const KEY_WEAPONS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8 };
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!state.enabled) return;
    if (e.code === 'Space') state.jump = true;
    if (e.code === 'KeyR') state.reload = true;
    if (e.code in KEY_WEAPONS) state.weapon = KEY_WEAPONS[e.code];
    if (e.code === 'KeyQ') state.weaponStep = -1;
    if (e.code === 'KeyE') state.weaponStep = 1;
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; state.fire = false; });

  function requestLock() {
    if (isTouch) return;
    const el = document.body;
    if (el.requestPointerLock) {
      const p = el.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    }
  }

  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === document.body;
    if (!state.locked) { state.fire = false; if (state.enabled) onUnlock(); }
  });

  addEventListener('mousemove', e => {
    if (!state.locked) return;
    state.lookX += e.movementX;
    state.lookY += e.movementY;
  });
  addEventListener('mousedown', e => {
    if (!state.enabled || isTouch) return;
    if (!state.locked) { if (e.target.closest('button, .slot')) return; requestLock(); return; }
    if (e.button === 0) { state.fire = true; state.firePressed = true; }
    if (e.button === 2) state.zoomToggle = true;
  });
  addEventListener('mouseup', e => { if (e.button === 0) state.fire = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => {
    if (!state.enabled || !state.locked) return;
    state.weaponStep = e.deltaY > 0 ? 1 : -1;
  }, { passive: true });

  // ---------- Touch ----------
  const stickBase = document.getElementById('stickBase');
  const stickKnob = document.getElementById('stickKnob');
  let stickId = null, stickX = 0, stickY = 0, lookId = null, lastLX = 0, lastLY = 0;
  const STICK_R = 50;

  function touchStart(e) {
    if (!state.enabled || e.target.closest('button')) return;
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.45 && stickId === null) {
        stickId = t.identifier; stickX = t.clientX; stickY = t.clientY;
        stickBase.style.left = stickX + 'px'; stickBase.style.top = stickY + 'px';
        stickBase.style.display = 'block';
        stickKnob.style.transform = '';
      } else if (lookId === null) {
        lookId = t.identifier; lastLX = t.clientX; lastLY = t.clientY;
      }
    }
    e.preventDefault();
  }
  function touchMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - stickX, dy = t.clientY - stickY;
        const len = Math.hypot(dx, dy);
        if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
        stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        state.moveX = dx / STICK_R;
        state.moveY = -dy / STICK_R;
      } else if (t.identifier === lookId) {
        state.lookX += (t.clientX - lastLX) * 1.6;
        state.lookY += (t.clientY - lastLY) * 1.6;
        lastLX = t.clientX; lastLY = t.clientY;
      }
    }
    e.preventDefault();
  }
  function touchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        stickId = null; state.moveX = state.moveY = 0; stickBase.style.display = 'none';
      } else if (t.identifier === lookId) lookId = null;
    }
  }
  if (isTouch) {
    const hud = document.getElementById('hud');
    const game = document.getElementById('game');
    [hud, game].forEach(el => {
      el.addEventListener('touchstart', touchStart, { passive: false });
      el.addEventListener('touchmove', touchMove, { passive: false });
      el.addEventListener('touchend', touchEnd);
      el.addEventListener('touchcancel', touchEnd);
    });
    // HUD ignores pointer events except buttons; let the stick/look area receive touches
    hud.style.pointerEvents = 'auto';

    function btn(id, down, up) {
      const b = document.getElementById(id);
      b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('pressed'); down(); }, { passive: false });
      b.addEventListener('touchend', e => { e.preventDefault(); b.classList.remove('pressed'); if (up) up(); });
      b.addEventListener('touchcancel', () => { b.classList.remove('pressed'); if (up) up(); });
    }
    btn('tFire', () => { state.fire = true; state.firePressed = true; }, () => { state.fire = false; });
    btn('tReload', () => { state.reload = true; });
    btn('tJump', () => { state.jump = true; });
    btn('tZoom', () => { state.zoomToggle = true; });
    btn('tSwap', () => { state.weaponStep = 1; });
  }

  // Called once per frame by the game
  function poll() {
    if (!isTouch) {
      state.moveX = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
      state.moveY = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    }
    state.sprint = !!(keys.ShiftLeft || keys.ShiftRight);
  }
  function endFrame() {
    state.lookX = state.lookY = 0;
    state.firePressed = state.jump = state.reload = state.zoomToggle = false;
    state.weapon = -1; state.weaponStep = 0;
  }

  function releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }

  return {
    state, poll, endFrame, requestLock, releaseLock,
    setOnUnlock(fn) { onUnlock = fn; },
  };
})();
