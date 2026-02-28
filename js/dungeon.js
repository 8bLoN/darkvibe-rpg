// ============================================================
// DARKVIBE RPG - Dungeon Generator
// ============================================================

class DungeonGenerator {
  generate(floor) {
    const W = CFG.MAP_W, H = CFG.MAP_H;
    const map = Array.from({length: H}, () => new Uint8Array(W));
    const rooms = [];

    // Attempt to place rooms
    for (let attempt = 0; attempt < 400; attempt++) {
      const w = rnd(CFG.ROOM_MIN, CFG.ROOM_MAX);
      const h = rnd(CFG.ROOM_MIN, CFG.ROOM_MAX - 2);
      const x = rnd(2, W - w - 2);
      const y = rnd(2, H - h - 2);

      if (this._overlaps(rooms, x, y, w, h)) continue;

      rooms.push({ x, y, w, h,
        cx: Math.floor(x + w / 2),
        cy: Math.floor(y + h / 2)
      });

      for (let ry = y; ry < y + h; ry++)
        for (let rx = x; rx < x + w; rx++)
          map[ry][rx] = TILE.FLOOR;

      if (rooms.length >= CFG.ROOMS_TARGET) break;
    }

    // Connect rooms in order with corridors
    for (let i = 1; i < rooms.length; i++) {
      this._connect(map, rooms[i-1], rooms[i]);
    }
    // Extra connections for loops
    if (rooms.length > 4) {
      for (let i = 0; i < Math.floor(rooms.length / 3); i++) {
        const a = rnd(0, rooms.length - 1);
        const b = (a + rnd(2, 4)) % rooms.length;
        this._connect(map, rooms[a], rooms[b]);
      }
    }

    // Place stairs in the last room
    const lastRoom = rooms[rooms.length - 1];
    map[lastRoom.cy][lastRoom.cx] = TILE.STAIRS;

    // Place chests in random rooms (not first or last)
    const chests = [];
    for (let i = 1; i < rooms.length - 1; i++) {
      if (Math.random() < 0.4) {
        const r = rooms[i];
        // Place chest off-center
        const cx = r.x + rnd(1, r.w - 2);
        const cy = r.y + rnd(1, r.h - 2);
        if (map[cy][cx] === TILE.FLOOR) {
          map[cy][cx] = TILE.CHEST;
          chests.push({ tx: cx, ty: cy, opened: false });
        }
      }
    }

    // Monster spawn points (skip first room, skip cells near stairs)
    const spawnPoints = [];
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i];
      const count = rnd(2, 3 + floor);
      for (let j = 0; j < count; j++) {
        const sx = r.x + rnd(1, r.w - 2);
        const sy = r.y + rnd(1, r.h - 2);
        if (map[sy][sx] === TILE.FLOOR) {
          spawnPoints.push({ tx: sx, ty: sy });
        }
      }
    }

    // Boss spawn (on floor 3, in last room)
    let bossSpawn = null;
    if (floor === CFG.DUNGEON_FLOORS) {
      bossSpawn = { tx: lastRoom.cx, ty: lastRoom.cy - 2 };
    }

    // Player start is center of first room
    const startRoom = rooms[0];
    const playerStart = { tx: startRoom.cx, ty: startRoom.cy };

    return { map, rooms, playerStart, spawnPoints, chests, bossSpawn, stairPos: { tx: lastRoom.cx, ty: lastRoom.cy } };
  }

  _overlaps(rooms, x, y, w, h) {
    const pad = 2;
    return rooms.some(r =>
      x < r.x + r.w + pad && x + w + pad > r.x &&
      y < r.y + r.h + pad && y + h + pad > r.y
    );
  }

  _connect(map, r1, r2) {
    let x = r1.cx, y = r1.cy;
    const tx = r2.cx, ty = r2.cy;

    // Random choice: horizontal-first or vertical-first
    if (Math.random() < 0.5) {
      while (x !== tx) { map[y][x] = TILE.FLOOR; x += (x < tx) ? 1 : -1; }
      while (y !== ty) { map[y][x] = TILE.FLOOR; y += (y < ty) ? 1 : -1; }
    } else {
      while (y !== ty) { map[y][x] = TILE.FLOOR; y += (y < ty) ? 1 : -1; }
      while (x !== tx) { map[y][x] = TILE.FLOOR; x += (x < tx) ? 1 : -1; }
    }
    // Widen corridor slightly
    map[y][x] = TILE.FLOOR;
  }
}

// ============================================================
// Drop Item System (in-world loot)
// ============================================================
class DropItem {
  constructor(tx, ty, item) {
    this.tx = tx;
    this.ty = ty;
    // World pixel position (center of tile)
    this.px = (tx + 0.5) * CFG.TILE;
    this.py = (ty + 0.5) * CFG.TILE;
    this.item = item;
    this.age = 0;         // seconds since dropped
    this.pickupRange = 1.0; // tiles
    this.bobOffset = rndF(0, Math.PI * 2);
  }
}

// ============================================================
// Particle System
// ============================================================
class Particle {
  constructor(x, y, vx, vy, color, life, size = 3, fade = true) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.fade = fade;
    this.gravity = 0;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
  }

  get alive() { return this.life > 0; }

  get alpha() { return this.fade ? clamp(this.life / this.maxLife, 0, 1) : 1; }
}

class ParticleSystem {
  constructor() { this.particles = []; }

  emit(x, y, color, count, speed = 80, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = rndF(0, Math.PI * 2);
      const s = rndF(speed * 0.4, speed);
      const p = new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, color, rndF(life*0.5, life), rndF(size*0.5, size));
      p.gravity = 60;
      this.particles.push(p);
    }
  }

  emitDir(x, y, ax, ay, spread, color, count, speed, life, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = ax + rndF(-spread, spread);
      const s = rndF(speed * 0.6, speed);
      const p = new Particle(x + Math.cos(ax)*4, y + Math.sin(ax)*4,
        Math.cos(a)*s, Math.sin(a)*s, color, rndF(life*0.5, life), rndF(size*0.5, size));
      this.particles.push(p);
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => { p.update(dt); return p.alive; });
  }

  draw(ctx, camX, camY) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// Floating Text (damage numbers etc.)
// ============================================================
class FloatingText {
  constructor(x, y, text, color, size = 16) {
    this.x = x; this.y = y;
    this.vy = -60;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 1.2;
    this.maxLife = 1.2;
  }

  update(dt) {
    this.y  += this.vy * dt;
    this.vy *= 0.95;
    this.life -= dt;
  }

  get alive() { return this.life > 0; }

  get alpha() { return clamp(this.life / this.maxLife, 0, 1); }

  draw(ctx, camX, camY) {
    ctx.globalAlpha = this.alpha;
    ctx.font = `bold ${this.size}px Georgia`;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(this.text, this.x - camX, this.y - camY);
    ctx.fillText(this.text,   this.x - camX, this.y - camY);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// Projectile
// ============================================================
class Projectile {
  constructor({ x, y, tx, ty, speed, damage, color, owner, radius = 5, piercing = false, homing = false }) {
    this.x = x; this.y = y;
    this.speed = speed;
    this.damage = damage;
    this.color = color;
    this.owner = owner; // 'player' or 'enemy'
    this.radius = radius;
    this.piercing = piercing;
    this.homing = homing;
    this.homingTarget = null;
    this.hitIds = new Set();
    this.alive = true;
    this.life = 8; // max seconds

    const dx = tx - x, dy = ty - y;
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * speed;
    this.vy = (dy / len) * speed;
    this.angle = Math.atan2(dy, dx);
  }

  update(dt, map) {
    if (!this.alive) return;
    this.life -= dt;
    if (this.life <= 0) { this.alive = false; return; }

    if (this.homing && this.homingTarget && this.homingTarget.alive !== false) {
      const dx = this.homingTarget.px - this.x;
      const dy = this.homingTarget.py - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const ta = Math.atan2(dy, dx);
      const ca = Math.atan2(this.vy, this.vx);
      const diff = ((ta - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const newA = ca + clamp(diff, -2 * dt, 2 * dt);
      this.vx = Math.cos(newA) * this.speed;
      this.vy = Math.sin(newA) * this.speed;
      this.angle = newA;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle = Math.atan2(this.vy, this.vx);

    // Wall collision
    const tx = Math.floor(this.x / CFG.TILE);
    const ty = Math.floor(this.y / CFG.TILE);
    if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length || map[ty][tx] === TILE.WALL) {
      this.alive = false;
    }
  }

  draw(ctx, camX, camY, particles) {
    const sx = this.x - camX, sy = this.y - camY;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // Glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 2, this.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
