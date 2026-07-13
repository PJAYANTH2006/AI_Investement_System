# AI Investment Research Agent

🌐 **Live Demo**: [https://ai-investement-system.vercel.app](https://ai-investement-system.vercel.app)

An advanced, end-to-end AI agent that conducts deep equity research on any company, fetches real-time financial metrics and news, and outputs a professional investment recommendation (INVEST, HOLD, or PASS) with a detailed analytical thesis.

Developed with **React (Vite)**, **Node.js (Express)**, **LangGraph.js**, **Tavily Search API**, **Yahoo Finance API**, **Google Gemini 2.5 Flash**, and **PostgreSQL**.

---

## 🚀 Overview

This application automates the research workflow of a venture capital or equity research analyst:
1. **Ticker & Profile Lookup**: Automatically resolves company names to stock tickers and sectors.
2. **Financial Aggregation**: Fetches key metrics (Price, P/E, Debt/Equity, Operating Margins, Revenue Growth, EPS) via Yahoo Finance.
3. **Catalyst Scrape**: Queries Tavily Search for real-time news articles, summaries, and URLs.
4. **AI Reasoning**: Orchestrates data aggregation using a **LangGraph state machine** and prompts **Gemini 2.5 Flash** to perform structured reasoning and issue an investment verdict.
5. **Report Persistence**: Automatically creates the schema and saves all research reports to a local **PostgreSQL** database.
6. **Premium Dashboard**: Visualizes recommendations, confidence gauges, key financials, news feeds, and detailed reasoning in a responsive, glassmorphic dark-theme dashboard.

---

## 🛠️ How to Run It

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### 1. Install Dependencies
Run the bootstrapping script in the root directory. This will install packages in the root, frontend, and backend folders concurrently:
```bash
npm run install-all
```

### 2. Database & Environment Configuration

You can run the database locally or connect to the cloud using Neon.

#### Option A: Local Database
1. Make sure PostgreSQL is running locally on port `5432`.
2. Create a database named `ai_investment_research`.
3. Create a `.env` file in the `backend/` directory from the template:
   ```bash
   cp backend/.env.example backend/.env
   ```
4. Set the `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_investment_research
   ```

#### Option B: Cloud Database (Neon)
This project is pre-configured with **Neon** context mapping:
1. Run `npx neonctl@latest init` to link your local project to your Neon account.
2. The environment variables will be pulled automatically into `.env.local`. Copy the `DATABASE_URL` from `.env.local` to your `backend/.env` file.
   *Example:*
   ```env
   DATABASE_URL=postgresql://neondb_owner:password@ep-sweet-surf-aofcapdd.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Supply API Keys
Open `backend/.env` and supply your API keys:
```env
GOOGLE_API_KEY=AIzaSy...   # Google Gemini API Key
TAVILY_API_KEY=tvly-...    # Tavily Search API Key
```

### 4. Run the Servers Concurrently
Start both the Express backend (port `3001`) and the Vite React frontend (port `5173`) in one command:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🌐 Production Deployment (Vercel & Render)

The project is structured and optimized for production deployment:
1. **Database**: Hosted on **Neon** (or any cloud PostgreSQL provider).
2. **Backend (Express API)**: Hosted on **Render** or **Railway** (to support long-running LangGraph queries without Vercel's 10s Serverless execution limit).
   - *Render Setup*: Set Root Directory as `backend`. Add `DATABASE_URL`, `GOOGLE_API_KEY`, `TAVILY_API_KEY`, and `NODE_ENV=production` as environment variables.
3. **Frontend (Vite App)**: Hosted on **Vercel** (static web app hosting).
   - *Vercel Setup*: Set Root Directory as `frontend`. Add the environment variable `VITE_API_URL` pointing to your deployed Render backend (e.g., `https://your-backend.onrender.com`).

---

## 💬 LLM Pair-Programming Chat Transcript (BONUS)

As mandated by the assignment guidelines, this project was developed in partnership with a Gemini AI assistant.
- **The complete conversation history containing all prompts, thought processes, decisions, and command logs is compiled and saved in:**
  👉 **[logs/chat_transcript.md](file:///c:/Users/ASUS/OneDrive/Desktop/AI%20Investment%20Research%20Agent/logs/chat_transcript.md)**

---

## 🧠 How it Works: Architecture & Flow

The application is structured into isolated, cohesive layers:

```
                  ┌──────────────────────────────┐
                  │       React Dashboard        │
                  │        (Port 5173)           │
                  └──────────────┬───────────────┘
                                 │ HTTP Request (CORS Proxy)
                                 ▼
                  ┌──────────────────────────────┐
                  │    Node.js Express Server    │
                  │        (Port 3001)           │
                  └──────────────┬───────────────┘
                                 │
                     [ LangGraph State Machine ]
                                 │
                                 ├─► Yahoo Finance (Ticker & Financials)
                                 ├─► Tavily API (Scrape news & URLs)
                                 └─► Gemini 2.5 Flash (Synthesis & Verdict)
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │     PostgreSQL Database      │
                  │    (Schema Auto-Init)        │
                  └──────────────────────────────┘
```

### LangGraph Workflow (`backend/lib/agent.js`)
We compile a step-by-step state graph:
1. **`resolveTicker`**: Checks if the query matches a ticker pattern (e.g. `TSLA`). If not, uses `yahooFinance.search` to fetch the equity symbol.
2. **`fetchFinancials`**: Queries stock price, P/E, revenue growth, profit margin, debt-to-equity, and company descriptions from Yahoo Finance.
3. **`fetchNews`**: Queries Tavily for real-time catalyst news, returning structured JSON articles, content snippets, and source URLs.
4. **`generateReport`**: Invokes the Gemini 2.5 Flash LLM with a system prompt mandating structured JSON formatting containing the recommendation, confidence score, and detailed reasoning in Markdown.

---

## ⚡ Key Decisions & Trade-Offs

1. **Vite React + Express Backend vs. Next.js Monolith**: We chose to decouple the application into a standalone React SPA (Vite) and a Node.js API server (Express). This separation makes local setup, testing, and debugging clean, avoids serverless function timeouts on Vercel for long-running graph workflows, and aligns perfectly with MERN-style production stacks.
2. **Vanilla CSS (CSS Modules) vs. Tailwind**: To align with core guidelines, we wrote customized, clean CSS Modules. This gives us maximum aesthetic control, allows complex CSS variables, and enables rich animations (e.g., custom radial SVG gauges and shimmering skeleton screens) without bloating the frontend bundle.
3. **Resilient Fallback Modes**:
   - **Tavily Fallback**: If `TAVILY_API_KEY` is missing, the agent falls back to mock industry updates to avoid crashing.
   - **Gemini Fallback**: If no Gemini keys are provided, it auto-generates a clean warning report detailing the missing keys but displaying the fetched financials.
   - **Rate Limit Ticker Fallback**: If Yahoo Finance rate-limits search requests, the agent checks if the user entered a ticker (e.g. "AAPL") and queries the quote details directly, bypassing search rate limits.
4. **Custom Markdown-to-HTML Parser**: Rather than installing third-party React markdown renderers (which can fail due to peer dependency clashes on React 19), we wrote a safe, lightweight parser in ~50 lines of JS. It handles headings, lists, bolding, quotes, and styles GitHub-style alerts (like `> [!WARNING]`) into custom CSS alert boxes.

---

## 📊 Example Run Output

### NVIDIA Corporation (NVDA)
- **Verdict**: **INVEST**
- **Confidence**: 85%
- **Metrics Summary**: Price: `$125.80` | Market Cap: `$3.10T` | P/E: `65.4` | Rev Growth: `115%`
- **Reasoning Highlights**:
  - *Executive Summary*: NVIDIA maintains a virtual monopoly in AI hardware accelerators, driven by Blackwell chip demand.
  - *Financials*: Historic 115% YoY revenue growth justifies its elevated P/E ratio. Strong balance sheet with minimal net debt.
  - *Catalysts*: Big tech capital expenditure on data centers shows no signs of slowing down.

### Tesla, Inc. (TSLA)
- **Verdict**: **HOLD**
- **Confidence**: 70%
- **Metrics Summary**: Price: `$220.40` | Market Cap: `$700B` | P/E: `58.2` | Rev Growth: `8.5%`
- **Reasoning Highlights**:
  - *Executive Summary*: EV adoption headwinds are slowing core automotive sales, while margins are compressed due to price cuts.
  - *Financials*: P/E is elevated relative to growth rates.
  - *Catalysts*: Full Self-Driving (FSD) licensing and energy storage expansion represent massive high-margin catalysts but remain long-term plays.

---

## 🛠️ What I Would Improve with More Time

1. **WebSocket Progress Updates**: Currently, the frontend polls/waits for the API to complete the entire LangGraph workflow. Using WebSockets (e.g. `Socket.io`), we could stream real-time logs from individual nodes (e.g., "Resolving Ticker...", "Scraping news...") to the frontend search console.
2. **Interactive Financial Charting**: Integrate a lightweight charting library (e.g., lightweight-charts or Recharts) to render historical price trends and EPS growth charts in the metrics panel.
3. **Advanced Graph Branching**: Add conditional routing to the LangGraph workflow. For example, if news sentiment is extremely negative or a critical earnings miss occurs, route the graph to a specialized "Risk Assessor" node for a deeper risk audit.
4. **Auth & Shareable Reports**: Implement user authentication and add public URL routing, allowing users to share specific research reports with team members.
