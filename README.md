# ⚽ FOOTBALL MANAGER — Vibe Coded

A fully playable, browser‑based Football Manager game built with **vanilla JavaScript, HTML and CSS**. No frameworks, no back‑end, no database – everything runs client‑side.

🔗 **Live demo**: [https://dany0421.github.io/fm-with-c/]

---

## ✨ Features

* **Multi‑league management** – Premier League, LaLiga, Serie A, Bundesliga, Liga Portugal (with promotion/relegation where applicable).
* **Player stats & traits** – Pace, shooting, passing, defending, physical, mental, etc. Traits (e.g. *clinical finisher*, *box‑to‑box*) add personality and affect match performance.
* **Tactics & formations** – Choose from 7 formations (`4‑4‑2`, `4‑3‑3`, `4‑2‑3‑1`, …) and set mentality, pressing, tempo, etc.
* **Transfer market & squad management** – Buy, sell, loan. Manage your budget, scout free agents, and shape your squad.
* **Youth academy & training** – Develop regens and train your players.
* **European football** – Champions League & Europa League (realistic qualification based on league positions).
* **Career mode** – Hall of Fame, season history, awards, and dynamic player development.
* **100% client‑side** – No server, no database, no install. Runs offline once loaded.

---

## 🛠️ Tech Stack

* **HTML5 / CSS3** – Responsive layout, dark/light themes.
* **Vanilla JavaScript** – All logic written in plain JS (no frameworks, no build step).
* **LocalStorage** – Save/load your career (no back‑end required).
* **GitHub Pages** – Hosting the live version.

---

## 🎮 How to Play

1. **Choose your team** – Start a new career and select a club.
2. **Manage your squad** – Pick your starting XI, set tactics, browse the transfer market.
3. **Simulate matches** – Watch the engine calculate results based on stats, form, morale, and traits.
4. **Follow the season** – League tables, cup draws, European qualification – all update automatically.
5. **Build a legacy** – Win titles, develop youth, climb the Hall of Fame.

---

/
├── index.html          # Main entry point
├── style.css           # Global styles
├── js/
│   ├── engine.js       # Match simulation & game logic
│   ├── manager.js      # Transfers, tactics, squad management
│   ├── season.js       # League tables, schedule, promotions
│   ├── ui.js           # Rendering and UI updates
│   ├── dataEPL.js      # Premier League data
│   ├── dataLaLiga.js   # LaLiga data
│   ├── dataSerieA.js   # Serie A data
│   ├── dataBundesliga.js# Bundesliga data
│   └── dataLigaPortugal.js # Liga Portugal data
└── ...
