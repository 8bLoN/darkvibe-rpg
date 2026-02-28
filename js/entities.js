// ============================================================
// DARKVIBE RPG - Player & Monster Entities
// ============================================================

let nextEntityId = 1;

// ============================================================
// BASE ENTITY
// ============================================================
class Entity {
  constructor(tx, ty) {
    this.id = nextEntityId++;
    this.tileX = tx;
    this.tileY = ty;
    this.px = (tx + 0.5) * CFG.TILE;
    this.py = (ty + 0.5) * CFG.TILE;
    this.hp = 100;
    this.maxHP = 100;
    this.alive = true;
    this.buffs = [];   // { name, duration, props }
    this.debuffs = []; // { name, duration, props, tickTimer }
  }

  addBuff(name, duration, props) {
    this.buffs = this.buffs.filter(b => b.name !== name);
    this.buffs.push({ name, duration, props });
  }

  addDebuff(name, duration, props) {
    this.debuffs = this.debuffs.filter(d => d.name !== name);
    this.debuffs.push({ name, duration, props, tickTimer: 0 });
  }

  hasBuff(name) { return this.buffs.some(b => b.name === name); }
  hasDebuff(name) { return this.debuffs.some(d => d.name === name); }

  isFrozen() { return this.hasDebuff('frozen'); }
  isInvincible() { return this.hasBuff('invincible'); }

  getBuff(name) { return this.buffs.find(b => b.name === name); }
  getDebuff(name) { return this.debuffs.find(d => d.name === name); }

  updateBuffs(dt, game) {
    this.buffs = this.buffs.filter(b => {
      b.duration -= dt;
      return b.duration > 0;
    });

    this.debuffs = this.debuffs.filter(d => {
      d.duration -= dt;
      if (d.props.dotDmg && d.props.dotTick) {
        d.tickTimer += dt;
        if (d.tickTimer >= d.props.dotTick) {
          d.tickTimer -= d.props.dotTick;
          if (game) {
            this.hp = Math.max(0, this.hp - d.props.dotDmg);
            game.floats.push(new FloatingText(this.px, this.py - 20, '-' + d.props.dotDmg, '#00ff44'));
            if (this.hp <= 0 && this.alive) { this.alive = false; }
          }
        }
      }
      return d.duration > 0;
    });
  }

  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  restoreMP(amount) {
    if (this.mp !== undefined) this.mp = Math.min(this.maxMP, this.mp + amount);
  }

  get dmgMult() {
    let m = 1;
    for (const b of this.buffs) if (b.props.dmgMult) m *= b.props.dmgMult;
    return m;
  }
}

// ============================================================
// PLAYER
// ============================================================
class Player extends Entity {
  constructor(className) {
    const s = CLASS_STATS[className];
    super(0, 0);
    this.className = className;
    this.classStats = s;
    this.name = s.name;
    this.color = s.color;

    // Core stats
    this.str = s.str;
    this.vit = s.vit;
    this.ene = s.ene;
    this.dex = s.dex;

    // Derived
    this.maxHP = s.baseHP + s.vit * 3;
    this.maxMP = s.baseMP + s.ene * 2;
    this.hp = this.maxHP;
    this.mp = this.maxMP;
    this.def = s.def;
    this.speed = s.speed * CFG.TILE;
    this.minAtk = s.baseAtk;
    this.maxAtk = s.baseAtk + s.atkRange;

    // Progression
    this.level = 1;
    this.xp = 0;
    this.xpNext = CFG.XP_PER_LEVEL[1];
    this.gold = 0;
    this.kills = 0;

    // Potions
    this.hpPotions = 3;
    this.mpPotions = 3;

    // Equipment
    this.equip = { weapon: null, armor: null, ring: null, amulet: null };

    // Movement
    this.path = [];
    this.moveTarget = null;
    this.facingRight = true;
    this.animFrame = 0;
    this.animTimer = 0;
    this.walkCycle = 0;

    // Combat
    this.attackCooldown = 0;
    this.attackTarget = null;
    this.isAttacking = false;
    this.attackAnim = 0;

    // Skills
    this.skillNames = CLASS_SKILLS[className];
    this.skills = this.skillNames.map(name => SKILLS[name]);
    this.skillCooldowns = new Array(4).fill(0);

    // Visual
    this.hitFlash = 0;
  }

  calcDamage() {
    const base = rnd(this.minAtk, this.maxAtk);
    const strBonus = Math.floor(this.str * 0.4);
    return Math.round((base + strBonus) * this.dmgMult);
  }

  getAttackSpeed() {
    return CFG.AUTO_ATTACK_CD / (1 + (this.dex - 10) * 0.02);
  }

  gainXP(amount, game) {
    this.xp += amount;
    while (this.level < 10 && this.xp >= this.xpNext) {
      this.level++;
      this.xpNext = CFG.XP_PER_LEVEL[Math.min(this.level, 10)];
      game.triggerLevelUp();
    }
  }

  applyLevelUp(stat) {
    switch (stat) {
      case 'str':
        this.str += 5;
        this.minAtk += 2; this.maxAtk += 3;
        break;
      case 'vit':
        this.vit += 5;
        const hpGain = 15;
        this.maxHP += hpGain;
        this.hp = Math.min(this.hp + hpGain, this.maxHP);
        break;
      case 'ene':
        this.ene += 5;
        const mpGain = 12;
        this.maxMP += mpGain;
        this.mp = Math.min(this.mp + mpGain, this.maxMP);
        break;
      case 'dex':
        this.dex += 5;
        this.speed += 0.08 * CFG.TILE;
        break;
    }
    // Restore some HP/MP on level up
    this.hp = Math.min(this.maxHP, this.hp + Math.floor(this.maxHP * 0.2));
    this.mp = Math.min(this.maxMP, this.mp + Math.floor(this.maxMP * 0.3));
  }

  update(dt, game) {
    if (!this.alive) return;

    this.updateBuffs(dt, game);

    // Attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.attackAnim > 0) this.attackAnim -= dt;

    // Hit flash
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Skill cooldowns
    for (let i = 0; i < 4; i++) {
      if (this.skillCooldowns[i] > 0) this.skillCooldowns[i] -= dt;
    }

    // Auto-attack nearest enemy
    if (this.attackTarget && this.attackTarget.alive) {
      const d = dist({ x: this.px, y: this.py }, { x: this.attackTarget.px, y: this.attackTarget.py });
      const attackRange = (this.classStats.attackType === 'ranged' ? CFG.RANGED_RANGE : CFG.MELEE_RANGE) * CFG.TILE;

      if (d <= attackRange && this.attackCooldown <= 0) {
        this._doAttack(game, this.attackTarget);
      } else if (d > attackRange * 2 && this.path.length === 0) {
        this.attackTarget = null;
      }
    }

    // Movement along path
    if (this.path.length > 0 && !this.isFrozen()) {
      const next = this.path[0];
      const tx = (next.x + 0.5) * CFG.TILE;
      const ty = (next.y + 0.5) * CFG.TILE;
      const dx = tx - this.px, dy = ty - this.py;
      const d = Math.hypot(dx, dy);
      const step = this.speed * dt;

      if (d <= step) {
        this.px = tx; this.py = ty;
        this.tileX = next.x; this.tileY = next.y;
        this.path.shift();
      } else {
        this.px += (dx / d) * step;
        this.py += (dy / d) * step;
        if (dx !== 0) this.facingRight = dx > 0;
      }

      // Walk animation
      this.walkCycle += dt * 6;
      this.animTimer += dt;
    } else {
      this.walkCycle = 0;
    }
  }

  _doAttack(game, target) {
    this.attackCooldown = this.getAttackSpeed();
    this.attackAnim = 0.2;
    this.isAttacking = true;

    if (this.classStats.attackType === 'ranged') {
      // Fire a basic projectile
      const color = this.className === 'rogue' ? '#aaff44' : '#aa88ff';
      game.fireProjectile({
        x: this.px, y: this.py,
        tx: target.px, ty: target.py,
        speed: 350, damage: this.calcDamage(),
        color, owner: 'player', radius: 5,
        onHit: (e) => { game.particles.emit(e.px, e.py, color, 6, 60, 0.3, 3); }
      });
    } else {
      // Melee
      const dmg = this.calcDamage();
      game.dealDamage(this, target, dmg, '#ff6644');
      game.particles.emit(target.px, target.py, '#ff4400', 8, 80, 0.3, 3);
    }
    setTimeout(() => { this.isAttacking = false; }, 200);
  }

  useSkill(index, game, tx, ty) {
    if (index < 0 || index >= 4) return;
    const skill = this.skills[index];
    if (!skill) return;
    if (this.skillCooldowns[index] > 0) {
      game.log('Skill on cooldown! ' + this.skillCooldowns[index].toFixed(1) + 's', 'warn');
      return;
    }
    if (this.mp < skill.manaCost) {
      game.log('Not enough mana!', 'warn');
      return;
    }
    const success = skill.fn(game, this, tx, ty);
    if (success) {
      this.mp -= skill.manaCost;
      this.skillCooldowns[index] = skill.cooldown;
    }
  }

  useHPPotion(game) {
    if (this.hpPotions <= 0) { game.log('No health potions!', 'warn'); return; }
    if (this.hp >= this.maxHP) { game.log('HP already full!', 'warn'); return; }
    const heal = Math.min(60, this.maxHP - this.hp);
    this.heal(heal);
    this.hpPotions--;
    game.floats.push(new FloatingText(this.px, this.py - 30, '+' + heal + ' HP', '#44ff88', 18));
    game.log('Used Health Potion (+' + heal + ' HP)', 'heal');
  }

  useMPPotion(game) {
    if (this.mpPotions <= 0) { game.log('No mana potions!', 'warn'); return; }
    if (this.mp >= this.maxMP) { game.log('MP already full!', 'warn'); return; }
    const restore = Math.min(50, this.maxMP - this.mp);
    this.restoreMP(restore);
    this.mpPotions--;
    game.floats.push(new FloatingText(this.px, this.py - 30, '+' + restore + ' MP', '#4488ff', 18));
    game.log('Used Mana Potion (+' + restore + ' MP)', 'info');
  }
}

// ============================================================
// MONSTER
// ============================================================
class Monster extends Entity {
  constructor(type, tx, ty, floorLevel) {
    super(tx, ty);
    this.type = type;
    const s = MONSTER_STATS[type];
    this.name = s.name;
    this.color = s.color;

    // Scale with floor
    const scale = 1 + (floorLevel - 1) * 0.4;
    this.maxHP = Math.round(s.hp * scale);
    this.hp = this.maxHP;
    this.def = Math.round(s.def * scale);
    this.minDmg = Math.round(s.minDmg * scale);
    this.maxDmg = Math.round(s.maxDmg * scale);
    this.speed = s.speed * CFG.TILE;
    this.xpReward = Math.round(s.xp * scale);
    this.goldRange = s.gold;
    this.size = s.size;
    this.attackRange = s.range;
    this.attackSpeed = s.attackSpeed;
    this.aiType = s.aiType;
    this.floorLevel = floorLevel;
    this.isBoss = type === 'boss';

    // AI state
    this.aggroed = false;
    this.attackCooldown = rndF(0, this.attackSpeed); // stagger start
    this.path = [];
    this.pathTimer = 0;
    this.facingRight = true;
    this.walkCycle = 0;
    this.hitFlash = 0;
    this.deathAnim = 1; // for death animation
    this.spawnAnim = 0.5;

    // Ranged projectile delay
    this.rangedTimer = 0;

    // Boss phases
    this.bossPhase = 1;
    this.bossSpecialTimer = 5;
  }

  update(dt, game) {
    if (!this.alive) return;
    if (this.spawnAnim > 0) { this.spawnAnim -= dt; return; } // spawn delay

    this.updateBuffs(dt, game);

    // Hit flash
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const player = game.player;
    if (!player || !player.alive) return;

    const dToPlayer = dist({ x: this.px, y: this.py }, { x: player.px, y: player.py });
    const tileD = dToPlayer / CFG.TILE;

    // Aggro check
    if (!this.aggroed && tileD < CFG.AGGRO_RANGE) this.aggroed = true;
    if (this.aggroed && tileD > CFG.DEAGGRO_RANGE) this.aggroed = false;

    if (!this.aggroed) return;

    // Frozen: skip movement & attack
    if (this.isFrozen()) {
      this.walkCycle = 0;
      return;
    }

    // Boss special behavior
    if (this.isBoss) {
      this.bossSpecialTimer -= dt;
      if (this.bossSpecialTimer <= 0) {
        this.bossSpecialTimer = 6;
        this._bossSpecial(game);
      }
      if (this.hp < this.maxHP * 0.5 && this.bossPhase === 1) {
        this.bossPhase = 2;
        this.speed *= 1.4;
        this.attackSpeed *= 0.7;
        game.log('Malphas enters Phase 2! He rages!', 'warn');
        game.particles.emit(this.px, this.py, '#cc0000', 30, 200, 1.0, 7);
      }
    }

    const attackRangePx = (this.attackRange + 0.5) * CFG.TILE;
    if (dToPlayer <= attackRangePx) {
      // Attack
      if (this.attackCooldown <= 0) {
        this._attack(game, player);
        this.attackCooldown = this.attackSpeed;
      }
      this.path = [];
      this.walkCycle = 0;
    } else {
      // Move toward player
      this.pathTimer -= dt;
      if (this.pathTimer <= 0) {
        this.pathTimer = 0.6 + Math.random() * 0.4;
        this.path = findPath(game.map, this.tileX, this.tileY, player.tileX, player.tileY, 80);
      }

      if (this.path.length > 0) {
        const next = this.path[0];
        const tx = (next.x + 0.5) * CFG.TILE;
        const ty = (next.y + 0.5) * CFG.TILE;
        const dx = tx - this.px, dy = ty - this.py;
        const d = Math.hypot(dx, dy);
        const step = this.speed * dt;

        if (d <= step) {
          this.px = tx; this.py = ty;
          this.tileX = next.x; this.tileY = next.y;
          this.path.shift();
        } else {
          this.px += (dx / d) * step;
          this.py += (dy / d) * step;
          if (dx !== 0) this.facingRight = dx > 0;
        }
        this.walkCycle += dt * 5;
      }
    }
  }

  _attack(game, player) {
    if (this.aiType === 'ranged') {
      game.fireProjectile({
        x: this.px, y: this.py,
        tx: player.px, ty: player.py,
        speed: 220, damage: rnd(this.minDmg, this.maxDmg),
        color: '#ff8844', owner: 'enemy', radius: 5,
        onHit: null
      });
    } else {
      const dmg = Math.max(1, rnd(this.minDmg, this.maxDmg) - player.def);
      if (!player.isInvincible()) {
        player.hp = Math.max(0, player.hp - dmg);
        player.hitFlash = 0.2;
        game.floats.push(new FloatingText(player.px, player.py - 30, '-' + dmg, '#ff4444'));
        game.particles.emit(player.px, player.py, '#cc0000', 6, 60, 0.3, 3);
        if (player.hp <= 0) player.alive = false;

        // Vampire lifesteal
        if (this.aiType === 'vampire') {
          const steal = Math.round(dmg * 0.3);
          this.hp = Math.min(this.maxHP, this.hp + steal);
        }
      }
    }
  }

  _bossSpecial(game) {
    // Boss summons zombies or does area attack
    if (Math.random() < 0.5) {
      // Summon minions
      for (let i = 0; i < 2; i++) {
        const ox = rnd(-3, 3), oy = rnd(-3, 3);
        const nx = clamp(this.tileX + ox, 1, CFG.MAP_W - 2);
        const ny = clamp(this.tileY + oy, 1, CFG.MAP_H - 2);
        if (game.map[ny] && game.map[ny][nx] === TILE.FLOOR) {
          const minion = new Monster('ghoul', nx, ny, 3);
          game.enemies.push(minion);
        }
      }
      game.log('Malphas summons minions!', 'warn');
    } else {
      // Area scream
      const player = game.player;
      const d = dist({ x: this.px, y: this.py }, { x: player.px, y: player.py });
      if (d < 5 * CFG.TILE && !player.isInvincible()) {
        const dmg = Math.max(1, rnd(20, 35) - player.def);
        player.hp = Math.max(0, player.hp - dmg);
        player.hitFlash = 0.3;
        game.floats.push(new FloatingText(player.px, player.py - 30, '-' + dmg + ' SCREAM', '#ff0000', 20));
        game.particles.emit(player.px, player.py, '#ff0000', 20, 150, 0.7, 6);
        if (player.hp <= 0) player.alive = false;
      }
      game.log('Malphas unleashes a death scream!', 'warn');
    }
  }
}
