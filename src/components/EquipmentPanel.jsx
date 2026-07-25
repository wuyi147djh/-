import React from 'react'
import { useGame, computeStats } from '../store/gameStore.js'
import { EQUIP_TIERS, EQUIP_SLOTS, upgradeCost } from '../data/equipment.js'
import { fmt } from '../data/format.js'

export default function EquipmentPanel({ onClose }) {
  const { equipped, inventory, gold } = useGame()

  return (
    <div className="panel equipment-panel">
      <div className="panel-header">
        <h2>装备</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="equip-slots">
        {Object.keys(EQUIP_SLOTS).map((slot) => {
          const eq = equipped[slot]
          const info = EQUIP_SLOTS[slot]
          return (
            <div key={slot} className="equip-slot">
              <div className="slot-icon">{info.icon}</div>
              <div className="slot-name">{info.name}</div>
              {eq ? (
                <div className="slot-eq" style={{ color: EQUIP_TIERS[eq.tier].color }}>
                  <div className="eq-name">{eq.name}</div>
                  <div className="eq-stats">
                    {eq.atk > 0 && <span>攻+{fmt(eq.atk)}</span>}
                    {eq.hp > 0 && <span>血+{fmt(eq.hp)}</span>}
                    <span className="eq-lv">+{eq.level}</span>
                  </div>
                  <div className="eq-actions">
                    <button
                      disabled={gold < upgradeCost(eq)}
                      onClick={() => useGame.getState().upgradeEquipment(eq.id)}
                    >
                      强化 (灵石 {fmt(upgradeCost(eq))})
                    </button>
                    <button onClick={() => useGame.getState().unequip(slot)}>卸下</button>
                  </div>
                </div>
              ) : (
                <div className="slot-empty">空</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="inv-section">
        <h3>背包 ({inventory.length})</h3>
        {inventory.length === 0 && <div className="empty-tip">空空如也，去砍怪吧</div>}
        <div className="inv-grid">
          {inventory.map((eq) => (
            <div key={eq.id} className="inv-item" style={{ borderColor: EQUIP_TIERS[eq.tier].color }}>
              <div className="inv-name" style={{ color: EQUIP_TIERS[eq.tier].color }}>
                {EQUIP_SLOTS[eq.slot].icon} {eq.name}
              </div>
              <div className="inv-stats">
                {eq.atk > 0 && <span>攻+{fmt(eq.atk)}</span>}
                {eq.hp > 0 && <span>血+{fmt(eq.hp)}</span>}
                <span className="eq-lv">+{eq.level}</span>
              </div>
              <div className="inv-actions">
                <button onClick={() => useGame.getState().equip(eq)}>装备</button>
                <button
                  disabled={gold < upgradeCost(eq)}
                  onClick={() => useGame.getState().upgradeEquipment(eq.id)}
                >
                  强化
                </button>
                <button className="danger" onClick={() => useGame.getState().discardEquip(eq.id)}>弃</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
