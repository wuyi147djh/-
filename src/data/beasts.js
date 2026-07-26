// 灵兽系统
export const BEAST_TIERS = [
  { name: '凡兽', color: '#9ca3af', atkMult: 1,    cd: 3 },
  { name: '灵兽', color: '#4ade80', atkMult: 3,    cd: 2.5 },
  { name: '宝兽', color: '#60a5fa', atkMult: 10,   cd: 2 },
  { name: '仙兽', color: '#c084fc', atkMult: 30,   cd: 1.5 },
  { name: '神兽', color: '#fbbf24', atkMult: 100,  cd: 1 },
]

const BEAST_NAMES = [
  ['灰狼', '青蛇', '赤狐'],
  ['灵猿', '玉鹿', '风虎'],
  ['玄龟', '火狮', '冰凰'],
  ['麒麟', '睚眦', '鹏鸟'],
  ['青龙', '白虎', '朱雀', '玄武'],
]

let _bid = 0
export function genBeast(tier) {
  const tierInfo = BEAST_TIERS[tier]
  const pool = BEAST_NAMES[tier]
  return {
    id: `beast_${++_bid}_${Date.now()}`,
    tier,
    name: pool[Math.floor(Math.random() * pool.length)],
    atk: Math.floor(5 * tierInfo.atkMult),
    level: 1,
    cd: tierInfo.cd,
    icon: ['🐺', '🐍', '🦌', '🦁', '🐉'][tier],
  }
}

export function beastUpgradeCost(beast) {
  return Math.floor(100 * Math.pow(beast.tier + 1, 2) * Math.pow(1.4, beast.level))
}

export function upgradeBeast(beast) {
  const tierInfo = BEAST_TIERS[beast.tier]
  const newLevel = beast.level + 1
  return {
    ...beast,
    level: newLevel,
    atk: Math.floor(5 * tierInfo.atkMult * (1 + newLevel * 0.25)),
  }
}

export function tryBeastDrop(stage) {
  if (Math.random() > 0.25) return null
  const maxTier = Math.min(4, Math.floor(stage / 30))
  const tier = Math.min(maxTier, Math.floor(Math.random() * (maxTier + 1)))
  return genBeast(tier)
}
