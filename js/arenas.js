// Five hand-drawn arenas. Static layers are cached; ambient motion is drawn live.
import { W, H, TAU, PAL, rand, ellipse, fillEllipse, roundRect, fillRound, drawStar, clamp } from './util.js';

const cache = new Map();

function staticLayer(key, paint) {
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = W; c.height = H;
  paint(c.getContext('2d'));
  cache.set(key, c);
  return c;
}

function sky(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function cloud(ctx, x, y, s, alpha = 1, color = '#fff8e7') {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(70,50,35,.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, Math.PI, 0);
  ctx.arc(x + 34 * s, y - 12 * s, 34 * s, Math.PI * 1.05, Math.PI * 1.95);
  ctx.arc(x + 78 * s, y, 26 * s, Math.PI * 1.15, 0);
  ctx.arc(x + 40 * s, y + 6 * s, 31 * s, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function grassTuft(ctx, x, y, s, color = '#4f7a2f') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 6 * s, y);
    ctx.quadraticCurveTo(x + i * 9 * s, y - 12 * s, x + i * 15 * s, y - 17 * s);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------- FIELD ----------------
function fieldStatic(ctx) {
  sky(ctx, [[0, '#8fd6d0'], [0.38, '#f9e2a8'], [0.7, '#f7c87e'], [1, '#e8a95e']]);
  // sun
  ctx.save();
  ctx.translate(1050, 150);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff3bd';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-38, -230); ctx.lineTo(38, -230);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  fillEllipse(ctx, 0, 0, 82, 82, '#ffe9a3', '#e5b45c', 4);
  ctx.restore();
  // clouds
  cloud(ctx, 120, 150, 1.1, 0.9, '#fff7e6');
  cloud(ctx, 520, 120, 0.8, 0.75, '#fff7e6');
  cloud(ctx, 860, 200, 0.65, 0.65, '#fff7e6');
  // distant hills
  ctx.fillStyle = '#c9b16b';
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.bezierCurveTo(180, 380, 330, 400, 500, 460);
  ctx.bezierCurveTo(700, 520, 820, 400, 980, 430);
  ctx.bezierCurveTo(1120, 455, 1200, 480, 1280, 470);
  ctx.lineTo(1280, 640); ctx.lineTo(0, 640); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a5a052';
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.bezierCurveTo(240, 460, 400, 500, 620, 520);
  ctx.bezierCurveTo(860, 540, 1020, 470, 1280, 510);
  ctx.lineTo(1280, 640); ctx.lineTo(0, 640); ctx.closePath(); ctx.fill();
  // barn + silo
  ctx.save();
  ctx.translate(180, 500);
  ctx.fillStyle = '#b4442e';
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3;
  ctx.fillRect(-55, -80, 110, 100);
  ctx.strokeRect(-55, -80, 110, 100);
  ctx.fillStyle = '#8f2f20';
  ctx.beginPath();
  ctx.moveTo(-70, -78); ctx.lineTo(0, -140); ctx.lineTo(70, -78); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6d2116';
  ctx.fillRect(-22, -36, 44, 56);
  ctx.strokeRect(-22, -36, 44, 56);
  ctx.strokeStyle = '#f4dba6'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-18, -36); ctx.lineTo(18, 18); ctx.moveTo(18, -36); ctx.lineTo(-18, 18); ctx.stroke();
  ctx.fillStyle = '#cbb78b';
  ctx.fillRect(78, -130, 34, 150); ctx.strokeRect(78, -130, 34, 150);
  ctx.fillStyle = '#8f2f20';
  ctx.beginPath(); ctx.ellipse(95, -130, 22, 14, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
  ctx.restore();
  // fence
  ctx.strokeStyle = '#7c5a36'; ctx.lineWidth = 5;
  for (let x = 0; x < W; x += 78) {
    ctx.beginPath(); ctx.moveTo(x + 20, 545); ctx.lineTo(x + 20, 610); ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 562); ctx.lineTo(W, 562); ctx.moveTo(0, 592); ctx.lineTo(W, 592); ctx.stroke();
  // soil
  const dirt = ctx.createLinearGradient(0, 610, 0, H);
  dirt.addColorStop(0, '#b8794a'); dirt.addColorStop(0.25, '#94582f'); dirt.addColorStop(1, '#6b3c22');
  ctx.fillStyle = dirt;
  ctx.beginPath();
  ctx.moveTo(0, 620);
  ctx.bezierCurveTo(200, 606, 420, 630, 640, 618);
  ctx.bezierCurveTo(860, 606, 1080, 632, 1280, 616);
  ctx.lineTo(1280, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,36,20,.5)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 621); ctx.bezierCurveTo(200, 607, 420, 631, 640, 619);
  ctx.bezierCurveTo(860, 607, 1080, 633, 1280, 617); ctx.stroke();
  // crop rows
  ctx.strokeStyle = 'rgba(78,46,26,.38)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const y = 650 + i * 11;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
    ctx.stroke();
  }
  for (let x = 40; x < W; x += 96) grassTuft(ctx, x, 632, 1, '#4d7029');
  // scattered pebbles
  ctx.fillStyle = '#7e4b2b';
  for (let i = 0; i < 26; i++) {
    ellipse(ctx, rand(W), rand(700, 635), rand(5, 2), rand(3, 1));
    ctx.fill();
  }
}

// ---------------- HIVE (sky) ----------------
function hiveStatic(ctx) {
  sky(ctx, [[0, '#3f9bc4'], [0.42, '#8fd4e6'], [0.78, '#ffe4b0'], [1, '#f6c987']]);
  // giant honeycomb ghost
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = '#7a4a13';
  ctx.lineWidth = 5;
  const R = 74;
  for (let row = -1; row < 7; row++) {
    for (let col = -1; col < 12; col++) {
      const cx = col * R * 1.5 + (row % 2 ? R * 0.75 : 0);
      const cy = row * R * 0.86 - 30;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        const px = cx + Math.cos(a) * R * 0.9;
        const py = cy + Math.sin(a) * R * 0.9;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.restore();
  // distant hive towers
  ctx.fillStyle = 'rgba(122,74,19,.35)';
  ctx.strokeStyle = 'rgba(70,42,12,.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const x = 100 + i * 340, w = 150, h = 120 + (i % 2) * 80;
    ctx.beginPath();
    ctx.moveTo(x, 560);
    ctx.bezierCurveTo(x + w * 0.1, 560 - h, x + w * 0.9, 560 - h, x + w, 560);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // clouds
  cloud(ctx, 60, 240, 1.2, 0.8, '#fff9e9');
  cloud(ctx, 430, 170, 0.9, 0.65, '#fff9e9');
  cloud(ctx, 900, 260, 1.3, 0.8, '#fff9e9');
  cloud(ctx, 1120, 160, 0.7, 0.55, '#fff9e9');
  // cloud sea floor
  const g = ctx.createLinearGradient(0, 580, 0, H);
  g.addColorStop(0, '#fff4d8'); g.addColorStop(1, '#e7cfa0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 620);
  for (let x = 0; x <= W; x += 80) {
    ctx.quadraticCurveTo(x + 40, 600 + Math.sin(x) * 8, x + 80, 620);
  }
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,60,.4)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 620);
  for (let x = 0; x <= W; x += 80) ctx.quadraticCurveTo(x + 40, 600 + Math.sin(x) * 8, x + 80, 620);
  ctx.stroke();
}

// ---------------- SHIP ----------------
function shipStatic(ctx) {
  sky(ctx, [[0, '#101c33'], [0.4, '#233e5e'], [0.68, '#4a6a83'], [1, '#8a7a63']]);
  // stars
  for (let i = 0; i < 90; i++) {
    const x = rand(W), y = rand(430);
    ctx.fillStyle = `rgba(255,240,200,${rand(0.9, 0.2)})`;
    ctx.beginPath(); ctx.arc(x, y, rand(2, 0.6), 0, TAU); ctx.fill();
  }
  // moon
  ctx.save();
  ctx.translate(1040, 130);
  ctx.globalAlpha = 0.16; ctx.fillStyle = '#ffe9b0';
  ctx.beginPath(); ctx.arc(0, 0, 150, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  fillEllipse(ctx, 0, 0, 74, 74, '#f6e7bd', '#c9a86e', 3);
  ctx.fillStyle = 'rgba(180,150,100,.35)';
  ctx.beginPath(); ctx.arc(-22, -14, 13, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(24, 18, 20, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(16, -30, 7, 0, TAU); ctx.fill();
  ctx.restore();
  // sea
  const sea = ctx.createLinearGradient(0, 470, 0, 640);
  sea.addColorStop(0, '#16324b'); sea.addColorStop(1, '#0b1c2c');
  ctx.fillStyle = sea;
  ctx.beginPath();
  ctx.moveTo(0, 500);
  for (let x = 0; x <= W; x += 60) ctx.quadraticCurveTo(x + 30, 488 + Math.sin(x * 0.03) * 6, x + 60, 500);
  ctx.lineTo(W, 640); ctx.lineTo(0, 640); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(160,205,215,.25)'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const y = 520 + i * 17;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 50) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 4);
    ctx.stroke();
  }
  // distant island silhouette
  ctx.fillStyle = '#0a1522';
  ctx.beginPath();
  ctx.moveTo(80, 500);
  ctx.bezierCurveTo(140, 455, 220, 470, 260, 500);
  ctx.closePath(); ctx.fill();
  // ship deck
  const deck = ctx.createLinearGradient(0, 590, 0, 720);
  deck.addColorStop(0, '#9a6438'); deck.addColorStop(1, '#5a3520');
  ctx.fillStyle = deck;
  ctx.beginPath();
  ctx.moveTo(0, 604); ctx.lineTo(W, 604); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // planks
  ctx.strokeStyle = 'rgba(55,30,16,.55)'; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(0, 618 + i * 15); ctx.lineTo(W, 618 + i * 15); ctx.stroke();
  }
  for (let x = 30; x < W; x += 170) {
    ctx.beginPath(); ctx.moveTo(x, 604); ctx.lineTo(x + 20, H); ctx.stroke();
  }
  // railing
  ctx.strokeStyle = '#4a2b18'; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(0, 586); ctx.lineTo(W, 586); ctx.stroke();
  ctx.lineWidth = 4;
  for (let x = 20; x < W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 582); ctx.lineTo(x, 615); ctx.stroke();
  }
  // mast + rigging
  ctx.save();
  ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(620, 610); ctx.lineTo(636, 60); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,210,170,.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(632, 90 + i * 60); ctx.lineTo(900 + i * 70, 600); ctx.stroke();
  }
  // crow's nest
  ctx.fillStyle = '#4a2b18';
  ctx.fillRect(596, 130, 80, 14);
  ctx.restore();
  // hanging lanterns
  for (const [x, y] of [[300, 210], [980, 190]]) {
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 120); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,90,.28)';
    ctx.beginPath(); ctx.arc(x, y + 16, 44, 0, TAU); ctx.fill();
    fillRound(ctx, x - 15, y, 30, 36, 7, '#f3c05e', '#2a1a10', 3);
    ctx.fillStyle = '#2a1a10';
    ctx.fillRect(x - 14, y + 16, 28, 4);
  }
}

// ---------------- ICE ----------------
function iceStatic(ctx) {
  sky(ctx, [[0, '#1d3b5c'], [0.35, '#5b8fb0'], [0.65, '#bfe2e8'], [1, '#eef9f5']]);
  // aurora
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ['#7ff0c8', '#a7c6ff', '#ffb6e6'][i];
    ctx.beginPath();
    ctx.moveTo(0, 90 + i * 30);
    ctx.bezierCurveTo(300, 30 + i * 40, 700, 150 + i * 20, W, 60 + i * 30);
    ctx.lineTo(W, 150 + i * 30);
    ctx.bezierCurveTo(700, 210 + i * 20, 300, 90 + i * 40, 0, 190 + i * 30);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // stars
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand(0.7, 0.15)})`;
    ctx.beginPath(); ctx.arc(rand(W), rand(220), rand(1.8, 0.5), 0, TAU); ctx.fill();
  }
  // mountains
  const mtn = (pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], 620);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(1280, 620);
    ctx.closePath(); ctx.fill();
  };
  mtn([[0, 480], [160, 250], [300, 430], [470, 300], [640, 470], [820, 320], [980, 460], [1140, 300], [1280, 440]], '#8fb6c9');
  mtn([[0, 560], [200, 360], [380, 520], [560, 400], [760, 530], [960, 400], [1160, 530], [1280, 470]], '#6f9db4');
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  [[160, 250], [470, 300], [820, 320], [1140, 300]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x - 50, y + 70); ctx.lineTo(x, y); ctx.lineTo(x + 50, y + 70);
    ctx.quadraticCurveTo(x, y + 40, x - 50, y + 70);
    ctx.fill();
  });
  // pines
  ctx.fillStyle = '#26404a';
  for (let i = 0; i < 18; i++) {
    const x = rand(W), y = 600 + rand(20), s = rand(1.3, 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y - 60 * s); ctx.lineTo(x + 24 * s, y); ctx.lineTo(x - 24 * s, y);
    ctx.closePath(); ctx.fill();
  }
  // snow ground
  const snow = ctx.createLinearGradient(0, 600, 0, H);
  snow.addColorStop(0, '#f6ffff'); snow.addColorStop(1, '#c6e6ee');
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.moveTo(0, 616);
  ctx.bezierCurveTo(240, 598, 440, 630, 660, 612);
  ctx.bezierCurveTo(900, 594, 1080, 630, 1280, 610);
  ctx.lineTo(1280, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,190,.55)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 617);
  ctx.bezierCurveTo(240, 599, 440, 631, 660, 613);
  ctx.bezierCurveTo(900, 595, 1080, 631, 1280, 611); ctx.stroke();
  // cracks
  ctx.strokeStyle = 'rgba(140,190,205,.5)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x = 80 + i * 160, y = 660 + (i % 3) * 14;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y + 12); ctx.lineTo(x + 70, y + 2); ctx.lineTo(x + 110, y + 18);
    ctx.stroke();
  }
  // ice chunks
  for (let i = 0; i < 10; i++) {
    const x = rand(W), y = rand(700, 630);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(190,235,245,.9)';
    ctx.strokeStyle = 'rgba(100,150,170,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 4); ctx.lineTo(-12, 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}

// ---------------- CIRCUS ----------------
function circusStatic(ctx) {
  sky(ctx, [[0, '#190f1c'], [0.5, '#2e1822'], [1, '#4a2226']]);
  // tent stripes
  ctx.save();
  ctx.translate(W / 2, 380);
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(148,36,44,.55)' : 'rgba(86,20,30,.4)';
    ctx.beginPath();
    ctx.moveTo(0, -380);
    ctx.lineTo(Math.cos((i / 20) * Math.PI - Math.PI) * 1900, 460);
    ctx.lineTo(Math.cos(((i + 1) / 20) * Math.PI - Math.PI) * 1900, 460);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // bunting ropes
  ctx.strokeStyle = 'rgba(230,200,150,.35)'; ctx.lineWidth = 2;
  for (let row = 0; row < 2; row++) {
    ctx.beginPath(); ctx.moveTo(0, 80 + row * 60);
    ctx.quadraticCurveTo(640, 180 + row * 60, 1280, 70 + row * 60); ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const p = i / 15;
      const x = p * 1280;
      const y = (1 - p) ** 2 * (80 + row * 60) + 2 * (1 - p) * p * (180 + row * 60) + p * p * (70 + row * 60);
      ctx.fillStyle = ['#d9452f', '#e9b44c', '#2f7d76'][(i + row) % 3];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.lineTo(x + 8, y + 24); ctx.closePath(); ctx.fill();
    }
  }
  // tent poles
  ctx.fillStyle = '#3b2418';
  ctx.fillRect(80, 100, 16, 520);
  ctx.fillRect(1184, 100, 16, 520);
  ctx.fillStyle = '#e9b44c';
  ctx.beginPath(); ctx.arc(88, 96, 14, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(1192, 96, 14, 0, TAU); ctx.fill();
  // audience silhouettes
  ctx.fillStyle = '#120a10';
  for (let i = 0; i < 34; i++) {
    const x = i * 39 + rand(8);
    ctx.beginPath(); ctx.arc(x, 556 + rand(6), rand(16, 11), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, 600, rand(26, 17), 30, 0, Math.PI, TAU); ctx.fill();
  }
  // ring ground
  const ring = ctx.createLinearGradient(0, 600, 0, H);
  ring.addColorStop(0, '#d8b077'); ring.addColorStop(1, '#8c6136');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.ellipse(W / 2, 730, 900, 160, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c9a86e'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(W / 2, 700, 620, 120, 0, Math.PI, TAU); ctx.stroke();
  // spotlight cones
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath(); ctx.moveTo(260, 0); ctx.lineTo(120, 700); ctx.lineTo(520, 700); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1020, 0); ctx.lineTo(820, 700); ctx.lineTo(1200, 700); ctx.closePath(); ctx.fill();
  ctx.restore();
  // curtains side
  ctx.fillStyle = '#6b1d2a';
  for (const side of [0, 1]) {
    ctx.save();
    if (side) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(150, 0);
    ctx.bezierCurveTo(120, 180, 165, 320, 100, 460);
    ctx.bezierCurveTo(60, 540, 110, 620, 0, 700);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,8,14,.5)'; ctx.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(30 + i * 22, 0);
      ctx.bezierCurveTo(20 + i * 26, 200, 50 + i * 24, 400, 40 + i * 20, 640);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export const ARENAS = {
  field: {
    ground: 640,
    platforms: [],
    accent: '#e9b44c',
    static: () => staticLayer('field', fieldStatic),
    dynamic(ctx, t) {
      // floating motes
      ctx.save(); ctx.fillStyle = 'rgba(255,240,190,.5)';
      for (let i = 0; i < 18; i++) {
        const x = (i * 173 + t * 18) % W;
        const y = 300 + ((i * 97) % 240) + Math.sin(t + i) * 12;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
    platform(ctx, p) {
      fillRound(ctx, p.x, p.y, p.w, 18, 9, '#c9a86e');
      ctx.fillStyle = '#a87f4a';
      for (let i = 10; i < p.w; i += 34) ctx.fillRect(p.x + i, p.y + 4, 3, 10);
    },
  },
  hive: {
    ground: 640,
    platforms: [
      { x: 214, y: 500, w: 190 },
      { x: 890, y: 456, w: 190 },
    ],
    accent: '#f0c04a',
    static: () => staticLayer('hive', hiveStatic),
    dynamic(ctx, t) {
      // drifting pollen
      ctx.save();
      for (let i = 0; i < 26; i++) {
        const x = (i * 131 + t * 26 + Math.sin(t + i) * 30) % W;
        const y = 120 + ((i * 89) % 430) + Math.sin(t * 0.7 + i * 2) * 18;
        ctx.fillStyle = `rgba(255,220,120,${0.35 + 0.25 * Math.sin(t * 2 + i)})`;
        ctx.beginPath(); ctx.arc(x, y, rand(3, 1.4), 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
    platform(ctx, p) {
      ctx.save();
      ctx.fillStyle = '#fff4d8';
      ctx.strokeStyle = 'rgba(140,100,50,.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + 8, p.w / 2, 18, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(p.x + p.w * 0.3, p.y - 4, p.w * 0.22, 14, 0, 0, TAU);
      ctx.ellipse(p.x + p.w * 0.72, p.y - 2, p.w * 0.2, 12, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },
  ship: {
    ground: 640,
    platforms: [
      { x: 220, y: 500, w: 170 },
      { x: 900, y: 478, w: 170 },
    ],
    accent: '#5fa8a0',
    static: () => staticLayer('ship', shipStatic),
    dynamic(ctx, t) {
      // lantern flicker + rolling fog
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const [x, y] of [[300, 226], [980, 206]]) {
        ctx.fillStyle = `rgba(255,190,90,${0.05 + 0.03 * Math.sin(t * 7 + x)})`;
        ctx.beginPath(); ctx.arc(x, y + 16, 52, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#cfe6e0';
      for (let i = 0; i < 4; i++) {
        const x = ((i * 400 + t * 12) % 1500) - 100;
        ctx.beginPath(); ctx.ellipse(x, 560 + i * 18, 220, 26, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
    platform(ctx, p) {
      fillRound(ctx, p.x, p.y, p.w, 16, 4, '#7a4a29');
      ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 3;
      for (let i = 0; i < p.w; i += 24) {
        ctx.beginPath(); ctx.moveTo(p.x + i, p.y); ctx.lineTo(p.x + i, p.y + 16); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(230,210,170,.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x + 6, p.y + 16); ctx.lineTo(p.x + 6, p.y + 34);
      ctx.moveTo(p.x + p.w - 6, p.y + 16); ctx.lineTo(p.x + p.w - 6, p.y + 34); ctx.stroke();
    },
  },
  ice: {
    ground: 640,
    platforms: [
      { x: 250, y: 512, w: 170 },
      { x: 880, y: 470, w: 180 },
    ],
    accent: '#9fe4ef',
    static: () => staticLayer('ice', iceStatic),
    dynamic(ctx, t) {
      ctx.save();
      // falling snow
      for (let i = 0; i < 60; i++) {
        const x = (i * 71 + Math.sin(t * 0.5 + i) * 40 + t * 8) % W;
        const y = (i * 53 + t * (22 + (i % 5) * 9)) % H;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + (i % 3) * 0.18})`;
        ctx.beginPath(); ctx.arc(x, y, 1 + (i % 4) * 0.7, 0, TAU); ctx.fill();
      }
      // aurora shimmer
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t);
      ctx.fillStyle = '#8fffd8';
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.bezierCurveTo(300, 20 + Math.sin(t) * 20, 700, 160, W, 50);
      ctx.lineTo(W, 190); ctx.bezierCurveTo(700, 230, 300, 110, 0, 180);
      ctx.fill();
      ctx.restore();
      // cold breath haze
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#dff9ff';
      ctx.beginPath(); ctx.ellipse(W / 2, 640, 640, 90, 0, 0, TAU); ctx.fill();
      ctx.restore();
    },
    platform(ctx, p) {
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + 26);
      g.addColorStop(0, '#f6ffff'); g.addColorStop(1, '#a9dbe8');
      fillRound(ctx, p.x, p.y, p.w, 20, 7, g, 'rgba(90,140,160,.9)', 3);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 16; i < p.w; i += 30) {
        ctx.beginPath(); ctx.moveTo(p.x + i, p.y); ctx.lineTo(p.x + i + 8, p.y + 12); ctx.lineTo(p.x + i - 4, p.y + 12); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(140,200,215,.8)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(p.x + p.w * (0.2 + i * 0.28), p.y + 20);
        ctx.lineTo(p.x + p.w * (0.2 + i * 0.28) + 4, p.y + 32 + i * 4);
        ctx.stroke();
      }
    },
  },
  circus: {
    ground: 640,
    platforms: [
      { x: 240, y: 500, w: 180 },
      { x: 870, y: 450, w: 190 },
    ],
    accent: '#d9452f',
    static: () => staticLayer('circus', circusStatic),
    dynamic(ctx, t) {
      // sweeping spotlights
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 3; i++) {
        const x = W / 2 + Math.sin(t * 0.35 + i * 2.1) * 480;
        const g = ctx.createLinearGradient(x, 0, x + 100, 660);
        g.addColorStop(0, 'rgba(255,240,180,.12)');
        g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 40, -20); ctx.lineTo(x + 40, -20);
        ctx.lineTo(x + 170, 680); ctx.lineTo(x - 90, 680);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // dust motes / confetti
      ctx.save();
      for (let i = 0; i < 24; i++) {
        const x = (i * 149 + t * 14) % W;
        const y = (i * 61 + t * 20) % 600;
        ctx.fillStyle = ['#e9b44c', '#d9452f', '#f6e7c6'][i % 3] + '88';
        ctx.save(); ctx.translate(x, y); ctx.rotate(t + i);
        ctx.fillRect(-2, -4, 4, 8);
        ctx.restore();
      }
      ctx.restore();
    },
    platform(ctx, p) {
      fillRound(ctx, p.x, p.y, p.w, 14, 4, '#e9b44c');
      ctx.strokeStyle = '#2b1d17'; ctx.lineWidth = 3;
      ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, 12);
      ctx.fillStyle = '#d9452f';
      for (let i = 8; i < p.w - 8; i += 28) {
        ctx.beginPath(); ctx.arc(p.x + i, p.y + 7, 5, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(240,220,180,.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x + 20, p.y); ctx.lineTo(p.x + 20, 0); ctx.stroke();
      // trapeze ropes
      ctx.strokeStyle = 'rgba(230,210,170,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x + 12, p.y); ctx.lineTo(p.x + 12, p.y - 300);
      ctx.moveTo(p.x + p.w - 12, p.y); ctx.lineTo(p.x + p.w - 12, p.y - 300); ctx.stroke();
    },
  },
};

export function drawArena(ctx, key, t, platforms) {
  const a = ARENAS[key];
  if (!a) return;
  ctx.drawImage(a.static(), 0, 0);
  a.dynamic(ctx, t);
  for (const p of platforms || []) a.platform(ctx, p);
}
