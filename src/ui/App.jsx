import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZONES, SKILLS, EDU, SKILL_COST, PROFILES, ROUNDS, SECTORS, UPGRADES } from '../data.js'
import {
  newGame, resolve, place, freeSlots, botChoice, salaryOf, totalSkill, ranking, cloneGame,
} from '../engine.js'
import Board3D, { PLAYER_COLOURS } from '../scene/Board3D.jsx'
import BlindApplication from '../games/BlindApplication.jsx'
import Overtime from '../games/Overtime.jsx'
import SkillDraft from '../games/SkillDraft.jsx'
import JobMarket from '../games/JobMarket.jsx'
import WhatAmIWorth from '../games/WhatAmIWorth.jsx'
import CareerBuilder from '../games/CareerBuilder.jsx'
import Employer from '../games/Employer.jsx'

export const GAMES = [
  { id: 'gethired', name: 'Get Hired', q: 'Can I get the job?', time: '40 min', grades: 'Grades 9 to 12', how: 'Send three workers around a 3D town every year', star: true },
  { id: 'blind', name: 'Blind Application', q: 'Where should I apply?', time: '15 min', grades: 'Grades 9 to 12', how: 'Pick one job in secret, then reveal', comp: BlindApplication },
  { id: 'worth', name: 'What Am I Worth?', q: 'Why does that job pay more?', time: '40 min', grades: 'Grades 11 to 12', how: 'Bid your own salary, or be the boss', comp: WhatAmIWorth },
  { id: 'market', name: 'The Job Market', q: 'What if work changes?', time: '40 min', grades: 'Grades 10 to 12', how: 'Industries rise and fall around you', comp: JobMarket },
  { id: 'builder', name: 'Career Builder', q: 'How do I grow?', time: '40 min', grades: 'Grades 9 to 12', how: 'Build, then work, for ten years', comp: CareerBuilder },
  { id: 'employer', name: 'The Employer', q: 'Who should I hire?', time: '40 min', grades: 'Grades 9 to 12', how: 'Guess what the job really needs', comp: Employer },
  { id: 'draft', name: 'Skill Draft', q: 'What should I learn first?', time: '15 min', grades: 'Grades 9 to 12', how: 'Take a card, pass the rest', comp: SkillDraft },
  { id: 'overtime', name: 'Overtime', q: 'One more, or stop?', time: '10 min', grades: 'Grades 6 to 12', how: 'Push your luck for more pay', comp: Overtime },
]

function Hub({ onPick, onHome }) {
  return (
    <div className="pick">
      <button className="back" onClick={onHome}>Home</button>
      <h1>Pick a game</h1>
      <p className="sub">Eight games, one town. Every game asks one big question about work and money.</p>
      <div className="hub">
        {GAMES.map(g => (
          <button key={g.id} className={'hubcard' + (g.star ? ' star' : '')} onClick={() => onPick(g.id)}>
            {g.star && <span className="ribbon">3D</span>}
            <span className="q">{g.q}</span>
            <h2>{g.name}</h2>
            <p>{g.how}</p>
            <span className="meta">{g.time} &middot; {g.grades}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const base = import.meta.env.BASE_URL
const art = f => `${base}art/${f}`
const money = n => '₹' + n.toLocaleString('en-IN')
const TINT = { Making: 'clay', Serving: 'sage', Digital: 'slate', Caring: 'rose' }
const CHAR_ART = { leaver: 'char-leaver.jpg', apprentice: 'char-apprentice.jpg', graduate: 'char-graduate.jpg', carer: 'char-carer.jpg' }

/** An image that quietly disappears if Manus has not delivered it yet. */
function Art({ src, alt, className }) {
  const [ok, setOk] = React.useState(true)
  if (!ok) return null
  return <img src={src} alt={alt} className={className} onError={() => setOk(false)} />
}

function Logo({ big }) {
  const [ok, setOk] = React.useState(true)
  return ok
    ? <img src={art('logo.png')} alt="Work Town" className={big ? 'logo big' : 'logo'} onError={() => setOk(false)} />
    : <span className={big ? 'wordmark big' : 'wordmark'}>Work Town</span>
}

/* ================================================================= website */

function Home({ onPlay, onGame }) {
  return (
    <div className="site">
      <header className="nav">
        <Logo />
        <nav>
          <a href="#games">Games</a>
          <a href="#how">How to play</a>
          <a href="#characters">Characters</a>
          <a href="#print">Print and play</a>
        </nav>
        <button className="btn sun" onClick={onPlay}>Play now</button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="kicker">SMILE &middot; Money in Play</span>
          <Logo big />
          <p className="lede">Get a job. Grow your career. Beat the market.
          Six years in a busy little town, and three rivals want the same jobs you do.</p>
          <div className="hero-cta">
            <button className="btn sun big" onClick={onPlay}>Play the game</button>
            <a className="btn ghost big" href="#print">Print and play</a>
          </div>
          <p className="fine">Free to play on any phone, tablet or laptop. No sign up.</p>
        </div>
        <div className="hero-art">
          <img src={art('board.jpg')} alt="The town of Work Town seen from above" />
        </div>
      </section>

      <section id="how" className="band">
        <h2>How to play</h2>
        <ol className="steps">
          <li><b>1</b><h3>Pick who you are</h3><p>A school leaver, an apprentice, a graduate or a carer. Everyone starts with {money(500)}, but not with the same skills.</p></li>
          <li><b>2</b><h3>Send out your three workers</h3><p>Every year you place three workers around town. Train at the Skill Centre, graduate at the college, or go and apply for jobs.</p></li>
          <li><b>3</b><h3>Get hired and climb</h3><p>A job pays every year and gives you experience. Build enough skills and years and you move up from Entry to Qualified to Senior.</p></li>
        </ol>
        <p className="lesson">Getting turned down is not the end. Every rejection trains you, so the next job is closer.</p>
      </section>

      <section id="games" className="band">
        <h2>Eight games, one town</h2>
        <div className="hub">
          {GAMES.map(g => (
            <button key={g.id} className={'hubcard' + (g.star ? ' star' : '')} onClick={() => onGame(g.id)}>
              {g.star && <span className="ribbon">3D</span>}
              <span className="q">{g.q}</span>
              <h2>{g.name}</h2>
              <p>{g.how}</p>
              <span className="meta">{g.time} &middot; {g.grades}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="characters" className="band alt">
        <h2>Meet the characters</h2>
        <div className="chars">
          {PROFILES.map(p => (
            <div key={p.id} className="char">
              <div className="char-art"><Art src={art(CHAR_ART[p.id])} alt={p.name} /></div>
              <h3>{p.name}</h3>
              <p>{p.blurb}</p>
            </div>
          ))}
        </div>
        <button className="btn sun big center" onClick={onPlay}>Choose yours and play</button>
      </section>

      <section id="print" className="band">
        <h2>Print and play</h2>
        <p className="lede center">Play it on paper in class too. The board, the character cards, every deck
        of cards, the money and the player sheet, ready to print.</p>
        <div className="card-strip">
          {[1, 2, 3, 4, 5, 6].map(n => <img key={n} src={art(`preview/p${n}.jpg`)} alt="" loading="lazy" />)}
        </div>
        <div className="downloads">
          <a className="dl big" href={`${base}downloads/work-town-print-kit.zip`} download>
            <b>Download the print kit</b>
            <span>The board, a labelled board, 4 characters, 64 cards, card backs, money, pawns and the player sheet, plus ready-to-print sheets of 9 cards per A4 page. 23 MB.</span>
          </a>
          <a className="dl" href={`${base}downloads/work-town-rulebook.pdf`} download>
            <b>The Rulebook</b>
            <span>All eight games, new edition, 9 pages.</span>
          </a>
        </div>
      </section>

      <footer className="foot">
        <span>Work Town &middot; SMILE, Smart Money Institute of Learning</span>
        <span>Grades 9 to 12 &middot; 40 minutes a game</span>
      </footer>
    </div>
  )
}

/* ============================================================ pick a person */

function Pick({ onStart, onBack, gameName }) {
  return (
    <div className="pick">
      <button className="back" onClick={onBack}>Back</button>
      {gameName && <span className="kicker center-k">{gameName}</span>}
      <h1>Who are you?</h1>
      <p className="sub">You all start with {money(500)}. You will not all finish in the same place.</p>
      <div className="pick-grid">
        {PROFILES.map(p => (
          <button key={p.id} className="pick-card" onClick={() => onStart(p.id)}>
            <div className="pick-art"><Art src={art(CHAR_ART[p.id])} alt={p.name} /></div>
            <h2>{p.name}</h2>
            <p>{p.blurb}</p>
            <div className="chips">
              <span>{EDU[p.edu]}</span>
              <span>{p.skill} {p.level}</span>
              <span>{p.exp} yr</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ================================================================ the game */

function MeCard({ p, market }) {
  const next = UPGRADES.find(u => p.career < u.to)
  return (
    <div className="me">
      <div className="me-top">
        <i className="dot" style={{ background: PLAYER_COLOURS[0] }} />
        <b>You</b>
        <span className="lvl">{['', 'Entry', 'Qualified', 'Senior'][p.career]}</span>
        <span className="cash">{money(p.cash)}</span>
      </div>
      <div className="me-row">
        <span>{EDU[p.edu]}</span><span>{p.exp} yr experience</span>
        <span>{p.job ? `${p.job.title}, ${money(salaryOf(p, market))}/yr` : 'No job yet'}</span>
      </div>
      <div className="skills">
        {SKILLS.map(s => (
          <div key={s} className={'sk ' + TINT[s]}>
            <span>{s}</span>
            <span className="pips">{[1, 2, 3, 4, 5].map(n => <i key={n} className={p.skills[s] >= n ? 'on' : ''} />)}</span>
          </div>
        ))}
      </div>
      {next && <p className="goal">Next: {next.name} needs {next.skills} skill points and {next.years} years. You have {totalSkill(p)} and {p.exp}.</p>}
    </div>
  )
}

function Rivals({ players }) {
  return (
    <div className="rivals">
      {players.slice(1).map(p => (
        <div key={p.id} className="rival">
          <i className="dot" style={{ background: PLAYER_COLOURS[p.id] }} />
          <b>{p.name.replace('The ', '')}</b>
          <span>{['', 'Entry', 'Qualified', 'Senior'][p.career]}</span>
          <span>{money(p.cash)}</span>
        </div>
      ))}
    </div>
  )
}

function WhyChecklist({ p, job }) {
  const rows = [
    ['Education', EDU[job.edu], EDU[p.edu], p.edu >= job.edu],
    [job.sk, job.need, p.skills[job.sk], p.skills[job.sk] >= job.need],
    ['Experience', `${job.exp} yr`, `${p.exp} yr`, p.exp >= job.exp],
    ['Career level', job.lvl, p.career, p.career >= job.lvl],
  ]
  return (
    <table className="why-table">
      <thead><tr><th></th><th>Job needs</th><th>You have</th><th></th></tr></thead>
      <tbody>{rows.map(([k, need, have, ok]) => (
        <tr key={k}><td>{k}</td><td>{need}</td><td>{have}</td><td><span className={ok ? 'ok' : 'no'}>{ok ? 'Yes' : 'No'}</span></td></tr>
      ))}</tbody>
    </table>
  )
}

export default function App() {
  const [view, setView] = React.useState('home')
  const [gameId, setGameId] = React.useState('gethired')
  const [profile, setProfile] = React.useState(null)
  const [game, setGame] = React.useState(null)
  const [pick, setPick] = React.useState(null)
  const [report, setReport] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [skillBuys, setSkillBuys] = React.useState([])
  const [drawer, setDrawer] = React.useState(false)

  React.useEffect(() => { window.scrollTo(0, 0) }, [view])

  const you = game && game.players[0]
  const placing = game && !game.over && you.discs > 0 && !report

  function start(id) {
    if (gameId !== 'gethired') { setProfile(id); setView('mini'); return }
    setGame(newGame(id)); setReport(null); setSkillBuys([]); setView('game')
  }

  function choose(zone) {
    if (!placing || freeSlots(game, zone) <= 0) return
    if (zone.id === 'skill') { setPick(zone); return }
    commit(zone.id)
  }

  function commit(zoneId, track) {
    setGame(g => { const n = cloneGame(g); return place(n, 0, zoneId) ? n : g })
    if (track) setSkillBuys(b => [...b, track])
    setPick(null); setDrawer(false)
  }

  function runRound() {
    setBusy(true)
    setTimeout(() => {
      setGame(g => {
        const n = cloneGame(g)
        const beforeJob = n.players[0].job ? n.players[0].job.title : null
        const beforeCareer = n.players[0].career
        for (const p of n.players.filter(p => !p.human)) {
          while (p.discs > 0) { const z = botChoice(n, p); if (!z || !place(n, p.id, z)) { p.discs = 0; break } }
        }
        for (const t of skillBuys) {
          if (n.players[0].cash >= SKILL_COST && n.players[0].skills[t] < 5) { n.players[0].cash -= SKILL_COST; n.players[0].skills[t]++ }
        }
        resolve(n)
        const me = n.players[0]
        const hired = me.job && me.job.title !== beforeJob ? me.job : null
        const promoted = me.career > beforeCareer ? me.career : null
        setReport({ events: n.events || [], card: n.marketCard, impact: n.marketImpact, over: n.over, hired, promoted, me: { ...me, skills: { ...me.skills } } })
        return n
      })
      setSkillBuys([]); setBusy(false)
    }, 500)
  }

  if (view === 'home') return <Home onPlay={() => setView('hub')} onGame={id => { setGameId(id); setView('pick') }} />
  if (view === 'hub') return <Hub onPick={id => { setGameId(id); setView('pick') }} onHome={() => setView('home')} />
  if (view === 'mini') {
    const G = GAMES.find(g => g.id === gameId).comp
    return <G key={gameId + profile} profileId={profile} onHome={() => setView('hub')} />
  }
  if (view === 'pick' || !game) return <Pick onStart={start} onBack={() => setView('hub')} gameName={GAMES.find(g => g.id === gameId).name} />

  /* -------------------------------------------------------------- the end */
  if (game.over && !report) {
    const table = ranking(game.players)
    const won = table[0].human
    return (
      <div className="end">
        <span className="kicker">Six years later</span>
        <h1>{won ? 'You won Work Town' : `${table[0].name} won Work Town`}</h1>
        <ol className="podium">
          {table.map((p, i) => (
            <li key={p.id} className={p.human ? 'you' : ''}>
              <span className="place">{i + 1}</span>
              <i className="dot" style={{ background: PLAYER_COLOURS[p.id] }} />
              <b>{p.human ? 'You' : p.name}</b>
              <span>{['', 'Entry', 'Qualified', 'Senior'][p.career]}</span>
              <span>{p.job ? p.job.title : 'No job'}</span>
              <span>{money(p.cash)}</span>
            </li>
          ))}
        </ol>
        <div className="think">
          <h3>Think about it</h3>
          <p>Who started strongest? Did they finish first?</p>
          <p>When you got turned down, what exactly were you missing?</p>
          <p>What would you do differently in year one?</p>
        </div>
        <div className="end-cta">
          <button className="btn sun big" onClick={() => setView('pick')}>Play again</button>
          <button className="btn ghost big" onClick={() => setView('hub')}>All games</button>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------- the table */
  return (
    <div className="play">
      <header className="hud">
        <button className="back" onClick={() => setView('hub')}>Games</button>
        <div className="year"><span>Year</span><b>{game.round}</b><span>of {ROUNDS}</span></div>
        <div className="workers">
          {[0, 1, 2].map(i => <i key={i} className={'w' + (i < you.discs ? ' on' : '')} style={{ '--c': PLAYER_COLOURS[0] }} />)}
        </div>
      </header>

      <Board3D game={game} enabled={placing} onPick={choose} />

      <div className="prompt">
        {placing
          ? <p>Tap a glowing place to send a worker. <b>{you.discs} left.</b></p>
          : <p>All three workers are out.</p>}
      </div>

      <aside className="panel">
        <MeCard p={you} market={game.market} />
        <Rivals players={game.players} />
        <div className="market-mini">
          <b>Labour market</b>
          {Object.entries(game.market).map(([k, v]) => (
            <span key={k} className={v > 0 ? 'up' : v < 0 ? 'down' : ''}>{k} {v > 0 ? '+' + v : v}</span>
          ))}
        </div>
      </aside>

      <div className="dock">
        <button className="btn ghost" onClick={() => setDrawer(true)} disabled={!placing}>Places</button>
        <button className="btn sun grow" disabled={placing || busy || !!report} onClick={runRound}>
          {busy ? 'The year is running...' : 'Run the year'}
        </button>
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
            <motion.div className="sheet" initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} onClick={e => e.stopPropagation()}>
              <h2>Where do you send a worker?</h2>
              <div className="places">
                {ZONES.map(z => {
                  const left = freeSlots(game, z)
                  return (
                    <button key={z.id} className="place-btn" disabled={left <= 0} onClick={() => choose(z)}>
                      <b>{z.name}</b><span>{z.d}</span>
                      <em>{z.cap >= 9 ? 'Room for everyone' : left > 0 ? `${left} spot${left > 1 ? 's' : ''} left` : 'Full'}</em>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {pick && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <h2>Which skill will you learn?</h2>
              <p>Costs {money(SKILL_COST)}. You have {money(you.cash)}.</p>
              <div className="tracks">
                {SKILLS.map(s => (
                  <button key={s} className={'trackbtn ' + TINT[s]} disabled={you.cash < SKILL_COST || you.skills[s] >= 5}
                    onClick={() => commit('skill', s)}>
                    <b>{s}</b><span>{SECTORS[s]} jobs</span><span className="now">{you.skills[s]} of 5</span>
                  </button>
                ))}
              </div>
              <button className="btn ghost" onClick={() => setPick(null)}>Back</button>
            </motion.div>
          </motion.div>
        )}

        {report && (
          <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal wide" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }}>
              {report.hired && (
                <div className="celebrate">
                  <span className="kicker">You got hired</span>
                  <h2>{report.hired.title}</h2>
                  <p>{money(report.hired.pay)} a year, plus a year of experience every year you keep it.</p>
                  <h4>Why you got it</h4>
                  <WhyChecklist p={report.me} job={report.hired} />
                </div>
              )}
              {report.promoted && (
                <div className="promo">You moved up to <b>{['', 'Entry', 'Qualified', 'Senior'][report.promoted]}</b>. Bigger jobs are open to you now.</div>
              )}
              {!report.hired && <h2>Year {Math.min(game.round - 1, ROUNDS)}: what happened</h2>}
              <ul className="events">
                {report.events.map((e, i) => (
                  <li key={i}>
                    <span className="ez">{e.zone}</span>
                    <p>{e.text}</p>
                    {e.compete && e.compete.table.length > 1 && (
                      <div className="contest">
                        <table>
                          <thead><tr><th>Candidate</th><th>{e.compete.skill}</th><th>Years</th><th>Education</th><th></th></tr></thead>
                          <tbody>{e.compete.table.map((c, j) => (
                            <tr key={j} className={(c.won ? 'won ' : '') + (c.human ? 'me' : '')}>
                              <td>{c.human ? 'You' : c.name.replace('The ', '')}</td>
                              <td>{c.skill}</td><td>{c.exp}</td><td>{EDU[c.edu]}</td>
                              <td>{c.won ? <span className="ok">Hired</span> : c.qualified ? <span className="meh">Qualified</span> : <span className="no">Not eligible</span>}</td>
                            </tr>))}</tbody>
                        </table>
                        <p className="decider">{e.compete.reason}</p>
                      </div>
                    )}
                    {e.detail && <ul className="why">{e.detail.map((d, j) => <li key={j}>{d}</li>)}</ul>}
                  </li>
                ))}
              </ul>
              {report.card && (
                <div className="news">
                  <span className="kicker">Town news</span>
                  <b>{report.card.t}.</b> {report.card.d}
                  {report.impact && report.impact.moves.length > 0 && (
                    <div className="moves">{report.impact.moves.map(m => (
                      <span key={m.sector} className={m.to > m.from ? 'up' : 'down'}>{m.sector} {m.from > 0 ? '+' + m.from : m.from} to {m.to > 0 ? '+' + m.to : m.to}</span>
                    ))}</div>
                  )}
                  {report.impact && report.impact.impacts.length > 0 && (
                    <ul className="hits">{report.impact.impacts.map((h, j) => (
                      <li key={j} className={h.human ? 'me' : ''}><b>{h.human ? 'You' : h.who}</b> {h.text}</li>
                    ))}</ul>
                  )}
                  {report.impact && report.impact.moves.length === 0 && report.impact.impacts.length === 0 && <p className="calm">Nobody's job or pay changed this time.</p>}
                </div>
              )}
              <button className="btn sun big" onClick={() => setReport(null)}>{report.over ? 'See who won' : 'Next year'}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
