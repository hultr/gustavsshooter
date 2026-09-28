// Weapon definitions. Art is based on the kid's drawings in sketches/weapons.png.
// Each draw() works in a 420x220 canvas with the muzzle pointing RIGHT.
window.GS = window.GS || {};

(function () {
  const S = GS.Sketch;
  const METAL = '#b8b5ad', DARK = '#77736b', WOOD = '#c28a52', PAPER = '#efe9da', BRASS = '#d9b25a', OLIVE = '#7d8a4a';

  const weapons = [
    {
      id: 'pistol', name: 'Pistol', price: 'Free',
      auto: false, fireDelay: 0.22, mag: 12, reload: 1.1, spread: 0.012, zoom: false, kick: 1, damage: 25,
      muzzle: [322, 72],
      draw(ctx) {
        // the "Free" gun: blocky slide and a grip full of holes
        S.rect(ctx, 150, 55, 170, 36, METAL);
        S.rect(ctx, 290, 48, 10, 8, DARK);
        S.poly(ctx, [[160, 91], [225, 91], [210, 200], [150, 200]], DARK);
        [[180, 115], [175, 140], [172, 165], [168, 188]].forEach(p => S.circle(ctx, p[0], p[1], 5, PAPER));
        S.poly(ctx, [[225, 91], [262, 91], [252, 122], [222, 122]], null);
        S.line(ctx, 238, 91, 234, 112);
      },
    },
    {
      id: 'revolver', name: 'Revolver', price: '1k',
      auto: false, fireDelay: 0.45, mag: 6, reload: 1.6, spread: 0.004, zoom: false, kick: 1.6, damage: 55,
      muzzle: [345, 70],
      draw(ctx) {
        // rounded barrel + round grip, bigger bullets
        S.rect(ctx, 210, 58, 135, 26, METAL);
        S.rect(ctx, 150, 50, 70, 50, DARK);
        S.circle(ctx, 212, 76, 26, METAL);
        [[0, -13], [12, 7], [-12, 7]].forEach(o => S.circle(ctx, 212 + o[0], 76 + o[1], 5, DARK));
        S.poly(ctx, [[150, 95], [195, 100], [185, 150], [165, 205], [120, 200], [125, 150]], WOOD);
        S.poly(ctx, [[195, 100], [232, 102], [226, 130], [196, 128]], null);
        S.line(ctx, 330, 58, 336, 48);
      },
    },
    {
      id: 'rifle', name: 'Rifle', price: '50k',
      auto: true, fireDelay: 0.1, mag: 30, reload: 2.0, spread: 0.02, zoom: false, kick: 0.7, damage: 22,
      muzzle: [405, 74],
      draw(ctx) {
        // long gun with a curved magazine and a stock, like the 50k drawing
        S.rect(ctx, 280, 67, 125, 14, DARK);
        S.rect(ctx, 385, 58, 6, 10, DARK);
        S.poly(ctx, [[10, 72], [120, 64], [120, 98], [30, 125], [8, 120]], WOOD);
        S.rect(ctx, 118, 56, 170, 42, METAL);
        S.poly(ctx, [[200, 98], [238, 98], [252, 170], [218, 178]], DARK);
        S.poly(ctx, [[140, 98], [170, 98], [162, 150], [132, 148]], WOOD);
        S.rect(ctx, 150, 46, 30, 10, DARK);
      },
    },
    {
      id: 'sniper', name: 'Sniper', price: '500k',
      auto: false, fireDelay: 1.0, mag: 5, reload: 2.6, spread: 0.03, zoom: true, kick: 2.2, damage: 150,
      muzzle: [412, 76],
      draw(ctx) {
        // the 500k: very long barrel, big scope and the eye on the stock
        S.rect(ctx, 245, 70, 167, 12, DARK);
        S.rect(ctx, 398, 64, 14, 24, DARK);
        S.poly(ctx, [[5, 66], [130, 64], [130, 96], [95, 98], [85, 128], [5, 128]], WOOD);
        S.rect(ctx, 125, 60, 125, 38, METAL);
        S.rect(ctx, 145, 26, 95, 22, DARK);
        S.rect(ctx, 165, 48, 10, 12, DARK);
        S.rect(ctx, 210, 48, 10, 12, DARK);
        S.circle(ctx, 145, 37, 11, '#9fd3f0');
        S.poly(ctx, [[160, 98], [185, 98], [178, 145], [152, 142]], DARK);
        // the eye
        S.circle(ctx, 55, 90, 13, '#fff');
        S.circle(ctx, 58, 91, 5, '#262626');
      },
    },
    {
      id: 'smg', name: 'SMG', price: '750k',
      auto: true, fireDelay: 0.06, mag: 40, reload: 1.8, spread: 0.04, zoom: false, kick: 0.5, damage: 14,
      muzzle: [335, 74],
      draw(ctx) {
        // the 750k: chunky boxy body, long magazine, spare bullets flying
        S.rect(ctx, 270, 66, 65, 16, DARK);
        S.rect(ctx, 100, 50, 175, 50, METAL);
        S.rect(ctx, 120, 38, 120, 12, DARK);
        S.rect(ctx, 125, 100, 34, 100, DARK);
        S.poly(ctx, [[190, 100], [222, 100], [215, 165], [185, 165]], DARK);
        S.poly(ctx, [[222, 100], [250, 100], [245, 125], [218, 125]], null);
        S.poly(ctx, [[60, 60], [100, 58], [100, 92], [60, 95]], null);
        [[300, 30], [340, 40], [370, 22]].forEach(p =>
          S.poly(ctx, [[p[0], p[1]], [p[0] + 22, p[1] - 3], [p[0] + 28, p[1] + 2], [p[0] + 22, p[1] + 7], [p[0], p[1] + 5]], '#d9b25a', 1));
      },
    },
    // ---------- From sketches/monstersandweapons2.png ----------
    {
      id: 'keysniper', name: 'Nyckel sniper', price: '1M',
      auto: false, fireDelay: 1.3, mag: 4, reload: 3.0, spread: 0.03, zoom: true, kick: 2.8, damage: 400,
      pierce: true, // "powerful": the bullet goes through every monster in a line
      muzzle: [410, 106],
      draw(ctx) {
        // stepped barrel, scope on top and a key ring at the back
        S.circle(ctx, 60, 106, 32, BRASS);
        S.circle(ctx, 60, 106, 13, PAPER);
        S.rect(ctx, 90, 92, 130, 30, METAL);
        S.rect(ctx, 220, 96, 90, 20, DARK);
        S.rect(ctx, 310, 100, 100, 12, METAL);
        S.rect(ctx, 150, 58, 100, 20, DARK);
        S.rect(ctx, 170, 78, 10, 14, DARK);
        S.rect(ctx, 225, 78, 10, 14, DARK);
        S.circle(ctx, 250, 68, 9, '#9fd3f0');
        S.poly(ctx, [[130, 122], [158, 122], [150, 172], [124, 168]], DARK);
      },
    },
    {
      id: 'laser', name: 'AR laser', price: '2M',
      auto: true, fireDelay: 0.08, mag: 50, reload: 1.8, spread: 0.004, zoom: false, kick: 0.25, damage: 18,
      beam: 0xff3b2f, sound: 'laser',
      muzzle: [392, 95],
      draw(ctx) {
        // tube barrel with two rings and a glowing tip
        S.rect(ctx, 110, 78, 150, 34, METAL);
        S.rect(ctx, 260, 88, 125, 14, DARK);
        [285, 345].forEach(x => { S.rect(ctx, x - 7, 70, 14, 50, METAL); });
        S.circle(ctx, 385, 95, 9, '#ff4a3a');
        S.poly(ctx, [[20, 84], [110, 84], [110, 106], [20, 112]], DARK);
        for (let x = 30; x < 105; x += 15) S.line(ctx, x, 84, x + 8, 110);
        S.poly(ctx, [[150, 112], [180, 112], [172, 165], [144, 160]], DARK);
      },
    },
    {
      id: 'rpg', name: 'RPG', price: '5M',
      auto: false, fireDelay: 0.8, mag: 1, reload: 2.2, spread: 0.004, zoom: false, kick: 2.5, damage: 260,
      rocket: { speed: 38, radius: 5 }, sound: 'rocket',
      muzzle: [400, 100],
      draw(ctx) {
        // long tube with the pointy rocket sticking out
        S.poly(ctx, [[20, 80], [60, 88], [60, 112], [20, 120]], DARK);
        S.rect(ctx, 60, 88, 270, 24, OLIVE);
        S.poly(ctx, [[330, 84], [380, 90], [402, 100], [380, 110], [330, 116]], '#9aa06a');
        S.rect(ctx, 160, 72, 18, 16, DARK);
        S.poly(ctx, [[150, 112], [175, 112], [168, 160], [142, 156]], DARK);
        S.poly(ctx, [[225, 112], [248, 112], [244, 150], [220, 148]], DARK);
      },
    },
    {
      id: 'minigun', name: 'Minigun', price: '10M',
      auto: true, fireDelay: 0.035, mag: 200, reload: 4.0, spread: 0.045, zoom: false, kick: 0.35, damage: 11,
      spin: 0.6, slow: 0.6, // must spin up first, and it is heavy
      muzzle: [405, 100],
      draw(ctx) {
        // fat bundle of barrels, round front, handle on top
        S.rect(ctx, 60, 60, 120, 80, DARK);
        S.rect(ctx, 175, 70, 205, 60, METAL);
        [84, 100, 116].forEach(y => S.line(ctx, 180, y, 378, y));
        S.circle(ctx, 382, 100, 30, METAL);
        [[382, 86], [370, 108], [394, 108]].forEach(p => S.circle(ctx, p[0], p[1], 6, DARK));
        S.poly(ctx, [[90, 60], [100, 28], [165, 28], [172, 60], [158, 60], [152, 40], [112, 40], [104, 60]], null);
        S.poly(ctx, [[110, 140], [140, 140], [134, 195], [104, 190]], DARK);
      },
    },
  ];

  function drawWeapon(canvas, w) {
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvas.width / 420, canvas.height / 220);
    S.setSeed(7 + weapons.indexOf(w));
    S.pencil(ctx, 2.4);
    w.draw(ctx);
    ctx.restore();
  }

  GS.weapons = weapons;
  GS.drawWeapon = drawWeapon;
})();
