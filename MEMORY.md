# MEMORY.md — Project State

*Last updated: 2026-03-18 (Sessão 11 — completa)*

-----

## What this project is

Football Manager no browser — Premier League + Championship com promoção/relegação, squad management, simulação de jogos, transferências, tudo. Experimento de vibe coding entre Dany e Claude Code.

**12,291 linhas de código. Vanilla JS puro. Zero frameworks.**

-----

## Current state

Sessão 11 completa. Contracts system, Recall from Loan, Infraestrutura, Patrocínios e Marketing implementados.

-----

## What's done

### Core Engine
- [x] `dataEPL.js` — 44 equipas EPL/Championship com ~900 jogadores hand-crafted, stats por posição, potential, valores realistas. Define `makePlayer`, `pid()`, `LEAGUES`, `TEAM_MAP`, `ALL_TEAMS`, `COUNTRY_CONFIG`, `makeTeamSquad`, `makeNameFor`.
- [x] `engine.js` — simulação minuto a minuto, stats individuais, traits como multiplicadores, staff effects, upset factor 0.88–1.12, stadium capacity dinâmica para gate receipts
- [x] `season.js` — fixtures, tabelas, promoção/relegação, seasons infinitas, career, retirements, regens, cup, Europa, CL, AI bids, loans, contracts, infra timers, sponsor income, marketing ticks

### Sessão 11 — Contracts + Recall + Infraestrutura + Patrocínios + Marketing

#### Contracts System
- `p.contract` (1-3yr) decrementado em `processRetirements` cada season
- Players com `contract <= 0` libertados para FREE_AGENTS no `startNewSeason` com notificação
- `generateContractDemands(gameState)` em season.js — chamado em `advanceMatchweek`:
  - Morale < 45 + 5 jogos no banco → wage demand
  - Morale < 30 + 8 jogos no banco + OVR ≥ 72 → escalado para transfer request
- `gameState.contractDemands = [{ id, playerId, playerName, playerPos, playerOvr, type, wageIncrease }]`
- Hub: card `📋 PLAYER DEMANDS` (amber) com Accept/Reject/Sell buttons
- Squad: coluna CTR com badge (verde=3yr+, amarelo=1yr, vermelho=EXP)
- Player modal: barra com contract years + wage + morale + botão Renew (≤2yr)
- `renewContract`, `acceptWageDemand`, `rejectWageDemand`, `sellUnhappyPlayer` em manager.js

#### Recall from Loan
- `sendPlayerOnLoan` agora guarda `p.loanWeek = currentRound`
- `calculateRecallFee(player, gameState)`:
  - Base por OVR: OVR 68-: £25k | 68-72: £70k | 73-77: £160k | 78-82: £350k | 83-87: £700k | 88+: £1.2m
  - Multiplicado por `remainingRatio` (quanto do loan falta) → menos tempo = fee menor
  - Mínimo sempre £5k
- Player modal `outOnLoan` agora tem botão ↩️ Recall inline
- Modal mostra: weeks left, fee, budget, aviso de sem +1 OVR
- Confirm desativado se budget insuficiente

#### Infraestrutura (3 edifícios, 4 tiers)
- `INFRA_DATA` em manager.js — stadium / trainingGround / youthAcademy
- `gameState.infrastructure = { stadium: 0, trainingGround: 0, youthAcademy: 0, building: null }`
- `building = { type, completeSeason }` — um upgrade de cada vez
- **Stadium**: capacity bonus +8k/+20k/+40k → mais gate receipts. `getStadiumCapacity(gameState)` usado em engine.js
- **Training Ground**: +1/+2/+3 OVR extra por player em `completeTraining`
- **Youth Academy**: +2/+4/+6 OVR e +3/+5/+8 POT nos prospects em `generateYouthMarket`
- Custos: Stadium £6M/£18M/£45M | Training £3M/£9M/£22M | Youth £2.5M/£7M/£16M
- `upgradeInfrastructure(gameState, type)` → debita budget, inicia timer
- `startNewSeason` completa construção se `gameState.season >= building.completeSeason`

#### Patrocínios (3 slots, contratos 2-3 seasons)
- `SPONSOR_POOL` em manager.js — 3 slots × 3 tiers × ~20 sponsors cada = ~80+ sponsors únicos
  - **Main Shirt**: Bet365/William Hill (low rep) → AIA/EA Sports/Standard Chartered (mid) → Emirates/Qatar Airways/Mastercard (high)
  - **Kit Manufacturer**: Hummel/Kappa/Umbro (low) → Puma/New Balance/Under Armour (mid) → Nike/Adidas (high)
  - **Regional Partner**: City Motors/Regional Bank (low) → Specsavers/Carabao/eToro (mid) → Amazon/Barclays/Samsung (high)
- `generateSponsorOffers(gameState)` — 3 ofertas por slot, pool baseado em rep (rep<57→tier1, rep<72→tier1+2, rep≥72→tier2+3)
- `signSponsor(gameState, offerId, slot)` — assina e guarda em `gameState.sponsorships`
- `gameState.sponsorships = { main: {...}, kit: {...}, regional: {...} }` — null = slot vazio
- Income pago semanalmente em `advanceMatchweek`
- `startNewSeason`: decrementa `seasonsLeft`, liberta expirados, gera novas ofertas
- Hub: banner verde `💼 New sponsor offers available` quando há slots sem sponsor
- Offers renovadas apenas quando slot fica vazio

#### Marketing (1 campanha por season)
- `MARKETING_CAMPAIGNS` em manager.js — 3 tipos, custo por tier de rep:
  - **Fan Engagement** (£350k-600k): +25% attendance por 10 semanas
  - **Social Media Blitz** (£500k-850k): +6 rep imediato + £20k/wk extra por 8 semanas
  - **Commercial Push** (£700k-1.2M): +£40k/wk extra por 12 semanas
- `launchMarketing(gameState, campaignId)` — máx 1/season, debita budget
- `getCampaignCost(campaignId, gameState)` — preço baseado em rep tier
- Fan Engagement: `getStadiumCapacity` usa `attBoost` multiplicador em engine.js
- Ticked semanalmente em `advanceMatchweek`, notifica quando acaba

#### Screen Club (🏟️ Club no nav)
- 3 tabs: 🏗️ Infrastructure | 💼 Sponsorships | 📣 Marketing
- `renderClub`, `renderClubInfraTab`, `renderClubSponsorsTab`, `renderClubMarketingTab` em ui.js
- `infraUpgradeConfirm`, `signSponsorConfirm`, `launchMarketingConfirm` com modais de confirmação

### Sessão 10 — Staff Técnico + Player Traits

#### Player Traits
- **18 traits** em `TRAITS` (manager.js): clinical, poacher, longshot, speedster, header, playmaker, btb, engine, rock, pkstopper, aerial, clutch, biggame, consistent, form, captain_mat, injury_prone, hotheaded, temperamental
- 3 categorias: verde (ataque), azul (meio/defesa), dourado (mental), vermelho (negativos)
- `assignRandomTraits(player)` — 53% nada, 32% 1, 12% 2, 3% 3. Negativos 3-8%.
- `TRAIT_POOLS` por posição
- Efeitos no engine: multiplicadores em `playerAttackContrib` / `playerDefenseContrib`
- injury_prone: +1w lesão. engine trait: reduz fatiga. Trait earning via `checkTraitEarning` (endSeason)
- UI: trait pills em todos os player modals, icons `trait-xs` nas tables

#### Staff Técnico
- **6 roles**: Assistant Manager 🧠, Fitness Coach 💪, Physio 🏥, Youth Coach 🌱, Scout 🔭, Set Piece Coach 🎯
- Quality 40-95, wages £5k-65k/wk, hire cost £50k-650k
- Efeitos: morale/training/injuries/youth ticks/scout visibility/penalties+FK
- `gameState.staff`, `gameState.staffMarket` (18-24 candidatos, regenerados por season)
- Staff wages debitados em `advanceMatchweek`
- Screen "👔 Staff" no nav

### Sessão 9 — Youth + Training + Loans
- [x] Youth Market (30-49 prospects/season, ages 14-17, OVR/POT realistas)
- [x] Youth Academy page (sign, train, promote) — 5 ticks/matchweek cap
- [x] Team Training — 6 drills assíncronos (5-7 semanas)
- [x] Loan out own players (outOnLoan, +1 OVR on return)
- [x] Bugfix: skip replay, youth IDs NaN

### Sessão 8 — Match Engine Rewrite
- [x] Simulação minuto a minuto, stats individuais por posição, chance tiers, goal types
- [x] Penaltis (22%/18%, 75% conv), Free Kicks (14%/11%, 15% conv)
- [x] Upset factor 0.88–1.12 por equipa por jogo
- [x] Match stats bars (Possession/Shots/xG/Big Chances), replay ao vivo

### Sessões 5-7 — Multi-league + CL + EL + UI
- [x] 5 países, 9 ligas, real players em todas
- [x] Champions League (20 teams, groups + knockout), Europa League (expandida com CL dropdowns)
- [x] European result tracking na career history
- [x] Free Agents tab, Loans OVR cap, Max Price filter
- [x] Mobile responsive (2 breakpoints)
- [x] Player modal (stats bars, traits, contract, morale)
- [x] Save/Load, Manager Reputation, Player Happiness

### Sessões 2-4 — Core Features
- [x] Injuries, Form streak, Pre/Post match press conference
- [x] Finanças (salários, gate receipts, FFP), Domestic Cup, Europa League base
- [x] Loan system (in), AI bidding, Sim to Last Matchweek
- [x] Match Replay (14s, eventos, skip), Scouting report
- [x] Manager Reputation (0-100), Player Happiness (matchesWithoutPlay)

-----

## gameState structure (campos relevantes)

```js
gameState = {
  playerTeam, playerLeague, playerCountry,
  season, currentRound{}, budgets{}, morale{}, fixtures{},
  // Staff
  staff: { assistantManager, fitnessCoach, physio, youthCoach, scout, setPieceCoach }, // null = vazio
  staffMarket: [...],
  // Contracts & Demands
  contractDemands: [{ id, playerId, playerName, playerPos, playerOvr, type, wageIncrease, newWage }],
  // Infrastructure
  infrastructure: { stadium: 0-3, trainingGround: 0-3, youthAcademy: 0-3, building: { type, completeSeason } | null },
  // Sponsorships
  sponsorships: { main: { name, weeklyIncome, seasonsLeft }, kit: {...}, regional: {...} },  // null = vazio
  sponsorOffers: { main: [...], kit: [...], regional: [...] },
  // Marketing
  marketing: { activeCampaign: { ...campaign, weeksLeft, weeksActive }, campaignsThisSeason: 0 },
  // Youth
  youthSquad: [...], youthMarket: [...], youthTrainingTicks: 0,
  // Transfers
  aiBids: [...], transferWindowOpen: bool,
  // Career
  career: { hallOfFame: {...}, history: [...] },
  managerReputation: 0-100,
  // Notifications
  notification, newInjuries, unhappyNotifications,
}
```

-----

## Script load order

```
dataEPL → dataLaLiga → dataSerieA → dataBundesliga → dataLigaPortugal → engine → season → manager → ui → script
```

TRAITS, STAFF_ROLES, INFRA_DATA, SPONSOR_POOL, MARKETING_CAMPAIGNS definidos em manager.js — chamados de season.js/engine.js em runtime (ok, global scope).

-----

## Key decisions

- `getStadiumCapacity(gameState)` usado em engine.js — retorna `team.capacity + infraBonus`
- Stadium infra só afeta jogos em casa do player (AI não beneficia)
- Marketing `attBoost` aplicado em engine.js como multiplicador de capacity
- Sponsor offers geradas em `initSeason` (first load) e `startNewSeason` (cada nova season)
- Uma construção de cada vez — `infra.building` bloqueia novas upgrades
- Construction timer em seasons, não semanas — completa em `startNewSeason` quando `season >= completeSeason`
- Recall fee: `baseFee × remainingRatio × 1.1`, mínimo £5k, sem +1 OVR se recall antecipado
- Contract demand: só jogadores OVR ≥ 65, não lesionados, não em loan
- Wage demand threshold: morale < 45 + 5 matchesWithoutPlay
- Transfer request threshold: morale < 30 + 8 matchesWithoutPlay + OVR ≥ 72
- Sponsor pool baseado em rep: <57 → tier1, <72 → tier1+2, ≥72 → tier2+3
- Sponsor income pago semanalmente em advanceMatchweek (positivo, ao contrário de wages)
- Max 1 campanha de marketing por season, reseta em startNewSeason
- `formatMoney` definido em ui.js mas acessível em manager.js (global scope)

-----

## Known issues / tech debt

- Europa League: se player não qualifica, botão não aparece (correto por design)
- Replays só para jogos de liga (correto)
- `renderFullTable` usa fallback zones se liga não carregada

-----

## Next session ideas

1. Transfer negotiation — contra-oferta, múltiplas rondas
2. Pre-season friendlies — 2-3 jogos antes da season
3. News feed — ticker no hub: "X signed by Y", "Z injured"
4. Moody/temperamental trait — benching threshold 3 jogos, efeito no morale
5. Clutch/biggame trait — efeito em cup matches (detectar via gameState flag)
6. Hot-headed trait — maior risco de cartão em simulateMatch

-----

## Project structure

```
test2/
├── index.html                  (23 linhas)
├── style.css                   (1536 linhas)
├── MEMORY.md
├── js/
│   ├── script.js               (5 linhas — entry point)
│   ├── dataEPL.js              (1010 linhas — EPL/Championship + globals)
│   ├── dataLaLiga.js           (831 linhas)
│   ├── dataSerieA.js           (815 linhas)
│   ├── dataBundesliga.js       (737 linhas)
│   ├── dataLigaPortugal.js     (491 linhas)
│   ├── engine.js               (571 linhas — simulação)
│   ├── season.js               (~1800 linhas — progressão, contratos, infra, sponsors)
│   ├── manager.js              (~850 linhas — táticas, transfers, traits, staff, infra, sponsors)
│   └── ui.js                   (~4000 linhas — todos os ecrãs)
```
