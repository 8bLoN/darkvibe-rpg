// ============================================================
// DARKVIBE RPG - Configuration & Constants
// ============================================================

const CFG = {
  TILE: 32,
  MAP_W: 60,
  MAP_H: 60,
  DUNGEON_FLOORS: 3,
  ROOM_MIN: 5,
  ROOM_MAX: 12,
  ROOMS_TARGET: 14,

  // Combat
  MELEE_RANGE: 1.6,    // tiles
  RANGED_RANGE: 8,     // tiles
  AUTO_ATTACK_CD: 0.9, // seconds
  CRIT_MULT: 2.0,

  // Monster aggro
  AGGRO_RANGE: 9,      // tiles
  DEAGGRO_RANGE: 15,

  // Loot
  ITEM_DROP_CHANCE: 0.55,
  GOLD_DROP_CHANCE: 0.70,
  GOLD_MIN: 3,
  GOLD_MAX: 25,

  // XP thresholds per level (cumulative)
  XP_PER_LEVEL: [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000],
};

const TILE = {
  WALL:   0,
  FLOOR:  1,
  STAIRS: 2,
  CHEST:  3,
};

// Monster definitions per dungeon floor
const MONSTER_TABLE = {
  1: [
    { type: 'zombie',    weight: 40, level: 1 },
    { type: 'skeleton',  weight: 35, level: 1 },
    { type: 'ghoul',     weight: 25, level: 1 },
  ],
  2: [
    { type: 'ghoul',      weight: 30, level: 2 },
    { type: 'darkknight', weight: 35, level: 2 },
    { type: 'vampire',    weight: 25, level: 2 },
    { type: 'skeleton',   weight: 10, level: 2 },
  ],
  3: [
    { type: 'darkknight', weight: 25, level: 3 },
    { type: 'vampire',    weight: 30, level: 3 },
    { type: 'lich',       weight: 25, level: 3 },
    { type: 'boss',       weight: 0,  level: 3 }, // spawned manually
  ],
};

const MONSTER_STATS = {
  zombie: {
    name: 'Zombie',
    color: '#556633',
    hp: 35, def: 2, minDmg: 5, maxDmg: 10,
    speed: 1.5, xp: 18, gold: [2,8],
    size: 1.0, range: 1, attackSpeed: 1.4,
    aiType: 'melee',
  },
  skeleton: {
    name: 'Skeleton',
    color: '#ccbbaa',
    hp: 28, def: 1, minDmg: 8, maxDmg: 15,
    speed: 2.2, xp: 25, gold: [3,10],
    size: 0.9, range: 5, attackSpeed: 1.2,
    aiType: 'ranged',
  },
  ghoul: {
    name: 'Ghoul',
    color: '#334433',
    hp: 55, def: 3, minDmg: 12, maxDmg: 20,
    speed: 3.0, xp: 38, gold: [5,15],
    size: 1.0, range: 1, attackSpeed: 0.9,
    aiType: 'melee',
  },
  darkknight: {
    name: 'Dark Knight',
    color: '#334466',
    hp: 80, def: 7, minDmg: 15, maxDmg: 26,
    speed: 2.0, xp: 55, gold: [8,22],
    size: 1.1, range: 1, attackSpeed: 1.1,
    aiType: 'melee',
  },
  vampire: {
    name: 'Vampire',
    color: '#660033',
    hp: 110, def: 5, minDmg: 20, maxDmg: 32,
    speed: 3.2, xp: 80, gold: [12,28],
    size: 1.0, range: 1, attackSpeed: 0.8,
    aiType: 'vampire', // has lifesteal
  },
  lich: {
    name: 'Lich',
    color: '#4400aa',
    hp: 90, def: 4, minDmg: 22, maxDmg: 38,
    speed: 2.0, xp: 90, gold: [14,30],
    size: 1.0, range: 6, attackSpeed: 1.5,
    aiType: 'ranged',
  },
  boss: {
    name: 'Malphas the Undying',
    color: '#cc2200',
    hp: 600, def: 12, minDmg: 28, maxDmg: 50,
    speed: 2.2, xp: 600, gold: [80,150],
    size: 1.6, range: 1, attackSpeed: 1.0,
    aiType: 'boss',
  },
};

const CLASS_STATS = {
  warrior: {
    name: 'Warrior',
    baseHP: 160,  baseMP: 30,
    str: 18, vit: 18, ene: 5, dex: 10,
    baseAtk: 14, atkRange: 12, def: 8,
    speed: 2.5,
    color: '#CC4400',
    weaponName: 'Broad Sword',
    attackType: 'melee',
    skillKeys: ['q', 'w', 'e', 'r'],
  },
  rogue: {
    name: 'Rogue',
    baseHP: 100,  baseMP: 80,
    str: 11, vit: 11, ene: 12, dex: 22,
    baseAtk: 10, atkRange: 14, def: 4,
    speed: 3.2,
    color: '#226622',
    weaponName: 'Short Bow',
    attackType: 'ranged',
    skillKeys: ['q', 'w', 'e', 'r'],
  },
  mage: {
    name: 'Mage',
    baseHP: 75,   baseMP: 130,
    str: 5, vit: 8, ene: 28, dex: 12,
    baseAtk: 18, atkRange: 16, def: 2,
    speed: 2.4,
    color: '#6622CC',
    weaponName: 'Arcane Staff',
    attackType: 'ranged',
    skillKeys: ['q', 'w', 'e', 'r'],
  },
};
