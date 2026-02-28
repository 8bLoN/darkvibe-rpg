// ============================================================
// DARKVIBE RPG - Utility Functions
// ============================================================

const rnd   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndF  = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const dist  = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const distTile = (a, b) => Math.hypot(a.tx - b.tx, a.ty - b.ty);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// Weighted random selection
function weightedRandom(table) {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of table) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return table[table.length - 1];
}

// Simple BFS pathfinding on tile grid
// Returns array of {x,y} tile positions (not including start)
function findPath(map, sx, sy, tx, ty, maxDist = 120) {
  const H = map.length, W = map[0].length;
  if (ty < 0 || ty >= H || tx < 0 || tx >= W) return [];
  if (map[ty][tx] === TILE.WALL) return [];
  if (sx === tx && sy === ty) return [];

  const key = (x, y) => y * W + x;
  const queue = [key(sx, sy)];
  const visited = new Uint8Array(H * W);
  const parent  = new Int32Array(H * W).fill(-1);
  visited[key(sx, sy)] = 1;

  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  let found = false;

  outer:
  while (queue.length > 0) {
    const ck = queue.shift();
    const cx = ck % W, cy = (ck / W) | 0;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
      if (map[ny][nx] === TILE.WALL) continue;
      const nk = key(nx, ny);
      if (visited[nk]) continue;
      visited[nk] = 1;
      parent[nk] = ck;
      if (nx === tx && ny === ty) { found = true; break outer; }
      if (Math.hypot(nx - sx, ny - sy) < maxDist) queue.push(nk);
    }
  }

  if (!found) return [];

  const path = [];
  let cur = key(tx, ty);
  while (cur !== key(sx, sy)) {
    const cx = cur % W, cy = (cur / W) | 0;
    path.unshift({ x: cx, y: cy });
    cur = parent[cur];
    if (cur < 0) return [];
  }
  return path;
}

// Smooth float value toward target
function smoothStep(current, target, speed, dt) {
  const diff = target - current;
  const step = speed * dt;
  if (Math.abs(diff) <= step) return target;
  return current + Math.sign(diff) * step;
}

// Check line-of-sight (tile based)
function hasLOS(map, x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let cx = x1, cy = y1;
  while (true) {
    if (cx === x2 && cy === y2) return true;
    if (map[cy] && map[cy][cx] === TILE.WALL) return false;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx)  { err += dx; cy += sy; }
  }
}

// Color utilities
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}

function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => clamp(v,0,255).toString(16).padStart(2,'0')).join('');
}

function colorAlpha(hex, alpha) {
  const {r,g,b} = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex(
    Math.round(lerp(ca.r, cb.r, t)),
    Math.round(lerp(ca.g, cb.g, t)),
    Math.round(lerp(ca.b, cb.b, t))
  );
}
