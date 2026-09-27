/* The same town, flat. Used when a device cannot run 3D (older school tablets,
   blocked WebGL) or when the page is opened with ?lite. Same pads, same rules. */
import React from 'react'
import { ZONES } from '../data.js'
import { freeSlots } from '../engine.js'
import { PLAYER_COLOURS } from './Board3D.jsx'

const base = import.meta.env.BASE_URL

export default function Board2D({ game, enabled, onPick }) {
  return (
    <div className="board2d">
      <img src={`${base}art/board.jpg`} alt="Work Town seen from above" />
      {ZONES.map(z => {
        const here = game.placements[z.id] || []
        const left = freeSlots(game, z)
        const open = enabled && left > 0
        return (
          <button key={z.id} className={'pin2' + (open ? ' open' : '')} disabled={!open}
            style={{ left: z.x + '%', top: z.y + '%' }} onClick={() => onPick(z)}>
            <span className="pin2-dot">{here.map((pid, i) => <i key={i} style={{ background: PLAYER_COLOURS[pid] }} />)}</span>
            <span className="pin2-tag">{z.name}{z.cap < 9 && <b>{left}</b>}</span>
          </button>
        )
      })}
    </div>
  )
}

export function canRun3D() {
  if (typeof window === 'undefined') return false
  if (/[?&]lite\b/.test(window.location.search)) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}
