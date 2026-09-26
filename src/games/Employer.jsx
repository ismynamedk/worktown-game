/* The Employer. The only game where you are not trying to get a job.
   Every vacancy hides what the company really needs. Highest score does not win.
   Best fit wins. */
import React from 'react'
import { UPGRADES, SKILL_COST, EDU_COST } from '../data.js'
import {
  seatTable, clonePlayers, JOBS, shuffle, qualifies, totalSkill, weakest,
  JobCard, Seats, MySkills, GameFrame, Finish, money, COLOURS, nm, SKILLS, EDU, LEVEL,
} from './common.jsx'

const ROUNDS = 8
const NEEDS = [
  { id: 'ready', label: 'Ready today', pitch: 'I have the strongest skill for this job', say: 'the highest skill for the job' },
  { id: 'stay', label: 'Will stay', pitch: 'I will stay, I have not moved around', say: 'held the fewest jobs so far' },
  { id: 'seen', label: 'Has seen it before', pitch: 'I have the most experience', say: 'the most years of experience' },
  { id: 'cheap', label: 'Cheapest to run', pitch: 'I will do it for less', say: 'asked for the lowest salary' },
  { id: 'grow', label: 'Room to grow', pitch: 'I am skilled and still early in my career', say: 'good skill but the fewest years' },
]
const r25 = n => Math.round(n / 25) * 25
const upgrade = p => { for (const u of UPGRADES) if (p.career < u.to && totalSkill(p) >= u.skills && p.exp >= u.years) p.career = u.to }

function metric(need, c, job) {
  if (need === 'ready') return c.p.skills[job.sk]
  if (need === 'stay') return -c.p.jobsHeld
  if (need === 'seen') return c.p.exp
  if (need === 'cheap') return -c.ask
  if (need === 'grow') return c.p.skills[job.sk] >= 3 ? 100 - c.p.exp : -100 - c.p.exp
  return 0
}
function bestFor(need, cands, job) {
  const q = cands.filter(c => c.ok)
  if (!q.length) return []
  const top = Math.max(...q.map(c => metric(need, c, job)))
  return q.filter(c => metric(need, c, job) === top).map(c => c.p.id)
}

function trainBot(p) {
  const target = JOBS.filter(j => !qualifies(p, j) && j.lvl <= p.career + 1).sort((a, b) => b.pay - a.pay)[0]
  if (target && p.edu < target.edu && p.cash >= EDU_COST[p.edu + 1]) { p.cash -= EDU_COST[p.edu + 1]; p.edu += 1; return }
  const s = target ? target.sk : weakest(p)
  if (p.cash >= SKILL_COST && p.skills[s] < 5) { p.cash -= SKILL_COST; p.skills[s] += 1 }
}

export default function Employer({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId).map(p => ({ ...p, jobsHeld: 0, score: 0 })))
  const [round, setRound] = React.useState(1)
  const [vac, setVac] = React.useState(null)          // { job, need }
  const [cands, setCands] = React.useState([])
  const [phase, setPhase] = React.useState('open')    // open | pitch | choose | reveal | train | done
  const [myPitch, setMyPitch] = React.useState(null)
  const [result, setResult] = React.useState(null)
  const [over, setOver] = React.useState(false)
  const me = players[0]
  const employer = (round - 1) % 4

  function open() {
    const top = Math.max(...players.map(p => p.career))
    const pool = JOBS.map((j, i) => ({ j, i })).filter(x => x.j.lvl <= Math.min(3, top + 1))
    // always a real choice: the vacancies with the most eligible candidates, at random among the best
    const count = x => players.filter(p => p.id !== employer && qualifies(p, x.j)).length
    const scored = shuffle(pool).map(x => ({ x, n: count(x) }))
    const most = Math.max(...scored.map(s => s.n))
    const pick = (most >= 2 ? scored.find(s => s.n >= 2) : scored.find(s => s.n === most)).x
    const job = pick.j
    const need = NEEDS[pick.i % NEEDS.length].id
    const cs = players.filter(p => p.id !== employer).map(p => ({ p, ok: qualifies(p, job), ask: r25(job.pay * (0.85 + Math.random() * 0.3)) }))
    setVac({ job, need }); setCands(cs); setMyPitch(null); setResult(null)
    setPhase(employer === 0 ? 'choose' : 'pitch')
  }

  function hire(pid, pitchUsed) {
    const ps = clonePlayers(players)
    const best = bestFor(vac.need, cands, vac.job)
    const anyOk = cands.some(c => c.ok)
    const pts = pid == null ? (anyOk ? 0 : 1) : best.includes(pid) ? 3 : 1
    ps[employer].score += pts
    if (pid != null) { const c = cands.find(x => x.p.id === pid); ps[pid].job = { ...vac.job, salary: c.ask }; ps[pid].jobsHeld += 1 }
    for (const p of ps) if (!p.human) trainBot(p)
    for (const p of ps) if (p.job) { p.cash += p.job.salary ?? p.job.pay; p.exp += 1 }
    ps.forEach(upgrade)
    setPlayers(ps)
    setResult({ pid, pts, best, pitch: pitchUsed })
    setPhase('reveal')
  }

  // a rival is hiring: they listen to your pitch, then choose
  function pitch(nid) {
    setMyPitch(nid)
    const guess = Math.random() < 0.5 ? nid : NEEDS[Math.floor(Math.random() * NEEDS.length)].id
    const q = cands.filter(c => c.ok)
    let pid = null
    if (q.length) {
      const top = Math.max(...q.map(c => metric(guess, c, vac.job)))
      const tops = q.filter(c => metric(guess, c, vac.job) === top)
      pid = (tops.find(c => c.p.human && nid === guess) || tops[0]).p.id
    }
    hire(pid, nid)
  }

  function train(what) {
    const ps = clonePlayers(players); const p = ps[0]
    if (what === 'Education') { const c = EDU_COST[p.edu + 1]; if (p.edu < 3 && p.cash >= c) { p.cash -= c; p.edu += 1 } }
    else if (what && p.cash >= SKILL_COST && p.skills[what] < 5) { p.cash -= SKILL_COST; p.skills[what] += 1 }
    upgrade(p); setPlayers(ps); setPhase('done')
  }

  function next() { if (round >= ROUNDS) { setOver(true); return } setRound(round + 1); setVac(null); setPhase('open') }

  if (over) {
    const rec = players.slice().sort((a, b) => b.score - a.score)
    const cand = players.slice().sort((a, b) => b.career - a.career || b.cash - a.cash)
    const rows = rec.map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [`Recruiter ${p.score} of 6`, `${LEVEL[p.career]}`, money(p.cash)] }))
    return <Finish title={`Best recruiter: ${nm(rec[0])}. Best candidate: ${nm(cand[0])}.`} rows={rows}
      lesson={['Which hire looked strongest but still scored only 1 point? What did the job really need?', 'Were the best recruiter and the best candidate the same person?', 'Which side did you prefer: hiring or being hired?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  const needObj = vac && NEEDS.find(n => n.id === vac.need)
  return (
    <GameFrame title="The Employer" round={round} rounds={ROUNDS} onHome={onHome}
      dock={phase === 'open' ? <button className="btn sun grow big" onClick={open}>{employer === 0 ? 'You are hiring. Open the vacancy' : `${nm(players[employer])} is hiring`}</button>
        : phase === 'done' ? <button className="btn sun grow big" onClick={next}>{round >= ROUNDS ? 'See the result' : 'Next round'}</button> : null}>
      <p className="gintro">Every vacancy hides a <b>Need</b> on the back: Ready today, Will stay, Has seen it before, Cheapest to run, or Room to grow. Hire the person who has the most of what the job really needs: 3 points. Anyone else: 1 point.</p>

      {vac && (
        <div className="auction">
          <JobCard job={vac.job} tag={phase === 'reveal' || phase === 'train' || phase === 'done' ? `Need: ${needObj.label}` : 'Need: hidden'} />
          <div className="bidbox">
            <table className="mini"><thead><tr><th>Candidate</th><th>{vac.job.sk}</th><th>Years</th><th>Education</th><th>Jobs held</th><th>Asks</th><th></th></tr></thead>
              <tbody>{cands.map(c => (
                <tr key={c.p.id} className={result && result.pid === c.p.id ? 'won' : ''}>
                  <td>{nm(c.p)}</td><td>{c.p.skills[vac.job.sk]}</td><td>{c.p.exp}</td><td>{EDU[c.p.edu]}</td><td>{c.p.jobsHeld}</td><td>{money(c.ask)}</td>
                  <td>{phase === 'choose' ? (c.ok ? <button className="btn sun" onClick={() => hire(c.p.id)}>Hire</button> : <span className="no">Not eligible</span>) : c.ok ? '' : <span className="no">Not eligible</span>}</td>
                </tr>))}</tbody></table>
            {phase === 'choose' && <button className="btn ghost" onClick={() => hire(null)}>Hire nobody</button>}
            {phase === 'pitch' && (
              cands.find(c => c.p.human && c.ok)
                ? <><b>You get one sentence. What do you tell {nm(players[employer])}?</b>
                    <div className="pitches">{NEEDS.map(n => <button key={n.id} className="btn ghost" onClick={() => pitch(n.id)}>"{n.pitch}"</button>)}</div>
                    <p className="hint">You cannot lie. Your sheet is open. Pick the strength that matches what you think this job needs.</p></>
                : <><b>You do not qualify for this one.</b><button className="btn sun" onClick={() => pitch(null)}>Watch the hiring</button></>
            )}
          </div>
        </div>
      )}

      {result && (phase === 'reveal' || phase === 'train' || phase === 'done') && (
        <div className="verdict">
          <span className="kicker">Card turned over: {needObj.label}</span>
          <p>{result.pid == null ? `${nm(players[employer])} hired nobody.` : `${nm(players[employer])} hired ${nm(players[result.pid])}.`} The job needed the person with {needObj.say}{result.best.length ? `: that was ${result.best.map(id => nm(players[id])).join(' or ')}` : ''}.</p>
          <h2>{nm(players[employer])} scores {result.pts} point{result.pts === 1 ? '' : 's'}</h2>
          {employer !== 0 && result.pitch && <p className="hint">Your pitch was "{NEEDS.find(n => n.id === result.pitch).pitch}".</p>}
          {phase === 'reveal' && (
            <div className="shop"><b>Train before the next round?</b>
              <div className="shoprow">
                {SKILLS.map(s => <button key={s} className="btn ghost" disabled={me.cash < SKILL_COST || me.skills[s] >= 5} onClick={() => train(s)}>{s} {money(SKILL_COST)}</button>)}
                <button className="btn ghost" disabled={me.edu >= 3 || me.cash < EDU_COST[me.edu + 1]} onClick={() => train('Education')}>Study</button>
                <button className="btn ghost" onClick={() => train(null)}>Save</button>
              </div></div>
          )}
        </div>
      )}

      <MySkills p={me} />
      <Seats players={players} extra={p => `Recruiter ${p.score}`} show="score" />
    </GameFrame>
  )
}
