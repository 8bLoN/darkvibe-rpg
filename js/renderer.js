// ============================================================
// DARKVIBE RPG - Canvas Renderer
// ============================================================

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
  }

  get ctx2d() { return this.ctx; }

  // ---- Camera ----
  getCameraOffset(px, py) {
    return {
      cx: Math.round(px - this.W / 2),
      cy: Math.round(py - this.H / 2),
    };
  }

  // ---- DRAW MAP ----
  drawMap(map, camX, camY, time) {
    const ctx = this.ctx;
    const T = CFG.TILE;
    const startX = Math.max(0, Math.floor(camX / T));
    const startY = Math.max(0, Math.floor(camY / T));
    const endX   = Math.min(map[0].length, Math.ceil((camX + this.W) / T) + 1);
    const endY   = Math.min(map.length,    Math.ceil((camY + this.H) / T) + 1);

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const tile = map[ty][tx];
        const sx = tx * T - camX;
        const sy = ty * T - camY;

        if (tile === TILE.WALL) {
          this._drawWall(ctx, sx, sy, T, tx, ty);
        } else if (tile === TILE.FLOOR) {
          this._drawFloor(ctx, sx, sy, T, tx, ty);
        } else if (tile === TILE.STAIRS) {
          this._drawFloor(ctx, sx, sy, T, tx, ty);
          this._drawStairs(ctx, sx, sy, T, time);
        } else if (tile === TILE.CHEST) {
          this._drawFloor(ctx, sx, sy, T, tx, ty);
        }
      }
    }
  }

  _drawWall(ctx, sx, sy, T, tx, ty) {
    // Stone wall: dark with texture
    const shade = ((tx + ty) % 2 === 0) ? '#151212' : '#111010';
    ctx.fillStyle = shade;
    ctx.fillRect(sx, sy, T, T);

    // Top face (lighter)
    ctx.fillStyle = '#221c1c';
    ctx.fillRect(sx, sy, T, 4);

    // Brick lines (subtle)
    ctx.fillStyle = '#0a0808';
    if (ty % 3 === 0) {
      ctx.fillRect(sx, sy + T/2, T, 1);
    }
    if ((tx + Math.floor(ty/3)) % 2 === 0) {
      ctx.fillRect(sx + T/2, sy + T/2, 1, T/2);
    } else {
      ctx.fillRect(sx, sy + T/2, 1, T/2);
    }
  }

  _drawFloor(ctx, sx, sy, T, tx, ty) {
    const shade = ((tx + ty) % 2 === 0) ? '#1c1c1c' : '#181818';
    ctx.fillStyle = shade;
    ctx.fillRect(sx, sy, T, T);

    // Subtle tile grout
    ctx.fillStyle = '#111111';
    ctx.fillRect(sx, sy, T, 1);
    ctx.fillRect(sx, sy, 1, T);
  }

  _drawStairs(ctx, sx, sy, T, time) {
    // Gold glowing portal
    const pulse = 0.7 + 0.3 * Math.sin(time * 3);
    ctx.fillStyle = `rgba(180, 130, 30, ${pulse * 0.5})`;
    ctx.fillRect(sx + 4, sy + 4, T - 8, T - 8);

    ctx.strokeStyle = `rgba(220, 180, 60, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 6, sy + 6, T - 12, T - 12);

    // Steps
    ctx.fillStyle = `rgba(200, 160, 50, ${pulse * 0.8})`;
    for (let i = 0; i < 3; i++) {
      const off = 8 + i * 5;
      ctx.fillRect(sx + off, sy + off, T - off * 2, 2);
    }
  }

  drawChest(ctx, tx, ty, camX, camY, opened, time) {
    const T = CFG.TILE;
    const sx = tx * T - camX + 4;
    const sy = ty * T - camY + 6;
    const w = T - 8, h = T - 10;

    if (opened) {
      ctx.fillStyle = '#3a2008';
      ctx.fillRect(sx, sy + h/2, w, h/2);
      ctx.fillStyle = '#2a1400';
      ctx.fillRect(sx, sy, w, h/2);
      return;
    }

    // Chest body
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(sx, sy, w, h);

    // Lid
    ctx.fillStyle = '#6a3818';
    ctx.fillRect(sx, sy, w, h * 0.4);

    // Metal bands
    ctx.fillStyle = '#c8a830';
    ctx.fillRect(sx, sy + h * 0.35, w, 3);
    ctx.fillRect(sx + w/2 - 2, sy, 4, h);

    // Keyhole
    ctx.fillStyle = '#c8a830';
    ctx.beginPath();
    ctx.arc(sx + w/2, sy + h * 0.65, 4, 0, Math.PI * 2);
    ctx.fill();

    // Glow if nearby
    const glow = 0.3 + 0.2 * Math.sin(time * 2);
    ctx.fillStyle = `rgba(200, 168, 48, ${glow * 0.3})`;
    ctx.fillRect(sx - 2, sy - 2, w + 4, h + 4);
  }

  // ---- DRAW PLAYER ----
  drawPlayer(player, camX, camY, time) {
    const ctx = this.ctx;
    const sx = player.px - camX;
    const sy = player.py - camY;
    const T = CFG.TILE;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + T * 0.3, T * 0.4, T * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hit flash
    if (player.hitFlash > 0) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ff3333';
    }

    // Flip if facing left
    if (!player.facingRight) {
      ctx.translate(sx, sy);
      ctx.scale(-1, 1);
      ctx.translate(-sx, -sy);
    }

    const walk = Math.sin(player.walkCycle) * 3;
    const bodyY = sy - 4 + (player.walkCycle !== 0 ? Math.abs(Math.sin(player.walkCycle)) * -2 : 0);

    switch (player.className) {
      case 'warrior': this._drawWarrior(ctx, sx, bodyY, walk, player, time); break;
      case 'rogue':   this._drawRogue(ctx, sx, bodyY, walk, player, time); break;
      case 'mage':    this._drawMage(ctx, sx, bodyY, walk, player, time); break;
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // HP bar above player
    this._drawEntityHPBar(ctx, sx, sy - T * 0.6, player.hp / player.maxHP, T * 0.8, '#22cc44');

    // Buff indicators
    let buffX = sx - 16;
    for (const b of player.buffs) {
      ctx.fillStyle = b.name === 'rage' ? '#ff8800' : '#aaaaff';
      ctx.beginPath();
      ctx.arc(buffX, sy - T * 0.7 - 10, 4, 0, Math.PI * 2);
      ctx.fill();
      buffX += 10;
    }
  }

  _drawWarrior(ctx, sx, sy, walk, player, time) {
    const atk = player.attackAnim > 0;
    // Legs
    ctx.fillStyle = '#444466';
    ctx.fillRect(sx - 7, sy + 10, 6, 14 + (walk > 0 ? walk : 0));
    ctx.fillRect(sx + 1, sy + 10, 6, 14 - (walk > 0 ? walk : 0));
    // Body (plate armor)
    ctx.fillStyle = '#667799';
    ctx.fillRect(sx - 9, sy - 6, 18, 18);
    // Armor highlight
    ctx.fillStyle = '#889aaa';
    ctx.fillRect(sx - 7, sy - 4, 5, 6);
    // Head (helmet)
    ctx.fillStyle = '#8899bb';
    ctx.fillRect(sx - 7, sy - 20, 14, 14);
    ctx.fillStyle = '#aabbcc';
    ctx.fillRect(sx - 5, sy - 22, 10, 4); // crest
    ctx.fillStyle = '#223344';
    ctx.fillRect(sx - 4, sy - 16, 8, 4); // visor
    // Sword
    ctx.save();
    if (atk) ctx.rotate(0.4);
    ctx.fillStyle = '#ccccdd';
    ctx.fillRect(sx + 9, sy - 14, 4, 20);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(sx + 9, sy + 4, 4, 6);
    ctx.fillStyle = '#aaaacc';
    ctx.fillRect(sx + 5, sy - 2, 12, 3);
    ctx.restore();
    // Shield
    ctx.fillStyle = '#667799';
    ctx.beginPath();
    ctx.moveTo(sx - 14, sy - 10); ctx.lineTo(sx - 14, sy + 8); ctx.lineTo(sx - 9, sy + 14); ctx.lineTo(sx - 9, sy - 10); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cc4400';
    ctx.beginPath();
    ctx.arc(sx - 11, sy + 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawRogue(ctx, sx, sy, walk, player, time) {
    const atk = player.attackAnim > 0;
    // Legs
    ctx.fillStyle = '#2a3a2a';
    ctx.fillRect(sx - 5, sy + 10, 5, 14 + (walk > 0 ? walk : 0));
    ctx.fillRect(sx + 1, sy + 10, 5, 14 - (walk > 0 ? walk : 0));
    // Body (leather)
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(sx - 8, sy - 5, 16, 16);
    ctx.fillStyle = '#224422';
    ctx.fillRect(sx - 6, sy - 3, 3, 8);
    // Head (hood)
    ctx.fillStyle = '#1a2a1a';
    ctx.beginPath();
    ctx.arc(sx, sy - 14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - 9, sy - 14, 18, 10);
    // Face shadow
    ctx.fillStyle = '#0a1a0a';
    ctx.fillRect(sx - 5, sy - 17, 10, 6);
    // Eyes (glowing green)
    ctx.fillStyle = '#44ff44';
    ctx.fillRect(sx - 3, sy - 15, 2, 2);
    ctx.fillRect(sx + 1, sy - 15, 2, 2);
    // Dagger
    ctx.save();
    if (atk) { ctx.translate(sx + 8, sy); ctx.rotate(0.5); ctx.translate(-(sx + 8), -sy); }
    ctx.fillStyle = '#88cc88';
    ctx.fillRect(sx + 8, sy - 8, 3, 14);
    ctx.fillStyle = '#556633';
    ctx.fillRect(sx + 8, sy + 4, 3, 5);
    ctx.restore();
    // Bow on back
    ctx.strokeStyle = '#664422';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx - 12, sy, 10, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
  }

  _drawMage(ctx, sx, sy, walk, player, time) {
    const atk = player.attackAnim > 0;
    const staffGlow = 0.5 + 0.5 * Math.sin(time * 4);
    // Robes
    ctx.fillStyle = '#2a0a44';
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 4); ctx.lineTo(sx + 10, sy - 4);
    ctx.lineTo(sx + 12, sy + 24); ctx.lineTo(sx - 12, sy + 24); ctx.closePath();
    ctx.fill();
    // Robe highlight
    ctx.fillStyle = '#3a1a5a';
    ctx.fillRect(sx - 2, sy - 4, 4, 20);
    // Arms
    ctx.fillStyle = '#2a0a44';
    ctx.fillRect(sx - 14, sy - 2, 6, 10);
    ctx.fillRect(sx + 8, sy - 2, 6, 10);
    // Head
    ctx.fillStyle = '#d4b896';
    ctx.beginPath();
    ctx.arc(sx, sy - 16, 8, 0, Math.PI * 2);
    ctx.fill();
    // Hat
    ctx.fillStyle = '#220044';
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 18); ctx.lineTo(sx, sy - 36); ctx.lineTo(sx + 10, sy - 18); ctx.closePath();
    ctx.fill();
    ctx.fillRect(sx - 12, sy - 20, 24, 3);
    // Eyes (blue glow)
    ctx.fillStyle = '#6688ff';
    ctx.fillRect(sx - 3, sy - 18, 2, 2);
    ctx.fillRect(sx + 1, sy - 18, 2, 2);
    // Staff
    ctx.save();
    if (atk) { ctx.translate(sx + 12, sy - 4); ctx.rotate(-0.3); ctx.translate(-(sx + 12), -(sy - 4)); }
    ctx.strokeStyle = '#664422';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 14); ctx.lineTo(sx + 12, sy - 28); ctx.stroke();
    // Orb
    ctx.shadowColor = '#aa88ff';
    ctx.shadowBlur = 12 * staffGlow;
    ctx.fillStyle = `rgba(170, 136, 255, ${staffGlow})`;
    ctx.beginPath();
    ctx.arc(sx + 12, sy - 28, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ---- DRAW MONSTER ----
  drawMonster(monster, camX, camY, time) {
    if (!monster.alive) return;
    const ctx = this.ctx;
    const sx = monster.px - camX;
    const sy = monster.py - camY;
    const T = CFG.TILE;
    const sz = monster.size;

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + T * 0.3 * sz, T * 0.38 * sz, T * 0.1 * sz, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hit flash
    if (monster.hitFlash > 0) ctx.globalAlpha = 0.7;

    if (!monster.facingRight) {
      ctx.translate(sx, sy); ctx.scale(-1, 1); ctx.translate(-sx, -sy);
    }

    const frozen = monster.isFrozen();
    if (frozen) ctx.filter = 'hue-rotate(180deg) brightness(1.5)';

    const walk = Math.sin(monster.walkCycle) * 3;

    switch (monster.type) {
      case 'zombie':    this._drawZombie(ctx, sx, sy, walk, sz, monster.color, time); break;
      case 'skeleton':  this._drawSkeleton(ctx, sx, sy, walk, sz, monster.color, time); break;
      case 'ghoul':     this._drawGhoul(ctx, sx, sy, walk, sz, monster.color, time); break;
      case 'darkknight':this._drawDarkKnight(ctx, sx, sy, walk, sz, monster.color, time); break;
      case 'vampire':   this._drawVampire(ctx, sx, sy, walk, sz, monster.color, time); break;
      case 'lich':      this._drawLich(ctx, sx, sy, walk, sz, monster.color, time); break;
      case 'boss':      this._drawBoss(ctx, sx, sy, walk, sz, monster.color, time); break;
      default:          this._drawGeneric(ctx, sx, sy, walk, sz, monster.color); break;
    }

    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    ctx.restore();

    // HP bar
    const barW = T * 0.9 * sz;
    this._drawEntityHPBar(ctx, sx, sy - T * 0.65 * sz, monster.hp / monster.maxHP, barW, '#cc2200');

    // Name for boss
    if (monster.isBoss) {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 13px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(monster.name, sx, sy - T * 0.9);
    }

    // Frozen overlay
    if (monster.isFrozen()) {
      ctx.fillStyle = 'rgba(136, 200, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, T * 0.5 * sz, T * 0.7 * sz, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawZombie(ctx, sx, sy, walk, sz, color, t) {
    ctx.fillStyle = color;
    // Legs (stumbling)
    ctx.fillRect(sx - 7*sz, sy + 8*sz, 6*sz, 16*sz + walk*sz);
    ctx.fillRect(sx + 1*sz, sy + 8*sz, 6*sz, 14*sz - walk*sz);
    // Body (hunched)
    ctx.fillRect(sx - 9*sz, sy - 6*sz, 18*sz, 16*sz);
    // Arm (outstretched)
    ctx.fillRect(sx + 9*sz, sy - 4*sz, 12*sz, 5*sz);
    ctx.fillRect(sx - 21*sz, sy - 2*sz, 12*sz, 5*sz);
    // Head
    ctx.fillStyle = lerpColor(color, '#aaaaaa', 0.3);
    ctx.fillRect(sx - 7*sz, sy - 20*sz, 14*sz, 14*sz);
    // Eyes
    ctx.fillStyle = '#ff3300';
    ctx.fillRect(sx - 4*sz, sy - 16*sz, 3*sz, 3*sz);
    ctx.fillRect(sx + 1*sz, sy - 16*sz, 3*sz, 3*sz);
  }

  _drawSkeleton(ctx, sx, sy, walk, sz, color, t) {
    // Bones
    ctx.fillStyle = color;
    // Legs
    ctx.fillRect(sx - 4*sz, sy + 10*sz, 3*sz, 14*sz + walk*sz);
    ctx.fillRect(sx + 1*sz, sy + 10*sz, 3*sz, 12*sz - walk*sz);
    // Ribcage
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 7*sz, sy - 4*sz, 14*sz, 14*sz);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(sx - 7*sz, sy - 2*sz + i*4*sz); ctx.lineTo(sx + 7*sz, sy - 2*sz + i*4*sz); ctx.stroke();
    }
    // Skull
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, sy - 14*sz, 8*sz, 0, Math.PI * 2); ctx.fill();
    // Eye holes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(sx - 3*sz, sy - 16*sz, 2*sz, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 3*sz, sy - 16*sz, 2*sz, 0, Math.PI * 2); ctx.fill();
    // Bow
    ctx.strokeStyle = '#664422';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx + 16*sz, sy - 4*sz, 8*sz, -0.7, 0.7); ctx.stroke();
  }

  _drawGhoul(ctx, sx, sy, walk, sz, color, t) {
    ctx.fillStyle = color;
    const lean = Math.sin(t * 6) * 3;
    // Hunched body
    ctx.save(); ctx.translate(sx, sy + 4*sz); ctx.rotate(lean * 0.04);
    ctx.fillRect(-9*sz, -8*sz, 18*sz, 18*sz);
    // Arms (clawed)
    ctx.fillRect(9*sz, -6*sz, 16*sz, 4*sz);
    ctx.fillRect(-25*sz, -4*sz, 16*sz, 4*sz);
    // Head (low)
    ctx.fillStyle = lerpColor(color, '#222', 0.5);
    ctx.fillRect(-6*sz, -20*sz, 12*sz, 12*sz);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-3*sz, -17*sz, 3*sz, 3*sz);
    ctx.fillRect(2*sz, -17*sz, 3*sz, 3*sz);
    // Claws
    ctx.fillStyle = '#888866';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(22*sz + i*3*sz, -8*sz, 2*sz, 6*sz);
    }
    ctx.restore();
    // Legs
    ctx.fillRect(sx - 7*sz, sy + 12*sz, 5*sz, 12*sz + walk*sz);
    ctx.fillRect(sx + 2*sz, sy + 12*sz, 5*sz, 10*sz - walk*sz);
  }

  _drawDarkKnight(ctx, sx, sy, walk, sz, color, t) {
    // Heavy armor
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(sx - 7*sz, sy + 8*sz, 6*sz, 16*sz + walk*sz);
    ctx.fillRect(sx + 1*sz, sy + 8*sz, 6*sz, 16*sz - walk*sz);
    ctx.fillStyle = '#334466';
    ctx.fillRect(sx - 10*sz, sy - 8*sz, 20*sz, 18*sz);
    // Shoulder pads
    ctx.fillStyle = color;
    ctx.fillRect(sx - 14*sz, sy - 10*sz, 8*sz, 8*sz);
    ctx.fillRect(sx + 6*sz, sy - 10*sz, 8*sz, 8*sz);
    // Helmet
    ctx.fillStyle = '#2a3a55';
    ctx.fillRect(sx - 8*sz, sy - 24*sz, 16*sz, 16*sz);
    ctx.fillStyle = '#1a2a44';
    ctx.fillRect(sx - 6*sz, sy - 20*sz, 12*sz, 5*sz); // visor
    // Glowing eyes
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 6;
    ctx.fillRect(sx - 3*sz, sy - 19*sz, 2*sz, 2*sz);
    ctx.fillRect(sx + 1*sz, sy - 19*sz, 2*sz, 2*sz);
    ctx.shadowBlur = 0;
    // Sword
    ctx.fillStyle = '#334';
    ctx.fillRect(sx + 12*sz, sy - 20*sz, 3*sz, 30*sz);
    ctx.fillStyle = '#556';
    ctx.fillRect(sx + 8*sz, sy - 4*sz, 10*sz, 3*sz);
  }

  _drawVampire(ctx, sx, sy, walk, sz, color, t) {
    const floatOff = Math.sin(t * 2) * 3;
    // Cape
    ctx.fillStyle = '#440022';
    ctx.beginPath();
    ctx.moveTo(sx - 12*sz, sy - 6*sz + floatOff);
    ctx.lineTo(sx - 14*sz, sy + 24*sz + floatOff);
    ctx.lineTo(sx + 14*sz, sy + 24*sz + floatOff);
    ctx.lineTo(sx + 12*sz, sy - 6*sz + floatOff);
    ctx.closePath();
    ctx.fill();
    // Body
    ctx.fillStyle = '#221122';
    ctx.fillRect(sx - 8*sz, sy - 8*sz + floatOff, 16*sz, 20*sz);
    // Head
    ctx.fillStyle = '#d4a0a0';
    ctx.beginPath(); ctx.arc(sx, sy - 18*sz + floatOff, 9*sz, 0, Math.PI * 2); ctx.fill();
    // Hair
    ctx.fillStyle = '#1a0011';
    ctx.fillRect(sx - 9*sz, sy - 26*sz + floatOff, 18*sz, 8*sz);
    // Fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx - 2*sz, sy - 12*sz + floatOff, 2*sz, 4*sz);
    ctx.fillRect(sx + 2*sz, sy - 12*sz + floatOff, 2*sz, 4*sz);
    // Eyes
    ctx.fillStyle = '#ff0044';
    ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 8;
    ctx.fillRect(sx - 4*sz, sy - 20*sz + floatOff, 3*sz, 3*sz);
    ctx.fillRect(sx + 1*sz, sy - 20*sz + floatOff, 3*sz, 3*sz);
    ctx.shadowBlur = 0;
    // Blood drip
    if (Math.random() < 0.02) {
      ctx.fillStyle = '#cc0000';
      ctx.beginPath(); ctx.arc(sx, sy - 12*sz + floatOff, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawLich(ctx, sx, sy, walk, sz, color, t) {
    const bob = Math.sin(t * 2) * 4;
    const glow = 0.6 + 0.4 * Math.sin(t * 3);
    // Robes
    ctx.fillStyle = '#1a0033';
    ctx.beginPath();
    ctx.moveTo(sx - 12*sz, sy - 4*sz + bob); ctx.lineTo(sx + 12*sz, sy - 4*sz + bob);
    ctx.lineTo(sx + 8*sz, sy + 28*sz + bob); ctx.lineTo(sx - 8*sz, sy + 28*sz + bob); ctx.closePath();
    ctx.fill();
    // Skull
    ctx.fillStyle = '#ccbbaa';
    ctx.beginPath(); ctx.arc(sx, sy - 18*sz + bob, 10*sz, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(sx - 3*sz, sy - 20*sz + bob, 2*sz, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 3*sz, sy - 20*sz + bob, 2*sz, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(sx - 2*sz, sy - 13*sz + bob, 1*sz, 3*sz);
    ctx.fillRect(sx + 1*sz, sy - 13*sz + bob, 1*sz, 3*sz);
    // Staff
    ctx.strokeStyle = '#4400aa';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx + 14*sz, sy + 20*sz + bob); ctx.lineTo(sx + 14*sz, sy - 28*sz + bob); ctx.stroke();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 * glow;
    ctx.fillStyle = `rgba(100, 0, 200, ${glow})`;
    ctx.beginPath(); ctx.arc(sx + 14*sz, sy - 28*sz + bob, 7*sz, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Purple eye glow
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.fillRect(sx - 3*sz, sy - 20*sz + bob, 2*sz, 2*sz);
    ctx.fillRect(sx + 1*sz, sy - 20*sz + bob, 2*sz, 2*sz);
    ctx.shadowBlur = 0;
  }

  _drawBoss(ctx, sx, sy, walk, sz, color, t) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 2);
    // Aura
    ctx.shadowColor = color; ctx.shadowBlur = 30 * pulse;
    ctx.fillStyle = `rgba(200, 30, 0, ${pulse * 0.15})`;
    ctx.beginPath(); ctx.arc(sx, sy, 30*sz, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Massive armored body
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(sx - 14*sz, sy + 6*sz, 12*sz, 24*sz + walk*sz*0.5);
    ctx.fillRect(sx + 2*sz, sy + 6*sz, 12*sz, 22*sz - walk*sz*0.5);

    ctx.fillStyle = '#880000';
    ctx.fillRect(sx - 16*sz, sy - 14*sz, 32*sz, 24*sz);

    // Shoulder spikes
    ctx.fillStyle = '#330000';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx - 18*sz + i*2*sz, sy - 14*sz);
      ctx.lineTo(sx - 20*sz + i*2*sz, sy - 28*sz + i*3*sz);
      ctx.lineTo(sx - 14*sz + i*2*sz, sy - 14*sz);
      ctx.closePath(); ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sx + 14*sz + i*2*sz, sy - 14*sz);
      ctx.lineTo(sx + 16*sz + i*2*sz, sy - 28*sz + i*3*sz);
      ctx.lineTo(sx + 18*sz + i*2*sz, sy - 14*sz);
      ctx.closePath(); ctx.fill();
    }

    // Demonic helmet
    ctx.fillStyle = '#550000';
    ctx.fillRect(sx - 12*sz, sy - 34*sz, 24*sz, 22*sz);
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx - 10*sz, sy - 28*sz, 20*sz, 6*sz); // visor
    // Horns
    ctx.fillStyle = '#220000';
    ctx.beginPath();
    ctx.moveTo(sx - 12*sz, sy - 34*sz); ctx.lineTo(sx - 18*sz, sy - 50*sz); ctx.lineTo(sx - 6*sz, sy - 34*sz); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx + 6*sz, sy - 34*sz); ctx.lineTo(sx + 18*sz, sy - 50*sz); ctx.lineTo(sx + 12*sz, sy - 34*sz); ctx.closePath();
    ctx.fill();

    // Glowing red eyes
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 16 * pulse;
    ctx.fillRect(sx - 6*sz, sy - 26*sz, 4*sz, 4*sz);
    ctx.fillRect(sx + 2*sz, sy - 26*sz, 4*sz, 4*sz);
    ctx.shadowBlur = 0;

    // Giant sword
    ctx.fillStyle = '#221100';
    ctx.fillRect(sx + 18*sz, sy - 32*sz, 5*sz, 40*sz);
    ctx.fillStyle = '#554400';
    ctx.fillRect(sx + 10*sz, sy - 12*sz, 20*sz, 4*sz);
    ctx.fillStyle = '#cc2200';
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
    ctx.fillRect(sx + 19*sz, sy - 32*sz, 3*sz, 20*sz);
    ctx.shadowBlur = 0;
  }

  _drawGeneric(ctx, sx, sy, walk, sz, color) {
    ctx.fillStyle = color;
    ctx.fillRect(sx - 8*sz, sy + 8*sz, 7*sz, 16*sz);
    ctx.fillRect(sx + 1*sz, sy + 8*sz, 7*sz, 14*sz);
    ctx.fillRect(sx - 9*sz, sy - 8*sz, 18*sz, 18*sz);
    ctx.beginPath(); ctx.arc(sx, sy - 16*sz, 8*sz, 0, Math.PI * 2); ctx.fill();
  }

  // ---- DRAW LOOT ITEM ----
  drawDropItem(item, camX, camY, time) {
    const ctx = this.ctx;
    const sx = item.px - camX;
    const sy = item.py - camY;
    const bob = Math.sin(time * 3 + item.bobOffset) * 3;

    // Glow
    ctx.shadowColor = item.item.color;
    ctx.shadowBlur = 8;

    // Draw by type
    const idata = item.item;
    ctx.fillStyle = idata.color;
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(idata.glyph || '•', sx, sy - 4 + bob);

    ctx.shadowBlur = 0;
  }

  // ---- HELPERS ----
  _drawEntityHPBar(ctx, sx, sy, fraction, width, color) {
    const h = 5, bw = width;
    ctx.fillStyle = '#111';
    ctx.fillRect(sx - bw/2, sy, bw, h);
    ctx.fillStyle = fraction > 0.5 ? color : fraction > 0.25 ? '#cc8800' : '#cc0000';
    ctx.fillRect(sx - bw/2, sy, bw * clamp(fraction, 0, 1), h);
  }

  // ---- DRAW MOVE INDICATOR ----
  drawMoveIndicator(tx, ty, camX, camY, time) {
    if (tx < 0) return;
    const ctx = this.ctx;
    const sx = tx * CFG.TILE - camX;
    const sy = ty * CFG.TILE - camY;
    const alpha = 0.5 + 0.4 * Math.sin(time * 8);
    ctx.strokeStyle = `rgba(200, 200, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 4, sy + 4, CFG.TILE - 8, CFG.TILE - 8);
  }

  // ---- DRAW MINIMAP ----
  drawMinimap(canvas, map, player, enemies, rooms) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const MW = map[0].length, MH = map.length;
    const scaleX = W / MW, scaleY = H / MH;

    ctx.fillStyle = '#050305';
    ctx.fillRect(0, 0, W, H);

    for (let ty = 0; ty < MH; ty++) {
      for (let tx = 0; tx < MW; tx++) {
        const t = map[ty][tx];
        if (t === TILE.WALL) continue;
        ctx.fillStyle = t === TILE.STAIRS ? '#c8a830' : t === TILE.CHEST ? '#884422' : '#2a2a2a';
        ctx.fillRect(tx * scaleX, ty * scaleY, scaleX + 0.5, scaleY + 0.5);
      }
    }

    // Enemies (red dots)
    for (const e of enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.isBoss ? '#ff0000' : '#aa2200';
      ctx.fillRect(e.tileX * scaleX - 1, e.tileY * scaleY - 1, 3, 3);
    }

    // Player (white dot)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.tileX * scaleX - 2, player.tileY * scaleY - 2, 5, 5);

    // Border
    ctx.strokeStyle = '#3a2a14';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }

  // ---- OVERLAY EFFECTS ----
  drawDamageVignette(ctx, alpha) {
    const grad = ctx.createRadialGradient(this.W/2, this.H/2, this.H*0.3, this.W/2, this.H/2, this.H*0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(180,0,0,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  drawAmbientVignette(ctx) {
    const grad = ctx.createRadialGradient(this.W/2, this.H/2, this.H*0.2, this.W/2, this.H/2, this.H*0.85);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);
  }

  // ---- CLEAR ----
  clear() {
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }
}
