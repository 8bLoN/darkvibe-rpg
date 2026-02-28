// ============================================================
// DARKVIBE RPG - Skills System
// ============================================================

// Each skill: { name, manaCost, cooldown, range, aoe, type, fn(game, player, tx, ty) }
// fn returns true if cast was successful

const SKILLS = {
  // ============ WARRIOR SKILLS ============
  heavy_strike: {
    name: 'Heavy Strike',
    key: 'Q', manaCost: 8, cooldown: 1.5,
    range: 1.8, aoe: false, type: 'melee',
    desc: 'Powerful blow dealing 200% damage',
    color: '#ff6622',
    icon: (ctx) => { drawSwordIcon(ctx, '#ff6622'); },
    fn(game, player, tx, ty) {
      const target = game.getNearestEnemy(player.px, player.py, player.tileX, player.tileY, 2.5);
      if (!target) return false;
      const dmg = Math.round(player.calcDamage() * 2.0);
      game.dealDamage(player, target, dmg, '#ff6622');
      game.particles.emit(target.px, target.py, '#ff4400', 12, 120, 0.4, 4);
      game.log('Heavy Strike! ' + dmg + ' damage!', 'skill');
      return true;
    }
  },

  whirlwind: {
    name: 'Whirlwind',
    key: 'W', manaCost: 15, cooldown: 4.0,
    range: 2.5, aoe: true, type: 'melee',
    desc: 'Spin attack hitting all nearby enemies for 150% damage',
    color: '#ff8800',
    icon: (ctx) => { drawWhirlwindIcon(ctx); },
    fn(game, player, tx, ty) {
      let hit = 0;
      for (const e of game.enemies) {
        if (!e.alive) continue;
        const d = dist({ x: player.px, y: player.py }, { x: e.px, y: e.py });
        if (d < 2.8 * CFG.TILE) {
          const dmg = Math.round(player.calcDamage() * 1.5);
          game.dealDamage(player, e, dmg, '#ff8800');
          hit++;
        }
      }
      game.particles.emit(player.px, player.py, '#ff6600', 20, 150, 0.6, 5);
      game.log('Whirlwind! Hit ' + hit + ' enemies!', 'skill');
      return hit > 0 || true;
    }
  },

  battle_cry: {
    name: 'Battle Cry',
    key: 'E', manaCost: 12, cooldown: 8.0,
    range: 0, aoe: true, type: 'buff',
    desc: 'War cry that boosts your damage for 5 seconds',
    color: '#ffcc00',
    icon: (ctx) => { drawCryIcon(ctx); },
    fn(game, player, tx, ty) {
      player.addBuff('rage', 5.0, { dmgMult: 1.6 });
      game.particles.emit(player.px, player.py, '#ffcc00', 15, 80, 0.8, 4);
      game.log('Battle Cry! Damage +60% for 5s!', 'skill');
      return true;
    }
  },

  last_stand: {
    name: 'Last Stand',
    key: 'R', manaCost: 20, cooldown: 15.0,
    range: 0, aoe: false, type: 'buff',
    desc: 'Become invincible for 2 seconds and heal 30% max HP',
    color: '#aaaaff',
    icon: (ctx) => { drawShieldIcon(ctx, '#aaaaff'); },
    fn(game, player, tx, ty) {
      player.addBuff('invincible', 2.0, { invincible: true });
      const healAmt = Math.floor(player.maxHP * 0.3);
      player.heal(healAmt);
      game.particles.emit(player.px, player.py, '#aaaaff', 20, 100, 1.0, 5);
      game.log('Last Stand! Invincible for 2s, healed ' + healAmt + ' HP!', 'skill');
      return true;
    }
  },

  // ============ ROGUE SKILLS ============
  quick_shot: {
    name: 'Quick Shot',
    key: 'Q', manaCost: 6, cooldown: 0.8,
    range: 8, aoe: false, type: 'ranged',
    desc: 'Rapid arrow for 120% damage with crit chance',
    color: '#88cc44',
    icon: (ctx) => { drawArrowIcon(ctx, '#88cc44'); },
    fn(game, player, tx, ty) {
      const target = game.getNearestEnemy(player.px, player.py, tx, ty, 9);
      if (!target) return false;
      const isCrit = Math.random() < 0.35;
      const dmg = Math.round(player.calcDamage() * 1.2 * (isCrit ? CFG.CRIT_MULT : 1));
      game.fireProjectile({
        x: player.px, y: player.py,
        tx: target.px, ty: target.py,
        speed: 400, damage: dmg,
        color: '#aaff44', owner: 'player', radius: 5,
        onHit: (e) => {
          game.particles.emit(e.px, e.py, '#88cc44', 8, 80, 0.3, 3);
          if (isCrit) game.floats.push(new FloatingText(e.px, e.py - 20, 'CRIT!', '#ffff44', 18));
        }
      });
      return true;
    }
  },

  arrow_rain: {
    name: 'Arrow Rain',
    key: 'W', manaCost: 20, cooldown: 6.0,
    range: 7, aoe: true, type: 'ranged',
    desc: 'Rain of arrows in a wide area',
    color: '#44cc88',
    icon: (ctx) => { drawRainIcon(ctx); },
    fn(game, player, tx, ty) {
      const cx = tx * CFG.TILE + CFG.TILE/2;
      const cy = ty * CFG.TILE + CFG.TILE/2;
      // Fire multiple arrows
      for (let i = 0; i < 8; i++) {
        const delay = i * 0.08;
        const ox = rndF(-2, 2) * CFG.TILE, oy = rndF(-2, 2) * CFG.TILE;
        setTimeout(() => {
          if (!game.running) return;
          game.fireProjectile({
            x: player.px, y: player.py - 200 + rndF(-50,50),
            tx: cx + ox, ty: cy + oy,
            speed: 500, damage: Math.round(player.calcDamage() * 0.9),
            color: '#44ff88', owner: 'player', radius: 4,
            onHit: (e) => { game.particles.emit(e.px, e.py, '#44cc88', 6, 60, 0.3, 3); }
          });
        }, delay * 1000);
      }
      game.log('Arrow Rain! 8 arrows incoming!', 'skill');
      return true;
    }
  },

  poison_strike: {
    name: 'Poison Strike',
    key: 'E', manaCost: 14, cooldown: 5.0,
    range: 6, aoe: false, type: 'ranged',
    desc: 'Envenomed attack dealing damage over time',
    color: '#44ff44',
    icon: (ctx) => { drawPoisonIcon(ctx); },
    fn(game, player, tx, ty) {
      const target = game.getNearestEnemy(player.px, player.py, tx, ty, 7);
      if (!target) return false;
      const dmg = Math.round(player.calcDamage() * 0.8);
      game.fireProjectile({
        x: player.px, y: player.py,
        tx: target.px, ty: target.py,
        speed: 300, damage: dmg,
        color: '#00ff44', owner: 'player', radius: 6,
        onHit: (e) => {
          e.addDebuff('poison', 5.0, { dotDmg: Math.round(player.calcDamage() * 0.3), dotTick: 0.5 });
          game.particles.emit(e.px, e.py, '#00ff44', 15, 60, 1.0, 4);
          game.log('Poisoned! ' + e.name + ' takes damage over time!', 'skill');
        }
      });
      return true;
    }
  },

  shadow_step: {
    name: 'Shadow Step',
    key: 'R', manaCost: 18, cooldown: 8.0,
    range: 5, aoe: false, type: 'teleport',
    desc: 'Blink behind an enemy and deliver a devastating backstab',
    color: '#8844ff',
    icon: (ctx) => { drawShadowIcon(ctx); },
    fn(game, player, tx, ty) {
      const target = game.getNearestEnemy(player.px, player.py, tx, ty, 6);
      if (!target) return false;
      // Teleport behind enemy
      const a = Math.atan2(target.py - player.py, target.px - player.px);
      player.px = target.px - Math.cos(a) * CFG.TILE * 1.2;
      player.py = target.py - Math.sin(a) * CFG.TILE * 1.2;
      player.tileX = Math.floor(player.px / CFG.TILE);
      player.tileY = Math.floor(player.py / CFG.TILE);
      player.path = [];
      // Backstab
      const dmg = Math.round(player.calcDamage() * 3.0);
      game.dealDamage(player, target, dmg, '#ff00ff');
      game.particles.emit(target.px, target.py, '#8844ff', 20, 150, 0.5, 5);
      game.log('Shadow Step! Backstab for ' + dmg + ' damage!', 'skill');
      return true;
    }
  },

  // ============ MAGE SKILLS ============
  fireball: {
    name: 'Fireball',
    key: 'Q', manaCost: 12, cooldown: 1.2,
    range: 8, aoe: true, type: 'spell',
    desc: 'Explosive fireball dealing AoE fire damage',
    color: '#ff4400',
    icon: (ctx) => { drawFireIcon(ctx); },
    fn(game, player, tx, ty) {
      const cx = tx * CFG.TILE + CFG.TILE/2;
      const cy = ty * CFG.TILE + CFG.TILE/2;
      game.fireProjectile({
        x: player.px, y: player.py,
        tx: cx, ty: cy,
        speed: 280, damage: Math.round(player.calcDamage() * 1.1),
        color: '#ff6600', owner: 'player', radius: 8,
        onHit: (e, px, py) => {
          // AoE explosion
          const splashPos = { x: px || e.px, y: py || e.py };
          for (const enemy of game.enemies) {
            if (!enemy.alive) continue;
            const d = dist({ x: splashPos.x, y: splashPos.y }, { x: enemy.px, y: enemy.py });
            if (d < 2 * CFG.TILE) {
              const splashDmg = Math.round(player.calcDamage() * 0.6);
              game.dealDamage(player, enemy, splashDmg, '#ff4400');
            }
          }
          game.particles.emit(splashPos.x, splashPos.y, '#ff6600', 25, 180, 0.7, 6);
          game.particles.emit(splashPos.x, splashPos.y, '#ffaa00', 15, 120, 0.5, 4);
        }
      });
      return true;
    }
  },

  chain_lightning: {
    name: 'Chain Lightning',
    key: 'W', manaCost: 22, cooldown: 5.0,
    range: 7, aoe: true, type: 'spell',
    desc: 'Lightning that chains between 4 enemies',
    color: '#ffff00',
    icon: (ctx) => { drawLightningIcon(ctx); },
    fn(game, player, tx, ty) {
      const target = game.getNearestEnemy(player.px, player.py, tx, ty, 8);
      if (!target) return false;
      let current = target;
      const hit = new Set();
      let dmg = Math.round(player.calcDamage() * 1.3);
      for (let chain = 0; chain < 4; chain++) {
        if (!current || hit.has(current.id)) break;
        hit.add(current.id);
        game.dealDamage(player, current, dmg, '#ffff00');
        game.particles.emit(current.px, current.py, '#ffff44', 10, 100, 0.4, 3);
        dmg = Math.round(dmg * 0.7);
        // Find next nearest not yet hit
        let nextTarget = null, bestD = 4 * CFG.TILE;
        for (const e of game.enemies) {
          if (!e.alive || hit.has(e.id)) continue;
          const d = dist({ x: current.px, y: current.py }, { x: e.px, y: e.py });
          if (d < bestD) { bestD = d; nextTarget = e; }
        }
        current = nextTarget;
      }
      game.log('Chain Lightning chained ' + hit.size + ' enemies!', 'skill');
      return true;
    }
  },

  frost_nova: {
    name: 'Frost Nova',
    key: 'E', manaCost: 18, cooldown: 7.0,
    range: 0, aoe: true, type: 'spell',
    desc: 'Freeze all nearby enemies for 3 seconds',
    color: '#88ddff',
    icon: (ctx) => { drawFrostIcon(ctx); },
    fn(game, player, tx, ty) {
      let frozen = 0;
      for (const e of game.enemies) {
        if (!e.alive) continue;
        const d = dist({ x: player.px, y: player.py }, { x: e.px, y: e.py });
        if (d < 3.5 * CFG.TILE) {
          const dmg = Math.round(player.calcDamage() * 0.8);
          game.dealDamage(player, e, dmg, '#88ddff');
          e.addDebuff('frozen', 3.0, { frozen: true });
          frozen++;
        }
      }
      game.particles.emit(player.px, player.py, '#aaddff', 30, 200, 1.0, 6);
      game.log('Frost Nova! Froze ' + frozen + ' enemies!', 'skill');
      return true;
    }
  },

  teleport: {
    name: 'Teleport',
    key: 'R', manaCost: 15, cooldown: 6.0,
    range: 6, aoe: false, type: 'teleport',
    desc: 'Instantly teleport to target location',
    color: '#cc88ff',
    icon: (ctx) => { drawTeleportIcon(ctx); },
    fn(game, player, tx, ty) {
      // Check target is walkable
      if (game.map[ty] && game.map[ty][tx] === TILE.FLOOR) {
        game.particles.emit(player.px, player.py, '#cc88ff', 15, 120, 0.5, 5);
        player.px = tx * CFG.TILE + CFG.TILE/2;
        player.py = ty * CFG.TILE + CFG.TILE/2;
        player.tileX = tx;
        player.tileY = ty;
        player.path = [];
        game.particles.emit(player.px, player.py, '#cc88ff', 15, 120, 0.5, 5);
        game.log('Teleport!', 'skill');
        return true;
      }
      return false;
    }
  },
};

// Class skill mappings
const CLASS_SKILLS = {
  warrior: ['heavy_strike', 'whirlwind', 'battle_cry', 'last_stand'],
  rogue:   ['quick_shot', 'arrow_rain', 'poison_strike', 'shadow_step'],
  mage:    ['fireball', 'chain_lightning', 'frost_nova', 'teleport'],
};

// ============================================================
// Icon drawing helpers
// ============================================================
function drawSwordIcon(ctx, color = '#ff6622') {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth = 1;
  // Blade
  ctx.beginPath();
  ctx.moveTo(24, 6); ctx.lineTo(42, 24); ctx.lineTo(38, 28); ctx.lineTo(20, 10); ctx.closePath();
  ctx.fill();
  // Handle
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(8, 34, 16, 6);
  // Guard
  ctx.fillStyle = '#888';
  ctx.fillRect(18, 28, 12, 4);
}

function drawWhirlwindIcon(ctx) {
  ctx.strokeStyle = '#ff8800';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(24, 24, 14, 0, Math.PI * 1.7);
  ctx.stroke();
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.moveTo(24, 10); ctx.lineTo(30, 16); ctx.lineTo(24, 14); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffaa44';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(24, 24, 8, 0, Math.PI * 1.5);
  ctx.stroke();
}

function drawCryIcon(ctx) {
  ctx.fillStyle = '#ffcc00';
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📣', 24, 24);
}

function drawShieldIcon(ctx, color = '#aaaaff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(24, 4); ctx.lineTo(42, 14); ctx.lineTo(42, 30); ctx.lineTo(24, 44); ctx.lineTo(6, 30); ctx.lineTo(6, 14); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff33';
  ctx.beginPath();
  ctx.moveTo(24, 8); ctx.lineTo(38, 16); ctx.lineTo(24, 22); ctx.closePath();
  ctx.fill();
}

function drawArrowIcon(ctx, color = '#88cc44') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, 40); ctx.lineTo(40, 8);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(40, 8); ctx.lineTo(32, 12); ctx.lineTo(36, 16); ctx.closePath();
  ctx.fill();
  // Fletch
  ctx.fillStyle = '#cc4444';
  ctx.beginPath();
  ctx.moveTo(8, 40); ctx.lineTo(14, 30); ctx.lineTo(18, 34); ctx.closePath();
  ctx.fill();
}

function drawRainIcon(ctx) {
  ctx.fillStyle = '#44cc88';
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 8;
    ctx.beginPath();
    ctx.moveTo(x, 6); ctx.lineTo(x+2, 20); ctx.lineTo(x-2, 20); ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#44ff88';
  for (let i = 0; i < 4; i++) {
    const x = 14 + i * 8;
    ctx.beginPath();
    ctx.moveTo(x, 22); ctx.lineTo(x+2, 42); ctx.lineTo(x-2, 42); ctx.closePath();
    ctx.fill();
  }
}

function drawPoisonIcon(ctx) {
  ctx.fillStyle = '#00cc44';
  ctx.beginPath();
  ctx.arc(24, 20, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(21, 17, 4, 0, Math.PI * 2);
  ctx.fill();
  // Drop
  ctx.fillStyle = '#00cc44';
  ctx.beginPath();
  ctx.moveTo(24, 32); ctx.lineTo(30, 44); ctx.lineTo(18, 44); ctx.closePath();
  ctx.fill();
}

function drawShadowIcon(ctx) {
  ctx.fillStyle = '#6622aa';
  ctx.beginPath();
  ctx.arc(24, 24, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(22, 22, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8844ff';
  ctx.beginPath();
  ctx.arc(26, 26, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawFireIcon(ctx) {
  ctx.fillStyle = '#ff2200';
  ctx.beginPath();
  ctx.moveTo(24, 4); ctx.bezierCurveTo(34, 12, 42, 20, 38, 34);
  ctx.bezierCurveTo(36, 40, 28, 46, 24, 46);
  ctx.bezierCurveTo(20, 46, 12, 40, 10, 34);
  ctx.bezierCurveTo(6, 20, 14, 12, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.moveTo(24, 14); ctx.bezierCurveTo(30, 20, 34, 28, 30, 36);
  ctx.bezierCurveTo(28, 40, 24, 42, 24, 42);
  ctx.bezierCurveTo(20, 38, 18, 34, 20, 28);
  ctx.bezierCurveTo(16, 22, 18, 18, 24, 14);
  ctx.fill();
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath();
  ctx.arc(24, 32, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightningIcon(ctx) {
  ctx.fillStyle = '#ffff44';
  ctx.beginPath();
  ctx.moveTo(30, 4); ctx.lineTo(18, 26); ctx.lineTo(26, 26); ctx.lineTo(16, 44); ctx.lineTo(36, 20); ctx.lineTo(28, 20); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffaa';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(30, 4); ctx.lineTo(21, 22); ctx.lineTo(26, 22); ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFrostIcon(ctx) {
  ctx.strokeStyle = '#88ddff';
  ctx.lineWidth = 3;
  // Snowflake
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(24, 24);
    ctx.lineTo(24 + Math.cos(a) * 18, 24 + Math.sin(a) * 18);
    ctx.stroke();
  }
  ctx.fillStyle = '#aaeeff';
  ctx.beginPath();
  ctx.arc(24, 24, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawTeleportIcon(ctx) {
  ctx.fillStyle = '#cc88ff';
  // Portal ring
  ctx.strokeStyle = '#cc88ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(24, 30, 16, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Character
  ctx.fillStyle = '#ffffff88';
  ctx.beginPath();
  ctx.arc(24, 18, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(20, 24, 8, 10);
  // Sparkles
  ctx.fillStyle = '#eeccff';
  [[10, 10], [36, 14], [12, 36]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  });
}
