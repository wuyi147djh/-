import React from 'react'
import { useGame } from '../store/gameStore.js'
import { BEAST_TIERS, beastUpgradeCost } from '../data/beasts.js'
import { fmt } from '../data/format.js'

export default function BeastPanel({ onClose }) {
  const { beast, beastInventory, gold } = useGame()

  return (
    <div className="panel beast-panel">
      <div className="panel-header">
        <h2>灵兽</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="beast-active">
        <h3>出战</h3>
        {beast ? (
          <div className="beast-card" style={{ borderColor: BEAST_TIERS[beast.tier].color }}>
            <div className="beast-portrait">{beast.icon}</div>
            <div className="beast-detail">
              <div className="beast-name" style={{ color: BEAST_TIERS[beast.tier].color }}>
                {beast.name} <span className="tier-tag">[{BEAST_TIERS[beast.tier].name}]</span>
              </div>
              <div className="beast-stats">
                攻 {fmt(beast.atk)} · 攻速 {beast.cd}s · Lv.{beast.level}
              </div>
              <div className="beast-actions">
                <button
                  disabled={gold < beastUpgradeCost(beast)}
                  onClick={() => useGame.getState().upgradeBeastAction(beast.id)}
                >
                  升级 (灵石 {fmt(beastUpgradeCost(beast))})
                </button>
                <button onClick={() => useGame.getState().unequipBeast()}>休息</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-tip">未出战灵兽，从下方选择一只出战</div>
        )}
      </div>

      <div className="beast-inv">
        <h3>灵兽栏 ({beastInventory.length})</h3>
        {beastInventory.length === 0 && <div className="empty-tip">击败妖王有概率获得灵兽</div>}
        <div className="beast-grid">
          {beastInventory.map((b) => (
            <div key={b.id} className="beast-card small" style={{ borderColor: BEAST_TIERS[b.tier].color }}>
              <div className="beast-portrait">{b.icon}</div>
              <div className="beast-detail">
                <div className="beast-name" style={{ color: BEAST_TIERS[b.tier].color }}>
                  {b.name}
                </div>
                <div className="beast-stats">
                  攻 {fmt(b.atk)} · {b.cd}s · Lv.{b.level}
                </div>
                <div className="beast-actions">
                  <button onClick={() => useGame.getState().equipBeast(b)}>出战</button>
                  <button
                    disabled={gold < beastUpgradeCost(b)}
                    onClick={() => useGame.getState().upgradeBeastAction(b.id)}
                  >
                    升级
                  </button>
                  <button className="danger" onClick={() => useGame.getState().releaseBeast(b.id)}>放</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
