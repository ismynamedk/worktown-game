/* Blind Application. Four vacancies, everyone picks one in secret, then reveal.
   The lesson lands the first time three people reach for the same card. */
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { UPGRADES, SKILL_COST } from '../data.js'
import { strongest, decider } from '../engine.js'
import {
  seatTable, clonePlayers, JOBS, shuffle, qualifies, missingReason, weakest, totalSkill,
  JobCard, Seats, MySkills, GameFrame, Finish, SkillToken, money, COLOURS, nm, SKILLS, EDU,
} from './common.jsx'

const ROUNDS = 6

function deal(round, used) {
  // early rounds are winnable from Entry; the ceiling rises as the game goes on
  const cap = round <= 2 ? 1 : round <= 4 ? 2 : 3
  const fresh = j => !used.has(j.title)
  const easy = shuffle(JOBS.filter(j => j.lvl === 1 && fresh(j)))
  const rest = shuffle(JOBS.filter(j => j.lvl > 1 && j.lvl <= cap && fresh(j)))
  const pick = [...easy.slice(0, cap === 1 ? 4 : 2), ...rest].slice(0, 4)
  return pick.length === 4 ? shuffle(pick) : shuffle(JOBS.filter(j => j.lvl <= cap)).slice(0, 4)
}

function botPick(p, jobs) {
  const ok = jobs.map((j, i) => ({ j, i })).filter(x => qualifies(p, x.j))
  if (!ok.length) {
    const near = jobs.map((j, i) => ({ i, miss: missingReason(p, j).length })).sort((a, b) => a.miss - b.miss)
    return near[0].i
  }
  ok.sort((a, b) => b.j.pay - a.j.pay)
  const r = Math.random()
  return (r < 0.62 || ok.length === 1 ? ok[0] : r < 0.88 ? ok[1] : ok[Math.floor(Math.random() * ok.length)]).i
}

function upgrade(p) {
  for (const u of UPGRADES) if (p.career < u.to && totalSkill(p) >= u.skills && p.exp >= u.years) p.career = u.to
}

export default function BlindApplication({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId).map(p => ({ ...p, earned: 0 })))
  const [round, setRound] = React.useState(1)
  const [used] = React.useState(() => new Set())
  const [jobs, setJobs] = React.useState(() => deal(1, new Set()))
  const [mine, setMine] = React.useState(null)
  const [reveal, setReveal] = React.useState(null)     // { picks, results }
  const [bought, setBought] = React.useState(false)
  const [over, setOver] = React.useState(false)
  const me = players[0]

  function send() {
    const ps = clonePlayers(players)
    const picks = ps.map(p => (p.human ? mine : botPick(p, jobs)))
    const results = jobs.map((job, ji) => {
      const applied = ps.filter((_, k) => picks[k] === ji)
      const eligible = applied.filter(p => qualifies(p, job))
      const win = eligible.length ? strongest(eligible, job) : null
      return {
        job, applied: applied.map(p => p.id),
        winner: win ? win.id : null,
        reason: win ? decider(eligible, win, job) : null,
        table: applied.map(p => ({ id: p.id, name: nm(p), skill: p.skills[job.sk], exp: p.exp, edu: p.edu, ok: qualifies(p, job) })),
      }
    })
    for (const r of results) {
      for (const pid of r.applied) {
        const p = ps[pid]
        if (pid === r.winner) { p.earned += r.job.pay; p.cash += r.job.pay; p.exp += 1 }
        else { p.cash += 50; const s = weakest(p); if (p.skills[s] < 5) p.skills[s] += 1 }
      }
    }
    // rivals train with what they have
    for (const p of ps.filter(p => !p.human)) {
      if (p.cash >= SKILL_COST) {
        const target = JOBS.filter(j => !qualifies(p, j) && j.edu <= p.edu && j.lvl <= p.career + 1).sort((a, b) => b.pay - a.pay)[0]
        const s = target ? target.sk : weakest(p)
        if (p.skills[s] < 5) { p.skills[s] += 1; p.cash -= SKILL_COST }
      }
    }
    ps.forEach(upgrade)
    setPlayers(ps); setReveal({ picks, results }); setBought(false)
  }

  function buy(skill) {
    const ps = clonePlayers(players); const p = ps[0]
    if (skill === 'Education') { const cost = [0, 150, 300, 500][p.edu + 1]; if (p.edu < 3 && p.cash >= cost) { p.cash -= cost; p.edu += 1 } }
    else if (p.cash >= SKILL_COST && p.skills[skill] < 5) { p.cash -= SKILL_COST; p.skills[skill] += 1 }
    upgrade(p); setPlayers(ps); setBought(true)
  }

  function next() {
    if (round >= ROUNDS) { setOver(true); return }
    jobs.forEach(j => used.add(j.title))
    setJobs(deal(round + 1, used)); setRound(round + 1); setMine(null); setReveal(null)
  }

  if (over) {
    const rows = players.slice().sort((a, b) => b.earned - a.earned)
      .map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [`${money(p.earned)} earned`, `${p.exp} yr`, `Career ${p.career}`] }))
    return <Finish title={rows[0].me ? 'You earned the most' : `${rows[0].name} earned the most`} rows={rows}
      lesson={['Did you ever pick the job nobody else wanted? What happened?', 'When three of you went for the same job, who got it, and which rule decided it?', 'Every rejection trained you. Did it help you later?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  const myResult = reveal && reveal.results.find(r => r.applied.includes(0))
  return (
    <GameFrame title="Blind Application" round={round} rounds={ROUNDS} onHome={onHome}
      dock={!reveal
        ? <button className="btn sun grow big" disabled={mine === null} onClick={send}>{mine === null ? 'Tap a job to apply' : 'Send my application'}</button>
        : <button className="btn sun grow big" onClick={next}>{round >= ROUNDS ? 'See who won' : 'Next round'}</button>}>
      <p className="gintro">{!reveal ? 'Four jobs are open. Everyone picks ONE in secret. If more than one person picks the same job, only the strongest gets it.' : 'Reveal!'}</p>
      <div className="jobrow">
        {jobs.map((j, i) => {
          const r = reveal && reveal.results[i]
          return (
            <JobCard key={j.title} job={j} selected={mine === i} onClick={!reveal ? () => setMine(i) : undefined}
              tag={!reveal && !qualifies(me, j) ? 'You do not qualify' : null}>
              {r && (
                <span className="appl">
                  {r.applied.map(pid => <i key={pid} className={'dot' + (pid === r.winner ? ' win' : '')} style={{ background: COLOURS[pid] }} />)}
                  {r.applied.length === 0 && <em>No one</em>}
                </span>
              )}
            </JobCard>
          )
        })}
      </div>

      <AnimatePresence>
        {reveal && myResult && (
          <motion.div className="verdict" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {myResult.winner === 0
              ? <><span className="kicker">You got it</span><h2>{myResult.job.title}</h2><p>{money(myResult.job.pay)} earned this round and a year of experience.</p></>
              : <><span className="kicker">Not this time</span><h2>{myResult.job.title}</h2>
                  <p>{myResult.winner !== null ? `${nm(players[myResult.winner])} got it. ${myResult.reason}` : 'Nobody who applied met the requirements.'}</p>
                  {!qualifies(players[0], myResult.job) && missingReason(players[0], myResult.job).length > 0 &&
                    <p className="miss">You were short: {missingReason(players[0], myResult.job).join('; ')}.</p>}
                  <p className="train">You took {money(50)} and one free skill point. Rejection is where people train.</p></>}
            {myResult.table.length > 1 && (
              <table className="mini"><tbody>{myResult.table.map(c => (
                <tr key={c.id} className={c.id === myResult.winner ? 'won' : ''}><td>{c.name}</td><td>{myResult.job.sk} {c.skill}</td><td>{c.exp} yr</td><td>{EDU[c.edu]}</td><td>{c.ok ? 'Qualified' : 'Not eligible'}</td></tr>
              ))}</tbody></table>
            )}
            {!bought && (
              <div className="shop">
                <b>Train before the next round? {money(SKILL_COST)} a skill point.</b>
                <div className="shoprow">{[...SKILLS, 'Education'].map(s => <SkillToken key={s} skill={s} onClick={() => buy(s)} disabled={s !== 'Education' && (me.cash < SKILL_COST || me.skills[s] >= 5)} />)}</div>
                <button className="btn ghost" onClick={() => setBought(true)}>Save my money</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <MySkills p={me} />
      <Seats players={players} show="earned" extra={p => money(p.earned) + ' earned'} />
    </GameFrame>
  )
}
