// ============================================================
// DARKVIBE RPG - UI Manager
// ============================================================

class UIManager {
  constructor(game) {
    this.game = game;
    this.currentScreen = 'menu';
    this.msgQueue = [];
    this.msgTimer = 0;
    this.msgMax = 5;
    this.damageVignetteAlpha = 0;

    this._bindMenuEvents();
  }

  _bindMenuEvents() {
    // Menu
    document.getElementById('btn-play').onclick = () => this.showScreen('class');
    document.getElementById('btn-help').onclick = () => this.showScreen('help');
    document.getElementById('btn-help-back').onclick = () => this.showScreen('menu');
    document.getElementById('btn-class-back').onclick = () => this.showScreen('menu');

    // Class selection
    document.querySelectorAll('.select-btn').forEach(btn => {
      btn.onclick = (e) => {
        const cls = e.target.dataset.class;
        this.game.startGame(cls);
      };
    });

    // Level up
    document.querySelectorAll('.stat-choice').forEach(btn => {
      btn.onclick = (e) => {
        const stat = e.currentTarget.dataset.stat;
        this.game.player.applyLevelUp(stat);
        this.hideLevelUp();
        this.game.paused = false;
        const statNames = { str: 'Strength', vit: 'Vitality', ene: 'Energy', dex: 'Dexterity' };
        this.game.log('Increased ' + statNames[stat] + '!', 'loot');
      };
    });

    // Game over
    document.getElementById('btn-retry').onclick = () => {
      this.game.startGame(this.game.player ? this.game.player.className : 'warrior');
    };
    document.getElementById('btn-go-menu').onclick = () => {
      this.showScreen('menu');
      this.game.running = false;
    };
    document.getElementById('btn-play-again').onclick = () => {
      this.showScreen('class');
      this.game.running = false;
    };

    // Canvas input
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('click', (e) => this.game.onCanvasClick(e, false));
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this.game.onCanvasClick(e, true); });
    canvas.addEventListener('mousemove', (e) => this.game.onMouseMove(e));

    // Keyboard
    document.addEventListener('keydown', (e) => this.game.onKeyDown(e));

    // Potion buttons
    document.getElementById('potion-hp').onclick = () => this.game.player && this.game.player.useHPPotion(this.game);
    document.getElementById('potion-mp').onclick = () => this.game.player && this.game.player.useMPPotion(this.game);

    // Skill slots
    const skillKeys = ['q', 'w', 'e', 'r'];
    skillKeys.forEach((k, i) => {
      document.getElementById('slot-' + k).onclick = () => {
        if (this.game.player) {
          const mx = this.game.mouseX || 0, my = this.game.mouseY || 0;
          const { cx, cy } = this.game.renderer.getCameraOffset(this.game.player.px, this.game.player.py);
          const tx = Math.floor((mx + cx) / CFG.TILE);
          const ty = Math.floor((my + cy) / CFG.TILE);
          this.game.player.useSkill(i, this.game, tx, ty);
        }
      };
    });

    window.addEventListener('resize', () => this.game.renderer && this.game.renderer.resize());
  }

  showScreen(name) {
    // Hide all
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    this.currentScreen = name;

    const map = {
      menu: 'menu-screen',
      help: 'help-screen',
      class: 'class-screen',
      game: 'hud',
      gameover: 'gameover-screen',
      victory: 'victory-screen',
    };
    const id = map[name];
    if (id) document.getElementById(id).classList.add('active');
  }

  showGameOver(stats) {
    document.getElementById('gameover-info').innerHTML =
      `Floor reached: ${stats.floor}<br>Kills: ${stats.kills}<br>Level: ${stats.level}<br>Gold collected: ${stats.gold}`;
    this.showScreen('gameover');
  }

  showVictory(stats) {
    document.getElementById('victory-info').innerHTML =
      `<strong>${stats.className} - Level ${stats.level}</strong><br>
      Kills: ${stats.kills} enemies slain<br>
      Gold collected: ${stats.gold}<br>
      You have defeated Malphas the Undying!`;
    this.showScreen('victory');
  }

  showLevelUp(level) {
    document.getElementById('levelup-info').textContent = 'You reached level ' + level + '!';
    document.getElementById('levelup-popup').classList.add('active');
  }

  hideLevelUp() {
    document.getElementById('levelup-popup').classList.remove('active');
  }

  update(dt, player) {
    if (!player) return;

    // HP bar
    const hpPct = clamp(player.hp / player.maxHP * 100, 0, 100);
    document.getElementById('hp-bar').style.width = hpPct + '%';
    document.getElementById('hp-val').textContent = Math.ceil(player.hp) + '/' + player.maxHP;

    // MP bar
    const mpPct = clamp(player.mp / player.maxMP * 100, 0, 100);
    document.getElementById('mp-bar').style.width = mpPct + '%';
    document.getElementById('mp-val').textContent = Math.ceil(player.mp) + '/' + player.maxMP;

    // XP bar
    const prevXP = player.level > 1 ? CFG.XP_PER_LEVEL[player.level - 1] : 0;
    const nextXP = player.xpNext;
    const xpPct = clamp((player.xp - prevXP) / (nextXP - prevXP) * 100, 0, 100);
    document.getElementById('xp-bar').style.width = xpPct + '%';

    // Info
    document.getElementById('player-class-name').textContent = player.name.toUpperCase();
    document.getElementById('player-level-text').textContent = 'LVL ' + player.level;
    document.getElementById('gold-text').textContent = 'Gold: ' + player.gold;
    document.getElementById('floor-text').textContent = 'Floor: ' + this.game.floor;

    // Potions
    document.getElementById('hp-pot-count').textContent = player.hpPotions;
    document.getElementById('mp-pot-count').textContent = player.mpPotions;

    // Skill cooldowns
    const skillKeys = ['q', 'w', 'e', 'r'];
    skillKeys.forEach((k, i) => {
      const skill = player.skills[i];
      const cd = player.skillCooldowns[i];
      const maxCd = skill ? skill.cooldown : 1;
      const overlay = document.getElementById('cd-' + k);
      overlay.style.height = cd > 0 ? clamp(cd / maxCd * 100, 0, 100) + '%' : '0%';

      // Tooltip
      const tip = document.getElementById('tip-' + k);
      if (skill) {
        tip.textContent = skill.name + ' - ' + skill.manaCost + ' MP - ' + skill.desc;
      }
    });

    // Damage vignette
    if (this.damageVignetteAlpha > 0) {
      this.damageVignetteAlpha -= dt * 1.5;
    }
    if (player.hitFlash > 0) {
      this.damageVignetteAlpha = Math.max(this.damageVignetteAlpha, 0.5);
    }

    // Messages
    this.msgTimer -= dt;
    if (this.msgTimer <= 0) {
      this.msgTimer = 0;
    }
  }

  log(text, type = 'info') {
    const log = document.getElementById('msg-log');
    const div = document.createElement('div');
    div.className = 'msg-line msg-' + type;
    div.textContent = text;
    log.appendChild(div);

    // Trim old messages
    while (log.children.length > this.msgMax) {
      log.removeChild(log.firstChild);
    }

    // Remove after animation
    setTimeout(() => {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, 4000);
  }

  drawSkillIcons(player) {
    const keys = ['q', 'w', 'e', 'r'];
    keys.forEach((k, i) => {
      const skill = player.skills[i];
      const canvas = document.getElementById('icon-' + k);
      if (!canvas || !skill) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 48, 48);
      // Background
      ctx.fillStyle = '#0e0800';
      ctx.fillRect(0, 0, 48, 48);
      // Draw icon
      if (skill.icon) {
        ctx.save();
        skill.icon(ctx);
        ctx.restore();
      }
    });
  }

  // Class portrait drawing (on class select screen)
  drawPortraits() {
    // The portraits are CSS-styled divs, optionally we could draw on canvases
    // For now rely on CSS gradients + emoji in skills-preview
  }
}
