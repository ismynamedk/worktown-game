/* What Am I Worth? A salary stops being a number on a card and becomes
   something two people arrive at. One player is the employer each round. */
import React from 'react'
import { UPGRADES, SKILL_COST, EDU_COST } from '../data.js'
import {
  seatTable, clonePlayers, JOBS, shuffle, qualifies, missingReason, totalSkill, weakest,
  JobCard, Seats, MySkills, GameFrame, Finish, money, COLOURS, nm, SKILLS, EDU,
} from './common.jsx'

const ROUNDS = 8
const r25 = n => Math.max(25, Math.round(n / 25) * 25)
const upgrade = p => { for (const u of UPGRADES) if (p.career < u.to && totalSkill(p) >= u.skills && p.exp >= u.years) p.career = u.to }

function drawVacancy(ps, employerId) {
  const top = Math.max(...ps.map(p => p.career))
  const pool = JOBS.filter(j => j.lvl <= Math.min(3, top + 1))
  const scored = shuffle(pool).map(j => ({ j, n: ps.filter(p => p.id !== employerId && qualifies(p, j)).length }))
  return (scored.find(s => s.n >= 2) || scored.sort((a, b) => b.n - a.n)[0]).j
}

function botBid(p, job, nQualified) {
  const scarcity = nQualified <= 1 ? 1.2 : nQualified === 2 ? 1.02 : 0.88
  let b = job.pay * scarcity * (0.9 + Math.random() * 0.2)
  if (p.job) b = Math.max(b, p.job.salary + 25)          // nobody moves for less
  return r25(b)
}

function botTrain(p) {
  const target = JOBS.filter(j => !qualifies(p, j) && j.lvl <= p.career + 1).sort((a, b) => b.pay - a.pay)[0]
  if (target && p.edu < target.edu && p.cash >= EDU_COST[p.edu + 1]) { p.cash -= EDU_COST[p.edu + 1]; p.edu += 1; return }
  const s = target ? target.sk : weakest(p)
  if (p.cash >= SKILL_COST && p.skills[s] < 5) { p.cash -= SKILL_COST; p.skills[s] += 1 }
}

export default function WhatAmIWorth({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId).map(p => ({ ...p, earned: 0 })))
  const [round, setRound] = React.useState(1)
  const [job, setJob] = React.useState(() => null)
  const [bid, setBid] = React.useState(0)
  const [phase, setPhase] = React.useState('open')   // open | bids | hire | train | done
  const [bids, setBids] = React.useState([])
  const [outcome, setOutcome] = React.useState(null)
  const [over, setOver] = React.useState(false)
  const me = players[0]
  const employer = (round - 1) % 4
  const budget = job ? job.pay + 200 : 0

  function open() {
    const j = drawVacancy(players, employer); setJob(j); setBid(r25(j.pay)); setBids([]); setOutcome(null)
    setPhase(employer === 0 ? 'bidsCollect' : 'bids')
  }

  function collectBids(myBid) {
    const q = players.filter(p => p.id !== employer && qualifies(p, job)).length
    return players.filter(p => p.id !== employer).map(p => {
      if (!qualifies(p, job)) return { pid: p.id, bid: null, why: missingReason(p, job) }
      if (p.human) return { pid: 0, bid: myBid }
      return { pid: p.id, bid: botBid(p, job, q) }
    })
  }

  function submitMyBid() { finishHire(collectBids(bid), null) }
  function asEmployerSeeBids() { setBids(collectBids(null)); setPhase('hire') }

  function finishHire(allBids, chosen) {
    const ps = clonePlayers(players)
    const valid = allBids.filter(b => b.bid !== null && b.bid <= budget).sort((a, b) => a.bid - b.bid)
    let pick = chosen ?? (valid[0] ? valid[0].pid : null)
    let fee = 0
    if (chosen != null && valid[0] && chosen !== valid[0].pid) fee = 100
    const emp = ps[employer]
    let text
    if (pick == null) { text = 'Nobody who qualified asked for a salary inside the budget. The job stays empty.' }
    else {
      const b = allBids.find(x => x.pid === pick)
      const w = ps[pick]
      w.job = { ...job, salary: b.bid }
      const profit = budget - b.bid - fee
      emp.cash += profit; emp.earned += profit
      text = `${nm(emp)} hired ${nm(w)} at ${money(b.bid)} a round. Budget ${money(budget)}, so ${nm(emp)} keeps ${money(profit)}${fee ? ` after paying ${money(fee)} to choose someone who was not cheapest` : ''}.`
    }
    // everybody else trains, then pay day
    for (const p of ps) if (!p.human) botTrain(p)
    for (const p of ps) if (p.job) { const s = p.job.salary ?? p.job.pay; p.cash += s; p.earned += s; p.exp += 1 }
    ps.forEach(upgrade)
    setPlayers(ps); setBids(allBids); setOutcome(text); setPhase('train')
  }

  function train(what) {
    const ps = clonePlayers(players); const p = ps[0]
    if (what === 'Education') { const c = EDU_COST[p.edu + 1]; if (p.edu < 3 && p.cash >= c) { p.cash -= c; p.edu += 1 } }
    else if (what && p.cash >= SKILL_COST && p.skills[what] < 5) { p.cash -= SKILL_COST; p.skills[what] += 1 }
    upgrade(p); setPlayers(ps); setPhase('done')
  }

  function next() {
    if (round >= ROUNDS) { setOver(true); return }
    setRound(round + 1); setJob(null); setPhase('open')
  }

  if (over) {
    const rows = players.slice().sort((a, b) => b.earned - a.earned)
      .map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [money(p.earned) + ' earned', p.job ? `${p.job.title} at ${money(p.job.salary ?? p.job.pay)}` : 'No job'] }))
    return <Finish title={rows[0].me ? 'You were worth the most' : `${rows[0].name} earned the most`} rows={rows}
      lesson={['Who asked for the most and still got hired? What did they have that others did not?', 'Did you ever ask too little? What would you ask now?', 'When only one person qualified, what happened to the price?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  const iQualify = job && employer !== 0 && qualifies(me, job)
  return (
    <GameFrame title="What Am I Worth?" round={round} rounds={ROUNDS} onHome={onHome}
      dock={phase === 'open' ? <button className="btn sun grow big" onClick={open}>{employer === 0 ? 'You are the employer. Open a job' : `${nm(players[employer])} is hiring. See the job`}</button>
        : phase === 'done' ? <button className="btn sun grow big" onClick={next}>{round >= ROUNDS ? 'See who won' : 'Next round'}</button> : null}>
      <p className="gintro">Each round one player is the employer with a budget. Everyone who qualifies writes the lowest salary they would accept. The employer hires the cheapest, or pays {money(100)} to choose someone else, and keeps whatever budget is left.</p>

      {job && (
        <div className="auction">
          <JobCard job={job} tag={`Budget ${money(budget)}`} />
          {phase === 'bids' && employer !== 0 && (
            iQualify ? (
              <div className="bidbox">
                <b>What is the lowest salary you will accept?</b>
                <div className="bidval">{money(bid)}</div>
                <input type="range" min={r25(job.pay * 0.5)} max={budget + 200} step={25} value={bid} onChange={e => setBid(+e.target.value)} />
                <p className="hint">Printed pay is {money(job.pay)}. Ask more than {money(budget)} and you cannot be hired. Ask less and you may win, but you earn less every round.</p>
                <button className="btn sun big" onClick={submitMyBid}>Seal my bid</button>
              </div>
            ) : (
              <div className="bidbox"><b>You do not qualify for this one.</b><p className="miss">{missingReason(me, job).join('; ')}.</p>
                <button className="btn sun big" onClick={() => finishHire(collectBids(null), null)}>Watch the hiring</button></div>
            )
          )}
          {phase === 'bidsCollect' && <div className="bidbox"><b>You are the employer this round.</b><p className="hint">Your budget is {money(budget)}. Whatever you do not spend on salary, you keep.</p><button className="btn sun big" onClick={asEmployerSeeBids}>Open the sealed bids</button></div>}
          {phase === 'hire' && (
            <div className="bidbox">
              <b>Pick who to hire.</b>
              <table className="mini"><tbody>{bids.map(b => {
                const p = players[b.pid]
                return <tr key={b.pid}><td>{nm(p)}</td><td>{job.sk} {p.skills[job.sk]}</td><td>{p.exp} yr</td>
                  <td>{b.bid === null ? 'Not eligible' : b.bid > budget ? `${money(b.bid)} (over budget)` : money(b.bid)}</td>
                  <td>{b.bid !== null && b.bid <= budget && <button className="btn sun" onClick={() => finishHire(bids, b.pid)}>Hire</button>}</td></tr>
              })}</tbody></table>
              <p className="hint">The cheapest costs nothing extra. Anyone else costs you {money(100)} on top.</p>
              <button className="btn ghost" onClick={() => finishHire(bids.map(b => ({ ...b, bid: null })), null)}>Hire nobody</button>
            </div>
          )}
        </div>
      )}

      {outcome && (phase === 'train' || phase === 'done') && (
        <div className="verdict">
          <span className="kicker">The sealed bids</span>
          <table className="mini"><tbody>{bids.map(b => <tr key={b.pid}><td>{nm(players[b.pid])}</td><td>{b.bid === null ? 'Not eligible' : money(b.bid)}</td></tr>)}</tbody></table>
          <p>{outcome}</p>
          {phase === 'train' && (
            <div className="shop"><b>Train before the next round?</b>
              <div className="shoprow">
                {SKILLS.map(s => <button key={s} className="btn ghost" disabled={me.cash < SKILL_COST || me.skills[s] >= 5} onClick={() => train(s)}>{s} {money(SKILL_COST)}</button>)}
                <button className="btn ghost" disabled={me.edu >= 3 || me.cash < EDU_COST[me.edu + 1]} onClick={() => train('Education')}>{me.edu < 3 ? `${EDU[me.edu + 1]} ${money(EDU_COST[me.edu + 1])}` : 'Education maxed'}</button>
                <button className="btn ghost" onClick={() => train(null)}>Save</button>
              </div></div>
          )}
        </div>
      )}

      <MySkills p={me} />
      <Seats players={players} show="earned" extra={p => money(p.earned) + (p.job ? ` · ${money(p.job.salary ?? p.job.pay)}/rd` : '')} />
    </GameFrame>
  )
}
