# ✍️ Ghostwriter — AI Co-Writing Studio & Branching Webnovel Engine

[![CI Build](https://github.com/manmohanml1/ghostwriter/actions/workflows/ci.yml/badge.svg)](https://github.com/manmohanml1/ghostwriter/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Angular 19](https://img.shields.io/badge/Angular-19.0-dd0031.svg)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org)

> **Ghostwriter** is an open-source, local-first AI co-writing studio designed for novelists, webnovel authors, and interactive fiction creators. It combines an **infinite SVG decision-tree canvas**, **deep 1,500+ word chapter expansion**, a **character & world Lore Bible**, and a **bulletproof tri-provider failover engine** (Gemini 2.5 Flash $\rightarrow$ Groq Llama 3.3 70B $\rightarrow$ Smart Offline Engine).

---

## 🌟 Core Highlights

```
                          ┌───────────────────────────┐
                          │   🎨 Studio SVG Canvas    │
                          │   (Pan, Zoom, Bezier DAG) │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  ✨ Branching AI     │    │  📖 E-Reader Mode    │    │  📜 Lore Bible &     │
│  3-Way Hypotheses    │    │  4 Themes (OLED/Sep) │    │  Style Controls      │
│  (Action/Twist/Lore) │    │  + TOC Drawer        │    │  (Consistency Hub)   │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
```

### 1. 🎨 Infinite Visual DAG Canvas
- Full interactive graph with **hierarchical layout**, smooth **pan & zoom**, and **cubic bezier spline routing**.
- Track alternate storylines, divergent plot twists, and pruned timelines with instant restoration.

### 2. ⚡ Deep Webnovel Chapter Expander
- Transform rough scene ideas into full **1,200 to 2,000+ word published chapters**.
- Guide the AI with customizable **Narrative Beat Focus**:
  - `⚖️ Balanced Multi-Scene`
  - `💥 Action & Confrontation`
  - `🗣️ Deep Dialogue & Drama`
  - `🔍 Forensic Investigation`
  - `⚡ Shocking Cliffhanger`

### 3. 🛡️ Tri-Provider Rate Limit Defense
- **Zero API Lockouts**: If Gemini returns an HTTP 429 rate limit or daily token cap, Ghostwriter automatically and silently fails over to **Groq (Llama 3.3 70B @ 300 tokens/s)**, and falls back to the **Dynamic Offline Engine**.
- **BYOK Storage**: Store your own Google AI Studio and Groq keys strictly in local browser `localStorage`.

### 4. 📖 Immersive Webnovel E-Reader
- Toggle from canvas editing directly into an immersive reading experience.
- 4 Reading Themes: **🌑 Dark Slate**, **🖤 OLED Black**, **📜 Warm Sepia**, and **📄 Novel Paper**.
- Slide-out Table of Contents drawer and Choose-Your-Own-Adventure branch choices.

### 5. 📥 Multi-Format Publishing Suite
- **Novel Manuscript (`.md`)**: Exports the active Canon storyline into clean Markdown ready for Royal Road, Wattpad, Substack, and Kindle.
- **Story Tree Backup (`.json`)**: Complete graph backup of all nodes, edges, Lore Bible, and coherence scores.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org) >= 20.x
- [npm](https://npmjs.com) >= 10.x

### Installation

```bash
# Clone the repository
git clone https://github.com/manmohanml1/ghostwriter.git
cd ghostwriter

# Install dependencies
npm install

# Start the local development server
npm start
```

Open **`http://localhost:4200`** in your browser to launch the studio!

---

## 📁 Monorepo Structure

```text
ghostwriter/
├── .github/workflows/         # Automated GitHub Actions CI/CD pipelines
│   └── ci.yml
├── apps/
│   └── web/                   # Angular 19 Standalone Single Page App
│       ├── src/app/core/      # Reactive TreeStore, AIGeneratorService, Fixtures
│       └── src/app/features/  # Canvas, Inspector, Reader, Lore Bible, Style Controls
├── packages/
│   └── contracts/             # Domain TypeScript interfaces (TreeNode, StoryTree, LoreEntity)
├── infrastructure/            # Supabase PostgreSQL schema & local Docker configuration
│   └── supabase/schema.sql
└── docs/                      # Architecture, Cost Models, and Milestone contracts
```

---

## 🗺️ Roadmap to v1.0

- [x] **v0.1.0**: Monorepo scaffold, contracts, DAG engine, SVG canvas, inspector.
- [x] **v0.2.0**: AI 3-way hypothesis generator, interactive reader mode, Lore Bible, style controls.
- [x] **v0.3.0**: Deep 1,500w webnovel chapter expansion, e-reader themes, manuscript export suite.
- [x] **v0.4.0**: Tri-provider rate limit defense (Gemini + Groq + Offline), live AI health telemetry.
- [x] **v0.5.0**: GitHub remote integration, CI/CD Actions, and Supabase cloud sync schema.
- [ ] **v0.6.0**: 1-Click public story showcase links (`/story/:slug`) for readers.
- [ ] **v0.7.0**: Community story gallery & reader bookmarks.
- [ ] **v1.0.0**: Production deployment on Vercel + Supabase ($0 free tier + Pro Writer tier).

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
