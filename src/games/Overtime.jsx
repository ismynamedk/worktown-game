/* Overtime. Keep drawing work for more money, or stop and bank it.
   One Oops and everything you drew this turn is gone. */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRODUCTIVITY, OOPS } from '../data.js'
import { seatTable, shuffle, TextCard, Seats, MySkills, GameFrame, Finish, money, COLOURS, nm } from './common.jsx'

const ROUNDS = 5
const freshDeck = () => shuffle([
  ...PRODUCTIVITY.map(c => ({ kind: 'prod', ...c })),
  ...OOPS.map(c => ({ kind: 'oops', ...c })),
])

function playBot(p) {
  const deck = freshDeck(); const line = []; let risk = 0
  const stopAt = 200 + Math.floor(Math.random() * 3) * 75
  while (deck.length) {
    const c = deck.pop()
    if (c.kind === 'oops') { line.push({ c, bust: true }); return { line, banked: 0 + (c.cash > 0 ? c.cash : 0), bust: true } }
    if (p.skills[c.sk] >= c.n) { risk += c.pay; line.push({ c, paid: c.pay }) } else line.push({ c, short: true })
    if (risk >= stopAt || line.length >= 5) break
  }
  return { line, banked: risk, bust: false }
}

export default function Overtime({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId).map(p => ({ ...p, bank: 0 })))
  const [round, setRound] = React.useState(1)
  const [deck, setDeck] = React.useState(freshDeck)
  const [line, setLine] = React.useState([])
  const [risk, setRisk] = React.useState(0)
  const [state, setState] = React.useState('mine')   // mine | bust | banked | rivals
  const [rivals, setRivals] = React.useState([])
  const [over, setOver] = React.useState(false)
  const me = players[0]

  function draw() {
    const d = deck.slice(); const c = d.pop(); setDeck(d)
    if (c.kind === 'oops') {
      setLine(l => [...l, { c, bust: true }])
      setPlayers(ps => ps.map(p => p.human && c.cash ? { ...p, bank: Math.max(0, p.bank + c.cash) } : p))
      setRisk(0); setState('bust'); return
    }
    if (me.skills[c.sk] >= c.n) { setRisk(r => r + c.pay); setLine(l => [...l, { c, paid: c.pay }]) }
    else setLine(l => [...l, { c, short: true }])
  }

  function bank() {
    setPlayers(ps => ps.map(p => p.human ? { ...p, bank: p.bank + risk } : p)); setState('banked')
  }

  function rivalsTurn() {
    const out = []
    setPlayers(ps => ps.map(p => {
      if (p.human) return p
      const r = playBot(p); out.push({ id: p.id, name: nm(p), ...r })
      return { ...p, bank: p.bank + r.banked }
    }))
    setRivals(out); setState('rivals')
  }

  function next() {
    if (round >= ROUNDS) { setOver(true); return }
    setRound(round + 1); setDeck(freshDeck()); setLine([]); setRisk(0); setRivals([]); setState('mine')
  }

  if (over) {
    const rows = players.slice().sort((a, b) => b.bank - a.bank)
      .map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [money(p.bank) + ' banked'] }))
    return <Finish title={rows[0].me ? 'You banked the most' : `${rows[0].name} banked the most`} rows={rows}
      lesson={['Did anyone stop early and still finish ahead of someone who kept going?', 'Which cards could you not use because your skill was too low?', 'Working more is not always earning more. When is it worth the risk?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  return (
    <GameFrame title="Overtime" round={round} rounds={ROUNDS} onHome={onHome}
      dock={state === 'mine'
        ? <><button className="btn ghost big" onClick={bank} disabled={!line.length}>Stop and bank {money(risk)}</button>
            <button className="btn sun grow big" onClick={draw}>Work one more</button></>
        : state === 'rivals'
          ? <button className="btn sun grow big" onClick={next}>{round >= ROUNDS ? 'See who won' : 'Next round'}</button>
          : <button className="btn sun grow big" onClick={rivalsTurn}>Watch your rivals</button>}>
      <p className="gintro">Every card is a piece of work. If your skill is high enough, it pays. But the deck is full of Oops cards, and one Oops wipes out everything you drew this turn.</p>

      <div className="risk">
        <span>On the line</span><b>{money(risk)}</b>
        <span>Banked</span><b className="bk">{money(me.bank)}</b>
      </div>

      <div className="drawline">
        <AnimatePresence>
          {line.map((x, i) => (
            <motion.div key={i} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
              {x.c.kind === 'prod'
                ? <TextCard kind="prod" title={x.c.t} body={x.short ? `Needs ${x.c.sk} ${x.c.n}. You are short.` : `+${money(x.paid)}`} />
                : <TextCard kind="oops" title={x.c.t} body={'Oops! Everything this turn is lost. ' + x.c.d} />}
            </motion.div>
          ))}
        </AnimatePresence>
        {!line.length && <TextCard kind="prod" flip />}
      </div>

      {state === 'bust' && <div className="verdict"><span className="kicker">Oops</span><h2>You lost this turn's pay</h2><p>You pushed one card too far. Your banked money is safe.</p></div>}
      {state === 'banked' && <div className="verdict"><span className="kicker">Banked</span><h2>{money(risk)} is safe</h2><p>Stopping is a decision too.</p></div>}
      {state === 'rivals' && (
        <div className="verdict">
          <span className="kicker">Your rivals</span>
          {rivals.map(r => <p key={r.id}><b>{r.name}</b> drew {r.line.length} card{r.line.length === 1 ? '' : 's'} and {r.bust ? 'hit an Oops, lost the lot' : `banked ${money(r.banked)}`}.</p>)}
        </div>
      )}

      <MySkills p={me} />
      <Seats players={players} show="bank" extra={p => money(p.bank) + ' banked'} />
    </GameFrame>
  )
}
