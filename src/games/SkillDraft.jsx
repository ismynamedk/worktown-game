/* Skill Draft. Build now, for jobs you cannot see yet. Take one card, pass the
   rest to your left, and only then do the vacancies come out. */
import React from 'react'
import { motion } from 'framer-motion'
import {
  seatTable, clonePlayers, JOBS, shuffle, SkillToken, Seats, MySkills, GameFrame, Finish,
  JobCard, money, COLOURS, nm, SKILLS, EDU,
} from './common.jsx'

const ROUNDS = 3
const HAND = 7
const packFor = () => shuffle([...SKILLS.flatMap(s => Array(10).fill(s)), ...Array(8).fill('Education')])
const fitsDraft = (p, j) => p.edu >= j.edu && p.skills[j.sk] >= j.need   // in Skill Draft only these two count
const levelsFor = r => (r === 1 ? [1, 2] : r === 2 ? [1, 2, 3] : [2, 3])

function botTake(p, hand) {
  const target = p.profileSkill
  if (p.edu < 2 && hand.includes('Education') && Math.random() < 0.55) return hand.indexOf('Education')
  if (hand.includes(target) && p.skills[target] < 5) return hand.indexOf(target)
  const second = SKILLS.filter(s => s !== target).sort((a, b) => p.skills[b] - p.skills[a])[0]
  if (hand.includes(second) && p.skills[second] < 5) return hand.indexOf(second)
  return Math.floor(Math.random() * hand.length)
}

function apply(p, card) {
  if (card === 'Education') p.edu = Math.min(3, p.edu + 1)
  else p.skills[card] = Math.min(5, p.skills[card] + 1)
}

export default function SkillDraft({ profileId, onHome }) {
  const [players, setPlayers] = React.useState(() => seatTable(profileId).map(p => ({
    ...p, claimed: [], earned: 0, profileSkill: Object.keys(p.skills).find(s => p.skills[s] > 0) || 'Serving',
  })))
  const [round, setRound] = React.useState(1)
  const [hands, setHands] = React.useState(null)
  const [pickNo, setPickNo] = React.useState(0)
  const [phase, setPhase] = React.useState('start')   // start | draft | claim | done-round
  const [jobs, setJobs] = React.useState([])
  const [claims, setClaims] = React.useState([])
  const [lastPass, setLastPass] = React.useState(null)
  const [over, setOver] = React.useState(false)
  const me = players[0]

  function startRound() {
    const pack = packFor()
    setHands([0, 1, 2, 3].map(k => pack.slice(k * HAND, k * HAND + HAND)))
    setPickNo(0); setPhase('draft'); setClaims([]); setLastPass(null)
  }

  function take(i) {
    const ps = clonePlayers(players)
    const hs = hands.map(h => h.slice())
    apply(ps[0], hs[0][i]); hs[0].splice(i, 1)
    for (let k = 1; k < 4; k++) { const j = botTake(ps[k], hs[k]); apply(ps[k], hs[k][j]); hs[k].splice(j, 1) }
    setLastPass(hs[0].slice())
    const passed = [hs[3], hs[0], hs[1], hs[2]]            // every hand moves one seat to the left
    setPlayers(ps); setHands(passed)
    if (pickNo + 1 >= HAND) {
      const lv = levelsFor(round)
      setJobs(shuffle(JOBS.filter(j => lv.includes(j.lvl))).slice(0, 4))
      setPhase('claim')
    } else setPickNo(pickNo + 1)
  }

  function claimAll() {
    const ps = clonePlayers(players)
    const left = jobs.slice(); const log = []
    const order = [0, 1, 2, 3].map(k => (k + round - 1) % 4)
    for (const pid of order) {
      const p = ps[pid]
      const ok = left.filter(j => fitsDraft(p, j)).sort((a, b) => b.pay - a.pay)
      if (ok.length) {
        const j = ok[0]; left.splice(left.indexOf(j), 1)
        p.claimed.push(j.title); p.earned += j.pay
        log.push({ pid, job: j })
      } else log.push({ pid, job: null })
    }
    setPlayers(ps); setClaims(log); setPhase('done-round')
  }

  function next() {
    if (round >= ROUNDS) { setOver(true); return }
    setRound(round + 1); setPhase('start')
  }

  if (over) {
    const rows = players.slice().sort((a, b) => b.earned - a.earned)
      .map(p => ({ key: p.id, me: p.human, colour: COLOURS[p.id], name: nm(p), cols: [money(p.earned) + ' in jobs', p.claimed.length + ' jobs'] }))
    return <Finish title={rows[0].me ? 'You built the best career' : `${rows[0].name} built the best career`} rows={rows}
      lesson={['You chose skills before you could see the jobs. Did you specialise or spread out?', 'What did you pass to the player on your left? Did it help them?', 'Which job did you miss by just one point?']}
      onAgain={() => window.location.reload()} onHome={onHome} />
  }

  return (
    <GameFrame title="Skill Draft" round={round} rounds={ROUNDS} onHome={onHome}
      dock={phase === 'start' ? <button className="btn sun grow big" onClick={startRound}>Deal the cards</button>
        : phase === 'claim' ? <button className="btn sun grow big" onClick={claimAll}>Claim jobs in turn order</button>
        : phase === 'done-round' ? <button className="btn sun grow big" onClick={next}>{round >= ROUNDS ? 'See who won' : 'Next round'}</button>
        : null}>
      <p className="gintro">{phase === 'draft'
        ? `Pick ${pickNo + 1} of ${HAND}. Take one card. The rest go to the player on your left. You cannot see the jobs yet.`
        : phase === 'claim' ? 'Now the jobs appear. In Skill Draft only education and skill count. Best pay you qualify for, in turn order.'
        : phase === 'done-round' ? 'Here is who claimed what.'
        : 'Seven cards each. Keep one, pass the rest, until the hand is gone. Then four jobs are revealed.'}</p>

      {phase === 'draft' && hands && (
        <>
          <div className="hand">
            {hands[0].map((c, i) => (
              <motion.div key={i + '-' + pickNo} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                <SkillToken skill={c} onClick={() => take(i)} />
              </motion.div>
            ))}
          </div>
          {lastPass && lastPass.length > 0 && <p className="passed">You passed left: {lastPass.join(', ')}</p>}
        </>
      )}

      {(phase === 'claim' || phase === 'done-round') && (
        <div className="jobrow">
          {jobs.map(j => {
            const c = claims.find(x => x.job && x.job.title === j.title)
            return (
              <JobCard key={j.title} job={{ ...j, exp: 0 }} tag={phase === 'claim' ? (fitsDraft(me, j) ? 'You qualify' : 'Not yet') : null}>
                {c && <span className="appl"><i className="dot win" style={{ background: COLOURS[c.pid] }} /><em>{nm(players[c.pid])}</em></span>}
              </JobCard>
            )
          })}
        </div>
      )}
      {phase === 'done-round' && (
        <div className="verdict">
          {claims.map(c => <p key={c.pid}><b>{nm(players[c.pid])}</b> {c.job ? `took ${c.job.title} (${money(c.job.pay)})` : 'did not qualify for any of them'}.</p>)}
        </div>
      )}

      <MySkills p={me} />
      <Seats players={players} show="earned" extra={p => money(p.earned)} />
    </GameFrame>
  )
}
