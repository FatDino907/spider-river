'use strict';
// ====== Easy-to-change names ======
const HERO_NAME = 'Spider-River';   // hero name shown on the title screen
const KID_NAME  = 'River';          // used in "You saved the city, River!"
// ==================================
const RESCUE_GOAL = 6;        // people to save across the city
const LEVEL_LEN = 15000;      // city length in pixels (finish line)
const GRAV = 1650, RUN = 230, FEET = 40, R = 26, MAXV = 950;
const HS_KEY = 'spider-river-best', MUTE_KEY = 'spider-river-mute';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 390, H = 844, S = 1, OX = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const cw = innerWidth, ch = innerHeight;
  S = Math.min(cw / 390, ch / 640); W = 390; H = Math.round(ch / S); OX = (cw - 390 * S) / 2;
  cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  bgCache = null;
}
addEventListener('resize', resize);

// ---------- seeded random ----------
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const qs = new URLSearchParams(location.search);
let rnd = Math.random;

// ---------- images ----------
const IMG = {};
['river_swing', 'river_fly', 'bot', 'goon', 'drone', 'cat', 'granny', 'kid'].forEach(n => { const i = new Image(); i.src = 'img/' + n + '.png'; IMG[n] = i; });
IMG.portrait = new Image(); IMG.portrait.src = 'img/portrait.jpg';
const ok = i => i && i.complete && i.naturalWidth > 0;
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }

// ---------- pre-rendered small sprites ----------
function spiderGlyph(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * 0.09; g.lineCap = 'round';
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
    const a = (-0.9 + i * 0.6); g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(sd * s * 0.35 * Math.cos(a) , s * 0.35 * Math.sin(a) - s * 0.12, sd * s * 0.5 * Math.cos(a * 1.1), s * 0.5 * Math.sin(a * 1.2) + s * 0.05); g.stroke();
  }
  g.beginPath(); g.ellipse(0, -s * 0.08, s * 0.1, s * 0.12, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(0, s * 0.14, s * 0.13, s * 0.18, 0, 0, 7); g.fill();
  g.restore();
}
const TOKEN = mk(56, 56, (g) => {
  const gr = g.createRadialGradient(28, 28, 4, 28, 28, 28);
  gr.addColorStop(0, 'rgba(255,80,140,0.9)'); gr.addColorStop(0.45, 'rgba(255,40,90,0.55)'); gr.addColorStop(1, 'rgba(255,40,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 56, 56);
  g.beginPath(); g.arc(28, 28, 14, 0, 7); g.fillStyle = '#ff2e5f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#ffd1e0'; g.stroke();
  spiderGlyph(g, 28, 27, 22, '#1a0610');
});
const PAGE = mk(60, 70, (g) => {
  const gr = g.createRadialGradient(30, 35, 5, 30, 35, 34); gr.addColorStop(0, 'rgba(190,90,255,.8)'); gr.addColorStop(1, 'rgba(190,90,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 60, 70);
  g.save(); g.translate(30, 35); g.rotate(-0.12);
  g.fillStyle = '#fff7e6'; g.fillRect(-16, -21, 32, 42); g.strokeStyle = '#1a0a24'; g.lineWidth = 2; g.strokeRect(-16, -21, 32, 42);
  g.fillStyle = '#ff3a6e'; g.fillRect(-13, -18, 26, 14); g.fillStyle = '#8a3dff'; g.fillRect(-13, -2, 12, 20); g.fillStyle = '#ffcc33'; g.fillRect(1, -2, 12, 20);
  g.fillStyle = '#1a0a24'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('POW', 0, -8);
  g.restore();
});
const HEART = mk(48, 44, (g) => {
  g.translate(24, 24); g.fillStyle = '#ff2e5f'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-26, -4, -12, -24, 0, -10); g.bezierCurveTo(12, -24, 26, -4, 0, 14); g.fill(); g.stroke();
});
const HALF = mk(8, 8, (g) => { g.fillStyle = 'rgba(255,120,200,0.55)'; g.beginPath(); g.arc(4, 4, 1.4, 0, 7); g.fill(); });
let halfPat = null;
function splat(g, x, y, r, col, rr) {
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  for (let i = 0; i < 14; i++) { const a = rr() * 7, d = r * (0.8 + rr() * 1.4), s = r * (0.06 + rr() * 0.22); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, 7); g.fill(); }
  for (let i = 0; i < 4; i++) { const xx = x + (rr() - .5) * r; g.fillRect(xx, y, r * 0.08, r * (0.6 + rr() * 1.2)); }
}

// ---------- background layers ----------
let bgCache = null;
function skyline(w, h, base, win, rr, minH, maxH, wins) {
  return mk(w, h, (g) => {
    let x = 0;
    while (x < w) {
      const bw = 40 + rr() * 70, bh = minH + rr() * (maxH - minH), y = h - bh;
      g.fillStyle = base; g.fillRect(x, y, bw + 1, bh);
      if (rr() < 0.25) { g.fillRect(x + bw / 2 - 3, y - 30, 6, 30); g.fillStyle = rr() < .5 ? '#ff3a8c' : '#55e6ff'; g.fillRect(x + bw / 2 - 1, y - 30, 2, 26); }
      if (wins) for (let yy = y + 8; yy < h - 6; yy += 12) for (let xx = x + 6; xx < x + bw - 6; xx += 10) if (rr() < 0.28) { g.fillStyle = win[(rr() * win.length) | 0]; g.fillRect(xx, yy, 4, 6); }
      x += bw + rr() * 6;
    }
  });
}
function buildBg() {
  const rr = mulberry(77);
  const splats = mk(800, H, (g) => {
    g.globalAlpha = 0.5; splat(g, 180, H * 0.32, 90, '#e0194f', rr); splat(g, 560, H * 0.22, 70, '#9b2cff', rr);
    g.globalAlpha = 0.35; splat(g, 700, H * 0.45, 60, '#ff6a2b', rr); splat(g, 380, H * 0.5, 50, '#ff3aa0', rr);
  });
  bgCache = {
    splats,
    far: skyline(900, Math.round(H * 0.62), '#2a0f4a', ['#ff7ad1', '#7be0ff', '#ffd27a'], rr, H * 0.18, H * 0.5, true),
    mid: skyline(1000, Math.round(H * 0.55), '#170828', ['#ff4f9a', '#ffcf6b', '#6fd6ff', '#ff4f9a'], rr, H * 0.15, H * 0.42, true),
  };
  halfPat = ctx.createPattern(HALF, 'repeat');
}

// ---------- level ----------
let B, TOK, EN, CIV, PAGES, HEARTS, finishX;
function genLevel() {
  rnd = qs.has('seed') ? mulberry(+qs.get('seed')) : Math.random;
  B = []; TOK = []; EN = []; CIV = []; PAGES = []; HEARTS = [];
  let x = -300;
  while (x < LEVEL_LEN + 900) {
    const first = B.length === 0, prog = Math.max(0, x / LEVEL_LEN);
    const w = first ? 760 : (x > LEVEL_LEN - 100 ? 900 : 170 + rnd() * 210);
    const y = first ? H - 250 : H - (190 + rnd() * 190);
    B.push({ x, w, y, seed: (rnd() * 1e9) | 0, tower: !first && rnd() < 0.3, img: null });
    x += w + (first ? 110 : 70 + rnd() * 100 + prog * 70);
  }
  const fb = B.find(b => b.x + b.w > LEVEL_LEN); finishX = Math.max(LEVEL_LEN, fb.x + 120);
  // tokens: arcs over gaps + rows on roofs
  for (let i = 0; i < B.length - 1; i++) {
    const a = B[i], b = B[i + 1]; if (a.x > LEVEL_LEN) break;
    const gx = a.x + a.w, gw = b.x - gx, top = Math.min(a.y, b.y) - 150 - rnd() * 120;
    const n = 5;
    for (let k = 0; k < n; k++) { const t = k / (n - 1); TOK.push({ x: gx - 60 + t * (gw + 120), y: top + 4 * 70 * (t - 0.5) * (t - 0.5), got: false }); }
    if (i > 0 && rnd() < 0.5) for (let k = 0; k < 3; k++) TOK.push({ x: a.x + 40 + k * 40, y: a.y - 45, got: false });
  }
  // civilians spread evenly
  const usable = B.filter(b => b.x > 500 && b.x < LEVEL_LEN - 400);
  const civB = new Set(); const types = ['granny', 'cat', 'kid'];
  for (let k = 0; k < RESCUE_GOAL; k++) {
    const b = usable[Math.round((k + 0.6) * usable.length / RESCUE_GOAL)] || usable[usable.length - 1];
    civB.add(b); const t = types[k % 3];
    CIV.push({ type: t, b, x: b.x + b.w * 0.6, y: t === 'cat' ? b.y - 92 : b.y, saved: false, t: 0, ph: rnd() * 6 });
  }
  // enemies, a little more as you go (gentle)
  for (const b of B) {
    if (b.x < 700 || b.x > LEVEL_LEN - 200 || civB.has(b)) continue;
    const prog = b.x / LEVEL_LEN;
    if (rnd() < 0.3 + prog * 0.35) {
      const type = rnd() < 0.5 ? 'bot' : 'goon';
      EN.push({ type, x: b.x + b.w * (0.3 + rnd() * 0.4), y: b.y, min: b.x + 25, max: b.x + b.w - 25, dir: -1, sp: 30 + rnd() * 25 + prog * 25, alive: true, wt: 0, ph: rnd() * 6 });
    }
    if (rnd() < 0.12 + prog * 0.25) EN.push({ type: 'drone', x: b.x + b.w / 2, y: b.y - 230 - rnd() * 120, by: 0, min: b.x - 80, max: b.x + b.w + 80, dir: -1, sp: 40, alive: true, wt: 0, ph: rnd() * 6 });
  }
  for (const e of EN) e.by = e.y;
  for (let k = 1; k <= 6; k++) { const nb = B.filter(b => b.x < LEVEL_LEN - 300).length, a = B[Math.round(k * nb / 7)], c = B[B.indexOf(a) + 1]; PAGES.push({ x: (a.x + a.w + c.x) / 2, y: Math.max(140, Math.min(a.y, c.y) - 190), got: false }); }
  for (let k = 1; k <= 3; k++) HEARTS.push({ x: k * LEVEL_LEN / 4 + 300, y: H * 0.35, got: false });
}
function buildingImg(b) {
  const h = H - b.y + 4, w = Math.ceil(b.w);
  const rr = mulberry(b.seed);
  b.img = mk(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1d0f2e'); gr.addColorStop(1, '#0f0719');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const pal = ['#ffd27a', '#ff6fb5', '#7be0ff', '#ffb35c'];
    for (let y = 28; y < h - 10; y += 30) for (let x = 14; x < w - 22; x += 26) {
      if (rr() < 0.45) { g.fillStyle = pal[(rr() * 4) | 0]; g.globalAlpha = 0.55 + rr() * 0.4; g.fillRect(x, y, 12, 16); g.globalAlpha = 1; }
      else { g.fillStyle = '#2a1840'; g.fillRect(x, y, 12, 16); }
    }
    // graffiti
    const cols = ['#ff2e5f', '#ff3aa0', '#9b2cff', '#ff6a2b'];
    g.globalAlpha = 0.85; splat(g, w * (0.2 + rr() * 0.6), 60 + rr() * 120, 16 + rr() * 22, cols[(rr() * 4) | 0], rr);
    g.globalAlpha = 1; g.lineWidth = 5; g.lineCap = 'round'; g.strokeStyle = cols[(rr() * 4) | 0];
    g.beginPath(); let tx = 10 + rr() * (w - 120), ty = 120 + rr() * 80; g.moveTo(tx, ty);
    for (let i = 0; i < 5; i++) g.quadraticCurveTo(tx + i * 18 + 9, ty - 25 + rr() * 50, tx + i * 18 + 18, ty + (rr() - .5) * 20);
    g.stroke();
    // halftone shadow on right edge
    g.fillStyle = ctx.createPattern(HALF, 'repeat'); g.globalAlpha = 0.5; g.fillRect(w * 0.7, 0, w * 0.3, h); g.globalAlpha = 1;
    // roof ledge + neon
    g.fillStyle = '#3a2357'; g.fillRect(0, 0, w, 10); g.fillStyle = rr() < 0.5 ? '#ff2e6d' : '#c13bff'; g.fillRect(0, 10, w, 3);
  });
}

// ---------- audio ----------
let AC = null, muted = localStorage.getItem(MUTE_KEY) === '1';
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d, type, vol, slide, delay) {
  if (muted) return; const a = ac(); if (!a) return; const t = a.currentTime + (delay || 0);
  const o = a.createOscillator(), g = a.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
}
let noiseBuf = null;
function noise(d, vol, f0, f1) {
  if (muted) return; const a = ac(); if (!a) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + d + 0.02);
}
const SFX = {
  thwip() { noise(0.16, 0.35, 4000, 900); },
  zap() { tone(1200, 0.14, 'square', 0.06, 0.35); noise(0.1, 0.15, 6000, 2000); },
  pow() { noise(0.14, 0.4, 900, 150); tone(180, 0.18, 'triangle', 0.25, 0.4); },
  token() { tone(1046, 0.07, 'sine', 0.12, 1.5); },
  page() { [784, 988, 1318].forEach((f, i) => tone(f, 0.1, 'triangle', 0.1, 1, i * 0.05)); },
  heart() { [660, 880].forEach((f, i) => tone(f, 0.15, 'sine', 0.14, 1, i * 0.08)); },
  rescue() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, 1, i * 0.08)); },
  hurt() { tone(260, 0.3, 'sawtooth', 0.1, 0.45); },
  whoops() { tone(600, 0.45, 'sine', 0.12, 0.35); },
  win() { [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.07, 1, i * 0.13)); },
  over() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, 1, i * 0.2)); },
};

// ---------- state ----------
let state = 'title', P, camX = 0, T = 0, stats, best = +localStorage.getItem(HS_KEY) || 0, newBest = false;
let FX = [], TXT = [], SH = [], hintT = 0, endT = 0;
const input = { web: false, webId: null, zapQ: false, block: false };
function newGame() {
  genLevel();
  const b0 = B[0];
  P = { x: 140, y: b0.y - FEET, vx: RUN, vy: 0, st: 'run', A: null, L: 0, inv: 0, webCD: 0, zapCD: 0, punch: 0, hearts: 3, face: 1, lastB: b0 };
  camX = 0; stats = { score: 0, tokens: 0, saved: 0, beaten: 0, pages: 0 }; FX = []; TXT = []; SH = []; hintT = 5; newBest = false;
  state = 'play'; input.block = true; input.zapQ = false;
}
const score = n => { stats.score += n; };
function pop(text, x, y, col, big) { TXT.push({ text, x, y, t: 0, col: col || '#ffde3b', big: !!big, rot: (Math.random() - .5) * 0.4 }); }
function burst(x, y, col, n) { for (let i = 0; i < (n || 10); i++) { const a = Math.random() * 7, s = 80 + Math.random() * 220; FX.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.5 + Math.random() * 0.4, col }); } }

function roofAt(x) { for (const b of B) if (x >= b.x && x <= b.x + b.w) return b; return null; }
function attach() {
  const ax = P.x + 150 + Math.max(0, P.vx) * 0.22, ay = Math.max(-120, P.y - 300);
  P.A = { x: ax, y: ay }; P.L = Math.hypot(ax - P.x, ay - P.y); P.st = 'swing';
  if (P.vx < 230) P.vx = 230; if (P.vy > 300) P.vy = 300; if (P.onRoof) { P.vy = -420; P.vx = Math.max(P.vx, 300); }
  SFX.thwip(); FX.push({ web: true, x: ax, y: ay, t: 0, life: 0.4 });
  if (T - (P.thwipT || -9) > 3 && Math.random() < 0.4) { P.thwipT = T; } else return; pop('THWIP!', P.x + 30, P.y - 50, '#ffffff');
}
function release(boost) {
  if (!P.A) return; P.A = null; P.st = 'air';
  if (boost) { P.vx += 70; P.vy -= 160; }
  P.webCD = 0.12;
}
function hurt() {
  if (P.inv > 0) return;
  P.hearts--; P.inv = 1.8; SFX.hurt(); pop('OOF!', P.x, P.y - 50, '#ff8a3b', true);
  P.A = null; P.st = 'air'; P.vx = -180; P.vy = -420;
  if (P.hearts <= 0) endGame(false);
}
function defeat(e, how) {
  e.alive = false; e.wt = 0; e.wvx = 260 + Math.random() * 120; e.wvy = -520;
  stats.beaten++; score(100); SFX.pow(); burst(e.x, e.y - 30, '#ffffff', 12);
  pop(how || ['POW!', 'BAM!', 'ZAP!', 'WHAM!'][(Math.random() * 4) | 0], e.x, e.y - 70, '#ffde3b', true);
}
function zap() {
  if (P.zapCD > 0) return; P.zapCD = 0.3;
  let best = null, bd = 1e9;
  for (const e of EN) if (e.alive) {
    const ex = e.x, ey = e.y - 30, dx = ex - P.x, dy = ey - P.y;
    if (dx > -80 && dx < 470 && Math.abs(dy) < 400) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = e; } }
  }
  P.punch = 0.28;
  if (best && bd < 75) { defeat(best, 'POW!'); return; }
  SFX.zap();
  const tx = best ? best.x : P.x + 400, ty = best ? best.y - 30 : P.y;
  const d = Math.hypot(tx - P.x, ty - P.y) || 1;
  SH.push({ x: P.x + 20, y: P.y - 10, vx: (tx - P.x) / d * 1000 + P.vx * 0.5, vy: (ty - P.y) / d * 1000, t: 0, tgt: best });
}
function endGame(win) {
  state = win ? 'win' : 'over'; endT = 0; input.web = false;
  if (win) { score(stats.saved * 0); SFX.win(); for (let i = 0; i < 80; i++) FX.push({ conf: true, x: Math.random() * W, y: -Math.random() * H * 0.5, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 160, t: 0, life: 6, col: ['#ff2e5f', '#ffde3b', '#9b2cff', '#55e6ff', '#ffffff'][i % 5], rot: Math.random() * 6 }); }
  else SFX.over();
  if (stats.score > best) { best = stats.score; newBest = true; try { localStorage.setItem(HS_KEY, String(best)); } catch (e) { } }
}

function step(dt) {
  T += dt;
  if (state !== 'play') { for (const f of FX) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.rot !== undefined) f.rot += dt * 3; } FX = FX.filter(f => f.t < f.life); return; }
  hintT -= dt; P.inv -= dt; P.webCD -= dt; P.zapCD -= dt; P.punch -= dt;
  if (input.zapQ) { input.zapQ = false; zap(); }
  const hold = input.web && !input.block;
  if (hold && !P.A && P.webCD <= 0 && P.st !== 'climb') attach();
  if (!hold && P.A) release(true);
  const px = P.x, pfeet = P.y + FEET;
  P.onRoof = false;
  if (P.st === 'run') {
    P.vx += (RUN - P.vx) * Math.min(1, dt * 3); P.x += P.vx * dt;
    const b = roofAt(P.x);
    if (!b) { P.st = 'air'; P.vy = -560; P.vx = Math.max(P.vx, 330); } // auto-hop off the edge
    else { P.y = b.y - FEET; P.vy = 0; P.onRoof = true; P.lastB = b; }
  } else if (P.st === 'climb') {
    P.vy = -560; P.vx = 0; P.y += P.vy * dt;
    const b = P.climbB;
    if (P.y + FEET <= b.y) { P.y = b.y - FEET; P.x = b.x + 12; P.st = 'run'; P.vx = RUN; P.vy = 0; P.lastB = b; }
  } else {
    P.vy += GRAV * dt; if (P.vy > 1100) P.vy = 1100;
    if (P.st === 'swing' && P.A) {
      // little helper push so swings always feel good
      const dx = P.x - P.A.x, dy = P.y - P.A.y, d = Math.hypot(dx, dy) || 1, tx = -dy / d, ty = dx / d;
      const dir = tx > 0 ? 1 : -1; P.vx += tx * dir * 260 * dt; P.vy += ty * dir * 260 * dt;
    }
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.st === 'swing' && P.A) {
      const dx = P.x - P.A.x, dy = P.y - P.A.y, d = Math.hypot(dx, dy);
      if (d > P.L) {
        const nx = dx / d, ny = dy / d; P.x = P.A.x + nx * P.L; P.y = P.A.y + ny * P.L;
        const vr = P.vx * nx + P.vy * ny; if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; }
      }
      // chain swings: past the anchor and rising -> let go and grab the next one
      if (P.x > P.A.x + P.L * 0.45 && P.vy < 0) { release(true); P.webCD = 0.08; }
    }
    const sp = Math.hypot(P.vx, P.vy); if (sp > MAXV) { P.vx *= MAXV / sp; P.vy *= MAXV / sp; }
    if (P.y < 30) { P.y = 30; if (P.vy < 0) P.vy = 0; }
    // buildings
    for (const b of B) {
      if (b.x > P.x + 60) break;
      if (P.x + R * 0.6 > b.x && P.x - R * 0.6 < b.x + b.w) {
        const feet = P.y + FEET; P.vy0 = P.vy;
        if (feet >= b.y && pfeet <= b.y + 8 && P.vy >= 0) {
          P.y = b.y - FEET; P.st = 'run'; P.A = null; P.vy = 0; P.lastB = b;
          if (P.vy0 > 350) burst(P.x, b.y, '#c9a6ff', 5); if (P.vx < RUN) P.vx = RUN;
        } else if (feet > b.y + 8 && px <= b.x + 4) {
          P.x = b.x - R * 0.6; P.st = 'climb'; P.climbB = b; P.A = null;
        } else if (feet > b.y + 8 && px >= b.x + b.w - 4 && P.vx < 0) { P.x = b.x + b.w + R * 0.6; P.vx = 60; }
      }
    }
  }
  // fell to the street: no hearts lost, swing back up
  if (P.y + FEET > H - 14) {
    SFX.whoops(); pop('WHOOPS!', P.x, H - 120, '#55e6ff', true); score(-25); if (stats.score < 0) stats.score = 0;
    let nb = B.find(b => b.x + b.w > P.x + 40) || P.lastB;
    P.x = nb.x + Math.min(40, nb.w / 3); P.y = nb.y - FEET - 160; P.vx = RUN; P.vy = 0; P.st = 'air'; P.A = null; P.inv = 1.2;
  }
  if (Math.abs(P.vx) > 30) P.face = P.vx > 0 ? 1 : -1;
  const speed = Math.hypot(P.vx, P.vy);
  // tokens & pickups
  for (const t of TOK) if (!t.got && Math.abs(t.x - P.x) < 40 && Math.abs(t.y - P.y) < 46) { t.got = true; stats.tokens++; score(10); SFX.token(); burst(t.x, t.y, '#ff5c8f', 6); }
  for (const t of PAGES) if (!t.got && Math.abs(t.x - P.x) < 46 && Math.abs(t.y - P.y) < 56) { t.got = true; stats.pages++; score(50); SFX.page(); pop('COMIC PAGE!', t.x, t.y - 40, '#d9a6ff'); burst(t.x, t.y, '#c38bff', 10); }
  for (const t of HEARTS) if (!t.got && Math.abs(t.x - P.x) < 46 && Math.abs(t.y - P.y) < 52) { t.got = true; if (P.hearts < 5) P.hearts++; SFX.heart(); pop('+1 ♥', t.x, t.y - 40, '#ff6f9a'); }
  // civilians
  for (const c of CIV) {
    c.t += dt;
    if (!c.saved) {
      const cy = c.type === 'cat' ? c.y - 22 : c.y - 38;
      if (Math.abs(c.x - P.x) < 60 && Math.abs(cy - P.y) < (c.type === 'cat' ? 95 : 70)) {
        c.saved = true; c.t = 0; stats.saved++; score(250); SFX.rescue(); burst(c.x, cy, '#ffde3b', 16);
        pop(c.type === 'cat' ? 'MEOW! THANKS!' : 'THANK YOU!', c.x, cy - 70, '#ffffff', true);
      }
    }
  }
  // enemies
  for (const e of EN) {
    if (e.alive) {
      if (Math.abs(e.x - P.x) > 700) continue;
      e.x += e.dir * e.sp * dt; if (e.x < e.min) { e.x = e.min; e.dir = 1; } if (e.x > e.max) { e.x = e.max; e.dir = -1; }
      if (e.type === 'drone') e.y = e.by + Math.sin(T * 2 + e.ph) * 30;
      const ey = e.y - (e.type === 'drone' ? 0 : 34);
      if (Math.abs(e.x - P.x) < 44 && Math.abs(ey - P.y) < 52) {
        if (speed > 380 || P.punch > 0) defeat(e, 'KICK!'); else hurt();
      }
    } else { e.wt += dt; e.x += e.wvx * dt; e.y += e.wvy * dt; e.wvy += 900 * dt; }
  }
  // web shots
  for (const s of SH) {
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    for (const e of EN) if (e.alive) { const ey = e.y - (e.type === 'drone' ? 0 : 34); if (Math.hypot(e.x - s.x, ey - s.y) < 46) { defeat(e); s.t = 9; break; } }
  }
  SH = SH.filter(s => s.t < 0.6);
  for (const f of FX) { f.t += dt; if (!f.web) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; } }
  FX = FX.filter(f => f.t < f.life);
  for (const t of TXT) t.t += dt; TXT = TXT.filter(t => t.t < 1.1);
  // camera
  const target = P.x - 120 - Math.max(0, P.vx) * 0.12;
  camX += (target - camX) * Math.min(1, dt * 5);
  if (P.x >= finishX) { score(stats.saved >= RESCUE_GOAL ? 500 : 0); endGame(true); }
}

// ---------- drawing ----------
function drawSky(cx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12052a'); g.addColorStop(0.45, '#3a0d57'); g.addColorStop(0.8, '#8a1a55'); g.addColorStop(1, '#2a0a2c');
  ctx.fillStyle = g; ctx.fillRect(-OX / S - 2, 0, W + 2 * OX / S + 4, H);
  if (!bgCache) buildBg();
  ctx.fillStyle = halfPat; ctx.globalAlpha = 0.25; ctx.fillRect(0, 0, W, H * 0.7); ctx.globalAlpha = 1;
  // moon
  ctx.fillStyle = 'rgba(255,170,210,0.18)'; ctx.beginPath(); ctx.arc(300, H * 0.14, 70, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd6ea'; ctx.beginPath(); ctx.arc(300, H * 0.14, 42, 0, 7); ctx.fill();
  const tile = (img, par, y) => { const w = img.width; let ox = -((cx * par) % w); if (ox > 0) ox -= w; for (let x = ox; x < W; x += w) ctx.drawImage(img, x, y); };
  tile(bgCache.splats, 0.08, 0);
  tile(bgCache.far, 0.2, H - bgCache.far.height);
  tile(bgCache.mid, 0.45, H - bgCache.mid.height);
}
function drawImgH(img, x, y, h, flip, rot, alpha) {
  if (!ok(img)) return; const w = img.naturalWidth * h / img.naturalHeight;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore(); return w;
}
function comicText(t, x, y, size, fill, rot) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.22; ctx.strokeStyle = '#140818'; ctx.strokeText(t, 0, 0);
  ctx.fillStyle = fill; ctx.fillText(t, 0, 0); ctx.restore();
}
function drawWorld() {
  const cx = camX;
  drawSky(cx);
  ctx.save(); ctx.translate(-cx, 0);
  for (const b of B) {
    if (b.x + b.w < cx - 20 || b.x > cx + W + 20) continue;
    if (!b.img) buildingImg(b);
    ctx.drawImage(b.img, b.x, b.y);
    if (b.tower) { ctx.fillStyle = '#2b1842'; ctx.fillRect(b.x + b.w - 70, b.y - 50, 44, 40); ctx.fillStyle = '#3d2560'; ctx.fillRect(b.x + b.w - 74, b.y - 56, 52, 8); ctx.fillStyle = '#1a0d29'; ctx.fillRect(b.x + b.w - 66, b.y - 10, 4, 10); ctx.fillRect(b.x + b.w - 34, b.y - 10, 4, 10); }
  }
  // finish banner
  if (finishX - cx < W + 200) {
    const fb = roofAt(finishX) || B[B.length - 1];
    ctx.fillStyle = '#ddd'; ctx.fillRect(finishX, fb.y - 150, 6, 150);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; ctx.fillRect(finishX + 6 + i * 14, fb.y - 150 + j * 12 + Math.sin(T * 4 + i) * 3, 14, 12); }
    comicText('CITY SAVED!', finishX + 50, fb.y - 175, 20, '#ffde3b');
  }
  // water towers for cats
  for (const c of CIV) if (c.type === 'cat') {
    const b = c.b, x = c.x;
    ctx.fillStyle = '#4a2a1e'; ctx.fillRect(x - 26, b.y - 70, 52, 50); ctx.fillStyle = '#6b3d2a'; ctx.beginPath(); ctx.moveTo(x - 32, b.y - 70); ctx.lineTo(x, b.y - 92 + 10); ctx.lineTo(x + 32, b.y - 70); ctx.fill();
    ctx.fillStyle = '#2b160f'; ctx.fillRect(x - 22, b.y - 20, 5, 20); ctx.fillRect(x + 17, b.y - 20, 5, 20);
  }
  const vis = o => o.x > cx - 80 && o.x < cx + W + 80;
  const bob = Math.sin(T * 5) * 4;
  for (const t of TOK) if (!t.got && vis(t)) ctx.drawImage(TOKEN, t.x - 28, t.y - 28 + Math.sin(T * 4 + t.x) * 3);
  for (const t of PAGES) if (!t.got && vis(t)) { ctx.save(); ctx.translate(t.x, t.y + bob); ctx.rotate(Math.sin(T * 2) * 0.15); ctx.drawImage(PAGE, -30, -35); ctx.restore(); }
  for (const t of HEARTS) if (!t.got && vis(t)) { const s = 1 + Math.sin(T * 6) * 0.08; ctx.save(); ctx.translate(t.x, t.y); ctx.scale(s, s); ctx.drawImage(HEART, -24, -22); ctx.restore(); }
  for (const c of CIV) if (vis(c)) {
    const h = c.type === 'cat' ? 46 : c.type === 'granny' ? 80 : 72;
    const lift = c.saved ? Math.min(1, c.t * 2) * 6 : 0;
    drawImgH(IMG[c.type], c.x, c.y - h / 2 - lift, h, false, c.saved ? 0 : Math.sin(T * 6 + c.ph) * 0.05);
    if (!c.saved) {
      const y = c.y - h - 26 + Math.sin(T * 5 + c.ph) * 4;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#140818'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x, y, 34, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
      comicText('HELP!', c.x, y + 1, 14, '#ff2e5f');
    } else if (c.t < 2.5) {
      ctx.globalAlpha = Math.max(0, 1 - c.t / 2.5); ctx.drawImage(HEART, c.x - 16, c.y - h - 40 - c.t * 30, 32, 30); ctx.globalAlpha = 1;
    }
  }
  for (const e of EN) if (vis(e)) {
    const h = e.type === 'drone' ? 58 : e.type === 'goon' ? 74 : 70;
    const cy = e.type === 'drone' ? e.y : e.y - h / 2 + (e.alive ? Math.abs(Math.sin(T * 8 + e.ph)) * -3 : 0);
    if (e.alive) drawImgH(IMG[e.type], e.x, cy, h, e.dir > 0);
    if (e.alive && state === 'play' && e.x - P.x > 60 && e.x - P.x < 300) comicText('!', e.x, cy - h / 2 - 16 + Math.sin(T * 10) * 3, 26, '#ffde3b');
    else {
      const a = Math.max(0, 1 - e.wt / 1.2); drawImgH(IMG[e.type], e.x, cy, h, false, e.wt * 8, a);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.translate(e.x, cy); ctx.rotate(e.wt * 8);
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-h / 2, i * 12); ctx.lineTo(h / 2, i * 12 + 6); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-10, -h / 2); ctx.lineTo(8, h / 2); ctx.stroke(); ctx.restore();
    }
  }
  // web shots
  for (const s of SH) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.04, s.y - s.vy * 0.04); ctx.stroke(); }
  drawPlayer();
  for (const f of FX) {
    if (f.web) { const a = 1 - f.t / f.life; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(an) * 14, f.y + Math.sin(an) * 14); ctx.stroke(); } }
    else if (!f.conf) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.col; ctx.fillRect(f.x - 3, f.y - 3, 6, 6); ctx.globalAlpha = 1; }
  }
  for (const t of TXT) { const s = Math.min(1, t.t * 6) * (t.big ? 1 : 0.8); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t.t - 0.6) * 2); comicText(t.text, t.x, t.y - t.t * 30, 26 * s + 1, t.col, t.rot); ctx.globalAlpha = 1; }
  ctx.restore();
  // street glow
  const sg = ctx.createLinearGradient(0, H - 40, 0, H); sg.addColorStop(0, 'rgba(255,46,95,0)'); sg.addColorStop(1, 'rgba(255,46,95,0.45)');
  ctx.fillStyle = sg; ctx.fillRect(0, H - 40, W, 40);
}
function drawPlayer() {
  if (P.inv > 0 && Math.floor(T * 12) % 2 === 0 && state === 'play') return;
  if (P.st === 'swing' && P.A) {
    const img = IMG.river_swing, h = 118; if (!ok(img)) return;
    const w = img.naturalWidth * h / img.naturalHeight;
    const hx = (0.08 - 0.5) * w, hy = (0.075 - 0.5) * h;
    const a0 = Math.atan2(hy, hx), a1 = Math.atan2(P.A.y - P.y, P.A.x - P.x), rot = a1 - a0;
    const c = Math.cos(rot), s = Math.sin(rot), handX = P.x + hx * c - hy * s, handY = P.y + hx * s + hy * c;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(P.A.x, P.A.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,90,160,.5)'; ctx.lineWidth = 6; ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;
    drawImgH(img, P.x, P.y, h, false, rot);
  } else if (P.st === 'climb') {
    drawImgH(IMG.river_swing, P.x, P.y - 8, 110, false, 0);
  } else {
    const h = 98; let rot = 0, y = P.y - 6;
    if (P.st === 'run') { rot = -0.08; y += Math.sin(T * 14) * 3 - 4; }
    else rot = Math.max(-0.5, Math.min(0.5, Math.atan2(P.vy, Math.abs(P.vx) + 200) * 0.6));
    drawImgH(IMG.river_fly, P.x, y, h, P.face < 0, rot * P.face);
    if (P.punch > 0) { ctx.strokeStyle = '#ffde3b'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(P.x + 42 * P.face, P.y - 14 + i * 9); ctx.lineTo(P.x + (58 + i * 4) * P.face, P.y - 18 + i * 12); ctx.stroke(); } }
  }
}
// ---------- UI ----------
const ZAP = () => ({ x: W - 66, y: H - 84, r: 48 });
const MUTE = () => ({ x: W - 30, y: 30, r: 22 });
function btn(x, y, w, h, label, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.03);
  ctx.fillStyle = '#140818'; ctx.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
  ctx.fillStyle = col || '#ff2e5f'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore(); comicText(label, x, y, 30, '#ffffff', -0.03);
}
function drawMute() { const m = MUTE(); ctx.fillStyle = 'rgba(20,8,24,.6)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(muted ? '🔇' : '🔊', m.x, m.y + 1); }
function drawHUD() {
  comicText(String(stats.score), 62, 30, 24, '#ffde3b');
  for (let i = 0; i < P.hearts; i++) ctx.drawImage(HEART, 112 + i * 26, 16, 26, 24);
  ctx.font = '900 15px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.drawImage(TOKEN, 6, 46, 34, 34); comicText('×' + stats.tokens, 56, 63, 16, '#ffffff');
  comicText('SAVED ' + stats.saved + '/' + RESCUE_GOAL, 168, 63, 16, '#7be0ff');
  // progress bar
  const px = 20, pw = W - 80, py = 90, prog = Math.max(0, Math.min(1, P.x / finishX));
  ctx.fillStyle = 'rgba(20,8,24,.7)'; ctx.fillRect(px, py, pw, 8); ctx.fillStyle = '#ff2e5f'; ctx.fillRect(px, py, pw * prog, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(px + pw - 2, py - 4, 4, 16);
  if (ok(IMG.portrait)) { ctx.save(); ctx.beginPath(); ctx.arc(px + pw * prog, py + 4, 11, 0, 7); ctx.clip(); ctx.drawImage(IMG.portrait, px + pw * prog - 12, py - 9, 24, 25); ctx.restore(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + pw * prog, py + 4, 11, 0, 7); ctx.stroke(); }
  drawMute();
  // help arrow toward next person in trouble
  const nc = CIV.find(c => !c.saved && c.x > P.x - 50);
  if (nc && nc.x - camX > W - 10 && nc.x - P.x < 1400) { const y = Math.max(140, Math.min(H - 180, nc.y - 60)); ctx.fillStyle = '#ffde3b'; ctx.beginPath(); ctx.moveTo(W - 6, y); ctx.lineTo(W - 26, y - 14); ctx.lineTo(W - 26, y + 14); ctx.fill(); comicText('HELP', W - 50, y, 13, '#ffde3b'); }
  // zap button
  const z = ZAP(); ctx.fillStyle = P.zapCD > 0 ? '#8a1a3a' : '#ff2e5f'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#140818'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffd1e0'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r - 7, 0, 7); ctx.stroke();
  spiderGlyph(ctx, z.x, z.y - 8, 34, '#140818'); comicText('ZAP', z.x, z.y + 24, 15, '#ffffff');
  if (hintT > 0) {
    ctx.globalAlpha = Math.min(1, hintT); const y = H * 0.42 + Math.sin(T * 5) * 6;
    comicText('HOLD to swing!', W / 2 - 20, y, 26, '#ffffff'); comicText('Let go to FLY!', W / 2 - 20, y + 34, 20, '#7be0ff');
    comicText('Tap ZAP for bad guys →', W / 2 - 30, H - 84, 15, '#ffde3b'); ctx.globalAlpha = 1;
  }
}
function drawTitle() {
  camX += 60 / 60; drawSky(camX);
  ctx.fillStyle = 'rgba(10,3,20,.35)'; ctx.fillRect(0, 0, W, H);
  // comic burst frame + portrait
  const cx = W / 2, cy = H * 0.33, r = Math.min(150, H * 0.18);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * 0.15); ctx.fillStyle = '#ff2e5f'; ctx.beginPath();
  for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, rr = i % 2 ? r + 18 : r + 44; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
  if (ok(IMG.portrait)) ctx.drawImage(IMG.portrait, cx - r, cy - r, 2 * r, 2 * r * 367 / 360);
  ctx.fillStyle = halfPat; ctx.globalAlpha = 0.25; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); ctx.globalAlpha = 1; ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = '#140818'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  const ty = cy + r + 64;
  comicText(HERO_NAME.toUpperCase(), cx, ty, Math.min(52, 640 / HERO_NAME.length), '#ff2e5f', -0.04);
  comicText('starring ' + KID_NAME.toUpperCase() + '!', cx, ty + 44, 18, '#ffde3b', -0.04);
  btn(cx, ty + 108, 200, 64, 'PLAY!', '#ff2e5f');
  ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3e6ff';
  const lines = ['HOLD the screen to swing. Let go to fly!', 'Tap ZAP to web the bad guys.', 'Save ' + RESCUE_GOAL + ' people & grab spider tokens!'];
  lines.forEach((l, i) => ctx.fillText(l, cx, ty + 172 + i * 22));
  if (best > 0) comicText('BEST: ' + best, cx, ty + 248, 18, '#7be0ff');
  drawMute();
}
function drawEnd() {
  drawWorld();
  ctx.fillStyle = 'rgba(12,4,24,.72)'; ctx.fillRect(0, 0, W, H);
  for (const f of FX) if (f.conf) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.col; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  const win = state === 'win', cy = H * 0.2, s = Math.min(1, endT * 3);
  if (ok(IMG.portrait)) { const r = 70 * s; ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, r, 0, 7); ctx.clip(); ctx.drawImage(IMG.portrait, W / 2 - r, cy - r, 2 * r, 2 * r); ctx.restore(); ctx.lineWidth = 5; ctx.strokeStyle = win ? '#ffde3b' : '#ff2e5f'; ctx.beginPath(); ctx.arc(W / 2, cy, r, 0, 7); ctx.stroke(); }
  if (win) { comicText('YOU SAVED', W / 2, cy + 112, 40 * s + 1, '#ffde3b', -0.05); comicText('THE CITY,', W / 2, cy + 156, 40 * s + 1, '#ffde3b', -0.05); comicText(KID_NAME.toUpperCase() + '!', W / 2, cy + 204, 52 * s + 1, '#ff2e5f', -0.05); }
  else { comicText('NICE TRY, HERO!', W / 2, cy + 120, 34 * s + 1, '#ff2e5f', -0.04); comicText('The city still needs you!', W / 2, cy + 162, 18, '#ffffff'); }
  const y0 = cy + (win ? 262 : 214);
  const rows = [['SCORE', stats.score], ['PEOPLE SAVED', stats.saved + ' / ' + RESCUE_GOAL], ['SPIDER TOKENS', stats.tokens], ['BAD GUYS WEBBED', stats.beaten], ['COMIC PAGES', stats.pages + ' / ' + PAGES.length]];
  rows.forEach((r, i) => { ctx.font = '900 16px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#d9c7ff'; ctx.fillText(r[0], 60, y0 + i * 30); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(String(r[1]), W - 60, y0 + i * 30); });
  if (newBest) comicText('NEW HIGH SCORE!', W / 2, y0 + 168, 24 + Math.sin(T * 8) * 2, '#7be0ff', -0.05);
  else comicText('BEST: ' + best, W / 2, y0 + 168, 18, '#7be0ff');
  if (endT > 1) btn(W / 2, y0 + 236, 230, 62, 'PLAY AGAIN', win ? '#9b2cff' : '#ff2e5f');
  drawMute();
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0d0418'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, 0);
  if (state === 'title') drawTitle();
  else if (state === 'play') { drawWorld(); drawHUD(); }
  else drawEnd();
}

// ---------- input ----------
function toLocal(cx, cy) { return { x: (cx - OX) / S, y: cy / S }; }
const near = (p, b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10;
function press(x, y, id) {
  ac();
  const p = toLocal(x, y);
  if (near(p, MUTE())) { muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { } return; }
  if (state === 'title') { newGame(); return; }
  if (state === 'win' || state === 'over') { if (endT > 1) newGame(); return; }
  if (near(p, ZAP())) { input.zapQ = true; return; }
  input.web = true; input.webId = id; input.block = false;
}
function lift(id) { if (input.webId === id || id === 'all') { input.web = false; input.webId = null; } input.block = false; }
cv.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) press(t.clientX, t.clientY, t.identifier); }, { passive: false });
cv.addEventListener('touchend', e => { e.preventDefault(); for (const t of e.changedTouches) lift(t.identifier); if (e.touches.length === 0) lift('all'); }, { passive: false });
cv.addEventListener('touchcancel', e => { lift('all'); });
cv.addEventListener('mousedown', e => press(e.clientX, e.clientY, 'm'));
addEventListener('mouseup', () => lift('m'));
addEventListener('keydown', e => { if (e.repeat) return; if (e.code === 'Space' || e.code === 'ArrowUp') { if (state !== 'play') press(OX + W / 2 * S, H * 0.6 * S, 'k'); else { input.web = true; input.webId = 'k'; input.block = false; } e.preventDefault(); } if (e.code === 'KeyX' || e.code === 'KeyZ') { input.zapQ = true; } });
addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp') lift('k'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) lift('all'); });

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
  while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
  if (state === 'win' || state === 'over') endT += dt;
  render(); requestAnimationFrame(frame);
}
resize(); requestAnimationFrame(frame);
window.__game = { get P() { return P; }, get stats() { return stats; }, get state() { return state; }, get EN() { return EN; }, get CIV() { return CIV; }, get TOK() { return TOK; }, get camX() { return camX; }, newGame, endGame, HERO_NAME };
