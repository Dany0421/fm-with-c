// ui.js — All screen rendering and navigation

let currentScreen = 'main-menu';
let gameState = null;
let transferFilters = { position: '', maxValue: null, minOverall: 60 };
let selectedFormation = '4-4-2';
let transferTab = 'market'; // 'market' | 'free' | 'loans'

// ─── MODAL SYSTEM ─────────────────────────────────────────────────────────────
function showModal({ title, body, confirm, cancel, onConfirm, onCancel, danger = false }) {
  const existing = document.getElementById('fm-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'fm-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      <div class="modal-body">${body}</div>
      <div class="modal-actions">
        ${cancel !== false ? `<button class="btn btn-secondary" id="modal-cancel">${cancel || 'Cancel'}</button>` : ''}
        ${confirm !== false ? `<button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirm || 'Confirm'}</button>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('modal-visible'));

  const close = () => { modal.classList.remove('modal-visible'); setTimeout(() => modal.remove(), 200); };

  modal.querySelector('#modal-confirm')?.addEventListener('click', () => { close(); onConfirm?.(); });
  modal.querySelector('#modal-cancel')?.addEventListener('click', () => { close(); onCancel?.(); });
  modal.addEventListener('click', e => { if (e.target === modal) { close(); onCancel?.(); } });
}

// ─── PLAYER MODAL ─────────────────────────────────────────────────────────────
function showPlayerModal(playerId) {
  let player = null, teamName = '';
  for (const team of getAllTeams()) {
    const p = team.squad.find(q => q.id === playerId);
    if (p) { player = p; teamName = team.name; break; }
  }
  if (!player) return;

  const val = calculateTransferValue(player);
  function statBar(label, v) {
    const pct = Math.round((v / 99) * 100);
    const color = v >= 80 ? 'var(--green)' : v >= 70 ? 'var(--accent)' : v >= 60 ? 'var(--warn)' : 'var(--danger)';
    return `<div class="pm-stat-row">
      <span class="pm-stat-label">${label}</span>
      <div class="pm-stat-track"><div class="pm-stat-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="pm-stat-val" style="color:${color}">${v}</span>
    </div>`;
  }

  showModal({
    title: false,
    cancel: 'Close',
    confirm: false,
    body: `
      <div class="pm-header">
        <span class="pos-badge pos-${player.pos}">${player.pos}</span>
        <div>
          <div class="pm-name">${player.name}</div>
          <div class="pm-meta">${player.age}y · ${player.nation} · ${teamName}</div>
        </div>
      </div>
      <div class="pm-ovr-row">
        <div class="pm-badge"><div class="pm-badge-val ovr-${ovrClass(player.overall)}">${player.overall}</div><div class="pm-badge-lbl">OVR</div></div>
        <div class="pm-badge"><div class="pm-badge-val muted">${player.potential || '?'}</div><div class="pm-badge-lbl">POT</div></div>
        <div class="pm-badge"><div class="pm-badge-val green">${player.goals || 0}</div><div class="pm-badge-lbl">Goals</div></div>
        <div class="pm-badge"><div class="pm-badge-val">${player.assists || 0}</div><div class="pm-badge-lbl">Assists</div></div>
        <div class="pm-badge"><div class="pm-badge-val" style="font-size:13px;color:var(--accent2)">${formatMoney(val)}</div><div class="pm-badge-lbl">Value</div></div>
      </div>
      <div class="pm-stats">
        ${statBar('PAC', player.pace)}
        ${statBar('SHO', player.shooting)}
        ${statBar('PAS', player.passing)}
        ${statBar('DEF', player.defending)}
        ${statBar('PHY', player.physical)}
        ${statBar('DRI', player.dribbling)}
      </div>
      ${player.injuredWeeks ? `<div style="margin-top:10px;background:#3b1010;border:1px solid var(--danger);border-radius:6px;padding:8px 12px;font-size:12px;color:#fca5a5">🤕 Injured — out for <strong>${player.injuredWeeks}w</strong></div>` : ''}
      ${player.onLoan ? `<div style="margin-top:8px;background:#0f2a4a;border:1px solid #2563eb;border-radius:6px;padding:6px 12px;font-size:12px;color:#60a5fa">🔄 On loan</div>` : ''}
    `
  });
}

function manualSave() {
  saveGame();
  showToast('Game saved!', 'success');
}

function goToMainMenu() {
  showModal({
    title: 'Return to Main Menu',
    body: '<p>Your progress is auto-saved. You can continue later.</p>',
    confirm: 'Go to Menu',
    cancel: 'Stay',
    onConfirm: () => {
      saveGame();
      showScreen('main-menu');
    }
  });
}

function showToast(message, type = 'info') {
  const existing = document.getElementById('fm-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'fm-toast';
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => { toast.classList.remove('toast-visible'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function init(state) {
  gameState = state;
  showScreen('main-menu');
}

function showScreen(screen, data) {
  currentScreen = screen;
  const app = document.getElementById('app');
  app.innerHTML = '';

  switch (screen) {
    case 'main-menu':       renderMainMenu(app); break;
    case 'team-select':     renderTeamSelect(app); break;
    case 'hub':             renderHub(app); break;
    case 'squad':           renderSquad(app); break;
    case 'tactics':         renderTactics(app); break;
    case 'press-conference': renderPressConference(app); break;
    case 'post-match-press': renderPostMatchPress(app); break;
    case 'match-replay':    renderMatchReplay(app); break;
    case 'match-preview':   renderMatchPreview(app); break;
    case 'match-result':    renderMatchResult(app, data); break;
    case 'table':           renderTable(app); break;
    case 'transfers':       renderTransfers(app); break;
    case 'fixtures':        renderFixtures(app); break;
    case 'stats':           renderStats(app); break;
    case 'end-season':      renderEndSeason(app); break;
    case 'career':          renderCareer(app); break;
    case 'europa-league':   renderEuropa(app); break;
    case 'champions-league': renderCL(app); break;
    default: renderHub(app);
  }

  // Screen fade-in transition
  requestAnimationFrame(() => {
    app.firstElementChild?.classList.add('screen-fade-in');
  });
}

// ─── MAIN MENU ───────────────────────────────────────────────────────────────
function renderMainMenu(app) {
  app.innerHTML = `
    <div class="main-menu">
      <div class="menu-logo">
        <div class="logo-badge">⚽</div>
        <h1>FOOTBALL MANAGER</h1>
        <p class="subtitle">Multi-League Football Manager</p>
      </div>
      <div class="menu-buttons">
        <button class="btn btn-primary btn-xl" onclick="startNewGame()">NEW GAME</button>
        <button class="btn btn-secondary btn-xl" onclick="loadGame()" id="btn-load" style="display:none">CONTINUE</button>
      </div>
      <div class="menu-footer">Built with ❤️ — Vibe Coded</div>
    </div>
  `;
  if (localStorage.getItem('fm_save')) {
    document.getElementById('btn-load').style.display = 'block';
  }
}

// ─── TEAM SELECT ─────────────────────────────────────────────────────────────────────────────
let _tsCountry = 'england';

function renderTeamSelect(app) {
  const countryButtons = Object.entries(COUNTRY_CONFIG).map(([key, cc]) =>
    `<button class="tab-btn country-tab ${key === _tsCountry ? 'active' : ''}" onclick="switchCountryTab('${key}', this)">${cc.flag} ${key.charAt(0).toUpperCase() + key.slice(1)}</button>`
  ).join('');
  const cc = COUNTRY_CONFIG[_tsCountry];
  const leagueTabs = [
    `<button class="tab-btn league-tab active" onclick="switchLeagueTab('${cc.div1}', this)">${LEAGUES[cc.div1]?.name || cc.div1}</button>`,
    cc.div2 ? `<button class="tab-btn league-tab" onclick="switchLeagueTab('${cc.div2}', this)">${LEAGUES[cc.div2]?.name || cc.div2}</button>` : ''
  ].join('');
  app.innerHTML = `
    <div class="team-select-screen">
      <div class="ts-header">
        <h2>CHOOSE YOUR CLUB</h2>
        <div class="ts-country-tabs">${countryButtons}</div>
        <div class="ts-tabs" id="league-tabs">${leagueTabs}</div>
      </div>
      <div class="ts-body">
        <div class="teams-grid" id="teams-grid"></div>
        <div class="team-detail" id="team-detail">
          <div class="td-placeholder">← Select a team to view details</div>
        </div>
      </div>
    </div>
  `;
  renderTeamGrid(cc.div1);
}

function switchCountryTab(country, btn) {
  _tsCountry = country;
  document.querySelectorAll('.country-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const cc = COUNTRY_CONFIG[country];
  const tabsEl = document.getElementById('league-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = [
      `<button class="tab-btn league-tab active" onclick="switchLeagueTab('${cc.div1}', this)">${LEAGUES[cc.div1]?.name || cc.div1}</button>`,
      cc.div2 ? `<button class="tab-btn league-tab" onclick="switchLeagueTab('${cc.div2}', this)">${LEAGUES[cc.div2]?.name || cc.div2}</button>` : ''
    ].join('');
  }
  renderTeamGrid(cc.div1);
}

function switchLeagueTab(leagueId, btn) {
  document.querySelectorAll('.league-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTeamGrid(leagueId);
}

function renderTeamGrid(leagueId) {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  const league = LEAGUES[leagueId];
  if (!league) { grid.innerHTML = '<p class="muted" style="padding:1rem">League not loaded.</p>'; return; }
  const teams = league.teams.map(id => getTeam(id)).filter(Boolean);
  grid.innerHTML = teams.map(t => `
    <div class="team-card" onclick="selectTeamDetail('${t.id}')" style="border-color:${t.color}">
      <div class="tc-color-bar" style="background:${t.color}"></div>
      <div class="tc-name">${t.name}</div>
      <div class="tc-prestige">★ ${t.prestige}</div>
      <div class="tc-budget">${formatMoney(t.budget)}</div>
    </div>
  `).join('');
}

function selectTeamDetail(teamId) {
  const team = getTeam(teamId);
  const sorted = [...team.squad].sort((a, b) => b.overall - a.overall);
  const top5 = sorted.slice(0, 5);

  document.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
  event.currentTarget?.classList.add('selected');

  const det = document.getElementById('team-detail');
  det.innerHTML = `
    <div class="td-header" style="background:${team.color};color:${isLight(team.color)?'#000':'#fff'}">
      <h3>${team.name}</h3>
      <span>${team.stadium}</span>
    </div>
    <div class="td-stats">
      <div class="td-stat"><span>Prestige</span><strong>${team.prestige}/100</strong></div>
      <div class="td-stat"><span>Budget</span><strong>${formatMoney(team.budget)}</strong></div>
      <div class="td-stat"><span>Capacity</span><strong>${team.capacity.toLocaleString()}</strong></div>
      <div class="td-stat"><span>Squad Size</span><strong>${team.squad.length}</strong></div>
      <div class="td-stat"><span>Avg OVR</span><strong>${Math.round(team.squad.reduce((s,p)=>s+p.overall,0)/team.squad.length)}</strong></div>
    </div>
    <div class="td-players">
      <h4>Key Players</h4>
      ${top5.map(p => `
        <div class="td-player">
          <span class="pos-badge pos-${p.pos}">${p.pos}</span>
          <span class="p-name">${p.name}</span>
          <span class="p-ovr ovr-${ovrClass(p.overall)}">${p.overall}</span>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary btn-full" onclick="confirmTeamSelect('${team.id}')">MANAGE ${team.name.toUpperCase()}</button>
  `;
}


function confirmTeamSelect(teamId) {
  let playerLeague = null, playerCountry = null;
  Object.entries(LEAGUES).forEach(([lid, league]) => {
    if ((league.teams || []).includes(teamId)) {
      playerLeague = lid;
      playerCountry = league.country;
    }
  });
  if (!playerLeague) { playerLeague = 'premier'; playerCountry = 'england'; }
  gameState.playerTeam = teamId;
  gameState.playerLeague = playerLeague;
  gameState.playerCountry = playerCountry;
  initSeason(gameState);
  saveGame();
  showScreen('hub');
}

// ─── HUB ─────────────────────────────────────────────────────────────────────
function renderHub(app) {
  const team = getTeam(gameState.playerTeam);
  const leagueId = gameState.playerLeague;
  const table = getLeagueTable(leagueId, gameState);
  const pos = table.findIndex(r => r.id === gameState.playerTeam) + 1;
  const row = table.find(r => r.id === gameState.playerTeam) || {};
  const nextFixture = getPlayerFixture(gameState);
  const budget = gameState.budgets[gameState.playerTeam];
  const morale = gameState.morale[gameState.playerTeam];
  const week = gameState.currentRound[leagueId] + 1;
  const totalWeeks = gameState.fixtures[leagueId].length / (LEAGUES[leagueId].teams.length / 2);

  const notification = gameState.notification;
  if (notification) {
    gameState.notification = null;
  }

  // Grab and clear injury + unhappy notifications
  const newInjuries = gameState.newInjuries?.slice() || [];
  if (newInjuries.length) gameState.newInjuries = [];
  const unhappyNotifs = gameState.unhappyNotifications?.slice() || [];
  if (unhappyNotifs.length) gameState.unhappyNotifications = [];

  app.innerHTML = `
    <div class="hub">
      <div class="hub-topbar">
        <div class="hub-club" style="border-color:${team.color}">
          <span class="hub-dot" style="background:${team.color}"></span>
          <strong>${team.name}</strong>
          <span class="hub-league">${LEAGUES[leagueId].name}</span>
        </div>
        <div class="hub-info">
          <div class="hub-stat">Season <strong>${gameState.season}</strong></div>
          <div class="hub-stat">Week <strong>${week}</strong></div>
          <div class="hub-stat">Budget <strong>${formatMoney(budget)}</strong></div>
          <div class="hub-stat">Morale <strong class="${morale>75?'green':morale>50?'yellow':'red'}">${moralLabel(morale)}</strong></div>
          <div class="hub-stat">Rep <strong class="rep-label">${repLabel(gameState.managerReputation || 50)}</strong></div>
        </div>
        <span id="save-indicator" class="hub-stat muted" style="font-size:12px;cursor:pointer" onclick="manualSave()" title="Click to save">💾</span>
      </div>

      ${notification ? `<div class="notification">${notification}</div>` : ''}
      ${newInjuries.map(p => `<div class="notification notification-injury">🤕 <strong>${p.name}</strong> (${p.pos}) injured — out for <strong>${p.weeks}w</strong></div>`).join('')}
      ${unhappyNotifs.map(p => `<div class="notification notification-unhappy">😤 <strong>${p.name}</strong> (${p.pos} · ${p.ovr}) wants more playing time</div>`).join('')}

      <div class="hub-body">
        <div class="hub-left">
          ${renderAIBidsCard(gameState)}
          <div class="hub-card hub-position">
            <div class="pos-number">${pos}${ordinal(pos)}</div>
            <div class="pos-label">in the ${LEAGUES[leagueId].name}</div>
            <div class="pos-record">${row.played||0} PL · ${row.won||0}W ${row.drawn||0}D ${row.lost||0}L · ${row.gf||0}:${row.ga||0} · <strong>${row.points||0} pts</strong></div>
          </div>

          ${renderFaCupPendingCard(gameState)}
          ${renderCLPendingCard(gameState)}
          ${renderELPlayoffPendingCard(gameState)}

          <div class="hub-card hub-next">
            <h4>NEXT MATCH — Week ${week}</h4>
            ${nextFixture ? `
              <div class="next-fixture">
                <span class="nf-team ${nextFixture.home === gameState.playerTeam ? 'active' : ''}">${getTeam(nextFixture.home).name}</span>
                <span class="nf-vs">vs</span>
                <span class="nf-team ${nextFixture.away === gameState.playerTeam ? 'active' : ''}">${getTeam(nextFixture.away).name}</span>
              </div>
              <div class="nf-venue">${nextFixture.home === gameState.playerTeam ? '🏟 Home' : '✈️ Away'}</div>
              <button class="btn btn-primary" onclick="goToMatchFlow(false)">SET TACTICS & PLAY</button>
              <button class="btn btn-secondary" style="margin-top:8px;width:100%;font-size:13px" onclick="simulateNextGames(5)">⚡ Simulate Next 5</button>
              ${getRemainingMatchCount(gameState) > 1 ? `
                <button class="btn btn-secondary" style="margin-top:8px;width:100%;font-size:12px" onclick="confirmSimToLast()">⏩ Sim to Last Matchweek</button>
              ` : ''}
            ` : `<p class="muted">No more matches this season.</p>`}
          </div>

          ${nextFixture ? renderMatchupCard(nextFixture, gameState) : ''}

        </div>

        <div class="hub-right">
          <div class="hub-card">
            <h4>MINI TABLE</h4>
            ${renderMiniTable(table, gameState.playerTeam)}
          </div>
          <div class="hub-card" style="margin-top:12px">
            <h4>RECENT RESULTS</h4>
            ${renderRecentResults()}
          </div>
        </div>
      </div>

      <nav class="hub-nav">
        <button onclick="showScreen('squad')">👥 Squad</button>
        <button onclick="showScreen('tactics')">📋 Tactics</button>
        <button onclick="showScreen('table')">📊 Table</button>
        <button onclick="showScreen('fixtures')">📅 Fixtures</button>
        <button onclick="showScreen('transfers')">💰 Transfers</button>
        <button onclick="showScreen('stats')">🏆 Stats</button>
        <button onclick="showScreen('career')">📖 Career</button>
        ${gameState.seasonEnded ? `<button onclick="showScreen('end-season')" class="btn-alert">🏁 Season End</button>` : ''}
        <button onclick="manualSave()" class="hub-nav-save" title="Save game">💾 Save</button>
        <button onclick="goToMainMenu()" class="hub-nav-menu" title="Main menu">🏠 Menu</button>
      </nav>
    </div>
  `;
}

function renderRecentResults() {
  const recent = getRecentResults(gameState.playerTeam, gameState, 5);
  if (!recent.length) return '<p class="muted">No results yet.</p>';
  return recent.map(r => {
    const isHome = r.homeTeam === gameState.playerTeam;
    const myGoals = isHome ? r.homeGoals : r.awayGoals;
    const oppGoals = isHome ? r.awayGoals : r.homeGoals;
    const opp = getTeam(isHome ? r.awayTeam : r.homeTeam);
    const outcome = myGoals > oppGoals ? 'W' : myGoals === oppGoals ? 'D' : 'L';
    return `
      <div class="result-row">
        <span class="result-badge result-${outcome}">${outcome}</span>
        <span>${isHome?'vs':'@'} ${opp.name}</span>
        <span class="result-score">${myGoals} - ${oppGoals}</span>
      </div>
    `;
  }).join('');
}

function renderMiniTable(table, playerTeamId) {
  const pos = table.findIndex(r => r.id === playerTeamId);
  const start = Math.max(0, Math.min(pos - 2, table.length - 7));
  const slice = table.slice(start, start + 7);

  return `
    <table class="mini-table">
      <tr><th>#</th><th>Team</th><th>P</th><th>Pts</th><th>GD</th></tr>
      ${slice.map((r, i) => `
        <tr class="${r.id === playerTeamId ? 'my-team' : ''}">
          <td>${start + i + 1}</td>
          <td>${getTeam(r.id).name}</td>
          <td>${r.played}</td>
          <td><strong>${r.points}</strong></td>
          <td>${r.gd > 0 ? '+' : ''}${r.gd}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

// ─── SQUAD ───────────────────────────────────────────────────────────────────
function renderSquad(app) {
  const team = getTeam(gameState.playerTeam);
  const squad = [...team.squad].sort((a, b) => {
    const order = ['GK','CB','RB','LB','CDM','CM','CAM','RW','LW','RM','LM','ST','CF'];
    return order.indexOf(a.pos) - order.indexOf(b.pos) || b.overall - a.overall;
  });

  app.innerHTML = `
    <div class="squad-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>SQUAD — ${team.name}</h2>
        <span class="muted">${team.squad.length} players</span>
      </div>
      <table class="squad-table">
        <tr>
          <th>POS</th><th>Name</th><th>Age</th><th>Nat</th>
          <th title="Overall">OVR</th><th title="Potential">POT</th><th title="Pace">PAC</th><th title="Shooting">SHO</th>
          <th title="Passing">PAS</th><th title="Defending">DEF</th><th title="Physical">PHY</th>
          <th title="Dribbling">DRI</th><th>Goals</th><th>Assists</th><th>Value</th>
          <th></th>
        </tr>
        ${squad.map(p => `
          <tr class="${p.injuredWeeks ? 'player-injured' : p.onLoan ? 'player-loaned' : ''}" onclick="showPlayerModal(${p.id})" style="cursor:pointer">
            <td><span class="pos-badge pos-${p.pos}">${p.pos}</span></td>
            <td class="p-name">
              ${p.name}
              ${p.injuredWeeks ? `<span class="injury-badge">🤕 ${p.injuredWeeks}w</span>` : ''}
              ${p.onLoan ? `<span class="loan-badge">LOAN</span>` : ''}
              ${p.fromAcademy ? `<span class="academy-badge">🌱</span>` : ''}
              ${!p.injuredWeeks && p.overall >= 74 && (p.matchesWithoutPlay || 0) >= 5 ? `<span class="unhappy-badge">😤</span>` : ''}
            </td>
            <td>${p.age}</td>
            <td>${p.nation}</td>
            <td class="ovr-cell ovr-${ovrClass(p.overall)}">${p.overall}</td>
            <td class="muted" style="font-size:12px">${p.potential || '?'}</td>
            <td>${p.pace}</td><td>${p.shooting}</td><td>${p.passing}</td>
            <td>${p.defending}</td><td>${p.physical}</td><td>${p.dribbling}</td>
            <td>${p.goals}</td><td>${p.assists}</td>
            <td class="muted">${formatMoney(calculateTransferValue(p))}</td>
            <td><button class="btn-sm btn-danger" onclick="event.stopPropagation();sellConfirm(${p.id})">Sell</button></td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

function sellConfirm(playerId) {
  const team = getTeam(gameState.playerTeam);
  const player = team.squad.find(p => p.id === playerId);
  if (!player) return;
  const val = formatMoney(calculateTransferValue(player));
  showModal({
    title: 'Sell Player',
    body: `
      <div class="modal-player">
        <span class="pos-badge pos-${player.pos}">${player.pos}</span>
        <strong>${player.name}</strong>
        <span class="ovr-cell ovr-${ovrClass(player.overall)}">${player.overall}</span>
      </div>
      <p>Transfer fee: <strong class="green">${val}</strong></p>
      <p class="muted" style="font-size:12px;margin-top:6px">This player will leave your squad permanently.</p>
    `,
    confirm: 'Sell',
    danger: true,
    onConfirm: () => {
      const result = sellPlayer(gameState, playerId);
      saveGame();
      showToast(result.message, result.success ? 'success' : 'error');
      showScreen('squad');
    }
  });
}

// ─── TACTICS ─────────────────────────────────────────────────────────────────
function renderTactics(app) {
  const tactics = getManagerTactics(gameState);
  const team = getTeam(gameState.playerTeam);
  const lineup = getBestEleven(gameState.playerTeam, tactics.formation);

  function btnGroup(key, options, labels) {
    return `<div class="btn-group">
      ${options.map((val, i) => `
        <button class="tactic-btn ${tactics[key]===val?'active':''}" onclick="applyTactic('${key}','${val}',this)">${labels[i]}</button>
      `).join('')}
    </div>`;
  }

  const squadOptions = `<option value="">— None —</option>` +
    [...team.squad].sort((a,b) => b.overall - a.overall)
      .map(p => `<option value="${p.id}" ${tactics.captain===p.id||tactics.penaltyTaker===p.id||tactics.freeKickTaker===p.id||tactics.cornerTaker===p.id?'':''}>${p.name} (${p.pos} · ${p.overall})</option>`)
      .join('');

  function spSelect(key, label) {
    const val = tactics[key];
    return `
      <div class="sp-item">
        <div class="tactic-label">${label}</div>
        <select class="sp-select" onchange="applySetPiece('${key}', this.value)">
          <option value="">— None —</option>
          ${[...team.squad].sort((a,b) => b.overall - a.overall).map(p =>
            `<option value="${p.id}" ${val===p.id?'selected':''}>${p.name} (${p.pos} · ${p.overall})</option>`
          ).join('')}
        </select>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="tactics-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>TACTICS — ${team.name}</h2>
        <div class="control-group" style="margin-left:auto; flex-direction:row; align-items:center; gap:10px;">
          <label style="font-size:11px;color:var(--muted);letter-spacing:1px;">FORMATION</label>
          <select onchange="updateFormation(this.value)" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-family:inherit;font-size:13px;">
            ${Object.keys(FORMATION_DISPLAY).map(f => `<option ${f===tactics.formation?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="tactics-body">
        <div class="pitch-container">
          <div class="pitch">
            ${renderPitchLineup(lineup, tactics.formation)}
          </div>
          ${renderTeamAnalytics(gameState)}
        </div>
        <div class="tactics-right">

          <div class="tactic-section-title">STYLE</div>

          <div class="tactic-group">
            <div class="tactic-label">Mentality</div>
            ${btnGroup('mentality', ['attacking','balanced','defensive'], ['⚔️ Attacking','⚖️ Balanced','🛡️ Defensive'])}
            <div class="tactic-effect">Attacking: +15% atk, −13% def &nbsp;|&nbsp; Defensive: +15% def, −13% atk</div>
          </div>

          <div class="tactic-section-title">DEFENSE</div>

          <div class="tactic-group">
            <div class="tactic-label">Defensive Line</div>
            ${btnGroup('defensiveLine', ['high','medium','low'], ['High','Medium','Low'])}
            <div class="tactic-effect">High: +8% def &nbsp;|&nbsp; Low: −6% def</div>
          </div>

          <div class="tactic-group">
            <div class="tactic-label">Pressing</div>
            ${btnGroup('pressing', ['high','medium','low'], ['High','Medium','Low'])}
            <div class="tactic-effect">High: +6% atk, +4% def &nbsp;|&nbsp; Low: −4% both</div>
          </div>

          <div class="tactic-section-title">ATTACK</div>

          <div class="tactic-group">
            <div class="tactic-label">Width</div>
            ${btnGroup('width', ['wide','normal','narrow'], ['Wide','Normal','Narrow'])}
            <div class="tactic-effect">Wide: +6% atk if wingers ≥76 &nbsp;|&nbsp; Narrow: +4% def</div>
          </div>

          <div class="tactic-group">
            <div class="tactic-label">Passing Style</div>
            ${btnGroup('passingStyle', ['direct','mixed','short'], ['Direct','Mixed','Short'])}
            <div class="tactic-effect">Direct: +4% atk, more goals scored &nbsp;|&nbsp; Short: −3% atk</div>
          </div>

          <div class="tactic-group">
            <div class="tactic-label">Tempo</div>
            ${btnGroup('tempo', ['fast','normal','slow'], ['Fast','Normal','Slow'])}
            <div class="tactic-effect">Fast: +5% atk, more goals in game &nbsp;|&nbsp; Slow: −4% atk</div>
          </div>

          <div class="tactic-section-title">SET PIECES</div>

          <div class="set-pieces-grid">
            ${spSelect('captain', '🪖 Captain')}
            ${spSelect('penaltyTaker', '⚽ Penalty Taker')}
            ${spSelect('freeKickTaker', '🎯 Free Kick Taker')}
            ${spSelect('cornerTaker', '🚩 Corner Taker')}
          </div>

        </div>
      </div>
    </div>
  `;
}

function renderPitchLineup(lineup, formation) {
  const rows = FORMATION_DISPLAY[formation] || FORMATION_DISPLAY['4-4-2'];
  let idx = 0;
  return rows.map(row => {
    const rowPlayers = lineup.slice(idx, idx + row.length);
    idx += row.length;
    return `
      <div class="pitch-row">
        ${rowPlayers.map(p => p ? `
          <div class="pitch-player">
            <div class="pp-badge pos-${p.pos}">${p.slot}</div>
            <div class="pp-name">${p.name.split(' ').pop()}</div>
            <div class="pp-ovr">${p.overall}</div>
          </div>
        ` : '').join('')}
      </div>
    `;
  }).join('');
}

function applyTactic(key, value, btn) {
  setTactics(gameState, { [key]: value });
  saveGame();
  // Update active button in its group without re-render
  btn.closest('.btn-group').querySelectorAll('.tactic-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function applySetPiece(key, value) {
  setTactics(gameState, { [key]: value === '' ? null : +value });
  saveGame();
}

function updateFormation(f) {
  setTactics(gameState, { formation: f });
  saveGame();
  showScreen('tactics');
}

function updateTactic(key, val) {
  setTactics(gameState, { [key]: val });
  saveGame();
}

// ─── MATCH PREVIEW ───────────────────────────────────────────────────────────
function renderMatchPreview(app) {
  let fixture = null;
  let competitionLabel = '';

  if (gameState.faCupMatchActive && gameState.faCup?.playerMatchPending) {
    const cup = gameState.faCup;
    const round = cup.rounds[cup.currentRound];
    const pair = round?.pairs?.find(p => p[0] === gameState.playerTeam || p[1] === gameState.playerTeam);
    if (pair) { fixture = { home: pair[0], away: pair[1] }; competitionLabel = `🏆 ${gameState.faCup?.name || 'Cup'} — ${round.name}`; }
  } else if (gameState.europaMatchActive && gameState.europaLeague?.playerMatchPending) {
    const el = gameState.europaLeague;
    if (el.phase === 'el_playoff') {
      const pair = el.playoffPairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pair) { fixture = { home: pair[0], away: pair[1] }; competitionLabel = '🌟 Europa League — Playoff'; }
    } else if (el.phase === 'group') {
      const g = el.playerGroup;
      const pf = el.groupFixtures?.[g]?.[el.groupRound]?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pf) { fixture = { home: pf[0], away: pf[1] }; competitionLabel = `🌟 Europa League — Group ${g === 0 ? 'A' : 'B'}`; }
    } else {
      const pairs = el.phase === 'knockout_sf' ? el.knockout?.sf : [el.knockout?.final];
      const pair = pairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pair) { fixture = { home: pair[0], away: pair[1] }; competitionLabel = `🌟 Europa League — ${el.phase === 'knockout_sf' ? 'SF' : 'Final'}`; }
    }
  } else if (gameState.clMatchActive && gameState.championsLeague?.playerMatchPending) {
    const cl = gameState.championsLeague;
    if (cl.phase === 'group') {
      const g = cl.playerGroup;
      const pf = cl.groupFixtures?.[g]?.[cl.groupRound]?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pf) { fixture = { home: pf[0], away: pf[1] }; competitionLabel = `🏆 Champions League — Group ${['A','B','C','D'][g]}`; }
    } else {
      const pairs = cl.phase === 'knockout_qf' ? cl.knockout?.qf : cl.phase === 'knockout_sf' ? cl.knockout?.sf : [cl.knockout?.final];
      const pair = pairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pair) { fixture = { home: pair[0], away: pair[1] }; competitionLabel = `🏆 Champions League — ${cl.phase === 'knockout_qf' ? 'QF' : cl.phase === 'knockout_sf' ? 'SF' : 'Final'}`; }
    }
  } else {
    fixture = getPlayerFixture(gameState);
    competitionLabel = LEAGUES[gameState.playerLeague]?.name || '';
  }

  if (!fixture) { showScreen('hub'); return; }

  const isHome = fixture.home === gameState.playerTeam;
  const myTeam = getTeam(gameState.playerTeam);
  const oppTeam = getTeam(isHome ? fixture.away : fixture.home);
  const tactics = getManagerTactics(gameState);
  const oppOvr = Math.round(oppTeam.squad.reduce((s,p)=>s+p.overall,0)/oppTeam.squad.length);
  const myOvr  = Math.round(myTeam.squad.slice().sort((a,b)=>b.overall-a.overall).slice(0,11).reduce((s,p)=>s+p.overall,0)/11);

  app.innerHTML = `
    <div class="match-preview">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>MATCH PREVIEW</h2>
        ${competitionLabel ? `<span class="muted" style="font-size:12px">${competitionLabel}</span>` : ''}
      </div>
      <div class="preview-matchup">
        <div class="preview-team ${isHome?'active':''}">
          <div class="pt-name">${myTeam.name}</div>
          <div class="pt-tag">${isHome?'HOME':'AWAY'}</div>
          <div class="pt-ovr">Avg OVR: <strong>${myOvr}</strong></div>
        </div>
        <div class="preview-vs">VS</div>
        <div class="preview-team ${!isHome?'active':''}">
          <div class="pt-name">${oppTeam.name}</div>
          <div class="pt-tag">${!isHome?'HOME':'AWAY'}</div>
          <div class="pt-ovr">Avg OVR: <strong>${oppOvr}</strong></div>
        </div>
      </div>

      <div class="preview-tactics">
        <h4>YOUR TACTICS</h4>
        <div class="tactics-summary">
          <span>Formation: <strong>${tactics.formation}</strong></span>
          <span>Mentality: <strong>${tactics.mentality}</strong></span>
          <span>Pressing: <strong>${tactics.pressing}</strong></span>
        </div>
        <div class="preview-actions">
          <button class="btn btn-secondary" onclick="showScreen('tactics')">Edit Tactics</button>
          <button class="btn btn-secondary" onclick="showScoutReport('${isHome ? fixture.away : fixture.home}')">🔍 Scout</button>
          <button class="btn btn-primary btn-xl" onclick="playMatch()">🏆 KICK OFF!</button>
        </div>
      </div>
    </div>
  `;
}

function playMatch() {
  const tactics = getManagerTactics(gameState);
  const data = simulatePlayerMatch(gameState, tactics);
  if (!data) { showScreen('hub'); return; }
  saveGame();
  showScreen('match-result', data);
}

// ─── MATCH RESULT ────────────────────────────────────────────────────────────
function renderMatchResult(app, data) {
  const { fixture, result, isHome, matchResult } = data;
  const myTeam = getTeam(gameState.playerTeam);
  const oppTeam = getTeam(isHome ? fixture.away : fixture.home);
  const myGoals = isHome ? result.homeGoals : result.awayGoals;
  const oppGoals = isHome ? result.awayGoals : result.homeGoals;

  const outcomeClass = matchResult === 'win' ? 'win' : matchResult === 'draw' ? 'draw' : 'loss';
  const outcomeText = matchResult === 'win' ? '🏆 VICTORY!' : matchResult === 'draw' ? '🤝 DRAW' : '😞 DEFEAT';

  app.innerHTML = `
    <div class="match-result">
      <div class="result-header ${outcomeClass}">
        <div class="result-outcome">${outcomeText}</div>
        <div class="result-scoreline">
          <span>${myTeam.name}</span>
          <span class="result-score-big">${myGoals} – ${oppGoals}</span>
          <span>${oppTeam.name}</span>
        </div>
        <div class="result-venue">
          ${data.isFaCup ? `🏆 ${gameState.faCup?.name || 'Cup'} — ${data.roundName}` : data.isCL ? `🏆 Champions League — ${data.phase}` : data.isEuropa ? `🌟 Europa League — ${data.phase}` : (isHome ? '🏟 Home' : '✈️ Away')}
          ${result.attendance ? ` · ${result.attendance.toLocaleString()} fans` : ''}
          ${data.extraTime ? ' · AET' : ''}
        </div>
      </div>

      ${result.shots ? `
      <div class="match-stats-bar">
        <div class="ms-row">
          <span class="ms-val">${result.possession.home}%</span>
          <div class="ms-track"><div class="ms-fill" style="width:${result.possession.home}%"></div></div>
          <span class="ms-label">Possession</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" style="width:${result.possession.away}%"></div></div>
          <span class="ms-val">${result.possession.away}%</span>
        </div>
        <div class="ms-row">
          <span class="ms-val">${result.shots.home}</span>
          <div class="ms-track"><div class="ms-fill" style="width:${Math.round(result.shots.home/(result.shots.home+result.shots.away||1)*100)}%"></div></div>
          <span class="ms-label">Shots</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" style="width:${Math.round(result.shots.away/(result.shots.home+result.shots.away||1)*100)}%"></div></div>
          <span class="ms-val">${result.shots.away}</span>
        </div>
        <div class="ms-row">
          <span class="ms-val">${result.xG.home}</span>
          <div class="ms-track"><div class="ms-fill" style="width:${Math.round(result.xG.home/(result.xG.home+result.xG.away||1)*100)}%"></div></div>
          <span class="ms-label">xG</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" style="width:${Math.round(result.xG.away/(result.xG.home+result.xG.away||1)*100)}%"></div></div>
          <span class="ms-val">${result.xG.away}</span>
        </div>
        ${result.bigChances ? `
        <div class="ms-row">
          <span class="ms-val" style="color:#f59e0b">${result.bigChances.home}</span>
          <div class="ms-track"><div class="ms-fill" style="width:${Math.round(result.bigChances.home/(result.bigChances.home+result.bigChances.away||1)*100)}%;background:#f59e0b"></div></div>
          <span class="ms-label">Big Chances</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" style="width:${Math.round(result.bigChances.away/(result.bigChances.home+result.bigChances.away||1)*100)}%;background:#f59e0b"></div></div>
          <span class="ms-val" style="color:#f59e0b">${result.bigChances.away}</span>
        </div>` : ''}
      </div>` : ''}

      <div class="match-events">
        <h3>MATCH EVENTS</h3>
        ${result.events.length === 0 ? '<p class="muted">No notable events.</p>' : ''}
        ${result.events.map(ev => {
          const isMine = ev.team === (isHome ? 'home' : 'away');
          const teamName = ev.team === 'home' ? getTeam(fixture.home).name : getTeam(fixture.away).name;
          const goalTypeLabel = { penalty:'Penalty', free_kick:'Free Kick', header:'Header', long_shot:'Long Shot', tap_in:'Tap In', one_on_one:'1v1', volley:'Volley', finish:'Finish' }[ev.goalType] || '';
          if (ev.type === 'penalty_miss') return `
            <div class="event-row event-penalty_miss event-${isMine ? 'mine' : 'opp'}">
              <span class="event-min">${ev.min}'</span>
              <span class="event-icon">❌</span>
              <div class="event-goal-info">
                <span class="event-player">${ev.player}</span>
                <div class="event-goal-meta"><span class="event-goal-type">Penalty Missed</span></div>
              </div>
              <span class="event-team">${teamName}</span>
            </div>`;
          return `
            <div class="event-row event-${ev.type} event-${isMine ? 'mine' : 'opp'}">
              <span class="event-min">${ev.min}'</span>
              <span class="event-icon">${ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : '🟥'}</span>
              <div class="event-goal-info">
                <span class="event-player">${ev.player}</span>
                ${ev.type === 'goal' ? `<div class="event-goal-meta">${ev.assist ? `<span class="event-assist">↪ ${ev.assist}</span>` : ''}${goalTypeLabel ? `<span class="event-goal-type">${goalTypeLabel}</span>` : ''}</div>` : ''}
              </div>
              <span class="event-team">${teamName}</span>
            </div>`;
        }).join('')}
      </div>

      <div class="result-actions">
        ${data.isFaCup
          ? `<button class="btn btn-primary" onclick="resolveFaCupAndRefresh(${data.matchResult === 'win'})">Continue</button>`
          : data.isCL
            ? `<button class="btn btn-primary" onclick="resolveCLAndRefresh(${data.matchResult === 'win'})">Continue</button>`
            : data.isEuropa
              ? `<button class="btn btn-primary" onclick="resolveEuropaAndRefresh(${data.matchResult === 'win'})">Continue</button>`
              : `
              <button class="btn btn-secondary" onclick="showScreen('match-replay')">▶ Watch Replay</button>
              <button class="btn btn-primary" onclick="goToPostMatchPress('${data.matchResult}')">Post-Match Reaction →</button>
            `
        }
      </div>
    </div>
  `;
}

// ─── TABLE ───────────────────────────────────────────────────────────────────
function renderTable(app) {
  const leagueId = gameState.playerLeague;
  const table = getLeagueTable(leagueId, gameState);
  const cc = COUNTRY_CONFIG[gameState.playerCountry || 'england'];
  const div2Id = cc?.div2 || null;
  const champTable = div2Id ? getLeagueTable(div2Id, gameState) : null;
  const div2Name = div2Id ? (LEAGUES[div2Id]?.name || 'Division 2') : null;

  app.innerHTML = `
    <div class="table-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>${LEAGUES[leagueId].name} TABLE</h2>
      </div>
      ${renderFullTable(table, leagueId, gameState.playerTeam)}
      ${champTable ? `
        <h3 style="margin-top:2rem">${div2Name} Table</h3>
        ${renderFullTable(champTable, div2Id, gameState.playerTeam)}
      ` : ''}
    </div>
  `;
}

function renderFullTable(table, leagueId, playerTeamId) {
  const leagueCfg = LEAGUES[leagueId] || {};
  const relegZone = leagueCfg.relegationSpots ?? 3;
  const promoAuto = leagueCfg.promotionSpots ?? 0;
  const promoPlayoff = leagueCfg.promotionPlayoff ?? 0;

  return `
    <table class="league-table">
      <tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
      ${table.map((r, i) => {
        const zone = i < promoAuto ? 'zone-promo' : i < promoAuto + promoPlayoff ? 'zone-playoff' :
          i >= table.length - relegZone ? 'zone-relegate' : '';
        return `
          <tr class="${zone} ${r.id === playerTeamId ? 'my-team' : ''}">
            <td>${i+1}</td>
            <td>${getTeam(r.id).name}</td>
            <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
            <td>${r.gf}</td><td>${r.ga}</td>
            <td>${r.gd > 0 ? '+' : ''}${r.gd}</td>
            <td><strong>${r.points}</strong></td>
          </tr>
        `;
      }).join('')}
    </table>
    <div class="table-legend">
      ${leagueId === 'championship' ? '<span class="legend-promo">Auto Promotion</span> <span class="legend-playoff">Playoff</span>' : ''}
      <span class="legend-relegate">Relegation</span>
    </div>
  `;
}

// ─── FIXTURES ────────────────────────────────────────────────────────────────
function renderFixtures(app) {
  const leagueId = gameState.playerLeague;
  const fixtures = gameState.fixtures[leagueId];
  const playerTeam = gameState.playerTeam;
  const cup = gameState.faCup;

  const myFixtures = fixtures.filter(f => f.home === playerTeam || f.away === playerTeam);

  // Build domestic cup fixtures for this player
  let cupFixturesHtml = '';
  if (cup && !cup.playerEliminated) {
    const cupRows = [];
    for (let ri = 0; ri < cup.rounds.length; ri++) {
      const round = cup.rounds[ri];
      const pair = round.pairs?.find(p => p[0] === playerTeam || p[1] === playerTeam);
      if (!pair) continue;
      const isHome = pair[0] === playerTeam;
      const oppId = isHome ? pair[1] : pair[0];
      const opp = getTeam(oppId);
      const result = round.results?.find(r => r.playerMatch);
      let resultStr = '';
      if (result) {
        const won = result.winner === playerTeam;
        resultStr = `<span class="result-badge result-${won ? 'W' : 'L'}">${won ? 'W (Adv.)' : 'L (Elim.)'}</span>`;
      } else if (round === cup.rounds[cup.currentRound] && cup.playerMatchPending) {
        resultStr = '<span class="pulse">▶ NOW</span>';
      }
      cupRows.push(`
        <div class="fixture-row ${result ? 'played' : ''}" style="border-left:3px solid #b45309;padding-left:10px">
          <span class="fw-num" style="color:#fbbf24">${round.name}</span>
          <span class="fw-venue">${isHome ? 'H' : 'A'}</span>
          <span class="fw-opp">${opp?.name || oppId}</span>
          <span class="fw-result">${resultStr}</span>
        </div>
      `);
    }
    if (cupRows.length) {
      cupFixturesHtml = `
        <h3 style="padding:12px 0 6px;color:#fbbf24;font-size:13px;letter-spacing:1px">🏆 ${(cup.name || 'CUP').toUpperCase()}</h3>
        ${cupRows.join('')}
        <h3 style="padding:12px 0 6px;color:var(--muted);font-size:13px;letter-spacing:1px">LEAGUE FIXTURES</h3>
      `;
    }
  }

  app.innerHTML = `
    <div class="fixtures-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>FIXTURES — ${getTeam(playerTeam).name}</h2>
      </div>
      <div class="fixtures-list">
        ${cupFixturesHtml}
        ${myFixtures.map((f, i) => {
          const isHome = f.home === playerTeam;
          const opp = getTeam(isHome ? f.away : f.home);
          const isCurrent = f.round === gameState.currentRound[leagueId] && !f.played;
          let resultStr = '';
          if (f.played && f.result) {
            const myG = isHome ? f.result.homeGoals : f.result.awayGoals;
            const oppG = isHome ? f.result.awayGoals : f.result.homeGoals;
            const out = myG > oppG ? 'W' : myG === oppG ? 'D' : 'L';
            resultStr = `<span class="result-badge result-${out}">${out} ${myG}-${oppG}</span>`;
          }
          return `
            <div class="fixture-row ${isCurrent ? 'current-fixture' : ''} ${f.played ? 'played' : ''}">
              <span class="fw-num">GW${f.round+1}</span>
              <span class="fw-venue">${isHome ? 'H' : 'A'}</span>
              <span class="fw-opp">${opp.name}</span>
              <span class="fw-result">${resultStr || (isCurrent ? '<span class="pulse">▶ NOW</span>' : '')}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── TRANSFERS ───────────────────────────────────────────────────────────────
function renderTransfers(app) {
  const budget = gameState.budgets[gameState.playerTeam];
  const windowOpen = gameState.transferWindowOpen;

  app.innerHTML = `
    <div class="transfers-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>TRANSFER MARKET</h2>
        <span class="${windowOpen ? 'window-open' : 'window-closed'}">${windowOpen ? '🟢 Window Open' : '🔴 Window Closed'}</span>
      </div>
      <div class="budget-bar">
        Available Budget: <strong>${formatMoney(budget)}</strong>
        · Squad: <strong>${getTeam(gameState.playerTeam).squad.length}/25</strong>
      </div>
      <div class="transfer-tabs">
        <button class="transfer-tab-btn ${transferTab==='market'?'active':''}" onclick="transferTab='market';showScreen('transfers')">Transfers</button>
        <button class="transfer-tab-btn ${transferTab==='free'?'active':''}" onclick="transferTab='free';showScreen('transfers')">Free Agents</button>
        <button class="transfer-tab-btn ${transferTab==='loans'?'active':''}" onclick="transferTab='loans';showScreen('transfers')">Loans</button>
      </div>
      ${transferTab === 'market' ? renderTransferMarketTab(windowOpen) : transferTab === 'free' ? renderFreeAgentsTab(windowOpen) : renderLoansTab(windowOpen)}
    </div>
  `;
}

function renderTransferMarketTab(windowOpen) {
  const players = searchTransferMarket(gameState, {
    position: transferFilters.position || undefined,
    maxValue: transferFilters.maxValue || undefined,
    minOverall: transferFilters.minOverall || 60
  });
  return `
    <div class="transfer-filters">
      <select onchange="transferFilters.position=this.value;showScreen('transfers')">
        <option value="">All Positions</option>
        ${['GK','CB','RB','LB','CDM','CM','CAM','RW','LW','ST'].map(p=>`<option ${transferFilters.position===p?'selected':''}>${p}</option>`).join('')}
      </select>
      <select onchange="transferFilters.minOverall=+this.value;showScreen('transfers')">
        ${[55,60,65,70,75,80].map(v=>`<option ${transferFilters.minOverall===v?'selected':''} value="${v}">${v}+ OVR</option>`).join('')}
      </select>
      <select onchange="transferFilters.maxValue=this.value?+this.value:null;showScreen('transfers')">
        <option value="">Any Price</option>
        ${[500000,1000000,2000000,5000000,10000000,25000000,50000000].map(v=>`<option ${transferFilters.maxValue===v?'selected':''} value="${v}">${formatMoney(v)} max</option>`).join('')}
      </select>
    </div>
    <table class="squad-table">
      <tr><th>POS</th><th>Name</th><th>Club</th><th>Age</th><th>OVR</th><th>PAC</th><th>SHO</th><th>PAS</th><th>DEF</th><th>PHY</th><th>Value</th><th></th></tr>
      ${players.map(p => `
        <tr onclick="showPlayerModal(${p.id})" style="cursor:pointer">
          <td><span class="pos-badge pos-${p.pos}">${p.pos}</span></td>
          <td>${p.name}</td>
          <td class="muted">${p.teamName}</td>
          <td>${p.age}</td>
          <td class="ovr-cell ovr-${ovrClass(p.overall)}">${p.overall}</td>
          <td>${p.pace}</td><td>${p.shooting}</td><td>${p.passing}</td><td>${p.defending}</td><td>${p.physical}</td>
          <td>${p.teamId ? formatMoney(p.value) : 'Free'}</td>
          <td><button class="btn-sm ${windowOpen?'btn-primary':'btn-disabled'}"
            ${windowOpen?`onclick="event.stopPropagation();buyConfirm(${p.id},'${p.teamId||''}')"`:''}>Sign</button></td>
        </tr>
      `).join('')}
    </table>
  `;
}

function renderLoansTab(windowOpen) {
  const loanable = getLoanablePlayers(gameState);
  if (!loanable.length) return `<p class="muted" style="padding:24px">No players available for loan.</p>`;
  return `
    <div style="padding:10px 0 6px;color:var(--muted);font-size:12px">
      Loan players join for the season and return automatically. Fee is ~15% of transfer value.
      ${!windowOpen ? '<br><strong style="color:var(--danger)">Transfer window is closed.</strong>' : ''}
    </div>
    <table class="squad-table">
      <tr><th>POS</th><th>Name</th><th>Club</th><th>Age</th><th>OVR</th><th>PAC</th><th>SHO</th><th>PAS</th><th>DEF</th><th>PHY</th><th>Loan Fee</th><th></th></tr>
      ${loanable.map(p => `
        <tr onclick="showPlayerModal(${p.id})" style="cursor:pointer">
          <td><span class="pos-badge pos-${p.pos}">${p.pos}</span></td>
          <td>${p.name}</td>
          <td class="muted">${p.teamName}</td>
          <td>${p.age}</td>
          <td class="ovr-cell ovr-${ovrClass(p.overall)}">${p.overall}</td>
          <td>${p.pace}</td><td>${p.shooting}</td><td>${p.passing}</td><td>${p.defending}</td><td>${p.physical}</td>
          <td>${formatMoney(Math.round(calculateTransferValue(p) * 0.15))}</td>
          <td><button class="btn-sm ${windowOpen?'btn-primary':'btn-disabled'}"
            ${windowOpen?`onclick="event.stopPropagation();loanConfirm(${p.id},'${p.teamId}')"`:''}>${windowOpen ? 'Loan' : 'Closed'}</button></td>
        </tr>
      `).join('')}
    </table>
  `;
}

function renderFreeAgentsTab(windowOpen) {
  const posFilter = transferFilters.position || '';
  const ovrFilter = transferFilters.minOverall || 55;
  const agents = getFreeAgents({ position: posFilter || undefined, minOverall: ovrFilter });
  return `
    <div style="padding:10px 0 6px;color:var(--muted);font-size:12px">
      Free agents cost nothing to sign — just wages. Available any time the window is open.
      ${!windowOpen ? '<br><strong style="color:var(--danger)">Transfer window is closed.</strong>' : ''}
    </div>
    <div class="transfer-filters">
      <select onchange="transferFilters.position=this.value;showScreen('transfers')">
        <option value="">All Positions</option>
        ${['GK','CB','RB','LB','CDM','CM','CAM','RW','LW','ST'].map(p=>`<option ${posFilter===p?'selected':''}>${p}</option>`).join('')}
      </select>
      <select onchange="transferFilters.minOverall=+this.value;showScreen('transfers')">
        ${[55,60,65,70,75].map(v=>`<option ${ovrFilter===v?'selected':''} value="${v}">${v}+ OVR</option>`).join('')}
      </select>
    </div>
    <table class="squad-table">
      <tr><th>POS</th><th>Name</th><th>Nat</th><th>Age</th><th>OVR</th><th>PAC</th><th>SHO</th><th>PAS</th><th>DEF</th><th>PHY</th><th></th></tr>
      ${agents.map(p => `
        <tr onclick="showPlayerModal(${p.id})" style="cursor:pointer">
          <td><span class="pos-badge pos-${p.pos}">${p.pos}</span></td>
          <td>${p.name}</td>
          <td class="muted">${p.nation || '—'}</td>
          <td>${p.age}</td>
          <td class="ovr-cell ovr-${ovrClass(p.overall)}">${p.overall}</td>
          <td>${p.pace}</td><td>${p.shooting}</td><td>${p.passing}</td><td>${p.defending}</td><td>${p.physical}</td>
          <td><button class="btn-sm ${windowOpen?'btn-primary':'btn-disabled'}"
            ${windowOpen?`onclick="event.stopPropagation();buyConfirm(${p.id},'')"`:''}>Sign</button></td>
        </tr>
      `).join('')}
    </table>
  `;
}

function loanConfirm(playerId, fromTeamId) {
  const allPlayers = getAllTeams().flatMap(t => t.squad);
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return;
  const fee = Math.round(calculateTransferValue(player) * 0.15);
  showModal({
    title: 'Sign on Loan',
    body: `
      <div class="modal-player">
        <span class="pos-badge pos-${player.pos}">${player.pos}</span>
        <strong>${player.name}</strong>
        <span class="ovr-cell ovr-${ovrClass(player.overall)}">${player.overall}</span>
      </div>
      <div class="modal-stats-row">
        <div><span class="muted">Age</span><br><strong>${player.age}</strong></div>
        <div><span class="muted">Loan Fee</span><br><strong class="green">${formatMoney(fee)}</strong></div>
        <div><span class="muted">Returns</span><br><strong>Season End</strong></div>
        <div><span class="muted">Budget</span><br><strong>${formatMoney(gameState.budgets[gameState.playerTeam])}</strong></div>
      </div>
    `,
    confirm: 'Confirm Loan',
    cancel: 'Cancel',
    onConfirm: () => {
      const result = executeLoan(gameState, playerId, fromTeamId);
      saveGame();
      showToast(result.message, result.success ? 'success' : 'error');
      showScreen('transfers');
    }
  });
}

function buyConfirm(playerId, fromTeamId) {
  const allPlayers = [...getAllTeams().flatMap(t=>t.squad), ...FREE_AGENTS];
  const player = allPlayers.find(p=>p.id===playerId);
  if (!player) return;
  const fromTeam = fromTeamId ? getTeam(fromTeamId) : null;
  const fee = fromTeamId ? calculateTransferValue(player) : 0;
  const val = fromTeamId ? formatMoney(fee) : 'Free';
  const budget = gameState.budgets[gameState.playerTeam];

  showModal({
    title: 'Sign Player',
    body: `
      <div class="modal-player">
        <span class="pos-badge pos-${player.pos}">${player.pos}</span>
        <strong>${player.name}</strong>
        <span class="ovr-cell ovr-${ovrClass(player.overall)}">${player.overall}</span>
      </div>
      <div class="modal-stats-row">
        <div><span class="muted">From</span><br><strong>${fromTeam?.name || 'Free Agent'}</strong></div>
        <div><span class="muted">Fee</span><br><strong class="${fee > budget ? 'red' : 'green'}">${val}</strong></div>
        <div><span class="muted">Age</span><br><strong>${player.age}</strong></div>
        <div><span class="muted">Your budget</span><br><strong>${formatMoney(budget)}</strong></div>
      </div>
      ${fee > budget ? `<p class="red" style="margin-top:8px;font-size:12px">⚠️ You cannot afford this player.</p>` : ''}
    `,
    confirm: fee > budget ? false : 'Sign Player',
    cancel: 'Cancel',
    onConfirm: () => {
      const result = attemptTransfer(gameState, playerId, fromTeamId || null);
      saveGame();
      showToast(result.message, result.success ? 'success' : 'error');
      showScreen('transfers');
    }
  });
}

// ─── STATS ───────────────────────────────────────────────────────────────────
function renderStats(app) {
  const leagueId = gameState.playerLeague;
  const scorers = getTopScorers(leagueId, gameState, 15);
  const myStats = getPlayerStats(gameState.playerTeam);

  app.innerHTML = `
    <div class="stats-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>STATS</h2>
      </div>
      <div class="stats-cols">
        <div>
          <h3>Top Scorers — ${LEAGUES[leagueId].name}</h3>
          <table class="squad-table">
            <tr><th>#</th><th>Player</th><th>Club</th><th>Goals</th><th>Assists</th></tr>
            ${scorers.map((p,i)=>`
              <tr>
                <td>${i+1}</td><td>${p.name}</td><td class="muted">${p.teamName}</td>
                <td><strong>${p.goals}</strong></td><td>${p.assists}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        <div>
          <h3>My Squad Stats</h3>
          <table class="squad-table">
            <tr><th>Player</th><th>Goals</th><th>Assists</th><th>Apps</th></tr>
            ${myStats.filter(p=>p.goals>0||p.assists>0||p.appearances>0).map(p=>`
              <tr>
                <td>${p.name}</td>
                <td><strong>${p.goals}</strong></td>
                <td>${p.assists}</td>
                <td>${p.appearances}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    </div>
  `;
}

// ─── END OF SEASON ───────────────────────────────────────────────────────────
function renderEndSeason(app) {
  const data = gameState.endOfSeasonData;
  if (!data) { showScreen('hub'); return; }
  const { plTable, champTable, plRelegated, champPromoted, playoffWinner, champPlayoff,
          leagueWinner, faCupWinner, topScorerLeague, managerOfSeason, myTopScorer, playerResult,
          youthGraduates, div1Name, div2Name } = data;

  const retired = gameState.lastRetired || [];
  const myRetired = retired.filter(p => {
    const team = getTeam(gameState.playerTeam);
    return team?.squad ? false : true; // retired means already removed
  });

  const playerResultBanner = {
    title:    { cls: 'win',  text: '🏆 LEAGUE CHAMPIONS!' },
    promoted: { cls: 'win',  text: '⬆️ PROMOTED!' },
    relegated:{ cls: 'loss', text: '⬇️ RELEGATED' },
    normal:   { cls: 'draw', text: '🏁 SEASON COMPLETE' }
  }[playerResult] || { cls: 'draw', text: '🏁 SEASON COMPLETE' };

  app.innerHTML = `
    <div class="end-season">
      <div class="result-header ${playerResultBanner.cls}" style="padding:24px;text-align:center">
        <div class="result-outcome">${playerResultBanner.text}</div>
        <div style="font-size:14px;opacity:0.7;margin-top:6px">Season ${gameState.season} — ${LEAGUES[gameState.playerLeague].name}</div>
      </div>

      <div class="season-summary">

        <div class="end-awards">
          <div class="award-card">
            <div class="award-icon">🏆</div>
            <div class="award-label">League Champions</div>
            <div class="award-value">${leagueWinner?.teamName || '—'}</div>
          </div>
          <div class="award-card">
            <div class="award-icon">⚽</div>
            <div class="award-label">Top Scorer</div>
            <div class="award-value">${topScorerLeague?.name || '—'} <span class="muted">(${topScorerLeague?.goals || 0} goals)</span></div>
            <div class="award-sub">${topScorerLeague?.teamName || ''}</div>
          </div>
          <div class="award-card">
            <div class="award-icon">🎖️</div>
            <div class="award-label">Manager of the Season</div>
            <div class="award-value">${managerOfSeason?.teamName || '—'}</div>
            <div class="award-sub">${managerOfSeason?.wins || 0} wins</div>
          </div>
          <div class="award-card">
            <div class="award-icon">⭐</div>
            <div class="award-label">Your Top Scorer</div>
            <div class="award-value">${myTopScorer?.name || '—'} <span class="muted">(${myTopScorer?.goals || 0} goals)</span></div>
          </div>
          ${faCupWinner ? `
          <div class="award-card" style="border-color:#b45309">
            <div class="award-icon">🏆</div>
            <div class="award-label">${gameState.faCup?.name || "Cup"} Winner</div>
            <div class="award-value" style="color:#fbbf24">${faCupWinner}</div>
          </div>` : ''}
        </div>

        <div class="promo-relegate">
          <div class="pr-section green">
            <h4>⬆️ Promoted</h4>
            ${champPromoted.map(id=>`<div>${getTeam(id)?.name||id}</div>`).join('')}
            <div>${getTeam(playoffWinner)?.name||playoffWinner} <span class="muted">(playoff)</span></div>
          </div>
          <div class="pr-section red">
            <h4>⬇️ Relegated</h4>
            ${plRelegated.map(id=>`<div>${getTeam(id)?.name||id}</div>`).join('')}
          </div>
          <div class="pr-section orange">
            <h4>⚔️ Playoffs</h4>
            ${champPlayoff.map(id=>`<div>${getTeam(id)?.name||id}</div>`).join('')}
          </div>
          ${retired.length > 0 ? `
          <div class="pr-section" style="border-color:var(--muted)">
            <h4 style="color:var(--muted)">👴 Retirements</h4>
            ${retired.slice(0,8).map(p=>`<div>${p.name} <span class="muted">(${p.pos})</span></div>`).join('')}
            ${retired.length > 8 ? `<div class="muted">+${retired.length-8} more</div>` : ''}
          </div>` : ''}
        </div>

        <div class="season-tables">
          <div>
            <h3>${div1Name || 'Division 1'} — Top 8</h3>
            ${renderFullTable(plTable.slice(0,8), gameState.playerLeague, gameState.playerTeam)}
          </div>
          <div>
            <h3>${div2Name || 'Division 2'} — Top 8</h3>
            ${renderFullTable(champTable.slice(0,8), (COUNTRY_CONFIG[gameState.playerCountry||'england']?.div2 || 'championship'), gameState.playerTeam)}
          </div>
        </div>

        ${youthGraduates?.length ? `
          <div class="youth-graduates">
            <h3>🌱 YOUTH ACADEMY GRADUATES</h3>
            <div class="youth-list">
              ${youthGraduates.map(p => `
                <div class="youth-card">
                  <span class="pos-badge pos-${p.pos}">${p.pos}</span>
                  <span class="youth-name">${p.name}</span>
                  <span class="muted">Age ${p.age}</span>
                  <span class="ovr-cell ovr-${ovrClass(p.ovr)}">${p.ovr}</span>
                  <span class="youth-pot">POT <strong>${p.potential}</strong></span>
                </div>
              `).join('')}
            </div>
            <div class="muted" style="font-size:11px;margin-top:6px">These players have joined your squad from the academy.</div>
          </div>
        ` : ''}

        ${gameState.championsLeague && !gameState.championsLeague.playerEliminated && gameState.championsLeague.phase !== 'complete' ? `
          <button class="btn btn-primary btn-xl" onclick="showScreen('champions-league')" style="background:linear-gradient(135deg,#1d4ed8,#92400e);margin-bottom:12px">
            🏆 PLAY CHAMPIONS LEAGUE
          </button>
          <br>
        ` : ''}
        ${gameState.europaLeague && !gameState.europaLeague.playerEliminated && gameState.europaLeague.phase !== 'complete' ? `
          <button class="btn btn-primary btn-xl" onclick="showScreen('europa-league')" style="background:linear-gradient(135deg,#2563eb,#7c3aed);margin-bottom:12px">
            🌟 PLAY EUROPA LEAGUE
          </button>
          <br>
        ` : ''}
        <button class="btn btn-primary btn-xl" onclick="beginNewSeason()">▶ START SEASON ${gameState.season + 1}</button>
      </div>
    </div>
  `;
}

// ─── CAREER ──────────────────────────────────────────────────────────────────
function renderCareer(app) {
  const career = gameState.career || { history: [], hallOfFame: {} };
  const hof = career.hallOfFame || {};
  const history = [...career.history].reverse(); // newest first
  const team = getTeam(gameState.playerTeam);

  const winRate = hof.totalGames > 0
    ? Math.round((hof.totalWins / hof.totalGames) * 100)
    : 0;

  app.innerHTML = `
    <div class="career-screen">
      <div class="screen-header">
        <button class="btn-back" onclick="showScreen('hub')">← Back</button>
        <h2>📖 CAREER — ${team.name}</h2>
        <span class="muted">Season ${gameState.season}</span>
      </div>

      <div class="career-body">

        <!-- HALL OF FAME -->
        <div class="hof-section">
          <h3 class="section-title">🏅 HALL OF FAME</h3>
          <div class="hof-grid">
            <div class="hof-card ${hof.leagueTitles > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">🏆</div>
              <div class="hof-count">${hof.leagueTitles || 0}</div>
              <div class="hof-label">League Titles</div>
            </div>
            <div class="hof-card ${hof.promotions > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">⬆️</div>
              <div class="hof-count">${hof.promotions || 0}</div>
              <div class="hof-label">Promotions</div>
            </div>
            <div class="hof-card ${hof.relegations > 0 ? 'hof-earned hof-bad' : ''}">
              <div class="hof-icon">⬇️</div>
              <div class="hof-count">${hof.relegations || 0}</div>
              <div class="hof-label">Relegations</div>
            </div>
            <div class="hof-card ${hof.topScorerAwards > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">⚽</div>
              <div class="hof-count">${hof.topScorerAwards || 0}</div>
              <div class="hof-label">Top Scorer Awards</div>
            </div>
            <div class="hof-card ${hof.managerOfSeasonAwards > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">🎖️</div>
              <div class="hof-count">${hof.managerOfSeasonAwards || 0}</div>
              <div class="hof-label">Manager of the Season</div>
            </div>
            <div class="hof-card">
              <div class="hof-icon">📊</div>
              <div class="hof-count">${winRate}%</div>
              <div class="hof-label">Win Rate</div>
            </div>
            <div class="hof-card ${hof.bestFinish ? 'hof-earned' : ''}">
              <div class="hof-icon">🥇</div>
              <div class="hof-count">${hof.bestFinish ? `${hof.bestFinish.position}${ordinal(hof.bestFinish.position)}` : '—'}</div>
              <div class="hof-label">Best Finish ${hof.bestFinish ? `(S${hof.bestFinish.season})` : ''}</div>
            </div>
            <div class="hof-card hof-rep">
              <div class="hof-icon">⭐</div>
              <div class="hof-count rep-label">${repLabel(gameState.managerReputation || 50)}</div>
              <div class="hof-label">Reputation (${gameState.managerReputation || 50})</div>
            </div>
            <div class="hof-card ${(hof.domesticCupWins || hof.faCupWins || 0) > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">🏆</div>
              <div class="hof-count">${hof.domesticCupWins || hof.faCupWins || 0}</div>
              <div class="hof-label">Domestic Cup Wins</div>
            </div>
            <div class="hof-card ${(hof.europaWins || 0) > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">🌟</div>
              <div class="hof-count">${hof.europaWins || 0}</div>
              <div class="hof-label">Europa League Wins</div>
            </div>
            <div class="hof-card ${(hof.clWins || 0) > 0 ? 'hof-earned' : ''}">
              <div class="hof-icon">🏆</div>
              <div class="hof-count">${hof.clWins || 0}</div>
              <div class="hof-label">Champions League Wins</div>
            </div>
            <div class="hof-card">
              <div class="hof-icon">🎮</div>
              <div class="hof-count">${hof.totalGames || 0}</div>
              <div class="hof-label">Games Managed</div>
            </div>
          </div>
        </div>

        <!-- SEASON HISTORY -->
        <div class="history-section">
          <h3 class="section-title">📅 SEASON HISTORY</h3>
          ${history.length === 0 ? `<p class="muted" style="padding:16px">No seasons completed yet.</p>` : `
          <table class="history-table">
            <tr>
              <th>Season</th><th>League</th><th>Pos</th><th>W</th><th>D</th><th>L</th>
              <th>GF</th><th>GA</th><th>Pts</th><th>Result</th>
              <th>Europe</th><th>League Winner</th><th>Top Scorer</th><th>Manager of Season</th>
            </tr>
            ${history.map(h => {
              const resultBadge = {
                title:    `<span class="result-badge" style="background:#a855f7;color:#fff">🏆 Title</span>`,
                promoted: `<span class="result-badge result-W">⬆️ Promoted</span>`,
                relegated:`<span class="result-badge result-L">⬇️ Relegated</span>`,
                normal:   `<span class="result-badge result-D">—</span>`
              }[h.result] || '';
              return `
                <tr>
                  <td><strong>${h.season}</strong></td>
                  <td class="muted" style="font-size:11px">${h.leagueName}</td>
                  <td><strong>${h.position}${ordinal(h.position)}</strong></td>
                  <td>${h.won}</td><td>${h.drawn}</td><td>${h.lost}</td>
                  <td>${h.gf}</td><td>${h.ga}</td>
                  <td><strong>${h.points}</strong></td>
                  <td>${resultBadge}</td>
                  <td style="font-size:11px;white-space:nowrap">${(() => {
                    const er = h.europeanResult || 'Did not qualify';
                    const color = er === 'CL Winner' ? '#fbbf24' : er === 'EL Winner' ? '#a78bfa'
                      : er.startsWith('Runner') ? '#94a3b8' : er.startsWith('Semi') ? '#60a5fa'
                      : er.startsWith('Quarter') ? '#7dd3fc' : er.startsWith('Group') ? '#6ee7b7'
                      : er === 'EL Playoff' ? '#c4b5fd' : 'var(--muted)';
                    return `<span style="color:${color}">${er}</span>`;
                  })()}</td>
                  <td class="muted" style="font-size:12px">${h.leagueWinner?.teamName || '—'}</td>
                  <td style="font-size:12px">${h.topScorerLeague ? `${h.topScorerLeague.name} (${h.topScorerLeague.goals}⚽)` : '—'}</td>
                  <td style="font-size:12px">${h.managerOfSeason ? `${h.managerOfSeason.teamName} (${h.managerOfSeason.wins}W)` : '—'}</td>
                </tr>
              `;
            }).join('')}
          </table>
          `}
        </div>

      </div>
    </div>
  `;
}

// ─── MATCHUP CARD (hub) ───────────────────────────────────────────────────────
function renderMatchupCard(fixture, gameState) {
  const isHome = fixture.home === gameState.playerTeam;
  const myTeam  = getTeam(gameState.playerTeam);
  const oppTeam = getTeam(isHome ? fixture.away : fixture.home);
  const myTactics  = getManagerTactics(gameState);

  function lineRatings(team) {
    const s = team.squad;
    const avg = (players) => players.length
      ? Math.round(players.reduce((a, p) => a + p.overall, 0) / players.length)
      : 0;
    return {
      atk: avg(s.filter(p => ['ST','CF','RW','LW','CAM'].includes(p.pos))),
      mid: avg(s.filter(p => ['CM','CDM','RM','LM'].includes(p.pos))),
      def: avg(s.filter(p => ['CB','RB','LB','RWB','LWB'].includes(p.pos))),
      gk:  avg(s.filter(p => p.pos === 'GK')),
    };
  }

  function miniFormation(formation) {
    const rows = FORMATION_DISPLAY[formation] || FORMATION_DISPLAY['4-4-2'];
    return rows.map(row => `
      <div class="mf-row">
        ${row.map(() => `<span class="mf-dot"></span>`).join('')}
      </div>
    `).join('');
  }

  function compBar(myVal, oppVal, label) {
    const total = myVal + oppVal || 1;
    const myPct = Math.round((myVal / total) * 100);
    const oppPct = 100 - myPct;
    const myWins = myVal >= oppVal;
    return `
      <div class="comp-row">
        <span class="comp-val ${myWins ? 'comp-win' : 'comp-lose'}">${myVal}</span>
        <div class="comp-bars">
          <div class="comp-bar comp-bar-mine" style="width:${myPct}%"></div>
          <div class="comp-bar comp-bar-opp"  style="width:${oppPct}%"></div>
        </div>
        <span class="comp-label">${label}</span>
        <div class="comp-bars">
          <div class="comp-bar comp-bar-opp"  style="width:${oppPct}%"></div>
          <div class="comp-bar comp-bar-mine" style="width:${myPct}%"></div>
        </div>
        <span class="comp-val ${!myWins ? 'comp-win' : 'comp-lose'}">${oppVal}</span>
      </div>
    `;
  }

  const my  = lineRatings(myTeam);
  const opp = lineRatings(oppTeam);
  const oppTactics = gameState.tactics?.[oppTeam.id] || {};
  const oppFormation = oppTactics.formation || '4-4-2';

  return `
    <div class="matchup-card">
      <div class="matchup-team">
        <div class="matchup-name" style="color:${myTeam.color}">${myTeam.name}</div>
        <div class="matchup-formation-label">${myTactics.formation}</div>
        <div class="matchup-mini-pitch">${miniFormation(myTactics.formation)}</div>
        <div class="matchup-venue-badge">${isHome ? '🏟 HOME' : '✈️ AWAY'}</div>
      </div>

      <div class="matchup-compare">
        <div class="comp-title">MATCHUP</div>
        ${compBar(my.atk, opp.atk, 'ATK')}
        ${compBar(my.mid, opp.mid, 'MID')}
        ${compBar(my.def, opp.def, 'DEF')}
        ${compBar(my.gk,  opp.gk,  'GK')}
      </div>

      <div class="matchup-team matchup-team-opp">
        <div class="matchup-name" style="color:${oppTeam.color}">${oppTeam.name}</div>
        <div class="matchup-formation-label">${oppFormation}</div>
        <div class="matchup-mini-pitch">${miniFormation(oppFormation)}</div>
        <div class="matchup-venue-badge">${!isHome ? '🏟 HOME' : '✈️ AWAY'}</div>
      </div>
    </div>
  `;
}

// ─── TEAM ANALYTICS (tactics page) ────────────────────────────────────────────
function renderTeamAnalytics(gameState) {
  const team = getTeam(gameState.playerTeam);
  const morale  = gameState.morale?.[gameState.playerTeam] || 70;
  const fitness = gameState.fitness?.[gameState.playerTeam] || 85;
  const recent  = getRecentResults(gameState.playerTeam, gameState, 5);

  const isHome = (r) => r.homeTeam === gameState.playerTeam;
  const myG    = (r) => isHome(r) ? r.homeGoals : r.awayGoals;
  const oppG   = (r) => isHome(r) ? r.awayGoals : r.homeGoals;

  const totalScored   = recent.reduce((s, r) => s + myG(r), 0);
  const totalConceded = recent.reduce((s, r) => s + oppG(r), 0);
  const avgScored     = recent.length ? (totalScored / recent.length).toFixed(1) : '—';
  const avgConceded   = recent.length ? (totalConceded / recent.length).toFixed(1) : '—';

  const topScorer = [...team.squad].sort((a, b) => b.goals - a.goals)[0];

  function bar(val, max, color) {
    const pct = Math.round((val / max) * 100);
    return `<div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
  }

  function formDot(r) {
    const w = myG(r) > oppG(r), d = myG(r) === oppG(r);
    const cls = w ? 'dot-w' : d ? 'dot-d' : 'dot-l';
    const label = w ? 'W' : d ? 'D' : 'L';
    return `<span class="form-dot ${cls}" title="${myG(r)}-${oppG(r)}">${label}</span>`;
  }

  return `
    <div class="team-analytics">
      <div class="analytics-title">TEAM ANALYTICS</div>

      <div class="analytics-row">
        <span class="analytics-label">Form</span>
        <div class="form-dots">
          ${recent.length ? recent.map(formDot).join('') : '<span class="muted">No games yet</span>'}
        </div>
      </div>

      <div class="analytics-row">
        <span class="analytics-label">Morale</span>
        <div class="analytics-bar-wrap">
          ${bar(morale, 100, morale > 75 ? 'var(--green)' : morale > 50 ? 'var(--warn)' : 'var(--danger)')}
          <span class="analytics-val">${moralLabel(morale)}</span>
        </div>
      </div>

      <div class="analytics-row">
        <span class="analytics-label">Fitness</span>
        <div class="analytics-bar-wrap">
          ${bar(fitness, 100, fitness > 80 ? 'var(--accent)' : 'var(--warn)')}
          <span class="analytics-val">${fitness}%</span>
        </div>
      </div>

      <div class="analytics-row">
        <span class="analytics-label">Avg Goals</span>
        <span class="analytics-val"><span class="green">${avgScored}</span> scored &nbsp;·&nbsp; <span class="red">${avgConceded}</span> conceded</span>
      </div>

      ${topScorer?.goals > 0 ? `
      <div class="analytics-row">
        <span class="analytics-label">Top Scorer</span>
        <span class="analytics-val"><strong>${topScorer.name}</strong> — ${topScorer.goals} ⚽</span>
      </div>` : ''}
    </div>
  `;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function simulateWeekAndRefresh() {
  const fixture = getPlayerFixture(gameState);
  if (fixture) {
    const data = simulatePlayerMatch(gameState, getManagerTactics(gameState));
    advanceMatchweek(gameState);
    saveGame();
    showScreen('match-result', data);
    return;
  }
  advanceMatchweek(gameState);
  saveGame();
  if (gameState.seasonEnded) {
    showScreen('end-season');
  } else {
    showScreen('hub');
  }
}

function advanceAndRefresh() {
  advanceMatchweek(gameState);
  saveGame();
  if (gameState.seasonEnded) showScreen('end-season');
  else showScreen('hub');
}

function beginNewSeason() {
  startNewSeason(gameState);
  saveGame();
  showScreen('hub');
}

function repLabel(rep) {
  if (rep >= 91) return 'Legendary';
  if (rep >= 76) return 'Elite';
  if (rep >= 61) return 'Renowned';
  if (rep >= 41) return 'Established';
  if (rep >= 21) return 'Promising';
  return 'Unknown';
}

// ─── SCOUT REPORT ─────────────────────────────────────────────────────────────
function showScoutReport(oppTeamId) {
  const opp = getTeam(oppTeamId);
  if (!opp) return;

  const recentOpp = getRecentResults(oppTeamId, gameState, 5);
  const topPlayers = [...opp.squad].sort((a, b) => b.overall - a.overall).slice(0, 3);
  const topScorer = [...opp.squad].sort((a, b) => b.goals - a.goals)[0];
  const avg11 = Math.round(
    [...opp.squad].sort((a, b) => b.overall - a.overall).slice(0, 11).reduce((s, p) => s + p.overall, 0) / 11
  );

  function formDots(results, teamId) {
    if (!results.length) return '<span class="muted">No data</span>';
    return results.map(r => {
      const isH = r.homeTeam === teamId;
      const myG = isH ? r.homeGoals : r.awayGoals;
      const oppG = isH ? r.awayGoals : r.homeGoals;
      const w = myG > oppG, d = myG === oppG;
      return `<span class="form-dot ${w ? 'dot-w' : d ? 'dot-d' : 'dot-l'}">${w ? 'W' : d ? 'D' : 'L'}</span>`;
    }).join('');
  }

  showModal({
    title: `🔍 ${opp.name}`,
    body: `
      <div class="scout-body">
        <div class="scout-row">
          <span class="scout-label">Recent Form</span>
          <div class="form-dots">${formDots(recentOpp, oppTeamId)}</div>
        </div>
        <div class="scout-row">
          <span class="scout-label">Avg OVR (XI)</span>
          <span class="scout-val ovr-cell ovr-${ovrClass(avg11)}">${avg11}</span>
        </div>
        <div class="scout-row">
          <span class="scout-label">Prestige</span>
          <span class="scout-val">★ ${opp.prestige}</span>
        </div>
        ${topScorer?.goals > 0 ? `
        <div class="scout-row">
          <span class="scout-label">Top Scorer</span>
          <span class="scout-val"><strong>${topScorer.name}</strong> — ${topScorer.goals} ⚽</span>
        </div>` : ''}
        <div class="scout-divider">KEY PLAYERS</div>
        ${topPlayers.map(p => `
          <div class="scout-player-row">
            <span class="pos-badge pos-${p.pos}">${p.pos}</span>
            <span class="scout-pname">${p.name}</span>
            <span class="ovr-cell ovr-${ovrClass(p.overall)}">${p.overall}</span>
            ${p.goals > 0 ? `<span class="muted" style="font-size:11px">${p.goals}⚽</span>` : ''}
          </div>
        `).join('')}
        <div class="scout-row" style="margin-top:10px">
          <span class="scout-label">Stadium</span>
          <span class="scout-val muted">${opp.stadium} (cap. ${opp.capacity?.toLocaleString()})</span>
        </div>
      </div>
    `,
    confirm: false,
    cancel: 'Close',
  });
}

// ─── MATCH REPLAY ─────────────────────────────────────────────────────────────
let _replayTimeouts = [];
let _replayIntervals = [];

function skipReplay() {
  _replayTimeouts.forEach(t => clearTimeout(t));
  _replayIntervals.forEach(i => clearInterval(i));
  _replayTimeouts = [];
  _replayIntervals = [];
  showScreen('hub');
}

function renderMatchReplay(app) {
  const data = gameState._replayData;
  if (!data) { showScreen('hub'); return; }

  _replayTimeouts.forEach(t => clearTimeout(t));
  _replayIntervals.forEach(i => clearInterval(i));
  _replayTimeouts = [];
  _replayIntervals = [];

  const homeTeam = getTeam(data.homeTeamId);
  const awayTeam = getTeam(data.awayTeamId);
  const isHome = data.isHome;
  const myGoals = isHome ? data.homeGoals : data.awayGoals;
  const oppGoals = isHome ? data.awayGoals : data.homeGoals;
  const outcomeClass = data.matchResult === 'win' ? 'win' : data.matchResult === 'draw' ? 'draw' : 'loss';

  app.innerHTML = `
    <div class="match-replay">
      <div class="screen-header">
        <button class="btn-back" onclick="skipReplay()">⏩ Skip</button>
        <h2>MATCH REPLAY</h2>
        <span class="muted" style="font-size:12px">~14s</span>
      </div>

      <div class="replay-matchup">
        <div class="replay-team ${isHome ? 'replay-mine' : ''}">
          <div class="replay-team-name" style="color:${homeTeam?.color || 'var(--text)'}">${homeTeam?.name}</div>
          <div class="replay-team-label">HOME</div>
        </div>
        <div class="replay-center">
          <div class="replay-score ${outcomeClass}" id="replay-score">0 – 0</div>
          <div class="replay-clock" id="replay-clock">0'</div>
        </div>
        <div class="replay-team ${!isHome ? 'replay-mine' : ''}">
          <div class="replay-team-name" style="color:${awayTeam?.color || 'var(--text)'}">${awayTeam?.name}</div>
          <div class="replay-team-label">AWAY</div>
        </div>
      </div>

      <div class="replay-progress-wrap">
        <div class="replay-bar-track">
          <div class="replay-bar-fill" id="replay-bar"></div>
        </div>
      </div>

      <div class="match-stats-bar" id="replay-stats" style="margin:12px 0">
        <div class="ms-row">
          <span class="ms-val" id="rs-poss-h">50%</span>
          <div class="ms-track"><div class="ms-fill" id="rs-poss-fill-h" style="width:50%"></div></div>
          <span class="ms-label">Possession</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" id="rs-poss-fill-a" style="width:50%"></div></div>
          <span class="ms-val" id="rs-poss-a">50%</span>
        </div>
        <div class="ms-row">
          <span class="ms-val" id="rs-shots-h">0</span>
          <div class="ms-track"><div class="ms-fill" id="rs-shots-fill-h" style="width:0%"></div></div>
          <span class="ms-label">Shots</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" id="rs-shots-fill-a" style="width:0%"></div></div>
          <span class="ms-val" id="rs-shots-a">0</span>
        </div>
        <div class="ms-row">
          <span class="ms-val" id="rs-xg-h">0.0</span>
          <div class="ms-track"><div class="ms-fill" id="rs-xg-fill-h" style="width:0%"></div></div>
          <span class="ms-label">xG</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" id="rs-xg-fill-a" style="width:0%"></div></div>
          <span class="ms-val" id="rs-xg-a">0.0</span>
        </div>
        <div class="ms-row">
          <span class="ms-val" id="rs-bc-h" style="color:#f59e0b">0</span>
          <div class="ms-track"><div class="ms-fill" id="rs-bc-fill-h" style="width:0%;background:#f59e0b"></div></div>
          <span class="ms-label">Big Chances</span>
          <div class="ms-track ms-track-right"><div class="ms-fill ms-fill-right" id="rs-bc-fill-a" style="width:0%;background:#f59e0b"></div></div>
          <span class="ms-val" id="rs-bc-a" style="color:#f59e0b">0</span>
        </div>
      </div>

      <div class="replay-events" id="replay-events">
        <div class="replay-events-label">MATCH EVENTS</div>
      </div>

      <div id="replay-final" style="display:none;text-align:center;padding:24px">
        <div class="replay-ft-badge ${outcomeClass}">${data.matchResult === 'win' ? '🏆 VICTORY' : data.matchResult === 'draw' ? '🤝 DRAW' : '😞 DEFEAT'}</div>
        <div class="replay-ft-score">${myGoals} – ${oppGoals}</div>
        <div class="muted" style="font-size:12px;margin-bottom:16px">Full Time</div>
        <button class="btn btn-primary" onclick="goToPostMatchPress('${data.matchResult}')">Post-Match Reaction →</button>
      </div>
    </div>
  `;

  requestAnimationFrame(() => startReplayAnimation(data, isHome));
}

function startReplayAnimation(data, isHome) {
  const DURATION = 14000;
  const events = [...(data.events || [])].sort((a, b) => a.min - b.min);
  let homeScore = 0, awayScore = 0;

  // Live stats setup
  const finalPoss  = data.possession  || { home: 50, away: 50 };
  const finalShots = data.shots       || { home: 0, away: 0 };
  const finalXG    = data.xG          || { home: 0, away: 0 };
  const finalBC    = data.bigChances  || { home: 0, away: 0 };
  let liveShots = { home: 0, away: 0 };
  let liveXG    = { home: 0, away: 0 };
  let liveBC    = { home: 0, away: 0 };

  // Helper to refresh the stats bar DOM
  function updateLiveStats(progress) {
    const hp = Math.round(50 + (finalPoss.home - 50) * progress);
    const ap = 100 - hp;
    const totalS  = liveShots.home + liveShots.away || 1;
    const totalX  = liveXG.home   + liveXG.away    || 1;
    const totalBC = liveBC.home   + liveBC.away     || 1;
    const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setW = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = pct + '%'; };
    set('rs-poss-h', hp + '%');  set('rs-poss-a', ap + '%');
    setW('rs-poss-fill-h', hp);  setW('rs-poss-fill-a', ap);
    set('rs-shots-h', liveShots.home);  set('rs-shots-a', liveShots.away);
    setW('rs-shots-fill-h', Math.round(liveShots.home / totalS * 100));
    setW('rs-shots-fill-a', Math.round(liveShots.away / totalS * 100));
    set('rs-xg-h', liveXG.home.toFixed(1));  set('rs-xg-a', liveXG.away.toFixed(1));
    setW('rs-xg-fill-h', Math.round(liveXG.home / totalX * 100));
    setW('rs-xg-fill-a', Math.round(liveXG.away / totalX * 100));
    set('rs-bc-h', liveBC.home);  set('rs-bc-a', liveBC.away);
    setW('rs-bc-fill-h', Math.round(liveBC.home / totalBC * 100));
    setW('rs-bc-fill-a', Math.round(liveBC.away / totalBC * 100));
  }

  // Schedule discrete shot + xG + bigChance ticks
  function scheduleShotTicks(shotCount, xgTotal, bcCount, side) {
    if (!shotCount) return;
    const xgPerShot = xgTotal / shotCount;
    // which shot indices are big chances (evenly spaced)
    const bcIndices = new Set();
    if (bcCount > 0) {
      for (let i = 0; i < bcCount; i++) bcIndices.add(Math.round((i / bcCount) * shotCount));
    }
    for (let i = 0; i < shotCount; i++) {
      const base   = ((i + 0.5) / shotCount) * DURATION;
      const jitter = (Math.random() - 0.5) * (DURATION / shotCount) * 0.5;
      const delay  = Math.max(400, Math.min(DURATION - 300, base + jitter));
      const isBig  = bcIndices.has(i);
      const t = setTimeout(() => {
        liveShots[side]++;
        liveXG[side] = Math.min(xgTotal, +(liveXG[side] + xgPerShot).toFixed(2));
        if (isBig) liveBC[side]++;
        updateLiveStats(Math.min(1, (Date.now() - clockStart) / DURATION));
      }, delay);
      _replayTimeouts.push(t);
    }
  }

  scheduleShotTicks(finalShots.home, finalXG.home, finalBC.home, 'home');
  scheduleShotTicks(finalShots.away, finalXG.away, finalBC.away, 'away');

  // Clock ticker (also drives possession interpolation)
  const clockStart = Date.now();
  const clockInt = setInterval(() => {
    const elapsed = Date.now() - clockStart;
    const progress = Math.min(1, elapsed / DURATION);
    const minute = Math.min(90, Math.round(progress * 90));
    const clockEl = document.getElementById('replay-clock');
    const barEl = document.getElementById('replay-bar');
    if (clockEl) clockEl.textContent = `${minute}'`;
    if (barEl) barEl.style.width = `${progress * 100}%`;
    updateLiveStats(progress);
  }, 150);
  _replayIntervals.push(clockInt);

  // Schedule events
  events.forEach(ev => {
    const delay = Math.max(300, Math.round((ev.min / 90) * DURATION));
    const t = setTimeout(() => {
      const feed = document.getElementById('replay-events');
      if (!feed) return;

      const isMyTeam = (ev.team === 'home') === isHome;

      const GOAL_TYPE_LABELS = { penalty:'Penalty', free_kick:'Free Kick', header:'Header', long_shot:'Long Shot', tap_in:'Tap In', one_on_one:'1v1', volley:'Volley', finish:'Finish' };

      if (ev.type === 'goal') {
        if (ev.team === 'home') homeScore++; else awayScore++;
        const scoreEl = document.getElementById('replay-score');
        if (scoreEl) {
          scoreEl.textContent = `${homeScore} – ${awayScore}`;
          scoreEl.classList.add('score-pulse');
          setTimeout(() => scoreEl.classList.remove('score-pulse'), 700);
        }
        const typeLabel = GOAL_TYPE_LABELS[ev.goalType] || '';
        const row = document.createElement('div');
        row.className = `replay-event ${isMyTeam ? 'ev-mine' : 'ev-opp'}`;
        row.innerHTML = `
          <span class="ev-min">${ev.min}'</span>
          <span class="ev-icon">⚽</span>
          <div class="ev-goal-info">
            <span class="ev-player">${ev.player}</span>
            <div class="ev-goal-meta">
              ${ev.assist ? `<span class="ev-assist">↪ ${ev.assist}</span>` : ''}
              ${typeLabel ? `<span class="ev-goal-type">${typeLabel}</span>` : ''}
            </div>
          </div>`;
        feed.appendChild(row);
        requestAnimationFrame(() => row.classList.add('ev-visible'));
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else if (ev.type === 'penalty_miss') {
        const row = document.createElement('div');
        row.className = `replay-event ev-card ${isMyTeam ? 'ev-mine' : 'ev-opp'}`;
        row.innerHTML = `
          <span class="ev-min">${ev.min}'</span>
          <span class="ev-icon">❌</span>
          <div class="ev-goal-info">
            <span class="ev-player">${ev.player}</span>
            <div class="ev-goal-meta"><span class="ev-goal-type" style="color:var(--danger)">Penalty Missed</span></div>
          </div>`;
        feed.appendChild(row);
        requestAnimationFrame(() => row.classList.add('ev-visible'));
      } else {
        const row = document.createElement('div');
        row.className = `replay-event ev-card ${isMyTeam ? 'ev-mine' : 'ev-opp'}`;
        row.innerHTML = `<span class="ev-min">${ev.min}'</span><span class="ev-icon">${ev.type === 'yellow' ? '🟨' : '🟥'}</span><span class="ev-player">${ev.player}</span>`;
        feed.appendChild(row);
        requestAnimationFrame(() => row.classList.add('ev-visible'));
      }
    }, delay);
    _replayTimeouts.push(t);
  });

  // Final whistle
  const finalT = setTimeout(() => {
    clearInterval(clockInt);
    _replayIntervals = _replayIntervals.filter(i => i !== clockInt);
    const clockEl = document.getElementById('replay-clock');
    const barEl = document.getElementById('replay-bar');
    if (clockEl) clockEl.textContent = 'FT';
    if (barEl) barEl.style.width = '100%';
    const finalEl = document.getElementById('replay-final');
    if (finalEl) finalEl.style.display = 'block';
    const scoreEl = document.getElementById('replay-score');
    if (scoreEl) scoreEl.textContent = `${data.homeGoals} – ${data.awayGoals}`;
  }, DURATION + 400);
  _replayTimeouts.push(finalT);
}

function ovrClass(ovr) {
  if (ovr >= 85) return 'elite';
  if (ovr >= 78) return 'great';
  if (ovr >= 72) return 'good';
  if (ovr >= 65) return 'average';
  return 'poor';
}

function moralLabel(m) {
  if (m >= 85) return 'Excellent';
  if (m >= 70) return 'Good';
  if (m >= 55) return 'Okay';
  if (m >= 40) return 'Poor';
  return 'Very Low';
}

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}

function isLight(hex) {
  const c = hex.replace('#','');
  const r = parseInt(c.substr(0,2),16);
  const g = parseInt(c.substr(2,2),16);
  const b = parseInt(c.substr(4,2),16);
  return (r*299 + g*587 + b*114) / 1000 > 128;
}

// ─── SAVE / LOAD ─────────────────────────────────────────────────────────────
function saveGame() {
  try {
    gameState._lastSaved = Date.now();
    // Snapshot all squad data into gameState before saving
    gameState.squadData = {};
    getAllTeams().forEach(t => {
      gameState.squadData[t.id] = t.squad;
    });
    gameState._nextPid = gameState._nextPid || 100000;
    localStorage.setItem('fm_save', JSON.stringify(gameState));
    // Flash save indicator in hub topbar if visible
    const el = document.getElementById('save-indicator');
    if (el) {
      el.textContent = '💾 Saved!';
      el.style.color = 'var(--green)';
      setTimeout(() => { if (el) { el.textContent = '💾'; el.style.color = ''; } }, 2000);
    }
  } catch(e) {
    console.warn('Save failed (storage full?)', e);
  }
}

function loadGame() {
  const saved = localStorage.getItem('fm_save');
  if (!saved) return;
  gameState = JSON.parse(saved);

  // Backfill playerCountry for saves created before it was added
  if (!gameState.playerCountry && gameState.playerLeague) {
    gameState.playerCountry = LEAGUES[gameState.playerLeague]?.country || 'england';
  }
  // Fix cup name — old saves had it hardcoded as 'FA Cup' regardless of country
  if (gameState.faCup && gameState.playerCountry) {
    const correctCupName = COUNTRY_CONFIG[gameState.playerCountry]?.cup;
    if (correctCupName) gameState.faCup.name = correctCupName;
  }

  // Restore any dynamically added teams (e.g. League 1 promoted teams)
  if (gameState.extraTeams) {
    Object.values(gameState.extraTeams).forEach(meta => {
      if (!TEAM_MAP[meta.id]) {
        const team = { ...meta, squad: [] };
        ALL_TEAMS.push(team);
        TEAM_MAP[meta.id] = team;
      }
    });
  }

  // Restore squad data back into global team objects
  if (gameState.squadData) {
    getAllTeams().forEach(t => {
      if (gameState.squadData[t.id]) {
        t.squad = gameState.squadData[t.id];
      }
    });
  }

  // Restore league teams from gameState into LEAGUES
  if (gameState.leagueTeams) {
    LEAGUES.premier.teams = gameState.leagueTeams.premier;
    LEAGUES.championship.teams = gameState.leagueTeams.championship;
  }
  showScreen('hub');
}

function startNewGame() {
  gameState = { season: 1 };
  showScreen('team-select');
}

// ─── AI BIDS ─────────────────────────────────────────────────────────────────
function renderAIBidsCard(gameState) {
  const bids = gameState.aiBids;
  if (!bids?.length) return '';
  return `
    <div class="hub-card ai-bids-card">
      <h4>📬 TRANSFER OFFERS (${bids.length})</h4>
      ${bids.map(bid => `
        <div class="bid-row">
          <span class="pos-badge pos-${bid.playerPos}">${bid.playerPos}</span>
          <div class="bid-info">
            <span class="bid-player">${bid.playerName}</span>
            <span class="bid-from muted">${bid.biddingTeamName}</span>
          </div>
          <span class="bid-amount">${formatMoney(bid.amount)}</span>
          <div class="bid-actions">
            <button class="btn-sm btn-primary" onclick="acceptBid('${bid.id}')">Accept</button>
            <button class="btn-sm btn-secondary" onclick="rejectBid('${bid.id}')">Reject</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function acceptBid(bidId) {
  const bids = gameState.aiBids || [];
  const bid = bids.find(b => b.id === bidId);
  if (!bid) return;

  const playerTeam = getTeam(gameState.playerTeam);
  const player = playerTeam.squad.find(p => p.id === bid.playerId);
  if (!player) { rejectBid(bidId); return; }

  if (player.pos === 'GK' && playerTeam.squad.filter(p => p.pos === 'GK').length <= 1) {
    showToast('Cannot sell your only goalkeeper.', 'error'); return;
  }
  if (playerTeam.squad.length <= 15) {
    showToast('Squad too small to sell.', 'error'); return;
  }

  showModal({
    title: `Accept Offer — ${bid.biddingTeamName}`,
    body: `
      <div class="modal-player">
        <span class="pos-badge pos-${bid.playerPos}">${bid.playerPos}</span>
        <strong>${bid.playerName}</strong>
        <span class="ovr-cell ovr-${ovrClass(bid.playerOvr)}">${bid.playerOvr}</span>
      </div>
      <p>Offer: <strong class="green">${formatMoney(bid.amount)}</strong> from <strong>${bid.biddingTeamName}</strong></p>
    `,
    confirm: 'Accept & Sell',
    cancel: 'Reject',
    onConfirm: () => {
      // Execute the sale at bid amount
      const idx = playerTeam.squad.findIndex(p => p.id === bid.playerId);
      if (idx !== -1) {
        playerTeam.squad.splice(idx, 1);
        gameState.budgets[gameState.playerTeam] = (gameState.budgets[gameState.playerTeam] || 0) + bid.amount;
        const buyingTeam = getTeam(bid.biddingTeamId);
        if (buyingTeam) {
          gameState.budgets[bid.biddingTeamId] = (gameState.budgets[bid.biddingTeamId] || 0) - bid.amount;
          buyingTeam.squad.push({ ...player });
        }
      }
      gameState.aiBids = bids.filter(b => b.id !== bidId);
      saveGame();
      showToast(`${bid.playerName} sold to ${bid.biddingTeamName} for ${formatMoney(bid.amount)}!`, 'success');
      showScreen('hub');
    },
    onCancel: () => rejectBid(bidId)
  });
}

function rejectBid(bidId) {
  if (!gameState.aiBids) return;
  const bid = gameState.aiBids.find(b => b.id === bidId);
  gameState.aiBids = gameState.aiBids.filter(b => b.id !== bidId);
  saveGame();
  if (bid) showToast(`Offer from ${bid.biddingTeamName} rejected.`, 'info');
  showScreen('hub');
}

// ─── SIM TO LAST MATCHWEEK ───────────────────────────────────────────────────
function getRemainingMatchCount(gameState) {
  const leagueId = gameState.playerLeague;
  return gameState.fixtures[leagueId]
    .filter(f => (f.home === gameState.playerTeam || f.away === gameState.playerTeam) && !f.played)
    .length;
}

function confirmSimToLast() {
  const remaining = getRemainingMatchCount(gameState);
  showModal({
    title: '⏩ Simulate to Last Matchweek',
    body: `<p>This will auto-simulate <strong>${remaining - 1}</strong> matchweek${remaining - 1 !== 1 ? 's' : ''}, leaving only your final league match to play manually.</p>
           <p class="muted" style="margin-top:8px;font-size:12px">Wages, injuries, FA Cup, morale — everything plays out as normal. This cannot be undone.</p>`,
    confirm: 'Simulate',
    cancel: 'Cancel',
    onConfirm: () => {
      const n = simulateToLastMatchweek(gameState);
      saveGame();
      showToast(`Simulated ${n} matchweek${n !== 1 ? 's' : ''}. Final match ready.`, 'success');
      if (gameState.seasonEnded) showScreen('end-season');
      else showScreen('hub');
    }
  });
}

// ─── FA CUP PENDING CARD (hub) ────────────────────────────────────────────────
function renderFaCupPendingCard(gameState) {
  const cup = gameState.faCup;
  if (!cup || !cup.playerMatchPending || cup.playerEliminated) return '';

  const round = cup.rounds[cup.currentRound];
  const pair = round?.pairs?.find(p => p[0] === gameState.playerTeam || p[1] === gameState.playerTeam);
  if (!pair) return '';

  const oppId = pair[0] === gameState.playerTeam ? pair[1] : pair[0];
  const opp = getTeam(oppId);
  const isHome = pair[0] === gameState.playerTeam;

  return `
    <div class="facup-pending">
      <h4>🏆 ${(gameState.faCup?.name || 'CUP').toUpperCase()} — MATCH PENDING</h4>
      <div class="facup-round-badge">${round.name.toUpperCase()}</div>
      <div class="next-fixture" style="margin-bottom:8px">
        <span class="nf-team ${isHome ? 'active' : ''}">${getTeam(gameState.playerTeam).name}</span>
        <span class="nf-vs">vs</span>
        <span class="nf-team ${!isHome ? 'active' : ''}">${opp?.name || 'Unknown'}</span>
      </div>
      <div class="nf-venue" style="color:#fbbf24;margin-bottom:12px">${isHome ? '🏟 Home' : '✈️ Away'}</div>
      <button class="btn btn-primary" style="background:#b45309" onclick="goToMatchFlow(true)">SET TACTICS & PLAY ${(gameState.faCup?.name || 'CUP').toUpperCase()}</button>
    </div>
  `;
}

// ─── MATCH FLOW ENTRY ─────────────────────────────────────────────────────────
function goToMatchFlow(isFaCup) {
  gameState.faCupMatchActive = !!isFaCup;
  showScreen('press-conference');
}

// ─── PRESS CONFERENCE ─────────────────────────────────────────────────────────
const PRESS_CONF_QUESTIONS = [
  {
    question: "How is the squad feeling ahead of today's match?",
    options: [
      { text: "We're in excellent shape and ready to dominate.", effect: '+8 morale', moraleChange: 8, cls: 'effect-pos' },
      { text: "Focused and taking it one game at a time.", effect: '+3 morale', moraleChange: 3, cls: 'effect-pos' },
      { text: "There are some concerns, but we'll push through.", effect: '-3 morale', moraleChange: -3, cls: 'effect-neg' },
    ]
  },
  {
    question: "This is a crucial fixture. How do you approach it?",
    options: [
      { text: "We want three points. Nothing less will do.", effect: '+6 morale', moraleChange: 6, cls: 'effect-pos' },
      { text: "We respect them but back ourselves to win.", effect: '+4 morale', moraleChange: 4, cls: 'effect-pos' },
      { text: "We'll see what happens on the day.", effect: '±0', moraleChange: 0, cls: 'effect-neu' },
    ]
  },
  {
    question: "What's your tactical message to the players?",
    options: [
      { text: "High press, high energy — take the game to them.", effect: '+5 morale', moraleChange: 5, cls: 'effect-pos' },
      { text: "Solid and disciplined — we'll find our moments.", effect: '+3 morale', moraleChange: 3, cls: 'effect-pos' },
      { text: "Just play your natural game. No extra pressure.", effect: '+1 morale', moraleChange: 1, cls: 'effect-pos' },
    ]
  },
  {
    question: "The fans are expecting a big performance today.",
    options: [
      { text: "We won't let them down. Full commitment, every minute.", effect: '+7 morale', moraleChange: 7, cls: 'effect-pos' },
      { text: "We play for the fans every single week.", effect: '+4 morale', moraleChange: 4, cls: 'effect-pos' },
      { text: "Results matter more than performances right now.", effect: '-2 morale', moraleChange: -2, cls: 'effect-neg' },
    ]
  },
  {
    question: "Your opponent has been in strong form. Are you concerned?",
    options: [
      { text: "Not at all. We focus entirely on our own game.", effect: '+5 morale', moraleChange: 5, cls: 'effect-pos' },
      { text: "They're quality, but so are we. Should be a great game.", effect: '+2 morale', moraleChange: 2, cls: 'effect-pos' },
      { text: "I won't lie — we have a tough task ahead of us.", effect: '-4 morale', moraleChange: -4, cls: 'effect-neg' },
    ]
  },
];

function renderPressConference(app) {
  const isFaCup = gameState.faCupMatchActive;
  const isEuropa = gameState.europaMatchActive;
  const isCL = gameState.clMatchActive;
  const myTeam = getTeam(gameState.playerTeam);

  // Get opponent name
  let oppName = '?';
  let venue = '';
  let competition = 'Premier League';

  if (isFaCup && gameState.faCup?.playerMatchPending) {
    const cup = gameState.faCup;
    const round = cup.rounds[cup.currentRound];
    const pair = round?.pairs?.find(p => p[0] === gameState.playerTeam || p[1] === gameState.playerTeam);
    if (pair) {
      const oppId = pair[0] === gameState.playerTeam ? pair[1] : pair[0];
      oppName = getTeam(oppId)?.name || '?';
      venue = pair[0] === gameState.playerTeam ? 'Home' : 'Away';
      competition = `${gameState.faCup?.name || 'Cup'} — ${round.name}`;
    }
  } else if (isCL && gameState.championsLeague?.playerMatchPending) {
    competition = 'Champions League';
    const cl = gameState.championsLeague;
    const g = cl.playerGroup;
    if (cl.phase === 'group' && cl.groupFixtures?.[g]?.[cl.groupRound]) {
      const pf = cl.groupFixtures[g][cl.groupRound].find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pf) { oppName = getTeam(pf[0] === gameState.playerTeam ? pf[1] : pf[0])?.name || '?'; }
    }
  } else if (isEuropa && gameState.europaLeague?.playerMatchPending) {
    competition = 'Europa League';
    const el = gameState.europaLeague;
    const g = el.playerGroup;
    if (el.phase === 'group' && el.groupFixtures?.[g]?.[el.groupRound]) {
      const pf = el.groupFixtures[g][el.groupRound].find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pf) { oppName = getTeam(pf[0] === gameState.playerTeam ? pf[1] : pf[0])?.name || '?'; }
    }
  } else {
    const fixture = getPlayerFixture(gameState);
    if (fixture) {
      const isHome = fixture.home === gameState.playerTeam;
      oppName = getTeam(isHome ? fixture.away : fixture.home)?.name || '?';
      venue = isHome ? 'Home' : 'Away';
      competition = LEAGUES[gameState.playerLeague]?.name || 'League';
    }
  }

  const q = PRESS_CONF_QUESTIONS[Math.floor(Math.random() * PRESS_CONF_QUESTIONS.length)];

  app.innerHTML = `
    <div class="press-conf-screen">
      <div class="pc-match-info">
        <div class="pc-competition">${competition}</div>
        <div class="pc-teams">
          <span>${myTeam.name}</span>
          <span class="pc-vs">vs</span>
          <span>${oppName}</span>
        </div>
        ${venue ? `<div class="pc-venue">${venue === 'Home' ? '🏟 Home' : '✈️ Away'}</div>` : ''}
      </div>

      <div class="pc-card">
        <div class="pc-label">PRE-MATCH PRESS CONFERENCE</div>
        <div class="pc-question">"${q.question}"</div>
        <div class="pc-options">
          ${q.options.map((opt, i) => `
            <button class="pc-option" onclick="choosePressAnswer(${opt.moraleChange})">
              <span class="pc-option-text">${opt.text}</span>
              <span class="pc-option-effect ${opt.cls}">${opt.effect}</span>
            </button>
          `).join('')}
        </div>
        <button class="pc-skip" onclick="choosePressAnswer(0)">Skip press conference →</button>
      </div>
    </div>
  `;
}

function choosePressAnswer(moraleChange) {
  if (moraleChange !== 0) {
    const current = gameState.morale[gameState.playerTeam] || 70;
    gameState.morale[gameState.playerTeam] = Math.max(20, Math.min(100, current + moraleChange));
  }
  showScreen('match-preview');
}

// ─── POST-MATCH PRESS CONFERENCE ──────────────────────────────────────────────
const POST_MATCH_QUESTIONS = {
  win: [
    {
      question: "Excellent result today. What was the key to the performance?",
      options: [
        { text: "Outstanding team effort — everyone was brilliant from first whistle to last.", effect: '+7 morale', moraleChange: 7, cls: 'effect-pos' },
        { text: "We executed the game plan perfectly. Very happy with that.", effect: '+5 morale', moraleChange: 5, cls: 'effect-pos' },
        { text: "We got the three points, but there's still plenty to improve on.", effect: '+1 morale', moraleChange: 1, cls: 'effect-pos' },
      ]
    },
    {
      question: "The fans are buzzing. Any message to the supporters?",
      options: [
        { text: "They were incredible today — they push us to levels we can't reach alone.", effect: '+8 morale', moraleChange: 8, cls: 'effect-pos' },
        { text: "We do it for them every single week. They deserve it.", effect: '+5 morale', moraleChange: 5, cls: 'effect-pos' },
        { text: "Let's stay focused — bigger challenges are still ahead of us.", effect: '+2 morale', moraleChange: 2, cls: 'effect-pos' },
      ]
    },
  ],
  draw: [
    {
      question: "A point shared — is that a fair result?",
      options: [
        { text: "Honestly, we should have won that. A bit of a missed opportunity.", effect: '-2 morale', moraleChange: -2, cls: 'effect-neg' },
        { text: "A fair result on the day. Both teams had their moments.", effect: '+2 morale', moraleChange: 2, cls: 'effect-pos' },
        { text: "We take the point. Every point counts in this league.", effect: '+3 morale', moraleChange: 3, cls: 'effect-pos' },
      ]
    },
    {
      question: "Not quite the result you were looking for. How's the dressing room?",
      options: [
        { text: "We're fine — a draw away from home is always acceptable.", effect: '+3 morale', moraleChange: 3, cls: 'effect-pos' },
        { text: "We're a bit frustrated, but we reset and go again next week.", effect: '±0', moraleChange: 0, cls: 'effect-neu' },
        { text: "Disappointed. We had more than enough chances to win that game.", effect: '-3 morale', moraleChange: -3, cls: 'effect-neg' },
      ]
    },
  ],
  loss: [
    {
      question: "Tough result today. How do you respond to that as a manager?",
      options: [
        { text: "We take full responsibility. We weren't good enough — simple as that.", effect: '+4 morale', moraleChange: 4, cls: 'effect-pos' },
        { text: "Difficult afternoon. We'll regroup and come back stronger.", effect: '+2 morale', moraleChange: 2, cls: 'effect-pos' },
        { text: "Completely unacceptable. That performance was nowhere near our standard.", effect: '-5 morale', moraleChange: -5, cls: 'effect-neg' },
      ]
    },
    {
      question: "What did you tell the players in the dressing room after the final whistle?",
      options: [
        { text: "Head up. Mistakes happen. We learn from this and move on together.", effect: '+5 morale', moraleChange: 5, cls: 'effect-pos' },
        { text: "I told them we need to be better — no excuses, no hiding.", effect: '±0', moraleChange: 0, cls: 'effect-neu' },
        { text: "I was brutally honest — that was nowhere near good enough from anyone.", effect: '-3 morale', moraleChange: -3, cls: 'effect-neg' },
      ]
    },
  ],
};

function goToPostMatchPress(matchResult) {
  gameState._postMatchResult = matchResult;
  showScreen('post-match-press');
}

function renderPostMatchPress(app) {
  const result = gameState._postMatchResult || 'draw';
  const myTeam = getTeam(gameState.playerTeam);

  const pool = POST_MATCH_QUESTIONS[result] || POST_MATCH_QUESTIONS.draw;
  const q = pool[Math.floor(Math.random() * pool.length)];

  const headerBg = result === 'win'
    ? 'linear-gradient(135deg, #052e16, #14532d)'
    : result === 'loss'
      ? 'linear-gradient(135deg, #450a0a, #7f1d1d)'
      : 'linear-gradient(135deg, #0c1a2e, #1e3a5f)';
  const icon = result === 'win' ? '🏆 VICTORY' : result === 'loss' ? '😞 DEFEAT' : '🤝 DRAW';

  app.innerHTML = `
    <div class="press-conf-screen post-match-screen">
      <div class="pc-match-info" style="background:${headerBg}">
        <div class="pc-competition">${icon} — POST-MATCH</div>
        <div class="pc-teams" style="font-size:18px;font-weight:700">${myTeam.name}</div>
      </div>

      <div class="pc-card">
        <div class="pc-label">POST-MATCH PRESS CONFERENCE</div>
        <div class="pc-question">"${q.question}"</div>
        <div class="pc-options">
          ${q.options.map(opt => `
            <button class="pc-option" onclick="choosePostMatchAnswer(${opt.moraleChange})">
              <span class="pc-option-text">${opt.text}</span>
              <span class="pc-option-effect ${opt.cls}">${opt.effect}</span>
            </button>
          `).join('')}
        </div>
        <button class="pc-skip" onclick="choosePostMatchAnswer(0)">Skip →</button>
      </div>
    </div>
  `;
}

function choosePostMatchAnswer(moraleChange) {
  if (moraleChange !== 0) {
    const c = gameState.morale[gameState.playerTeam] || 70;
    gameState.morale[gameState.playerTeam] = Math.max(20, Math.min(100, c + moraleChange));
  }
  advanceAndRefresh();
}

// ─── MATCH PREVIEW — handle FA Cup / Europa ───────────────────────────────────
// Override playMatch to handle cup matches
function playMatch() {
  const tactics = getManagerTactics(gameState);
  const starting11 = getBestEleven(gameState.playerTeam, tactics.formation);

  if (gameState.faCupMatchActive) {
    const data = simulateFaCupPlayerMatch(gameState, tactics);
    if (!data) { showScreen('hub'); return; }
    updatePlayerGameTime(gameState.playerTeam, starting11, gameState);
    saveGame();
    showScreen('match-result', data);
    return;
  }

  if (gameState.clMatchActive) {
    const cl = gameState.championsLeague;
    let data;
    if (cl.phase === 'group') {
      data = simulateCLPlayerMatch(gameState, tactics);
    } else {
      data = simulateCLKnockoutPlayerMatch(gameState, tactics);
    }
    if (!data) { showScreen('hub'); return; }
    updatePlayerGameTime(gameState.playerTeam, starting11, gameState);
    saveGame();
    showScreen('match-result', data);
    return;
  }

  if (gameState.europaMatchActive) {
    const el = gameState.europaLeague;
    let data;
    if (el.phase === 'el_playoff') {
      data = simulateELPlayoffPlayerMatch(gameState, tactics);
    } else if (el.phase === 'group') {
      data = simulateEuropaPlayerMatch(gameState, tactics);
    } else {
      data = simulateEuropaKnockoutPlayerMatch(gameState, tactics);
    }
    if (!data) { showScreen('hub'); return; }
    updatePlayerGameTime(gameState.playerTeam, starting11, gameState);
    saveGame();
    showScreen('match-result', data);
    return;
  }

  const data = simulatePlayerMatch(gameState, tactics);
  if (!data) { showScreen('hub'); return; }
  updatePlayerGameTime(gameState.playerTeam, starting11, gameState);

  // Store replay data for Watch Replay feature
  gameState._replayData = {
    events: data.result.events,
    homeGoals: data.result.homeGoals,
    awayGoals: data.result.awayGoals,
    homeTeamId: data.fixture.home,
    awayTeamId: data.fixture.away,
    isHome: data.isHome,
    matchResult: data.matchResult,
    possession: data.result.possession,
    xG: data.result.xG,
    shots: data.result.shots,
    bigChances: data.result.bigChances
  };

  gameState._postMatchResult = data.matchResult;
  saveGame();
  showScreen('match-result', data);
}

function resolveFaCupAndRefresh(playerWon) {
  resolveFaCupRound(playerWon, gameState);
  gameState.faCupMatchActive = false;
  if (gameState.faCup.winner === gameState.playerTeam) {
    if (!gameState.career) gameState.career = { history: [], hallOfFame: {} };
    gameState.career.hallOfFame.domesticCupWins = (gameState.career.hallOfFame.domesticCupWins || 0) + 1;
    showToast(`🏆 You won the ${gameState.faCup?.name || 'Cup'}!`, 'success');
  } else if (gameState.faCup.playerEliminated) {
    showToast(`Eliminated from the ${gameState.faCup?.name || 'Cup'}.`, 'error');
  }
  saveGame();
  showScreen('hub');
}

// ─── SIMULATE NEXT N GAMES ───────────────────────────────────────────────────
function simulateNextGames(n) {
  const tactics = getManagerTactics(gameState);
  const starting11 = getBestEleven(gameState.playerTeam, tactics.formation);
  const results = [];
  const pt = gameState.playerTeam;
  const preEOSData = gameState.endOfSeasonData;

  for (let i = 0; i < n; i++) {
    const cup = gameState.faCup;
    const cl = gameState.championsLeague;
    const el = gameState.europaLeague;
    let data = null;
    let competition = LEAGUES[gameState.playerLeague]?.name || 'League';

    if (cup && cup.playerMatchPending && !cup.playerEliminated) {
      competition = gameState.faCup?.name || 'Cup';
      data = simulateFaCupPlayerMatch(gameState, tactics);
      if (data) {
        resolveFaCupRound(data.matchResult === 'win', gameState);
        gameState.faCupMatchActive = false;
        if (cup.winner === pt && gameState.career)
          gameState.career.hallOfFame.domesticCupWins = (gameState.career.hallOfFame.domesticCupWins || 0) + 1;
      }
    } else if (cl && cl.playerMatchPending && !cl.playerEliminated) {
      competition = 'Champions League';
      gameState.clMatchActive = true;
      data = cl.phase === 'group'
        ? simulateCLPlayerMatch(gameState, tactics)
        : simulateCLKnockoutPlayerMatch(gameState, tactics);
      gameState.clMatchActive = false;
      if (data && cl.winner === pt && gameState.career)
        gameState.career.hallOfFame.clWins = (gameState.career.hallOfFame.clWins || 0) + 1;
    } else if (el && el.playerMatchPending && !el.playerEliminated) {
      competition = 'Europa League';
      gameState.europaMatchActive = true;
      if (el.phase === 'el_playoff') data = simulateELPlayoffPlayerMatch(gameState, tactics);
      else if (el.phase === 'group') data = simulateEuropaPlayerMatch(gameState, tactics);
      else data = simulateEuropaKnockoutPlayerMatch(gameState, tactics);
      gameState.europaMatchActive = false;
      if (data && el.winner === pt && gameState.career)
        gameState.career.hallOfFame.europaWins = (gameState.career.hallOfFame.europaWins || 0) + 1;
    } else {
      data = simulatePlayerMatch(gameState, tactics);
      if (!data) break;
      updatePlayerGameTime(pt, starting11, gameState);
      advanceMatchweek(gameState);
      if (gameState.endOfSeasonData !== preEOSData) {
        results.push(buildSimResult(data, competition, pt));
        break;
      }
    }

    if (!data) break;
    results.push(buildSimResult(data, competition, pt));
  }

  saveGame();
  if (results.length) showSimResults(results);
  else showScreen('hub');
}

function buildSimResult(data, competition, pt) {
  return {
    competition,
    homeTeam: getTeam(data.fixture?.home)?.name || data.fixture?.home || '?',
    awayTeam: getTeam(data.fixture?.away)?.name || data.fixture?.away || '?',
    homeGoals: data.result?.homeGoals ?? 0,
    awayGoals: data.result?.awayGoals ?? 0,
    isHome: data.isHome,
    matchResult: data.matchResult
  };
}

function showSimResults(results) {
  const app = document.getElementById('app');
  const seasonEnded = !!gameState.endOfSeasonData;
  const w = results.filter(r => r.matchResult === 'win').length;
  const d = results.filter(r => r.matchResult === 'draw').length;
  const l = results.filter(r => r.matchResult === 'loss').length;

  app.innerHTML = `
    <div style="max-width:520px;margin:0 auto;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">⚡ ${results.length} GAME${results.length !== 1 ? 'S' : ''} SIMULATED</h2>
          <div style="font-size:13px;color:var(--muted)">
            <span style="color:#4ade80">${w}W</span> &nbsp;
            <span style="color:#fbbf24">${d}D</span> &nbsp;
            <span style="color:#f87171">${l}L</span>
          </div>
        </div>
        ${seasonEnded
          ? `<button class="btn btn-primary" onclick="showScreen('end-season')">Season Summary →</button>`
          : `<button class="btn btn-secondary" onclick="showScreen('hub')">← Hub</button>`}
      </div>
      ${results.map(r => {
        const color = r.matchResult === 'win' ? '#4ade80' : r.matchResult === 'draw' ? '#fbbf24' : '#f87171';
        const badge = r.matchResult === 'win' ? 'W' : r.matchResult === 'draw' ? 'D' : 'L';
        return `
          <div style="background:var(--card);border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
            <div style="background:${color};color:#000;font-weight:700;font-size:13px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">${badge}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;color:var(--muted);margin-bottom:3px">${r.competition}</div>
              <div style="display:flex;align-items:center;gap:8px;font-size:14px">
                <span style="${r.isHome ? 'font-weight:700' : 'color:var(--muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${r.homeTeam}</span>
                <span style="font-weight:700;font-size:16px;color:${color};flex-shrink:0">${r.homeGoals}–${r.awayGoals}</span>
                <span style="${!r.isHome ? 'font-weight:700' : 'color:var(--muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${r.awayTeam}</span>
              </div>
            </div>
          </div>`;
      }).join('')}
      ${!seasonEnded ? `<button class="btn btn-secondary" style="width:100%;margin-top:8px" onclick="simulateNextGames(5)">⚡ 5 More</button>` : ''}
      ${seasonEnded ? `<p style="text-align:center;color:var(--muted);font-size:12px;margin-top:12px">Season ended</p>` : ''}
    </div>
  `;
}

function resolveEuropaAndRefresh(playerWon) {
  gameState.europaMatchActive = false;
  gameState.elPlayoffActive = false;
  if (gameState.europaLeague?.winner === gameState.playerTeam) {
    if (!gameState.career) gameState.career = { history: [], hallOfFame: {} };
    gameState.career.hallOfFame.europaWins = (gameState.career.hallOfFame.europaWins || 0) + 1;
    showToast('🌟 You won the Europa League!', 'success');
  } else if (gameState.europaLeague?.playerEliminated) {
    showToast('Eliminated from Europa League.', 'error');
  }
  saveGame();
  showScreen('europa-league');
}

// ─── EUROPA LEAGUE SCREEN ─────────────────────────────────────────────────────
function renderEuropa(app) {
  const el = gameState.europaLeague;
  if (!el) { showScreen('end-season'); return; }

  // Handle waiting phase before EL groups start
  if (el.phase === 'waiting_cl_dropdowns') {
    app.innerHTML = `<div class="europa-screen"><div class="europa-header"><div><div class="europa-title">🌟 EUROPA LEAGUE</div><div class="europa-phase">Waiting for Champions League Group Stage</div></div><button class="btn btn-secondary" onclick="showScreen('end-season')">← Season Summary</button></div><div class="europa-body"><div class="europa-elim"><div class="europa-elim-icon">⏳</div><div style="font-size:16px;font-weight:700;margin-bottom:8px">EL groups start after CL group stage finishes</div><div class="muted">Play your Champions League matches first.</div><button class="btn btn-primary" onclick="showScreen('champions-league')" style="margin-top:20px">Go to Champions League</button></div></div></div>`;
    return;
  }

  const isGroupPhase = el.phase === 'group' || el.phase === 'group_complete';
  const phaseLabel = el.phase === 'el_playoff' ? 'EL Playoff'
    : el.phase === 'group' ? `Group Stage — Round ${el.groupRound + 1}/10`
    : el.phase === 'group_complete' ? 'Group Stage Complete'
    : el.phase === 'knockout_sf' ? 'Semi-Finals'
    : el.phase === 'final' ? 'Final'
    : 'Complete';

  function renderGroupTable(groupIndex) {
    const table = getEuropaGroupTable(groupIndex, gameState);
    const groupLetter = groupIndex === 0 ? 'A' : 'B';
    return `
      <div class="europa-group-card">
        <div class="europa-group-title">GROUP ${groupLetter}</div>
        <table class="squad-table" style="font-size:12px">
          <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
          ${table.map((r, i) => `
            <tr class="${r.id === gameState.playerTeam ? 'my-team' : ''}" style="${i < 2 ? 'border-left:3px solid var(--accent2)' : ''}">
              <td>${i + 1}</td>
              <td>${getTeam(r.id)?.name || r.id}</td>
              <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
              <td><strong>${r.points}</strong></td>
            </tr>
          `).join('')}
        </table>
      </div>
    `;
  }

  function renderKnockoutBracket() {
    const sf = el.knockout?.sf;
    const final = el.knockout?.final;
    if (!sf) return '';

    const sfResults = el.knockoutResults?.knockout_sf || [];
    const finalResults = el.knockoutResults?.final || [];

    return `
      <div class="bracket-section">
        <div class="bracket-title">KNOCKOUT BRACKET</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">SEMI-FINALS</div>
        <div class="bracket-pairs">
          ${sf.map(([h, a]) => {
            const res = sfResults.find(r => (r.home === h && r.away === a) || (r.home === a && r.away === h));
            const winner = res?.winner;
            return `
              <div class="bracket-pair">
                <div class="bracket-team ${winner === h ? 'winner' : winner ? 'loser' : ''}">${getTeam(h)?.name || h}</div>
                <div style="font-size:10px;color:var(--muted);text-align:center;padding:2px 0">vs</div>
                <div class="bracket-team ${winner === a ? 'winner' : winner ? 'loser' : ''}">${getTeam(a)?.name || a}</div>
              </div>
            `;
          }).join('')}
          ${sfResults.length >= 2 && final ? `
            <div style="display:flex;align-items:center;font-size:18px;color:var(--muted)">→</div>
            <div class="bracket-pair" style="border-color:var(--accent)">
              <div class="bracket-team ${finalResults[0]?.winner === final[0] ? 'winner' : finalResults.length ? 'loser' : ''}">${getTeam(final[0])?.name || '?'}</div>
              <div style="font-size:10px;color:var(--muted);text-align:center;padding:2px 0">FINAL</div>
              <div class="bracket-team ${finalResults[0]?.winner === final[1] ? 'winner' : finalResults.length ? 'loser' : ''}">${getTeam(final[1])?.name || '?'}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderNextMatchCard() {
    if (el.playerEliminated) return `
      <div class="europa-elim">
        <div class="europa-elim-icon">😔</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Europa League campaign over</div>
        <div class="muted">You were eliminated. ${el.winner ? `${getTeam(el.winner)?.name} won the Europa League.` : ''}</div>
        <button class="btn btn-secondary" onclick="showScreen('end-season')" style="margin-top:20px">← Back to Season Summary</button>
      </div>
    `;

    if (el.phase === 'complete') return `
      <div class="europa-winner-banner">
        <div style="font-size:48px;margin-bottom:12px">🌟</div>
        <div class="europa-winner-title">EUROPA LEAGUE CHAMPIONS!</div>
        <div style="margin-top:12px;color:#c4b5fd">${getTeam(gameState.playerTeam)?.name}</div>
        <button class="btn btn-primary" onclick="showScreen('end-season')" style="margin-top:20px">← Back to Season Summary</button>
      </div>
    `;

    if (el.phase === 'el_playoff' && el.playerMatchPending) {
      const pair = el.playoffPairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pair) {
        const isHome = pair[0] === gameState.playerTeam;
        const oppId = isHome ? pair[1] : pair[0];
        const opp = getTeam(oppId);
        return `
          <div class="europa-next-match">
            <div class="europa-next-title">🌟 EL PLAYOFF — MATCH PENDING</div>
            <div class="europa-matchup"><span>${getTeam(gameState.playerTeam)?.name}</span><span class="ev">vs</span><span>${opp?.name || '?'}</span></div>
            <div class="muted" style="margin-bottom:20px">${isHome ? '🏟 Home' : '✈️ Away'}</div>
            <button class="btn btn-primary" style="background:linear-gradient(135deg,#2563eb,#7c3aed)" onclick="goToEuropaMatch()">SET TACTICS & PLAY</button>
          </div>`;
      }
    }

    if (!el.playerMatchPending) return `
      <div class="europa-next-match">
        <div class="europa-next-title">WAITING FOR MATCHES TO BE SCHEDULED</div>
        <p class="muted">Simulating other games...</p>
        <button class="btn btn-secondary" onclick="showScreen('end-season')" style="margin-top:16px">← Back to Season Summary</button>
      </div>
    `;

    // Get next opponent
    let oppId, isHome, matchLabel;
    if (el.phase === 'group') {
      const g = el.playerGroup;
      const pf = el.groupFixtures?.[g]?.[el.groupRound]?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pf) {
        isHome = pf[0] === gameState.playerTeam;
        oppId = isHome ? pf[1] : pf[0];
        matchLabel = `Group ${el.playerGroup === 0 ? 'A' : 'B'} — Round ${el.groupRound + 1}`;
      }
    } else {
      const pairs = el.phase === 'knockout_sf' ? el.knockout?.sf : [el.knockout?.final];
      const pair = pairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pair) {
        isHome = pair[0] === gameState.playerTeam;
        oppId = isHome ? pair[1] : pair[0];
        matchLabel = el.phase === 'knockout_sf' ? 'Semi-Final' : 'Final';
      }
    }

    const opp = getTeam(oppId);
    return `
      <div class="europa-next-match">
        <div class="europa-next-title">🌟 NEXT — ${matchLabel?.toUpperCase() || 'MATCH'}</div>
        <div class="europa-matchup">
          <span>${getTeam(gameState.playerTeam)?.name}</span>
          <span class="ev">vs</span>
          <span>${opp?.name || '?'}</span>
        </div>
        <div class="muted" style="margin-bottom:20px">${isHome ? '🏟 Home' : '✈️ Away'}</div>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,#2563eb,#7c3aed)"
          onclick="goToEuropaMatch()">SET TACTICS & PLAY</button>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="europa-screen">
      <div class="europa-header">
        <div>
          <div class="europa-title">🌟 EUROPA LEAGUE</div>
          <div class="europa-phase">${phaseLabel}</div>
        </div>
        <button class="btn btn-secondary" onclick="showScreen('end-season')">← Season Summary</button>
      </div>
      <div class="europa-body">
        ${el.phase === 'el_playoff' ? `<div class="europa-groups" style="padding:16px"><h4 style="color:var(--muted);margin-bottom:12px">EL PLAYOFF DRAW</h4>${(el.playoffPairs||[]).map(([h,a])=>`<div class="bracket-pair" style="margin-bottom:8px"><div class="bracket-team">${getTeam(h)?.name||h}</div><div style="font-size:10px;color:var(--muted);text-align:center;padding:2px">vs</div><div class="bracket-team">${getTeam(a)?.name||a}</div></div>`).join('')}</div>` : ''}
      ${isGroupPhase && el.phase !== 'el_playoff' ? `<div class="europa-groups">${renderGroupTable(0)}${renderGroupTable(1)}</div>` : ''}
        ${!isGroupPhase && el.phase !== 'el_playoff' ? renderKnockoutBracket() : ''}
        ${renderNextMatchCard()}
      </div>
    </div>
  `;
}

function goToEuropaMatch() {
  gameState.europaMatchActive = true;
  showScreen('press-conference');
}

// ─── FINANCES HELPER (FFP warning in transfers) ───────────────────────────────
function getFfpWarning(gameState, newPlayerOverall) {
  const team = getTeam(gameState.playerTeam);
  const weeklyWages = getWeeklyWageCost(team);
  const newWage = Math.round(Math.max(0, newPlayerOverall - 50) * 60);
  const projected = (weeklyWages + newWage) * 50;
  const budget = gameState.budgets[gameState.playerTeam] || 0;
  if (projected > budget * 1.8 && team.prestige >= 75) {
    return `<div class="ffp-warning">⚠️ FFP Warning: projected wages ${formatMoney(projected)}/season may exceed financial limits.</div>`;
  }
  return '';
}

// ─── CHAMPIONS LEAGUE PENDING CARD ────────────────────────────────────────────────────
function renderCLPendingCard(gameState) {
  const cl = gameState.championsLeague;
  if (!cl || !cl.playerMatchPending || cl.playerEliminated) return '';

  let oppId, isHome, matchLabel;
  if (cl.phase === 'group') {
    const g = cl.playerGroup;
    const pf = cl.groupFixtures?.[g]?.[cl.groupRound]?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
    if (!pf) return '';
    isHome = pf[0] === gameState.playerTeam;
    oppId = isHome ? pf[1] : pf[0];
    matchLabel = `Group ${['A','B','C','D'][g]} — Round ${cl.groupRound + 1}`;
  } else {
    const pairs = cl.phase === 'knockout_qf' ? cl.knockout?.qf : cl.phase === 'knockout_sf' ? cl.knockout?.sf : [cl.knockout?.final];
    const pair = pairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
    if (!pair) return '';
    isHome = pair[0] === gameState.playerTeam;
    oppId = isHome ? pair[1] : pair[0];
    matchLabel = cl.phase === 'knockout_qf' ? 'Quarter-Final' : cl.phase === 'knockout_sf' ? 'Semi-Final' : 'Final';
  }

  const opp = getTeam(oppId);
  return `
    <div class="facup-pending" style="border-color:#1d4ed8">
      <h4>🏆 CHAMPIONS LEAGUE — MATCH PENDING</h4>
      <div class="facup-round-badge">${matchLabel.toUpperCase()}</div>
      <div class="next-fixture" style="margin-bottom:8px">
        <span class="nf-team ${isHome ? 'active' : ''}">${getTeam(gameState.playerTeam).name}</span>
        <span class="nf-vs">vs</span>
        <span class="nf-team ${!isHome ? 'active' : ''}">${opp?.name || 'Unknown'}</span>
      </div>
      <div class="nf-venue" style="color:#93c5fd;margin-bottom:12px">${isHome ? '🏟 Home' : '✈️ Away'}</div>
      <button class="btn btn-primary" style="background:linear-gradient(135deg,#1d4ed8,#1e40af)" onclick="goToCLMatch()">SET TACTICS & PLAY CL</button>
    </div>
  `;
}

function renderELPlayoffPendingCard(gameState) {
  const el = gameState.europaLeague;
  if (!el || el.phase !== 'el_playoff' || !el.playerMatchPending || el.playerEliminated) return '';

  const pair = el.playoffPairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
  if (!pair) return '';

  const isHome = pair[0] === gameState.playerTeam;
  const oppId = isHome ? pair[1] : pair[0];
  const opp = getTeam(oppId);

  return `
    <div class="facup-pending" style="border-color:#7c3aed">
      <h4>🌟 EUROPA LEAGUE PLAYOFF — MATCH PENDING</h4>
      <div class="facup-round-badge">EL PLAYOFF</div>
      <div class="next-fixture" style="margin-bottom:8px">
        <span class="nf-team ${isHome ? 'active' : ''}">${getTeam(gameState.playerTeam).name}</span>
        <span class="nf-vs">vs</span>
        <span class="nf-team ${!isHome ? 'active' : ''}">${opp?.name || 'Unknown'}</span>
      </div>
      <div class="nf-venue" style="color:#c4b5fd;margin-bottom:12px">${isHome ? '🏟 Home' : '✈️ Away'}</div>
      <button class="btn btn-primary" style="background:linear-gradient(135deg,#7c3aed,#5b21b6)" onclick="goToEuropaMatch()">SET TACTICS & PLAY EL PLAYOFF</button>
    </div>
  `;
}

function goToCLMatch() {
  gameState.clMatchActive = true;
  showScreen('press-conference');
}

function resolveCLAndRefresh(playerWon) {
  gameState.clMatchActive = false;
  const cl = gameState.championsLeague;
  if (cl?.winner === gameState.playerTeam) {
    if (!gameState.career) gameState.career = { history: [], hallOfFame: {} };
    gameState.career.hallOfFame.clWins = (gameState.career.hallOfFame.clWins || 0) + 1;
    showToast('🏆 You won the Champions League!', 'success');
  } else if (cl?.playerEliminated) {
    showToast('Eliminated from Champions League.', 'error');
  }
  saveGame();
  showScreen('champions-league');
}

// ─── CHAMPIONS LEAGUE SCREEN ──────────────────────────────────────────────────────────────
function renderCL(app) {
  const cl = gameState.championsLeague;
  if (!cl) { showScreen('end-season'); return; }

  const isGroupPhase = cl.phase === 'group' || cl.phase === 'group_complete';
  const phaseLabel = cl.phase === 'group' ? `Group Stage — Round ${cl.groupRound + 1}/10`
    : cl.phase === 'group_complete' ? 'Group Stage Complete'
    : cl.phase === 'knockout_qf' ? 'Quarter-Finals'
    : cl.phase === 'knockout_sf' ? 'Semi-Finals'
    : cl.phase === 'final' ? 'Final'
    : 'Complete';

  function renderCLGroupTable(groupIndex) {
    const table = getCLGroupTable(groupIndex, gameState);
    const groupLetter = ['A','B','C','D'][groupIndex];
    return `
      <div class="europa-group-card">
        <div class="europa-group-title">GROUP ${groupLetter}</div>
        <table class="squad-table" style="font-size:12px">
          <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
          ${table.map((r, i) => `
            <tr class="${r.id === gameState.playerTeam ? 'my-team' : ''}" style="${i < 2 ? 'border-left:3px solid var(--accent)' : i === 2 ? 'border-left:3px solid #f59e0b' : ''}">
              <td>${i + 1}</td>
              <td>${getTeam(r.id)?.name || r.id}</td>
              <td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td>
              <td><strong>${r.points}</strong></td>
            </tr>
          `).join('')}
        </table>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">Blue border = QF · Yellow = EL Playoff</div>
      </div>
    `;
  }

  function renderCLKnockoutBracket() {
    const phase = cl.phase;
    const qf = cl.knockout?.qf;
    const sf = cl.knockout?.sf;
    const final = cl.knockout?.final;
    const qfResults = cl.knockoutResults?.knockout_qf || [];
    const sfResults = cl.knockoutResults?.knockout_sf || [];
    const finalResults = cl.knockoutResults?.final || [];

    if (!qf) return '';

    function renderPairs(pairs, results, label) {
      return `
        <div style="font-size:11px;color:var(--muted);margin:12px 0 4px">${label}</div>
        <div class="bracket-pairs">
          ${pairs.map(([h, a]) => {
            const res = results.find(r => (r.home === h && r.away === a) || (r.home === a && r.away === h));
            const winner = res?.winner;
            return `
              <div class="bracket-pair">
                <div class="bracket-team ${winner === h ? 'winner' : winner ? 'loser' : ''}">${getTeam(h)?.name || h}</div>
                <div style="font-size:10px;color:var(--muted);text-align:center;padding:2px 0">vs</div>
                <div class="bracket-team ${winner === a ? 'winner' : winner ? 'loser' : ''}">${getTeam(a)?.name || a}</div>
              </div>`;
          }).join('')}
        </div>`;
    }

    return `
      <div class="bracket-section">
        <div class="bracket-title">KNOCKOUT BRACKET</div>
        ${phase === 'knockout_qf' || qfResults.length > 0 ? renderPairs(qf, qfResults, 'QUARTER-FINALS') : ''}
        ${sf ? renderPairs(sf, sfResults, 'SEMI-FINALS') : ''}
        ${final ? `
          <div style="font-size:11px;color:var(--muted);margin:12px 0 4px">FINAL</div>
          <div class="bracket-pairs">
            <div class="bracket-pair" style="border-color:var(--accent)">
              <div class="bracket-team ${finalResults[0]?.winner === final[0] ? 'winner' : finalResults.length ? 'loser' : ''}">${getTeam(final[0])?.name || '?'}</div>
              <div style="font-size:10px;color:var(--muted);text-align:center;padding:2px 0">FINAL</div>
              <div class="bracket-team ${finalResults[0]?.winner === final[1] ? 'winner' : finalResults.length ? 'loser' : ''}">${getTeam(final[1])?.name || '?'}</div>
            </div>
          </div>` : ''}
      </div>`;
  }

  function renderCLNextMatchCard() {
    if (cl.playerEliminated) return `
      <div class="europa-elim">
        <div class="europa-elim-icon">😭</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Champions League campaign over</div>
        <div class="muted">You were eliminated. ${cl.winner ? `${getTeam(cl.winner)?.name} won the Champions League.` : ''}</div>
        <button class="btn btn-secondary" onclick="showScreen('end-season')" style="margin-top:20px">← Back to Season Summary</button>
      </div>`;

    if (cl.phase === 'complete') return `
      <div class="europa-winner-banner">
        <div style="font-size:48px;margin-bottom:12px">🏆</div>
        <div class="europa-winner-title">CHAMPIONS LEAGUE WINNERS!</div>
        <div style="margin-top:12px;color:#93c5fd">${getTeam(gameState.playerTeam)?.name}</div>
        <button class="btn btn-primary" onclick="showScreen('end-season')" style="margin-top:20px">← Back to Season Summary</button>
      </div>`;

    if (!cl.playerMatchPending) return `
      <div class="europa-next-match">
        <div class="europa-next-title">WAITING FOR MATCHES TO BE SCHEDULED</div>
        <p class="muted">Simulating other games...</p>
        <button class="btn btn-secondary" onclick="showScreen('end-season')" style="margin-top:16px">← Back to Season Summary</button>
      </div>`;

    let oppId, isHome, matchLabel;
    if (cl.phase === 'group') {
      const g = cl.playerGroup;
      const pf = cl.groupFixtures?.[g]?.[cl.groupRound]?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pf) {
        isHome = pf[0] === gameState.playerTeam;
        oppId = isHome ? pf[1] : pf[0];
        matchLabel = `Group ${['A','B','C','D'][g]} — Round ${cl.groupRound + 1}`;
      }
    } else {
      const pairs = cl.phase === 'knockout_qf' ? cl.knockout?.qf : cl.phase === 'knockout_sf' ? cl.knockout?.sf : [cl.knockout?.final];
      const pair = pairs?.find(([h, a]) => h === gameState.playerTeam || a === gameState.playerTeam);
      if (pair) {
        isHome = pair[0] === gameState.playerTeam;
        oppId = isHome ? pair[1] : pair[0];
        matchLabel = cl.phase === 'knockout_qf' ? 'Quarter-Final' : cl.phase === 'knockout_sf' ? 'Semi-Final' : 'Final';
      }
    }

    const opp = getTeam(oppId);
    return `
      <div class="europa-next-match">
        <div class="europa-next-title">🏆 NEXT — ${matchLabel?.toUpperCase() || 'MATCH'}</div>
        <div class="europa-matchup">
          <span>${getTeam(gameState.playerTeam)?.name}</span>
          <span class="ev">vs</span>
          <span>${opp?.name || '?'}</span>
        </div>
        <div class="muted" style="margin-bottom:20px">${isHome ? '🏟 Home' : '✈️ Away'}</div>
        <button class="btn btn-primary" style="background:linear-gradient(135deg,#1d4ed8,#1e40af)"
          onclick="goToCLMatch()">SET TACTICS & PLAY</button>
      </div>`;
  }

  app.innerHTML = `
    <div class="europa-screen">
      <div class="europa-header" style="background:linear-gradient(135deg,rgba(29,78,216,0.2),rgba(30,64,175,0.1))">
        <div>
          <div class="europa-title" style="color:#93c5fd">🏆 CHAMPIONS LEAGUE</div>
          <div class="europa-phase">${phaseLabel}</div>
        </div>
        <button class="btn btn-secondary" onclick="showScreen('end-season')">← Season Summary</button>
      </div>
      <div class="europa-body">
        ${isGroupPhase ? `<div class="europa-groups">${renderCLGroupTable(0)}${renderCLGroupTable(1)}${renderCLGroupTable(2)}${renderCLGroupTable(3)}</div>` : ''}
        ${!isGroupPhase ? renderCLKnockoutBracket() : ''}
        ${renderCLNextMatchCard()}
      </div>
    </div>
  `;
}
