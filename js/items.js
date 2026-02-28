// ============================================================
// DARKVIBE RPG - Items & Loot System
// ============================================================

const ITEM_TYPE = { WEAPON: 'weapon', ARMOR: 'armor', POTION: 'potion', GOLD: 'gold', RING: 'ring', AMULET: 'amulet' };

const ITEM_DB = {
  // === WEAPONS ===
  sword: {
    id: 'sword', name: 'Iron Sword', type: ITEM_TYPE.WEAPON,
    color: '#aaaacc', minDmg: 10, maxDmg: 18, desc: '+10-18 Damage',
    glyph: '⚔', floor: 1,
  },
  broad_sword: {
    id: 'broad_sword', name: 'Broad Sword', type: ITEM_TYPE.WEAPON,
    color: '#aaaacc', minDmg: 15, maxDmg: 25, desc: '+15-25 Damage',
    glyph: '⚔', floor: 1,
  },
  axe: {
    id: 'axe', name: 'Battle Axe', type: ITEM_TYPE.WEAPON,
    color: '#cc8844', minDmg: 18, maxDmg: 30, desc: '+18-30 Damage',
    glyph: '🪓', floor: 2,
  },
  great_sword: {
    id: 'great_sword', name: 'Great Sword', type: ITEM_TYPE.WEAPON,
    color: '#88aaff', minDmg: 22, maxDmg: 36, desc: '+22-36 Damage',
    glyph: '⚔', floor: 2,
  },
  dagger: {
    id: 'dagger', name: 'Shadow Dagger', type: ITEM_TYPE.WEAPON,
    color: '#66cc88', minDmg: 10, maxDmg: 20, desc: '+10-20 Damage, Fast',
    glyph: '🗡', floor: 1,
  },
  bow: {
    id: 'bow', name: 'Longbow', type: ITEM_TYPE.WEAPON,
    color: '#cc9944', minDmg: 14, maxDmg: 24, desc: '+14-24 Damage',
    glyph: '🏹', floor: 1,
  },
  war_bow: {
    id: 'war_bow', name: 'War Bow', type: ITEM_TYPE.WEAPON,
    color: '#ff8844', minDmg: 20, maxDmg: 34, desc: '+20-34 Damage',
    glyph: '🏹', floor: 2,
  },
  staff: {
    id: 'staff', name: 'Arcane Staff', type: ITEM_TYPE.WEAPON,
    color: '#aa66ff', minDmg: 18, maxDmg: 30, desc: '+18-30 Damage',
    glyph: '🔮', floor: 1,
  },
  chaos_staff: {
    id: 'chaos_staff', name: 'Staff of Chaos', type: ITEM_TYPE.WEAPON,
    color: '#ff44ff', minDmg: 25, maxDmg: 42, desc: '+25-42 Damage, +20 MP',
    bonusMP: 20, floor: 2,
    glyph: '🔮',
  },

  // === ARMOR ===
  leather: {
    id: 'leather', name: 'Leather Armor', type: ITEM_TYPE.ARMOR,
    color: '#aa7744', def: 3, desc: '+3 Defense',
    glyph: '🧥', floor: 1,
  },
  chain_mail: {
    id: 'chain_mail', name: 'Chain Mail', type: ITEM_TYPE.ARMOR,
    color: '#aaaaaa', def: 6, desc: '+6 Defense',
    glyph: '🧥', floor: 1,
  },
  plate: {
    id: 'plate', name: 'Plate Armor', type: ITEM_TYPE.ARMOR,
    color: '#cccccc', def: 10, desc: '+10 Defense',
    glyph: '🧥', floor: 2,
  },
  robes: {
    id: 'robes', name: 'Mage Robes', type: ITEM_TYPE.ARMOR,
    color: '#8844cc', def: 2, bonusMP: 25, desc: '+2 Defense, +25 MP',
    glyph: '🧥', floor: 1,
  },
  shadow_cloak: {
    id: 'shadow_cloak', name: 'Shadow Cloak', type: ITEM_TYPE.ARMOR,
    color: '#224422', def: 5, bonusDex: 5, desc: '+5 Defense, +5 Dex',
    glyph: '🧥', floor: 2,
  },

  // === RINGS ===
  ring_power: {
    id: 'ring_power', name: 'Ring of Power', type: ITEM_TYPE.RING,
    color: '#ffaa00', bonusStr: 5, desc: '+5 Strength',
    glyph: '💍', floor: 2,
  },
  ring_vitality: {
    id: 'ring_vitality', name: 'Ring of Life', type: ITEM_TYPE.RING,
    color: '#ff4444', bonusVit: 8, desc: '+8 Vitality',
    glyph: '💍', floor: 1,
  },
  ring_magic: {
    id: 'ring_magic', name: 'Ring of Sorcery', type: ITEM_TYPE.RING,
    color: '#4444ff', bonusEne: 8, desc: '+8 Energy',
    glyph: '💍', floor: 2,
  },

  // === AMULETS ===
  amulet_wisdom: {
    id: 'amulet_wisdom', name: 'Amulet of Wisdom', type: ITEM_TYPE.AMULET,
    color: '#44aaff', bonusEne: 12, bonusMP: 15, desc: '+12 Energy, +15 MP',
    glyph: '📿', floor: 2,
  },
  amulet_might: {
    id: 'amulet_might', name: 'Amulet of Might', type: ITEM_TYPE.AMULET,
    color: '#ffaa44', bonusStr: 8, bonusHP: 20, desc: '+8 Strength, +20 HP',
    glyph: '📿', floor: 2,
  },

  // === POTIONS ===
  hp_potion: {
    id: 'hp_potion', name: 'Health Potion', type: ITEM_TYPE.POTION,
    color: '#cc2222', restoreHP: 60, desc: 'Restore 60 HP',
    glyph: '🧪', floor: 1,
  },
  hp_potion_lg: {
    id: 'hp_potion_lg', name: 'Full Rejuvenation', type: ITEM_TYPE.POTION,
    color: '#ff4444', restoreHP: 999, desc: 'Fully restore HP',
    glyph: '🧪', floor: 2,
  },
  mp_potion: {
    id: 'mp_potion', name: 'Mana Potion', type: ITEM_TYPE.POTION,
    color: '#2244cc', restoreMP: 50, desc: 'Restore 50 MP',
    glyph: '🧪', floor: 1,
  },
};

// Loot tables by floor
const LOOT_TABLES = {
  1: [
    { id: 'hp_potion',    w: 25 },
    { id: 'mp_potion',    w: 20 },
    { id: 'sword',        w: 12 },
    { id: 'dagger',       w: 12 },
    { id: 'bow',          w: 10 },
    { id: 'staff',        w: 10 },
    { id: 'leather',      w: 15 },
    { id: 'chain_mail',   w: 10 },
    { id: 'robes',        w: 8  },
    { id: 'ring_vitality',w: 5  },
    { id: 'broad_sword',  w: 5  },
  ],
  2: [
    { id: 'hp_potion',    w: 20 },
    { id: 'mp_potion',    w: 15 },
    { id: 'axe',          w: 12 },
    { id: 'great_sword',  w: 10 },
    { id: 'war_bow',      w: 10 },
    { id: 'chaos_staff',  w: 8  },
    { id: 'plate',        w: 10 },
    { id: 'shadow_cloak', w: 8  },
    { id: 'ring_power',   w: 6  },
    { id: 'ring_magic',   w: 6  },
    { id: 'amulet_wisdom',w: 5  },
    { id: 'amulet_might', w: 5  },
    { id: 'hp_potion_lg', w: 5  },
  ],
  3: [
    { id: 'hp_potion',    w: 15 },
    { id: 'hp_potion_lg', w: 10 },
    { id: 'mp_potion',    w: 10 },
    { id: 'chaos_staff',  w: 12 },
    { id: 'great_sword',  w: 10 },
    { id: 'war_bow',      w: 10 },
    { id: 'plate',        w: 8  },
    { id: 'ring_power',   w: 8  },
    { id: 'ring_magic',   w: 8  },
    { id: 'amulet_wisdom',w: 5  },
    { id: 'amulet_might', w: 5  },
  ],
};

function rollLoot(floor) {
  const table = LOOT_TABLES[Math.min(floor, 3)];
  const total = table.reduce((s,e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of table) {
    r -= e.w;
    if (r <= 0) return { ...ITEM_DB[e.id] };
  }
  return { ...ITEM_DB['hp_potion'] };
}

function rollChestLoot(floor) {
  // Chests give better loot
  const items = [];
  items.push(rollLoot(floor));
  if (Math.random() < 0.5) items.push(rollLoot(floor));
  if (Math.random() < 0.2) items.push(rollLoot(floor));
  return items;
}

// Apply item to player
function applyItem(player, item) {
  if (!item) return;
  const type = item.type;

  if (type === ITEM_TYPE.POTION) {
    if (item.restoreHP) player.heal(Math.min(item.restoreHP, player.maxHP - player.hp));
    if (item.restoreMP) player.restoreMP(Math.min(item.restoreMP, player.maxMP - player.mp));
    return true; // consumed
  }

  if (type === ITEM_TYPE.WEAPON) {
    player.equip.weapon = item;
    player.minAtk = item.minDmg;
    player.maxAtk = item.maxDmg;
    if (item.bonusMP) { player.maxMP += item.bonusMP; player.mp = Math.min(player.mp + item.bonusMP, player.maxMP); }
    return false; // equipped
  }

  if (type === ITEM_TYPE.ARMOR) {
    player.equip.armor = item;
    player.def = item.def;
    if (item.bonusMP) { player.maxMP += item.bonusMP; player.mp = Math.min(player.mp + item.bonusMP, player.maxMP); }
    if (item.bonusDex) player.dex += item.bonusDex;
    return false;
  }

  if (type === ITEM_TYPE.RING) {
    player.equip.ring = item;
    if (item.bonusStr) player.str += item.bonusStr;
    if (item.bonusVit) { player.vit += item.bonusVit; player.maxHP += item.bonusVit * 2; player.hp = Math.min(player.hp + item.bonusVit * 2, player.maxHP); }
    if (item.bonusEne) { player.ene += item.bonusEne; player.maxMP += item.bonusEne * 2; player.mp = Math.min(player.mp + item.bonusEne * 2, player.maxMP); }
    if (item.bonusMP) { player.maxMP += item.bonusMP; }
    return false;
  }

  if (type === ITEM_TYPE.AMULET) {
    player.equip.amulet = item;
    if (item.bonusStr) player.str += item.bonusStr;
    if (item.bonusVit) { player.vit += item.bonusVit; player.maxHP += item.bonusVit * 2; }
    if (item.bonusEne) { player.ene += item.bonusEne; player.maxMP += item.bonusEne * 2; }
    if (item.bonusHP)  { player.maxHP += item.bonusHP; player.hp = Math.min(player.hp + item.bonusHP, player.maxHP); }
    if (item.bonusMP)  { player.maxMP += item.bonusMP; }
    return false;
  }

  return false;
}
