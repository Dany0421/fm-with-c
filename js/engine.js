// engine.js — Match simulation and game logic

function getTeamAttack(team, gameState) {
  const tactics = gameState?.tactics?.[team.id] || {};
  const squad = [...team.squad].sort((a, b) => b.overall - a.overall).slice(0, 11);

  // Weight attacking stats
  const atkScore = squad.reduce((s, p) => {
    const w = ['ST','CF','RW','LW','CAM'].includes(p.pos) ? 1.3 :
              ['CM','RM','LM'].includes(p.pos) ? 1.0 : 0.6;
    return s + p.overall * w;
  }, 0) / 11;

  let mod = 1.0;
  if (tactics.mentality === 'attacking')  mod *= 1.15;
  if (tactics.mentality === 'defensive') mod *= 0.87;
  if (tactics.pressing === 'high')       mod *= 1.06;
  if (tactics.pressing === 'low')        mod *= 0.96;
  if (tactics.tempo === 'fast')          mod *= 1.05;
  if (tactics.tempo === 'slow')          mod *= 0.96;
  if (tactics.width === 'wide') {
    const wingers = team.squad.filter(p => ['RW','LW','RM','LM'].includes(p.pos));
    if (wingers.length > 0 && wingers[0].overall >= 76) mod *= 1.06;
  }
  if (tactics.passingStyle === 'direct') mod *= 1.04;
  if (tactics.passingStyle === 'short')  mod *= 0.97;

  // Captain morale bonus
  const captain = tactics.captain ? team.squad.find(p => p.id === tactics.captain) : null;
  if (captain && (captain.morale || 70) > 75) mod *= 1.03;

  const morale = gameState?.morale?.[team.id] || 70;
  const moraleBonus = (morale - 50) / 200;
  const fitnessBonus = (gameState?.fitness?.[team.id] || 85) / 100 * 0.08;

  return atkScore * mod * (1 + moraleBonus + fitnessBonus);
}

function getTeamDefense(team, gameState) {
  const tactics = gameState?.tactics?.[team.id] || {};
  const squad = [...team.squad].sort((a, b) => b.overall - a.overall).slice(0, 11);

  const defScore = squad.reduce((s, p) => {
    const w = ['GK','CB'].includes(p.pos) ? 1.4 :
              ['RB','LB','CDM'].includes(p.pos) ? 1.1 :
              ['CM','RM','LM'].includes(p.pos) ? 0.8 : 0.5;
    return s + p.overall * w;
  }, 0) / 11;

  let mod = 1.0;
  if (tactics.mentality === 'defensive') mod *= 1.15;
  if (tactics.mentality === 'attacking') mod *= 0.87;
  if (tactics.defensiveLine === 'high')  mod *= 1.08;
  if (tactics.defensiveLine === 'low')   mod *= 0.94;
  if (tactics.pressing === 'high')       mod *= 1.04;
  if (tactics.pressing === 'low')        mod *= 0.96;
  if (tactics.width === 'narrow')        mod *= 1.04;

  const morale = gameState?.morale?.[team.id] || 70;
  const moraleBonus = (morale - 50) / 200;
  const fitnessBonus = (gameState?.fitness?.[team.id] || 85) / 100 * 0.08;

  return defScore * mod * (1 + moraleBonus + fitnessBonus);
}

// Simulate a single match between two teams
function simulateMatch(homeTeamId, awayTeamId, gameState) {
  const home = getTeam(homeTeamId);
  const away = getTeam(awayTeamId);

  const homeAtk = getTeamAttack(home, gameState) * 1.1; // home advantage on attack
  const homeDef = getTeamDefense(home, gameState) * 1.08;
  const awayAtk = getTeamAttack(away, gameState);
  const awayDef = getTeamDefense(away, gameState);

  // Win probability: my attack vs their defense
  const homeScore = homeAtk / (homeAtk + awayDef);
  const awayScore = awayAtk / (awayAtk + homeDef);
  const total = homeScore + awayScore;
  const homeWinProb = homeScore / total;

  const drawProb = 0.24;
  const adjustedHomeWin = homeWinProb * (1 - drawProb);
  const adjustedAwayWin = (1 - drawProb) * (1 - homeWinProb);

  const roll = Math.random();
  let result;
  if (roll < adjustedHomeWin) result = 'home';
  else if (roll < adjustedHomeWin + drawProb) result = 'draw';
  else result = 'away';

  // Variance from tactics (direct passing / fast tempo = more goals)
  const homeTactics = gameState?.tactics?.[homeTeamId] || {};
  const awayTactics = gameState?.tactics?.[awayTeamId] || {};
  const variance = (
    (homeTactics.passingStyle === 'direct' ? 0.15 : 0) +
    (awayTactics.passingStyle === 'direct' ? 0.15 : 0) +
    (homeTactics.tempo === 'fast' ? 0.1 : 0) +
    (awayTactics.tempo === 'fast' ? 0.1 : 0)
  );

  const homeGoals = generateGoals(homeAtk, awayDef, result === 'home', result === 'draw', variance);
  const awayGoals = generateGoals(awayAtk, homeDef, result === 'away', result === 'draw', variance);

  const events = generateMatchEvents(home, away, homeGoals, awayGoals, gameState);
  const newlyInjured = generateMatchInjuries(home, away);

  // Track player-team injuries for hub notification
  if (gameState?.playerTeam && newlyInjured.length) {
    const playerInjuries = newlyInjured.filter(p => p.teamId === gameState.playerTeam);
    if (playerInjuries.length) {
      if (!gameState.newInjuries) gameState.newInjuries = [];
      gameState.newInjuries.push(...playerInjuries);
    }
  }

  const attendance = Math.floor(home.capacity * (0.7 + Math.random() * 0.3));
  // Gate receipts go directly to home team
  if (gameState?.budgets) {
    gameState.budgets[homeTeamId] = (gameState.budgets[homeTeamId] || 0) + Math.round(attendance * 2);
  }

  return { homeTeam: homeTeamId, awayTeam: awayTeamId, homeGoals, awayGoals, events, attendance };
}

function generateGoals(attStr, defStr, isWinner, isDraw, variance = 0) {
  const ratio = attStr / (attStr + defStr);
  let baseGoals;
  if (isWinner) baseGoals = 1.5 + ratio * 1.5;
  else if (isDraw) baseGoals = 0.8 + ratio * 0.8;
  else baseGoals = 0.5 + ratio * 0.8;
  baseGoals += variance;
  return Math.max(0, Math.min(8, poissonRandom(baseGoals)));
}

function poissonRandom(lambda) {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function generateMatchEvents(home, away, homeGoals, awayGoals, gameState) {
  const events = [];
  const minutes = [];

  // Generate random minutes for goals
  for (let i = 0; i < homeGoals; i++) minutes.push({ team: 'home', min: Math.floor(Math.random() * 90) + 1 });
  for (let i = 0; i < awayGoals; i++) minutes.push({ team: 'away', min: Math.floor(Math.random() * 90) + 1 });

  // Occasionally add cards
  const homeCards = Math.random() < 0.4 ? 1 : 0;
  const awayCards = Math.random() < 0.4 ? 1 : 0;
  for (let i = 0; i < homeCards; i++) minutes.push({ team: 'home', type: 'yellow', min: Math.floor(Math.random() * 90) + 1 });
  for (let i = 0; i < awayCards; i++) minutes.push({ team: 'away', type: 'yellow', min: Math.floor(Math.random() * 90) + 1 });

  minutes.sort((a, b) => a.min - b.min);

  // Assign scorers — fall back to full squad if no forwards found
  const FWD_POS = ['ST', 'CF', 'CAM', 'LW', 'RW'];
  const homeFwdPool = home.squad.filter(p => FWD_POS.includes(p.pos)).sort((a, b) => b.shooting - a.shooting);
  const homeFwd = homeFwdPool.length ? homeFwdPool : [...home.squad].sort((a, b) => b.shooting - a.shooting);
  const awayFwdPool = away.squad.filter(p => FWD_POS.includes(p.pos)).sort((a, b) => b.shooting - a.shooting);
  const awayFwd = awayFwdPool.length ? awayFwdPool : [...away.squad].sort((a, b) => b.shooting - a.shooting);

  let hgi = 0, agi = 0;
  for (const ev of minutes) {
    if (!ev.type) {
      // goal
      if (ev.team === 'home') {
        const scorer = homeFwd[hgi % homeFwd.length];
        const assist = homeFwd[(hgi + 1) % homeFwd.length];
        events.push({ type: 'goal', min: ev.min, team: 'home', player: scorer.name, assist: assist.name });
        scorer.goals++;
        if (assist) assist.assists++;
        scorer.appearances = (scorer.appearances || 0) + 1;
        hgi++;
      } else {
        const scorer = awayFwd[agi % awayFwd.length];
        const assist = awayFwd[(agi + 1) % awayFwd.length];
        events.push({ type: 'goal', min: ev.min, team: 'away', player: scorer.name, assist: assist.name });
        scorer.goals++;
        if (assist) assist.assists++;
        scorer.appearances = (scorer.appearances || 0) + 1;
        agi++;
      }
    } else {
      const squad = ev.team === 'home' ? home.squad : away.squad;
      const player = squad[Math.floor(Math.random() * squad.length)];
      events.push({ type: ev.type, min: ev.min, team: ev.team, player: player.name });
    }
  }

  // Update GK clean sheets
  if (homeGoals === 0) {
    const gk = away.squad.find(p => p.pos === 'GK');
    if (gk) gk.cleanSheets = (gk.cleanSheets || 0) + 1;
  }
  if (awayGoals === 0) {
    const gk = home.squad.find(p => p.pos === 'GK');
    if (gk) gk.cleanSheets = (gk.cleanSheets || 0) + 1;
  }

  return events;
}

// Calculate league table from results
function calculateTable(teamIds, results) {
  const table = {};
  teamIds.forEach(id => {
    table[id] = { id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  });

  for (const r of results) {
    if (!table[r.homeTeam] || !table[r.awayTeam]) continue;
    const h = table[r.homeTeam];
    const a = table[r.awayTeam];

    h.played++; a.played++;
    h.gf += r.homeGoals; h.ga += r.awayGoals;
    a.gf += r.awayGoals; a.ga += r.homeGoals;
    h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;

    if (r.homeGoals > r.awayGoals) {
      h.won++; h.points += 3; a.lost++;
    } else if (r.homeGoals === r.awayGoals) {
      h.drawn++; h.points++; a.drawn++; a.points++;
    } else {
      a.won++; a.points += 3; h.lost++;
    }
  }

  return Object.values(table).sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf
  );
}

// Generate all fixtures for a league season (home & away)
function generateFixtures(teamIds) {
  const fixtures = [];
  const n = teamIds.length;
  const rounds = (n - 1) * 2;
  const teams = [...teamIds];

  // Round-robin algorithm
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      fixtures.push({ home: teams[i], away: teams[n - 1 - i], round, played: false });
    }
    // Rotate
    teams.splice(1, 0, teams.pop());
  }

  // Return fixtures (away fixtures)
  const returnFixtures = fixtures.map(f => ({
    home: f.away, away: f.home, round: f.round + (n - 1), played: false
  }));

  return [...fixtures, ...returnFixtures].sort((a, b) => a.round - b.round);
}

// Transfer value calculation
// Uses cubic curve on (ovr - 55) so separation between 65 and 90 is massive
// ovr=94 age=23 → ~£150M | ovr=85 age=22 → ~£80M | ovr=75 age=28 → ~£18M | ovr=65 age=25 → ~£3M
function calculateTransferValue(player) {
  const ageMult = player.age <= 20 ? 1.7 : player.age <= 23 ? 1.4 : player.age <= 26 ? 1.1 :
                  player.age <= 29 ? 1.0 : player.age <= 31 ? 0.75 : player.age <= 33 ? 0.5 : 0.25;
  const base = Math.max(0, player.overall - 55);
  return Math.round(Math.pow(base, 3) * 1800 * ageMult);
}

// Check if a team can afford a player
function canAfford(teamId, amount, gameState) {
  return (gameState.budgets[teamId] || 0) >= amount;
}

// Form streak: returns -3 to +3 based on last 3 results
function getFormStreak(teamId, gameState) {
  const leagueId = ['premier', 'championship'].find(lid =>
    (gameState.leagueTeams?.[lid] || []).includes(teamId)
  ) || gameState.playerLeague;
  const all = (gameState.results?.[leagueId] || [])
    .filter(r => r.homeTeam === teamId || r.awayTeam === teamId)
    .slice(-3);
  return all.reduce((s, r) => {
    const won = (r.homeTeam === teamId && r.homeGoals > r.awayGoals) ||
                (r.awayTeam === teamId && r.awayGoals > r.homeGoals);
    const lost = (r.homeTeam === teamId && r.homeGoals < r.awayGoals) ||
                 (r.awayTeam === teamId && r.awayGoals < r.homeGoals);
    return s + (won ? 1 : lost ? -1 : 0);
  }, 0);
}

// Morale system — enhanced with form streak
function updateMorale(teamId, result, gameState) {
  let change = result === 'win' ? 5 : result === 'draw' ? 1 : -4;
  const streak = getFormStreak(teamId, gameState);
  if (result === 'win' && streak >= 2) change += 2;   // win streak bonus
  if (result === 'loss' && streak <= -2) change -= 2; // losing streak punishment
  const current = gameState.morale[teamId] || 70;
  gameState.morale[teamId] = Math.max(20, Math.min(100, current + change));
}

// Fitness recovery between matches
function recoverFitness(gameState) {
  for (const teamId in gameState.fitness) {
    gameState.fitness[teamId] = Math.min(100, (gameState.fitness[teamId] || 85) + 3);
  }
}

// After a match, reduce fitness
function applyMatchFatigue(teamId, gameState) {
  gameState.fitness[teamId] = Math.max(50, (gameState.fitness[teamId] || 85) - 8);
}

// Injuries: small chance per match per team, 1–3 weeks out
// Returns array of newly injured { name, pos, weeks, teamId }
function generateMatchInjuries(home, away) {
  const newlyInjured = [];
  [home, away].forEach(team => {
    if (Math.random() < 0.12) {
      const eligible = team.squad.filter(p => !p.injuredWeeks);
      if (!eligible.length) return;
      const victim = eligible[Math.floor(Math.random() * eligible.length)];
      victim.injuredWeeks = Math.floor(Math.random() * 3) + 1;
      newlyInjured.push({ name: victim.name, pos: victim.pos, weeks: victim.injuredWeeks, teamId: team.id });
    }
  });
  return newlyInjured;
}

// Decrement injury counters each matchweek
function decrementInjuries(gameState) {
  getAllTeams().forEach(team => {
    team.squad.forEach(p => { if (p.injuredWeeks > 0) p.injuredWeeks--; });
  });
}

// Weekly wage cost for a team (safe formula — won't bankrupt teams)
function getWeeklyWageCost(team) {
  return team.squad.reduce((sum, p) => sum + Math.round(Math.max(0, p.overall - 50) * 60), 0);
}
