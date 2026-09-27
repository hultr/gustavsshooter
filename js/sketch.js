// Pencil-sketch drawing helpers for 2D canvases.
// Every line is drawn twice with a little jitter so it looks hand drawn.
window.GS = window.GS || {};

GS.Sketch = (function () {
  let seed = 1;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function j(a) { return (rnd() - 0.5) * 2 * a; }

  function setSeed(s) { seed = s; }

  function line(ctx, x1, y1, x2, y2, wob = 1.6) {
    for (let pass = 0; pass < 2; pass++) {
      const mx = (x1 + x2) / 2 + j(wob), my = (y1 + y2) / 2 + j(wob);
      ctx.beginPath();
      ctx.moveTo(x1 + j(wob), y1 + j(wob));
      ctx.quadraticCurveTo(mx, my, x2 + j(wob), y2 + j(wob));
      ctx.stroke();
    }
  }

  // pts: [[x,y],...]; fill: css color or null
  function poly(ctx, pts, fill, wob) {
    if (fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
      // hatching for a pencil-shaded look
      ctx.clip();
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      for (let x = minX - (maxY - minY); x < maxX; x += 7) {
        ctx.beginPath(); ctx.moveTo(x, maxY); ctx.lineTo(x + (maxY - minY), minY); ctx.stroke();
      }
      ctx.restore();
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      line(ctx, a[0], a[1], b[0], b[1], wob);
    }
  }

  function rect(ctx, x, y, w, h, fill, wob) {
    poly(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, wob);
  }

  function circle(ctx, cx, cy, r, fill, wob = 1.2) {
    if (fill) { ctx.save(); ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      const steps = 18;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2, rr = r + j(wob);
        const x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  function pencil(ctx, width = 2.2) {
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  return { setSeed, line, poly, rect, circle, pencil, rnd };
})();
