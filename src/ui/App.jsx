import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZONES, SKILLS, EDU, EDU_COST, SKILL_COST, PROFILES, ROUNDS, SECTORS,
} from '../data.js'
import {
  newGame, resolve, place, freeSlots, botChoice, salaryOf, totalSkill, ranking, cloneGame,
} from '../engine.js'

const money = n => '₹' + n.toLocaleString('en-IN')
const TINT = { Making: 'clay', Serving: 'sage', Digital: 'slate', Caring: 'rose' }

/* ------------------------------------------------------------------ pieces */

function Zone({ zone, game, onPick, disabled }) {
  const here = game.placements[zone.id] || []
  const left = freeSlots(game, zone)
  const full = left <= 0
  return (
    <button
      className={'pin' + (full ? ' is-full' : '')}
      disabled={disabled || full}
      onClick={() => onPick(zone)}
      style={{ left: zone.x + '%', top: zone.y + '%' }}
    >
      <span className="pin-dot">
        {here.map((pid, i) => <i key={i} className={'disc p' + pid} title={game.players[pid].name} />)}
      </span>
      <span className="pin-tag">{zone.name}</span>
      <span className="pin-label">
        <span className="pin-name">{zone.name}</span>
        <span className="pin-cap">{zone.cap >= 9 ? 'open to all' : `${left} of ${zone.cap} free`}</span>
        <span className="pin-d">{zone.d}</span>
      </span>
    </button>
  )
}

function Sheet({ p, market, you }) {
  const sal = salaryOf(p, market)
  return (
    <div className={'sheet' + (you ? ' you' : '')}>
      <div className="sheet-hd">
        <i className={'disc p' + p.id} />
        <b>{p.name}</b>
        <span className="lvl">Career {p.career}</span>
      </div>
      <div className="sheet-row"><span>Cash</span><b>{money(p.cash)}</b></div>
      <div className="sheet-row"><span>Education</span><b>{EDU[p.edu]}</b></div>
      <div className="sheet-row"><span>Experience</span><b>{p.exp} yr</b></div>
      <div className="skills">
        {SKILLS.map(s => (
          <div key={s} className={'sk ' + TINT[s]}>
            <span>{s}</span>
            <span className="pips">{[1, 2, 3, 4, 5].map(n => <i key={n} className={p.skills[s] >= n ? 'on' : ''} />)}</span>
          </div>
        ))}
      </div>
      <div className="sheet-job">
        {p.job
          ? <><b>{p.job.title}</b><span>{money(sal)} a round</span></>
          : <span className="none">No job yet</span>}
      </div>
    </div>
  )
}

function MarketStrip({ market, card }) {
  return (
    <div className="market">
      <div className="market-hd">
        <b>Labour market</b>
        {card && <span>{card.t}. {card.d}</span>}
      </div>
      <div className="market-rows">
        {Object.keys(market).map(k => (
          <div key={k} className="mrow">
            <span>{k}</span>
            <span className="track">
              {[-2, -1, 0, 1, 2].map(v => (
                <i key={v} className={market[k] === v ? 'on' : ''}>{v === 0 ? '0' : (v > 0 ? '+' + v : v)}</i>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- app */

export default function App() {
  const [game, setGame] = React.useState(null)
  const [pick, setPick] = React.useState(null)       // skill-track chooser
  const [report, setReport] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [skillBuys, setSkillBuys] = React.useState([])

  const you = game && game.players[0]
  const placing = game && !game.over && you.discs > 0 && !report

  function start(profileId) { setGame(newGame(profileId)); setReport(null); setSkillBuys([]) }

  function choose(zone) {
    if (!placing) return
    if (zone.id === 'skill') { setPick(zone); return }
    commit(zone.id)
  }

  function commit(zoneId, track) {
    setGame(g => {
      const n = cloneGame(g)
      if (!place(n, 0, zoneId)) return g
      if (track) setSkillBuys(b => [...b, track])
      return n
    })
    setPick(null)
  }

  function runRound() {
    setBusy(true)
    setTimeout(() => {
      setGame(g => {
        const n = cloneGame(g)
        // opponents fill their discs
        for (const p of n.players.filter(p => !p.human)) {
          while (p.discs > 0) {
            const z = botChoice(n, p)
            if (!z || !place(n, p.id, z)) { p.discs = 0; break }
          }
        }
        // the human's skill purchases happen here so the UI stayed honest
        for (const track of skillBuys) {
          if (n.players[0].cash >= SKILL_COST && n.players[0].skills[track] < 5) {
            n.players[0].cash -= SKILL_COST
            n.players[0].skills[track] += 1
          }
        }
        resolve(n)
        setReport({ events: n.events || [], card: n.marketCard, over: n.over })
        return n
      })
      setSkillBuys([])
      setBusy(false)
    }, 220)
  }

  /* ---------------------------------------------------------------- start */
  if (!game) return (
    <div className="wrap start">
      <header className="mast">
        <span className="kicker">SMILE &middot; Money in Play</span>
        <h1>Work Town</h1>
        <p>Six rounds. Build what you can, then try to get hired. Three other
        people want the same jobs you do.</p>
      </header>
      <div className="profiles">
        {PROFILES.map(p => (
          <button key={p.id} className="pcard" onClick={() => start(p.id)}>
            <h2>{p.name}</h2>
            <p>{p.blurb}</p>
            <dl>
              <div><dt>Education</dt><dd>{EDU[p.edu]}</dd></div>
              <div><dt>Skill</dt><dd>{p.skill} {p.level}</dd></div>
              <div><dt>Experience</dt><dd>{p.exp} year{p.exp === 1 ? '' : 's'}</dd></div>
            </dl>
            <span className="go">Start as this person</span>
          </button>
        ))}
      </div>
      <p className="foot">Everyone starts with {money(500)}. You will not all end
      in the same place, and that is the point.</p>
    </div>
  )

  /* ------------------------------------------------------------------ end */
  if (game.over && !report) {
    const table = ranking(game.players)
    return (
      <div className="wrap end">
        <header className="mast">
          <span className="kicker">Six years later</span>
          <h1>{table[0].human ? 'You finished first' : `${table[0].name} finished first`}</h1>
        </header>
        <ol className="board-final">
          {table.map(p => (
            <li key={p.id} className={p.human ? 'you' : ''}>
              <i className={'disc p' + p.id} />
              <b>{p.name}</b>
              <span>Career {p.career}</span>
              <span>{p.job ? p.job.title : 'No job'}</span>
              <span>{p.exp} years</span>
              <span>{money(p.cash)}</span>
            </li>
          ))}
        </ol>
        <div className="debrief">
          <h3>Before you play again</h3>
          <ul>
            <li>Who started strongest, and did they finish first?</li>
            <li>When you were turned down, which single number were you short of?</li>
            <li>What would you buy in round one if you started over?</li>
          </ul>
        </div>
        <button className="btn big" onClick={() => setGame(null)}>Play again</button>
      </div>
    )
  }

  /* ----------------------------------------------------------------- game */
  return (
    <div className="wrap game">
      <header className="bar">
        <span className="kicker">Work Town</span>
        <b>Year {game.round} of {ROUNDS}</b>
        <span className="discs-left">
          {placing ? `Place ${you.discs} more` : 'All placed'}
          {[...Array(you.discs)].map((_, i) => <i key={i} className="disc p0" />)}
        </span>
        {!placing && !report &&
          <button className="btn" disabled={busy} onClick={runRound}>Run the year</button>}
      </header>

      <div className="layout">
        <section className="board">
          <picture>
            <source srcSet="/art/board.webp" type="image/webp" />
            <img src="/art/board.jpg" alt="Work Town seen from above" className="board-img" />
          </picture>
          {ZONES.map(z => (
            <Zone key={z.id} zone={z} game={game} onPick={choose} disabled={!placing} />
          ))}
        </section>

        <aside className="side">
          <Sheet p={you} market={game.market} you />
          <MarketStrip market={game.market} card={game.marketCard} />
          <div className="others">
            {game.players.slice(1).map(p => <Sheet key={p.id} p={p} market={game.market} />)}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {pick && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" initial={{ y: 14 }} animate={{ y: 0 }}>
              <h2>Which skill?</h2>
              <p>{money(SKILL_COST)} a point. You have {money(you.cash)}.</p>
              <div className="tracks">
                {SKILLS.map(s => (
                  <button key={s} className={'trackbtn ' + TINT[s]}
                    disabled={you.cash < SKILL_COST || you.skills[s] >= 5}
                    onClick={() => commit('skill', s)}>
                    <b>{s}</b>
                    <span>{SECTORS[s]}</span>
                    <span className="now">now {you.skills[s]} of 5</span>
                  </button>
                ))}
              </div>
              <button className="btn ghost" onClick={() => setPick(null)}>Back</button>
            </motion.div>
          </motion.div>
        )}

        {report && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal wide" initial={{ y: 14 }} animate={{ y: 0 }}>
              <span className="kicker">Year {Math.min(game.round - 1, ROUNDS)}</span>
              <h2>What happened</h2>
              {report.events.length === 0 && <p>A quiet year. Nothing was contested.</p>}
              <ul className="events">
                {report.events.map((e, i) => (
                  <li key={i}>
                    <span className="ez">{e.zone}</span>
                    <p>{e.text}</p>
                    {e.detail && <ul className="why">{e.detail.map((d, j) => <li key={j}>{d}</li>)}</ul>}
                  </li>
                ))}
              </ul>
              {report.card && (
                <p className="mcard"><b>{report.card.t}.</b> {report.card.d}</p>
              )}
              <button className="btn" onClick={() => setReport(null)}>
                {report.over ? 'See the result' : 'Next year'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
