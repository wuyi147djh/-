import { create } from 'zustand'
import { REALMS, BREAKTHROUGH_COST, BASE } from '../data/realms.js'
import {
  rollEquipDrop, upgradeCost, upgradeEquip, EQUIP_SLOTS,
} from '../data/equipment.js'
import {
  getStage, getMonsterName, enemyHp, enemyAtk, enemyReward,
  isBossStage, bossHp, bossReward,
} from '../data/stages.js'
import {
  upgradeBeast, beastUpgradeCost, tryBeastDrop, genBeast,
} from '../data/beasts.js'
import { genOpponent, simulatePvp, pvpReward } from '../data/pvp.js'
import { fmt, nextKey } from '../data/format.js'

const SAVE_KEY = 'yifu_save_v1'

export function computeStats(s) {
  const realm = REALMS[s.realm]
  let atk = BASE.ATK * realm.atkMult
  let hp = BASE.HP * realm.hpMult
  for (const slot of Object.keys(EQUIP_SLOTS)) {
    const eq = s.equipped[slot]
    if (eq) {
      atk += eq.atk
      hp += eq.hp
    }
  }
  return {
    atk: Math.floor(atk),
    hp: Math.floor(hp),
    cultRate: BASE.CULT_RATE * realm.cultMult,
  }
}

function spawnEnemy(stageNum) {
  const isBoss = isBossStage(stageNum)
  const hp = isBoss ? bossHp(stageNum) : enemyHp(stageNum)
  return {
    name: isBoss ? `【妖王】${getMonsterName(stageNum)}` : getMonsterName(stageNum),
    maxHp: hp,
    hp,
    atk: enemyAtk(stageNum),
    isBoss,
    stage: stageNum,
    _killed: false,
  }
}

function initialState() {
  const stage = 1
  return {
    realm: 0,
    cult: 0,
    gold: 0,
    stage,
    equipped: { weapon: null, robe: null, accessory: null },
    inventory: [],
    beast: null,
    beastInventory: [],
    pvpScore: 0,
    pvpWins: 0,
    pvpLosses: 0,
    enemy: spawnEnemy(stage),
    totalKills: 0,
    bossKills: 0,
    lastSaveAt: Date.now(),
    offlineEarned: 0,
    logs: [],
    beastCooldown: 0,
    pvpOpponent: null,
    pvpResult: null,
  }
}

function pushLogRaw(logs, text, type) {
  return [...logs.slice(-12), { text, type, key: nextKey() }]
}
function pushLog(set, text, type) {
  useGame.setState((s) => ({ logs: pushLogRaw(s.logs, text, type) }))
}

export const useGame = create((set, get) => ({
  ...initialState(),

  attack: () => {
    const s = get()
    if (s.enemy.hp <= 0) return
    const stats = computeStats(s)
    const dmg = stats.atk
    const newHp = Math.max(0, s.enemy.hp - dmg)
    pushLog(set, `-${fmt(dmg)}`, 'dmg')
    set({ enemy: { ...s.enemy, hp: newHp } })
    if (newHp <= 0) get().killEnemy()
  },

  killEnemy: () => {
    const s = get()
    if (s.enemy.hp > 0) return
    if (s.enemy._killed) return
    const isBoss = s.enemy.isBoss
    const stageNum = s.stage
    const reward = isBoss ? bossReward(stageNum) : enemyReward(stageNum)
    const drop = rollEquipDrop(stageNum)
    let beastDrop = null
    if (isBoss) beastDrop = tryBeastDrop(stageNum)
    const nextStage = stageNum + 1
    const newEnemy = spawnEnemy(nextStage)
    s.enemy._killed = true
    let newLogs = s.logs
    if (drop) newLogs = pushLogRaw(newLogs, `获得 ${drop.name}`, 'drop')
    if (beastDrop) newLogs = pushLogRaw(newLogs, `捕获 ${beastDrop.name}！`, 'beast')
    set({
      cult: s.cult + reward.cult,
      gold: s.gold + reward.gold,
      stage: nextStage,
      enemy: newEnemy,
      totalKills: s.totalKills + 1,
      bossKills: s.bossKills + (isBoss ? 1 : 0),
      inventory: drop ? [...s.inventory, drop] : s.inventory,
      beastInventory: beastDrop ? [...s.beastInventory, beastDrop] : s.beastInventory,
      logs: newLogs,
    })
  },

  tick: (dtSec) => {
    const s = get()
    if (s.enemy.hp <= 0) {
      get().killEnemy()
      return
    }
    const stats = computeStats(s)
    const cultGain = stats.cultRate * dtSec
    let newBeastCd = s.beastCooldown - dtSec
    let enemyHp = s.enemy.hp
    let logs = s.logs
    if (s.beast && newBeastCd <= 0) {
      const dmg = s.beast.atk
      enemyHp = Math.max(0, enemyHp - dmg)
      newBeastCd = s.beast.cd
      logs = pushLogRaw(logs, `灵兽-${fmt(dmg)}`, 'beast-dmg')
    }
    set({
      cult: s.cult + cultGain,
      enemy: { ...s.enemy, hp: enemyHp },
      beastCooldown: Math.max(0, newBeastCd),
      logs,
    })
    if (enemyHp <= 0) get().killEnemy()
  },

  breakthrough: () => {
    const s = get()
    if (s.realm >= REALMS.length - 1) return
    const cost = BREAKTHROUGH_COST[s.realm]
    if (s.cult < cost) return
    const newRealm = s.realm + 1
    set({ realm: newRealm, cult: s.cult - cost })
    pushLog(set, `突破至 ${REALMS[newRealm].name}！`, 'breakthrough')
  },

  equip: (eq) => {
    const s = get()
    const old = s.equipped[eq.slot]
    set({
      equipped: { ...s.equipped, [eq.slot]: eq },
      inventory: s.inventory.filter((e) => e.id !== eq.id).concat(old ? [old] : []),
    })
  },
  unequip: (slot) => {
    const s = get()
    const eq = s.equipped[slot]
    if (!eq) return
    set({
      equipped: { ...s.equipped, [slot]: null },
      inventory: [...s.inventory, eq],
    })
  },
  discardEquip: (eqId) => {
    set((s) => ({ inventory: s.inventory.filter((e) => e.id !== eqId) }))
  },
  upgradeEquipment: (eqId) => {
    const s = get()
    const inInv = s.inventory.find((e) => e.id === eqId)
    let target = inInv
    if (!target) {
      for (const slot of Object.keys(EQUIP_SLOTS)) {
        if (s.equipped[slot]?.id === eqId) target = s.equipped[slot]
      }
    }
    if (!target) return
    const cost = upgradeCost(target)
    if (s.gold < cost) return
    const upgraded = upgradeEquip(target)
    let newInv = s.inventory
    let newEquipped = s.equipped
    if (inInv) {
      newInv = s.inventory.map((e) => (e.id === eqId ? upgraded : e))
    } else {
      for (const slot of Object.keys(EQUIP_SLOTS)) {
        if (newEquipped[slot]?.id === eqId) {
          newEquipped = { ...newEquipped, [slot]: upgraded }
        }
      }
    }
    set({ gold: s.gold - cost, inventory: newInv, equipped: newEquipped })
  },

  equipBeast: (beast) => {
    const s = get()
    const old = s.beast
    set({
      beast,
      beastInventory: s.beastInventory.filter((b) => b.id !== beast.id).concat(old ? [old] : []),
      beastCooldown: beast.cd,
    })
  },
  unequipBeast: () => {
    const s = get()
    if (!s.beast) return
    set({
      beast: null,
      beastInventory: [...s.beastInventory, s.beast],
      beastCooldown: 0,
    })
  },
  releaseBeast: (beastId) => {
    set((s) => ({ beastInventory: s.beastInventory.filter((b) => b.id !== beastId) }))
  },
  upgradeBeastAction: (beastId) => {
    const s = get()
    const inInv = s.beastInventory.find((b) => b.id === beastId)
    let target = inInv
    if (!target && s.beast?.id === beastId) target = s.beast
    if (!target) return
    const cost = beastUpgradeCost(target)
    if (s.gold < cost) return
    const upgraded = upgradeBeast(target)
    let newInv = s.beastInventory
    let newBeast = s.beast
    if (inInv) newInv = s.beastInventory.map((b) => (b.id === beastId ? upgraded : b))
    else if (newBeast?.id === beastId) newBeast = upgraded
    set({ gold: s.gold - cost, beastInventory: newInv, beast: newBeast })
  },

  genPvpOpponent: () => {
    const s = get()
    const opp = genOpponent(s.stage, s.realm)
    set({ pvpOpponent: opp, pvpResult: null })
  },
  doPvp: () => {
    const s = get()
    if (!s.pvpOpponent) return
    const stats = computeStats(s)
    const result = simulatePvp({ hp: stats.hp, atk: stats.atk }, s.pvpOpponent)
    let scoreDelta = 0
    let cultGain = 0
    if (result.win) {
      const r = pvpReward(s.pvpOpponent)
      scoreDelta = r.score
      cultGain = r.cult
    } else {
      scoreDelta = -3
    }
    set({
      pvpResult: { ...result, opp: s.pvpOpponent },
      pvpScore: Math.max(0, s.pvpScore + scoreDelta),
      pvpWins: s.pvpWins + (result.win ? 1 : 0),
      pvpLosses: s.pvpLosses + (result.win ? 0 : 1),
      cult: s.cult + cultGain,
      pvpOpponent: null,
    })
  },

  save: () => {
    const s = get()
    const data = { ...s, logs: [], lastSaveAt: Date.now() }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)) } catch (e) {}
  },
  load: () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw)
      const now = Date.now()
      const elapsed = Math.min((now - (data.lastSaveAt || now)) / 1000, 86400 * 7)
      const stats = computeStats(data)
      const offline = Math.floor(stats.cultRate * elapsed * 0.5)
      const enemy = spawnEnemy(data.stage || 1)
      set({
        ...data,
        enemy,
        beastCooldown: data.beast?.cd || 0,
        logs: [],
        offlineEarned: offline,
        cult: (data.cult || 0) + offline,
        pvpOpponent: null,
      })
      return true
    } catch (e) { return false }
  },
  reset: () => {
    localStorage.removeItem(SAVE_KEY)
    set({ ...initialState() })
  },
  clearOffline: () => set({ offlineEarned: 0 }),
}))
