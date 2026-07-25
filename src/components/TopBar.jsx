import React from 'react'
import { useGame, computeStats } from '../store/gameStore.js'
import { REALMS, BREAKTHROUGH_COST } from '../data/realms.js'
import { fmt } from '../data/format.js'

export default function TopBar({ onMenu }) {
  const { realm, cult, gold, stage } = useGame()
  const stats = computeStats(useGame.getState())
  const realmInfo = REALMS[realm]
  const nextCost = BREAKTHROUGH_COST[realm]
  const canBreak = cult >= nextCost && realm < REALMS.length - 1
  const progress = nextCost === Infinity ? 1 : Math.min(1, cult / nextCost)

  return (
    <div className="top-bar">
      <div className="realm-badge">
        <span className="realm-name">{realmInfo.name}</span>
      </div>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">修为</span>
          <span className="stat-val">{fmt(cult)}</span>
          {nextCost !== Infinity && (
            <span className="stat-sub">/{fmt(nextCost)}</span>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">灵石</span>
          <span className="stat-val gold">{fmt(gold)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">关卡</span>
          <span className="stat-val">{stage}</span>
        </div>
        <div className="stat">
          <span className="stat-label">攻/秒</span>
          <span className="stat-val">{fmt(stats.cultRate)}</span>
        </div>
      </div>
      <button
        className={`btn-break ${canBreak ? 'ready' : ''}`}
        disabled={!canBreak}
        onClick={() => useGame.getState().breakthrough()}
      >
        突破
      </button>
      <button className="btn-menu" onClick={onMenu}>☰</button>
      <div className="cult-bar">
        <div className="cult-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
