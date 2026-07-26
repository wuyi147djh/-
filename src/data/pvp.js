// 斗法 PvP
import { REALMS } from './realms.js'

export function genOpponent(playerStage, playerRealm) {
  const diff = Math.floor((Math.random() - 0.5) * 4)
  const oppRealm = Math.max(0, Math.min(REALMS.length - 1, playerRealm + diff))
  const oppStage = Math.max(1, playerStage + diff * 5)
  const realmInfo = REALMS[oppRealm]
  const names = ['玄阳真人', '紫霄仙子', '青冥道人', '血刀老祖', '玉清散人', '九华神君', '玄阴圣母', '太虚道尊']
  return {
    id: `opp_${Date.now()}`,
    name: names[Math.floor(Math.random() * names.length)],
    realm: oppRealm,
    realmName: realmInfo.name,
    hp: Math.floor(100 * realmInfo.hpMult * (1 + oppStage * 0.05)),
    atk: Math.floor(5 * realmInfo.atkMult * (1 + oppStage * 0.04)),
    stage: oppStage,
  }
}

export function simulatePvp(player, opponent) {
  let pHp = player.hp
  let oHp = opponent.hp
  let rounds = []
  for (let i = 0; i < 50 && pHp > 0 && oHp > 0; i++) {
    oHp -= player.atk
    rounds.push({ who: 'p', dmg: player.atk, oHp: Math.max(0, oHp) })
    if (oHp <= 0) break
    pHp -= opponent.atk
    rounds.push({ who: 'o', dmg: opponent.atk, pHp: Math.max(0, pHp) })
  }
  return { win: pHp > 0 && oHp <= 0, rounds, finalPHp: pHp, finalOHp: oHp }
}

export function pvpReward(opponent) {
  return {
    score: Math.floor(10 * (opponent.realm + 1) * (1 + opponent.stage * 0.01)),
    cult: Math.floor(50 * (opponent.realm + 1) * (1 + opponent.stage * 0.01)),
  }
}
