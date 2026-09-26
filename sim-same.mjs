// Q3 properly: all four players start from the IDENTICAL profile.
import { ROUNDS, PROFILES } from './src/data.js'
import { makePlayer, resolve, place, botChoice, totalSkill, shuffle } from './src/engine.js'
import { JOBS, MARKET, OOPS, PRODUCTIVITY } from './src/data.js'

function gameAllSame(prof) {
  const players = [0,1,2,3].map(i => makePlayer(prof, i, false))
  return { round:1, phase:'place', players, placements:{},
    market:{Manufacturing:0,Services:0,Technology:0,Care:0},
    deck:shuffle(JOBS), discard:[], marketDeck:shuffle(MARKET),
    oopsDeck:shuffle(OOPS), prodDeck:shuffle(PRODUCTIVITY),
    flags:{}, log:[], turn:0, over:false }
}
const N = Number(process.argv[2] || 400)
let pairs=0, differed=0, careerSpread=0, cashSpread=0
for (let i=0;i<N;i++){
  const prof = PROFILES[i % PROFILES.length]
  const g = gameAllSame(prof)
  for (let r=1;r<=ROUNDS;r++){
    for (const p of g.players){ while(p.discs>0){ const z=botChoice(g,p); if(!z||!place(g,p.id,z)){p.discs=0;break} } }
    resolve(g)
  }
  const c = g.players.map(p=>p.career), $ = g.players.map(p=>p.cash)
  pairs++
  const cs = Math.max(...c)-Math.min(...c), ms = Math.max(...$)-Math.min(...$)
  careerSpread += cs; cashSpread += ms
  if (cs>0 || ms>300) differed++
}
console.log(`\nQ3  Identical starting profile, ${N} games`)
console.log(`    Tables that finished NOT all the same    ${(100*differed/pairs).toFixed(1)}%`)
console.log(`    Average career-level spread at the table ${(careerSpread/pairs).toFixed(2)}`)
console.log(`    Average cash spread at the table         ${(cashSpread/pairs).toFixed(0)}\n`)
