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
    // exact match first (skip injured)
    let p = squad.find(p => !used.has(p.id) && !p.injuredWeeks && p.pos === targetPos);
    if (!p) {
      for (const alt of (POS_FALLBACKS[targetPos] || [])) {
        p = squad.find(p => !used.has(p.id) && !p.injuredWeeks && p.pos === alt);
        if (p) break;
      }
    }
    // last resort: best remaining (including injured if no one else)
    if (!p) p = squad.find(p => !used.has(p.id) && !p.injuredWeeks);
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

  // Cost scales with current OVR
  const cost = Math.round(40000 + (p.overall - 40) * 8000);
  if (!canAfford(gameState.playerTeam, cost, gameState)) {
    return { success: false, message: `Training costs €${(cost/1000).toFixed(0)}K — not enough budget.` };
  }

  // Cap: can't train past (potential - 3)
  if (p.overall >= p.potential - 3) return { success: false, message: `${p.name} is near their ceiling.` };

  gameState.budgets[gameState.playerTeam] -= cost;
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

  return { success: true, message: `${p.name} trained! +1 OVR, +1 ${stat}.` };
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
    if (playingIds.has(p.id)) {
      p.matchesWithoutPlay = 0;
    } else {
      p.matchesWithoutPlay = (p.matchesWithoutPlay || 0) + 1;
      // Notify when a key player first hits unhappy threshold
      if (p.overall >= 74 && p.matchesWithoutPlay === 5) {
        if (!gameState.unhappyNotifications) gameState.unhappyNotifications = [];
        gameState.unhappyNotifications.push({ name: p.name, pos: p.pos, ovr: p.overall });
      }
    }
  });
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
