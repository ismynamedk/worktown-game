/* Career Builder. One Build and one Work every turn, ten years, and the first
   to Senior holding a Senior job wins on the spot. "I did not get lucky. I built this." */
import React from 'react'
import { UPGRADES, SKILL_COST, EDU_COST, PRODUCTIVITY, MARKET } from '../data.js'
import { salaryOf } from '../engine.js'
import {
  seatTable, clonePlayers, JOBS, shuffle, qualifies, missingReason, totalSkill, weakest,
  JobCard, TextCard, Seats, MySkills, GameFrame, Finish, money, COLOURS, nm, SKILLS, EDU, LEVEL,
} from './common.jsx'

const ROUNDS = 10
const FLAT = { Manufacturing: 0, Services: 0, Technology: 0, Care: 0 }

function checkUp(p) {
  const out = []
  for (const u of UPGRADES) if (p.career < u.to && totalSkill(p) >= u.skills && p.exp >= u.years) {
    p.career = u.to; out.push(`${nm(p)} reached ${u.name}, because ${totalSkill(p)} skill points and ${p.exp} years.`)
  }
  return out
}
const twoJobs = p => shuffle(JOBS.filter(j => j.lvl <= p.career)).slice(0, 2)

function botBuild(p) {
  const up = UPGRADES.find(u => p.career < u.to)
  const target = JOBS.filter(j => !qualifies(p, j) && j.lvl <= p.career + 1).sort((a, b) => b.pay - a.pay)[0]
  if (up && totalSkill(p) < up.skills && p.cash >= SKILL_COST) {
    const s = target ? target.sk : weakest(p); if (p.skills[s] < 5) { p.cash -= SKILL_COST; p.skills[s] += 1; return `learned ${s}` }
  }
  if (target && p.edu < target.edu && p.cash >= EDU_COST[p.edu + 1]) { p.cash -= EDU_COST[p.edu + 1]; p.edu += 1; return 'studied' }
  p.exp += 1; p.cash += 50; return 'did an apprenticeship'
}
function botWork(p, deck) {
  const offers = twoJobs(p).filter(j => qualifies(p, j) && (!p.job || j.pay > p.job.pay)).sort((a, b) => b.pay - a.pay)
  if (offers[0]) { p.job = { ...offers[0] }; return `took ${offers[0].title}` }
  if (p.job) { const c = deck.pop(); if (p.skills[c.sk] >= c.n) { p.cash += c.pay; if (c.exp) p.exp += c.exp; return `performed: ${c.t} (+${money(c.pay)})` } return 'performed, but was short on skill' }
  p.cash += 100; return 'rested'
}

export default function CareerBuilder({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId))
  const [round, setRound] = React.useState(1)
  const [step, setStep] = React.useState('build')     // build | work | offers | result
  const [offers, setOffers] = React.useState([])
  const [prodCard, setProdCard] = React.useState(null)
  const [log, setLog] = React.useState([])
  const [deck] = React.useState(() => shuffle([...PRODUCTIVITY, ...PRODUCTIVITY]))
  const [news, setNews] = React.useState(null)
  const [winner, setWinner] = React.useState(null)
  const [over, setOver] = React.useState(false)
  const me = players[0]

  function build(kind, skill) {
    const ps = clonePlayers(players); const p = ps[0]
    if (kind === 'skill' && p.cash >= SKILL_COST && p.skills[skill] < 5) { p.cash -= SKILL_COST; p.skills[skill] += 1 }
    if (kind === 'edu' && p.edu < 3 && p.cash >= EDU_COST[p.edu + 1]) { p.cash -= EDU_COST[p.edu + 1]; p.edu += 1 }
    if (kind === 'appr') { p.exp += 1; p.cash += 50 }
    setPlayers(ps); setStep('work')
  }

  function work(kind) {
    if (kind === 'apply') { setOffers(twoJobs(me)); setStep('offers'); return }
    const ps = clonePlayers(players); const p = ps[0]; let mine
    if (kind === 'perform') {
      const c = deck.pop(); setProdCard(c)
      if (p.skills[c.sk] >= c.n) { p.cash += c.pay; if (c.exp) p.exp += c.exp; mine = `performed well: +${money(c.pay)}` } else mine = `were short: needs ${c.sk} ${c.n}`
    } else { p.cash += 100; mine = 'rested (+' + money(100) + ')' }
    endTurn(ps, mine)
  }

  function takeOffer(j) {
    const ps = clonePlayers(players)
    let mine = 'did not take a job'
    if (j && qualifies(ps[0], j)) { ps[0].job = { ...j }; mine = `took ${j.title}` }
    endTurn(ps, mine)
  }

  function endTurn(ps, mine) {
    const lines = [{ pid: 0, text: 'You ' + mine }]
    for (const p of ps.slice(1)) { const a = botBuild(p); const b = botWork(p, deck); lines.push({ pid: p.id, text: `${nm(p)} ${a}, then ${b}` }) }
    for (const p of ps) { const s = salaryOf(p, FLAT); if (s) { p.cash += s; p.exp += 1 } }
    for (const p of ps) checkUp(p).forEach(t => lines.push({ pid: p.id, text: t, up: true }))
    let n = null
    if (round % 2 === 0) {
      const c = shuffle(MARKET)[0]; const m = { ...FLAT }; c.f(m)
      if (c.fires) for (const p of ps) if (c.fires(p)) { lines.push({ pid: p.id, text: `${nm(p)} lost the job to ${c.t}` }); p.job = null }
      if (c.pays) for (const p of ps) p.cash += c.pays(p)
      n = c
    }
    const champ = ps.find(p => p.career >= 3 && p.job && p.job.lvl >= 3)
    setPlayers(ps); setLog(lines); setNews(n); setStep('result')
    if (champ) setWinner(champ.id)
  }

  function next() {
    if (winner != null || round >= ROUNDS) { setOver(true); return }
    setRound(round + 1); setStep('build'); setProdCard(null); setNews(null)
  }

  if (over) {
    const rows = players.slice().sort((a, b) => (b.id === winner) - (a.id === winner) || b.career - a.career || b.exp - a.exp || b.cash - a.cash)
      .map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [LEVEL[p.career], `${p.exp} years`, p.job ? p.job.title : 'No job', money(p.cash)] }))
    return <Finish title={winner != null ? `${rows[0].name} reached Senior first` : rows[0].me ? 'You built the strongest career' : `${rows[0].name} built the strongest career`} rows={rows}
      lesson={['What did you buy in year two, and was it still useful in year nine?', 'Here, experience beats cash in a tie. Why do you think that is?', 'Who was ahead at year five? Did they stay ahead?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  return (
    <GameFrame title="Career Builder" round={round} rounds={ROUNDS} onHome={onHome}
      dock={step === 'result' ? <button className="btn sun grow big" onClick={next}>{winner != null || round >= ROUNDS ? 'See who won' : 'Next year'}</button> : null}>
      <p className="gintro">Each year: one <b>Build</b> action, then one <b>Work</b> action. First to Senior who also holds a Senior job wins straight away.</p>

      {step === 'build' && (
        <div className="choices">
          <h3>1. Build</h3>
          <div className="shoprow">
            {SKILLS.map(s => <button key={s} className="btn ghost" disabled={me.cash < SKILL_COST || me.skills[s] >= 5} onClick={() => build('skill', s)}>Learn {s} {money(SKILL_COST)}</button>)}
            <button className="btn ghost" disabled={me.edu >= 3 || me.cash < EDU_COST[me.edu + 1]} onClick={() => build('edu')}>{me.edu < 3 ? `Study for ${EDU[me.edu + 1]} ${money(EDU_COST[me.edu + 1])}` : 'Education maxed'}</button>
            <button className="btn sun" onClick={() => build('appr')}>Apprenticeship: +1 year, +{money(50)}</button>
          </div>
        </div>
      )}

      {step === 'work' && (
        <div className="choices">
          <h3>2. Work</h3>
          <div className="shoprow">
            <button className="btn sun" onClick={() => work('apply')}>Apply: see two jobs at your level</button>
            <button className="btn ghost" disabled={!me.job} onClick={() => work('perform')}>Perform: draw a productivity card</button>
            <button className="btn ghost" onClick={() => work('rest')}>Rest: +{money(100)}</button>
          </div>
        </div>
      )}

      {step === 'offers' && (
        <>
          <div className="jobrow">
            {offers.map(j => {
              const ok = qualifies(me, j)
              return <JobCard key={j.title} job={j} dim={!ok} onClick={ok ? () => takeOffer(j) : undefined} tag={ok ? 'Tap to take it' : 'Short: ' + missingReason(me, j)[0]} />
            })}
          </div>
          <button className="btn ghost" onClick={() => takeOffer(null)}>Keep what I have</button>
        </>
      )}

      {step === 'result' && (
        <div className="verdict">
          {prodCard && <TextCard kind="prod" title={prodCard.t} body={`Needs ${prodCard.sk} ${prodCard.n}. Pays ${money(prodCard.pay)}.`} />}
          <span className="kicker">Year {round}</span>
          {log.map((l, i) => <p key={i} className={l.up ? 'up-line' : ''}>{l.text}.</p>)}
          {news && <div className="news"><span className="kicker">Town news</span><b>{news.t}.</b> {news.d}</div>}
          {winner != null && <h2>{nm(players[winner])} is Senior with a Senior job!</h2>}
        </div>
      )}

      <MySkills p={me} />
      <Seats players={players} extra={p => `${p.exp} yr`} />
    </GameFrame>
  )
}
