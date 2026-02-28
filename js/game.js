// ============================================================
// DARKVIBE RPG - Main Game Manager
// ============================================================

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);
    this.ui = new UIManager(this);
    this.particles = new ParticleSystem();
    this.floats = [];
    this.projectiles = [];
    this.dungeonGen = new DungeonGenerator();

    this.player = null;
    this.enemies = [];
    this.drops = [];
    this.chests = [];
    this.map = null;
    this.rooms = null;
    this.stairPos = null;

    this.floor = 1;
    this.running = false;
    this.paused = false;
    this.time = 0;
    this.lastTime = 0;

    this.mouseX = 0; this.mouseY = 0;
    this.moveIndicator = { tx: -1, ty: -1, timer: 0 };
    this.hoverEnemy = null;

    this._pendingLevelUp = false;
    this._descendCooldown = 0;

    // Start the loop
    requestAnimationFrame((t) => this._loop(t));
  }

  // ---- GAME START ----
  startGame(className) {
    this.floor = 1;
    this.player = new Player(className);
    this.running = true;
    this.paused = false;
    this.time = 0;
    this.particles.particles = [];
    this.floats = [];
    this.projectiles = [];
    this._descendCooldown = 0;
    this.lastTime = performance.now();

    this._loadFloor(1);
    this.ui.showScreen('game');
    this.ui.drawSkillIcons(this.player);

    this.log(`You are a ${this.player.name}. Explore the dungeon!`, 'info');
    this.log('Click to move. Q/W/E/R = Skills. F1/F2 = Potions', 'info');
  }

  _loadFloor(floor) {
    this.floor = floor;
    const data = this.dungeonGen.generate(floor);
    this.map = data.map;
    this.rooms = data.rooms;
    this.stairPos = data.stairPos;
    this.drops = [];
    this.enemies = [];

    // Set player position
    const ps = data.playerStart;
    this.player.px = (ps.tx + 0.5) * CFG.TILE;
    this.player.py = (ps.ty + 0.5) * CFG.TILE;
    this.player.tileX = ps.tx;
    this.player.tileY = ps.ty;
    this.player.path = [];
    this.player.attackTarget = null;

    // Chests
    this.chests = data.chests;

    // Spawn monsters
    const mTable = MONSTER_TABLE[Math.min(floor, 3)].filter(e => e.type !== 'boss');
    for (const sp of data.spawnPoints) {
      if (Math.random() < 0.85) {
        const entry = weightedRandom(mTable);
        const m = new Monster(entry.type, sp.tx, sp.ty, floor);
        this.enemies.push(m);
      }
    }

    // Spawn boss on last floor
    if (floor === CFG.DUNGEON_FLOORS && data.bossSpawn) {
      const boss = new Monster('boss', data.bossSpawn.tx, data.bossSpawn.ty, floor);
      this.enemies.push(boss);
    }

    this.log(`Entered Floor ${floor}!`, 'info');
    if (floor === CFG.DUNGEON_FLOORS) {
      this.log('⚠ The Boss awaits in the depths!', 'warn');
    }
  }

  // ---- MAIN LOOP ----
  _loop(timestamp) {
    requestAnimationFrame((t) => this._loop(t));

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (!this.running || this.paused) return;

    this.time += dt;
    this._update(dt);
    this._draw();
  }

  // ---- UPDATE ----
  _update(dt) {
    const player = this.player;
    if (!player) return;

    // Player update
    player.update(dt, this);

    // Check player death
    if (!player.alive) {
      this.running = false;
      this.ui.showGameOver({ floor: this.floor, kills: player.kills, level: player.level, gold: player.gold });
      return;
    }

    // Enemies update
    for (const e of this.enemies) {
      if (e.alive) e.update(dt, this);
    }

    // Remove dead enemies
    for (const e of this.enemies) {
      if (!e.alive && e.deathAnim > 0) {
        e.deathAnim -= dt * 2;
      }
    }

    // Projectiles update
    this.projectiles = this.projectiles.filter(p => {
      p.update(dt, this.map);
      if (!p.alive) return false;

      // Check hits
      if (p.owner === 'player') {
        for (const e of this.enemies) {
          if (!e.alive || p.hitIds.has(e.id)) continue;
          if (dist({ x: p.x, y: p.y }, { x: e.px, y: e.py }) < (e.size * CFG.TILE * 0.55 + p.radius)) {
            p.hitIds.add(e.id);
            const realDmg = Math.max(1, p.damage - e.def);
            this.dealDamage(player, e, realDmg, p.color);
            if (p.onHit) p.onHit(e, p.x, p.y);
            this.particles.emit(p.x, p.y, p.color, 6, 60, 0.25, 3);
            if (!p.piercing) { p.alive = false; break; }
          }
        }
      } else {
        // Enemy projectile hits player
        if (!p.hitIds.has('player')) {
          if (dist({ x: p.x, y: p.y }, { x: player.px, y: player.py }) < CFG.TILE * 0.6 + p.radius) {
            p.hitIds.add('player');
            if (!player.isInvincible()) {
              const dmg = Math.max(1, p.damage - player.def);
              player.hp = Math.max(0, player.hp - dmg);
              player.hitFlash = 0.2;
              this.floats.push(new FloatingText(player.px, player.py - 30, '-' + dmg, '#ff4444'));
              this.particles.emit(player.px, player.py, '#cc0000', 6, 60, 0.3, 3);
              if (player.hp <= 0) player.alive = false;
            }
            p.alive = false;
          }
        }
      }
      return p.alive;
    });

    // Particles & floats
    this.particles.update(dt);
    this.floats = this.floats.filter(f => { f.update(dt); return f.alive; });

    // Move indicator timer
    if (this.moveIndicator.timer > 0) this.moveIndicator.timer -= dt;

    // Drop pickup
    const playerTileX = player.tileX, playerTileY = player.tileY;
    this.drops = this.drops.filter(drop => {
      drop.age += dt;
      // Auto-pickup when player walks over it
      const d = dist({ x: player.px, y: player.py }, { x: drop.px, y: drop.py });
      if (d < CFG.TILE * 0.8) {
        this._pickupDrop(drop);
        return false;
      }
      return true;
    });

    // Chest opening
    for (const chest of this.chests) {
      if (!chest.opened) {
        const d = Math.hypot(playerTileX - chest.tx, playerTileY - chest.ty);
        if (d < 1.5) {
          this._openChest(chest);
        }
      }
    }

    // Descent cooldown
    if (this._descendCooldown > 0) this._descendCooldown -= dt;

    // Check stairs
    if (this.stairPos && Math.hypot(player.tileX - this.stairPos.tx, player.tileY - this.stairPos.ty) < 1.0) {
      this._descend();
    }

    // UI update
    this.ui.update(dt, player);
  }

  // ---- DRAW ----
  _draw() {
    const renderer = this.renderer;
    const ctx = renderer.ctx2d;
    const player = this.player;
    if (!player) return;

    renderer.clear();

    const { cx: camX, cy: camY } = renderer.getCameraOffset(player.px, player.py);

    // Draw map
    renderer.drawMap(this.map, camX, camY, this.time);

    // Draw chests
    for (const chest of this.chests) {
      renderer.drawChest(ctx, chest.tx, chest.ty, camX, camY, chest.opened, this.time);
    }

    // Draw drops (items on ground)
    for (const drop of this.drops) {
      renderer.drawDropItem(drop, camX, camY, this.time);
    }

    // Draw enemies (dead ones fading)
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.deathAnim > 0) {
          ctx.globalAlpha = e.deathAnim;
          renderer.drawMonster(e, camX, camY, this.time);
          ctx.globalAlpha = 1;
        }
        continue;
      }
      renderer.drawMonster(e, camX, camY, this.time);
    }

    // Draw player
    renderer.drawPlayer(player, camX, camY, this.time);

    // Draw projectiles
    for (const p of this.projectiles) {
      p.draw(ctx, camX, camY, this.particles);
    }

    // Draw particles
    this.particles.draw(ctx, camX, camY);

    // Draw floating text
    for (const f of this.floats) {
      f.draw(ctx, camX, camY);
    }

    // Move indicator
    if (this.moveIndicator.timer > 0) {
      renderer.drawMoveIndicator(this.moveIndicator.tx, this.moveIndicator.ty, camX, camY, this.time);
    }

    // Ambient vignette (dark corners)
    renderer.drawAmbientVignette(ctx);

    // Damage vignette
    if (this.ui.damageVignetteAlpha > 0) {
      renderer.drawDamageVignette(ctx, clamp(this.ui.damageVignetteAlpha, 0, 0.6));
    }

    // Minimap
    renderer.drawMinimap(document.getElementById('minimap'), this.map, player, this.enemies, this.rooms);
  }

  // ---- COMBAT ----
  dealDamage(attacker, target, damage, color = '#ff4444') {
    if (!target.alive) return;
    const isPlayer = target === this.player;
    if (isPlayer && target.isInvincible()) return;

    const finalDmg = Math.max(1, damage);
    target.hp = Math.max(0, target.hp - finalDmg);
    target.hitFlash = 0.15;

    this.floats.push(new FloatingText(
      target.px + rndF(-10, 10),
      target.py - 30,
      '-' + finalDmg,
      isPlayer ? '#ff4444' : color,
      isPlayer ? 18 : 16
    ));

    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      if (!isPlayer) {
        this._onMonsterKilled(target);
      }
    }
  }

  _onMonsterKilled(monster) {
    this.player.kills++;
    this.player.gainXP(monster.xpReward, this);

    // Gold drop
    if (Math.random() < CFG.GOLD_DROP_CHANCE) {
      const gold = rnd(...monster.goldRange);
      this.player.gold += gold;
      this.floats.push(new FloatingText(monster.px, monster.py - 50, '+' + gold + 'g', '#c8a830', 14));
    }

    // Item drop
    if (Math.random() < CFG.ITEM_DROP_CHANCE) {
      const item = rollLoot(this.floor);
      const drop = new DropItem(monster.tileX, monster.tileY, item);
      this.drops.push(drop);
    }

    // Death particles
    this.particles.emit(monster.px, monster.py, monster.color, 20, 120, 0.8, 5);
    this.particles.emit(monster.px, monster.py, '#cc0000', 10, 80, 0.6, 3);

    // Boss kill = victory
    if (monster.isBoss) {
      this.running = false;
      setTimeout(() => {
        this.ui.showVictory({
          className: this.player.name,
          level: this.player.level,
          kills: this.player.kills,
          gold: this.player.gold,
        });
      }, 1500);
    }
  }

  fireProjectile(opts) {
    const p = new Projectile(opts);
    p.onHit = opts.onHit || null;
    this.projectiles.push(p);
    return p;
  }

  getNearestEnemy(px, py, tx, ty, maxTiles) {
    let best = null, bestD = maxTiles * CFG.TILE;
    const cx = tx * CFG.TILE + CFG.TILE/2;
    const cy = ty * CFG.TILE + CFG.TILE/2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = dist({ x: cx, y: cy }, { x: e.px, y: e.py });
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) {
      // Fall back to nearest to player
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = dist({ x: px, y: py }, { x: e.px, y: e.py });
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    return best;
  }

  // ---- LEVEL UP ----
  triggerLevelUp() {
    this.paused = true;
    this.ui.showLevelUp(this.player.level);
    this.particles.emit(this.player.px, this.player.py, '#ffdd00', 30, 150, 1.5, 6);
    this.log('LEVEL UP! You are now level ' + this.player.level + '!', 'loot');
  }

  // ---- DROPS ----
  _pickupDrop(drop) {
    const item = drop.item;
    const wasConsumed = applyItem(this.player, item);
    if (item.type === ITEM_TYPE.POTION) {
      this.log('Picked up ' + item.name, 'loot');
    } else {
      this.log('Equipped ' + item.name + '! (' + (item.desc || '') + ')', 'loot');
    }
    this.floats.push(new FloatingText(drop.px, drop.py - 20, item.name, '#c8a830', 13));
  }

  // ---- CHESTS ----
  _openChest(chest) {
    chest.opened = true;
    const items = rollChestLoot(this.floor);
    for (const item of items) {
      // Spread items around chest
      const ox = rndF(-0.5, 0.5), oy = rndF(-0.5, 0.5);
      const drop = new DropItem(
        Math.floor(chest.tx + ox),
        Math.floor(chest.ty + oy),
        item
      );
      drop.px = (chest.tx + 0.5 + ox * 1.5) * CFG.TILE;
      drop.py = (chest.ty + 0.5 + oy * 1.5) * CFG.TILE;
      this.drops.push(drop);
    }
    this.particles.emit((chest.tx + 0.5) * CFG.TILE, (chest.ty + 0.5) * CFG.TILE, '#c8a830', 20, 120, 0.8, 4);
    this.log('Opened a chest! Found ' + items.length + ' items!', 'loot');
  }

  // ---- STAIRS ----
  _descend() {
    if (this.floor >= CFG.DUNGEON_FLOORS) return; // Already on last floor
    if (this._descendCooldown > 0) return;
    this._descendCooldown = 2;

    const nextFloor = this.floor + 1;
    this.log(`Descending to Floor ${nextFloor}...`, 'info');
    this.particles.emit(this.player.px, this.player.py, '#c8a830', 20, 100, 0.8, 4);

    // Heal a bit between floors
    const healAmount = Math.floor(this.player.maxHP * 0.15);
    this.player.heal(healAmount);
    const mpAmount = Math.floor(this.player.maxMP * 0.3);
    this.player.restoreMP(mpAmount);

    this._loadFloor(nextFloor);
  }

  // ---- INPUT ----
  onCanvasClick(event, isRightClick) {
    if (!this.running || this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    const { cx: camX, cy: camY } = this.renderer.getCameraOffset(this.player.px, this.player.py);
    const tx = Math.floor((mx + camX) / CFG.TILE);
    const ty = Math.floor((my + camY) / CFG.TILE);

    if (ty < 0 || ty >= this.map.length || tx < 0 || tx >= this.map[0].length) return;
    if (this.map[ty][tx] === TILE.WALL) return;

    // Check if clicking on an enemy
    if (!isRightClick) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const epx = e.px - camX, epy = e.py - camY;
        if (Math.hypot(epx - mx, epy - my) < CFG.TILE * 0.55 * e.size) {
          this.player.attackTarget = e;
          // Move toward enemy if too far
          const attackRange = (this.player.classStats.attackType === 'ranged' ? CFG.RANGED_RANGE : CFG.MELEE_RANGE) * CFG.TILE;
          if (dist({ x: this.player.px, y: this.player.py }, { x: e.px, y: e.py }) > attackRange) {
            this.player.path = findPath(this.map, this.player.tileX, this.player.tileY, e.tileX, e.tileY);
          }
          return;
        }
      }
    }

    // Move to clicked tile
    this.player.attackTarget = null;
    this.player.path = findPath(this.map, this.player.tileX, this.player.tileY, tx, ty);
    this.moveIndicator.tx = tx;
    this.moveIndicator.ty = ty;
    this.moveIndicator.timer = 0.5;
  }

  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    if (!this.running) return;
    const { cx: camX, cy: camY } = this.renderer.getCameraOffset(this.player.px, this.player.py);

    // Hover enemy detection
    this.hoverEnemy = null;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const epx = e.px - camX, epy = e.py - camY;
      if (Math.hypot(epx - this.mouseX, epy - this.mouseY) < CFG.TILE * 0.55 * e.size) {
        this.hoverEnemy = e;
        break;
      }
    }
    this.canvas.style.cursor = this.hoverEnemy ? 'pointer' : 'crosshair';
  }

  onKeyDown(event) {
    if (!this.running || this.paused) return;
    const player = this.player;
    if (!player) return;

    const { cx: camX, cy: camY } = this.renderer.getCameraOffset(player.px, player.py);
    const tx = Math.floor((this.mouseX + camX) / CFG.TILE);
    const ty = Math.floor((this.mouseY + camY) / CFG.TILE);

    switch (event.key.toLowerCase()) {
      case 'q': player.useSkill(0, this, tx, ty); break;
      case 'w': player.useSkill(1, this, tx, ty); break;
      case 'e': player.useSkill(2, this, tx, ty); break;
      case 'r': player.useSkill(3, this, tx, ty); break;
      case 'f1': event.preventDefault(); player.useHPPotion(this); break;
      case 'f2': event.preventDefault(); player.useMPPotion(this); break;
    }
  }

  log(text, type = 'info') {
    this.ui.log(text, type);
  }
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  // Draw class portraits
  drawClassPortraits();

  window._game = new Game();
});

// Draw class portraits on canvas inside portrait divs
function drawClassPortraits() {
  const portraits = [
    { id: '.warrior-portrait', draw: drawWarriorPortrait },
    { id: '.rogue-portrait',   draw: drawRoguePortrait   },
    { id: '.mage-portrait',    draw: drawMagePortrait     },
  ];

  for (const p of portraits) {
    const div = document.querySelector(p.id);
    if (!div) continue;
    const canvas = document.createElement('canvas');
    canvas.width = 100; canvas.height = 120;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    div.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    p.draw(ctx, 50, 80);
  }

  // Animate portraits
  function animatePortraits() {
    const t = performance.now() / 1000;
    portraits.forEach((p, i) => {
      const div = document.querySelector(p.id);
      if (!div) return;
      const canvas = div.querySelector('canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 100, 120);
      p.draw(ctx, 50, 80, t + i * 1.2);
    });
    requestAnimationFrame(animatePortraits);
  }
  animatePortraits();
}

function drawWarriorPortrait(ctx, cx, cy, t = 0) {
  const bob = Math.sin(t * 1.5) * 2;
  // Legs
  ctx.fillStyle = '#334455';
  ctx.fillRect(cx - 12, cy + bob, 10, 30);
  ctx.fillRect(cx + 2,  cy + bob, 10, 30);
  // Body armor
  ctx.fillStyle = '#667799';
  ctx.fillRect(cx - 16, cy - 20 + bob, 32, 22);
  // Shoulders
  ctx.fillStyle = '#445577';
  ctx.fillRect(cx - 20, cy - 22 + bob, 8, 10);
  ctx.fillRect(cx + 12, cy - 22 + bob, 8, 10);
  // Helmet
  ctx.fillStyle = '#889aaa';
  ctx.fillRect(cx - 13, cy - 40 + bob, 26, 22);
  ctx.fillStyle = '#667788';
  ctx.fillRect(cx - 11, cy - 34 + bob, 22, 7);
  ctx.fillStyle = '#445566';
  ctx.fillRect(cx - 9, cy - 33 + bob, 18, 5); // visor
  // Crest
  ctx.fillStyle = '#cc4400';
  ctx.fillRect(cx - 3, cy - 44 + bob, 6, 6);
  // Sword
  ctx.fillStyle = '#ccccdd';
  ctx.fillRect(cx + 18, cy - 36 + bob, 5, 36);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(cx + 18, cy - 2 + bob, 5, 8);
  ctx.fillStyle = '#aaa';
  ctx.fillRect(cx + 12, cy - 16 + bob, 18, 4);
  // Shield
  ctx.fillStyle = '#557799';
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy - 22 + bob);
  ctx.lineTo(cx - 22, cy + 4 + bob);
  ctx.lineTo(cx - 16, cy + 12 + bob);
  ctx.lineTo(cx - 16, cy - 22 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cc4400';
  ctx.beginPath(); ctx.arc(cx - 19, cy - 6 + bob, 4, 0, Math.PI * 2); ctx.fill();
}

function drawRoguePortrait(ctx, cx, cy, t = 0) {
  const bob = Math.sin(t * 1.5) * 2;
  // Legs
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(cx - 9, cy + bob, 8, 30);
  ctx.fillRect(cx + 1,  cy + bob, 8, 30);
  // Body (leather)
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(cx - 13, cy - 18 + bob, 26, 20);
  // Hood
  ctx.fillStyle = '#1a2a1a';
  ctx.beginPath(); ctx.arc(cx, cy - 26 + bob, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(cx - 14, cy - 26 + bob, 28, 10);
  // Face shadow
  ctx.fillStyle = '#0a1a0a';
  ctx.fillRect(cx - 8, cy - 30 + bob, 16, 8);
  // Eyes
  ctx.fillStyle = '#44ff44';
  ctx.shadowColor = '#44ff44'; ctx.shadowBlur = 6;
  ctx.fillRect(cx - 4, cy - 28 + bob, 3, 3);
  ctx.fillRect(cx + 2, cy - 28 + bob, 3, 3);
  ctx.shadowBlur = 0;
  // Dagger
  ctx.fillStyle = '#88cc88';
  ctx.fillRect(cx + 14, cy - 14 + bob, 4, 22);
  ctx.fillStyle = '#556633';
  ctx.fillRect(cx + 14, cy + 6 + bob, 4, 7);
  // Bow
  ctx.strokeStyle = '#664422'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx - 20, cy - 6 + bob, 14, -0.6, 0.6); ctx.stroke();
}

function drawMagePortrait(ctx, cx, cy, t = 0) {
  const bob = Math.sin(t * 1.5) * 2;
  const glow = 0.5 + 0.5 * Math.sin(t * 3);
  // Robes
  ctx.fillStyle = '#2a0a44';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 10 + bob); ctx.lineTo(cx + 16, cy - 10 + bob);
  ctx.lineTo(cx + 18, cy + 32 + bob); ctx.lineTo(cx - 18, cy + 32 + bob); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a1a5a';
  ctx.fillRect(cx - 3, cy - 10 + bob, 6, 28);
  // Arms
  ctx.fillStyle = '#2a0a44';
  ctx.fillRect(cx - 22, cy - 6 + bob, 10, 14);
  ctx.fillRect(cx + 12, cy - 6 + bob, 10, 14);
  // Head
  ctx.fillStyle = '#d4b896';
  ctx.beginPath(); ctx.arc(cx, cy - 22 + bob, 12, 0, Math.PI * 2); ctx.fill();
  // Hat
  ctx.fillStyle = '#1a0033';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 30 + bob); ctx.lineTo(cx, cy - 52 + bob); ctx.lineTo(cx + 16, cy - 30 + bob); ctx.closePath();
  ctx.fill();
  ctx.fillRect(cx - 18, cy - 32 + bob, 36, 4);
  // Eyes
  ctx.fillStyle = '#6688ff';
  ctx.shadowColor = '#6688ff'; ctx.shadowBlur = 4;
  ctx.fillRect(cx - 5, cy - 25 + bob, 3, 3);
  ctx.fillRect(cx + 2, cy - 25 + bob, 3, 3);
  ctx.shadowBlur = 0;
  // Staff
  ctx.strokeStyle = '#664422'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx + 20, cy + 24 + bob); ctx.lineTo(cx + 20, cy - 44 + bob); ctx.stroke();
  // Orb
  ctx.shadowColor = '#aa88ff'; ctx.shadowBlur = 18 * glow;
  ctx.fillStyle = `rgba(170,136,255,${glow})`;
  ctx.beginPath(); ctx.arc(cx + 20, cy - 44 + bob, 10, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ddaaff';
  ctx.beginPath(); ctx.arc(cx + 17, cy - 47 + bob, 4, 0, Math.PI * 2); ctx.fill();
}
