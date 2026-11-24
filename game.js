'use strict';
// ====== Easy-to-change names ======
const HERO_NAME = 'Spider-River';   // hero name shown on the title screen
const KID_NAME  = 'River';          // used in "You saved the city, River!"
// ==================================
const VERSION = '5';
const RESCUE_GOAL = 6;        // people to save across the city
const LEVEL_LEN = 12000;      // city length in pixels (finish line)
const GRAV = 1220, RUN = 152, FEET = 40, R = 26, MAXV = 620;
const JUMP_V = 560, DJUMP_V = 600, SWING_JUMP_V = 640, JUMP_VX = 225;
const COYOTE = 0.14, JUMP_BUFFER = 0.12, CAM_X = 92;
// v4 manual movement (◀ ▶): snappy start, crisp stop, steerable in the air
const RUN_R = 170, RUN_L = 160, ACC_G = 1500, DEC_G = 2400, AIR_MAX = 230, AIR_ACC = 1000, LOOK = 70, MIN_X = 40;
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
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
['river_swing', 'river_fly', 'river_run', 'river_jump', 'river_zap', 'bot', 'goon', 'drone', 'cat', 'granny', 'kid'].forEach(n => { const i = new Image(); i.src = 'img/' + n + '.png?v=' + VERSION; IMG[n] = i; });
IMG.portrait = new Image(); IMG.portrait.src = 'img/portrait.jpg?v=' + VERSION;
const ok = i => i && i.complete && i.naturalWidth > 0;
// ---------- v5 levels ----------
const LEVELS = [
  { id: 'neon', name: 'Neon City', card: ['NEON', 'CITY'], col: '#ff2e5f', col2: '#9b2cff', winB: 'THE CITY,', finish: 'CITY SAVED!', saveLine: 'The city still needs you!' },
  { id: 'ketchikan', name: 'Ketchikan, AK', card: ['KETCHIKAN,', 'ALASKA'], col: '#1fb5a6', col2: '#c0262d', winB: 'KETCHIKAN,', finish: 'KETCHIKAN SAVED!', saveLine: 'Ketchikan still needs you!' },
  { id: 'jungle', name: 'Jungle Island', card: ['JUNGLE', 'ISLAND'], col: '#ff9f1c', col2: '#2f9e44', winB: 'JUNGLE ISLAND,', finish: 'VOLCANO TEMPLE!', saveLine: 'The island still needs you!' },
];
const LV_KEY = 'spider-river-levels-v1';
const freshLv = () => ({ neon: { pages: 0, best: 0, done: 0 }, ketchikan: { pages: 0, best: 0, done: 0 }, jungle: { pages: 0, best: 0, done: 0 } });
function loadLv() { let s = null; try { s = JSON.parse(localStorage.getItem(LV_KEY)); } catch (e) { s = null; } const f = freshLv(); if (s && typeof s === 'object') for (const k in f) if (s[k]) f[k] = { pages: Math.min(6, +s[k].pages || 0), best: +s[k].best || 0, done: s[k].done ? 1 : 0 }; return f; }
let curLv = 0;
const LVIMG = {};
const LV_ART = { ketchikan: ['ket_bg', 'house0', 'house1', 'house2', 'house3', 'totem0', 'totem1', 'totem2', 'totem3', 'school', 'driftwood', 'tidepool', 'spruce', 'sign', 'picnic', 'eagle', 'plane'], jungle: ['jun_bg', 'arch', 'pillar', 'palm', 'tree'] };
function loadLvArt(id) { for (const n of (LV_ART[id] || [])) if (!LVIMG[n]) { const i = new Image(); i.decoding = 'async'; i.src = 'img/lv/' + n + '.webp?v=' + VERSION; LVIMG[n] = i; } }
const LI = n => ok(LVIMG[n]) ? LVIMG[n] : null;

// ---------- wardrobe / avatar (v3) ----------
const WARD_KEY = 'spider-river-wardrobe-v1';
const MASKS = [{ id: 'on', name: 'MASK ON' }, { id: 'up', name: 'PUSHED UP' }, { id: 'off', name: 'NO MASK' }];
const ACCS = [
  { id: 'none', name: 'Classic Suit', t: 0, p: 0 },
  { id: 'hoodie', name: 'Street Hoodie', t: 40, p: 0 },
  { id: 'headphones', name: 'Neon Headphones', t: 80, p: 0 },
  { id: 'backpack', name: 'Hero Backpack', t: 0, p: 2 },
  { id: 'shades', name: 'Neon Shades', t: 140, p: 3 },
  { id: 'gauntlets', name: 'Web Gauntlets', t: 220, p: 5 },
];
const HANDS = {"up-hoodie": [0.61, 0.063], "up-headphones": [0.509, 0.061], "up-backpack": [0.499, 0.061], "up-shades": [0.48, 0.059], "up-gauntlets": [0.505, 0.059], "on-none": [0.524, 0.057], "on-hoodie": [0.525, 0.057], "on-headphones": [0.525, 0.057], "on-backpack": [0.548, 0.058], "on-shades": [0.526, 0.058], "on-gauntlets": [0.543, 0.059], "off-none": [0.485, 0.059], "off-hoodie": [0.609, 0.063], "off-headphones": [0.519, 0.06], "off-backpack": [0.531, 0.059], "off-shades": [0.485, 0.063], "off-gauntlets": [0.518, 0.061]};
function loadWard() {
  let w = null; try { w = JSON.parse(localStorage.getItem(WARD_KEY)); } catch (e) { w = null; }
  if (!w || typeof w !== 'object') w = {};
  const out = { tokens: Math.max(0, +w.tokens || 0), pages: Math.max(0, +w.pages || 0),
    unlocked: Array.isArray(w.unlocked) ? w.unlocked.filter(id => ACCS.some(a => a.id === id)) : ['none'],
    mask: MASKS.some(m => m.id === w.mask) ? w.mask : 'up', acc: ACCS.some(a => a.id === w.acc) ? w.acc : 'none' };
  if (!out.unlocked.includes('none')) out.unlocked.unshift('none');
  if (!out.unlocked.includes(out.acc)) out.acc = 'none';
  return out;
}
const RESET_KEY = 'spider-river-reset-v5';
const freshWard = () => ({ tokens: 0, pages: 0, unlocked: ['none'], mask: 'up', acc: 'none' });
(function freshStartOnce() { // wipes all older progress the first time v5 opens; ?reset=1 wipes again
  try {
    const qs = new URLSearchParams(location.search), urlReset = qs.get('reset') === '1';
    if (localStorage.getItem(RESET_KEY) !== '1' || urlReset) {
      localStorage.removeItem(HS_KEY);
      localStorage.setItem(WARD_KEY, JSON.stringify(freshWard()));
      localStorage.removeItem(LV_KEY);
      localStorage.setItem(RESET_KEY, '1');
    }
    if (urlReset) { qs.delete('reset'); const q = qs.toString(); history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash); }
  } catch (e) { }
})();
let ward = loadWard();
function saveWard() { try { localStorage.setItem(WARD_KEY, JSON.stringify(ward)); } catch (e) { } }
const accById = id => ACCS.find(a => a.id === id);
const affordable = a => ward.tokens >= a.t && ward.pages >= a.p;
const newGear = () => ACCS.some(a => !ward.unlocked.includes(a.id) && affordable(a));
const comboKey = (m, a) => m + '-' + a;
const curKey = () => comboKey(ward.mask, ward.acc);
const AVC = {};
function avImg(k, n) { // lazy-load one painting of a (mask, accessory) combo
  const c = AVC[k] || (AVC[k] = {});
  if (!c[n]) {
    if (k === 'up-none' && n !== 'p') c[n] = IMG['river_' + n];
    else { const i = new Image(); i.decoding = 'async'; i.src = 'img/av/' + k + '/' + n + '.webp?v=' + VERSION; c[n] = i; }
  }
  return c[n];
}
function preloadCombo(k) { ['p', 'run', 'jump', 'swing'].forEach(n => avImg(k, n)); }
function portraitImg(k) { const i = avImg(k || curKey(), 'p'); return ok(i) ? i : (ok(avImg('up-none', 'p')) ? avImg('up-none', 'p') : IMG.portrait); }
function sprite(n) { const i = avImg(curKey(), n); return ok(i) ? i : IMG['river_' + n]; } // never invisible: falls back to v2 art
function handOf(n) { const k = curKey(); return (k !== 'up-none' && ok(avImg(k, n))) ? (HANDS[k] || [0.5, 0.06]) : [0.08, 0.075]; }
preloadCombo(curKey());
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
let B, TOK, EN, CIV, PAGES, HEARTS, ANCH, finishX, SECTIONS = [], DECO = [], LVLEN = LEVEL_LEN, secShown = -1, secMsg = null;
function genLevel() {
  B = []; TOK = []; EN = []; CIV = []; PAGES = []; HEARTS = []; ANCH = []; SECTIONS = []; DECO = []; secShown = -1; secMsg = null;
  const id = LEVELS[curLv].id;
  if (id === 'neon') { rnd = qs.has('seed') ? mulberry(+qs.get('seed')) : Math.random; LVLEN = LEVEL_LEN; genNeon(); }
  else { rnd = mulberry(4242 + curLv * 77); loadLvArt(id); if (id === 'ketchikan') genKetchikan(); else genJungle(); }
  populate(id !== 'neon');
}
function genNeon() {
  let x = -300;
  while (x < LEVEL_LEN + 900) {
    const first = B.length === 0, prog = Math.max(0, x / LEVEL_LEN);
    const w = first ? 700 : (x > LEVEL_LEN - 100 ? 900 : 190 + rnd() * 200);
    let y = first ? H - 250 : H - (200 + rnd() * 160);
    if (!first) { const py = B[B.length - 1].y; y = Math.max(py - 110, Math.min(py + 130, y)); } // no giant steps up
    B.push({ x, w, y, seed: (rnd() * 1e9) | 0, tower: !first && rnd() < 0.25, img: null });
    x += w + (first ? 100 : 60 + rnd() * 100 + prog * 30);
  }
  const fb = B.find(b => b.x + b.w > LEVEL_LEN); finishX = Math.max(LEVEL_LEN, fb.x + 120);
  // web anchors: real visible spires / crane hooks every ~150-210px
  let ax = 120;
  while (ax < finishX + 600) {
    const b = roofAt(ax), ref = b ? b.y : Math.min(...B.filter(q => Math.abs(q.x + q.w / 2 - ax) < 400).map(q => q.y));
    const ay = Math.max(105, ref - (225 + rnd() * 70));
    const onRoof = b && ax > b.x + 18 && ax < b.x + b.w - 18 && rnd() < 0.7;
    ANCH.push({ id: ANCH.length, x: ax, y: ay, kind: onRoof ? 'spire' : 'hook', base: b ? b.y : 0, col: rnd() < 0.5 ? '#55e6ff' : '#ff4fa3', ph: rnd() * 6 });
    ax += 150 + rnd() * 60;
  }
}
// themed level builder helpers
let BX = 0;
function plat(w, y, kind, gap, extra) { const b = Object.assign({ x: BX, w, y: Math.round(y), kind, seed: (rnd() * 1e9) | 0, img: null }, extra || {}); B.push(b); BX += w + (gap || 0); return b; }
const jig = (base, amp) => base + (rnd() - 0.5) * 2 * amp;
function section(name, toast) { SECTIONS.push({ x0: BX, name, toast: toast || name }); }
function placeAnchors(kindFor, cols) {
  let ax = 120, n = 0;
  while (ax < finishX + 500) {
    const b = roofAt(ax);
    if (b && b.noAnchor) { ax += 50; continue; }
    const nearB = B.filter(q => Math.abs(q.x + q.w / 2 - ax) < 400), ref = b ? b.y : Math.min(...nearB.map(q => q.y));
    const ay = Math.max(105, ref - (225 + rnd() * 70));
    const onRoof = !!(b && ax > b.x + 18 && ax < b.x + b.w - 18);
    const kind = kindFor(ax, b, onRoof, n);
    if (kind) { ANCH.push({ id: ANCH.length, x: ax, y: ay, kind, base: b ? b.y : 0, col: cols[n % cols.length], ph: rnd() * 6, v: n % 4 }); n++; }
    ax += 150 + rnd() * 60;
  }
}
function genKetchikan() {
  const G = H - 250; BX = -300;
  section('Ketchikan Waterfront', 'WELCOME TO KETCHIKAN!');
  const d0 = plat(1000, G, 'dock', 90);
  for (let i = 0; i < 3; i++) plat(270 + rnd() * 100, jig(G, 35), 'boardwalk', 80 + rnd() * 45);
  section('Totem Poles', 'TOTEM POLES!');
  DECO.push({ t: 'sign', x: BX + 70, plat: null, text: ['TOTEM', 'POLE PARK'] });
  for (let i = 0; i < 5; i++) plat(330 + rnd() * 110, jig(G - 20, 40), 'park', 85 + rnd() * 45);
  section('The Red Bridge', 'THE RED BRIDGE!');
  plat(380, G, 'boardwalk', 0, { creek: true });
  DECO.push({ t: 'sign', x: BX - 200, text: ['THE RED', 'BRIDGE'] });
  const br = plat(1150, G, 'bridge', 0, { noAnchor: true });
  plat(360, G, 'boardwalk', 100, { creek: true });
  section('Ketchikan Charter School', 'KETCHIKAN CHARTER SCHOOL!');
  const Gy = G + 10;
  plat(560, Gy, 'street', 0, { playground: true });
  DECO.push({ t: 'monument', x: BX - 450 });
  // the school: stair steps -> balcony deck -> roof (climb the wall or jump!)
  const sw = 760, sh = Math.round(290 * sw / 820), sx = BX;
  const stepW = Math.round(sw * 0.2 / 5);
  for (let k = 0; k < 5; k++) plat(stepW, Gy - (k + 1) * 26, 'steps', 0, { groundY: Gy, noAnchor: true });
  plat(Math.round(sw * 0.16), Gy - 132, 'deck', 0, { groundY: Gy, noAnchor: true });
  const roofW = sw - stepW * 5 - Math.round(sw * 0.16);
  plat(roofW, Gy - sh + 8, 'roof', 120, { groundY: Gy });
  DECO.push({ t: 'school', x: sx, y: Gy - sh, w: sw, h: sh });
  plat(440, Gy, 'street', 90);
  section("Bugge's Beach", "BUGGE'S BEACH!");
  plat(420, jig(G, 20), 'forest', 80);
  const BY = H - 205;
  const b1 = plat(430, BY, 'beach', 75);
  DECO.push({ t: 'sign', x: b1.x + 90, text: ["BUGGE'S", 'BEACH'], beach: true });
  plat(150, BY - 50, 'boulder', 75);
  plat(380, BY, 'beach', 0);
  plat(280, BY - 6, 'causeway', 0, { pond: true });
  plat(360, BY, 'beach', 80);
  plat(160, BY - 60, 'boulder', 80);
  const fin = plat(1100, BY, 'beach', 0, { final: true });
  finishX = fin.x + 520; LVLEN = finishX - 200;
  // deco: stilt houses behind boardwalks, spruces in the park & forest, beach props
  for (const b of B) {
    if (b.kind === 'dock' || b.kind === 'boardwalk') for (let x = b.x + 30; x < b.x + b.w - 150; x += 230) DECO.push({ t: 'house', x, plat: b, v: ((x / 230) | 0) % 4 });
    if (b.kind === 'park') for (let x = b.x + 50, i = 0; x < b.x + b.w - 40; x += 120, i++) DECO.push(i % 2 ? { t: 'tree', x, plat: b, s: 0.75 + rnd() * 0.3 } : { t: 'totem', x, plat: b, v: (B.indexOf(b) + i) % 4, h: 190 + rnd() * 50 });
    if (b.kind === 'forest') for (let x = b.x + 40; x < b.x + b.w - 40; x += 150) DECO.push({ t: 'tree', x, plat: b, s: 0.75 + rnd() * 0.3 });
    if (b.kind === 'beach') { DECO.push({ t: 'drift', x: b.x + b.w * 0.55, plat: b }); DECO.push({ t: 'rocks', x: b.x + b.w * 0.85, plat: b }); if (b.w > 400) DECO.push({ t: 'picnic', x: b.x + b.w * 0.25, plat: b }); if (b.w > 360 && b.w < 400) DECO.push({ t: 'firepit', x: b.x + b.w * 0.3, plat: b }); DECO.push({ t: 'tree', x: b.x + b.w * 0.08, plat: b, s: 0.8 }); }
    if (b.kind === 'boulder') DECO.push({ t: 'tidepool', x: b.x + b.w / 2, plat: b });
  }
  DECO.push({ t: 'tree', x: fin.x + fin.w - 120, plat: fin, s: 1.1 });
  // red bridge: anchors on the arched top chord of the red truss
  br.truss = trussPts(br);
  for (let i = 1; i < br.truss.length - 1; i++) { const p = br.truss[i]; ANCH.push({ id: ANCH.length, x: p.x, y: p.y, kind: 'truss', base: br.y, col: '#ffe066', ph: rnd() * 6, v: 0 }); }
  placeAnchors((ax, b, on, n) => {
    if (!b) return 'buoy';
    if (!on) return null;
    switch (b.kind) {
      case 'park': return 'totem';
      case 'forest': return 'spruce';
      case 'beach': return n % 2 ? 'spruce' : 'lamp';
      case 'boulder': return 'buoy';
      case 'roof': return ANCH.some(a => a.kind === 'flag') ? 'mast' : 'flag';
      default: return 'lamp';
    }
  }, ['#ffe066', '#55e6ff']);
  ANCH.sort((a, b) => a.x - b.x); ANCH.forEach((a, i) => a.id = i);
}
function trussPts(b) {
  const x0 = b.x + 30, x1 = b.x + b.w - 30, n = Math.max(6, Math.round((x1 - x0) / 120)), pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t; const h = (i === 0 || i === n) ? 0 : 150 + 85 * Math.sin(Math.PI * t); pts.push({ x, y: b.y - 8 - h }); }
  return pts;
}
function genJungle() {
  const G = H - 250; BX = -300;
  section('Jungle Island', 'WELCOME TO JUNGLE ISLAND!');
  plat(1000, G, 'jungle', 95);
  for (let i = 0; i < 3; i++) plat(290 + rnd() * 110, jig(G, 45), 'jungle', 80 + rnd() * 50);
  section('Waterfall Cliffs', 'WATERFALL CLIFFS!');
  let cy = G - 40;
  for (let i = 0; i < 4; i++) { cy = Math.max(G - 130, Math.min(G + 20, cy + (rnd() - 0.5) * 120)); plat(300 + rnd() * 110, cy, 'cliff', i === 1 ? 0 : 85 + rnd() * 40, { falls: true }); if (i === 1) plat(330, cy, 'rope', 0); }
  section('Ancient Temple', 'ANCIENT TEMPLE!');
  for (let i = 0; i < 5; i++) plat(320 + rnd() * 120, jig(G - 30, 45), 'temple', 85 + rnd() * 45);
  section('Rope Bridges', 'ROPE BRIDGES!');
  const ry = G - 60;
  plat(300, ry, 'cliff', 0, { falls: true }); plat(390, ry, 'rope', 0); plat(300, ry, 'cliff', 0); plat(320, ry, 'rope', 0); plat(300, ry, 'cliff', 95, { falls: true });
  section('Volcano Temple', 'VOLCANO TEMPLE!');
  plat(340, G, 'jungle', 90);
  const fin = plat(1150, G - 20, 'temple', 0, { final: true });
  finishX = fin.x + 560; LVLEN = finishX - 200;
  for (const b of B) {
    if (b.kind === 'jungle') for (let x = b.x + 60; x < b.x + b.w - 60; x += 210) DECO.push({ t: 'fern', x, plat: b });
    if (b.kind === 'temple') for (let x = b.x + 50; x < b.x + b.w - 40; x += 170) DECO.push({ t: 'lantern', x, plat: b });
  }
  DECO.push({ t: 'pyramid', x: fin.x + 380, plat: fin });
  placeAnchors((ax, b, on, n) => {
    if (!b || !on) return 'vine';
    switch (b.kind) {
      case 'jungle': return n % 2 ? 'palm' : 'tree';
      case 'cliff': return n % 3 === 0 ? 'palm' : 'tree';
      case 'temple': return n % 2 ? 'arch' : 'pillar';
      default: return 'vine';
    }
  }, ['#ffd84a', '#7dff8a']);
}
function populate(themed) {
  const LEN = LVLEN;
  // tokens: arcs over gaps that match a jump arc, + rows on roofs
  for (let i = 0; i < B.length - 1; i++) {
    const a = B[i], b = B[i + 1]; if (a.x > LEN) break;
    const gx = a.x + a.w, gw = b.x - gx, top = Math.min(a.y, b.y) - 110 - rnd() * 40;
    if (themed && gw < 20 && rnd() < 0.6) continue;
    for (let k = 0; k < 5; k++) { const t = k / 4; TOK.push({ x: gx - 40 + t * (gw + 80), y: top + 4 * 55 * (t - 0.5) * (t - 0.5), got: false }); }
    if (i > 0 && rnd() < 0.5 && a.w > 160) for (let k = 0; k < 3; k++) TOK.push({ x: a.x + 50 + k * 40, y: a.y - 48, got: false });
  }
  // civilians spread evenly
  const usable = B.filter(b => b.x > 500 && b.x < LEN - 400 && (!themed || (b.w >= 200 && b.kind !== 'rope' && b.kind !== 'bridge')));
  const civB = new Set(); const types = ['granny', 'cat', 'kid'];
  for (let k = 0; k < RESCUE_GOAL; k++) {
    const b = usable[Math.round((k + 0.6) * usable.length / RESCUE_GOAL)] || usable[usable.length - 1];
    civB.add(b); const t = types[k % 3];
    CIV.push({ type: t, b, x: b.x + b.w * 0.6, y: t === 'cat' ? b.y - 92 : b.y, saved: false, t: 0, ph: rnd() * 6 });
  }
  // comic pages: 6, each 100-145px above the roof/gap line -> one jump (+ double-jump) or a swing gets it
  const nb = B.filter(b => b.x > 400 && b.x < LEN - 300 && (!themed || b.w >= 120));
  for (let k = 0; k < 6; k++) {
    const a = nb[Math.round((k + 0.35) * nb.length / 6)] || nb[nb.length - 1];
    const c = B[B.indexOf(a) + 1], overGap = k % 2 === 1 && c && (!themed || c.x - (a.x + a.w) > 30);
    const px = overGap ? (a.x + a.w + c.x) / 2 : a.x + a.w * 0.35;
    const ref = overGap ? Math.min(a.y, c.y) : a.y;
    PAGES.push({ x: px, y: ref - (100 + rnd() * 45), got: false, ref });
  }
  const pageB = new Set(PAGES.map(p => roofAt(p.x)).filter(Boolean));
  // enemies, a little more as you go (gentle)
  for (const b of B) {
    if (b.x < 700 || b.x > LEN - 200 || civB.has(b)) continue;
    if (themed && (b.w < 200 || b.kind === 'rope')) continue;
    const prog = b.x / LEN;
    if (rnd() < 0.28 + prog * 0.3) {
      const type = rnd() < 0.5 ? 'bot' : 'goon';
      EN.push({ type, x: b.x + b.w * (0.45 + rnd() * 0.35), y: b.y, min: b.x + 25, max: b.x + b.w - 25, dir: -1, sp: 22 + rnd() * 18 + prog * 18, alive: true, wt: 0, ph: rnd() * 6 });
    }
    if (!pageB.has(b) && rnd() < 0.1 + prog * 0.2) EN.push({ type: 'drone', x: b.x + b.w / 2, y: b.y - 200 - rnd() * 80, by: 0, min: b.x - 60, max: b.x + b.w + 60, dir: -1, sp: 30, alive: true, wt: 0, ph: rnd() * 6 });
  }
  for (const e of EN) e.by = e.y;
  for (let k = 1; k <= 3; k++) { const hx = k * LEN / 4 + 300, hb = roofAt(hx) || B[1]; HEARTS.push({ x: hx, y: hb.y - 120, got: false }); }
}
// ---------- v5 themed platforms ----------
function themedImg(b) {
  const h = Math.max(8, H - b.y + 4), w = Math.ceil(b.w), rr = mulberry(b.seed), k = b.kind;
  b.img = mk(w, h, (g) => {
    const earth = (top, c1, c2, rock, moss) => {
      const gr = g.createLinearGradient(0, top, 0, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, top, w, h - top);
      for (let i = 0; i < w * h / 2600; i++) { g.fillStyle = rock; g.globalAlpha = 0.35 + rr() * 0.4; g.beginPath(); g.ellipse(rr() * w, top + 14 + rr() * (h - top), 6 + rr() * 16, 4 + rr() * 9, 0, 0, 7); g.fill(); }
      if (moss) for (let i = 0; i < w / 40; i++) { g.fillStyle = moss; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(rr() * w, top + 10 + rr() * 80, 10 + rr() * 22, 5 + rr() * 8, 0, 0, 7); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, top, 5, h); g.fillRect(w - 6, top, 6, h);
    };
    const grassTop = (c1, c2, tuft) => { g.fillStyle = c1; g.fillRect(0, 0, w, 14); g.fillStyle = c2; g.fillRect(0, 10, w, 5); g.fillStyle = tuft; for (let x = 2; x < w; x += 7 + rr() * 6) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x + 3, -6 - rr() * 6); g.lineTo(x + 6, 2); g.fill(); } g.strokeStyle = '#1b2a12'; g.lineWidth = 2; g.strokeRect(1, 0, w - 2, h + 4); };
    if (k === 'dock' || k === 'boardwalk' || k === 'bridge') {
      // pilings + cross braces down into the water
      const piles = k === 'bridge' ? [8, w - 34] : null;
      const px = piles || []; if (!piles) for (let x = 10; x < w - 10; x += 46) px.push(x);
      for (const x of px) { g.fillStyle = '#4e321e'; g.fillRect(x, 14, k === 'bridge' ? 26 : 12, h); g.fillStyle = '#3a2414'; g.fillRect(x + (k === 'bridge' ? 18 : 8), 14, 4, h); g.fillStyle = 'rgba(40,90,70,.7)'; g.fillRect(x, h - 70, k === 'bridge' ? 26 : 12, 70); }
      if (k === 'bridge') { g.fillStyle = '#8f8c86'; g.fillRect(0, 14, 40, h); g.fillRect(w - 40, 14, 40, h); g.fillStyle = '#6d6a64'; for (let y = 30; y < h; y += 26) { g.fillRect(0, y, 40, 3); g.fillRect(w - 40, y, 40, 3); } }
      else { g.strokeStyle = '#3d2716'; g.lineWidth = 4; for (let i = 0; i < px.length - 1; i++) { g.beginPath(); g.moveTo(px[i] + 6, 24); g.lineTo(px[i + 1] + 6, 104); g.moveTo(px[i + 1] + 6, 24); g.lineTo(px[i] + 6, 104); g.stroke(); } }
      // plank deck
      g.fillStyle = k === 'bridge' ? '#5b4a3a' : '#a06c3c'; g.fillRect(0, 0, w, 16); g.fillStyle = k === 'bridge' ? '#7a6550' : '#c8915a'; g.fillRect(0, 0, w, 4);
      g.fillStyle = 'rgba(60,35,15,.55)'; for (let x = 0; x < w; x += 22 + rr() * 10) g.fillRect(x, 4, 2, 12);
      g.strokeStyle = '#2b1a0c'; g.lineWidth = 2; g.strokeRect(1, 0, w - 2, 16);
    } else if (k === 'park' || k === 'forest') {
      earth(12, '#5c4a3a', '#2c241c', '#7b7368', '#3f7a3a'); grassTop(k === 'park' ? '#3faa4a' : '#2f8a3c', '#2a7a34', k === 'park' ? '#5ccf5a' : '#48b04e');
    } else if (k === 'street') {
      earth(16, '#7d7b78', '#46443f', '#9a978f', null);
      g.strokeStyle = 'rgba(40,40,40,.45)'; g.lineWidth = 2; for (let y = 34; y < h; y += 28) for (let x = (y / 28 % 2) * 30; x < w; x += 60) g.strokeRect(x, y, 60, 28);
      g.fillStyle = '#c9c6c0'; g.fillRect(0, 0, w, 12); g.fillStyle = '#4caf50'; g.fillRect(0, 12, w, 5); g.fillStyle = '#9d9a94'; for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 2, 12); g.strokeStyle = '#2b2b2b'; g.lineWidth = 2; g.strokeRect(1, 0, w - 2, h + 4);
    } else if (k === 'steps' || k === 'deck' || k === 'roof') {
      const top = (b.groundY || b.y) - b.y; earth(top + 12, '#6e6b66', '#3e3c38', '#8f8b84', null);
      g.fillStyle = '#c9c6c0'; g.fillRect(0, top, w, 12); g.fillStyle = '#4caf50'; g.fillRect(0, top + 12, w, 5);
    } else if (k === 'beach' || k === 'causeway') {
      if (k === 'causeway') { g.fillStyle = '#cfc8b8'; g.fillRect(0, 0, w, 26); g.fillStyle = '#a9a291'; g.fillRect(0, 22, w, 6); g.strokeStyle = 'rgba(80,70,60,.5)'; g.lineWidth = 1.5; for (let x = 30; x < w; x += 70) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x + 8, 24); g.stroke(); } g.fillStyle = '#8a8476'; g.fillRect(20, 28, w - 40, h); g.strokeStyle = '#3a352c'; g.lineWidth = 2; g.strokeRect(1, 0, w - 2, 28); }
      else {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f1dfae'); gr.addColorStop(0.18, '#d8bf86'); gr.addColorStop(0.5, '#8d8576'); gr.addColorStop(1, '#4b4a46'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < w / 5; i++) { const cs = ['#9a9590', '#6f6b66', '#b9b2a6', '#58534d']; g.fillStyle = cs[(rr() * 4) | 0]; g.beginPath(); g.ellipse(rr() * w, 6 + rr() * (h * 0.45), 2 + rr() * 5, 1.5 + rr() * 3.5, 0, 0, 7); g.fill(); }
        g.fillStyle = '#5a7a3a'; for (let i = 0; i < w / 60; i++) { g.globalAlpha = .5; g.beginPath(); g.ellipse(rr() * w, h * 0.35 + rr() * 60, 14, 6, 0, 0, 7); g.fill(); } g.globalAlpha = 1;
        g.strokeStyle = '#5c4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 1); g.lineTo(w, 1); g.stroke();
      }
    } else if (k === 'boulder') {
      g.fillStyle = '#5d5f5c'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, 22); g.quadraticCurveTo(4, 0, 30, 0); g.lineTo(w - 30, 0); g.quadraticCurveTo(w - 4, 0, w, 22); g.lineTo(w, h); g.fill();
      g.fillStyle = '#7a7c78'; g.beginPath(); g.ellipse(w * 0.35, 18, w * 0.25, 10, 0, 0, 7); g.fill();
      g.fillStyle = '#5a8a3a'; g.beginPath(); g.ellipse(w * 0.5, 4, w * 0.42, 7, 0, 0, 7); g.fill();
      g.strokeStyle = '#2b2b2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(1, h); g.lineTo(1, 22); g.quadraticCurveTo(4, 1, 30, 1); g.lineTo(w - 30, 1); g.quadraticCurveTo(w - 4, 1, w - 1, 22); g.lineTo(w - 1, h); g.stroke();
    } else if (k === 'jungle') {
      earth(12, '#8a4f2a', '#3d2212', '#a8673a', '#2f7a2a');
      g.strokeStyle = '#5a3418'; g.lineWidth = 3; for (let i = 0; i < w / 50; i++) { const x = rr() * w; g.beginPath(); g.moveTo(x, 14); g.bezierCurveTo(x + 10, 40, x - 12, 70, x + 6, 100 + rr() * 60); g.stroke(); }
      grassTop('#4cc63a', '#2f9a2a', '#7be04a');
      for (let i = 0; i < w / 45; i++) { g.fillStyle = ['#ff5aa8', '#ffd84a', '#ff7a2a'][(rr() * 3) | 0]; g.beginPath(); g.arc(rr() * w, 4 + rr() * 6, 3, 0, 7); g.fill(); }
    } else if (k === 'cliff') {
      earth(12, '#9a8360', '#4d3f2c', '#b39c74', '#3f8a2f');
      g.strokeStyle = 'rgba(50,35,20,.5)'; g.lineWidth = 2; for (let i = 0; i < w / 40; i++) { const x = rr() * w; g.beginPath(); g.moveTo(x, 20); g.lineTo(x + (rr() - .5) * 30, 80 + rr() * 120); g.stroke(); }
      g.strokeStyle = '#2f8a2a'; g.lineWidth = 3; for (let i = 0; i < w / 60; i++) { const x = rr() * w; g.beginPath(); g.moveTo(x, 10); g.quadraticCurveTo(x + 8, 50, x - 4, 90 + rr() * 80); g.stroke(); }
      grassTop('#46b83a', '#2d8a2a', '#6fd84a');
    } else if (k === 'rope') {
      for (let x = 0; x < w; x += 18) { g.fillStyle = (x / 18) % 2 ? '#a8743e' : '#c08a4e'; g.fillRect(x + 1, 0, 15, 11); g.strokeStyle = '#4a2c12'; g.lineWidth = 1.5; g.strokeRect(x + 1, 0, 15, 11); }
      g.strokeStyle = '#d9b77a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 12); g.lineTo(w, 12); g.stroke();
    } else if (k === 'temple') {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e2ad48'); gr.addColorStop(1, '#8a5c22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(90,55,15,.6)'; g.lineWidth = 2;
      for (let y = 14, r = 0; y < h; y += 34, r++) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (r % 2) * 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 34); g.stroke(); } }
      g.strokeStyle = 'rgba(120,70,20,.75)'; g.lineWidth = 2.5;
      for (let y = 31, r = 0; y < Math.min(h, 260); y += 68, r++) for (let x = 32 + (r % 2) * 32; x < w - 20; x += 128) { g.beginPath(); for (let a = 0; a < 12; a += 0.3) g.lineTo(x + Math.cos(a) * a * 1.2, y + Math.sin(a) * a * 1.2); g.stroke(); }
      g.fillStyle = '#f6cf6a'; g.fillRect(0, 0, w, 10); g.fillStyle = '#3f9a32'; for (let x = 0; x < w; x += 9) { g.globalAlpha = .7; g.beginPath(); g.ellipse(x + rr() * 6, 2, 6, 3, 0, 0, 7); g.fill(); } g.globalAlpha = 1;
      g.strokeStyle = '#4a2c0a'; g.lineWidth = 2; g.strokeRect(1, 0, w - 2, h + 4);
    }
  });
}
function buildingImg(b) {
  if (b.kind) return themedImg(b);
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
function noise(d, vol, f0, f1, delay) {
  if (muted) return; const a = ac(); if (!a) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
  const t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + d + 0.02);
}
const SFX = {
  jump() { tone(420, 0.16, 'square', 0.06, 2.2); },
  djump() { tone(560, 0.14, 'square', 0.06, 2.4); tone(840, 0.18, 'triangle', 0.08, 1.8, 0.05); noise(0.12, 0.12, 5000, 2500); },
  bonk() { tone(300, 0.12, 'square', 0.1, 0.6); noise(0.08, 0.25, 1500, 400); },
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
  click() { tone(880, 0.05, 'square', 0.05, 1.3); },
  fanfare() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => { tone(f, 0.24, 'square', 0.07, 1, i * 0.1); tone(f / 2, 0.24, 'triangle', 0.08, 1, i * 0.1); }); noise(0.3, 0.2, 3000, 8000); },
  over() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, 1, i * 0.2)); },
};

// ---------- state ----------
let state = 'title', P, camX = 0, T = 0, stats, best = +localStorage.getItem(HS_KEY) || 0, newBest = false;
let FX = [], TXT = [], SH = [], hintT = 0, endT = 0, suitAcc = 'none', bankMsg = null;
const input = { jumpQ: 0, jumpHeld: false, zapQ: false, block: false };
const ptrs = new Map(); // pointerId -> role ('swing' | 'jump' | 'zap' | 'ui')
let keySwing = false, keyL = false, keyR = false, suitModal = false;
const swingHeld = () => keySwing || [...ptrs.values()].includes('swing');
function moveDir() { let d = 0; for (const r of ptrs.values()) { if (r === 'left') d -= 1; else if (r === 'right') d += 1; } if (keyL) d -= 1; if (keyR) d += 1; return Math.sign(d); }
const swingDir = () => moveDir() || (P ? P.face : 1);
const jumpHeldNow = () => input.jumpHeld || [...ptrs.values()].includes('jump');
function newGame() {
  genLevel();
  const b0 = B[0];
  P = { x: 140, y: b0.y - FEET, vx: 0, vy: 0, st: 'run', sdir: 1, look: LOOK, climbSide: -1, A: null, L: 0, inv: 0, webCD: 0, zapCD: 0, punch: 0, hearts: 3, face: 1, lastB: b0,
        coyote: 0, canDouble: true, flip: 0, flipT: 0, jumpHoldT: 9, jumping: false, maxRise: 0, onRoof: true, trail: [] };
  preloadCombo(curKey());
  camX = Math.max(0, P.x - W / 2 + LOOK); stats = { score: 0, tokens: 0, saved: 0, beaten: 0, pages: 0, jumps: 0, doubles: 0, swings: 0 }; FX = []; TXT = []; SH = []; hintT = 5; newBest = false;
  state = 'play'; input.block = true; input.zapQ = false; input.jumpQ = 0; ptrs.clear(); keyL = keyR = keySwing = false;
  musicStart(LEVELS[curLv].id);
}
const score = n => { stats.score += n; };
function pop(text, x, y, col, big) { TXT.push({ text, x, y, t: 0, col: col || '#ffde3b', big: !!big, rot: (Math.random() - .5) * 0.4 }); }
function burst(x, y, col, n) { for (let i = 0; i < (n || 10); i++) { const a = Math.random() * 7, s = 80 + Math.random() * 220; FX.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.5 + Math.random() * 0.4, col }); } }
function starBurst(x, y) { const cols = ['#ffde3b', '#ff2e5f', '#55e6ff', '#9b2cff', '#ff8a3b', '#7dff8a']; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = 160 + Math.random() * 90; FX.push({ star: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.7, col: cols[i % 6], rot: Math.random() * 6 }); } }
function puff(x, y) { for (let i = 0; i < 14; i++) { const a = Math.PI * (0.15 + Math.random() * 0.7), s = 60 + Math.random() * 160; FX.push({ x, y, vx: Math.cos(a) * s * (Math.random() < .5 ? -1 : 1), vy: Math.sin(a) * s * 0.6, t: 0, life: 0.45 + Math.random() * 0.25, col: i % 3 ? '#ffffff' : '#ff2e5f', puff: true }); } }

function roofAt(x) { for (const b of B) if (x >= b.x && x <= b.x + b.w) return b; return null; }
// best visible anchor in range ahead of River
function pickAnchor(dir) {
  dir = dir || swingDir();
  let best = null, bs = 1e9;
  for (const a of ANCH) {
    const dx = (a.x - P.x) * dir, dy = P.y - a.y;
    if (dx < 30 || dx > 340 || dy < 70) continue;
    const s = Math.abs(dx - 165) + Math.abs(dy - 250) * 0.4; if (s < bs) { bs = s; best = a; }
  }
  if (!best) for (const a of ANCH) { const dx = (a.x - P.x) * dir, d = Math.hypot(dx, P.y - a.y); if (dx > -10 && a.y < P.y - 20 && d < 460 && d < bs) { bs = d; best = a; } }
  return best;
}
function attach() {
  const dir = swingDir(), a = pickAnchor(dir); if (!a) { P.webCD = 0.1; return; }
  P.A = a; P.L = Math.hypot(a.x - P.x, a.y - P.y); P.st = 'swing'; P.canDouble = true; P.flip = 0; P.jumping = false; P.sdir = dir; P.face = dir;
  if (P.vx * dir < 170) P.vx = 170 * dir; if (P.vy > 260) P.vy = 260; if (P.onRoof) { P.vy = -300; }
  stats.swings++; SFX.thwip(); FX.push({ web: true, x: a.x, y: a.y, t: 0, life: 0.4 });
  if (T - (P.thwipT || -9) > 3 && Math.random() < 0.5) { P.thwipT = T; pop('THWIP!', P.x + (a.x - P.x) * 0.6 + 34 * dir, P.y + (a.y - P.y) * 0.62, '#ffffff'); }
}
function release(boost) {
  if (!P.A) return; P.A = null; P.st = 'air'; P.canDouble = true;
  if (boost) { P.vx += 40 * P.sdir; P.vy -= 120; }
  P.webCD = 0.12;
}
function doJump(kind) {
  input.jumpQ = 0; P.jumpHoldT = 0; P.jumping = true; P.coyote = 0;
  if (kind === 'ground') { P.vy = -JUMP_V; { const d = moveDir(); if (d) P.vx = d * Math.max(P.vx * d, 190); } P.st = 'air'; stats.jumps++; SFX.jump(); P.canDouble = true; P.flip = 0; }
  else if (kind === 'swing') { P.A = null; P.vy = Math.min(P.vy, 0) - SWING_JUMP_V * 0.85; P.vy = Math.max(P.vy, -SWING_JUMP_V - 80); { const d = moveDir() || P.sdir; P.vx = d * Math.max(P.vx * d, 220); } P.st = 'air'; P.canDouble = true; P.webCD = 0.25; stats.jumps++; SFX.djump(); P.flip = 1; P.flipT = 0; puff(P.x, P.y + 20); }
  else { P.vy = -DJUMP_V; { const d = moveDir(); if (d) P.vx = d * Math.max(P.vx * d, 200); } P.canDouble = false; stats.doubles++; SFX.djump(); P.flip = 1; P.flipT = 0; puff(P.x, P.y + 30); if (ward.acc === 'backpack') starBurst(P.x, P.y); if (Math.random() < 0.35) pop('FLIP!', P.x, P.y - 60, '#ffffff'); }
}
function hurt() {
  if (P.inv > 0) return;
  P.hearts--; P.inv = 2; SFX.hurt(); pop('OOF!', P.x, P.y - 50, '#ff8a3b', true);
  P.A = null; P.st = 'air'; P.vx = -140 * P.face; P.vy = -380; P.flip = 0;
  if (P.hearts <= 0) endGame(false);
}
function defeat(e, how) {
  e.alive = false; e.wt = 0; e.wvx = 220 + Math.random() * 100; e.wvy = -480;
  stats.beaten++; score(100); SFX.pow(); burst(e.x, e.y - 30, '#ffffff', 12);
  pop(how || ['POW!', 'BAM!', 'ZAP!', 'WHAM!'][(Math.random() * 4) | 0], e.x, e.y - 70, '#ffde3b', true);
}
function zap() {
  if (P.zapCD > 0) return; P.zapCD = 0.3;
  let best = null, bd = 1e9;
  for (const e of EN) if (e.alive) {
    const dx = e.x - P.x, dy = (e.y - (e.type === 'drone' ? 0 : 34)) - P.y;
    const fx = dx * P.face; if (fx > -80 && fx < 420 && Math.abs(dy) < 380) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = e; } }
  }
  P.punch = 0.3;
  if (best && bd < 75) { defeat(best, 'POW!'); return; }
  SFX.zap();
  const tx = best ? best.x : P.x + 400 * P.face, ty = best ? best.y - (best.type === 'drone' ? 0 : 34) : P.y - 10;
  const d = Math.hypot(tx - P.x, ty - P.y) || 1;
  SH.push({ x: P.x + 34 * P.face, y: P.y - 14, vx: (tx - P.x) / d * 900 + P.vx * 0.5, vy: (ty - P.y) / d * 900, t: 0 });
}
function endGame(win) {
  if (state !== 'play') return;
  state = win ? 'win' : 'over'; endT = 0; ptrs.clear(); keySwing = false; keyL = keyR = false;
  if (win) { SFX.win(); for (let i = 0; i < 80; i++) FX.push({ conf: true, x: Math.random() * W, y: -Math.random() * H * 0.5, vx: (Math.random() - .5) * 60, vy: 120 + Math.random() * 160, t: 0, life: 6, col: ['#ff2e5f', '#ffde3b', '#9b2cff', '#55e6ff', '#ffffff'][i % 5], rot: Math.random() * 6 }); }
  else SFX.over();
  musicStop(); ward.tokens += stats.tokens; ward.pages += stats.pages; saveWard();
  { const st = lvStore[LEVELS[curLv].id]; st.pages = Math.max(st.pages, stats.pages); st.best = Math.max(st.best, stats.score); if (win) st.done = 1; saveLv(); }
  bankMsg = { t: stats.tokens, p: stats.pages };
  if (stats.score > best) { best = stats.score; newBest = true; try { localStorage.setItem(HS_KEY, String(best)); } catch (e) { } }
}
function land(b) {
  P.y = b.y - FEET; P.st = 'run'; P.A = null; P.vy = 0; P.lastB = b; P.canDouble = true; P.flip = 0; P.jumping = false; P.onRoof = true;
}

function startClimb(b, side) { // side -1 = left wall of building, +1 = right wall
  P.st = 'climb'; P.climbB = b; P.climbSide = side; P.A = null; P.canDouble = true; P.flip = 0; P.vx = 0;
  P.x = side < 0 ? b.x - R * 0.6 : b.x + b.w + R * 0.6; P.face = -side;
}
function step(dt) {
  T += dt;
  if (state !== 'play') { for (const f of FX) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.rot !== undefined) f.rot += dt * 3; } FX = FX.filter(f => f.t < f.life); for (const t of TXT) t.t += dt; TXT = TXT.filter(t => t.t < 1.4); return; }
  hintT -= dt; P.inv -= dt; P.webCD -= dt; P.zapCD -= dt; P.punch -= dt; P.coyote -= dt; input.jumpQ -= dt; P.jumpHoldT += dt;
  if (P.flip) { P.flipT += dt; if (P.flipT > 0.45) P.flip = 0; }
  if (input.zapQ) { input.zapQ = false; zap(); }
  const hold = swingHeld() && !input.block;
  const dirX = moveDir(); if (dirX && P.st !== 'climb') P.face = dirX;
  if (dirX || P.st !== 'run') hintT = Math.min(hintT, 0.5); // hint fades as soon as River moves
  // jump (with buffer + coyote time)
  if (input.jumpQ > 0) {
    if (P.st === 'run' || P.coyote > 0) doJump('ground');
    else if (P.st === 'swing') doJump('swing');
    else if (P.st === 'climb') { P.st = 'air'; P.vy = -JUMP_V; P.vx = -P.climbSide * 120; P.canDouble = true; input.jumpQ = 0; SFX.jump(); }
    else if (P.canDouble) doJump('double');
  }
  if (hold && !P.A && P.webCD <= 0 && P.st !== 'climb') attach();
  if (!hold && P.A) release(true);
  const px = P.x, pfeet = P.y + FEET, wasRoof = P.onRoof;
  P.onRoof = false;
  if (P.st === 'run') {
    const tgt = dirX > 0 ? RUN_R : dirX < 0 ? -RUN_L : 0;
    const acc = (!tgt || (P.vx * tgt < 0)) ? DEC_G : ACC_G; // crisp stop & quick turn-around
    P.vx = approach(P.vx, tgt, acc * dt); P.x += P.vx * dt;
    if (P.x < MIN_X) { P.x = MIN_X; P.vx = 0; }
    const b = roofAt(P.x);
    if (!b) { P.st = 'air'; P.vy = 0; P.coyote = COYOTE; } // ran off the edge: coyote time to still jump
    else if (b !== P.lastB && P.lastB && b.y < P.lastB.y - 30) { // a taller block right next to this one = a wall
      const right = b.x >= P.lastB.x;
      if ((right && P.vx > 0) || (!right && P.vx < 0)) startClimb(b, right ? -1 : 1);
      else { P.x = right ? b.x - 1 : b.x + b.w + 1; P.vx = 0; }
    }
    else if (b !== P.lastB && P.lastB && b.y > P.lastB.y + 30) { P.st = 'air'; P.vy = 0; P.coyote = COYOTE; } // step down: drop
    else { P.y = b.y - FEET; P.vy = 0; P.onRoof = true; P.lastB = b; }
  } else if (P.st === 'climb') {
    P.vy = -480; P.vx = 0; P.y += P.vy * dt;
    const b = P.climbB;
    if (P.y + FEET <= b.y) { land(b); P.x = P.climbSide < 0 ? b.x + 12 : b.x + b.w - 12; P.vx = 0; puff(P.x, b.y); }
  } else {
    let g = GRAV;
    if (P.jumping && jumpHeldNow() && P.vy < 0 && P.jumpHoldT < 0.24) g *= 0.5; // hold for a higher jump
    P.vy += g * dt; if (P.vy > 900) P.vy = 900;
    if (P.st === 'swing' && P.A) {
      const dx = P.x - P.A.x, dy = P.y - P.A.y, d = Math.hypot(dx, dy) || 1, tx = -dy / d, ty = dx / d;
      if (dirX) P.sdir = dirX;
      const dir = (tx > 0 ? 1 : -1) * P.sdir; P.vx += tx * dir * 170 * dt; P.vy += ty * dir * 170 * dt;
    } else { // mid-air steering
      if (dirX) { if (P.vx * dirX < AIR_MAX) P.vx = approach(P.vx, dirX * AIR_MAX, AIR_ACC * dt); }
      else P.vx = approach(P.vx, 0, 140 * dt);
    }
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.x < MIN_X) { P.x = MIN_X; if (P.vx < 0) P.vx = 0; }
    if (P.st === 'swing' && P.A) {
      // reel in so the low point of the swing clears the rooftop below
      const rb = roofAt(P.A.x) || roofAt(P.x);
      if (rb) { const Lmax = rb.y - FEET - 14 - P.A.y; if (P.L > Lmax) P.L = Math.max(Lmax, P.L - 420 * dt); }
      const dx = P.x - P.A.x, dy = P.y - P.A.y, d = Math.hypot(dx, dy);
      if (d > P.L) {
        const nx = dx / d, ny = dy / d; P.x = P.A.x + nx * P.L; P.y = P.A.y + ny * P.L;
        const vr = P.vx * nx + P.vy * ny; if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; }
      }
      if ((P.x - P.A.x) * P.sdir > P.L * 0.45 && P.vy < 0) { release(true); P.webCD = 0.08; } // chain to the next anchor (either way)
    }
    const sp = Math.hypot(P.vx, P.vy); if (sp > MAXV) { P.vx *= MAXV / sp; P.vy *= MAXV / sp; }
    if (P.y < 30) { P.y = 30; if (P.vy < 0) P.vy = 0; }
    for (const b of B) {
      if (b.x > P.x + 60) break;
      if (P.x + R * 0.6 > b.x && P.x - R * 0.6 < b.x + b.w) {
        const feet = P.y + FEET;
        if (feet >= b.y && pfeet <= b.y + 8 && P.vy >= 0) { const hard = P.vy > 420; land(b); if (hard) burst(P.x, b.y, '#c9a6ff', 5); }
        else if (feet > b.y + 8 && px <= b.x + 4 && P.vx >= 0) { // ran into the LEFT wall
          if (feet < b.y + 34) { land(b); P.x = b.x + 10; } // ledge mantle: just pop up
          else if (dirX > 0 || P.vx > 60) startClimb(b, -1);
          else { P.x = b.x - R * 0.6; P.vx = 0; }
        } else if (feet > b.y + 8 && px >= b.x + b.w - 4 && P.vx <= 0) { // ran into the RIGHT wall (going back)
          if (feet < b.y + 34) { land(b); P.x = b.x + b.w - 10; }
          else if (dirX < 0 || P.vx < -60) startClimb(b, 1);
          else { P.x = b.x + b.w + R * 0.6; P.vx = 0; }
        }
      }
    }
  }
  // fell to the street: no hearts lost, back up on a roof
  if (P.y + FEET > H - 14) {
    SFX.whoops(); pop(curLv ? 'SPLASH!' : 'WHOOPS!', P.x, H - 120, '#55e6ff', true); if (curLv) burst(P.x, H - 40, '#bff6ff', 14); score(-25); if (stats.score < 0) stats.score = 0;
    let nb = P.lastB, nd = 1e9; for (const b of B) { const d = P.x < b.x ? b.x - P.x : P.x > b.x + b.w ? P.x - b.x - b.w : 0; if (d < nd) { nd = d; nb = b; } }
    P.x = Math.max(nb.x + 24, Math.min(P.x, nb.x + nb.w - 24)); P.y = nb.y - FEET - 120; P.vx = 0; P.vy = 0; P.st = 'air'; P.A = null; P.inv = 1.2; P.canDouble = true; P.flip = 0;
  }
  if (!dirX && P.st === 'swing') P.face = P.sdir;
  const speed = Math.hypot(P.vx, P.vy);
  for (const t of TOK) if (!t.got && Math.abs(t.x - P.x) < 38 && Math.abs(t.y - P.y) < 48) { t.got = true; stats.tokens++; score(10); SFX.token(); burst(t.x, t.y, '#ff5c8f', 6); }
  for (const t of PAGES) if (!t.got && Math.abs(t.x - P.x) < 46 && Math.abs(t.y - P.y) < 58) { t.got = true; stats.pages++; score(100); SFX.page(); pop('COMIC PAGE ' + stats.pages + '/6!', t.x, t.y - 40, '#d9a6ff', true); burst(t.x, t.y, '#c38bff', 14); }
  for (const t of HEARTS) if (!t.got && Math.abs(t.x - P.x) < 46 && Math.abs(t.y - P.y) < 56) { t.got = true; if (P.hearts < 5) P.hearts++; SFX.heart(); pop('+1 ♥', t.x, t.y - 40, '#ff6f9a'); }
  for (const c of CIV) {
    c.t += dt;
    if (!c.saved) {
      const cy = c.type === 'cat' ? c.y - 22 : c.y - 38;
      if (Math.abs(c.x - P.x) < 60 && Math.abs(cy - P.y) < (c.type === 'cat' ? 95 : 75)) {
        c.saved = true; c.t = 0; stats.saved++; score(250); SFX.rescue(); burst(c.x, cy, '#ffde3b', 16);
        pop(c.type === 'cat' ? 'MEOW! THANKS!' : 'THANK YOU!', c.x, cy - 70, '#ffffff', true);
      }
    }
  }
  for (const e of EN) {
    if (e.alive) {
      if (Math.abs(e.x - P.x) > 700) continue;
      e.x += e.dir * e.sp * dt; if (e.x < e.min) { e.x = e.min; e.dir = 1; } if (e.x > e.max) { e.x = e.max; e.dir = -1; }
      if (e.type === 'drone') e.y = e.by + Math.sin(T * 2 + e.ph) * 26;
      const ey = e.y - (e.type === 'drone' ? 0 : 34);
      if (Math.abs(e.x - P.x) < 44 && Math.abs(ey - P.y) < 54) {
        if (P.vy > 80 && P.y < ey - 18) { defeat(e, 'BONK!'); P.vy = -460; P.canDouble = true; P.jumping = false; SFX.bonk(); }
        else if (speed > 380 || P.punch > 0 || P.flip) defeat(e, 'KICK!'); else hurt();
      }
    } else { e.wt += dt; e.x += e.wvx * dt; e.y += e.wvy * dt; e.wvy += 900 * dt; }
  }
  for (const s of SH) {
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    for (const e of EN) if (e.alive) { const ey = e.y - (e.type === 'drone' ? 0 : 34); if (Math.hypot(e.x - s.x, ey - s.y) < 46) { defeat(e); s.t = 9; break; } }
  }
  SH = SH.filter(s => s.t < 0.7);
  for (const f of FX) { f.t += dt; if (!f.web) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.puff ? 120 : 300) * dt; } }
  FX = FX.filter(f => f.t < f.life);
  for (const t of TXT) t.t += dt; TXT = TXT.filter(t => t.t < 1.1);
  accStep(dt);
  P.look = approach(P.look, P.face * LOOK, 170 * dt); // gentle look-ahead in the facing direction
  const target = Math.max(0, P.x - W / 2 + P.look);
  camX += (target - camX) * Math.min(1, dt * 4); if (camX < 0) camX = 0;
  checkSection();
  if (P.x >= finishX) { score(stats.saved >= RESCUE_GOAL ? 500 : 0); endGame(true); }
}

function accStep(dt) {
  P.trailK = (P.trailK || 0) + 1; if (P.trailK % 3 === 0) { P.trail.push({ x: P.x, y: P.y }); if (P.trail.length > 16) P.trail.shift(); }
  const a = ward.acc;
  if (a === 'headphones' && (P.st === 'swing' || P.flip) && Math.random() < dt * 12) FX.push({ note: Math.random() < 0.5 ? '♪' : '♫', x: P.x - 24 * P.face, y: P.y - 34, vx: (-50 - Math.random() * 40) * P.face, vy: -40 - Math.random() * 50, t: 0, life: 1.2, col: Math.random() < 0.5 ? '#55e6ff' : '#ff4fa3' });
  if (a === 'gauntlets' && Math.random() < dt * 12) FX.push({ spark: true, x: P.x + (30 + (Math.random() - 0.5) * 30) * P.face, y: P.y - 10 + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0, life: 0.25, col: Math.random() < 0.5 ? '#7ff6ff' : '#ffd84a' });
}
function bolt(x1, y1, x2, y2, jit) { // jagged electric line
  const n = 9; ctx.beginPath(); ctx.moveTo(x1, y1);
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  for (let i = 1; i < n; i++) { const t = i / n, o = (Math.random() - 0.5) * jit; ctx.lineTo(x1 + dx * t + nx * o, y1 + dy * t + ny * o); }
  ctx.lineTo(x2, y2);
}
function drawAccTrail() {
  const a = ward.acc, tr = P.trail; if (tr.length < 3) return;
  const air = P.st !== 'run' && P.st !== 'climb';
  if (a === 'hoodie' && (P.st === 'swing' || P.flip)) {
    for (let i = 0; i < tr.length - 1; i++) { const k = i / tr.length, q = tr[i];
      ctx.globalAlpha = k * 0.8; ctx.fillStyle = i % 2 ? '#ff2e7a' : '#d4143c';
      for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.arc(q.x - 10 + (j & 1) * 5, q.y - 8 + j * 10, 1.5 + k * 4.5, 0, 7); ctx.fill(); } }
    ctx.strokeStyle = '#ff2e7a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.55; for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(tr[0].x, tr[0].y - 8 + j * 16); for (const q of tr) ctx.lineTo(q.x - 14, q.y - 8 + j * 16); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  if (a === 'shades' && air) {
    for (const [off, col] of [[-5, '#ff2e5f'], [5, '#55e6ff']]) {
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = 0.75; ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.beginPath(); tr.forEach((q, i) => { const y = q.y - 30 + off + Math.sin(T * 8 + i * 0.6) * 3; i ? ctx.lineTo(q.x - 10, y) : ctx.moveTo(q.x - 10, y); }); ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
}
// ---------- drawing ----------
function drawSky(cx) {
  if (curLv) return drawSkyThemed(cx, LEVELS[curLv].id);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12052a'); g.addColorStop(0.45, '#3a0d57'); g.addColorStop(0.8, '#8a1a55'); g.addColorStop(1, '#2a0a2c');
  ctx.fillStyle = g; ctx.fillRect(-OX / S - 2, 0, W + 2 * OX / S + 4, H);
  if (!bgCache) buildBg();
  ctx.fillStyle = halfPat; ctx.globalAlpha = 0.25; ctx.fillRect(0, 0, W, H * 0.7); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,170,210,0.18)'; ctx.beginPath(); ctx.arc(300, H * 0.14, 70, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd6ea'; ctx.beginPath(); ctx.arc(300, H * 0.14, 42, 0, 7); ctx.fill();
  const tile = (img, par, y) => { const w = img.width; let ox = -((cx * par) % w); if (ox > 0) ox -= w; while (ox > -OX / S) ox -= w; for (let x = ox; x < W + OX / S; x += w) ctx.drawImage(img, x, y); };
  tile(bgCache.splats, 0.08, 0);
  tile(bgCache.far, 0.2, H - bgCache.far.height);
  tile(bgCache.mid, 0.45, H - bgCache.mid.height);
}
// ---------- v5 themed backgrounds ----------
let panoCache = {};
function pano(n, h) { // the painted panorama + its mirror, side by side so it tiles seamlessly
  const key = n + h; if (panoCache[key]) return panoCache[key]; const img = LI(n); if (!img) return null;
  const w = Math.round(img.naturalWidth * h / img.naturalHeight);
  return panoCache[key] = mk(w * 2, h, (g) => { g.drawImage(img, 0, 0, w, h); g.save(); g.translate(w * 2, 0); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); g.restore(); });
}
const bgThemed = {};
function midLayer(id) {
  if (bgThemed[id + H]) return bgThemed[id + H];
  const rr = mulberry(id === 'ketchikan' ? 11 : 12), w = 900, h = Math.round(H * 0.42);
  return bgThemed[id + H] = mk(w, h, (g) => {
    if (id === 'ketchikan') { // misty spruce ridge
      for (let layer = 0; layer < 2; layer++) {
        g.fillStyle = layer ? '#1f4a3c' : '#4f7d6e'; g.globalAlpha = layer ? 0.95 : 0.75;
        for (let x = -20; x < w + 20; x += 14 + rr() * 16) { const th = (layer ? 90 : 130) + rr() * 80, bx = x, by = h - (layer ? 0 : 30); g.beginPath(); g.moveTo(bx, by - th); for (let k = 0; k < 6; k++) { const yy = by - th + (k + 1) * th / 6, ww = 4 + (k + 1) * 3.2; g.lineTo(bx + ww, yy); g.lineTo(bx + ww * 0.45, yy); } for (let k = 5; k >= 0; k--) { const yy = by - th + (k + 1) * th / 6, ww = 4 + (k + 1) * 3.2; g.lineTo(bx - ww * 0.45, yy); g.lineTo(bx - ww, yy); } g.closePath(); g.fill(); }
        g.fillRect(0, h - (layer ? 8 : 34), w, 40);
      }
      g.globalAlpha = 1;
    } else { // jungle canopy + palm silhouettes
      g.fillStyle = '#1e5a2a'; g.globalAlpha = 0.85; for (let x = -30; x < w + 30; x += 40 + rr() * 30) { g.beginPath(); g.arc(x, h - 30 - rr() * 30, 40 + rr() * 30, 0, 7); g.fill(); } g.fillRect(0, h - 40, w, 40);
      g.globalAlpha = 1; g.strokeStyle = '#123d1c'; g.fillStyle = '#123d1c';
      for (let x = 30; x < w; x += 120 + rr() * 90) { const th = 150 + rr() * 90, lean = (rr() - .5) * 40; g.lineWidth = 7; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + lean * 0.3, h - th / 2, x + lean, h - th); g.stroke(); for (let f = 0; f < 7; f++) { const an = -Math.PI + f * Math.PI / 6 + (rr() - .5) * .2, L = 50 + rr() * 20; g.beginPath(); g.moveTo(x + lean, h - th); g.quadraticCurveTo(x + lean + Math.cos(an) * L * 0.6, h - th + Math.sin(an) * L * 0.6 - 18, x + lean + Math.cos(an) * L, h - th + Math.sin(an) * L * 0.5 + 18); g.lineWidth = 6; g.stroke(); } }
    }
  });
}
function drawSkyThemed(cx, id) {
  const ket = id === 'ketchikan';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (ket) { g.addColorStop(0, '#f6c37a'); g.addColorStop(0.5, '#cfe2df'); g.addColorStop(1, '#2f6f78'); }
  else { g.addColorStop(0, '#ff8a3c'); g.addColorStop(0.5, '#ffc46a'); g.addColorStop(1, '#2f7a5a'); }
  ctx.fillStyle = g; ctx.fillRect(-OX / S - 2, 0, W + 2 * OX / S + 4, H);
  const ph = Math.round(H * 0.78), pi = pano(ket ? 'ket_bg' : 'jun_bg', ph);
  if (pi) {
    const half = pi.width / 2; let ox = -((cx * 0.1) % pi.width); if (ox > 0) ox -= pi.width; while (ox > -OX / S) ox -= pi.width;
    for (let x = ox; x < W + OX / S; x += pi.width) {
      ctx.drawImage(pi, x, 0);
      if (!ket) for (const vx of [x + half * 0.585, x + pi.width - half * 0.585]) if (vx > -80 && vx < W + 80) { // volcano smoke
        for (let i = 0; i < 6; i++) { const t = (T * 0.12 + i / 6) % 1; ctx.globalAlpha = 0.45 * (1 - t); ctx.fillStyle = i % 2 ? '#8a7a72' : '#a89890'; ctx.beginPath(); ctx.arc(vx + Math.sin(t * 3 + i) * 10 + t * 30, ph * 0.3 - t * ph * 0.28, 10 + t * 30, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(T * 3); ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.arc(vx, ph * 0.305, 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    const fade = ctx.createLinearGradient(0, ph - 120, 0, ph); fade.addColorStop(0, ket ? 'rgba(47,111,120,0)' : 'rgba(47,122,90,0)'); fade.addColorStop(1, ket ? 'rgba(47,111,120,1)' : 'rgba(47,122,90,1)'); ctx.fillStyle = fade; ctx.fillRect(-OX / S - 2, ph - 120, W + 2 * OX / S + 4, 121);
  }
  if (ket) { // floatplane + bald eagle cruising over the Narrows
    const pl = LI('plane'), eg = LI('eagle');
    if (pl) { const px = ((T * 38 - cx * 0.15) % (W + 500) + W + 500) % (W + 500) - 200; ctx.drawImage(pl, px, H * 0.12 + Math.sin(T * 0.8) * 6, 110, 57); }
    if (eg) { const ex = ((T * 55 - cx * 0.3 + 300) % (W + 400) + W + 400) % (W + 400) - 150, fl = 1 + 0.12 * Math.sin(T * 6); ctx.save(); ctx.translate(ex, H * 0.22 + Math.sin(T * 1.3) * 14); ctx.scale(1, fl); ctx.drawImage(eg, -40, -28, 80, 56); ctx.restore(); }
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.22; ctx.fillStyle = '#fff'; const my = H * (0.36 + i * 0.07); let mx = -((cx * (0.15 + i * 0.05) + T * 6) % 700); while (mx > -OX / S) mx -= 700; for (let x = mx; x < W + OX / S; x += 700) { ctx.beginPath(); ctx.ellipse(x + 260, my, 260, 16, 0, 0, 7); ctx.fill(); } } ctx.globalAlpha = 1;
  }
  const ml = midLayer(id), mw = ml.width; let ox = -((cx * 0.35) % mw); if (ox > 0) ox -= mw; while (ox > -OX / S) ox -= mw;
  for (let x = ox; x < W + OX / S; x += mw) ctx.drawImage(ml, x, H - ml.height - 150);
}
function drawWaterBack(cx, id) { // creek / Tongass Narrows / jungle river under everything
  const top = H - 78, ket = id === 'ketchikan';
  const g = ctx.createLinearGradient(0, top, 0, H); g.addColorStop(0, ket ? '#2c8f8f' : '#2fb8b0'); g.addColorStop(1, ket ? '#123f4a' : '#146a6a');
  const m = OX / S + 8; ctx.fillStyle = g; ctx.fillRect(cx - m, top, W + 2 * m, H - top);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
  for (let r = 0; r < 3; r++) { ctx.beginPath(); for (let x = cx - (cx % 40) - 40 - m; x < cx + W + 40 + m; x += 8) { const y = top + 8 + r * 22 + Math.sin(x * 0.05 + T * 2 + r) * 3; x <= cx - (cx % 40) - 40 - m ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  for (let i = 0; i < 10; i++) { const sx = cx + ((i * 97 + T * 20) % W), sy = top + 6 + (i * 31) % 60; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 6 + i); ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 3, 3); } ctx.globalAlpha = 1;
}
function drawWaterFront(cx, id) {
  const top = H - 40, m = OX / S + 8; ctx.fillStyle = id === 'ketchikan' ? 'rgba(30,110,115,.45)' : 'rgba(40,170,165,.45)'; ctx.fillRect(cx - m, top, W + 2 * m, 40);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = cx - (cx % 40) - 40 - m; x < cx + W + 40 + m; x += 8) { const y = top + Math.sin(x * 0.04 - T * 2.4) * 3; x <= cx - (cx % 40) - 40 - m ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
}
// ---------- v5 themed decorations ----------
function woodSign(x, baseY, lines, w, h) {
  const img = LI('sign'); w = w || 200; h = h || 170; const top = baseY - h;
  if (img) ctx.drawImage(img, x - w / 2, top, w, h);
  else { ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x - w * 0.32, top + h * 0.3, 10, h * 0.7); ctx.fillRect(x + w * 0.28, top + h * 0.3, 10, h * 0.7); ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x - w / 2 + 6, top + h * 0.1, w - 12, h * 0.31); }
  const py = top + h * 0.255, sz = lines[0].length > 8 || (lines[1] || '').length > 8 ? 19 : 22;
  ctx.save(); ctx.font = `900 ${sz}px "Arial Black", Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff4d6'; ctx.strokeStyle = '#3a200c'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  lines.forEach((l, i) => { const yy = py + (i - (lines.length - 1) / 2) * (sz + 3); ctx.strokeText(l, x, yy); ctx.fillText(l, x, yy); }); ctx.restore();
}
function drawDeco(d, layer) {
  const b = d.plat, by = b ? b.y : 0;
  switch (d.t) {
    case 'house': { if (layer) return; const img = LI('house' + d.v); if (img) { const h = 210, w = img.naturalWidth * h / 300; ctx.drawImage(img, d.x, by - h + 26, w, h); } else { ctx.fillStyle = ['#c0262d', '#e0b030', '#1fa59a', '#3f8f4a'][d.v]; ctx.fillRect(d.x, by - 150, 170, 150); } break; }
    case 'tree': { if (layer) return; const img = LI('spruce'), h = 290 * d.s; if (img) ctx.drawImage(img, d.x - h * 181 / 720, by - h + 6, h * 181 / 360, h); break; }
    case 'drift': { if (layer !== 1) return; const img = LI('driftwood'); if (img) ctx.drawImage(img, d.x - 60, by - 64, 120, 82); break; }
    case 'picnic': { if (layer !== 1) return; const img = LI('picnic'); if (img) ctx.drawImage(img, d.x - 55, by - 70, 110, 73); break; }
    case 'tidepool': { if (layer !== 1) return; const img = LI('tidepool'); if (img) ctx.drawImage(img, d.x - 50, by - 36, 100, 94); break; }
    case 'sign': { if (layer !== 2) return; const pb = roofAt(d.x); woodSign(d.x, (pb ? pb.y : H - 250) + 4, d.text); break; }
    case 'monument': { if (layer !== 2) return; const pb = roofAt(d.x), y = (pb ? pb.y : H - 240) + 2;
      ctx.fillStyle = '#6b6b66'; ctx.fillRect(d.x - 108, y - 34, 216, 34); ctx.fillStyle = '#85857e'; ctx.fillRect(d.x - 108, y - 34, 216, 8);
      ctx.fillStyle = '#4a2c12'; ctx.fillRect(d.x - 98, y - 132, 196, 100); ctx.fillStyle = '#1f5a8a'; ctx.fillRect(d.x - 90, y - 124, 180, 84);
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.strokeRect(d.x - 85, y - 119, 170, 74);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.font = '900 22px "Arial Black", Impact, sans-serif'; ctx.fillText('KETCHIKAN', d.x, y - 101); ctx.font = '900 15px "Arial Black", Impact, sans-serif'; ctx.fillText('CHARTER SCHOOL', d.x, y - 78); ctx.fillStyle = '#ffd84a'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('★ WELCOME! ★', d.x, y - 58); ctx.restore();
      ctx.fillStyle = '#2f8a3c'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(d.x + i * 34, y - 4, 13, Math.PI, 0); ctx.fill(); } break; }
    case 'school': { if (layer) return; const img = LI('school');
      if (img) ctx.drawImage(img, d.x, d.y, d.w, d.h); else { ctx.fillStyle = '#8a6a48'; ctx.fillRect(d.x, d.y + 8, d.w, d.h - 8); }
      const sx = d.x + d.w * 0.37, sy = d.y + d.h * 0.12, sw = d.w * 0.29, sh = d.h * 0.2;
      ctx.fillStyle = '#4a2c12'; ctx.fillRect(sx - 4, sy - 4, sw + 8, sh + 8); ctx.fillStyle = '#1f5a8a'; ctx.fillRect(sx, sy, sw, sh); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.strokeRect(sx + 3, sy + 3, sw - 6, sh - 6);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(sh * 0.36)}px "Arial Black", Impact, sans-serif`; ctx.fillText('KETCHIKAN', sx + sw / 2, sy + sh * 0.34); ctx.font = `900 ${Math.round(sh * 0.27)}px "Arial Black", Impact, sans-serif`; ctx.fillText('CHARTER SCHOOL', sx + sw / 2, sy + sh * 0.72); ctx.restore(); break; }
    case 'totem': { if (layer) return; const img = LI('totem' + d.v); if (img) { const w = img.naturalWidth * d.h / img.naturalHeight; ctx.drawImage(img, d.x - w / 2, by - d.h + 4, w, d.h); } break; }
    case 'rocks': { if (layer !== 1) return; // mossy tidepool rocks with sea stars & anemones
      ctx.fillStyle = '#5d5f5c'; ctx.beginPath(); ctx.ellipse(d.x, by + 2, 34, 18, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#727470'; ctx.beginPath(); ctx.ellipse(d.x + 30, by + 2, 22, 13, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#5a8a3a'; ctx.beginPath(); ctx.ellipse(d.x - 6, by - 14, 20, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff7a3a'; ctx.save(); ctx.translate(d.x + 8, by - 8); ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 8, an = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.fill(); ctx.restore();
      ctx.fillStyle = '#c85aa8'; ctx.beginPath(); ctx.arc(d.x + 32, by - 7, 4, 0, 7); ctx.fill(); break; }
    case 'firepit': { if (layer !== 1) return; ctx.fillStyle = '#6a6862'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(d.x - 27 + i * 9, by - 4, 6, 5, 0, 0, 7); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const f = 0.7 + 0.3 * Math.sin(T * 12 + i * 2); ctx.fillStyle = i === 1 ? '#ffd84a' : '#ff7a1a'; ctx.beginPath(); ctx.moveTo(d.x - 12 + i * 12 - 6, by - 6); ctx.quadraticCurveTo(d.x - 12 + i * 12, by - 6 - 26 * f, d.x - 12 + i * 12 + 6, by - 6); ctx.fill(); } break; }
    case 'fern': { if (layer !== 1) return; ctx.strokeStyle = '#2f9a2a'; ctx.lineWidth = 4; for (let f = 0; f < 6; f++) { const an = -Math.PI * (0.15 + f * 0.14); ctx.beginPath(); ctx.moveTo(d.x, by); ctx.quadraticCurveTo(d.x + Math.cos(an) * 26, by + Math.sin(an) * 34, d.x + Math.cos(an) * 40, by + Math.sin(an) * 20); ctx.stroke(); } ctx.fillStyle = '#ff5aa8'; ctx.beginPath(); ctx.arc(d.x + 4, by - 26, 5, 0, 7); ctx.fill(); break; }
    case 'lantern': { if (layer) return; lanternAt(d.x, by - 58, 0.9); ctx.fillStyle = '#6a4418'; ctx.fillRect(d.x - 2, by - 48, 4, 48); break; }
    case 'pyramid': { if (layer) return; // the Volcano Temple
      ctx.fillStyle = '#b07a2a'; for (let k = 0; k < 4; k++) { const w = 300 - k * 60; ctx.fillRect(d.x - w / 2, by - 50 - k * 50, w, 52); ctx.fillStyle = k % 2 ? '#b07a2a' : '#c98f34'; }
      ctx.fillStyle = '#2a1608'; ctx.fillRect(d.x - 30, by - 90, 60, 90); ctx.beginPath(); ctx.arc(d.x, by - 90, 30, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.font = '900 16px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☀', d.x, by - 160); break; }
  }
}
function lanternAt(x, y, s) {
  const gl = 0.6 + 0.4 * Math.sin(T * 5 + x); ctx.fillStyle = `rgba(255,200,80,${0.25 * gl})`; ctx.beginPath(); ctx.arc(x, y, 22 * s, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff7a1a'; ctx.strokeStyle = '#5a2a08'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 9 * s, 12 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.ellipse(x, y, 4 * s, 7 * s, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#5a2a08'; ctx.fillRect(x - 5 * s, y - 15 * s, 10 * s, 4 * s);
}
function drawPlayground(b) { // swing set + slide in front of the charter school
  const x = b.x + 300, y = b.y;
  ctx.strokeStyle = '#d6332e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x - 40, y - 100); ctx.lineTo(x - 20, y); ctx.moveTo(x + 60, y); ctx.lineTo(x + 80, y - 100); ctx.lineTo(x + 100, y); ctx.moveTo(x - 46, y - 100); ctx.lineTo(x + 86, y - 100); ctx.stroke();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 2; for (const sx of [x - 2, x + 46]) { const sw = Math.sin(T * 2 + sx) * 0.25, ex = sx + Math.sin(sw) * 64, ey = y - 100 + Math.cos(sw) * 64; ctx.beginPath(); ctx.moveTo(sx - 8, y - 100); ctx.lineTo(ex - 8, ey); ctx.moveTo(sx + 8, y - 100); ctx.lineTo(ex + 8, ey); ctx.stroke(); ctx.fillStyle = '#1f5a8a'; ctx.fillRect(ex - 12, ey, 24, 6); }
  const s = b.x + 425; ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(s, y - 90); ctx.lineTo(s + 18, y - 90); ctx.quadraticCurveTo(s + 70, y - 40, s + 110, y - 4); ctx.lineTo(s + 92, y); ctx.quadraticCurveTo(s + 54, y - 34, s, y - 74); ctx.fill(); ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = '#1fa59a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(s - 10, y); ctx.lineTo(s, y - 90); ctx.moveTo(s + 14, y); ctx.lineTo(s + 18, y - 90); ctx.stroke(); ctx.lineWidth = 3; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(s - 10 + k * 2.3, y - k * 18); ctx.lineTo(s + 14 + k * 0.8, y - k * 18); ctx.stroke(); }
}
function drawTruss(b) { // the Stedman Street "Red Bridge": red steel Warren pony truss
  const p = b.truss || (b.truss = trussPts(b)), dy = b.y - 8, red = '#c0262d', dk = '#5a0d12';
  const seg = (x1, y1, x2, y2, w) => { ctx.lineWidth = w + 4; ctx.strokeStyle = dk; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = red; ctx.stroke(); };
  ctx.lineCap = 'round';
  for (let i = 0; i < p.length - 1; i++) { seg(p[i].x, dy, p[i + 1].x, dy, 7); }
  for (let i = 1; i < p.length - 1; i++) seg(p[i].x, p[i].y, p[i].x, dy, 5);
  for (let i = 0; i < p.length - 1; i++) { const mid = i < (p.length - 1) / 2; if (mid) seg(p[i].x, dy, p[i + 1].x, p[i + 1].y, 5); else seg(p[i].x, p[i].y, p[i + 1].x, dy, 5); }
  for (let i = 0; i < p.length - 1; i++) seg(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, 9);
  ctx.fillStyle = '#ffd6d6'; ctx.globalAlpha = 0.35; for (let i = 0; i < p.length - 1; i++) { ctx.beginPath(); ctx.moveTo(p[i].x, p[i].y - 2); ctx.lineTo(p[i + 1].x, p[i + 1].y - 2); ctx.lineTo(p[i + 1].x, p[i + 1].y + 1); ctx.lineTo(p[i].x, p[i].y + 1); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p[0].x, dy - 26); ctx.lineTo(p[p.length - 1].x, dy - 26); ctx.stroke(); ctx.lineCap = 'butt';
  // leaping salmon in Ketchikan Creek below
  for (let k = 0; k < 3; k++) { const t = (T * 0.5 + k / 3) % 1, fx = b.x + 200 + k * 330, fy = H - 60 - Math.sin(t * Math.PI) * 70; if (t < 0.9) { ctx.save(); ctx.translate(fx + t * 60, fy); ctx.rotate(-0.8 + t * 1.6); ctx.fillStyle = '#d9686a'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6a7a8a'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -7); ctx.lineTo(-24, 7); ctx.fill(); ctx.restore(); } }
}
function drawPond(b) { // warm pond behind Bugge's causeway
  ctx.fillStyle = '#3fa8a0'; ctx.fillRect(b.x + 20, b.y + 30, b.w - 40, 30); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(b.x + 40 + Math.sin(T) * 10, b.y + 38, 60, 2);
}
function drawFalls(b) { // turquoise waterfall pouring off the cliff face
  const fx = b.x + b.w * 0.55, fw = 46, top = b.y + 14;
  const g = ctx.createLinearGradient(fx - fw / 2, 0, fx + fw / 2, 0); g.addColorStop(0, 'rgba(120,240,240,.75)'); g.addColorStop(0.5, 'rgba(220,255,255,.95)'); g.addColorStop(1, 'rgba(90,220,230,.75)');
  ctx.fillStyle = g; ctx.fillRect(fx - fw / 2, top, fw, H - top);
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { const lx = fx - fw / 2 + 6 + i * 9; const off = (T * 220 + i * 40) % 60; for (let y = top + off; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + 22); ctx.stroke(); } }
  for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx + Math.sin(T * 3 + i) * 26, H - 46 + Math.cos(T * 2 + i) * 6, 12 + (i % 3) * 5, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
}
function drawAnchorThemed(a) {
  const hgt = a.base - a.y;
  switch (a.kind) {
    case 'totem': { const img = LI('totem' + (a.id % 4)); const h = hgt + 18; if (img) { const w = img.naturalWidth * h / img.naturalHeight; ctx.drawImage(img, a.x - w / 2, a.y - 14, w, h); } else { ctx.fillStyle = '#8a8274'; ctx.fillRect(a.x - 16, a.y - 10, 32, h); } break; }
    case 'spruce': { const img = LI('spruce'), h = hgt + 40; if (img) ctx.drawImage(img, a.x - h * 181 / 720, a.y - 30, h * 181 / 360, h); break; }
    case 'lamp': { ctx.fillStyle = '#1d3a3a'; ctx.fillRect(a.x - 4 + 18, a.y, 8, hgt); ctx.strokeStyle = '#1d3a3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.x + 22, a.y + 6); ctx.quadraticCurveTo(a.x + 20, a.y - 14, a.x, a.y - 10); ctx.stroke(); ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.arc(a.x + 22, a.y + 14, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#1d3a3a'; ctx.fillRect(a.x + 12, a.y + 4, 20, 6); break; }
    case 'flag': case 'mast': { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(a.x - 2, a.y, 4, hgt); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(a.x, a.y - 2, 4, 0, 7); ctx.fill();
      if (a.kind === 'flag') { // Alaska flag: gold Big Dipper + North Star on blue
        ctx.save(); ctx.translate(a.x + 2, a.y + 10); const wv = t => Math.sin(T * 5 + t * 6) * 3; ctx.fillStyle = '#0f3f8f'; ctx.beginPath(); ctx.moveTo(0, 0); for (let t = 0; t <= 1.001; t += 0.1) ctx.lineTo(t * 64, wv(t)); for (let t = 1; t >= -0.001; t -= 0.1) ctx.lineTo(t * 64, 42 + wv(t)); ctx.fill();
        ctx.fillStyle = '#ffd84a'; for (const [sx, sy] of [[10, 30], [17, 26], [23, 22], [30, 20], [33, 28], [42, 30], [43, 22], [56, 8]]) { ctx.beginPath(); ctx.arc(sx, sy + wv(sx / 64), sx === 56 ? 3 : 2, 0, 7); ctx.fill(); } ctx.restore(); }
      break; }
    case 'buoy': { ctx.strokeStyle = 'rgba(80,60,40,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, -10); ctx.lineTo(a.x, a.y - 8); ctx.stroke(); ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.ellipse(a.x, a.y - 16, 8, 6, 0, 0, 7); ctx.fill(); break; }
    case 'truss': break;
    case 'palm': { const img = LI('palm'), h = hgt + 30; if (img) { const w = img.naturalWidth * h / img.naturalHeight; ctx.drawImage(img, a.x - w / 2, a.y - 24, w, h); } break; }
    case 'tree': { const img = LI('tree'), h = (hgt + 8) / 0.63; if (img) { const w = img.naturalWidth * h / img.naturalHeight; ctx.drawImage(img, a.x - w * 0.975, a.y - h * 0.37, w, h); } break; }
    case 'arch': { const img = LI('arch'), h = hgt + 16; if (img) { const w = img.naturalWidth * h / img.naturalHeight; ctx.drawImage(img, a.x - w / 2, a.y - 12, w, h); } break; }
    case 'pillar': { const img = LI('pillar'), h = hgt + 26; if (img) { const w = img.naturalWidth * h / img.naturalHeight; ctx.drawImage(img, a.x - w / 2, a.y - 22, w, h); } break; }
    case 'vine': { ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.x, -10); for (let y = -10; y < a.y - 8; y += 20) ctx.quadraticCurveTo(a.x + (y % 40 ? 6 : -6), y + 10, a.x, y + 20); ctx.stroke(); ctx.fillStyle = '#4cc63a'; for (let y = 20; y < a.y - 10; y += 34) { ctx.beginPath(); ctx.ellipse(a.x + 7, y, 7, 3.5, 0.5, 0, 7); ctx.fill(); } break; }
  }
}
function drawPortal(fb) { // themed finish portal
  const x = finishX + 40, y = fb.y, lv = LEVELS[curLv], r = 70;
  ctx.save(); ctx.translate(x, y - 100);
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = [lv.col, '#ffde3b', lv.col2][i]; ctx.lineWidth = 8 - i * 2; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62 - i * 8, r - i * 10, 0, T * (2 + i) % 7, (T * (2 + i) % 7) + 5.2); ctx.stroke(); }
  ctx.globalAlpha = 0.45 + 0.2 * Math.sin(T * 4); const gg = ctx.createRadialGradient(0, 0, 4, 0, 0, r); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, lv.col); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.9, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1; ctx.restore();
  comicText(lv.finish, x, y - 200, 20, '#ffde3b');
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
function drawAnchor(a, target) {
  const pulse = 0.6 + Math.sin(T * 4 + a.ph) * 0.4;
  if (a.kind === 'spire') {
    ctx.fillStyle = '#24143a'; ctx.beginPath(); ctx.moveTo(a.x - 9, a.base); ctx.lineTo(a.x - 2, a.y); ctx.lineTo(a.x + 2, a.y); ctx.lineTo(a.x + 9, a.base); ctx.fill();
    ctx.strokeStyle = a.col; ctx.globalAlpha = 0.7; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.base); ctx.lineTo(a.x, a.y + 6); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3a2357'; ctx.lineWidth = 2; for (let y = a.base - 30; y > a.y + 20; y -= 34) { ctx.beginPath(); ctx.moveTo(a.x - 7 * (y - a.y) / (a.base - a.y) - 2, y); ctx.lineTo(a.x + 7 * (y - a.y) / (a.base - a.y) + 2, y); ctx.stroke(); }
  } else if (a.kind !== 'hook') drawAnchorThemed(a);
  else {
    ctx.strokeStyle = 'rgba(200,180,230,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, -10); ctx.lineTo(a.x, a.y - 10); ctx.stroke();
    ctx.fillStyle = '#3a2357'; ctx.fillRect(a.x - 6, a.y - 14, 12, 6);
  }
  ctx.fillStyle = a.col; ctx.globalAlpha = 0.25 * pulse; ctx.beginPath(); ctx.arc(a.x, a.y, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 3; ctx.strokeStyle = a.col; ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, 7); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, 7); ctx.fill();
  if (target) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(T * 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; const r = 20 + Math.sin(T * 8) * 3;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, r, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + 1.3); ctx.stroke(); }
    ctx.restore();
  }
}
function drawWorld() {
  const cx = camX;
  drawSky(cx);
  ctx.save(); ctx.translate(-cx, 0);
  const vis = o => o.x > cx - 80 - OX / S && o.x < cx + W + 80 + OX / S;
  const lvid = LEVELS[curLv].id, themed = curLv > 0, dvis = d => d.x + (d.w || 260) > cx - 40 - OX / S && d.x - 260 < cx + W + OX / S;
  if (themed) { drawWaterBack(cx, lvid); for (const d of DECO) if (dvis(d)) drawDeco(d, 0); }
  for (const b of B) {
    if (b.x + b.w < cx - 20 - OX / S || b.x > cx + W + 20 + OX / S) continue;
    if (!b.img) buildingImg(b);
    ctx.drawImage(b.img, b.x, b.y);
    if (b.falls) drawFalls(b); if (b.pond) drawPond(b); if (b.playground) drawPlayground(b);
    if (b.kind === 'rope') { ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y - 34); ctx.quadraticCurveTo(b.x + b.w / 2, b.y - 14, b.x + b.w, b.y - 34); ctx.stroke(); ctx.lineWidth = 1.5; for (let x = b.x + 20; x < b.x + b.w; x += 30) { const t = (x - b.x) / b.w, yy = b.y - 34 + 20 * 4 * t * (1 - t) * 0.5 * 2 * 0.5; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, b.y); ctx.stroke(); } ctx.fillStyle = '#6a4418'; ctx.fillRect(b.x - 3, b.y - 40, 6, 40); ctx.fillRect(b.x + b.w - 3, b.y - 40, 6, 40); }
    if (b.tower) { ctx.fillStyle = '#2b1842'; ctx.fillRect(b.x + b.w - 70, b.y - 50, 44, 40); ctx.fillStyle = '#3d2560'; ctx.fillRect(b.x + b.w - 74, b.y - 56, 52, 8); ctx.fillStyle = '#1a0d29'; ctx.fillRect(b.x + b.w - 66, b.y - 10, 4, 10); ctx.fillRect(b.x + b.w - 34, b.y - 10, 4, 10); }
  }
  if (themed) { for (const b of B) if (b.kind === 'bridge' && b.x + b.w > cx - 20 - OX / S && b.x < cx + W + 20 + OX / S) drawTruss(b); for (const d of DECO) if (dvis(d)) drawDeco(d, 1); }
  const tgt = state === 'play' && !P.A ? pickAnchor() : null;
  for (const a of ANCH) if (vis(a)) drawAnchor(a, a === tgt || a === (P && P.A));
  if (themed) for (const d of DECO) if ((d.t === 'sign' || d.t === 'monument') && dvis(d)) drawDeco(d, 2);
  if (themed && finishX - cx < W + 200) drawPortal(roofAt(finishX) || B[B.length - 1]);
  else if (finishX - cx < W + 200) {
    const fb = roofAt(finishX) || B[B.length - 1];
    ctx.fillStyle = '#ddd'; ctx.fillRect(finishX, fb.y - 150, 6, 150);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#fff' : '#111'; ctx.fillRect(finishX + 6 + i * 14, fb.y - 150 + j * 12 + Math.sin(T * 4 + i) * 3, 14, 12); }
    comicText('CITY SAVED!', finishX + 50, fb.y - 175, 20, '#ffde3b');
  }
  for (const c of CIV) if (c.type === 'cat') {
    const b = c.b, x = c.x;
    ctx.fillStyle = '#4a2a1e'; ctx.fillRect(x - 26, b.y - 70, 52, 50); ctx.fillStyle = '#6b3d2a'; ctx.beginPath(); ctx.moveTo(x - 32, b.y - 70); ctx.lineTo(x, b.y - 82); ctx.lineTo(x + 32, b.y - 70); ctx.fill();
    ctx.fillStyle = '#2b160f'; ctx.fillRect(x - 22, b.y - 20, 5, 20); ctx.fillRect(x + 17, b.y - 20, 5, 20);
  }
  const bob = Math.sin(T * 5) * 4;
  for (const t of TOK) if (!t.got && vis(t)) ctx.drawImage(TOKEN, t.x - 28, t.y - 28 + Math.sin(T * 4 + t.x) * 3);
  for (const t of PAGES) if (!t.got && vis(t)) {
    // glow beam + sparkles + bouncing arrow so River spots them
    const gb = ctx.createLinearGradient(0, t.y, 0, t.ref); gb.addColorStop(0, 'rgba(200,120,255,0.35)'); gb.addColorStop(1, 'rgba(200,120,255,0)');
    ctx.fillStyle = gb; ctx.fillRect(t.x - 14, t.y, 28, t.ref - t.y);
    for (let i = 0; i < 4; i++) { const a = T * 3 + i * 1.57, r = 30 + Math.sin(T * 5 + i) * 6; ctx.fillStyle = i % 2 ? '#fff' : '#ffde3b'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T * 9 + i); ctx.fillRect(t.x + Math.cos(a) * r - 2, t.y + Math.sin(a) * r - 2, 4, 4); } ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(t.x, t.y + bob); ctx.rotate(Math.sin(T * 2) * 0.15); ctx.drawImage(PAGE, -30, -35); ctx.restore();
    const ay = t.y - 52 + Math.sin(T * 6) * 5; ctx.fillStyle = '#ffde3b'; ctx.strokeStyle = '#140818'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(t.x, ay + 10); ctx.lineTo(t.x - 9, ay); ctx.lineTo(t.x + 9, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
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
    } else if (c.t < 2.5) { ctx.globalAlpha = Math.max(0, 1 - c.t / 2.5); ctx.drawImage(HEART, c.x - 16, c.y - h - 40 - c.t * 30, 32, 30); ctx.globalAlpha = 1; }
  }
  for (const e of EN) if (vis(e)) {
    const h = e.type === 'drone' ? 58 : e.type === 'goon' ? 74 : 70;
    const cy = e.type === 'drone' ? e.y : e.y - h / 2 + (e.alive ? Math.abs(Math.sin(T * 8 + e.ph)) * -3 : 0);
    if (e.alive) {
      drawImgH(IMG[e.type], e.x, cy, h, e.dir > 0);
      if (state === 'play' && e.x - P.x > 60 && e.x - P.x < 300) comicText('!', e.x, cy - h / 2 - 16 + Math.sin(T * 10) * 3, 26, '#ffde3b');
    } else {
      const a = Math.max(0, 1 - e.wt / 1.2); drawImgH(IMG[e.type], e.x, cy, h, false, e.wt * 8, a);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.translate(e.x, cy); ctx.rotate(e.wt * 8);
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-h / 2, i * 12); ctx.lineTo(h / 2, i * 12 + 6); ctx.stroke(); }
      ctx.restore();
    }
  }
  for (const s of SH) {
    if (ward.acc === 'gauntlets') {
      ctx.fillStyle = 'rgba(127,246,255,.35)'; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7ff6ff'; ctx.lineWidth = 5; ctx.globalAlpha = 0.5; bolt(s.x - s.vx * 0.09, s.y - s.vy * 0.09, s.x, s.y, 18); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; bolt(s.x - s.vx * 0.09, s.y - s.vy * 0.09, s.x, s.y, 12); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, 7); ctx.fill();
    } else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.05, s.y - s.vy * 0.05); ctx.stroke(); }
  }
  drawAccTrail();
  drawPlayer();
  if (themed) drawWaterFront(cx, lvid);
  for (const f of FX) {
    if (f.web) { const a = 1 - f.t / f.life; ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(an) * 14, f.y + Math.sin(an) * 14); ctx.stroke(); } }
    else if (f.note) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.strokeText(f.note, f.x, f.y); ctx.fillStyle = f.col; ctx.fillText(f.note, f.x, f.y); ctx.globalAlpha = 1; }
    else if (f.star) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.translate(f.x, f.y); ctx.rotate(f.rot + f.t * 6); ctx.fillStyle = f.col; ctx.strokeStyle = '#140818'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, an = i * Math.PI / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    else if (f.spark) { ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.05 + (Math.random() - .5) * 6, f.y - f.vy * 0.05); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.puff) { const a = Math.max(0, 1 - f.t / f.life); ctx.globalAlpha = a; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + f.t * 14, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (!f.conf) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.col; ctx.fillRect(f.x - 3, f.y - 3, 6, 6); ctx.globalAlpha = 1; }
  }
  for (const t of TXT) { const s = Math.min(1, t.t * 6) * (t.big ? 1 : 0.8); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t.t - 0.6) * 2); comicText(t.text, t.x, t.y - t.t * 30, 24 * s + 1, t.col, t.rot); ctx.globalAlpha = 1; }
  ctx.restore();
  if (!themed) { const sg = ctx.createLinearGradient(0, H - 40, 0, H); sg.addColorStop(0, 'rgba(255,46,95,0)'); sg.addColorStop(1, 'rgba(255,46,95,0.45)');
  ctx.fillStyle = sg; ctx.fillRect(0, H - 40, W, 40); }
}
function webLine(x1, y1, x2, y2) {
  if (ward.acc === 'gauntlets') {
    ctx.strokeStyle = 'rgba(127,246,255,.45)'; ctx.lineWidth = 7; bolt(x1, y1, x2, y2, 14); ctx.stroke();
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2.5; bolt(x1, y1, x2, y2, 9); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,90,160,.35)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
  }
}
function muzzle(x, y) {
  const g = ward.acc === 'gauntlets', r = 12 + Math.random() * 6;
  ctx.fillStyle = g ? 'rgba(127,246,255,.45)' : 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(x, y, r + 8, 0, 7); ctx.fill();
  ctx.fillStyle = g ? '#ffd84a' : '#ffffff'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
}
function drawPlayer() {
  if (P.inv > 0 && Math.floor(T * 12) % 2 === 0 && state === 'play') return;
  const classic = curKey() === 'up-none' || !ok(avImg(curKey(), 'run'));
  const f = P.face < 0, fs = f ? -1 : 1; // facing left = horizontal mirror
  if (P.st === 'swing' && P.A) {
    const img = sprite('swing'), h = 112; if (!ok(img)) return;
    const w = img.naturalWidth * h / img.naturalHeight, hd = handOf('swing');
    const hx = (hd[0] - 0.5) * w * fs, hy = (hd[1] - 0.5) * h;
    const a0 = Math.atan2(hy, hx), a1 = Math.atan2(P.A.y - P.y, P.A.x - P.x), rot = a1 - a0;
    const c = Math.cos(rot), s = Math.sin(rot), handX = P.x + hx * c - hy * s, handY = P.y + hx * s + hy * c;
    webLine(handX, handY, P.A.x, P.A.y);
    drawImgH(img, P.x, P.y, h, f, rot);
  } else if (P.st === 'climb') {
    drawImgH(sprite('swing'), P.x, P.y - 8, 106, f, 0);
  } else if (P.punch > 0) {
    if (classic) drawImgH(IMG.river_zap, P.x + 4 * fs, P.y - 6, 92, f, 0);
    else { drawImgH(sprite('run'), P.x, P.y - 6, 94, f, -0.05 * fs); muzzle(P.x + 38 * fs, P.y - 16); }
    ctx.strokeStyle = ward.acc === 'gauntlets' ? '#7ff6ff' : '#ffde3b'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(P.x + 46 * fs, P.y - 30 + i * 9); ctx.lineTo(P.x + (62 + i * 4) * fs, P.y - 34 + i * 12); ctx.stroke(); }
  } else if (P.flip) {
    const k = Math.min(1, P.flipT / 0.45), rot = (1 - Math.pow(1 - k, 2)) * Math.PI * 2 * fs, img = sprite('jump');
    ctx.globalAlpha = 0.25; drawImgH(img, P.x - P.vx * 0.04, P.y - P.vy * 0.04, 84, f, rot - 0.6 * fs); ctx.globalAlpha = 1;
    drawImgH(img, P.x, P.y, 88 - Math.sin(k * Math.PI) * 10, f, rot);
  } else if (P.st === 'run' && Math.abs(P.vx) < 25) {
    // ready stance: standing still with a subtle breathing bob
    const br = Math.sin(T * 3.2), h = 96 + br * 1.6;
    drawImgH(sprite('run'), P.x, P.y - 8 - (h - 96) / 2, h, f, 0);
  } else if (P.st === 'run') {
    const stride = Math.sin(T * 13);
    drawImgH(sprite('run'), P.x, P.y - 8 - Math.abs(stride) * 4, 96, f, stride * 0.05);
  } else if (P.vy < -60 && P.jumping) {
    drawImgH(sprite('jump'), P.x, P.y - 6, 94, f, 0.05 * fs);
  } else {
    const rot = Math.max(-0.4, Math.min(0.45, Math.atan2(P.vy, Math.abs(P.vx) + 220) * 0.6)) * fs;
    if (classic) drawImgH(IMG.river_fly, P.x, P.y - 6, 94, f, rot);
    else drawImgH(sprite('jump'), P.x, P.y - 6, 92, f, rot + 0.22 * fs);
  }
  if (ward.acc === 'gauntlets' && state === 'play' && Math.random() < 0.5) { ctx.fillStyle = Math.random() < .5 ? '#7ff6ff' : '#ffd84a'; ctx.beginPath(); ctx.arc(P.x + (30 + (Math.random() - .5) * 20) * fs, P.y - 4 + (Math.random() - .5) * 26, 2 + Math.random() * 2, 0, 7); ctx.fill(); }
}
// ---------- UI ----------
// v4 controls: ◀ ▶ thumb pad bottom-left; JUMP / SWING / ZAP cluster bottom-right
const PADL = () => ({ x: 12, y: H - 122, w: 74, h: 96 });
const PADR = () => ({ x: 94, y: H - 122, w: 74, h: 96 });
const JUMPB = () => ({ x: W - 64, y: H - 76, r: 44 });
const SWINGB = () => ({ x: W - 160, y: H - 62, r: 36 });
const ZAPB = () => ({ x: W - 84, y: H - 182, r: 36 });
const padRole = p => p.x < 90 ? 'left' : 'right';
const MUTE = () => ({ x: W - 30, y: 30, r: 22 });
function btn(x, y, w, h, label, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.03);
  ctx.fillStyle = '#140818'; ctx.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
  ctx.fillStyle = col || '#ff2e5f'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore(); comicText(label, x, y, 30, '#ffffff', -0.03);
}
function roundBtn(b, fill, ring, pressed) {
  const r = b.r * (pressed ? 0.93 : 1);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(b.x + 3, b.y + 5, r, 0, 7); ctx.fill();
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#140818'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.beginPath(); ctx.arc(b.x, b.y, r - 7, 0, 7); ctx.stroke();
}
function drawMute() { const m = MUTE(); ctx.fillStyle = 'rgba(20,8,24,.6)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(muted ? '🔇' : '🔊', m.x, m.y + 1); }
function drawHUD() {
  avatarBadge(28, 30, 22);
  comicText(String(stats.score), 86, 30, 22, '#ffde3b');
  for (let i = 0; i < P.hearts; i++) ctx.drawImage(HEART, 128 + i * 26, 18, 24, 22);
  ctx.drawImage(TOKEN, 6, 50, 30, 30); comicText('×' + stats.tokens, 54, 65, 16, '#ffffff');
  comicText('SAVED ' + stats.saved + '/' + RESCUE_GOAL, 158, 65, 15, '#7be0ff');
  ctx.drawImage(PAGE, 226, 48, 28, 33); comicText(stats.pages + '/6', 270, 65, 15, '#d9a6ff');
  const px = 20, pw = W - 80, py = 92, prog = Math.max(0, Math.min(1, P.x / finishX));
  ctx.fillStyle = 'rgba(20,8,24,.7)'; ctx.fillRect(px, py, pw, 8); ctx.fillStyle = LEVELS[curLv].col; ctx.fillRect(px, py, pw * prog, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(px + pw - 2, py - 4, 4, 16);
  { const pi = portraitImg(); ctx.save(); ctx.beginPath(); ctx.arc(px + pw * prog, py + 4, 11, 0, 7); ctx.clip(); if (ok(pi)) ctx.drawImage(pi, px + pw * prog - 11, py - 7, 22, 22); ctx.restore(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + pw * prog, py + 4, 11, 0, 7); ctx.stroke(); }
  drawMute(); drawPauseBtn(); worldPill();
  const nc = CIV.find(c => !c.saved && c.x > P.x - 50);
  // HELP arrow only while the person is fully off-screen, inset & lifted so it never sits on top of them
  const bc = CIV.filter(c => !c.saved && c.x - camX < -34 && P.x - c.x < 900).pop();
  if (bc) { const y = Math.max(150, Math.min(H - 320, bc.y - 120)); ctx.fillStyle = '#ffde3b'; ctx.strokeStyle = '#140818'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(34, y - 14); ctx.lineTo(34, y + 14); ctx.closePath(); ctx.stroke(); ctx.fill(); comicText('HELP', 60, y, 13, '#ffde3b'); }
  if (nc && nc.x - camX > W + 34 && nc.x - P.x < 1200) { const y = Math.max(150, Math.min(H - 320, nc.y - 120)); ctx.fillStyle = '#ffde3b'; ctx.strokeStyle = '#140818'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W - 14, y); ctx.lineTo(W - 34, y - 14); ctx.lineTo(W - 34, y + 14); ctx.closePath(); ctx.stroke(); ctx.fill(); comicText('HELP', W - 60, y, 13, '#ffde3b'); }
  const roles = [...ptrs.values()], md = moveDir();
  // ◀ ▶ pad
  for (const [b, d] of [[PADL(), -1], [PADR(), 1]]) {
    const on = md === d;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(b.x + 3, b.y + 5, b.w, b.h, 18); ctx.fill();
    const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, on ? '#ffffff' : '#ffde3b'); g.addColorStop(1, on ? '#ffe98a' : '#ff9f1c');
    ctx.fillStyle = g; rrect(b.x, b.y + (on ? 3 : 0), b.w, b.h, 18); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.stroke();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + (on ? 3 : 0);
    ctx.fillStyle = '#ff2e5f'; ctx.beginPath(); ctx.moveTo(cx + d * 20, cy); ctx.lineTo(cx - d * 14, cy - 22); ctx.lineTo(cx - d * 14, cy + 22); ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.stroke();
  }
  // JUMP
  const j = JUMPB(); roundBtn(j, '#2f9bff', '#cfe9ff', roles.includes('jump') || input.jumpHeld);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#140818'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(j.x, j.y - 26); ctx.lineTo(j.x - 16, j.y - 6); ctx.lineTo(j.x - 6, j.y - 6); ctx.lineTo(j.x - 6, j.y + 6); ctx.lineTo(j.x + 6, j.y + 6); ctx.lineTo(j.x + 6, j.y - 6); ctx.lineTo(j.x + 16, j.y - 6); ctx.closePath(); ctx.stroke(); ctx.fill();
  comicText('JUMP', j.x, j.y + 22, 14, '#ffffff');
  if (P.st !== 'run' && P.canDouble && P.st !== 'swing') { ctx.fillStyle = '#ffde3b'; ctx.beginPath(); ctx.arc(j.x - 32, j.y - 30, 7, 0, 7); ctx.fill(); ctx.strokeStyle = '#140818'; ctx.lineWidth = 2; ctx.stroke(); }
  // SWING
  const s = SWINGB(); roundBtn(s, swingHeld() ? '#ffffff' : '#b28cff', '#7a5cff', swingHeld());
  ctx.strokeStyle = '#140818'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(s.x, s.y - 7); ctx.lineTo(s.x + Math.cos(a) * 15, s.y - 7 + Math.sin(a) * 15); ctx.stroke(); }
  for (const rr of [6, 12]) { ctx.beginPath(); ctx.arc(s.x, s.y - 7, rr, 0, 7); ctx.stroke(); }
  comicText('SWING', s.x, s.y + 19, 11, '#ffffff');
  // ZAP
  const z = ZAPB(); roundBtn(z, P.zapCD > 0 ? '#8a1a3a' : '#ff2e5f', '#ffd1e0', roles.includes('zap'));
  spiderGlyph(ctx, z.x, z.y - 7, 26, '#140818'); comicText('ZAP', z.x, z.y + 19, 12, '#ffffff');
  if (hintT > 0) {
    ctx.globalAlpha = Math.min(1, hintT * 2); const y = 150 + Math.sin(T * 4) * 3;
    comicText('◀ ▶ to run  ·  JUMP  ·  hold to SWING', W / 2, y, 16, '#ffffff'); ctx.globalAlpha = 1;
  }
}
function avatarBadge(x, y, r) {
  const pi = portraitImg();
  ctx.fillStyle = '#140818'; ctx.beginPath(); ctx.arc(x + 2, y + 3, r + 3, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.fillStyle = '#ff2e5f'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  if (ok(pi)) ctx.drawImage(pi, x - r, y - r, 2 * r, 2 * r); ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = '#ffde3b'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
}
function portraitBurst(cx, cy, r, img, spin, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(T * spin); ctx.fillStyle = col || '#ff2e5f'; ctx.beginPath();
  for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, rr = i % 2 ? r * 1.12 : r * 1.3; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip(); ctx.fillStyle = '#2a0d3a'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  if (ok(img)) ctx.drawImage(img, cx - r, cy - r, 2 * r, 2 * r);
  ctx.fillStyle = halfPat; ctx.globalAlpha = 0.18; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); ctx.globalAlpha = 1; ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = '#140818'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
}
function gearBadge(x, y) { // pulsing NEW GEAR! sticker on the SUIT UP! button
  x = Math.min(x, W - 50); const s = 1 + Math.sin(T * 7) * 0.08; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(0.12);
  ctx.fillStyle = '#ffde3b'; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? 22 : 30; ctx.lineTo(Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 0.8); } ctx.closePath(); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.stroke(); ctx.restore();
  comicText('NEW GEAR!', x, y, 12 * s, '#ff2e5f', 0.12);
}
function suitBtn(x, y, w, h) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.02);
  ctx.fillStyle = '#140818'; ctx.fillRect(-w / 2 + 5, -h / 2 + 6, w, h);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#2f9bff'); g.addColorStop(1, '#9b2cff');
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
  comicText('SUIT UP!', x, y, Math.min(26, w / 7), '#ffffff', 0.02);
  if (newGear()) gearBadge(x + w / 2 - 6, y - h / 2 - 6);
}
// ---------- v5: per-level music (soft procedural chiptune) ----------
const mus = { on: false, id: null, next: 0, step: 0 };
const MUS = {
  neon: { beat: 0.23, play(s, d) { const bass = [110, 110, 130.8, 98][(s >> 3) % 4]; if (s % 2 === 0) tone(bass, 0.2, 'square', 0.022, 1, d); const arp = [440, 523, 659, 523, 440, 587, 698, 587][s % 8] * ((s >> 4) % 2 ? 0.89 : 1); tone(arp, 0.1, 'square', 0.012, 1, d); if (s % 4 === 2) noise(0.04, 0.03, 7000, 5000, d); } },
  ketchikan: { beat: 0.29, play(s, d) { const mel = [523, 587, 659, 784, 659, 587, 523, 440, 392, 440, 523, 587, 659, 587, 523, 0][s % 16]; if (mel) tone(mel, 0.26, 'triangle', 0.03, 1, d); if (s % 4 === 0) tone([131, 98, 110, 87][(s >> 2) % 4], 0.5, 'triangle', 0.04, 1, d); if (s % 8 === 4) tone(1568, 0.4, 'sine', 0.012, 1, d); } },
  jungle: { beat: 0.25, play(s, d) { const m = [392, 494, 587, 494, 659, 587, 494, 440, 392, 330, 392, 494, 587, 659, 784, 659][s % 16]; tone(m, 0.13, 'sine', 0.05, 1, d); tone(m * 2, 0.06, 'sine', 0.012, 1, d); if ([1, 0, 1, 1, 0, 1, 0, 1][s % 8]) noise(0.05, 0.07, s % 2 ? 500 : 900, 300, d); if (s % 8 === 0) tone(98, 0.3, 'triangle', 0.05, 1, d); } },
};
function musicStart(id) { mus.on = true; mus.id = id; mus.step = 0; mus.next = AC ? AC.currentTime + 0.15 : 0; }
function musicStop() { mus.on = false; }
function musicTick() {
  if (!mus.on || muted || !AC || AC.state !== 'running') return;
  const m = MUS[mus.id]; if (!m) return;
  if (mus.next < AC.currentTime - 0.1) mus.next = AC.currentTime + 0.05; // after a pause/hidden tab: don't burst-catch-up
  while (mus.next < AC.currentTime + 0.3) { m.play(mus.step, mus.next - AC.currentTime); mus.next += m.beat; mus.step++; }
}
// ---------- v5: level store ----------
let lvStore = loadLv();
function saveLv() { try { localStorage.setItem(LV_KEY, JSON.stringify(lvStore)); } catch (e) { } }
function checkSection() {
  let idx = -1; for (let i = 0; i < SECTIONS.length; i++) if (P.x >= SECTIONS[i].x0 + 40) idx = i;
  if (idx > secShown) { secShown = idx; secMsg = { text: SECTIONS[idx].toast, t0: T }; }
}
const PAUSEB = () => ({ x: W - 80, y: 30, r: 22 });
function drawPauseBtn() { const p = PAUSEB(); ctx.fillStyle = 'rgba(20,8,24,.6)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 7, p.y - 9, 5, 18); ctx.fillRect(p.x + 2, p.y - 9, 5, 18); }
function worldPill() {
  const lv = LEVELS[curLv], text = 'WORLD ' + (curLv + 1) + ' · ' + lv.name.toUpperCase();
  ctx.font = '900 13px "Arial Black", Impact, sans-serif'; const w = ctx.measureText(text).width + 28, x = W / 2 - w / 2, y = 108;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rrect(x + 2, y + 3, w, 24, 12); ctx.fill();
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, lv.col); g.addColorStop(1, lv.col2); ctx.fillStyle = g; rrect(x, y, w, 24, 12); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, W / 2, y + 13);
  if (secMsg) { const k = T - secMsg.t0; if (k > 2.6) secMsg = null; else { const s = Math.min(1, k * 5), a = Math.min(1, (2.6 - k) * 2.5); ctx.globalAlpha = a; ctx.save(); ctx.translate(W / 2, 196); ctx.rotate(-0.04); ctx.scale(s, s); ctx.fillStyle = '#140818'; ctx.fillRect(-170 + 5, -24 + 5, 340, 48); ctx.fillStyle = lv.col; ctx.fillRect(-170, -24, 340, 48); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.strokeRect(-170, -24, 340, 48); ctx.restore(); comicText(secMsg.text, W / 2, 196, Math.min(24, 470 / secMsg.text.length), '#ffffff', -0.04); ctx.globalAlpha = 1; } }
}
function cardThumb(i, x, y, w, h) {
  ctx.save(); rrect(x, y, w, h, 10); ctx.clip();
  const id = LEVELS[i].id, img = id === 'ketchikan' ? LI('ket_bg') : id === 'jungle' ? LI('jun_bg') : null;
  if (img) { const sw = img.naturalWidth * 0.5, sh = sw * h / w, sx = id === 'jungle' ? img.naturalWidth * 0.585 - sw / 2 : img.naturalWidth * 0.3; ctx.drawImage(img, sx, id === 'jungle' ? img.naturalHeight * 0.08 : img.naturalHeight * 0.12, sw, sh, x, y, w, h); }
  else if (id === 'neon') {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#12052a'); g.addColorStop(0.6, '#5a1460'); g.addColorStop(1, '#ff2e6d'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffd6ea'; ctx.beginPath(); ctx.arc(x + w * 0.75, y + 18, 10, 0, 7); ctx.fill(); const rr = mulberry(5);
    for (let bx = x - 4; bx < x + w; bx += 14 + rr() * 10) { const bh = 20 + rr() * 40; ctx.fillStyle = '#1a0a2e'; ctx.fillRect(bx, y + h - bh, 14, bh); ctx.fillStyle = rr() < .5 ? '#ffd27a' : '#7be0ff'; for (let wy = y + h - bh + 5; wy < y + h - 4; wy += 9) if (rr() < .5) ctx.fillRect(bx + 4, wy, 3, 4); }
  } else { ctx.fillStyle = LEVELS[i].col; ctx.fillRect(x, y, w, h); }
  ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; rrect(x, y, w, h, 10); ctx.stroke();
}
function titleLayout() {
  const cx = W / 2, r = Math.min(96, H * 0.105), cy = r * 1.3 + 14, ty = cy + r * 1.3 + 28;
  const cw = Math.min(122, (W - 28) / 3), ch = Math.min(170, Math.max(150, H * 0.2)), gap = 7, x0 = cx - (3 * cw + 2 * gap) / 2, cardY = ty + 82;
  const cards = LEVELS.map((lv, i) => ({ i, x: x0 + i * (cw + gap), y: cardY, w: cw, h: ch }));
  const suit = { x: cx - 100, y: cardY + ch + 18, w: 200, h: 50 };
  return { cx, cy, r, ty, cards, suit, play: cards[0] };
}
function drawTitle() {
  camX += 1; drawSky(camX);
  ctx.fillStyle = 'rgba(10,3,20,.38)'; ctx.fillRect(0, 0, W, H);
  const L = titleLayout(), cx = L.cx, ty = L.ty;
  portraitBurst(cx, L.cy, L.r, portraitImg(), 0.15);
  comicText(HERO_NAME.toUpperCase(), cx, ty, Math.min(48, 600 / HERO_NAME.length), '#ff2e5f', -0.04);
  comicText('starring ' + KID_NAME.toUpperCase() + '!', cx, ty + 34, 17, '#ffde3b', -0.04);
  comicText('PICK A WORLD!', cx, L.cards[0].y - 20, 20 + Math.sin(T * 4) * 1.2, '#7be0ff', -0.03);
  for (const c of L.cards) {
    const lv = LEVELS[c.i], st = lvStore[lv.id], bob = Math.sin(T * 3 + c.i * 1.4) * 2, y = c.y + bob;
    ctx.fillStyle = '#140818'; rrect(c.x + 4, y + 5, c.w, c.h, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, y, 0, y + c.h); g.addColorStop(0, lv.col); g.addColorStop(1, lv.col2); ctx.fillStyle = g; rrect(c.x, y, c.w, c.h, 14); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.stroke();
    const by = y + c.h - 19, py = by - 27, ny = py - 38; cardThumb(c.i, c.x + 6, y + 22, c.w - 12, ny - 14 - (y + 22));
    ctx.font = '900 11px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('LEVEL ' + (c.i + 1), c.x + c.w / 2, y + 12);
    comicText(lv.card[0], c.x + c.w / 2, ny, lv.card[0].length > 7 ? 14 : 17, '#ffffff'); comicText(lv.card[1], c.x + c.w / 2, ny + 18, 13, '#ffde3b');
    ctx.drawImage(PAGE, c.x + c.w / 2 - 34, py - 11, 18, 21); comicText(st.pages + '/6', c.x + c.w / 2 + 6, py, 14, st.pages >= 6 ? '#7dff8a' : '#ffffff');
    if (st.done) { ctx.fillStyle = '#7dff8a'; ctx.beginPath(); ctx.arc(c.x + c.w - 10, y + 10, 13, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.stroke(); comicText('✓', c.x + c.w - 10, y + 11, 15, '#140818'); }
    ctx.fillStyle = '#140818'; rrect(c.x + 10, by - 12, c.w - 20, 26, 9); ctx.fill(); ctx.fillStyle = '#ffde3b'; rrect(c.x + 10, by - 14, c.w - 20, 26, 9); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#140818'; ctx.stroke();
    ctx.font = '900 14px "Arial Black", Impact, sans-serif'; ctx.fillStyle = '#140818'; ctx.fillText('▶ PLAY', c.x + c.w / 2, by - 1);
  }
  suitBtn(cx, L.suit.y + L.suit.h / 2, L.suit.w, L.suit.h);
  ctx.font = 'bold 13px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3e6ff'; ctx.textBaseline = 'alphabetic';
  const lines = ['◀ ▶ run left or right, stop or turn back anytime!', 'JUMP: hold = higher, tap again in the air = FLIP!', 'HOLD up top (or SWING) to web-swing either way.', 'ZAP bad guys, save ' + RESCUE_GOAL + ' people, grab 6 comic pages!', 'Spend tokens & pages on new gear in SUIT UP!'];
  const ly = L.suit.y + L.suit.h + 26, room = H - ly - 30, lh = 17, n = Math.max(2, Math.min(5, Math.floor(room / lh)));
  lines.slice(0, n).forEach((l, i) => ctx.fillText(l, cx, ly + i * lh));
  comicText(best > 0 ? 'BEST: ' + best : 'BEST: 0  ·  BRAND-NEW GAME!', cx, Math.min(H - 14, ly + n * lh + 8), 15, '#7be0ff');
  ctx.save(); ctx.translate(36, 34); ctx.rotate(-0.12); ctx.fillStyle = '#ffde3b'; ctx.fillRect(-24, -13, 48, 26); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.strokeRect(-24, -13, 48, 26); ctx.restore();
  comicText('v' + VERSION, 36, 34, 16, '#ff2e5f', -0.12);
  drawMute();
}
function endLayout() {
  const win = state === 'win', compact = H < 780, cy = H * (compact ? 0.15 : 0.16);
  const row = { y: H - (compact ? 62 : 74), h: compact ? 46 : 52 }, bw = (W - 40) / 3;
  const big = { x: W / 2 - 140, y: row.y - (compact ? 66 : 76), w: 280, h: compact ? 56 : 62 };
  const y0 = cy + (win ? (compact ? 214 : 246) : (compact ? 180 : 204));
  return { cy, y0, compact, big, next: big, again: win ? { x: 14, y: row.y, w: bw, h: row.h } : big, suit: { x: 20 + bw, y: row.y, w: bw, h: row.h }, levels: { x: 26 + 2 * bw, y: row.y, w: bw, h: row.h }, retry: { x: 14, y: row.y, w: bw, h: row.h } };
}
function smallBtn(r, label, col) { ctx.fillStyle = '#140818'; rrect(r.x + 4, r.y + 5, r.w, r.h, 12); ctx.fill(); ctx.fillStyle = col; rrect(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#140818'; ctx.stroke(); comicText(label, r.x + r.w / 2, r.y + r.h / 2, Math.min(17, r.w / (label.length * 0.62)), '#ffffff'); }
function drawEnd() {
  drawWorld();
  ctx.fillStyle = 'rgba(12,4,24,.72)'; ctx.fillRect(0, 0, W, H);
  for (const f of FX) if (f.conf) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.col; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
  const win = state === 'win', L = endLayout(), cy = L.cy, s = Math.min(1, endT * 3), lv = LEVELS[curLv], last = curLv === LEVELS.length - 1;
  const pr = (L.compact ? 54 : 64) * s;
  { const pi = portraitImg(); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, pr, 0, 7); ctx.clip(); if (ok(pi)) ctx.drawImage(pi, W / 2 - pr, cy - pr, 2 * pr, 2 * pr); ctx.restore(); ctx.lineWidth = 5; ctx.strokeStyle = win ? '#ffde3b' : '#ff2e5f'; ctx.beginPath(); ctx.arc(W / 2, cy, pr, 0, 7); ctx.stroke(); }
  const d = L.compact ? 0.86 : 1;
  if (win) { comicText('YOU SAVED', W / 2, cy + 98 * d, 36 * s * d + 1, '#ffde3b', -0.05); comicText(lv.winB, W / 2, cy + 138 * d, Math.min(36, 470 / lv.winB.length) * s * d + 1, '#ffde3b', -0.05); comicText(KID_NAME.toUpperCase() + '!', W / 2, cy + 184 * d, 48 * s * d + 1, '#ff2e5f', -0.05); }
  else { comicText('NICE TRY, HERO!', W / 2, cy + 104 * d, 34 * s + 1, '#ff2e5f', -0.04); comicText(lv.saveLine, W / 2, cy + 142 * d, 18, '#ffffff'); }
  const y0 = L.y0, rs = L.compact ? 21 : 26;
  const rows = [['SCORE', stats.score], ['PEOPLE SAVED', stats.saved + ' / ' + RESCUE_GOAL], ['COMIC PAGES', stats.pages + ' / ' + PAGES.length], ['SPIDER TOKENS', stats.tokens], ['BAD GUYS WEBBED', stats.beaten]];
  rows.forEach((r, i) => { ctx.font = '900 15px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#d9c7ff'; ctx.fillText(r[0], 60, y0 + i * rs); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(String(r[1]), W - 60, y0 + i * rs); });
  const by = y0 + 5 * rs + 14;
  if (bankMsg) {
    const k = Math.min(1, Math.max(0, endT - 0.4) * 3);
    ctx.globalAlpha = k; ctx.drawImage(TOKEN, W / 2 - 150, by - 14, 26, 26); comicText('+' + bankMsg.t + ' Tokens', W / 2 - 72, by, 19, '#ffde3b', -0.03);
    ctx.drawImage(PAGE, W / 2 + 18, by - 15, 24, 29); comicText('+' + bankMsg.p + ' Pages', W / 2 + 92, by, 19, '#d9a6ff', -0.03);
    ctx.font = 'bold 12px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#f3e6ff'; ctx.fillText('saved to your stash  (' + ward.tokens + ' tokens · ' + ward.pages + ' pages)', W / 2, by + 22); ctx.globalAlpha = 1;
  }
  const hy = Math.min(by + 48, L.big.y - 18);
  if (win && last && LEVELS.every(l => lvStore[l.id].done)) comicText('ALL 3 WORLDS SAVED!', W / 2, hy, 20 + Math.sin(T * 8) * 1.5, '#7dff8a', -0.05);
  else if (newBest) comicText('NEW HIGH SCORE!', W / 2, hy, 22 + Math.sin(T * 8) * 2, '#7be0ff', -0.05);
  else comicText('BEST: ' + best, W / 2, hy, 17, '#7be0ff');
  if (endT > 1) {
    const b = L.big, pulse = 1 + Math.sin(T * 6) * 0.03;
    ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(pulse, pulse); ctx.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
    smallBtn(b, '', win ? '#2fbf4a' : '#ff2e5f'); ctx.restore();
    comicText(win ? (last ? 'LEVEL 1 ▶' : 'NEXT LEVEL ▶') : 'TRY AGAIN ▶', b.x + b.w / 2, b.y + b.h / 2, 28, '#ffffff', -0.03);
    if (win) smallBtn(L.again, 'REPLAY', '#9b2cff');
    else smallBtn(L.retry, 'LEVELS', '#ff9f1c');
    { const su = L.suit; suitBtn(su.x + su.w / 2, su.y + su.h / 2, su.w, su.h); }
    if (win) smallBtn(L.levels, 'LEVELS', '#ff9f1c');
    else smallBtn(L.levels, 'NEXT ▶', '#2f9bff');
  }
  drawMute();
}
function pauseLayout() { const cx = W / 2, y = H * 0.34; return { resume: { x: cx - 120, y: y + 30, w: 240, h: 60 }, restart: { x: cx - 120, y: y + 106, w: 240, h: 52 }, levels: { x: cx - 120, y: y + 174, w: 240, h: 52 } }; }
function drawPause() {
  drawWorld(); ctx.fillStyle = 'rgba(12,4,24,.7)'; ctx.fillRect(0, 0, W, H);
  const L = pauseLayout(); comicText('PAUSED', W / 2, H * 0.34 - 20, 44, '#ffde3b', -0.04); comicText('WORLD ' + (curLv + 1) + ': ' + LEVELS[curLv].name.toUpperCase(), W / 2, H * 0.34 + 10, 15, '#ffffff');
  smallBtn(L.resume, '▶ RESUME', '#2fbf4a'); smallBtn(L.restart, '↺ RESTART', '#9b2cff'); smallBtn(L.levels, 'PICK A WORLD', '#ff9f1c');
  drawMute();
}
function startLevel(i) { curLv = ((i % LEVELS.length) + LEVELS.length) % LEVELS.length; SFX.click(); newGame(); }
function toTitle() { state = 'title'; musicStop(); ptrs.clear(); keyL = keyR = keySwing = false; FX = []; TXT = []; }
function endTap(p) {
  const L = endLayout(), win = state === 'win';
  if (inR(p, L.big)) { if (win) startLevel(curLv + 1); else startLevel(curLv); return; }
  if (inR(p, L.suit)) { SFX.click(); musicStop(); openSuit(); return; }
  if (win) { if (inR(p, L.again)) startLevel(curLv); else if (inR(p, L.levels)) { SFX.click(); toTitle(); } }
  else { if (inR(p, L.retry)) { SFX.click(); toTitle(); } else if (inR(p, L.levels)) startLevel(curLv + 1); }
}
function pauseTap(p) { const L = pauseLayout(); if (inR(p, L.resume)) { state = 'play'; input.block = true; SFX.click(); } else if (inR(p, L.restart)) startLevel(curLv); else if (inR(p, L.levels)) { SFX.click(); toTitle(); } }
function pauseGame() { if (state !== 'play') return; state = 'pause'; ptrs.clear(); keyL = keyR = keySwing = false; input.jumpHeld = false; SFX.click(); }
// ---------- SUIT UP! screen ----------
function suitLayout() {
  const cardW = 116, cardH = Math.min(150, Math.max(118, (H - 520) / 2)), gap = 8, x0 = (W - (3 * cardW + 2 * gap)) / 2;
  const gridTop = H - 2 * cardH - gap - 40;
  const cards = ACCS.map((a, i) => ({ a, x: x0 + (i % 3) * (cardW + gap), y: gridTop + Math.floor(i / 3) * (cardH + gap), w: cardW, h: cardH }));
  const maskY = gridTop - 62, masks = MASKS.map((m, i) => ({ m, x: x0 + i * (cardW + gap), y: maskY, w: cardW, h: 50 }));
  const act = { x: W / 2 - 115, y: maskY - 60, w: 230, h: 48 };
  const pr = Math.max(54, Math.min(100, (act.y - 40 - 64) / 2 / 1.3 - 4));
  const mw = W - 40, mh = 250, my = H / 2 - mh / 2;
  return { reset: { x: W / 2 - 66, y: H - 32, w: 132, h: 26 }, modal: { x: 20, y: my, w: mw, h: mh }, cancel: { x: 34, y: my + mh - 82, w: (mw - 42) / 2, h: 62 }, yes: { x: 34 + (mw - 42) / 2 + 14, y: my + mh - 82, w: (mw - 42) / 2, h: 62 }, cards, masks, act, back: { x: 8, y: 10, w: 98, h: 42 }, pc: { x: W / 2, y: 64 + pr * 1.3, r: pr }, nameY: act.y - 22 };
}
function openSuit() {
  state = 'suit'; suitModal = false; suitAcc = ward.acc; FX = []; TXT = []; ptrs.clear(); keySwing = false;
  for (const a of ACCS) avImg(comboKey(ward.mask, a.id), 'p');
  for (const m of MASKS) avImg(comboKey(m.id, ward.acc), 'p');
}
function closeSuit() { state = 'title'; FX = []; TXT = []; preloadCombo(curKey()); }
function costText(a) { return [a.t ? a.t + ' TOKENS' : '', a.p ? a.p + (a.p === 1 ? ' PAGE' : ' PAGES') : ''].filter(Boolean).join(' + '); }
function drawCost(cx, y, a, glow) {
  const parts = []; if (a.t) parts.push([TOKEN, a.t]); if (a.p) parts.push([PAGE, a.p]);
  ctx.font = '900 15px "Arial Black", Impact, sans-serif'; const widths = parts.map(p => 20 + ctx.measureText(String(p[1])).width + 4);
  let x = cx - (widths.reduce((s, w) => s + w, 0) + (parts.length - 1) * 8) / 2;
  parts.forEach((p, i) => { ctx.drawImage(p[0], x, y - 10, 20, p[0] === PAGE ? 22 : 20); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.strokeText(String(p[1]), x + 22, y + 1); ctx.fillStyle = glow ? '#ffde3b' : '#a99bb8'; ctx.fillText(String(p[1]), x + 22, y + 1); x += widths[i] + 8; });
}
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawSuit() {
  camX += 0.5; drawSky(camX);
  ctx.fillStyle = 'rgba(10,3,20,.55)'; ctx.fillRect(0, 0, W, H);
  const L = suitLayout(), a = accById(suitAcc), owned = ward.unlocked.includes(a.id);
  // top bar
  const b = L.back; ctx.fillStyle = '#140818'; rrect(b.x + 3, b.y + 4, b.w, b.h, 10); ctx.fill(); ctx.fillStyle = '#ff2e5f'; rrect(b.x, b.y, b.w, b.h, 10); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.stroke();
  comicText('← BACK', b.x + b.w / 2, b.y + b.h / 2 + 1, 16, '#ffffff');
  ctx.fillStyle = 'rgba(20,8,24,.75)'; rrect(W - 158, 12, 150, 38, 19); ctx.fill();
  ctx.drawImage(TOKEN, W - 154, 16, 30, 30); comicText(String(ward.tokens), W - 103, 32, 17, '#ffde3b');
  ctx.drawImage(PAGE, W - 72, 15, 26, 31); comicText(String(ward.pages), W - 30, 32, 17, '#d9a6ff');
  comicText('SUIT UP!', W / 2 - 6, 31, 21, '#ffde3b', -0.05);
  // big preview
  const pk = comboKey(ward.mask, suitAcc), pimg = avImg(pk, 'p');
  portraitBurst(L.pc.x, L.pc.y, L.pc.r, ok(pimg) ? pimg : portraitImg(), 0.12, owned ? '#ff2e5f' : '#7a5cff');
  if (!owned) { ctx.save(); ctx.translate(L.pc.x + L.pc.r * 0.78, L.pc.y - L.pc.r * 0.78); ctx.rotate(0.2); ctx.fillStyle = '#ffde3b'; ctx.fillRect(-42, -13, 84, 26); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.strokeRect(-42, -13, 84, 26); ctx.restore(); comicText('PREVIEW', L.pc.x + L.pc.r * 0.78, L.pc.y - L.pc.r * 0.78, 14, '#ff2e5f', 0.2); }
  comicText(a.name.toUpperCase(), W / 2, L.nameY, 20, owned ? '#ffffff' : '#c9b8ff', -0.03);
  // action row
  const ac2 = L.act;
  if (!owned) {
    if (affordable(a)) {
      const pulse = 1 + Math.sin(T * 6) * 0.05; ctx.save(); ctx.translate(ac2.x + ac2.w / 2, ac2.y + ac2.h / 2); ctx.scale(pulse, pulse);
      ctx.shadowColor = '#ffde3b'; ctx.shadowBlur = 22; ctx.fillStyle = '#ffde3b'; rrect(-ac2.w / 2, -ac2.h / 2, ac2.w, ac2.h, 14); ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = '#140818'; ctx.stroke(); ctx.restore();
      comicText('UNLOCK!', ac2.x + 62, ac2.y + ac2.h / 2 + 1, 20, '#ff2e5f'); drawCost(ac2.x + 160, ac2.y + ac2.h / 2, a, true);
    } else {
      const nt = Math.max(0, a.t - ward.tokens), np = Math.max(0, a.p - ward.pages);
      const msg = 'NEED ' + [nt ? nt + ' MORE TOKENS' : '', np ? np + ' MORE ' + (np === 1 ? 'PAGE' : 'PAGES') : ''].filter(Boolean).join(' + ') + '...';
      ctx.fillStyle = 'rgba(20,8,24,.8)'; rrect(12, ac2.y + 4, W - 24, 40, 12); ctx.fill();
      comicText(msg, W / 2, ac2.y + ac2.h / 2 + 1, msg.length > 34 ? 13 : 15, '#ffb3c8');
    }
  } else {
    comicText(ward.acc === a.id ? '✓ WEARING IT!' : 'OWNED', W / 2, ac2.y + ac2.h / 2 + 1, 18, '#7dff8a');
  }
  // masks
  for (const m of L.masks) {
    const on = ward.mask === m.m.id; ctx.fillStyle = on ? '#ff2e5f' : 'rgba(40,18,60,.9)'; rrect(m.x, m.y, m.w, m.h, 12); ctx.fill(); ctx.lineWidth = on ? 4 : 2; ctx.strokeStyle = on ? '#ffde3b' : '#140818'; ctx.stroke();
    const mi = avImg(comboKey(m.m.id, suitAcc), 'p'); ctx.save(); ctx.beginPath(); ctx.arc(m.x + 24, m.y + m.h / 2, 18, 0, 7); ctx.clip(); ctx.fillStyle = '#2a0d3a'; ctx.fillRect(m.x, m.y, 48, m.h); if (ok(mi)) ctx.drawImage(mi, m.x + 6, m.y + m.h / 2 - 18, 36, 36); ctx.restore();
    comicText(m.m.name, m.x + 78, m.y + m.h / 2 + 1, m.m.name.length > 7 ? 11 : 12, '#ffffff');
  }
  // accessory cards
  for (const c of L.cards) {
    const own = ward.unlocked.includes(c.a.id), worn = ward.acc === c.a.id, sel = suitAcc === c.a.id, can = !own && affordable(c.a);
    if (can) { ctx.shadowColor = '#ffde3b'; ctx.shadowBlur = 10 + Math.sin(T * 6) * 6; }
    ctx.fillStyle = worn ? '#3b1460' : own ? 'rgba(46,22,70,.95)' : 'rgba(26,12,38,.95)'; rrect(c.x, c.y, c.w, c.h, 14); ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = sel ? 4 : 2; ctx.strokeStyle = sel ? '#ffde3b' : can ? '#ffde3b' : worn ? '#7dff8a' : '#140818'; ctx.stroke();
    const ir = Math.min(34, c.h * 0.24), icx = c.x + c.w / 2, icy = c.y + 10 + ir, ci = avImg(comboKey(ward.mask, c.a.id), 'p');
    ctx.save(); ctx.beginPath(); ctx.arc(icx, icy, ir, 0, 7); ctx.clip(); ctx.fillStyle = '#2a0d3a'; ctx.fillRect(icx - ir, icy - ir, 2 * ir, 2 * ir); if (ok(ci)) ctx.drawImage(ci, icx - ir, icy - ir, 2 * ir, 2 * ir);
    if (!own) { ctx.fillStyle = 'rgba(20,8,30,.45)'; ctx.fillRect(icx - ir, icy - ir, 2 * ir, 2 * ir); } ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = worn ? '#7dff8a' : '#140818'; ctx.beginPath(); ctx.arc(icx, icy, ir, 0, 7); ctx.stroke();
    if (!own) comicText('🔒', icx + ir * 0.75, icy + ir * 0.7, 15, '#ffffff');
    const words = c.a.name.toUpperCase().split(' ');
    words.forEach((w, i) => comicText(w, icx, icy + ir + 14 + i * 15, 13, own ? '#ffffff' : '#c9b8ff'));
    const sy = c.y + c.h - 16;
    if (worn) comicText('WORN', icx, sy, 15, '#7dff8a'); else if (own) comicText('OWNED', icx, sy, 14, '#7be0ff');
    else if (c.a.t || c.a.p) drawCost(icx, sy, c.a, can); else comicText('FREE', icx, sy, 14, '#7dff8a');
  }
  // confetti + pops (screen space)
  for (const f of FX) { if (f.conf) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.col; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); } }
  // discreet reset (two taps: button + confirm)
  { const r = L.reset; ctx.globalAlpha = 0.55; ctx.strokeStyle = '#a99bb8'; ctx.lineWidth = 1; rrect(r.x, r.y, r.w, r.h, 13); ctx.stroke();
    ctx.font = 'bold 11px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#c9b8d8'; ctx.fillText('↺ Reset Progress', r.x + r.w / 2, r.y + r.h / 2 + 1); ctx.globalAlpha = 1; }
  if (suitModal) {
    ctx.fillStyle = 'rgba(5,0,12,.78)'; ctx.fillRect(0, 0, W, H);
    const m = L.modal; ctx.fillStyle = '#140818'; rrect(m.x + 5, m.y + 7, m.w, m.h, 18); ctx.fill();
    ctx.fillStyle = '#2a1040'; rrect(m.x, m.y, m.w, m.h, 18); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#ffde3b'; ctx.stroke();
    comicText('Start a brand-new game?', W / 2, m.y + 40, 21, '#ffde3b', -0.02);
    ctx.font = 'bold 15px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f3e6ff';
    ctx.fillText('Resets High Score, Tokens,', W / 2, m.y + 84); ctx.fillText('Comic Pages & Gear to 0.', W / 2, m.y + 106);
    for (const [b, lab, col] of [[L.cancel, 'CANCEL', '#5a4a72'], [L.yes, 'YES, RESET', '#e0123f']]) {
      ctx.fillStyle = '#140818'; rrect(b.x + 3, b.y + 5, b.w, b.h, 14); ctx.fill(); ctx.fillStyle = col; rrect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140818'; ctx.stroke();
      comicText(lab, b.x + b.w / 2, b.y + b.h / 2 + 1, lab.length > 7 ? 17 : 20, '#ffffff');
    }
  }
  for (const t of TXT) { const k = t.t / 1.4; ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4; comicText(t.s, t.x, t.y - k * 30, t.big ? 44 * Math.min(1, t.t * 6) : 22, t.col, -0.08); ctx.globalAlpha = 1; }
}
function unlockAcc(a) {
  if (ward.unlocked.includes(a.id) || !affordable(a)) return false;
  ward.tokens -= a.t; ward.pages -= a.p; ward.unlocked.push(a.id); ward.acc = a.id; suitAcc = a.id; saveWard(); preloadCombo(curKey());
  SFX.fanfare();
  const cols = ['#ffde3b', '#ff2e5f', '#55e6ff', '#9b2cff', '#7dff8a', '#ff8a3b'], L = suitLayout();
  for (let i = 0; i < 90; i++) { const an = Math.random() * 7, sp = 120 + Math.random() * 380; FX.push({ conf: true, x: L.pc.x, y: L.pc.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 120, t: 0, life: 1.6 + Math.random(), col: cols[i % 6], rot: Math.random() * 6 }); }
  TXT.push({ s: 'UNLOCKED!', x: W / 2, y: L.pc.y + L.pc.r * 0.2, t: 0, col: '#ffde3b', big: true });
  return true;
}
function resetProgress() {
  best = 0; newBest = false; bankMsg = null; try { localStorage.removeItem(HS_KEY); } catch (e) { }
  ward = freshWard(); saveWard(); suitAcc = 'none'; suitModal = false; preloadCombo(curKey());
  lvStore = freshLv(); saveLv();
  SFX.rescue(); const L = suitLayout();
  TXT.push({ s: 'FRESH START!', x: W / 2, y: L.pc.y + L.pc.r * 0.2, t: 0, col: '#7dff8a', big: true });
}
const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
function suitTap(p) {
  const L = suitLayout();
  if (suitModal) { if (inR(p, L.yes)) resetProgress(); else if (inR(p, L.cancel)) { suitModal = false; SFX.click(); } return; }
  if (inR(p, { x: L.reset.x - 6, y: L.reset.y - 6, w: L.reset.w + 12, h: L.reset.h + 12 })) { suitModal = true; SFX.click(); return; }
  if (inR(p, L.back)) { SFX.click(); closeSuit(); return; }
  for (const m of L.masks) if (inR(p, m)) { ward.mask = m.m.id; saveWard(); SFX.click(); preloadCombo(comboKey(ward.mask, suitAcc)); for (const a of ACCS) avImg(comboKey(ward.mask, a.id), 'p'); return; }
  for (const c of L.cards) if (inR(p, c)) { suitAcc = c.a.id; preloadCombo(comboKey(ward.mask, suitAcc)); if (ward.unlocked.includes(suitAcc)) { ward.acc = suitAcc; saveWard(); SFX.page(); } else SFX.click(); return; }
  const a = accById(suitAcc);
  if (inR(p, { x: L.act.x - 10, y: L.act.y - 6, w: L.act.w + 20, h: L.act.h + 12 }) && !ward.unlocked.includes(a.id) && affordable(a)) unlockAcc(a);
}
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0d0418'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * OX, 0);
  if (state === 'title') drawTitle();
  else if (state === 'suit') drawSuit();
  else if (state === 'play') { drawWorld(); drawHUD(); }
  else if (state === 'pause') drawPause();
  else drawEnd();
}

// ---------- input (pointer events, true multi-touch by pointerId) ----------
function toLocal(cx, cy) { return { x: (cx - OX) / S, y: cy / S }; }
const near = (p, b, pad) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + (pad || 0);
function roleFor(p) {
  if (near(p, MUTE(), 8)) return 'mute';
  if (near(p, PAUSEB(), 8)) return 'pause';
  if (near(p, ZAPB(), 12)) return 'zap';
  if (near(p, JUMPB(), 8)) return 'jump';
  if (near(p, SWINGB(), 6)) return 'swing';
  if (p.y > H - 200 && p.x < 186) return padRole(p); // ◀ ▶ thumb pad (generous zone)
  if (p.y < H - 200) return 'swing'; // hold anywhere in the upper play area = swing
  return 'none';
}
function down(e) {
  e.preventDefault(); ac();
  const p = toLocal(e.clientX, e.clientY);
  if (state !== 'suit' && near(p, MUTE(), 8)) { muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (er) { } return; }
  if (state === 'title') { ptrs.set(e.pointerId, 'ui'); const L = titleLayout(); if (inR(p, L.suit)) { SFX.click(); openSuit(); return; } for (const c of L.cards) if (inR(p, { x: c.x - 3, y: c.y - 3, w: c.w + 6, h: c.h + 8 })) { startLevel(c.i); return; } return; }
  if (state === 'pause') { ptrs.set(e.pointerId, 'ui'); pauseTap(p); return; }
  if (state === 'suit') { ptrs.set(e.pointerId, 'ui'); suitTap(p); return; }
  if (state === 'win' || state === 'over') { ptrs.set(e.pointerId, 'ui'); if (endT > 1) endTap(p); return; }
  if (near(p, PAUSEB(), 8)) { pauseGame(); return; }
  const role = roleFor(p); ptrs.set(e.pointerId, role);
  try { cv.setPointerCapture(e.pointerId); } catch (er) { }
  if (role === 'zap') input.zapQ = true;
  else if (role === 'jump') input.jumpQ = JUMP_BUFFER;
  else if (role === 'swing') input.block = false;
}
function up(e) { ptrs.delete(e.pointerId); if (!swingHeld()) input.block = false; }
cv.addEventListener('pointerdown', down);
cv.addEventListener('pointerup', up);
cv.addEventListener('pointermove', e => { // slide a thumb between ◀ and ▶ without lifting
  const r = ptrs.get(e.pointerId); if (r !== 'left' && r !== 'right') return;
  ptrs.set(e.pointerId, padRole(toLocal(e.clientX, e.clientY)));
});
cv.addEventListener('pointercancel', up);
cv.addEventListener('lostpointercapture', up);
cv.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
cv.addEventListener('contextmenu', e => e.preventDefault());
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'], SWING_KEYS = ['ShiftLeft', 'ShiftRight', 'KeyE'], ZAP_KEYS = ['KeyX', 'KeyF'];
addEventListener('keydown', e => {
  if (e.repeat) return; ac();
  const k = e.code;
  if (state === 'suit') { if (k === 'Escape' || k === 'Backspace') { if (suitModal) suitModal = false; else closeSuit(); } return; }
  if (state === 'pause') { if (k === 'Escape' || k === 'KeyP' || k === 'Enter') { state = 'play'; input.block = true; } else if (k === 'KeyL') toTitle(); e.preventDefault(); return; }
  if (state !== 'play') {
    if (k === 'KeyS') { musicStop(); openSuit(); return; }
    if (state === 'title' && ['Digit1', 'Digit2', 'Digit3'].includes(k)) { startLevel(+k.slice(5) - 1); return; }
    if ((state === 'win' || state === 'over') && endT > 1) { if (k === 'KeyN') { startLevel(curLv + 1); return; } if (k === 'KeyL' || k === 'Escape') { toTitle(); return; } if (k === 'KeyR') { startLevel(curLv); return; } }
    if (JUMP_KEYS.includes(k) || k === 'Enter') { if (state === 'title') startLevel(curLv); else if (endT > 1) startLevel(state === 'win' ? curLv + 1 : curLv); e.preventDefault(); }
    return;
  }
  if (k === 'Escape' || k === 'KeyP') { pauseGame(); return; }
  if (k === 'ArrowLeft' || k === 'KeyA') { keyL = true; e.preventDefault(); }
  if (k === 'ArrowRight' || k === 'KeyD') { keyR = true; e.preventDefault(); }
  if (JUMP_KEYS.includes(k)) { input.jumpQ = JUMP_BUFFER; input.jumpHeld = true; e.preventDefault(); }
  if (SWING_KEYS.includes(k)) { keySwing = true; input.block = false; }
  if (ZAP_KEYS.includes(k)) input.zapQ = true;
});
addEventListener('keyup', e => { if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyL = false; if (e.code === 'ArrowRight' || e.code === 'KeyD') keyR = false; if (JUMP_KEYS.includes(e.code)) input.jumpHeld = false; if (SWING_KEYS.includes(e.code)) keySwing = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { ptrs.clear(); keySwing = false; keyL = keyR = false; input.jumpHeld = false; } });

// ---------- loop ----------
let last = performance.now(), acc = 0;
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
  while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
  if (state === 'win' || state === 'over') endT += dt;
  musicTick(); render(); requestAnimationFrame(frame);
}
resize(); requestAnimationFrame(frame);
setTimeout(() => { loadLvArt('ketchikan'); loadLvArt('jungle'); }, 600); // prefetch world art for the title cards
window.__game = { get P() { return P; }, get stats() { return stats; }, get state() { return state; }, get EN() { return EN; }, get CIV() { return CIV; }, get TOK() { return TOK; }, get PAGES() { return PAGES; }, get ANCH() { return ANCH; }, get B() { return B; }, get camX() { return camX; }, get ptrs() { return [...ptrs.entries()]; }, roofAt: x => roofAt(x), get H() { return H; }, get W() { return W; }, newGame, endGame, HERO_NAME, VERSION, get ward() { return ward; }, get suitAcc() { return suitAcc; }, openSuit, closeSuit, suitLayout, titleLayout, endLayout, unlockAcc, curKey, AVC, ACCS, get best() { return best; }, moveDir, pickAnchor: d => pickAnchor(d), get suitModal() { return suitModal; }, resetProgress, PADL, PADR, JUMPB, SWINGB, ZAPB, setWard(w) { ward = Object.assign(ward, w); saveWard(); }, LEVELS, get curLv() { return curLv; }, setLevel(i) { curLv = i; }, startLevel, toTitle, pauseGame, pauseLayout, get lvStore() { return lvStore; }, get SECTIONS() { return SECTIONS; }, get DECO() { return DECO; }, get finishX() { return finishX; }, get LVLEN() { return LVLEN; }, get LVIMG() { return LVIMG; }, get mus() { return mus; }, step: dt => step(dt), get endT() { return endT; }, consts: { RUN_R, RUN_L, GRAV, MAXV, JUMP_V, DJUMP_V, CAM_X } };
