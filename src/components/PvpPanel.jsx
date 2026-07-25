import React, { useEffect } from 'react'
import { useGame, computeStats } from '../store/gameStore.js'
import { REALMS } from '../data/realms.js'
import { fmt } from '../data/format.js'

export default function PvpPanel({ onClose }) {
  const { pvpOpponent, pvpResult, pvpScore, pvpWins, pvpLosses, realm, stage } = useGame()

  // 进入时自动生成对手
  useEffect(() => {
    if (!pvpOpponent && !pvpResult) {
      useGame.getState().genPvpOpponent()
    }
  }, [])

  const stats = computeStats(useGame.getState())

  return (
    <div className="panel pvp-panel">
      <div className="panel-header">
        <h2>斗法台</h2>
        <button onClick={onClose}>✕</button>
      </div>

      <div className="pvp-stats">
        <div>积分 <b className="gold">{fmt(pvpScore)}</b></div>
        <div>胜 {pvpWins} · 负 {pvpLosses}</div>
      </div>

      <div className="pvp-arena">
        <div className="pvp-side me">
          <div className="pvp-name">道友 ({REALMS[realm].name})</div>
          <div className="pvp-hp">{fmt(stats.hp)}</div>
          <div className="pvp-atk">攻 {fmt(stats.atk)}</div>
        </div>
        <div className="pvp-vs">VS</div>
        {pvpOpponent && (
          <div className="pvp-side opp">
            <div className="pvp-name">{pvpOpponent.name}</div>
            <div className="pvp-realm">{pvpOpponent.realmName}</div>
            <div className="pvp-hp">{fmt(pvpOpponent.hp)}</div>
            <div className="pvp-atk">攻 {fmt(pvpOpponent.atk)}</div>
          </div>
        )}
      </div>

      {pvpResult && (
        <div className="pvp-result">
          <div className={`result-banner ${pvpResult.win ? 'win' : 'lose'}`}>
            {pvpResult.win ? '道法通天，胜！' : '技不如人，败。'}
          </div>
          <div className="result-stats">
            {pvpResult.win ? (
              <div>获得积分 +{fmt(pvpResult.opp ? Math.floor(10 * (pvpResult.opp.realm + 1) * (1 + pvpResult.opp.stage * 0.01)) : 0)}</div>
            ) : (
              <div>积分 -3</div>
            )}
          </div>
          <button onClick={() => useGame.getState().genPvpOpponent()}>再寻对手</button>
        </div>
      )}

      {!pvpResult && pvpOpponent && (
        <button className="btn-fight" onClick={() => useGame.getState().doPvp()}>
          出手斗法
        </button>
      )}
      {!pvpResult && !pvpOpponent && (
        <button className="btn-fight" onClick={() => useGame.getState().genPvpOpponent()}>
          寻找对手
        </button>
      )}
    </div>
  )
}
