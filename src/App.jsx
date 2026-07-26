import React, { useEffect, useState } from 'react'
import { useGame } from './store/gameStore.js'
import TopBar from './components/TopBar.jsx'
import BattleScene from './components/BattleScene.jsx'
import EquipmentPanel from './components/EquipmentPanel.jsx'
import BeastPanel from './components/BeastPanel.jsx'
import PvpPanel from './components/PvpPanel.jsx'
import MenuPanel from './components/MenuPanel.jsx'

export default function App() {
  const [activePanel, setActivePanel] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    useGame.getState().load()
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(() => useGame.getState().tick(0.1), 100)
    return () => clearInterval(interval)
  }, [loaded])

  useEffect(() => {
    if (!loaded) return
    const interval = setInterval(() => useGame.getState().save(), 5000)
    const onUnload = () => useGame.getState().save()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', onUnload)
      onUnload()
    }
  }, [loaded])

  if (!loaded) return <div className="loading">载入仙缘中…</div>

  return (
    <div className="app">
      <TopBar onMenu={() => setActivePanel('menu')} />
      <BattleScene />
      <div className="bottom-nav">
        <button onClick={() => setActivePanel('equip')}>
          <span className="nav-icon">⚔</span><span>装备</span>
        </button>
        <button onClick={() => setActivePanel('beast')}>
          <span className="nav-icon">🐾</span><span>灵兽</span>
        </button>
        <button onClick={() => setActivePanel('pvp')}>
          <span className="nav-icon">🎯</span><span>斗法</span>
        </button>
      </div>

      {activePanel === 'equip' && <EquipmentPanel onClose={() => setActivePanel(null)} />}
      {activePanel === 'beast' && <BeastPanel onClose={() => setActivePanel(null)} />}
      {activePanel === 'pvp' && <PvpPanel onClose={() => setActivePanel(null)} />}
      {activePanel === 'menu' && <MenuPanel onClose={() => setActivePanel(null)} />}
    </div>
  )
}
