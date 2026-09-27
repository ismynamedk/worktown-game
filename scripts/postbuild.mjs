// After vite: list every file for the worker to precache, stamp the worker's
// version, and write version.json for the in-app update check.
import fs from 'fs'; import path from 'path'
const dist = path.resolve('dist')
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)
const files = []
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(path.relative(dist, p)) } }
walk(dist)
const keep = files.filter(f => !f.startsWith('downloads/') && !/^(sw\.js|precache\.json|version\.json|wrangler\.json|_headers|index\.html)$/.test(f) && !f.startsWith('art/v1/') && !f.startsWith('.'))
fs.writeFileSync(path.join(dist, 'precache.json'), JSON.stringify(['', ...keep]))
const sw = path.join(dist, 'sw.js'); fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__BUILD__', stamp))
fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify({ build: stamp }))
fs.writeFileSync(path.join(dist, '_headers'), '/sw.js\n  Cache-Control: no-store\n/version.json\n  Cache-Control: no-store\n/precache.json\n  Cache-Control: no-store\n')
const mb = keep.reduce((n, f) => n + fs.statSync(path.join(dist, f)).size, 0) / 1e6
console.log(`precache ${keep.length} files, ${mb.toFixed(1)} MB, build ${stamp}`)
