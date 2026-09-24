// The rules. No React in here on purpose: the same functions run the game
// for the human and for the three opponents, so nobody gets a different game.

import {
  JOBS, MARKET, OOPS, PRODUCTIVITY, PROFILES, SKILLS, SECTORS,
  EDU, EDU_COST, SKILL_COST, PROD_PER_POINT, PROD_CAP, MARKET_STEP,
  UPGRADES, ZONES, ROUNDS, DISCS, START_CASH,
} from './data.js'

export const rnd = n => Math.floor(Math.random() * n)
export const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1);[b[i], b[j]] = [b[j], b[i]] } return b }

export function makePlayer(profile, i, human) {
  const skills = { Making: 0, Serving: 0, Digital: 0, Caring: 0 }
  skills[profile.skill] = profile.level
  return {
    id: i, human, name: human ? 'You' : profile.name, profile: profile.id,
    cash: START_CASH, edu: profile.edu, skills, exp: profile.exp,
    career: 1, job: null, earned: 0, discs: DISCS, skip: false,
  }
}

export function newGame(humanProfileId) {
  const chosen = PROFILES.find(p => p.id === humanProfileId) || PROFILES[0]
  const rest = shuffle(PROFILES.filter(p => p.id !== chosen.id)).slice(0, 3)
  const players = [makePlayer(chosen, 0, true), ...rest.map((p, i) => makePlayer(p, i + 1, false))]
  return {
    round: 1, phase: 'place', players,
    placements: {},                       // zoneId -> [playerId]
    market: { Manufacturing: 0, Services: 0, Technology: 0, Care: 0 },
    deck: shuffle(JOBS), discard: [],
    marketDeck: shuffle(MARKET), oopsDeck: shuffle(OOPS), prodDeck: shuffle(PRODUCTIVITY),
    flags: {}, log: [], turn: 0, over: false,
  }
}

export const totalSkill = p => SKILLS.reduce((n, s) => n + p.skills[s], 0)

export function qualifies(p, job, flags = {}) {
  const needExp = job.exp + (flags.strictExp ? 1 : 0)
  return p.edu >= job.edu && p.skills[job.sk] >= job.need &&
         p.exp >= needExp && p.career >= job.lvl
}

export function salaryOf(p, market) {
  if (!p.job) return 0
  const step = market[SECTORS[p.job.sk]] || 0
  const over = Math.max(0, p.skills[p.job.sk] - p.job.need)
  const bonus = Math.min(over * PROD_PER_POINT, PROD_CAP)
  return Math.max(0, p.job.pay + step * MARKET_STEP + bonus)
}

/** Why a player was turned down, in the words a 15 year old needs to hear. */
export function missingReason(p, job, flags = {}) {
  const out = []
  if (p.edu < job.edu) out.push(`needs ${EDU[job.edu]}, you have ${EDU[p.edu]}`)
  if (p.skills[job.sk] < job.need) out.push(`needs ${job.sk} ${job.need}, you have ${p.skills[job.sk]}`)
  const ne = job.exp + (flags.strictExp ? 1 : 0)
  if (p.exp < ne) out.push(`needs ${ne} year${ne === 1 ? '' : 's'}, you have ${p.exp}`)
  if (p.career < job.lvl) out.push(`needs career level ${job.lvl}, you are ${p.career}`)
  return out
}

/** Competition order: relevant skill, then experience, then education, then least cash. */
export function strongest(cands, job) {
  return cands.slice().sort((a, b) =>
    b.skills[job.sk] - a.skills[job.sk] || b.exp - a.exp || b.edu - a.edu || a.cash - b.cash)[0]
}

export function draw(g, which = 'deck') {
  if (!g[which].length) { g[which] = shuffle(which === 'deck' ? JOBS : g.discard); g.discard = [] }
  return g[which].shift()
}

export function freeSlots(g, zone) {
  const used = (g.placements[zone.id] || []).length
  return Math.max(0, zone.cap - used)
}

export function place(g, playerId, zoneId) {
  const z = ZONES.find(x => x.id === zoneId)
  if (!z || freeSlots(g, z) <= 0) return false
  g.placements[zoneId] = [...(g.placements[zoneId] || []), playerId]
  g.players[playerId].discs -= 1
  return true
}

/** The three opponents. Not clever, but never random: they do what the
 *  sheet says a person in their position should do. */
export function botChoice(g, p) {
  const open = ZONES.filter(z => freeSlots(g, z) > 0)
  const has = id => open.some(z => z.id === id)
  const canQualifySomething = g.deck.slice(0, 6).some(j => qualifies(p, j, g.flags))

  // one point short of an upgrade is always worth buying
  const nextUp = UPGRADES.find(u => p.career < u.to)
  if (nextUp && p.cash >= SKILL_COST && totalSkill(p) < nextUp.skills &&
      p.exp >= nextUp.years - 1 && has('skill')) return 'skill'

  if (!p.job && canQualifySomething && has('search')) return 'search'
  if (!p.job && canQualifySomething && has('match')) return 'match'
  if (!p.job && canQualifySomething && has('compete')) return 'compete'
  if (p.cash >= SKILL_COST && totalSkill(p) < 5 && has('skill')) return 'skill'
  if (p.cash >= EDU_COST[p.edu + 1] && p.edu < 3 && has('grad')) return 'grad'
  if (p.exp < 5 && has('exp')) return 'exp'
  if (p.job && has('prod')) return 'prod'
  if (has('rest')) return 'rest'
  return open.length ? open[0].id : null
}

function give(g, p, msg) { g.log.push({ round: g.round, who: p.name, msg }) }

function takeJob(g, p, job, how) {
  if (p.job) g.discard.push(p.job)
  p.job = job
  give(g, p, `hired as ${job.title} (${how}), ${job.pay} a round`)
}

export function resolve(g) {
  const P = g.players
  const order = ['skill', 'grad', 'search', 'match', 'compete', 'employ', 'exp', 'prod', 'risk', 'career', 'rest']
  g.events = []

  for (const zid of order) {
    const ids = g.placements[zid] || []
    if (!ids.length) continue
    const zone = ZONES.find(z => z.id === zid)

    if (zid === 'compete') {
      const job = draw(g)
      const cands = ids.map(i => P[i]).filter(p => qualifies(p, job, g.flags))
      if (g.flags.crowded && ids.length > 1) {
        g.events.push({ zone: zone.name, text: `${job.title}: too many applicants, nobody was hired.` })
        g.discard.push(job)
      } else if (!cands.length) {
        ids.forEach(i => { P[i].cash += 50 })
        g.events.push({ zone: zone.name, text: `${job.title}: nobody qualified. Everyone took 50 for trying.` })
        g.discard.push(job)
      } else {
        const win = strongest(cands, job)
        takeJob(g, win, job, 'competition')
        const lost = ids.map(i => P[i]).filter(p => p !== win)
        g.events.push({
          zone: zone.name,
          text: `${job.title}: ${win.name} won it against ${lost.length} other${lost.length === 1 ? '' : 's'}.`,
          detail: lost.map(p => {
            const why = missingReason(p, job, g.flags)
            return `${p.name}: ${why.length ? why.join('; ') : 'qualified, but not the strongest'}`
          }),
        })
      }
      continue
    }

    for (const i of ids) {
      const p = P[i]
      if (zid === 'skill') continue           // the human picks the track in the UI
      if (zid === 'grad') {
        const cost = EDU_COST[p.edu + 1]
        if (p.edu < 3 && p.cash >= cost) { p.cash -= cost; p.edu++; give(g, p, `graduated to ${EDU[p.edu]}`) }
      }
      if (zid === 'search' || zid === 'match') {
        const n = zid === 'match' ? 2 : 1
        const seen = Array.from({ length: n }, () => draw(g))
        const ok = seen.filter(j => qualifies(p, j, g.flags)).sort((a, b) => b.pay - a.pay)
        if (ok.length) { takeJob(g, p, ok[0], zone.name); seen.filter(j => j !== ok[0]).forEach(j => g.discard.push(j)) }
        else {
          seen.forEach(j => g.discard.push(j))
          if (p.human) g.events.push({ zone: zone.name, text: `${seen[0].title}: you did not qualify.`, detail: [missingReason(p, seen[0], g.flags).join('; ')] })
        }
      }
      if (zid === 'employ') {
        const job = draw(g)
        const others = P.filter(o => o !== p && qualifies(o, job, g.flags))
        p.cash += 100
        if (others.length) {
          const pick = strongest(others, job)
          takeJob(g, pick, job, `hired by ${p.name}`)
          g.events.push({ zone: zone.name, text: `${p.name} was HR and hired ${pick.name} as ${job.title}.` })
        } else { g.discard.push(job); g.events.push({ zone: zone.name, text: `${p.name} was HR for ${job.title} and nobody qualified.` }) }
      }
      if (zid === 'exp') { p.exp++; give(g, p, 'took a year of experience') }
      if (zid === 'prod') {
        const c = draw(g, 'prodDeck')
        if (p.skills[c.sk] >= c.n) { p.cash += c.pay; if (c.exp) p.exp += c.exp; g.events.push({ zone: zone.name, text: `${p.name}: ${c.t}. Took ${c.pay}.` }) }
        else g.events.push({ zone: zone.name, text: `${p.name}: ${c.t}. Short of ${c.sk} ${c.n}, nothing earned.` })
        g.prodDeck.push(c)
      }
      if (zid === 'risk') {
        const c = draw(g, 'oopsDeck')
        p.cash += 200
        if (c.cash) p.cash = Math.max(0, p.cash + c.cash)
        if (c.edu) p.edu = Math.max(0, p.edu + c.edu)
        if (c.fire && p.job) { g.discard.push(p.job); p.job = null }
        if (c.skill) {
          if (c.skill > 0) { const s = SKILLS[rnd(4)]; p.skills[s] = Math.min(5, p.skills[s] + 1) }
          else { const s = SKILLS.slice().sort((a, b) => p.skills[b] - p.skills[a])[0]; p.skills[s] = Math.max(0, p.skills[s] - 1) }
        }
        if (c.t === 'Illness') p.skip = true
        g.events.push({ zone: zone.name, text: `${p.name} gambled: ${c.t}. ${c.d} Took 200 anyway.` })
        g.oopsDeck.push(c)
      }
      if (zid === 'career') p.cash += 50
      if (zid === 'rest') p.cash += 100
    }
  }

  // pay, age, upgrade
  for (const p of P) {
    const s = salaryOf(p, g.market)
    if (s) { p.cash += s; p.earned += s; p.exp++ }
    for (const u of UPGRADES) {
      if (p.career < u.to && totalSkill(p) >= u.skills && p.exp >= u.years) {
        p.career = u.to
        g.events.push({ zone: 'Career', text: `${p.name} reached ${u.name}: ${totalSkill(p)} skill points and ${p.exp} years.` })
      }
    }
  }

  // the market moves last, so next round is a different world
  const card = draw(g, 'marketDeck')
  g.marketDeck.push(card)
  g.flags = {}
  card.f(g.market)
  for (const k in g.market) g.market[k] = Math.max(-2, Math.min(2, g.market[k]))
  if (card.fires) for (const p of P) if (card.fires(p)) { g.discard.push(p.job); p.job = null }
  if (card.pays) for (const p of P) p.cash += card.pays(p)
  if (card.flag) g.flags[card.flag] = true
  if (card.flag === 'grant') for (const p of P) { const s = SKILLS[rnd(4)]; p.skills[s] = Math.min(5, p.skills[s] + 1) }
  g.marketCard = card

  g.placements = {}
  for (const p of P) { p.discs = p.skip ? DISCS - 1 : DISCS; p.skip = false }
  g.round++
  if (g.round > ROUNDS) { g.over = true; g.round = ROUNDS }
  return g
}

export function ranking(players) {
  return players.slice().sort((a, b) => b.career - a.career || b.cash - a.cash || b.exp - a.exp)
}

/** structuredClone dies on the market cards, which carry functions.
 *  Deep-copy only the state that changes; carry the decks by reference. */
export function cloneGame(g) {
  return {
    ...g,
    players: g.players.map(p => ({ ...p, skills: { ...p.skills }, job: p.job ? { ...p.job } : null })),
    placements: Object.fromEntries(Object.entries(g.placements).map(([k, v]) => [k, v.slice()])),
    market: { ...g.market },
    flags: { ...g.flags },
    log: g.log.slice(),
    deck: g.deck.slice(),
    discard: g.discard.slice(),
    marketDeck: g.marketDeck.slice(),
    oopsDeck: g.oopsDeck.slice(),
    prodDeck: g.prodDeck.slice(),
  }
}
