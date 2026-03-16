# MEMORY.md — Project State

*Last updated: 2026-03-15 (Sessão 5 — completa)*

-----

## What this project is

Football Manager no browser — Premier League + Championship com promoção/relegação, squad management, simulação de jogos, transferências, tudo. Experimento de vibe coding entre Dany e Claude Code.

-----

## Current session goal

Sessão 5 completa. Multi-league system implementado (5 países / 9 ligas).

-----

## What's done

### Core Engine
- [x] `dataEPL.js` — 44 equipas EPL/Championship com ~900 jogadores hand-crafted, stats por posição, potential, valores realistas. Define `makePlayer`, `pid()`, `LEAGUES`, `TEAM_MAP`, `ALL_TEAMS`, `COUNTRY_CONFIG`, `makeTeamSquad`, `makeNameFor`.
- [x] `engine.js` — attack/defense calculados separadamente, pesos por posição, modificadores táticos, form streak morale, injuries (com return de jogadores lesionados), wage cost helper
- [x] `season.js` — fixtures round-robin, tabelas, promoção/relegação, seasons infinitas, career tracking, retirements, regens, domestic cup, Europa League, simulateToLastMatchweek, AI bids, loan returns

### Táticas
- [x] `FORMATION_DISPLAY` — rows top→bottom (ataque→defesa), flatten para slot list sem duplicados
- [x] `POS_FALLBACKS` — chains de fallback para todas as posições
- [x] `getBestEleven` — skip injured, retorna array ordenado por slot, rendering consome sequencialmente
- [x] Opções táticas com efeito real: Mentality, Defensive Line, Pressing, Width, Passing Style, Tempo
- [x] Set Pieces: Captain (morale boost), Penalty Taker, Free Kick Taker, Corner Taker
- [x] Tactics page — pitch visual à esquerda + painel de opções à direita + Team Analytics abaixo pitch

### UI / UX
- [x] Todas as screens: main menu, team picker, hub, squad, tactics, press-conference, post-match-press, match preview, match result, table, fixtures, transfers (tabs), stats, end-of-season, career, europa-league
- [x] Screen fade-in transition em todas as screens
- [x] Modais custom para sell/buy/loan/confirm
- [x] Toasts (success/error, 3s)
- [x] Career page — Hall of Fame + histórico de seasons
- [x] Matchup Card no Hub — mini pitch + barras ATK/MID/DEF/GK
- [x] Team Analytics na Tactics page — form dots, morale, fitness, avg goals, top scorer
- [x] Recent Results no lado direito (abaixo mini table)

### Sessão 2 — Features
- [x] **Injuries** — 12% chance/equipa/jogo, 1-3 semanas. Badge 🤕 Xw na squad page. getBestEleven skip injured.
- [x] **Form streak** — últimos 3 resultados: win streak ≥2 → +2 morale extra; loss streak ≤-2 → -2 extra
- [x] **Pre-match Press Conference** — screen antes de cada jogo (liga, FA Cup, Europa). 5 questões random, 3 opções, efeito no morale. Botão "Skip".
- [x] **Finanças** — salários automáticos cada matchweek `(ovr-50)*60`/jogador. Gate receipts `attendance*2` em casa. FFP bloqueia transfer se projected wages > budget×1.8.
- [x] **Domestic Cup** — 16 teams (top 12 div1 + top 4 div2 por prestige). R16/QF/SF/Final. Trigger weeks dinâmicos (21%/42%/63%/84% do total de matchweeks — escala para 18/20/22 equipas). Card dourado no hub. Empates → extra time coin flip.
- [x] **Europa League** — top 2 de todas as 5 ligas div1 = 10 teams. 2 grupos de 5, 8 rondas de grupo. Knockout: SF + Final.
- [x] **Sim to Last Matchweek** — simula tudo deixando apenas o último jogo à mão. Modal de confirmação.

### Sessão 4 — Features novas
- [x] **Manager reputation** — `gameState.managerReputation` 0-100, começa em 50. Sobe com títulos (+15), promoção (+10), FA Cup (+8), Europa (+12), top finish. Desce com relegação (-15). Label: Unknown/Promising/Established/Renowned/Elite/Legendary. Visível no hub topbar e career HoF. Afeta AI transfer acceptance: `threshold = 0.3 + (rep-50)/200`.
- [x] **Player happiness** — `p.matchesWithoutPlay` counter. Após cada jogo, starting 11 (via `getBestEleven`) reseta o counter; bench incrementa. OVR ≥74 + counter ≥5 → badge 😤 na squad, notificação no hub. `updatePlayerGameTime` em manager.js, chamado em `playMatch()`.
- [x] **Match replay** — Botão "▶ Watch Replay" no match-result (liga). Screen `match-replay` com scoreline live, barra de progresso, eventos com fade-in no minuto certo (setTimeout cascade, 14s total). Clock ticker via setInterval. Botão "⏩ Skip" cancela todos os timeouts. Continua para post-match press após FT.
- [x] **Scouting report** — Botão "🔍 Scout" na match-preview. Abre modal com: form dots últimos 5 jogos, avg OVR XI, prestige, top scorer, top 3 jogadores com OVR + golos, stadium + capacity.
- [x] **Youth academy** — `generateYouthPlayers` em season.js gera 1-2 jovens (16-18 anos) por season com `potential` baseado no prestige do clube. Adicionados ao squad, `p.fromAcademy = true`, badge 🌱 na squad page. Secção "Youth Academy Graduates" no end-of-season.

### Sessão 3 — Features novas
- [x] **Injury notifications** — `generateMatchInjuries` retorna jogadores lesionados. `simulateMatch` guarda em `gameState.newInjuries`. Hub mostra banner laranja "🤕 Nome (POS) injured — out for Xw" e limpa após mostrar.
- [x] **Post-match press conference** — screen nova após cada jogo de liga. 2 questões por resultado pool (win/draw/loss), moralidade diferente por resposta. Vai para esta screen antes de `advanceMatchweek`. `gameState._postMatchResult` guarda o resultado.
- [x] **FA Cup trophy no HoF** — `career.hallOfFame.domesticCupWins` incrementado em `resolveFaCupAndRefresh`. Card 🏆 na career page. Award card no end-of-season com vencedor.
- [x] **Europa League trophy no HoF** — `career.hallOfFame.europaWins` incrementado em `resolveEuropaAndRefresh`. Card 🌟 na career page.
- [x] **Loan system** — Aba "Loans" nos transfers. Fee = 15% do transfer value. Badge `LOAN` azul na squad page. Row com tint azul. Retorno automático no início da season com notificação. `executeLoan` em manager.js, `returnLoanedPlayers` em season.js.
- [x] **AI bidding** — Durante transfer window, 22% chance/matchweek de oferta por jogador ≥74 OVR. Card "📬 TRANSFER OFFERS" no hub com Accept/Reject. Accept vende ao preço da oferta (5-45% acima do valor). Máx 3 bids pendentes. Limpa no início de cada season. `generateAIBids` em season.js.

### Sessão 5 — Features novas
- [x] **Multi-league system** — 5 países, 9 ligas total:
  - England: Premier League (20) + EFL Championship (24)
  - Spain: La Liga (20) + La Liga 2 (22)
  - Italy: Serie A (20) + Serie B (20)
  - Germany: Bundesliga (18) + Bundesliga 2 (18)
  - Portugal: Liga Portugal (18, sem divisão 2)
- [x] **COUNTRY_CONFIG** — mapa de país → div1/div2/cup/flag/euroLeague. Todos os 5 países com `euroLeague: true`.
- [x] **Real named squads** — todas as ligas têm players reais com nomes, idades, OVR e potential reais. `dataLaLiga.js`, `dataSerieA.js`, `dataBundesliga.js`, `dataLigaPortugal.js` usam `makePlayer` diretamente (Liga Portugal usa helper `generateSquad`).
- [x] **Team picker multi-país** — tabs de países no topo + tabs de divisão dentro de cada país. `switchCountryTab` + `switchLeagueTab` + `renderTeamGrid`.
- [x] **`gameState.playerCountry`** — guardado ao escolher equipa. Usado em season.js para cup/relegação/Europa.
- [x] **`getActiveLeagues`** — devolve div1+div2 do player + todos os div1 para Europa.
- [x] **`initDomesticCup`** — cup genérico, usa `cc.cup` para nome, guardado em `gameState.faCup.name`. Trigger weeks dinâmicos por tamanho da liga.
- [x] **`initEuropaLeague`** — top 2 de todas as 5 div1 = 10 teams. 2 grupos de 5, 8 rondas, SF + Final.
- [x] **Cup strings dinâmicos** — todos os "FA Cup" no UI agora usam `gameState.faCup?.name || 'Cup'`.
- [x] **Season tables dinâmicas** — "Premier League — Top 8" → `div1Name`, "Championship — Top 8" → `div2Name` (de `endOfSeasonData`).
- [x] **`renderFullTable` zones** — relegation/promotion zones agora lidas de `LEAGUES[leagueId]` em vez de hardcoded.
- [x] **HoF domesticCupWins** — `faCupWins` → `domesticCupWins` (backward compat: `|| hof.faCupWins`).
- [x] **Bugfix: replay score** — score durante replay estava invertido para away games. Fixado para sempre mostrar home-left, away-right.
- [x] **Bugfix: youth players** — todos gerados com 16 anos / 58 OVR / 92 POT por overflow do `Math.min`. Novo formula com `prestigeMod = prestige * 0.3` + random range.
- [x] **Bugfix: index.html** — `data.js` → `dataEPL.js` após rename do ficheiro.

### Bugfixes (Sessão 2)
- leagueWinner no end-season screen estava vazio → agora usa `teamName` guardado em endOfSeasonData diretamente
- Europa League não aparecia → endOfSeasonData agora setado ANTES da init da Europa, com try/catch
- startNewSeason agora limpa `gameState.europaLeague = null`
- leagueWinnerTeam declarado uma única vez em endSeason

### Sistema de Seasons / Save
- [x] `gameState.leagueTeams` guarda composição das ligas — sobrevive save/load
- [x] `gameState.squadData` — squads serializados no save, restaurados no load
- [x] `gameState.extraTeams` — equipas adicionadas dinamicamente (League 1 promovidas) persistem
- [x] `loadGame` restaura: extraTeams → squadData → leagueTeams → LEAGUES globals
- [x] Seasons infinitas — league arrays corretos, player stats resetados no início de cada season

### Jogadores
- [x] `potential` — gerado no makePlayer por idade; visível na squad page (POT)
- [x] Desenvolvimento: ≤24 cresce 1-4 OVR/season; 25-29 prime; 30+ declínio
- [x] Retirement por idade, regens procedurais (16-18 anos)
- [x] Valores: `(ovr-55)³ × 1800 × ageMult`

-----

## Stack

- Vanilla JS + HTML5 + CSS plain
- CDN only (sem npm/node_modules)
- Sem frameworks

-----

## Decisions made

- `FORMATION_DISPLAY` é a fonte da verdade para formações
- `getBestEleven` flatten + pick em ordem → zero duplicados no pitch, skip injured
- Attack/Defense separados no engine com position weights
- `gameState.leagueTeams` é o array autoritativo das ligas
- Save: squadData snapshot + extraTeams para dinâmicas
- Fórmula de valor cúbica: `(ovr-55)³ × 1800 × ageMult`
- Transfer window: semanas 1-3 e 19-22
- Fluxo liga: hub → pre-match press → match-preview → jogar → match-result → post-match press → advanceMatchweek → hub/end-season
- Fluxo FA Cup/Europa: hub → pre-match press → match-preview → jogar → match-result → resolve → hub/europa-screen
- endOfSeasonData setado ANTES da init da Europa (crash safety)
- Salários podem ir a negativo (pressão financeira, não bloqueia jogo)
- Sim to Last Matchweek usa as táticas ativas no momento
- Loans retornam no início da próxima season (não mid-season)
- AI bids: máx 3 pendentes, só durante transfer window, jogadores ≥74 OVR
- Loan fee: 15% do transfer value (one-time, não semanal)
- Post-match press: só para jogos de liga (FA Cup e Europa têm fluxo próprio)
- Multi-league: todas as ligas têm players reais com `makePlayer`. `makeTeamSquad` ainda existe mas não é usado nos data files principais.
- Europa League: top 2 de todas as 5 div1 (todos `euroLeague: true`) = 10 teams, 2 grupos de 5, SF + Final
- Liga Portugal sem div2: relegados são substituídos por tier-3 genéricos. Player não pode ser verdadeiramente relegado.
- Trigger weeks do domestic cup: dinâmicos — `[0.21, 0.42, 0.63, 0.84] × total_matchweeks` (ex: 38mw→[8,16,24,32], 34mw→[7,14,22,28])
- `pid()` counter shared — EPL fica com IDs baixos, outras ligas continuam sequencialmente
- COUNTRY_CONFIG league IDs: `premier`, `championship`, `la_liga`, `la_liga2`, `serie_a`, `serie_b`, `bundesliga`, `bundesliga2`, `liga_portugal`
- `gameState.faCup.name` guarda o nome do cup correto — UI usa este em vez de hardcoded "FA Cup"
- `hof.domesticCupWins` é o novo campo (compatível com antigo `faCupWins` via `|| hof.faCupWins`)
- Scout system descartado — Dany acha a feature inútil.

-----

## Known issues / tech debt

- Europa League: se player não qualifica, botão não aparece (correto por design)
- Saves antigos não têm `domesticCupWins` no HoF — defaults via `|| hof.faCupWins || 0`
- Replays só funcionam para jogos de liga (não FA Cup / Europa) — correto por design
- `renderFullTable` usa `LEAGUES[leagueId]` para zones — tabelas de ligas não carregadas podem ter 0/0/0 (fallback correto)

-----

## Next session ideas

0. **PRIORIDADE — Match Engine Upgrade** (só `engine.js`, ~30 linhas):
   - Usar stats individuais (pace/shooting/passing/defending/dribbling/physical) no attack/defense em vez de só `overall`
   - Dois helpers: `playerAttackContrib(p)` e `playerDefenseContrib(p)` — composite por posição, blend `contrib*0.8 + overall*0.2`
   - Upset/variance factor `0.88–1.12` por equipa por match
   - Formation passa a importar automaticamente como consequência
1. Transfer negotiation — contra-oferta do clube vendedor, poder negociar preço
2. Player aging / contract expiry warnings — jogadores a 1 season de reformar → notificação
3. Youth Academy with youth market system, we should change it with the one we have now, the one now is basic so later its gonna be removed when we do the right one
4. Pre-season friendlies — 2-3 jogos antes da season para testar formação sem consequências
5. News feed — no hub, um ticker de notícias do futebol: "X signed by Y", "Z is out injured", "Manager of the week"
6. Champions League — top 4 de cada liga com `euroLeague:true` → formato mais rico com fase de grupos maior

-----

## Project structure

```
test2/
├── index.html
├── style.css
├── MEMORY.md
├── js/
│   ├── script.js           — entry point (DOMContentLoaded → init)
│   ├── dataEPL.js          — makePlayer, pid(), EPL/Championship (~900 players), LEAGUES, TEAM_MAP, ALL_TEAMS, COUNTRY_CONFIG, makeTeamSquad, makeNameFor
│   ├── dataLaLiga.js       — La Liga (20) + La Liga 2 (22) teams → push to LEAGUES/ALL_TEAMS/TEAM_MAP
│   ├── dataSerieA.js       — Serie A (20) + Serie B (20) teams → push
│   ├── dataBundesliga.js   — Bundesliga (18) + Bundesliga 2 (18) teams → push
│   ├── dataLigaPortugal.js — Liga Portugal (18) teams → push
│   ├── engine.js           — simulateMatch, getTeamAttack/Defense, injuries (com return), form streak, wage cost
│   ├── season.js           — fixtures, tabela, endSeason, domestic cup, Europa League, simulateToLastMatchweek, generateAIBids, returnLoanedPlayers, getActiveLeagues, TIER3_POOLS
│   ├── manager.js          — FORMATION_DISPLAY, getBestEleven, transfers, FFP check, executeLoan
│   └── ui.js               — todas as screens, press conferences (pre+post), europa screen, AI bids, loan tab, modais, toasts, save/load
```

-----

## Layout do Hub (para referência)

```
[TOPBAR: club · season · week · budget · morale]
[NOTIFICATION se houver]
[INJURY NOTIFICATIONS (laranja) se houver]
[hub-left flex:2]                    [hub-right flex:1]
  · AI Bids card (se houver)           · mini table
  · hub-position                       · recent results
  · Cup pending card (se houver)
  · hub-next (próximo jogo)
    · SET TACTICS & PLAY btn
    · Sim to Last Matchweek btn (se >1 jogo restante)
  · matchup-card (formations + bars)
[NAV: Squad · Tactics · Table · Fixtures · Transfers · Stats · Career]
```

## Layout da Team Select (para referência)

```
[HEADER: CHOOSE YOUR CLUB]
[COUNTRY TABS: 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England | 🇪🇸 Spain | 🇮🇹 Italy | 🇩🇪 Germany | 🇵🇹 Portugal]
[LEAGUE TABS: Division 1 | Division 2 (se existir)]
[BODY: teams-grid (left) + team-detail (right)]
```

## Fluxo de jogo completo (sessão 3)

```
Hub → [pre-match press conf] → Match Preview → KICK OFF
  → Match Result
    → (liga) Post-match press conf → advanceMatchweek → Hub/End-Season
    → (Cup) resolveDomesticCupRound → Hub
    → (Europa) resolveEuropa → Europa Screen
```
