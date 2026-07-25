// 关卡场景系统
// 每100关换一个场景
export const STAGES = [
  { from: 1,   to: 100,  name: '青云深山', scene: 'scene1', monster: ['山魈', '木灵', '石精', '藤妖', '雾鬼'] },
  { from: 101, to: 200,  name: '古战场',   scene: 'scene2', monster: ['亡魂', '骨将', '血煞', '剑灵', '战鬼'] },
  { from: 201, to: 400,  name: '九霄天界', scene: 'scene3', monster: ['天兵', '雷将', '云兽', '仙子', '天君'] },
]

export function getStage(stageNum) {
  for (const s of STAGES) {
    if (stageNum >= s.from && stageNum <= s.to) return s
  }
  return STAGES[STAGES.length - 1]
}

export function getMonsterName(stageNum) {
  const s = getStage(stageNum)
  return s.monster[(stageNum - 1) % s.monster.length]
}

// 敌人属性公式
export function enemyHp(stageNum) {
  return Math.floor(20 * Math.pow(1.06, stageNum - 1))
}
export function enemyAtk(stageNum) {
  return Math.floor(2 * Math.pow(1.05, stageNum - 1))
}
// 击杀奖励
export function enemyReward(stageNum) {
  return {
    cult: Math.floor(5 * Math.pow(1.07, stageNum - 1)),
    gold: Math.floor(3 * Math.pow(1.06, stageNum - 1)),
  }
}

// 是否是BOSS关（每10关）
export function isBossStage(stageNum) {
  return stageNum % 10 === 0
}
export function bossHp(stageNum) {
  return Math.floor(enemyHp(stageNum) * 8)
}
export function bossReward(stageNum) {
  const base = enemyReward(stageNum)
  return {
    cult: base.cult * 10,
    gold: base.gold * 10,
  }
}
