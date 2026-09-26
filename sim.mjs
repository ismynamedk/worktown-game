/**
 * Work Town balance harness.
 *
 * Answers the three questions Aishwarya's review actually asks, with numbers
 * instead of opinion:
 *
 *   Q1  Does the player who gets the first job usually stay ahead to round 6?
 *   Q2  Can a player still unemployed after round 2 reach Career 2 by round 5?
 *   Q3  Do two players with the SAME starting profile finish differently?
 *
 * Every player is driven by the same policy, so any gap that appears is the
 * economy talking, not one player being played better than another.
 *
 *   node sim.mjs 500
 */
import { ROUNDS, PROFILES } from './src/data.js'
import { newGame, resolve, place, botChoice, totalSkill, ranking } from './src/engine.js'

const N = Number(process.argv[2] || 500)

function playOne() {
  const g = newGame(PROFILES[Math.floor(Math.random() * PROFILES.length)].id)
  g.players.forEach(p => { p.human = false })          // one policy for everyone
  const snaps = []

  for (let r = 1; r <= ROUNDS; r++) {
    for (const p of g.players) {
      while (p.discs > 0) {
        const z = botChoice(g, p)
        if (!z || !place(g, p.id, z)) { p.discs = 0; break }
      }
    }
    resolve(g)
    snaps.push(g.players.map(p => ({
      id: p.id, profile: p.profile, job: !!p.job, cash: p.cash,
      skills: totalSkill(p), edu: p.edu, exp: p.exp, career: p.career,
    })))
  }
  return { g, snaps }
}

const R = {
  games: 0,
  firstJobStayedAhead: 0, firstJobGames: 0,
  unemployedAfterR2: 0, ofThoseReachedC2byR5: 0, ofThoseReachedC2ever: 0,
  sameProfilePairs: 0, sameProfileDiffered: 0,
  careerAtEnd: { 1: 0, 2: 0, 3: 0 },
  winnerWasFirstHired: 0,
  earliestC2: [],
  cashSpread: [],
}

for (let i = 0; i < N; i++) {
  const { g, snaps } = playOne()
  R.games++

  // who was hired first (round 1), if anyone
  const r1 = snaps[0]
  const hiredR1 = r1.filter(p => p.job)
  if (hiredR1.length === 1) {
    R.firstJobGames++
    const who = hiredR1[0].id
    const last = snaps[ROUNDS - 1]
    const me = last.find(p => p.id === who)
    const best = Math.max(...last.map(p => p.career))
    const bestCash = Math.max(...last.filter(p => p.career === best).map(p => p.cash))
    if (me.career === best && me.cash === bestCash) R.winnerWasFirstHired++
    // "stayed ahead" = never dropped below the table's best career level
    const ahead = snaps.every(s => {
      const m = s.find(p => p.id === who)
      return m.career >= Math.max(...s.map(p => p.career))
    })
    if (ahead) R.firstJobStayedAhead++
  }

  // Q2: unemployed after round 2
  const r2 = snaps[1]
  for (const p of r2.filter(p => !p.job)) {
    R.unemployedAfterR2++
    const byR5 = snaps[4].find(x => x.id === p.id)
    const end = snaps[ROUNDS - 1].find(x => x.id === p.id)
    if (byR5.career >= 2) R.ofThoseReachedC2byR5++
    if (end.career >= 2) R.ofThoseReachedC2ever++
  }

  // Q3: same starting profile, different outcome
  const end = snaps[ROUNDS - 1]
  const byProfile = {}
  for (const p of end) (byProfile[p.profile] ||= []).push(p)
  for (const list of Object.values(byProfile)) {
    if (list.length < 2) continue
    R.sameProfilePairs++
    const careers = new Set(list.map(p => p.career))
    const cashes = list.map(p => p.cash)
    if (careers.size > 1 || (Math.max(...cashes) - Math.min(...cashes)) > 300) R.sameProfileDiffered++
  }

  for (const p of end) R.careerAtEnd[p.career]++
  const cashes = end.map(p => p.cash)
  R.cashSpread.push(Math.max(...cashes) - Math.min(...cashes))

  // when does the first Career 2 appear
  for (let r = 0; r < ROUNDS; r++) {
    if (snaps[r].some(p => p.career >= 2)) { R.earliestC2.push(r + 1); break }
  }
}

const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : 'n/a'
const mean = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-'
const seats = R.games * 4

console.log(`\nWORK TOWN: GET HIRED  |  ${R.games} games, 4 players, ${ROUNDS} rounds, one policy for all\n`)

console.log('Q1  Does an early job decide the game?')
console.log(`    Games with exactly one round-1 hire      ${R.firstJobGames}`)
console.log(`    That player led every round to the end   ${pct(R.firstJobStayedAhead, R.firstJobGames)}`)
console.log(`    That player finished outright first      ${pct(R.winnerWasFirstHired, R.firstJobGames)}`)

console.log('\nQ2  Can you come back from no job after round 2?')
console.log(`    Player-seats still jobless after round 2 ${R.unemployedAfterR2}`)
console.log(`    Of those, reached Career 2 by round 5    ${pct(R.ofThoseReachedC2byR5, R.unemployedAfterR2)}`)
console.log(`    Of those, reached Career 2 by the end    ${pct(R.ofThoseReachedC2ever, R.unemployedAfterR2)}`)

console.log('\nQ3  Does the same starting profile always end the same?')
console.log(`    Same-profile pairs at the table          ${R.sameProfilePairs}`)
console.log(`    Finished differently                     ${pct(R.sameProfileDiffered, R.sameProfilePairs)}`)

console.log('\nShape of the ending')
console.log(`    Finished Career 1 / 2 / 3                ${pct(R.careerAtEnd[1], seats)} / ${pct(R.careerAtEnd[2], seats)} / ${pct(R.careerAtEnd[3], seats)}`)
console.log(`    First Career 2 appears in round          ${mean(R.earliestC2)} on average`)
console.log(`    Cash gap, richest to poorest, at the end ${mean(R.cashSpread)}\n`)
