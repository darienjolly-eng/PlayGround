import { W, H, TAU, PAL, clamp, lerp, rand, choice, fillEllipse, fillRound, drawStar, inkText, Particles } from './util.js';
import { drawArena, ARENAS } from './arenas.js';
import { AudioEngine } from './audio.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = {
  title: document.querySelector('#titleUI'), start: document.querySelector('#startBtn'),
  touch: document.querySelector('#touch'), pause: document.querySelector('#pauseBtn'),
  weapon: document.querySelector('#tWeaponName'), super: document.querySelector('#tSuperCount'),
};
const audio = new AudioEngine();
const particles = new Particles();
const keys = new Set();
const weapons = [
  { name: 'PEA', color: '#58d7b1', rate: .19, speed: 750, damage: 1, kind: 'pea', desc: 'STRAIGHT SHOT' },
  { name: 'SPREAD', color: '#ffcb68', rate: .42, speed: 560, damage: 1, kind: 'spread', desc: 'FAN SHOT' },
  { name: 'CHASE', color: '#a9a0ff', rate: .31, speed: 390, damage: .8, kind: 'chase', desc: 'HOMING SHOT' },
  { name: 'LOB', color: '#ff8060', rate: .53, speed: 510, damage: 2, kind: 'lob', desc: 'BOUNCING BOMB' },
];
const acts = [
  { name: 'ROOTIN’ TOOTIN’ TOMATO', title: 'THE GARDEN GANG', arena: 'field', boss: 'tomato', color: '#d94b38', hp: 100, hint: 'A FARM-FRESH FIGHT' },
  { name: 'QUEEN BEEATRICE', title: 'HIVE OF HORNETS', arena: 'hive', boss: 'bee', color: '#e8b833', hp: 112, hint: 'BUZZ OFF!' },
  { name: 'CAP’N C. CLAW', title: 'A SALTY SHOWDOWN', arena: 'ship', boss: 'pirate', color: '#ac7350', hp: 124, hint: 'NO QUARTER GIVEN' },
  { name: 'FROSTY THE FOWL', title: 'A CHILLING CHALLENGE', arena: 'ice', boss: 'snow', color: '#8ecbdc', hp: 136, hint: 'B-B-BRING IT ON' },
  { name: 'RINGMASTER RUMBLE', title: 'THE BIG TOP BRAWL', arena: 'circus', boss: 'clown', color: '#d85257', hp: 150, hint: 'THE SHOW MUST GO ON' },
];

let state = 'title';
let clock = 0;
let actIndex = 0;
let player;
let boss;
let shots = [];
let hazards = [];
let effects = [];
let weaponIndex = 0;
let intro = 0;
let stageTime = 0;
let totalTime = 0;
let flash = 0;
let transition = 0;
let touchState = { fire: false, jump: false, dash: false, super: false, axis: 0 };
let pointerId = null;

function newPlayer() {
  return { x: 290, y: 570, vx: 0, vy: 0, w: 42, h: 66, face: 1, hp: 3, maxHp: 3,
    grounded: false, jumps: 0, invuln: 0, fire: 0, dash: 0, dashCd: 0, parry: 0,
    super: 0, superTime: 0, crouch: false, blink: 0 };
}
function startAct(index) {
  actIndex = index;
  const a = acts[index];
  boss = { x: 910, y: 520, hp: a.hp, maxHp: a.hp, phase: 0, timer: 1.4, attack: 0,
    mood: 'idle', flash: 0, angle: 0, bob: 0, defeated: false, name: a.name, kind: a.boss, size: 1 };
  hazards = []; shots = []; effects = []; stageTime = 0; intro = 2.3; transition = 0;
  if (!player) player = newPlayer();
  audio.setTrack(index); audio.setIntensity(0);
}
function startGame() {
  audio.unlock();
  player = newPlayer(); weaponIndex = 0; totalTime = 0; particles.clear(); startAct(0);
  state = 'playing'; ui.title.classList.add('gone'); ui.touch.classList.remove('hidden');
  ui.pause.classList.remove('hidden'); ui.touch.setAttribute('aria-hidden', 'false');
}
function showTitle() {
  state = 'title'; ui.title.classList.remove('gone'); ui.touch.classList.add('hidden'); ui.pause.classList.add('hidden');
  ui.touch.setAttribute('aria-hidden', 'true');
}
function cycleWeapon() { weaponIndex = (weaponIndex + 1) % weapons.length; ui.weapon.textContent = weapons[weaponIndex].name; audio.fx('select'); }
function pauseGame() { if (state === 'playing') state = 'paused'; else if (state === 'paused') state = 'playing'; }

ui.start.addEventListener('click', startGame);
ui.pause.addEventListener('click', pauseGame);

function keyDown(e) {
  const key = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
  if (key === 'enter' && state !== 'playing') { if (state === 'title' || state === 'gameover' || state === 'victory') startGame(); else if (state === 'actclear') nextAct(); }
  if (key === 'p' || key === 'escape') pauseGame();
  if (!keys.has(key)) {
    if (['q', 'shift'].includes(key) && state === 'playing') {
      if (key === 'q') cycleWeapon(); else tryDash();
    }
    if (key === 'e' && state === 'playing') fireSuper();
    if ((key === ' ' || key === 'arrowup' || key === 'w') && state === 'playing') jump();
  }
  keys.add(key);
}
function keyUp(e) { keys.delete(e.key.toLowerCase()); }
window.addEventListener('keydown', keyDown);
window.addEventListener('keyup', keyUp);
window.addEventListener('blur', () => { keys.clear(); if (state === 'playing') state = 'paused'; });

function bindHold(id, field) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); touchState[field] = true; el.classList.add('on'); if (field === 'jump') jump(); if (field === 'dash') tryDash(); if (field === 'super') fireSuper(); });
  const release = e => { touchState[field] = false; el.classList.remove('on'); };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
}
bindHold('tFire', 'fire'); bindHold('tJump', 'jump'); bindHold('tDash', 'dash'); bindHold('tSuper', 'super');
document.querySelector('#tWeapon').addEventListener('pointerdown', e => { e.preventDefault(); cycleWeapon(); });
const pad = document.querySelector('#pad'), knob = document.querySelector('#padKnob');
pad.addEventListener('pointerdown', e => { e.preventDefault(); pointerId = e.pointerId; pad.setPointerCapture(pointerId); updatePad(e); });
pad.addEventListener('pointermove', e => { if (e.pointerId === pointerId) updatePad(e); });
function releasePad(e) { if (e.pointerId === pointerId) { pointerId = null; touchState.axis = 0; knob.style.transform = 'translate(-50%, -50%)'; } }
pad.addEventListener('pointerup', releasePad); pad.addEventListener('pointercancel', releasePad);
function updatePad(e) {
  const r = pad.getBoundingClientRect(); const dx = (e.clientX - r.left - r.width / 2) / (r.width * .32);
  touchState.axis = Math.abs(dx) < .18 ? 0 : clamp(dx, -1, 1);
  knob.style.transform = `translate(calc(-50% + ${clamp(dx, -1, 1) * r.width * .25}px), -50%)`;
}

function jump() {
  if (state !== 'playing' || !player || player.jumps >= 2) return;
  player.vy = player.jumps === 0 ? -690 : -620; player.grounded = false; player.jumps++;
  player.parry = .18; audio.fx('jump');
  if (player.jumps === 2) particles.burst(player.x, player.y + 28, 8, PAL.paper, { speed: 120, grav: -60, size: 4, life: .3 });
}
function tryDash() {
  if (state !== 'playing' || !player || player.dashCd > 0) return;
  player.dash = .22; player.dashCd = .72; player.invuln = Math.max(player.invuln, .28);
  player.vx = player.face * 850; player.vy = 0; audio.fx('dash');
  for (let i = 0; i < 7; i++) effects.push({ x: player.x - player.face * i * 12, y: player.y, life: .2, color: '#fff2d5', size: 20 - i });
}
function fireSuper() {
  if (state !== 'playing' || !player || player.super < 5 || player.superTime > 0) return;
  player.super = 0; player.superTime = .75; ui.super.textContent = '0'; audio.fx('super');
  shots.push({ x: player.x + player.face * 30, y: player.y - 20, vx: player.face * 820, vy: 0, r: 32, damage: 25, color: '#ffe078', kind: 'super', life: 1.2, pierce: true });
}

function update(dt) {
  if (state === 'actclear') {
    transition += dt; particles.update(dt);
    if (transition > 2.6) nextAct();
    return;
  }
  totalTime += dt; stageTime += dt; intro = Math.max(0, intro - dt); flash = Math.max(0, flash - dt);
  const a = acts[actIndex];
  player.invuln = Math.max(0, player.invuln - dt); player.dashCd = Math.max(0, player.dashCd - dt);
  player.dash = Math.max(0, player.dash - dt); player.parry = Math.max(0, player.parry - dt); player.superTime = Math.max(0, player.superTime - dt);
  player.blink += dt * 10;
  const left = keys.has('a') || keys.has('arrowleft') || touchState.axis < -.15;
  const right = keys.has('d') || keys.has('arrowright') || touchState.axis > .15;
  const duck = keys.has('s') || keys.has('arrowdown');
  const moving = Number(right) - Number(left);
  if (player.dash <= 0) {
    if (moving) { player.vx = lerp(player.vx, moving * 320, Math.min(1, dt * 11)); player.face = moving; }
    else player.vx = lerp(player.vx, 0, Math.min(1, dt * (player.grounded ? 12 : 3)));
  }
  player.crouch = duck && player.grounded;
  player.x += player.vx * dt;
  if (player.dash <= 0) { player.vy += 1900 * dt; player.y += player.vy * dt; }
  player.x = clamp(player.x, 46, W - 46);
  const floor = ARENAS[a.arena].ground;
  let landed = false;
  if (player.y + player.h / 2 >= floor) { player.y = floor - player.h / 2; player.vy = 0; landed = true; }
  for (const p of ARENAS[a.arena].platforms) {
    const oldFeet = player.y + player.h / 2 - player.vy * dt;
    if (player.vy >= 0 && oldFeet <= p.y + 3 && player.y + player.h / 2 >= p.y && player.x + 14 > p.x && player.x - 14 < p.x + p.w) {
      player.y = p.y - player.h / 2; player.vy = 0; landed = true;
    }
  }
  if (landed) { player.grounded = true; player.jumps = 0; } else player.grounded = false;
  if (player.dash <= 0 && (keys.has('x') || keys.has('j') || touchState.fire)) shoot(dt);
  if (boss && !boss.defeated) updateBoss(dt);
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.life -= dt;
    if (s.kind === 'chase' && boss && !boss.defeated) {
      const target = Math.atan2(boss.y - s.y, boss.x - s.x), current = Math.atan2(s.vy, s.vx);
      let d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
      const v = Math.hypot(s.vx, s.vy), ang = current + clamp(d, -dt * 2.8, dt * 2.8); s.vx = Math.cos(ang) * v; s.vy = Math.sin(ang) * v;
    }
    if (s.kind === 'lob') { s.vy += 740 * dt; if (s.y > floor - 12) { s.y = floor - 12; s.vy *= -.62; if (Math.abs(s.vy) < 90) s.vy = 0; } }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (boss && !boss.defeated && Math.abs(s.x - boss.x) < (s.r + 74) && Math.abs(s.y - boss.y) < (s.r + 90)) {
      damageBoss(s.damage); particles.burst(s.x, s.y, s.kind === 'super' ? 8 : 3, s.color, { speed: 130, size: 3, life: .24 });
      if (!s.pierce) { shots.splice(i, 1); continue; }
    }
    if (s.life <= 0 || s.x < -80 || s.x > W + 80 || s.y < -80 || s.y > H + 80) shots.splice(i, 1);
  }
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i]; h.life -= dt; h.age = (h.age || 0) + dt;
    if (h.type === 'aimed') { h.x += h.vx * dt; h.y += h.vy * dt; }
    else if (h.type === 'drop') { h.y += h.vy * dt; h.x += (h.vx || 0) * dt; }
    else if (h.type === 'wave') { h.x += h.vx * dt; h.y = floor - 20 - Math.sin(h.age * 4) * 9; }
    else if (h.type === 'float') { h.x += h.vx * dt; h.y += h.vy * dt + Math.sin(h.age * 5 + h.seed) * 34 * dt; }
    if (h.type === 'warning' && h.age > h.delay) { hazards.splice(i, 1); spawnHazard(h.x, floor - 8, 'wave', 260, false); continue; }
    if (h.age > (h.delay || 0) && circleRect(h.x, h.y, h.r || 18, player.x, player.y - (player.crouch ? 12 : 0), 34, player.crouch ? 42 : 62)) {
      if (h.parry && player.parry > 0) {
        hazards.splice(i, 1); player.parry = 0; player.super = Math.min(5, player.super + 1); ui.super.textContent = player.super;
        particles.burst(player.x, player.y - 20, 18, PAL.pink, { speed: 260, grav: -40, life: .5 }); audio.fx('parry'); continue;
      }
      if (!h.parry) hurtPlayer();
    }
    if (h.life <= 0 || h.x < -100 || h.x > W + 100 || h.y > H + 100) hazards.splice(i, 1);
  }
  for (let i = effects.length - 1; i >= 0; i--) { effects[i].life -= dt; if (effects[i].life <= 0) effects.splice(i, 1); }
  particles.update(dt);
  if (boss && boss.hp <= 0 && !boss.defeated) defeatBoss();
  if (state === 'actclear') { transition += dt; if (transition > 2.6) nextAct(); }
}
function circleRect(cx, cy, r, x, y, w, h) {
  const px = clamp(cx, x - w / 2, x + w / 2), py = clamp(cy, y - h / 2, y + h / 2);
  return (cx - px) ** 2 + (cy - py) ** 2 < r ** 2;
}
function shoot(dt) {
  player.fire -= dt; if (player.fire > 0) return;
  const w = weapons[weaponIndex]; player.fire = w.rate; audio.fx(weaponIndex === 2 ? 'chaser' : weaponIndex === 3 ? 'lob' : 'shoot');
  const x = player.x + player.face * 26, y = player.y - (player.crouch ? 8 : 20);
  const add = (angle, damage = w.damage) => shots.push({ x, y, vx: Math.cos(angle) * w.speed, vy: Math.sin(angle) * w.speed,
    r: weaponIndex === 3 ? 11 : 7, damage, color: w.color, kind: w.kind, life: 2.3 });
  if (weaponIndex === 1) [-.32, 0, .32].forEach(v => add(v)); else add(weaponIndex === 3 ? -.95 : 0);
  particles.burst(x, y, 3, w.color, { speed: 70, angle: player.face > 0 ? 0 : Math.PI, grav: 0, life: .18, size: 3 });
}
function damageBoss(amount) {
  if (!boss || boss.defeated) return;
  boss.hp = Math.max(0, boss.hp - amount); boss.flash = .1;
  if (Math.random() < .18 && player.super < 5) { player.super++; ui.super.textContent = player.super; }
  audio.setIntensity(1 - boss.hp / boss.maxHp);
}
function hurtPlayer() {
  if (player.invuln > 0 || player.dash > 0) return;
  player.hp--; player.invuln = 1.15; player.vx = player.x < boss.x ? -240 : 240; player.vy = -320;
  flash = .18; audio.fx('hurt'); particles.burst(player.x, player.y - 20, 14, [PAL.paper, PAL.red, PAL.gold], { speed: 220, life: .45 });
  if (player.hp <= 0) { state = 'gameover'; audio.fx('death'); }
}

function spawnHazard(x, y, type = 'aimed', speed = 260, parry = Math.random() < .15) {
  const dx = player.x - x, dy = player.y - y, ang = Math.atan2(dy, dx);
  hazards.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, type, r: type === 'wave' ? 20 : 15,
    life: type === 'wave' ? 4.5 : 5, age: 0, parry, seed: rand(TAU), color: parry ? PAL.pink : acts[actIndex].color });
}
function bossAttack() {
  const b = boss, kind = b.kind, attack = b.attack++ % 3;
  audio.fx('telegraph');
  if (kind === 'tomato') {
    if (attack === 0) { for (let i = 0; i < 3; i++) spawnHazard(b.x - 20, b.y - 10 + i * 18, 'aimed', 230 + i * 35, i === 1); }
    else if (attack === 1) { for (let i = 0; i < 5; i++) spawnHazard(b.x - 50, 440 + i * 18, 'drop', 0, i === 2); hazards.slice(-5).forEach(h => { h.vy = 145 + Math.random() * 65; h.vx = -90; h.type = 'drop'; }); }
    else spawnHazard(b.x - 50, ARENAS[acts[actIndex].arena].ground - 18, 'wave', 280, false);
  } else if (kind === 'bee') {
    if (attack === 0) { for (let i = -2; i <= 2; i++) { const h = { x: b.x - 60, y: b.y, vx: -290, vy: i * 80, r: 12, life: 4, age: 0, type: 'aimed', parry: i === 0, color: PAL.gold }; hazards.push(h); } }
    else if (attack === 1) { const x = clamp(player.x, 180, 1100); hazards.push({ x, y: 0, vx: 0, vy: 245, r: 23, life: 4, age: 0, type: 'drop', parry: true, color: PAL.pink }); }
    else { for (let i = 0; i < 6; i++) spawnHazard(b.x - 30, b.y, 'aimed', 250, i === 2); }
  } else if (kind === 'pirate') {
    if (attack === 0) { for (let i = -1; i <= 1; i++) { const h = { x: b.x - 70, y: b.y - 8, vx: -310, vy: i * 95, r: 17, life: 4, age: 0, type: 'aimed', parry: i === 0, color: i === 0 ? PAL.pink : '#e5c28a' }; hazards.push(h); } }
    else if (attack === 1) { for (let i = 0; i < 4; i++) { const h = { x: 120 + i * 300, y: 0, vx: 0, vy: 200, r: 21, life: 4, age: 0, type: 'drop', parry: false, color: '#cf6b45' }; hazards.push(h); } }
    else spawnHazard(b.x - 30, 610, 'wave', 340, false);
  } else if (kind === 'snow') {
    if (attack === 0) { for (let i = 0; i < 7; i++) { const x = 70 + i * 190; hazards.push({ x, y: -10, vx: -70, vy: 220 + i % 2 * 50, r: 16, life: 4, age: 0, type: 'drop', parry: i === 3, color: i === 3 ? PAL.pink : '#bff6ff' }); } }
    else if (attack === 1) { const h = { x: b.x - 50, y: b.y, vx: -300, vy: 0, r: 28, life: 4, age: 0, type: 'float', parry: true, color: PAL.pink }; hazards.push(h); }
    else for (let i = -2; i <= 2; i++) { const h = { x: b.x - 40, y: b.y, vx: -290, vy: i * 95, r: 14, life: 4, age: 0, type: 'aimed', parry: false, color: '#d9faff' }; hazards.push(h); }
  } else {
    if (attack === 0) { for (let i = 0; i < 5; i++) { const h = { x: b.x - 40, y: b.y - 10, vx: -240, vy: (i - 2) * 85, r: 18, life: 4, age: 0, type: 'aimed', parry: i === 2, color: i === 2 ? PAL.pink : ['#de4554','#e9b44c','#77c3ae'][i % 3] }; hazards.push(h); } }
    else if (attack === 1) { const x = clamp(player.x + rand(180, -180), 110, 1170); hazards.push({ x, y: 0, vx: 0, vy: 300, r: 24, life: 3, age: 0, type: 'drop', parry: true, color: PAL.pink }); }
    else { for (let i = 0; i < 3; i++) spawnHazard(b.x - 50, b.y + i * 12, 'aimed', 330, i === 1); }
  }
}

function updateBoss(dt) {
  const b = boss, floor = ARENAS[acts[actIndex].arena].ground;
  b.bob += dt * (b.kind === 'bee' ? 5 : 2.4);
  b.flash = Math.max(0, b.flash - dt);
  b.timer -= dt;
  const phase = b.hp < b.maxHp * .5 ? 1 : 0;
  if (phase !== b.phase) { b.phase = phase; b.timer = .35; audio.fx('phase'); }
  const targetY = floor - (b.kind === 'pirate' ? 116 : 126) + Math.sin(b.bob) * (b.kind === 'bee' ? 18 : 8);
  if (b.kind === 'bee' || b.kind === 'snow' || b.kind === 'clown') {
    b.x = 920 + Math.sin(stageTime * (b.phase ? 1.45 : .8)) * 100;
    b.y = lerp(b.y, targetY + Math.sin(b.bob * 1.4) * 35, Math.min(1, dt * 2.4));
  } else {
    b.x = lerp(b.x, 900 + Math.sin(stageTime * .7) * 46, dt * 1.4);
    b.y = lerp(b.y, targetY, dt * 2);
  }
  if (b.timer <= 0 && intro <= 0) {
    bossAttack();
    b.timer = (b.phase ? 1.45 : 2.15) + rand(.45, -.25);
    b.mood = 'attack';
  } else if (b.timer > .55) b.mood = 'idle';
}
function defeatBoss() {
  boss.defeated = true; boss.hp = 0; hazards.length = 0; shots.length = 0;
  state = 'actclear'; transition = 0; audio.setIntensity(0); audio.fx('victory');
  particles.burst(boss.x, boss.y, 48, [PAL.gold, PAL.paper, acts[actIndex].color], { speed: 300, life: .9, size: 6 });
}
function nextAct() {
  if (actIndex >= acts.length - 1) {
    state = 'victory'; audio.fx('victory'); return;
  }
  actIndex++;
  player.hp = Math.min(player.maxHp, player.hp + 1);
  player.x = 270; player.y = 570; player.vx = 0; player.vy = 0; player.invuln = 1;
  player.super = Math.min(5, player.super + 1); ui.super.textContent = player.super;
  startAct(actIndex); state = 'playing';
}
function drawBoss() {
  if (!boss) return;
  const b = boss, x = b.x, y = b.y, c = acts[actIndex].color;
  ctx.save(); ctx.translate(x, y); ctx.scale(boss.flash > 0 ? 1.05 : 1, 1);
  if (boss.flash > 0) ctx.globalAlpha = .68 + Math.sin(clock * 90) * .24;
  // Shared expressive face and act-specific silhouette.
  if (b.kind === 'tomato') {
    fillEllipse(ctx, 0, 0, 82, 91, c); fillEllipse(ctx, 0, 7, 67, 69, '#ef6749', PAL.ink, 3);
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i * TAU / 5 + clock * .3); fillEllipse(ctx, 0, -89, 15, 32, '#6d9d43'); ctx.restore(); }
    fillEllipse(ctx, -28, 62, 18, 30, '#6d9d43'); fillEllipse(ctx, 29, 62, 18, 30, '#6d9d43');
  } else if (b.kind === 'bee') {
    fillEllipse(ctx, 0, 8, 77, 65, '#eab936');
    ctx.save(); ctx.rotate(Math.sin(clock * 20) * .18); fillEllipse(ctx, -48, -54, 35, 18, '#fff3d3'); ctx.restore();
    ctx.save(); ctx.rotate(-Math.sin(clock * 20) * .18); fillEllipse(ctx, 46, -54, 35, 18, '#fff3d3'); ctx.restore();
    for (let i = -1; i <= 1; i++) fillEllipse(ctx, i * 36, 8, 9, 63, '#553b2b', null, 0);
    fillEllipse(ctx, 0, -59, 49, 28, '#e5c28a'); fillEllipse(ctx, -4, -85, 43, 9, '#d74a43');
  } else if (b.kind === 'pirate') {
    fillEllipse(ctx, 0, 14, 83, 73, '#9a6246');
    fillRound(ctx, -53, -68, 106, 28, 6, '#2b211e'); fillRound(ctx, -35, -85, 70, 26, 6, '#473128');
    fillEllipse(ctx, 41, -4, 17, 18, '#efe2c5'); fillEllipse(ctx, 41, -4, 7, 9, PAL.ink, null, 0);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-19, -1, 14, Math.PI, 0); ctx.stroke();
    for (let i = -1; i <= 1; i++) fillEllipse(ctx, i * 27, 74, 15, 27, '#e2c89d');
  } else if (b.kind === 'snow') {
    fillEllipse(ctx, 0, 12, 72, 76, '#f8f2dc'); fillEllipse(ctx, 0, -54, 59, 58, '#fffaf0');
    fillRound(ctx, -66, -106, 132, 21, 5, '#36586a'); fillRound(ctx, -43, -139, 86, 38, 6, '#36586a');
    fillEllipse(ctx, -19, -60, 5, 7, PAL.ink, null, 0); fillEllipse(ctx, 20, -60, 5, 7, PAL.ink, null, 0);
    ctx.strokeStyle = '#9b4936'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, -47); ctx.lineTo(-27, -42); ctx.lineTo(0, -36); ctx.stroke();
    fillEllipse(ctx, -65, 24, 19, 28, '#f8f2dc'); fillEllipse(ctx, 65, 24, 19, 28, '#f8f2dc');
  } else {
    fillEllipse(ctx, 0, 7, 67, 78, '#efc99a');
    fillEllipse(ctx, 0, -80, 57, 34, '#d84351'); fillEllipse(ctx, -39, -82, 20, 33, '#f4d457'); fillEllipse(ctx, 39, -82, 20, 33, '#f4d457');
    fillEllipse(ctx, -53, 26, 22, 38, '#d84351'); fillEllipse(ctx, 53, 26, 22, 38, '#d84351');
    fillEllipse(ctx, -24, 0, 6, 8, PAL.ink, null, 0); fillEllipse(ctx, 23, 0, 6, 8, PAL.ink, null, 0);
    fillEllipse(ctx, 0, 25, 30, 20, '#fff8e9');
  }
  if (b.kind !== 'snow' && b.kind !== 'clown') {
    fillEllipse(ctx, -25, -13, 8, 12, PAL.paper); fillEllipse(ctx, 24, -13, 8, 12, PAL.paper);
    fillEllipse(ctx, -23, -12, 3, 5, PAL.ink, null, 0); fillEllipse(ctx, 26, -12, 3, 5, PAL.ink, null, 0);
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 20, 23, .15, Math.PI - .15); ctx.stroke();
  }
  ctx.restore();
}
function drawPlayer() {
  const p = player; if (!p) return;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.face, 1);
  if (p.invuln > 0 && Math.floor(clock * 18) % 2) ctx.globalAlpha = .45;
  if (p.dash > 0) ctx.globalAlpha = .72;
  // Little cup-headed hero with straw, gloves and red shorts.
  fillRound(ctx, -16, -25, 32, 39, 9, '#fff8e7');
  fillEllipse(ctx, 0, -24, 18, 13, '#fff8e7');
  fillRound(ctx, -19, -15, 38, 8, 4, '#df4c3a');
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(5, -34); ctx.lineTo(12, -48); ctx.lineTo(18, -46); ctx.stroke();
  fillEllipse(ctx, -6, -23, 3, 5, PAL.ink, null, 0); fillEllipse(ctx, 7, -23, 3, 5, PAL.ink, null, 0);
  ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(1, -14, 7, .2, Math.PI - .2); ctx.stroke();
  const leg = Math.sin(clock * 16) * Math.min(4, Math.abs(p.vx) / 60);
  fillRound(ctx, -13, 13, 10, 22 + leg, 5, '#e7bf83'); fillRound(ctx, 3, 13, 10, 22 - leg, 5, '#e7bf83');
  fillEllipse(ctx, -7, 35 + leg, 13, 7, '#fff8e7'); fillEllipse(ctx, 9, 35 - leg, 13, 7, '#fff8e7');
  fillEllipse(ctx, 23, -6, 12, 9, '#fff8e7');
  if (p.parry > 0) { ctx.globalAlpha = .5 + Math.sin(clock * 35) * .35; fillEllipse(ctx, 18, -23, 27, 27, '#ff78ad', null, 0); }
  ctx.restore();
}
function drawHud() {
  const a = acts[actIndex];
  ctx.save();
  fillRound(ctx, 26, 22, 220, 56, 12, 'rgba(43,29,23,.78)', '#f6e7c6', 2);
  inkText(ctx, 'HP', 48, 47, 17, { align: 'left', fill: PAL.gold, stroke: PAL.ink });
  for (let i = 0; i < player.maxHp; i++) {
    const x = 89 + i * 42;
    fillEllipse(ctx, x, 49, 13, 13, i < player.hp ? '#e65443' : '#65564b', '#fdf6e3', 2);
    if (i < player.hp) fillEllipse(ctx, x - 3, 45, 3, 3, '#fff2d6', null, 0);
  }
  fillRound(ctx, 445, 27, 390, 25, 12, 'rgba(43,29,23,.78)', '#f6e7c6', 2);
  fillRound(ctx, 450, 32, 380 * (boss.hp / boss.maxHp), 15, 8, a.color, null, 0);
  inkText(ctx, a.name, 640, 68, 19, { fill: PAL.paper, stroke: PAL.ink, lw: 4 });
  inkText(ctx, `${weaponIndex + 1}  ${weapons[weaponIndex].name}`, 1114, 41, 17, { fill: PAL.paper, stroke: PAL.ink, align: 'right' });
  inkText(ctx, `SUPER ${'◆'.repeat(player.super)}${'◇'.repeat(5 - player.super)}`, 1114, 67, 15, { fill: PAL.gold, stroke: PAL.ink, align: 'right' });
  ctx.restore();
}
function drawOverlay() {
  if (intro > 0 && state === 'playing') {
    const alpha = Math.min(1, intro * 2);
    ctx.save(); ctx.globalAlpha = alpha;
    fillRound(ctx, 365, 270, 550, 108, 14, 'rgba(43,29,23,.82)', '#f6e7c6', 3);
    inkText(ctx, `ACT ${actIndex + 1}`, 640, 296, 17, { fill: PAL.gold });
    inkText(ctx, acts[actIndex].title, 640, 333, 30, { fill: PAL.paper, lw: 5 });
    inkText(ctx, acts[actIndex].hint, 640, 361, 14, { fill: '#f5cb6b', lw: 3 });
    ctx.restore();
  }
  if (state === 'paused' || state === 'gameover' || state === 'victory' || state === 'actclear') {
    ctx.fillStyle = 'rgba(25,15,12,.62)'; ctx.fillRect(0, 0, W, H);
    fillRound(ctx, 350, 235, 580, 235, 20, '#f5e8c9', '#2b1d17', 6);
    const title = state === 'paused' ? 'PAUSED' : state === 'gameover' ? 'KNOCKOUT!' : state === 'victory' ? 'YOU’RE A STAR!' : 'KNOCKOUT!';
    inkText(ctx, title, 640, 304, 43, { fill: state === 'gameover' ? PAL.red : PAL.ink, stroke: '#fdf6e3', lw: 2 });
    const msg = state === 'paused' ? 'PRESS P OR TAP II TO RESUME' : state === 'gameover' ? 'PRESS ENTER OR TAP START TO TRY AGAIN' : state === 'victory' ? 'ALL FIVE ACTS CLEARED — A+ SHOW!' : 'NEXT ACT IN A FLASH…';
    inkText(ctx, msg, 640, 365, 16, { fill: PAL.ink, stroke: '#f5e8c9', lw: 0 });
    if (state === 'actclear') inkText(ctx, acts[actIndex].name, 640, 405, 18, { fill: PAL.red, stroke: '#f5e8c9', lw: 0 });
  }
}
function draw() {
  const a = acts[actIndex] || acts[0];
  drawArena(ctx, a.arena, clock, ARENAS[a.arena].platforms);
  // Screen edge vignette and subtle print wobble for the hand-inked stage.
  const vignette = ctx.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 760);
  vignette.addColorStop(0, 'rgba(20,12,8,0)'); vignette.addColorStop(1, 'rgba(20,12,8,.28)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  for (const h of hazards) {
    ctx.save(); ctx.translate(h.x, h.y);
    if (h.parry) { ctx.shadowColor = '#ff4f98'; ctx.shadowBlur = 18; }
    fillEllipse(ctx, 0, 0, h.r, h.r * (h.type === 'wave' ? .72 : 1), h.color || PAL.red, PAL.ink, 3);
    fillEllipse(ctx, -h.r * .28, -h.r * .28, h.r * .24, h.r * .24, '#fff5dd', null, 0);
    ctx.restore();
  }
  for (const s of shots) {
    ctx.save(); ctx.shadowColor = s.color; ctx.shadowBlur = s.kind === 'super' ? 22 : 10;
    fillEllipse(ctx, s.x, s.y, s.r, s.r * .72, s.color, PAL.ink, 2);
    if (s.kind === 'super') drawStar(ctx, s.x, s.y, s.r * 1.25, s.r * .48, 5, '#fff5c3', null, 0, clock * 5);
    ctx.restore();
  }
  drawBoss(); drawPlayer();
  for (const e of effects) { ctx.globalAlpha = Math.max(0, e.life / .2); fillEllipse(ctx, e.x, e.y, e.size, e.size * .62, e.color, null, 0); }
  ctx.globalAlpha = 1; particles.draw(ctx);
  if (state !== 'title') drawHud();
  if (flash > 0) { ctx.fillStyle = `rgba(255,235,215,${flash * 1.8})`; ctx.fillRect(0, 0, W, H); }
  drawOverlay();
  if (state === 'title') drawTitleCard();
}
function drawTitleCard() {
  ctx.save();
  fillRound(ctx, 258, 105, 764, 212, 25, 'rgba(43,29,23,.82)', '#f5e7c6', 5);
  inkText(ctx, 'CUP CLASH', 640, 180, 78, { fill: '#f3bd51', stroke: PAL.ink, lw: 9, shadow: 5, letter: 5 });
  inkText(ctx, 'A BOSS RUSH IN FIVE ACTS', 640, 242, 22, { fill: PAL.paper, stroke: PAL.ink, lw: 4, letter: 3 });
  inkText(ctx, 'RUN  •  JUMP  •  PARRY  •  SHOOT', 640, 282, 14, { fill: '#f0d7a1', stroke: PAL.ink, lw: 3, letter: 2 });
  ctx.restore();
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.033, (now - last) / 1000 || 0); last = now; clock += dt;
  if (state === 'playing' || state === 'actclear') update(dt);
  draw(); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
