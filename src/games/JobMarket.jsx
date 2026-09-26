/* The Job Market. Four industries rise and fall. A job pays its printed salary
   plus 50 for every step its sector is above zero, minus 50 for every step below.
   Nothing about you changes. The world does. */
import React from 'react'
import { MARKET, UPGRADES, SKILL_COST, EDU_COST } from '../data.js'
import { salaryOf } from '../engine.js'
import {
  seatTable, clonePlayers, JOBS, shuffle, qualifies, missingReason, totalSkill,
  JobCard, Seats, MySkills, GameFrame, Finish, money, COLOURS, nm, SKILLS, SECTORS, LEVEL,
} from './common.jsx'

const ROUNDS = 8
const RETRAIN = 200
const SECT = ['Manufacturing', 'Services', 'Technology', 'Care']
const clamp = m => { for (const k in m) m[k] = Math.max(-2, Math.min(2, m[k])) }
const upgrade = p => { for (const u of UPGRADES) if (p.career < u.to && totalSkill(p) >= u.skills && p.exp >= u.years) p.career = u.to }
const payWith = (job, market, p) => salaryOf({ ...p, job }, market)

function botAct(p, jobs, market) {
  const now = salaryOf(p, market)
  const better = jobs.filter(j => qualifies(p, j) && payWith(j, market, p) > now).sort((a, b) => payWith(b, market, p) - payWith(a, market, p))[0]
  if (better) return { type: 'apply', job: better }
  // chase the hottest sector the player can reach
  const hot = SECT.slice().sort((a, b) => market[b] - market[a])[0]
  const hotSkill = Object.keys(SECTORS).find(s => SECTORS[s] === hot)
  if (p.cash >= SKILL_COST && p.skills[hotSkill] < 5) return { type: 'skill', skill: hotSkill }
  if (p.edu < 3 && p.cash >= EDU_COST[p.edu + 1]) return { type: 'edu' }
  return { type: 'rest' }
}

function act(p, a, taken) {
  if (a.type === 'apply' && !taken.has(a.job.title) && qualifies(p, a.job)) { p.job = { ...a.job }; taken.add(a.job.title); return `took ${a.job.title}` }
  if (a.type === 'skill' && p.cash >= SKILL_COST && p.skills[a.skill] < 5) { p.cash -= SKILL_COST; p.skills[a.skill] += 1; return `learned ${a.skill}` }
  if (a.type === 'edu' && p.edu < 3 && p.cash >= EDU_COST[p.edu + 1]) { p.cash -= EDU_COST[p.edu + 1]; p.edu += 1; return 'went back to study' }
  if (a.type === 'retrain' && p.cash >= RETRAIN && p.skills[a.from] > 0 && p.skills[a.to] < 5) { p.cash -= RETRAIN; p.skills[a.from] -= 1; p.skills[a.to] += 1; return `retrained ${a.from} into ${a.to}` }
  return 'waited'
}

export default function JobMarket({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId))
  const [market, setMarket] = React.useState({ Manufacturing: 0, Services: 0, Technology: 0, Care: 0 })
  const [round, setRound] = React.useState(1)
  const [news, setNews] = React.useState(null)
  const [jobs, setJobs] = React.useState([])
  const [phase, setPhase] = React.useState('news')       // news | act | result
  const [retrain, setRetrain] = React.useState({ from: 'Making', to: 'Digital' })
  const [log, setLog] = React.useState([])
  const [over, setOver] = React.useState(false)
  const me = players[0]

  function flip() {
    const m = { ...market }; const before = { ...m }
    const ps = clonePlayers(players)
    const cards = shuffle(MARKET).slice(0, 2)
    const hits = []
    for (const c of cards) {
      c.f(m); clamp(m)
      if (c.fires) for (const p of ps) if (c.fires(p)) { hits.push(`${nm(p)} lost the job as ${p.job.title}`); p.job = null }
      if (c.pays) for (const p of ps) { const v = c.pays(p); if (v) { p.cash += v; hits.push(`${nm(p)} took ${money(v)}`) } }
    }
    setMarket(m); setPlayers(ps)
    setNews({ cards, moves: SECT.filter(k => m[k] !== before[k]).map(k => ({ k, from: before[k], to: m[k] })), hits })
    setJobs(shuffle(JOBS).slice(0, 3)); setPhase('act')
  }

  function choose(a) {
    const ps = clonePlayers(players); const taken = new Set(); const lines = []
    lines.push({ pid: 0, text: act(ps[0], a, taken) })
    for (const p of ps.slice(1)) lines.push({ pid: p.id, text: act(p, botAct(p, jobs, market), taken) })
    for (const p of ps) { const s = salaryOf(p, market); if (s) { p.cash += s; p.exp += 1 } upgrade(p) }
    setPlayers(ps); setLog(lines); setPhase('result')
  }

  function next() {
    if (round >= ROUNDS) { setOver(true); return }
    setRound(round + 1); setNews(null); setPhase('news')
  }

  if (over) {
    const rows = players.slice().sort((a, b) => b.career - a.career || b.cash - a.cash)
      .map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [LEVEL[p.career], p.job ? p.job.title : 'No job', money(p.cash)] }))
    return <Finish title={rows[0].me ? 'You read the market best' : `${rows[0].name} read the market best`} rows={rows}
      lesson={['Which sector was best in round one, and which was best at the end?', 'Did you retrain? Did it pay back before the game ended?', 'There is no safe sector. What would you do differently?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  return (
    <GameFrame title="The Job Market" round={round} rounds={ROUNDS} onHome={onHome}
      dock={phase === 'news' ? <button className="btn sun grow big" onClick={flip}>Read this year's news</button>
        : phase === 'result' ? <button className="btn sun grow big" onClick={next}>{round >= ROUNDS ? 'See who won' : 'Next year'}</button> : null}>

      <div className="sectors">
        {SECT.map(k => (
          <div key={k} className="sector">
            <b>{k}</b>
            <div className="strack">{[-2, -1, 0, 1, 2].map(v => <i key={v} className={market[k] === v ? 'on ' + (v > 0 ? 'up' : v < 0 ? 'down' : '') : ''}>{v > 0 ? '+' + v : v}</i>)}</div>
            <span className={market[k] > 0 ? 'up' : market[k] < 0 ? 'down' : ''}>{market[k] === 0 ? 'normal pay' : `${market[k] > 0 ? '+' : ''}${money(market[k] * 50).replace('₹-', '-₹')} a job`}</span>
          </div>
        ))}
      </div>

      {news && (
        <div className="news">
          <span className="kicker">Town news</span>
          {news.cards.map(c => <p key={c.t}><b>{c.t}.</b> {c.d}</p>)}
          {news.moves.length > 0 && <div className="moves">{news.moves.map(m => <span key={m.k} className={m.to > m.from ? 'up' : 'down'}>{m.k} {m.from} to {m.to}</span>)}</div>}
          {news.hits.length > 0 && <ul className="hits">{news.hits.map((h, i) => <li key={i}>{h}</li>)}</ul>}
        </div>
      )}

      {phase === 'act' && (
        <>
          <p className="gintro">Take ONE action this year.</p>
          <div className="jobrow">
            {jobs.map(j => {
              const ok = qualifies(me, j)
              return (
                <JobCard key={j.title} job={{ ...j, pay: payWith(j, market, me) }} onClick={ok ? () => choose({ type: 'apply', job: j }) : undefined}
                  tag={ok ? 'Tap to take it' : 'Short: ' + missingReason(me, j)[0]} dim={!ok} />
              )
            })}
          </div>
          <div className="actions">
            {SKILLS.map(s => <button key={s} className="btn ghost" disabled={me.cash < SKILL_COST || me.skills[s] >= 5} onClick={() => choose({ type: 'skill', skill: s })}>Learn {s} ({money(SKILL_COST)})</button>)}
            <button className="btn ghost" disabled={me.edu >= 3 || me.cash < EDU_COST[me.edu + 1]} onClick={() => choose({ type: 'edu' })}>Study ({me.edu < 3 ? money(EDU_COST[me.edu + 1]) : 'maxed'})</button>
          </div>
          <div className="retrain">
            <b>Retrain for {money(RETRAIN)}</b>
            <select value={retrain.from} onChange={e => setRetrain({ ...retrain, from: e.target.value })}>{SKILLS.map(s => <option key={s}>{s}</option>)}</select>
            <span>into</span>
            <select value={retrain.to} onChange={e => setRetrain({ ...retrain, to: e.target.value })}>{SKILLS.map(s => <option key={s}>{s}</option>)}</select>
            <button className="btn sun" disabled={me.cash < RETRAIN || me.skills[retrain.from] < 1 || retrain.from === retrain.to || me.skills[retrain.to] >= 5}
              onClick={() => choose({ type: 'retrain', ...retrain })}>Retrain</button>
          </div>
          <button className="btn ghost" onClick={() => choose({ type: 'rest' })}>Wait this year</button>
        </>
      )}

      {phase === 'result' && (
        <div className="verdict">
          <span className="kicker">This year</span>
          {log.map(l => <p key={l.pid}><b>{nm(players[l.pid])}</b> {l.text}.</p>)}
          <p className="train">Your pay this year: {money(salaryOf(me, market))}{me.job ? ` as ${me.job.title}` : ' (no job)'}.</p>
        </div>
      )}

      <MySkills p={me} />
      <Seats players={players} />
    </GameFrame>
  )
}
