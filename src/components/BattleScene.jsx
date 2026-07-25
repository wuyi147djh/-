import React, { useRef } from 'react'
import { useGame, computeStats } from '../store/gameStore.js'
import { getStage } from '../data/stages.js'
import { REALMS } from '../data/realms.js'
import { fmt } from '../data/format.js'
import { CharacterSVG, SCENE_COMPONENTS } from './Artwork.jsx'

export default function BattleScene() {
  const { enemy, stage, realm, beast, logs, offlineEarned } = useGame()
  const stageInfo = getStage(stage)
  const SceneComp = SCENE_COMPONENTS[stageInfo.scene] || SCENE_COMPONENTS.scene1
  const stats = computeStats(useGame.getState())
  const realmInfo = REALMS[realm]
  const hpPct = (enemy.hp / enemy.maxHp) * 100
  const lastClickRef = useRef(0)

  const handleClick = (e) => {
    const now = Date.now()
    if (now - lastClickRef.current < 40) return
    lastClickRef.current = now
    useGame.getState().attack()
  }

  return (
    <div className="battle-scene">
      <div className="scene-bg">
        <SceneComp />
      </div>
      <div className="scene-overlay" />
      <div className="stage-label">{stageInfo.name} · 第 {stage} 关</div>

      {offlineEarned > 0 && (
        <div className="offline-toast">
          闭关所得修为 +{fmt(offlineEarned)}
          <button onClick={() => useGame.getState().clearOffline()}>收</button>
        </div>
      )}

      {beast && (
        <div className="beast-display">
          <div className="beast-icon">{beast.icon}</div>
          <div className="beast-name">{beast.name} Lv.{beast.level}</div>
        </div>
      )}

      <div className="enemy-zone" onClick={handleClick}>
        <div className={`enemy-sprite ${enemy.isBoss ? 'boss' : ''}`}>
          {enemy.isBoss ? '👹' : '🌲'}
        </div>
        <div className="enemy-name">{enemy.name}</div>
        <div className="hp-bar">
          <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
          <span className="hp-text">{fmt(enemy.hp)} / {fmt(enemy.maxHp)}</span>
        </div>
      </div>

      <div className="float-logs">
        {logs.slice(-8).map((l) => (
          <div key={l.key} className={`float-log ${l.type}`}>{l.text}</div>
        ))}
      </div>

      <div className="char-portrait">
        <CharacterSVG size={180} />
        <div className="char-info">
          <div>{realmInfo.name}</div>
          <div className="char-stats">
            <span>⚔{fmt(stats.atk)}</span>
            <span>❤{fmt(stats.hp)}</span>
          </div>
        </div>
      </div>

      <div className="click-hint">点击怪物挥斧</div>
    </div>
  )
}
