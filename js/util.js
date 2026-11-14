// Shared math, palette and small canvas helpers.
export const TAU = Math.PI * 2;
export const W = 1280;
export const H = 720;
export const GROUND = 640;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
export const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
export const randInt = (a, b) => Math.floor(rand(b + 1, a));
export const choice = (arr) => arr[(Math.random() * arr.length) | 0];
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
export const sign = (v) => (v < 0 ? -1 : 1);

export const PAL = {
  ink: '#2b1d17',
  inkSoft: '#4a342a',
  cream: '#f6e7c6',
  paper: '#fdf6e3',
  red: '#d9452f',
  redDark: '#8f2417',
  gold: '#e9b44c',
  goldDark: '#b07a22',
  teal: '#2f7d76',
  tealDark: '#1c4f4a',
  blue: '#4f7fbf',
  pink: '#ff7fae',
  pinkHot: '#ff3d7f',
  green: '#6a9c3f',
  purple: '#6c4a7d',
  brown: '#84512f',
  white: '#fffaf0',
  shadow: 'rgba(43,29,23,.25)',
};

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillRound(ctx, x, y, w, h, r, fill, stroke = PAL.ink, lw = 3) {
  roundRect(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
}

export function fillEllipse(ctx, x, y, rx, ry, fill, stroke = PAL.ink, lw = 3, rot = 0) {
  ellipse(ctx, x, y, rx, ry, rot);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function starPath(ctx, x, y, outer, inner, points, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawStar(ctx, x, y, outer, inner, points, fill, stroke, lw = 3, rot = -Math.PI / 2) {
  starPath(ctx, x, y, outer, inner, points, rot);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function inkText(ctx, text, x, y, size, opts = {}) {
  const {
    font = 'Georgia, "Times New Roman", serif',
    weight = '900',
    align = 'center',
    baseline = 'middle',
    fill = PAL.paper,
    stroke = PAL.ink,
    lw = Math.max(2, size * 0.09),
    shadow = 0,
    letter = 0,
  } = opts;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (letter) ctx.letterSpacing = `${letter}px`;
  if (shadow) {
    ctx.lineWidth = lw + 1;
    ctx.strokeStyle = 'rgba(20,12,9,.55)';
    ctx.strokeText(text, x + shadow, y + shadow);
    ctx.fillStyle = 'rgba(20,12,9,.45)';
    ctx.fillText(text, x + shadow, y + shadow);
  }
  if (lw) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Sparks / debris, shared by every boss.
export class Particles {
  constructor() { this.items = []; }
  clear() { this.items.length = 0; }
  add(p) {
    if (this.items.length > 520) this.items.shift();
    this.items.push({
      x: p.x, y: p.y, vx: p.vx || 0, vy: p.vy || 0,
      life: p.life ?? 0.5, max: p.life ?? 0.5,
      size: p.size ?? 4, color: p.color || PAL.gold,
      grav: p.grav ?? 900, drag: p.drag ?? 2.4,
      kind: p.kind || 'dot', rot: p.rot ?? rand(TAU),
      spin: p.spin ?? rand(8, -8), layer: p.layer || 1,
    });
  }
  burst(x, y, n, color, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.angle ?? rand(TAU);
      const sp = (opts.speed ?? 240) * rand(1.2, 0.25);
      this.add({
        x, y,
        vx: Math.cos(a + rand(0.6, -0.6)) * sp,
        vy: Math.sin(a + rand(0.6, -0.6)) * sp,
        life: (opts.life ?? 0.5) * rand(1.4, 0.6),
        size: (opts.size ?? 5) * rand(1.5, 0.5),
        color: Array.isArray(color) ? choice(color) : color,
        grav: opts.grav ?? 900,
        kind: opts.kind || 'spark',
        drag: opts.drag ?? 2.2,
      });
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) { this.items.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      const d = 1 - Math.min(0.9, p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }
  draw(ctx) {
    for (const p of this.items) {
      const t = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 2.4);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, p.size * 0.55 * t);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.stroke();
      } else if (p.kind === 'star') {
        drawStar(ctx, 0, 0, p.size, p.size * 0.45, 4, p.color, null, 0);
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * 0.35 * t);
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1.6 - t), 0, TAU);
        ctx.stroke();
      } else if (p.kind === 'leaf') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.55, 0, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, p.size * t), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

// Tiny deterministic noise for film grain.
let grainCanvas = null;
export function filmGrain(ctx, t, strength = 0.07) {
  if (!grainCanvas) {
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = 160; grainCanvas.height = 90;
    const g = grainCanvas.getContext('2d');
    const img = g.createImageData(160, 90);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.globalCompositeOperation = 'overlay';
  const off = (Math.floor(t * 24) % 4) * 37;
  ctx.translate(-off, -off * 0.6);
  ctx.drawImage(grainCanvas, 0, 0, W + 160, H + 160);
  ctx.restore();
}
