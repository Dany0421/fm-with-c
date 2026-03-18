// manager.js — Transfers, tactics, squad management

// Formation display rows (top=attack, bottom=defense) — each string is a slot
const FORMATION_DISPLAY = {
  '4-4-2':   [['ST','ST'], ['LM','CM','CM','RM'], ['LB','CB','CB','RB'], ['GK']],
  '4-3-3':   [['LW','ST','RW'], ['CM','CM','CM'], ['LB','CB','CB','RB'], ['GK']],
  '4-2-3-1': [['ST'], ['CAM','CAM','CAM'], ['CDM','CDM'], ['LB','CB','CB','RB'], ['GK']],
  '3-5-2':   [['ST','ST'], ['CAM'], ['LWB','CM','CM','RWB'], ['CB','CB','CB'], ['GK']],
  '5-3-2':   [['ST','ST'], ['CM','CM','CM'], ['LWB','CB','CB','CB','RWB'], ['GK']],
  '4-5-1':   [['ST'], ['LW','CM','CM','CM','RW'], ['LB','CB','CB','RB'], ['GK']],
  '3-4-3':   [['LW','ST','RW'], ['LWB','CM','CM','RWB'], ['CB','CB','CB'], ['GK']],
};

// Position fallback chains — when a slot can't be filled exactly
const POS_FALLBACKS = {
  'LM':  ['LW','CAM','CM','RM','RW'],
  'RM':  ['RW','CAM','CM','LM','LW'],
  'LW':  ['LM','CAM','CM','RW','RM'],
  'RW':  ['RM','CAM','CM','LW','LM'],
  'LWB': ['LB','RB','CB'],
  'RWB': ['RB','LB','CB'],
  'CDM': ['CM','CB'],
  'CAM': ['CM','LM','RM','RW','LW'],
  'CF':  ['ST','CAM'],
  'ST':  ['CF','CAM','RW','LW'],
  'CM':  ['CAM','CDM','LM','RM'],
  'CB':  ['CDM','LB','RB'],
  'LB':  ['LWB','CB','RB'],
  'RB':  ['RWB','CB','LB'],
  'GK':  [],
};

function getManagerTactics(gameState) {
  return gameState.tactics?.[gameState.playerTeam] || {
    formation: '4-4-2',
    mentality: 'balanced',      // attacking, balanced, defensive
    defensiveLine: 'medium',    // high, medium, low
    pressing: 'medium',         // high, medium, low
    width: 'normal',            // wide, normal, narrow
    passingStyle: 'mixed',      // direct, mixed, short
    tempo: 'normal',            // fast, normal, slow
    captain: null,              // player id
    penaltyTaker: null,
    freeKickTaker: null,
    cornerTaker: null,
  };
}

function setTactics(gameState, tactics) {
  if (!gameState.tactics) gameState.tactics = {};
  gameState.tactics[gameState.playerTeam] = { ...getManagerTactics(gameState), ...tactics };
}

// Get players by position for lineup display
function getSquadByPosition(teamId) {
  const team = getTeam(teamId);
  const grouped = {};
  team.squad.forEach(p => {
    if (!grouped[p.pos]) grouped[p.pos] = [];
    grouped[p.pos].push(p);
  });
  // Sort each position by overall
  Object.keys(grouped).forEach(pos => {
    grouped[pos].sort((a, b) => b.overall - a.overall);
  });
  return grouped;
}

// Get best 11 for a formation
function getBestEleven(teamId, formation) {
  const team = getTeam(teamId);
  const squad = [...team.squad].sort((a, b) => b.overall - a.overall);
  const used = new Set();

  const rows = FORMATION_DISPLAY[formation] || FORMATION_DISPLAY['4-4-2'];
  // Flatten rows to get ordered slot list
  const slots = rows.flat();

  function pickPlayer(targetPos) {
    // exact match first (skip injured + out on loan)
    let p = squad.find(p => !used.has(p.id) && !p.injuredWeeks && !p.outOnLoan && p.pos === targetPos);
    if (!p) {
      for (const alt of (POS_FALLBACKS[targetPos] || [])) {
        p = squad.find(p => !used.has(p.id) && !p.injuredWeeks && !p.outOnLoan && p.pos === alt);
        if (p) break;
      }
    }
    // last resort: best remaining (skip only out on loan)
    if (!p) p = squad.find(p => !used.has(p.id) && !p.outOnLoan && !p.injuredWeeks);
    if (!p) p = squad.find(p => !used.has(p.id));
    if (p) { used.add(p.id); return { ...p, slot: targetPos }; }
    return null;
  }

  // Pick players in slot order
  return slots.map(slot => pickPlayer(slot)).filter(Boolean);
}

// Transfer market
function searchTransferMarket(gameState, filters = {}) {
  const results = [];
  const { maxValue, position, minOverall } = filters;

  getAllTeams().forEach(team => {
    if (team.id === gameState.playerTeam) return;
    team.squad.forEach(player => {
      const val = calculateTransferValue(player);
      if (maxValue && val > maxValue) return;
      if (position && player.pos !== position) return;
      if (minOverall && player.overall < minOverall) return;
      results.push({ ...player, teamId: team.id, teamName: team.name, value: val });
    });
  });

  return results.sort((a, b) => b.overall - a.overall).slice(0, 150);
}

function getFreeAgents(filters = {}) {
  const { position, minOverall } = filters;
  return FREE_AGENTS.filter(p => {
    if (position && p.pos !== position) return false;
    if (minOverall && p.overall < minOverall) return false;
    return true;
  }).sort((a, b) => b.overall - a.overall);
}

// ─── YOUTH MANAGEMENT ────────────────────────────────────────────────────────
function signYouthPlayer(gameState, playerId) {
  if (!gameState.youthMarket) return { success: false, message: 'No youth market available.' };
  const idx = gameState.youthMarket.findIndex(p => p.id === playerId);
  if (idx === -1) return { success: false, message: 'Player not found.' };
  const p = gameState.youthMarket[idx];

  const youthSquad = gameState.youthSquad || [];
  if (youthSquad.length >= 15) return { success: false, message: 'Youth squad full (max 15).' };

  const cost = p.youthPrice || 100000;
  if (!canAfford(gameState.playerTeam, cost, gameState)) {
    return { success: false, message: `Need €${(cost/1e6).toFixed(2)}M — not enough budget.` };
  }

  gameState.budgets[gameState.playerTeam] -= cost;
  gameState.youthMarket.splice(idx, 1);
  gameState.youthSquad = youthSquad;
  youthSquad.push(p);
  return { success: true, message: `${p.name} signed to youth academy!` };
}

function promoteYouthPlayer(gameState, playerId) {
  if (!gameState.youthSquad) return { success: false, message: 'No youth squad.' };
  const idx = gameState.youthSquad.findIndex(p => p.id === playerId);
  if (idx === -1) return { success: false, message: 'Player not found.' };
  const p = gameState.youthSquad[idx];

  const team = getTeam(gameState.playerTeam);
  if (!team) return { success: false, message: 'Team not found.' };
  if (team.squad.length >= 24) return { success: false, message: 'Main squad full (max 24).' };

  gameState.youthSquad.splice(idx, 1);
  p.isYouth = false;
  p.fromAcademy = true;
  team.squad.push(p);
  return { success: true, message: `${p.name} promoted to first team!` };
}

function trainYouthPlayer(gameState, playerId) {
  if (!gameState.youthSquad) return { success: false, message: 'No youth squad.' };
  const p = gameState.youthSquad.find(pl => pl.id === playerId);
  if (!p) return { success: false, message: 'Player not found.' };

  // Ticks reset every matchweek; cap boosted by youth coach
  const ticksUsed = gameState.youthTrainingTicks || 0;
  const ticksCap = getYouthTicksCap(gameState);
  if (ticksUsed >= ticksCap) return { success: false, message: `No training sessions left this matchweek (${ticksCap}/${ticksCap} used).` };

  // Cost scales with current OVR
  const cost = Math.round(40000 + (p.overall - 40) * 8000);
  if (!canAfford(gameState.playerTeam, cost, gameState)) {
    return { success: false, message: `Training costs ${formatMoney(cost)} — not enough budget.` };
  }

  // Cap: can't train past (potential - 3)
  if (p.overall >= p.potential - 3) return { success: false, message: `${p.name} is near their ceiling.` };

  gameState.budgets[gameState.playerTeam] -= cost;
  gameState.youthTrainingTicks = ticksUsed + 1;
  p.overall = Math.min(p.potential - 2, p.overall + 1);

  // Boost a key stat based on position
  const statBoosts = {
    ST: ['shooting','pace'], CF: ['shooting','dribbling'], LW: ['pace','dribbling'],
    RW: ['pace','dribbling'], CAM: ['dribbling','passing'], CM: ['passing','physical'],
    CDM: ['defending','physical'], LB: ['pace','defending'], RB: ['pace','defending'],
    CB: ['defending','physical'], GK: ['defending','physical']
  };
  const keys = statBoosts[p.pos] || ['physical','passing'];
  const stat = keys[Math.floor(Math.random() * keys.length)];
  p[stat] = Math.min(99, (p[stat] || 50) + 1);

  const left = ticksCap - gameState.youthTrainingTicks;

  // 5% chance to develop a trait per session
  let traitMsg = '';
  if (!p.traits) p.traits = [];
  if (p.traits.length < 3 && Math.random() < 0.05) {
    const pool = (TRAIT_POOLS[p.pos] || TRAIT_POOLS['CM']).filter(t => !p.traits.includes(t) && !NEGATIVE_TRAITS.includes(t));
    if (pool.length) {
      const newTrait = pool[Math.floor(Math.random() * pool.length)];
      p.traits.push(newTrait);
      traitMsg = ` 🌟 New trait: ${TRAITS[newTrait]?.name || newTrait}!`;
    }
  }

  return { success: true, message: `${p.name} trained! +1 OVR, +1 ${stat}. ${left} session${left!==1?'s':''} left this matchweek.${traitMsg}` };
}

function sendPlayerOnLoan(gameState, playerId) {
  const team = getTeam(gameState.playerTeam);
  if (!team) return { success: false, message: 'Team not found.' };
  const p = team.squad.find(pl => pl.id === playerId);
  if (!p) return { success: false, message: 'Player not found.' };
  if (p.outOnLoan) return { success: false, message: `${p.name} is already out on loan.` };
  if (p.onLoan) return { success: false, message: `${p.name} is a loaned player — can't re-loan.` };
  if (p.injuredWeeks) return { success: false, message: `${p.name} is injured.` };

  p.outOnLoan = true;
  p.loanWeek = gameState.currentRound?.[gameState.playerLeague] ?? 0;
  return { success: true, message: `${p.name} sent on loan. Returns next season with +1 OVR.` };
}

function calculateRecallFee(player, gameState) {
  const leagueId = gameState.playerLeague;
  const totalWeeks = gameState.fixtures?.[leagueId]
    ? Math.round(gameState.fixtures[leagueId].length / (LEAGUES[leagueId].teams.length / 2))
    : 38;
  const currentWeek = gameState.currentRound?.[leagueId] ?? 0;
  const loanWeek = player.loanWeek ?? 0;
  const weeksRemaining = Math.max(0, totalWeeks - currentWeek);
  const loanDuration = Math.max(1, totalWeeks - loanWeek);
  // How much of the loan is still left (0 = done, 1 = just sent)
  const remainingRatio = weeksRemaining / loanDuration;

  // Base fee by OVR tier
  let base;
  const ovr = player.overall;
  if (ovr >= 88)      base = 1_200_000;
  else if (ovr >= 83) base = 700_000;
  else if (ovr >= 78) base = 350_000;
  else if (ovr >= 73) base = 160_000;
  else if (ovr >= 68) base = 70_000;
  else                base = 25_000;

  const fee = Math.round(base * remainingRatio * 1.1 / 5000) * 5000;
  return Math.max(5000, fee);
}

function recallPlayerFromLoan(gameState, playerId) {
  const team = getTeam(gameState.playerTeam);
  if (!team) return { success: false, message: 'Team not found.' };
  const p = team.squad.find(pl => pl.id === playerId);
  if (!p || !p.outOnLoan) return { success: false, message: 'Player not on loan.' };

  const fee = calculateRecallFee(p, gameState);
  if ((gameState.budgets[gameState.playerTeam] || 0) < fee)
    return { success: false, message: `Not enough budget. Recall fee: ${fee}.` };

  gameState.budgets[gameState.playerTeam] -= fee;
  p.outOnLoan = false;
  delete p.loanWeek;
  // No +1 OVR — didn't finish the loan
  return { success: true, fee, message: `${p.name} recalled. Fee paid: £${fee.toLocaleString()}.` };
}

function attemptTransfer(gameState, playerId, fromTeamId) {
  const playerTeam = getTeam(gameState.playerTeam);
  let player, fromTeam;

  if (!fromTeamId) {
    // Free agent
    player = FREE_AGENTS.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found.' };
  } else {
    fromTeam = getTeam(fromTeamId);
    player = fromTeam?.squad.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found.' };
  }

  const value = fromTeamId ? calculateTransferValue(player) : Math.round(calculateTransferValue(player) * 0.1);

  if (!gameState.transferWindowOpen) {
    return { success: false, message: 'Transfer window is closed.' };
  }

  if (!canAfford(gameState.playerTeam, value, gameState)) {
    return {
      success: false,
      message: `Cannot afford. Need £${formatMoney(value)}, have £${formatMoney(gameState.budgets[gameState.playerTeam])}.`
    };
  }

  if (playerTeam.squad.length >= 25) {
    return { success: false, message: 'Squad is full (max 25 players). Sell someone first.' };
  }

  // FFP: check if wage bill would be too high post-signing
  const weeklyWages = getWeeklyWageCost(playerTeam);
  const newPlayerWage = Math.round(Math.max(0, player.overall - 50) * 60);
  const projectedSeasonWages = (weeklyWages + newPlayerWage) * 50;
  const budget = gameState.budgets[gameState.playerTeam] || 0;
  if (projectedSeasonWages > budget * 1.8) {
    const isHighPrestige = playerTeam.prestige >= 75;
    if (!isHighPrestige) {
      return { success: false, message: `FFP Block: projected wage bill (${formatMoney(projectedSeasonWages)}/season) exceeds financial limits.` };
    }
    // High prestige clubs get a warning but deal goes through
  }

  // AI acceptance check (higher rated teams are harder to buy from — reputation helps)
  if (fromTeamId) {
    const fromPrestige = fromTeam.prestige;
    const playerPrestige = playerTeam.prestige;
    const repBonus = ((gameState.managerReputation || 50) - 50) / 200; // -0.25 to +0.25
    if (fromPrestige > playerPrestige + 15 && Math.random() > (0.3 + repBonus)) {
      return { success: false, message: `${fromTeam.name} rejected the offer. They don't want to sell to a lower-prestige club.` };
    }
  }

  // Execute transfer
  gameState.budgets[gameState.playerTeam] -= value;
  if (fromTeamId) {
    fromTeam.squad = fromTeam.squad.filter(p => p.id !== playerId);
    gameState.budgets[fromTeamId] = (gameState.budgets[fromTeamId] || 0) + value;
  } else {
    FREE_AGENTS.splice(FREE_AGENTS.findIndex(p => p.id === playerId), 1);
  }

  const newPlayer = { ...player };
  playerTeam.squad.push(newPlayer);

  return {
    success: true,
    message: `${player.name} signed for £${formatMoney(value)}!`,
    player: newPlayer,
    spent: value
  };
}

function sellPlayer(gameState, playerId) {
  const playerTeam = getTeam(gameState.playerTeam);
  const idx = playerTeam.squad.findIndex(p => p.id === playerId);
  if (idx === -1) return { success: false, message: 'Player not in your squad.' };

  const player = playerTeam.squad[idx];
  if (player.pos === 'GK' && playerTeam.squad.filter(p => p.pos === 'GK').length <= 1) {
    return { success: false, message: 'Cannot sell your only goalkeeper.' };
  }
  if (playerTeam.squad.length <= 15) {
    return { success: false, message: 'Squad too small to sell anyone.' };
  }

  const value = calculateTransferValue(player);
  playerTeam.squad.splice(idx, 1);
  gameState.budgets[gameState.playerTeam] += value;

  return {
    success: true,
    message: `${player.name} sold for £${formatMoney(value)}.`,
    earned: value
  };
}

function formatMoney(amount) {
  if (amount >= 1000000) return `£${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `£${(amount / 1000).toFixed(0)}K`;
  return `£${amount}`;
}

// ─── PLAYER TRAITS ────────────────────────────────────────────────────────────
const TRAITS = {
  // Attacking
  clinical:      { name: 'Clinical',     icon: '🎯', color: '#22c55e', desc: 'Big chance conversion +20%' },
  poacher:       { name: 'Poacher',      icon: '👁️',  color: '#22c55e', desc: 'Higher scorer weight in the box' },
  longshot:      { name: 'Long Shot',    icon: '💥', color: '#22c55e', desc: 'Low shots count as medium' },
  speedster:     { name: 'Speedster',    icon: '⚡', color: '#22c55e', desc: 'Pace-based positions get +10% attack' },
  header:        { name: 'Header King', icon: '🦁', color: '#22c55e', desc: 'Higher weight for header goals' },
  // Creative / Midfield
  playmaker:     { name: 'Playmaker',    icon: '🧠', color: '#60a5fa', desc: 'CAM/CM attack contribution +18%' },
  btb:           { name: 'Box-to-Box',   icon: '🔄', color: '#60a5fa', desc: 'Contributes fully to both attack & defense' },
  engine:        { name: 'Engine',       icon: '🔋', color: '#60a5fa', desc: 'Team loses less fitness after matches' },
  // Defensive
  rock:          { name: 'Rock',         icon: '🪨', color: '#38bdf8', desc: 'Defense contribution +15%' },
  pkstopper:     { name: 'PK Stopper',   icon: '🧤', color: '#38bdf8', desc: 'GK: penalty saves 25% → 42%' },
  aerial:        { name: 'Aerial',       icon: '✈️',  color: '#38bdf8', desc: 'CB: defense contribution +10%' },
  // Mental
  clutch:        { name: 'Clutch',       icon: '⭐', color: '#f59e0b', desc: 'Performs above all expectations in big moments' },
  biggame:       { name: 'Big Game',     icon: '🏆', color: '#f59e0b', desc: 'Elevates team in CL/EL matches' },
  consistent:    { name: 'Consistent',   icon: '📈', color: '#f59e0b', desc: 'Contribution +4% — always shows up' },
  form:          { name: 'Form Player',  icon: '🔥', color: '#f59e0b', desc: 'Amplifies win/loss momentum' },
  captain_mat:   { name: 'Leader',       icon: '🪖', color: '#f59e0b', desc: 'As captain: morale boost is stronger' },
  // Negative
  injury_prone:  { name: 'Injury Prone', icon: '🤕', color: '#ef4444', desc: 'Higher injury risk, longer recoveries' },
  hotheaded:     { name: 'Hot-Headed',   icon: '🌡️', color: '#ef4444', desc: '1.5× yellow/red card chance' },
  temperamental: { name: 'Moody',        icon: '😤', color: '#ef4444', desc: 'Unhappy after only 3 games benched' },
};

const NEGATIVE_TRAITS = ['injury_prone', 'hotheaded', 'temperamental'];

const TRAIT_POOLS = {
  GK:  ['rock', 'pkstopper', 'consistent', 'engine'],
  CB:  ['rock', 'aerial', 'consistent', 'header', 'btb'],
  RB:  ['speedster', 'consistent', 'engine', 'rock'],
  LB:  ['speedster', 'consistent', 'engine', 'rock'],
  CDM: ['rock', 'btb', 'consistent', 'engine'],
  CM:  ['playmaker', 'btb', 'engine', 'consistent', 'form', 'longshot'],
  CAM: ['playmaker', 'clinical', 'form', 'consistent', 'longshot', 'biggame'],
  RW:  ['speedster', 'clinical', 'form', 'consistent', 'biggame'],
  LW:  ['speedster', 'clinical', 'form', 'consistent', 'biggame'],
  RM:  ['speedster', 'clinical', 'form', 'consistent'],
  LM:  ['speedster', 'clinical', 'form', 'consistent'],
  ST:  ['clinical', 'poacher', 'header', 'form', 'biggame', 'clutch', 'consistent'],
  CF:  ['clinical', 'poacher', 'header', 'form', 'biggame', 'clutch', 'consistent'],
};

function assignRandomTraits(player) {
  if (player.traits) return; // already assigned, don't overwrite
  const roll = Math.random();
  if (roll < 0.53) { player.traits = []; return; } // 53% no traits
  const pool = TRAIT_POOLS[player.pos] || TRAIT_POOLS['CM'];
  const numTraits = roll < 0.85 ? 1 : roll < 0.97 ? 2 : 3; // 32% one, 12% two, 3% three
  const chosen = [];
  for (let i = 0; i < numTraits; i++) {
    const remaining = pool.filter(t => !chosen.includes(t));
    if (!remaining.length) break;
    chosen.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }
  // Small chance of negative trait (~8% for low OVR players, ~3% otherwise)
  if (Math.random() < (player.overall < 75 ? 0.08 : 0.03)) {
    chosen.push(NEGATIVE_TRAITS[Math.floor(Math.random() * NEGATIVE_TRAITS.length)]);
  }
  // High OVR players always have at least something
  if (player.overall >= 82 && !chosen.length && Math.random() < 0.4) {
    chosen.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  player.traits = chosen;
}

// ─── STAFF ────────────────────────────────────────────────────────────────────
const STAFF_ROLES = [
  { id: 'assistantManager', name: 'Assistant Manager', icon: '🧠',
    effectFn: q => `Win morale +${Math.floor(q/40)+1}, loss morale cushion. Training double-OVR ${(8+q/15).toFixed(0)}% chance.` },
  { id: 'fitnessCoach',    name: 'Fitness Coach',     icon: '💪',
    effectFn: q => `+${Math.floor(q/40)} extra fitness recovery/week. ${Math.floor(q/50)} less fatigue/match.` },
  { id: 'physio',          name: 'Physio',            icon: '🏥',
    effectFn: q => `Injury risk ${(q/17).toFixed(0)}% lower. Injuries ${Math.floor(q/50)} week shorter.` },
  { id: 'youthCoach',      name: 'Youth Coach',       icon: '🌱',
    effectFn: q => `${5 + Math.floor(q/33)} youth training ticks/matchweek (base: 5).` },
  { id: 'scout',           name: 'Scout',             icon: '🔭',
    effectFn: q => q >= 60 ? 'Reveals exact player potential in market & transfers.' : 'Shows approximate potential ranges.' },
  { id: 'setPieceCoach',   name: 'Set Piece Coach',   icon: '🎯',
    effectFn: q => `Penalties: ${(75 + q/27).toFixed(0)}% conversion. Free kicks: ${(15 + q/60).toFixed(0)}% goal rate.` },
];

const STAFF_FIRST = ['Carlos','James','Marcus','Viktor','Stefan','Diego','Mikael','Ahmed','Luca','Patrick','Henry','Rui','Sergio','Andre','David','Alex','Luiz','Youssef','Niko','Owen'];
const STAFF_LAST  = ['Mota','Owen','Schmidt','Rossi','Petrov','Martinez','Jensen','Al-Rashid','Ferrari','Dubois','Oliveira','Santos','Carvalho','Meyer','Williams','Nguyen','Diallo','Khan','Barros','Eriksen'];

function randomStaffName() {
  return STAFF_FIRST[Math.floor(Math.random()*STAFF_FIRST.length)] + ' ' +
         STAFF_LAST[Math.floor(Math.random()*STAFF_LAST.length)];
}

function generateStaffMarket(gameState) {
  const market = [];
  STAFF_ROLES.forEach(role => {
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const quality  = 40 + Math.floor(Math.random() * 56); // 40-95
      const tier     = quality < 56 ? 0 : quality < 71 ? 1 : quality < 86 ? 2 : 3;
      const wageRanges = [[5000,12000],[13000,22000],[23000,38000],[40000,65000]];
      const hireRanges = [[50000,120000],[130000,220000],[240000,380000],[400000,650000]];
      const [wMin,wMax] = wageRanges[tier];
      const [hMin,hMax] = hireRanges[tier];
      market.push({
        id:       `s_${Math.random().toString(36).slice(2,10)}`,
        role:     role.id,
        name:     randomStaffName(),
        quality,
        wage:     Math.floor(wMin + Math.random() * (wMax - wMin)),
        hireCost: Math.floor(hMin + Math.random() * (hMax - hMin)),
      });
    }
  });
  gameState.staffMarket = market;
}

function hireStaff(gameState, staffId) {
  if (!gameState.staffMarket) return { success: false, message: 'No market available.' };
  const idx = gameState.staffMarket.findIndex(s => s.id === staffId);
  if (idx === -1) return { success: false, message: 'Staff member not found.' };
  const candidate = gameState.staffMarket[idx];
  if (!gameState.staff) gameState.staff = {};
  if (gameState.staff[candidate.role]) return { success: false, message: 'That role is already filled. Fire current staff first.' };
  if (!canAfford(gameState.playerTeam, candidate.hireCost, gameState))
    return { success: false, message: `Need ${formatMoney(candidate.hireCost)} hire fee — not enough budget.` };
  gameState.budgets[gameState.playerTeam] -= candidate.hireCost;
  gameState.staffMarket.splice(idx, 1);
  gameState.staff[candidate.role] = { ...candidate };
  const role = STAFF_ROLES.find(r => r.id === candidate.role);
  return { success: true, message: `${candidate.name} hired as ${role?.name}!` };
}

function fireStaff(gameState, roleId) {
  if (!gameState.staff?.[roleId]) return { success: false, message: 'No staff in that role.' };
  const name = gameState.staff[roleId].name;
  delete gameState.staff[roleId];
  return { success: true, message: `${name} has been released.` };
}

function getStaffQuality(gameState, roleId) {
  return gameState.staff?.[roleId]?.quality || 0;
}

function getYouthTicksCap(gameState) {
  const q = getStaffQuality(gameState, 'youthCoach');
  return 5 + Math.floor(q / 33); // base 5, up to 8 with elite coach
}

// Determine what potential to show based on scout quality
function getScoutedPotential(potential, gameState) {
  const q = getStaffQuality(gameState, 'scout');
  if (q === 0) return '??';
  if (q < 60) {
    const low  = Math.max(55, potential - 7);
    const high = Math.min(99, potential + 7);
    return `${low}-${high}`;
  }
  return String(potential);
}

// ─── TEAM TRAINING ───────────────────────────────────────────────────────────
const TRAINING_DRILLS = [
  {
    id: 'finishing', name: 'Finishing', icon: '🎯', cost: 450000, weeks: 6,
    desc: 'Shooting ↑ for FWD/CAM, Pace ↑ for wide',
    apply(p) {
      if (['ST','CF','CAM','LW','RW'].includes(p.pos)) p.shooting = Math.min(99, p.shooting + (Math.random()<0.35?2:1));
      else if (['CM'].includes(p.pos)) p.shooting = Math.min(99, p.shooting + 1);
      if (['LW','RW'].includes(p.pos)) p.pace = Math.min(99, p.pace + 1);
    }
  },
  {
    id: 'defense', name: 'Defensive Shape', icon: '🛡️', cost: 400000, weeks: 7,
    desc: 'Defending ↑ for DEF/CDM, Physical ↑ all',
    apply(p) {
      p.physical = Math.min(99, p.physical + 1);
      if (['CB','LB','RB','CDM','LWB','RWB'].includes(p.pos)) p.defending = Math.min(99, p.defending + (Math.random()<0.35?2:1));
    }
  },
  {
    id: 'sprint', name: 'Sprint Work', icon: '⚡', cost: 350000, weeks: 5,
    desc: 'Pace ↑ for all, extra boost for wide & strikers',
    apply(p) {
      const bonus = ['LW','RW','ST','LB','RB'].includes(p.pos) ? (Math.random()<0.35?2:1) : 1;
      p.pace = Math.min(99, p.pace + bonus);
    }
  },
  {
    id: 'passing', name: 'Passing Clinic', icon: '⚽', cost: 380000, weeks: 6,
    desc: 'Passing ↑ for all, extra for midfielders',
    apply(p) {
      const bonus = ['CM','CAM','CDM','LM','RM'].includes(p.pos) ? (Math.random()<0.35?2:1) : 1;
      p.passing = Math.min(99, p.passing + bonus);
    }
  },
  {
    id: 'strength', name: 'Strength Camp', icon: '💪', cost: 320000, weeks: 5,
    desc: 'Physical ↑↑ across the whole squad equally',
    apply(p) {
      p.physical = Math.min(99, p.physical + (Math.random()<0.35?2:1));
    }
  },
  {
    id: 'technical', name: 'Ball Mastery', icon: '🎭', cost: 420000, weeks: 7,
    desc: 'Dribbling ↑ for FWD/MID, Passing ↑ for MID',
    apply(p) {
      if (['ST','CAM','LW','RW','CM'].includes(p.pos)) p.dribbling = Math.min(99, p.dribbling + (Math.random()<0.35?2:1));
      if (['CM','CAM','CDM'].includes(p.pos)) p.passing = Math.min(99, p.passing + 1);
    }
  },
];

function startTeamTraining(gameState, drillId) {
  const drill = TRAINING_DRILLS.find(d => d.id === drillId);
  if (!drill) return { success: false, message: 'Training not found.' };
  if (gameState.activeTraining) return { success: false, message: 'Training already in progress.' };
  if (!canAfford(gameState.playerTeam, drill.cost, gameState)) {
    return { success: false, message: `Not enough budget — need ${formatMoney(drill.cost)}.` };
  }
  gameState.budgets[gameState.playerTeam] -= drill.cost;
  gameState.activeTraining = { drillId, weeksLeft: drill.weeks, totalWeeks: drill.weeks };
  return { success: true, message: `${drill.name} started — ${drill.weeks} matchweeks to go.` };
}

function completeTraining(gameState) {
  const training = gameState.activeTraining;
  if (!training) return;
  const drill = TRAINING_DRILLS.find(d => d.id === training.drillId);
  if (!drill) { gameState.activeTraining = null; return; }

  const team = getTeam(gameState.playerTeam);
  if (!team) { gameState.activeTraining = null; return; }

  const assistQ = gameState?.staff?.assistantManager?.quality || 0;
  const doubleOvrChance = Math.min(0.22, 0.08 + assistQ / 1100); // 8% → ~14% with elite staff
  let ovrGains = 0;
  team.squad.forEach(p => {
    if (p.injuredWeeks) return; // injured sit out
    drill.apply(p);
    // Always +1 OVR, rarely +2 (boosted by assistant manager)
    const gain = Math.random() < doubleOvrChance ? 2 : 1;
    const cap = (p.potential || 99) - 1;
    if (p.overall < cap) {
      p.overall = Math.min(cap, p.overall + gain);
      ovrGains += gain;
    }
  });

  gameState.activeTraining = null;
  gameState.notification = `🏋️ ${drill.name} complete! Squad OVR +${ovrGains} total.`;
}

function executeLoan(gameState, playerId, fromTeamId) {
  const playerTeam = getTeam(gameState.playerTeam);
  const fromTeam = getTeam(fromTeamId);
  const player = fromTeam?.squad.find(p => p.id === playerId);

  if (!player) return { success: false, message: 'Player not found.' };
  if (!gameState.transferWindowOpen) return { success: false, message: 'Transfer window is closed.' };
  if (playerTeam.squad.length >= 25) return { success: false, message: 'Squad is full (max 25).' };

  const loanFee = Math.round(calculateTransferValue(player) * 0.15);
  if (!canAfford(gameState.playerTeam, loanFee, gameState)) {
    return { success: false, message: `Cannot afford loan fee. Need ${formatMoney(loanFee)}.` };
  }

  // Age check: loans are typically for young players
  if (player.age > 27) return { success: false, message: `${player.name} is too old for a loan deal.` };

  // Prestige check: teams won't loan their best players to rivals
  if (fromTeam.prestige < getTeam(gameState.playerTeam).prestige - 20) {
    return { success: false, message: `${fromTeam.name} won't loan to a much higher prestige club.` };
  }

  gameState.budgets[gameState.playerTeam] -= loanFee;
  fromTeam.squad = fromTeam.squad.filter(p => p.id !== playerId);

  const loanedPlayer = { ...player, onLoan: true, loanFromTeamId: fromTeamId, loanFromTeamName: fromTeam.name };
  playerTeam.squad.push(loanedPlayer);

  return {
    success: true,
    message: `${player.name} loaned for ${formatMoney(loanFee)}! Returns at season end.`,
    player: loanedPlayer,
    spent: loanFee
  };
}

// Track which players got game time after a player match
function updatePlayerGameTime(teamId, startingEleven, gameState) {
  const team = getTeam(teamId);
  if (!team) return;
  const playingIds = new Set(startingEleven.map(p => p.id));

  team.squad.forEach(p => {
    if (p.morale === undefined) p.morale = 70; // init individual morale for old saves
    if (playingIds.has(p.id)) {
      p.matchesWithoutPlay = 0;
      p.morale = Math.min(95, p.morale + 2); // happy playing
    } else {
      p.matchesWithoutPlay = (p.matchesWithoutPlay || 0) + 1;
      // Morale drops faster for key players who expect to start
      const drop = p.overall >= 74 ? 4 : p.overall >= 65 ? 2 : 1;
      p.morale = Math.max(10, p.morale - drop);
      // Notify when a key player first hits unhappy threshold
      if (p.overall >= 74 && p.matchesWithoutPlay === 5) {
        if (!gameState.unhappyNotifications) gameState.unhappyNotifications = [];
        gameState.unhappyNotifications.push({ name: p.name, pos: p.pos, ovr: p.overall });
      }
    }
  });
}

// ─── CONTRACT SYSTEM ──────────────────────────────────────────────────────────
function getContractRenewalOffer(player) {
  const currentWage = player.wage || Math.round(Math.max(0, player.overall - 50) * 60);
  // Wage increase is small — scales gently with OVR
  const wageIncrease = Math.round(Math.max(0, player.overall - 50) * 4);
  // Signing bonus = 4 weeks of their current wage (tiny)
  const signingBonus = currentWage * 4;
  const newWage = currentWage + wageIncrease;
  // Unhappy players sign shorter contracts and demand more
  const unhappy = (player.morale || 70) < 45;
  const contractYears = unhappy ? 2 : 3;
  const unhappyExtra = unhappy ? Math.round(wageIncrease * 1.5) : 0;
  return { wageIncrease: wageIncrease + unhappyExtra, newWage: newWage + unhappyExtra, signingBonus, contractYears };
}

function renewContract(gameState, playerId) {
  const team = getTeam(gameState.playerTeam);
  const player = team?.squad.find(p => p.id === playerId);
  if (!player) return { success: false, message: 'Player not found.' };
  const offer = getContractRenewalOffer(player);
  if (!canAfford(gameState.playerTeam, offer.signingBonus, gameState))
    return { success: false, message: `Can't afford signing bonus (${formatMoney(offer.signingBonus)}).` };
  gameState.budgets[gameState.playerTeam] -= offer.signingBonus;
  player.wage  = offer.newWage;
  player.contract = offer.contractYears;
  player.morale   = Math.min(95, (player.morale || 70) + 15);
  // Remove any pending demand for this player
  if (gameState.contractDemands)
    gameState.contractDemands = gameState.contractDemands.filter(d => d.playerId !== playerId);
  return { success: true, message: `${player.name} renewed for ${offer.contractYears} years at ${formatMoney(offer.newWage)}/wk.` };
}

function acceptWageDemand(gameState, demandId) {
  if (!gameState.contractDemands) return { success: false, message: 'No demands pending.' };
  const demand = gameState.contractDemands.find(d => d.id === demandId);
  if (!demand) return { success: false, message: 'Demand not found.' };
  const team = getTeam(gameState.playerTeam);
  const player = team?.squad.find(p => p.id === demand.playerId);
  if (!player) {
    gameState.contractDemands = gameState.contractDemands.filter(d => d.id !== demandId);
    return { success: false, message: 'Player not found.' };
  }
  player.wage = (player.wage || Math.round(Math.max(0, player.overall - 50) * 60)) + demand.wageIncrease;
  player.morale = Math.min(90, (player.morale || 70) + 25);
  player.matchesWithoutPlay = 0;
  gameState.contractDemands = gameState.contractDemands.filter(d => d.id !== demandId);
  return { success: true, message: `${player.name} happy with +${formatMoney(demand.wageIncrease)}/wk raise.` };
}

function rejectWageDemand(gameState, demandId) {
  if (!gameState.contractDemands) return { success: false };
  const demand = gameState.contractDemands.find(d => d.id === demandId);
  if (!demand) return { success: false };
  const team = getTeam(gameState.playerTeam);
  const player = team?.squad.find(p => p.id === demand.playerId);
  if (player) {
    player.morale = Math.max(10, (player.morale || 70) - 20);
    // Escalate: next check will generate a transfer request
  }
  gameState.contractDemands = gameState.contractDemands.filter(d => d.id !== demandId);
  return { success: true };
}

function sellUnhappyPlayer(gameState, playerId) {
  // Quick sell at market value — same as sellPlayer but removes demand
  const result = sellPlayer(gameState, playerId);
  if (result.success && gameState.contractDemands)
    gameState.contractDemands = gameState.contractDemands.filter(d => d.playerId !== playerId);
  return result;
}

function getLoanablePlayers(gameState) {
  const results = [];
  getAllTeams().forEach(team => {
    if (team.id === gameState.playerTeam) return;
    team.squad.forEach(p => {
      if (p.age <= 24 && p.overall >= 60 && p.overall <= 87) {
        results.push({ ...p, teamId: team.id, teamName: team.name, loanFee: Math.round(p.wage * 26) });
      }
    });
  });
  return results.sort((a, b) => b.overall - a.overall).slice(0, 60);
}

function getPlayerStats(teamId) {
  const team = getTeam(teamId);
  return [...team.squad].sort((a, b) => b.goals - a.goals || b.assists - a.assists);
}

function getTopScorers(leagueId, gameState, count = 10) {
  const teams = LEAGUES[leagueId].teams;
  const scorers = [];
  teams.forEach(tid => {
    const team = getTeam(tid);
    team.squad.forEach(p => {
      if (p.goals > 0) scorers.push({ ...p, teamName: team.name });
    });
  });
  return scorers.sort((a, b) => b.goals - a.goals).slice(0, count);
}
