# ✍️ Ghostwriter — AI Co-Writing Studio & Branching Webnovel Engine

[![Production Deployment](https://img.shields.io/badge/Vercel-Production%20Live-success.svg)](https://web-green-beta-4giz07ncu3.vercel.app)
[![CI Build](https://github.com/manmohanml1/ghostwriter/actions/workflows/ci.yml/badge.svg)](https://github.com/manmohanml1/ghostwriter/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Angular 19](https://img.shields.io/badge/Angular-19.0-dd0031.svg)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org)

> **Ghostwriter** is an open-source, local-first AI co-writing studio designed for novelists, webnovel authors, and interactive fiction creators. It combines an **infinite SVG decision-tree canvas**, **deep 1,500+ word chapter expansion**, a **character & world Lore Bible**, and a **bulletproof tri-provider failover engine** (Gemini 2.5 Flash $\rightarrow$ Groq Llama 3.3 70B $\rightarrow$ Smart Offline Engine).

🌐 **Live Cloud App**: [**https://web-green-beta-4giz07ncu3.vercel.app**](https://web-green-beta-4giz07ncu3.vercel.app)

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

### 3. 🛡️ Tri-Provider Rate Limit Defense & Gemini 3.6 Discovery
- **Zero API Lockouts**: If Gemini returns an HTTP 429 rate limit or daily token cap, Ghostwriter automatically fails over to **Groq (Llama 3.3 70B @ 300 tokens/s)**, and falls back to the **Pure Dynamic Offline Engine**.
- **Dynamic Google AI Studio Gemini 3.6 Discovery**: Auto-queries `ListModels` for `gemini-3.6-flash` and `gemini-3.6-pro` with self-healing deprecation retry.
- **BYOK Storage**: Store your own Google AI Studio and Groq keys strictly in local browser `localStorage`.

### 4. 🎭 Pure Dynamic Synthesis & Thematic Scene Weaver
- **Zero Hardcoded Stories**: 100% elimination of fixed candidate matrices; branches, paragraphs, and chapters are synthesized dynamically from active character traits, chapter prose, and lore.
- **Thematic Scene Weaver**: Automatically adapts scene prose to match the specific narrative arc (*Discovery/Anomaly*, *Stealth/Infiltration*, *Action/Confrontation*, *Forensics*).
- **Scope & Depth-Aware Engine**: Adapts narrative velocity and branch choices across Short (~3–5 Ch), Medium (~8–15 Ch), and Long (~20+ Ch) story targets.
- **Universal In-Flight Entity Harvester**: 1-click discovery and ingestion of newly introduced characters, locations, factions, and items.

### 5. 📱 Responsive Studio & Mobile Bottom Sheet Drawer
- **3-State Mobile Bottom Sheet**: Draggable bottom drawer (`PEEK` / `HALF` / `FULL`) with floating canvas controls and segmented navigation.
- **Sequential Sibling Lettering**: Automatic `Path D/E/F` continuation and single-canon reconciliation.

### 6. 📖 Immersive Webnovel E-Reader
- Toggle from canvas editing directly into an immersive reading experience.
- 4 Reading Themes: **🌑 Dark Slate**, **🖤 OLED Black**, **📜 Warm Sepia**, and **📄 Novel Paper**.
- Slide-out Table of Contents drawer and Choose-Your-Own-Adventure branch choices.

### 7. 📥 Multi-Format Publishing Suite
- **Novel Manuscript (`.md`)**: Exports the active Canon storyline into clean Markdown ready for Royal Road, Wattpad, Substack, and Kindle.
- **Story Tree Backup (`.json`)**: Complete graph backup of all nodes, edges, Lore Bible, and coherence scores.

---

## 🚀 Quickstart

### Live Cloud Version
Launch the studio immediately in your browser: [**https://web-green-beta-4giz07ncu3.vercel.app**](https://web-green-beta-4giz07ncu3.vercel.app)

### Local Development

```bash
# Clone the repository
git clone https://github.com/manmohanml1/ghostwriter.git
cd ghostwriter

# Install dependencies
npm install

# Start the local development server
npm start
```

Open **`http://localhost:4200`** to run the local workspace.

---

## 📁 Monorepo Structure

```text
ghostwriter/
├── .github/workflows/         # Automated GitHub Actions CI/CD pipelines
│   └── ci.yml
├── apps/
│   └── web/                   # Angular 19 Standalone Single Page App
│       ├── vercel.json        # Production Vercel SPA routing & security headers
│       ├── src/app/core/      # Reactive TreeStore, AIGeneratorService, Fixtures
│       └── src/app/features/  # Canvas, Inspector, Reader, Lore Bible, Style Controls
├── packages/
│   └── contracts/             # Domain TypeScript interfaces (TreeNode, StoryTree, LoreEntity)
├── infrastructure/            # Supabase PostgreSQL schema & local Docker configuration
│   └── supabase/schema.sql
└── docs/                      # Architecture, Cost Models, DEPLOYMENT, and ADR records
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
