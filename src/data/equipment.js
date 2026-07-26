// 装备系统
export const EQUIP_TIERS = [
  { name: '凡', color: '#9ca3af', mult: 1,    suffix: '' },
  { name: '灵', color: '#4ade80', mult: 3,    suffix: '·灵' },
  { name: '宝', color: '#60a5fa', mult: 10,   suffix: '·宝' },
  { name: '仙', color: '#c084fc', mult: 30,   suffix: '·仙' },
  { name: '神', color: '#fbbf24', mult: 100,  suffix: '·神' },
]

export const EQUIP_SLOTS = {
  weapon:    { name: '武器', baseAtk: 3,  baseHp: 0,   icon: '⚔' },
  robe:      { name: '法袍', baseAtk: 0,  baseHp: 20,  icon: '👘' },
  accessory: { name: '灵饰', baseAtk: 1,  baseHp: 5,   icon: '💍' },
}

const NAME_POOL = {
  weapon:    ['石斧', '青锋', '寒霜', '赤霄', '玄黄', '九龙', '盘古'],
  robe:      ['麻衣', '云锦', '紫绶', '金缕', '霓裳', '太清', '鸿蒙'],
  accessory: ['木珠', '玉佩', '灵环', '玄墨', '九转', '混元', '造化'],
}

let _id = 0
export function genEquip(slot, tier, forceLevel = 0) {
  const tierInfo = EQUIP_TIERS[tier]
  const slotInfo = EQUIP_SLOTS[slot]
  const nameBase = NAME_POOL[slot][tier] || NAME_POOL[slot][NAME_POOL[slot].length - 1]
  return {
    id: `eq_${++_id}_${Date.now()}`,
    slot,
    tier,
    name: nameBase + tierInfo.suffix,
    level: forceLevel,
    atk: Math.floor(slotInfo.baseAtk * tierInfo.mult * (1 + forceLevel * 0.3)),
    hp:  Math.floor(slotInfo.baseHp  * tierInfo.mult * (1 + forceLevel * 0.3)),
  }
}

export function rollEquipDrop(stage) {
  if (Math.random() > dropChance(stage)) return null
  const slots = ['weapon', 'robe', 'accessory']
  const slot = slots[Math.floor(Math.random() * 3)]
  const tier = rollTier(stage)
  return genEquip(slot, tier)
}

export function dropChance(stage) {
  return Math.min(0.35, 0.12 + stage * 0.005)
}

export function rollTier(stage) {
  const maxTier = Math.min(4, Math.floor(stage / 25))
  const r = Math.random()
  for (let t = maxTier; t >= 0; t--) {
    const chance = t === 0 ? 1 : 0.15 + (maxTier - t) * 0.15
    if (r < chance) return t
  }
  return 0
}

export function upgradeCost(eq) {
  return Math.floor(50 * Math.pow(2, eq.tier) * Math.pow(1.5, eq.level))
}

export function upgradeEquip(eq) {
  const newLevel = eq.level + 1
  const slotInfo = EQUIP_SLOTS[eq.slot]
  const tierInfo = EQUIP_TIERS[eq.tier]
  return {
    ...eq,
    level: newLevel,
    atk: Math.floor(slotInfo.baseAtk * tierInfo.mult * (1 + newLevel * 0.3)),
    hp:  Math.floor(slotInfo.baseHp  * tierInfo.mult * (1 + newLevel * 0.3)),
  }
}
