import React from 'react'
import { useGame } from '../store/gameStore.js'

export default function MenuPanel({ onClose }) {
  const { totalKills, bossKills, stage, pvpWins } = useGame()
  return (
    <div className="panel menu-panel">
      <div className="panel-header">
        <h2>菜单</h2>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="menu-stats">
        <div>累计击杀：{totalKills}</div>
        <div>妖王击杀：{bossKills}</div>
        <div>当前关卡：{stage}</div>
        <div>斗法胜场：{pvpWins}</div>
      </div>
      <div className="menu-actions">
        <button onClick={() => { useGame.getState().save(); onClose() }}>手动存档</button>
        <button
          className="danger"
          onClick={() => {
            if (confirm('确定要重置游戏？所有进度将丢失！')) {
              useGame.getState().reset()
              onClose()
            }
          }}
        >
          重置游戏
        </button>
      </div>
      <div className="menu-tip">
        本游戏为原创修仙放置类游戏，进度自动保存于本地浏览器。
      </div>
    </div>
  )
}
