import React from 'react'

// 原创SVG人物立绘：樵夫修士持斧
export function CharacterSVG({ size = 200 }) {
  return (
    <svg viewBox="0 0 200 280" width={size} height={size * 1.4} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4a6a" />
          <stop offset="100%" stopColor="#1a2540" />
        </linearGradient>
        <linearGradient id="axe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="50%" stopColor="#f5d76e" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
        <radialGradient id="halo" cx="0.5" cy="0.3" r="0.5">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="100" cy="80" rx="90" ry="100" fill="url(#halo)" />
      <path d="M 60 200 Q 50 240 40 270 L 160 270 Q 150 240 140 200 Z" fill="url(#robe)" stroke="#0a0e1a" strokeWidth="1" />
      <path d="M 100 200 L 100 270" stroke="#d4af37" strokeWidth="1" opacity="0.6" />
      <path d="M 60 140 Q 40 180 35 220 Q 45 215 55 200 Q 65 170 70 150 Z" fill="url(#robe)" stroke="#0a0e1a" strokeWidth="1" />
      <path d="M 140 140 Q 160 180 165 220 Q 155 215 145 200 Q 135 170 130 150 Z" fill="url(#robe)" stroke="#0a0e1a" strokeWidth="1" />
      <path d="M 70 130 Q 65 160 60 200 L 140 200 Q 135 160 130 130 Z" fill="url(#robe)" stroke="#0a0e1a" strokeWidth="1" />
      <rect x="62" y="170" width="76" height="6" fill="#d4af37" />
      <rect x="62" y="170" width="76" height="2" fill="#f5d76e" />
      <rect x="92" y="115" width="16" height="20" fill="#e8c8a0" />
      <ellipse cx="100" cy="95" rx="22" ry="26" fill="#e8c8a0" stroke="#0a0e1a" strokeWidth="0.5" />
      <path d="M 80 85 Q 75 70 85 60 Q 100 50 115 60 Q 125 70 120 85 Q 115 75 100 73 Q 85 75 80 85 Z" fill="#1a1a1a" />
      <ellipse cx="100" cy="58" rx="10" ry="8" fill="#1a1a1a" />
      <rect x="92" y="55" width="16" height="2" fill="#d4af37" filter="url(#glow)" />
      <ellipse cx="92" cy="95" rx="2" ry="3" fill="#1a1a1a" />
      <ellipse cx="108" cy="95" rx="2" ry="3" fill="#1a1a1a" />
      <path d="M 87 88 Q 92 86 96 89" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
      <path d="M 104 89 Q 108 86 113 88" stroke="#1a1a1a" strokeWidth="1.5" fill="none" />
      <path d="M 96 108 Q 100 110 104 108" stroke="#8b4513" strokeWidth="1" fill="none" />
      <g transform="translate(140 100) rotate(25)">
        <rect x="-2" y="0" width="4" height="80" fill="#5a3010" stroke="#2a1800" strokeWidth="0.5" />
        <path d="M -2 5 L -18 0 L -20 12 L -18 24 L -2 20 Z" fill="url(#axe)" stroke="#5a4010" strokeWidth="1" filter="url(#glow)" />
        <path d="M 2 5 L 18 0 L 20 12 L 18 24 L 2 20 Z" fill="url(#axe)" stroke="#5a4010" strokeWidth="1" filter="url(#glow)" />
        <path d="M -16 4 L -16 20" stroke="#fff8c0" strokeWidth="1" opacity="0.7" />
        <path d="M 16 4 L 16 20" stroke="#fff8c0" strokeWidth="1" opacity="0.7" />
      </g>
      <circle cx="55" cy="200" r="6" fill="#e8c8a0" />
      <circle cx="55" cy="200" r="10" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.6" filter="url(#glow)" />
      <path d="M 50 220 Q 30 230 20 250 Q 35 245 50 240" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.7" />
      <path d="M 150 220 Q 170 230 180 250 Q 165 245 150 240" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.7" />
    </svg>
  )
}

export function SceneMountains() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8c8d8" />
          <stop offset="60%" stopColor="#d8e8e0" />
          <stop offset="100%" stopColor="#9ab8a8" />
        </linearGradient>
        <linearGradient id="mtn1a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a7080" />
          <stop offset="100%" stopColor="#3a5060" />
        </linearGradient>
        <linearGradient id="mtn1b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a5a4a" />
          <stop offset="100%" stopColor="#2a4030" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky1)" />
      <path d="M 0 180 L 60 120 L 120 160 L 180 100 L 240 150 L 320 110 L 400 140 L 400 300 L 0 300 Z" fill="url(#mtn1a)" opacity="0.6" />
      <path d="M 0 220 L 80 160 L 160 200 L 220 150 L 300 190 L 400 170 L 400 300 L 0 300 Z" fill="url(#mtn1a)" opacity="0.85" />
      <path d="M 0 260 L 100 210 L 180 240 L 260 200 L 360 230 L 400 220 L 400 300 L 0 300 Z" fill="url(#mtn1b)" />
      <ellipse cx="100" cy="150" rx="80" ry="8" fill="white" opacity="0.4" />
      <ellipse cx="280" cy="170" rx="100" ry="10" fill="white" opacity="0.3" />
      <ellipse cx="200" cy="190" rx="120" ry="12" fill="white" opacity="0.25" />
      <path d="M 180 130 L 175 240 L 185 240 L 190 130 Z" fill="#e8f0f5" opacity="0.6" />
      <path d="M 178 140 L 178 230" stroke="white" strokeWidth="0.5" opacity="0.8" />
      <g fill="#1a2a1a" opacity="0.8">
        <path d="M 30 260 L 25 240 L 35 245 L 28 220 L 38 225 L 32 200 L 42 260 Z" />
        <path d="M 370 255 L 365 235 L 375 240 L 368 215 L 378 220 L 372 195 L 382 255 Z" />
      </g>
      <circle cx="80" cy="180" r="1.5" fill="#d4af37" opacity="0.8" />
      <circle cx="320" cy="200" r="1" fill="#d4af37" opacity="0.6" />
      <circle cx="150" cy="220" r="1.2" fill="#d4af37" opacity="0.7" />
    </svg>
  )
}

export function SceneBattlefield() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b3a3a" />
          <stop offset="40%" stopColor="#c4622a" />
          <stop offset="100%" stopColor="#5a2818" />
        </linearGradient>
        <linearGradient id="ground2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a2820" />
          <stop offset="100%" stopColor="#1a0e08" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky2)" />
      <circle cx="320" cy="80" r="25" fill="#ffaa44" opacity="0.8" />
      <circle cx="320" cy="80" r="35" fill="#ffaa44" opacity="0.3" />
      <path d="M 0 200 L 80 150 L 160 180 L 240 140 L 320 170 L 400 150 L 400 300 L 0 300 Z" fill="#4a2818" opacity="0.7" />
      <path d="M 0 230 L 400 220 L 400 300 L 0 300 Z" fill="url(#ground2)" />
      <g transform="translate(60 180)">
        <line x1="0" y1="0" x2="0" y2="80" stroke="#3a2820" strokeWidth="2" />
        <path d="M 0 5 L 25 10 L 20 25 L 25 40 L 0 35 Z" fill="#6a1818" opacity="0.85" />
      </g>
      <g transform="translate(340 170) rotate(15)">
        <line x1="0" y1="0" x2="0" y2="90" stroke="#3a2820" strokeWidth="2" />
        <path d="M 0 5 L -25 10 L -20 25 L -25 40 L 0 35 Z" fill="#3a3030" opacity="0.85" />
      </g>
      <g transform="translate(120 260) rotate(45)">
        <rect x="-1" y="-30" width="2" height="60" fill="#888" />
        <rect x="-4" y="25" width="8" height="3" fill="#3a2820" />
      </g>
      <g transform="translate(260 265) rotate(-30)">
        <rect x="-1" y="-25" width="2" height="50" fill="#666" />
        <rect x="-4" y="20" width="8" height="3" fill="#3a2820" />
      </g>
      <g fill="#d4d4d4" opacity="0.7">
        <path d="M 100 100 L 130 95 L 132 98 L 102 103 Z" />
        <path d="M 200 80 L 230 75 L 232 78 L 202 83 Z" />
      </g>
      <ellipse cx="200" cy="240" rx="150" ry="15" fill="#3a2818" opacity="0.4" />
      <ellipse cx="150" cy="245" rx="60" ry="8" fill="#1a0e08" opacity="0.5" />
    </svg>
  )
}

export function SceneCelestial() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sky3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5d76e" />
          <stop offset="40%" stopColor="#e8a04a" />
          <stop offset="100%" stopColor="#a85a20" />
        </linearGradient>
        <radialGradient id="sunglow" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#fff8c0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fff8c0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky3)" />
      <rect width="400" height="300" fill="url(#sunglow)" />
      <ellipse cx="60" cy="220" rx="120" ry="25" fill="#f5d76e" opacity="0.7" />
      <ellipse cx="200" cy="240" rx="180" ry="30" fill="#e8a04a" opacity="0.8" />
      <ellipse cx="340" cy="225" rx="100" ry="20" fill="#f5d76e" opacity="0.7" />
      <ellipse cx="100" cy="260" rx="140" ry="20" fill="#a85a20" opacity="0.6" />
      <ellipse cx="300" cy="265" rx="120" ry="18" fill="#a85a20" opacity="0.6" />
      <g fill="#d4af37" opacity="0.85">
        <path d="M 150 180 L 140 200 L 140 220 L 260 220 L 260 200 L 250 180 L 240 175 L 160 175 Z" />
        <path d="M 130 180 L 200 150 L 270 180 L 260 180 L 200 155 L 140 180 Z" fill="#b8860b" />
        <rect x="195" y="148" width="10" height="6" fill="#8b6914" />
        <circle cx="200" cy="148" r="3" fill="#fff8c0" />
        <rect x="160" y="200" width="4" height="20" fill="#8b6914" />
        <rect x="236" y="200" width="4" height="20" fill="#8b6914" />
      </g>
      <g fill="#b8860b" opacity="0.7">
        <path d="M 60 210 L 55 225 L 55 240 L 105 240 L 105 225 L 100 210 L 95 207 L 65 207 Z" />
        <path d="M 50 210 L 80 195 L 110 210 Z" />
      </g>
      <g fill="#b8860b" opacity="0.7">
        <path d="M 295 210 L 290 225 L 290 240 L 340 240 L 340 225 L 335 210 L 330 207 L 300 207 Z" />
        <path d="M 285 210 L 315 195 L 345 210 Z" />
      </g>
      <ellipse cx="200" cy="140" rx="80" ry="6" fill="#fff8c0" opacity="0.6" />
      <ellipse cx="100" cy="170" rx="50" ry="5" fill="#fff8c0" opacity="0.5" />
      <ellipse cx="320" cy="165" rx="50" ry="5" fill="#fff8c0" opacity="0.5" />
      <g fill="#fff8c0" opacity="0.8">
        <path d="M 70 100 Q 75 95 80 100 Q 85 95 90 100 L 88 102 L 80 105 L 72 102 Z" />
        <path d="M 330 110 Q 335 105 340 110 Q 345 105 350 110 L 348 112 L 340 115 L 332 112 Z" />
      </g>
    </svg>
  )
}

export const SCENE_COMPONENTS = {
  scene1: SceneMountains,
  scene2: SceneBattlefield,
  scene3: SceneCelestial,
}
