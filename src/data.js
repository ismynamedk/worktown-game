// Work Town Level 2 economics, exactly as in the printed pack.
// Change a number here and the whole game follows.

export const SKILLS = ['Making', 'Serving', 'Digital', 'Caring']
export const SECTORS = { Making: 'Manufacturing', Serving: 'Services', Digital: 'Technology', Caring: 'Care' }
export const EDU = ['School', 'Certificate', 'Diploma', 'Degree']
export const EDU_COST = [0, 150, 300, 500]

export const SKILL_COST = 100
export const PROD_PER_POINT = 50
export const PROD_CAP = 150
export const MARKET_STEP = 50

export const UPGRADES = [
  { to: 2, name: 'Qualified', skills: 3, years: 3 },
  { to: 3, name: 'Senior', skills: 5, years: 5 },
]

export const PROFILES = [
  { id: 'leaver', name: 'The school leaver', edu: 0, skill: 'Serving', level: 1, exp: 0,
    blurb: 'Nothing but options. Cheap to train.' },
  { id: 'apprentice', name: 'The apprentice', edu: 1, skill: 'Making', level: 2, exp: 1,
    blurb: 'Can take a job in round one.' },
  { id: 'graduate', name: 'The graduate', edu: 2, skill: 'Digital', level: 1, exp: 0,
    blurb: 'Education paid for, no experience at all.' },
  { id: 'carer', name: 'The carer', edu: 1, skill: 'Caring', level: 2, exp: 2,
    blurb: 'Strongest start, narrowest sector.' },
]

// title, sector skill, career level, education, skill level, years, salary
const J = (title, sk, lvl, edu, need, exp, pay) => ({ title, sk, lvl, edu, need, exp, pay })

export const JOBS = [
  J('Shop Assistant', 'Serving', 1, 0, 1, 0, 150),
  J('Delivery Rider', 'Serving', 1, 0, 1, 0, 150),
  J('Machine Helper', 'Making', 1, 0, 1, 0, 150),
  J('Packing Assistant', 'Making', 1, 0, 1, 0, 150),
  J('Ward Helper', 'Caring', 1, 0, 1, 0, 150),
  J('Data Entry Clerk', 'Digital', 1, 1, 1, 0, 200),
  J('Call Centre Agent', 'Serving', 1, 1, 2, 0, 200),
  J('Site Trainee', 'Making', 1, 1, 2, 1, 200),
  J('Store Supervisor', 'Serving', 2, 1, 3, 3, 250),
  J('Machine Operator', 'Making', 2, 1, 3, 3, 250),
  J('Junior Analyst', 'Digital', 2, 2, 3, 3, 300),
  J('Nurse Assistant', 'Caring', 2, 2, 3, 3, 300),
  J('Accounts Assistant', 'Serving', 2, 2, 3, 3, 300),
  J('Quality Checker', 'Making', 2, 2, 3, 4, 300),
  J('Teaching Assistant', 'Caring', 2, 2, 3, 3, 300),
  J('Web Developer', 'Digital', 2, 2, 4, 3, 350),
  J('Branch Manager', 'Serving', 3, 3, 4, 5, 450),
  J('Production Engineer', 'Making', 3, 3, 4, 5, 450),
  J('Staff Nurse', 'Caring', 3, 3, 4, 5, 450),
  J('Data Analyst', 'Digital', 3, 3, 4, 5, 500),
  J('Plant Supervisor', 'Making', 3, 3, 5, 6, 500),
  J('Counsellor', 'Caring', 3, 3, 5, 5, 500),
  J('Software Engineer', 'Digital', 3, 3, 5, 5, 550),
  J('Sales Head', 'Serving', 3, 3, 5, 6, 550),
]

export const MARKET = [
  { t: 'High demand', d: 'Technology and Services each move up one step.', f: m => { m.Technology++; m.Services++ } },
  { t: 'Low demand', d: 'Manufacturing and Services each move down one step.', f: m => { m.Manufacturing--; m.Services-- } },
  { t: 'New industry', d: 'Technology moves up two steps.', f: m => { m.Technology += 2 } },
  { t: 'Automation', d: 'Manufacturing falls two steps. Weak Making workers lose their job.', f: m => { m.Manufacturing -= 2 }, fires: p => p.job && p.job.sk === 'Making' && p.skills.Making <= 2 },
  { t: 'Skill shortage', d: 'Care moves up two steps. Caring 4 or more takes 100.', f: m => { m.Care += 2 }, pays: p => p.skills.Caring >= 4 ? 100 : 0 },
  { t: 'Too many applicants', d: 'A vacancy wanted by more than one person goes to nobody this round.', f: () => {}, flag: 'crowded' },
  { t: 'Experience matters', d: 'Every job needs one more year than printed, this round.', f: () => {}, flag: 'strictExp' },
  { t: 'Economic boom', d: 'Every sector up one step. Everyone employed takes 100.', f: m => { for (const k in m) m[k]++ }, pays: p => p.job ? 100 : 0 },
  { t: 'Economic slowdown', d: 'Every sector down one step.', f: m => { for (const k in m) m[k]-- } },
  { t: 'Hiring drive', d: 'An extra vacancy is on the board this round.', f: () => {}, flag: 'extra' },
  { t: 'Training grant', d: 'Everybody takes one free skill point.', f: () => {}, flag: 'grant' },
  { t: 'Care sector funded', d: 'Care moves up one step.', f: m => { m.Care++ } },
  { t: 'Steady year', d: 'Nothing changes. A steady year is also a real year.', f: () => {} },
]

export const OOPS = [
  { t: 'Illness', d: 'You keep your salary but lose your next action.' },
  { t: 'Phone broken', d: 'Pay 150.', cash: -150 },
  { t: 'Course not recognised', d: 'Lose one education level.', edu: -1 },
  { t: 'Contract ends', d: 'You lose your job. You keep your experience.', fire: true },
  { t: 'Skill out of date', d: 'Lose one point from your highest skill.', skill: -1 },
  { t: 'Family emergency', d: 'Pay 200.', cash: -200 },
  { t: 'Good news: a bonus', d: 'Take 200.', cash: 200 },
  { t: 'Good news: free training', d: 'Take one free skill point.', skill: 1 },
]

export const PRODUCTIVITY = [
  { t: 'You fixed the line before it stopped', sk: 'Making', n: 2, pay: 100 },
  { t: 'You cut the reject rate', sk: 'Making', n: 3, pay: 150 },
  { t: 'You trained the new hires', sk: 'Making', n: 4, pay: 150, exp: 1 },
  { t: 'You calmed an angry customer', sk: 'Serving', n: 2, pay: 100 },
  { t: 'You closed the biggest sale of the month', sk: 'Serving', n: 3, pay: 150 },
  { t: 'You rebuilt the whole rota', sk: 'Serving', n: 4, pay: 150, exp: 1 },
  { t: 'You automated the daily report', sk: 'Digital', n: 2, pay: 100 },
  { t: 'You found the error nobody else saw', sk: 'Digital', n: 3, pay: 150 },
  { t: 'You shipped it a week early', sk: 'Digital', n: 4, pay: 150, exp: 1 },
  { t: 'You stayed with a frightened patient', sk: 'Caring', n: 2, pay: 100 },
  { t: 'You spotted what the notes had missed', sk: 'Caring', n: 3, pay: 150 },
  { t: 'You held the ward together on a bad night', sk: 'Caring', n: 4, pay: 150, exp: 1 },
]

// The eleven zones. `art` is the Manus file that drops in later; until it
// exists the zone renders as a clean lettered plate, never a broken image.
export const ZONES = [
  { id: 'skill',  name: 'Skill Centre',      cap: 2, art: 'zone-training.png',  d: 'Buy up to two skill points at 100 each.' , x: 21.5, y: 13 },
  { id: 'grad',   name: 'Graduation',        cap: 1, art: 'zone-college.png',   d: 'Buy your next education level.' , x: 43.5, y: 11 },
  { id: 'search', name: 'Job Search',        cap: 2, art: 'zone-jobcentre.png', d: 'Draw one vacancy. Take it if you qualify.' , x: 62.5, y: 13 },
  { id: 'match',  name: 'Job Match',         cap: 1, art: 'zone-joboffice.png', d: 'Draw two vacancies. Take the better one you qualify for.' , x: 80.5, y: 19 },
  { id: 'compete',name: 'Competition',       cap: 9, art: 'zone-arena.png',     d: 'One vacancy. Everyone here competes. Strongest qualifying wins.' , x: 80.0, y: 41 },
  { id: 'employ', name: 'Employer Zone',     cap: 1, art: 'zone-company.png',   d: 'You are HR. Hire another player and take 100.' , x: 68.5, y: 78 },
  { id: 'exp',    name: 'Experience Bonus',  cap: 2, art: 'zone-park.png',      d: 'Take one year of experience.' , x: 46.5, y: 80 },
  { id: 'prod',   name: 'Productivity',      cap: 2, art: 'zone-workshop.png',  d: 'Draw a Productivity card.' , x: 24.0, y: 78 },
  { id: 'risk',   name: 'Risk Zone',         cap: 1, art: 'zone-corner.png',    d: 'Draw an Oops card, then take 200.' , x: 10.0, y: 69 },
  { id: 'career', name: 'Career Desk',       cap: 1, art: 'zone-tower.png',     d: 'Check your upgrade early and take 50.' , x: 10.5, y: 40 },
  { id: 'rest',   name: 'Rest',              cap: 9, art: 'zone-cafe.png',      d: 'Take 100 and do nothing.' , x: 11.5, y: 23 },
]

export const ROUNDS = 6
export const DISCS = 3
export const START_CASH = 500
