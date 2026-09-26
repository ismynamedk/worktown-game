/* Pieces every Work Town game shares: Manus's card frames with real words on
   them, the player strip, the game header and the finish screen. */
import React from 'react'
import { motion } from 'framer-motion'
import { EDU, SKILLS, SECTORS, PROFILES, JOBS } from '../data.js'
import { makePlayer, shuffle, totalSkill, qualifies, missingReason } from '../engine.js'

export const base = import.meta.env.BASE_URL
export const art = f => `${base}art/${f}`
export const money = n => '₹' + Math.round(n).toLocaleString('en-IN')
export const COLOURS = ['#E8453C', '#2F7BE8', '#2EAD5B', '#F2B705']
export const LEVEL = ['', 'Entry', 'Qualified', 'Senior']
export const nm = p => { if (p.human) return 'You'; const n = p.name.replace(/^The /, ''); return n.charAt(0).toUpperCase() + n.slice(1) }

/** Four seats: you plus three rivals on different profiles. */
export function seatTable(profileId) {
  const me = PROFILES.find(p => p.id === profileId) || PROFILES[0]
  const rest = shuffle(PROFILES.filter(p => p.id !== me.id)).slice(0, 3)
  return [makePlayer(me, 0, true), ...rest.map((p, i) => makePlayer(p, i + 1, false))]
}

export const clonePlayers = ps => ps.map(p => ({ ...p, skills: { ...p.skills }, job: p.job ? { ...p.job } : null }))
export { EDU, SKILLS, SECTORS, JOBS, totalSkill, qualifies, missingReason, shuffle }

export function weakest(p) { return SKILLS.slice().sort((a, b) => p.skills[a] - p.skills[b])[0] }
export function strongestSkill(p) { return SKILLS.slice().sort((a, b) => p.skills[b] - p.skills[a])[0] }

/* ------------------------------------------------------------------ cards */
export function JobCard({ job, onClick, selected, dim, tag, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={'gcard job' + (selected ? ' sel' : '') + (dim ? ' dim' : '')} onClick={onClick}
      style={{ backgroundImage: `url(${art('cards/job.jpg')})` }}>
      {tag && <span className="gtag">{tag}</span>}
      <span className="lv">Career {job.lvl}</span>
      <b className="tt">{job.title}</b>
      <span className="sc">{SECTORS[job.sk]}</span>
      <span className="rq">{EDU[job.edu]}<br />{job.sk} {job.need}<br />{job.exp} yr</span>
      <span className="pay">{money(job.pay)}</span>
      {children}
    </Tag>
  )
}

export function TextCard({ kind, title, body, flip, onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  if (flip) return <Tag className={'gcard back ' + kind} onClick={onClick} style={{ backgroundImage: `url(${art(`cards/back-${kind}.jpg`)})` }} />
  return (
    <Tag className={'gcard txt ' + kind} onClick={onClick} style={{ backgroundImage: `url(${art(`cards/${kind}.jpg`)})` }}>
      <b className="tt">{title}</b>
      <span className="bd">{body}</span>
      {children}
    </Tag>
  )
}

export function SkillToken({ skill, onClick, disabled }) {
  const c = { Making: 'clay', Serving: 'sage', Digital: 'slate', Caring: 'rose', Education: 'edu' }[skill]
  return (
    <button className={'stoken ' + c} onClick={onClick} disabled={disabled}>
      <b>{skill}</b><span>{skill === 'Education' ? 'next level' : '+1 point'}</span>
    </button>
  )
}

/* ---------------------------------------------------------------- players */
export function Pips({ n, tint }) {
  return <span className={'pips ' + (tint || '')}>{[1, 2, 3, 4, 5].map(k => <i key={k} className={n >= k ? 'on' : ''} />)}</span>
}

export function Seats({ players, show = 'cash', extra }) {
  return (
    <div className="seats">
      {players.map(p => (
        <div key={p.id} className={'seat' + (p.human ? ' me' : '')}>
          <i className="dot" style={{ background: COLOURS[p.id] }} />
          <b>{nm(p)}</b>
          <span className="lvl">{LEVEL[p.career]}</span>
          <span className="val">{show === 'cash' ? money(p.cash) : extra ? extra(p) : ''}</span>
        </div>
      ))}
    </div>
  )
}

export function MySkills({ p }) {
  const tint = { Making: 'clay', Serving: 'sage', Digital: 'slate', Caring: 'rose' }
  return (
    <div className="myskills">
      <span className="e">{EDU[p.edu]} &middot; {p.exp} yr</span>
      {SKILLS.map(s => <span key={s} className={'sk ' + tint[s]}><em>{s}</em><Pips n={p.skills[s]} /></span>)}
    </div>
  )
}

/* ------------------------------------------------------------------ frame */
export function GameFrame({ title, round, rounds, onHome, children, dock }) {
  return (
    <div className="gframe">
      <header className="hud">
        <button className="back" onClick={onHome}>Games</button>
        <div className="gtitle"><b>{title}</b>{rounds ? <span>Round {Math.min(round, rounds)} of {rounds}</span> : null}</div>
        <span />
      </header>
      <main className="gbody">{children}</main>
      {dock && <div className="gdock">{dock}</div>}
    </div>
  )
}

export function Finish({ title, rows, lesson, onAgain, onHome }) {
  return (
    <div className="end">
      <span className="kicker">Game over</span>
      <h1>{title}</h1>
      <ol className="podium">
        {rows.map((r, i) => (
          <li key={r.key} className={r.me ? 'you' : ''}>
            <span className="place">{i + 1}</span>
            <i className="dot" style={{ background: r.colour }} />
            <b>{r.name}</b>
            {r.cols.map((c, j) => <span key={j}>{c}</span>)}
          </li>
        ))}
      </ol>
      {lesson && <div className="think"><h3>Think about it</h3>{lesson.map((l, i) => <p key={i}>{l}</p>)}</div>}
      <div className="end-cta">
        <button className="btn sun big" onClick={onAgain}>Play again</button>
        <button className="btn ghost big" onClick={onHome}>All games</button>
      </div>
    </div>
  )
}

export function Toast({ children, kind = 'info' }) {
  return <motion.div className={'toast ' + kind} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{children}</motion.div>
}
