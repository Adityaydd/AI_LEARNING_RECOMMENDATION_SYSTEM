# AI-Powered Personalized Learning Recommendation System

> **100% Free AI Stack** — An end-to-end personalized learning platform combining a 3-tier hybrid recommendation engine, adaptive daily micro-task generation, real-time predictive progress analytics, and automated resume/job matching — all running at $0 cost.

## 🎯 Vision

Traditional Learning Management Systems (LMS) use a "one-size-fits-all" approach. This system solves that by:

- **3-Tier Hybrid Recommendation Engine** — Collaborative Filtering + Content-Based Filtering + Neural/Deep Scoring
- **Adaptive Daily Micro-Task Generation** — Breaks courses into achievable daily units calibrated to user competency
- **Real-Time Predictive Analytics** — Skill timelines, disengagement risk scoring, cohort monitoring
- **Automated Resume Builder & Job Matcher** — Dynamic portfolio generation + competency-based job ranking

All AI/ML features run **completely free** — no paid APIs, no credit cards required.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite + TS)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Auth      │  │  Onboarding │  │ Dashboard   │  │  Recommendations    │ │
│  │  (Login/    │  │  (2-Step:   │  │  (Recharts  │  │  (3-Tier Hybrid    │ │
│  │  Register)  │  │  Domain +   │  │   Analytics)│  │   Engine Results)   │ │
│  │             │  │  Skills)    │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ REST API (JWT + RBAC)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Node.js + Express + TS)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Auth      │  │  Onboarding │  │Recommendation│  │  AI Provider       │ │
│  │  Routes     │  │  Routes     │  │  Engine     │  │  (Pluggable)       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        100% FREE AI LAYER                               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ││
│  │  │ @huggingface │  │   natural    │  │   Gemini     │  │  Local     │  ││
│  │  │ transformers │  │  (TF-IDF)    │  │  Free Tier   │  │  Fallback  │  ││
│  │  │ (embeddings) │  │  (NLP)       │  │  (Primary)   │  │  (Mock/TF) │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ Mongoose ODM
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MONGODB (Atlas Free Tier / Local)                  │
│  Users • Courses • Interactions • DailyTasks • JobListings                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + TypeScript | SPA with modern tooling |
| **UI** | Tailwind CSS + shadcn/ui + Lucide Icons | Beautiful, accessible components |
| **Charts** | Recharts | Real-time analytics dashboards |
| **State** | Zustand + localStorage | Auth persistence, lightweight |
| **Backend** | Node.js + Express + TypeScript (ESM) | RESTful API |
| **Database** | MongoDB + Mongoose ODM | Document storage with vector support |
| **Auth** | JWT (Access + Refresh) + bcryptjs | Secure authentication |
| **Validation** | Zod | Runtime schema validation |
| **Embeddings** | `@huggingface/transformers` (Xenova/all-MiniLM-L6-v2) | 384-dim local vector embeddings |
| **NLP** | `natural` | Tokenization, stemming, TF-IDF |
| **LLM** | Google Gemini Free Tier / Groq / Ollama / Mock | Generative AI (pluggable) |

---

## 🧠 100% Free AI Provider Pattern

The system uses a **pluggable provider architecture** for zero-cost generative AI:

```typescript
// server/src/services/ai/aiProvider.ts
interface AIProvider {
  generateDailyTasks(userProfile, course): Promise<DailyTask[]>;
  generateTextEmbeddings(text: string): Promise<number[]>;
  tailorResumeBullet(courseTitle: string, skills: string[]): Promise<string>;
}
```

| Provider | File | Cost | Use Case |
|----------|------|------|----------|
| **Gemini** | `geminiProvider.ts` | Free Tier | Primary cloud LLM |
| **Groq** | (planned) | Free Tier | Fast inference |
| **Ollama** | (planned) | $0 (local) | Fully offline |
| **Local TF-IDF** | Built-in | $0 | Deterministic fallback |
| **Mock** | (planned) | $0 | CI/CD, testing |

**Graceful fallback**: Automatically falls back to local TF-IDF when API keys are missing, rate limited, or network fails.

Configure via `.env`:
```env
AI_PROVIDER=gemini          # gemini | groq | ollama | local | mock
GEMINI_API_KEY=your_key     # Get from https://aistudio.google.com/
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

---

## 📦 Project Structure

```
ai-learning-rec/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── components/          # Reusable UI (Navbar, ProtectedRoute, etc.)
│   │   ├── views/               # Page components (Login, Register, Onboarding, Dashboard, Recommendations)
│   │   ├── store/               # Zustand auth store
│   │   ├── services/            # API client with JWT interceptors
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # Shared TypeScript types
│   └── package.json
├── server/                      # Express Backend
│   ├── src/
│   │   ├── config/              # DB connection, env validation
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Auth, validation, error handling
│   │   ├── models/              # Mongoose schemas (User, Course, Interaction, DailyTask, JobListing)
│   │   ├── routes/              # API route definitions
│   │   ├── services/            # Business logic
│   │   │   ├── ai/              # AI Provider implementations
│   │   │   └── recommendation/  # 3-tier engine (CF, CBF, Neural, Ensemble)
│   │   ├── utils/               # Helpers (embeddings, similarity, etc.)
│   │   └── seed/                # Database seeding (30 synthetic users, courses, jobs)
│   └── package.json
├── package.json                 # Root workspace (concurrently, eslint, prettier, husky)
├── .env.example                 # Environment template
├── plan.md                      # Current implementation plan
└── CLAUDE.md                    # Full project specification
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20.0.0
- **MongoDB** — Local (`mongodb://127.0.0.1:27017`) or [MongoDB Atlas Free Tier](https://www.mongodb.com/atlas)
- **Optional**: Ollama for local LLM (`ollama pull llama3.2:3b`)

### Installation

```bash
# Clone and install
cd ai-learning-rec
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and AI provider settings

# Seed database (30 synthetic learners, courses with precomputed embeddings, jobs)
npm run seed

# Start development (runs both client + server)
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server concurrently |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run build` | Build both workspaces (TS check + Vite bundle) |
| `npm run seed` | Seed DB with synthetic data + precomputed embeddings |
| `npm run test` | Run API & recommendation validation suite |
| `npm run test:rec` | Validate k=5/k=10 recommendation consistency & <200ms latency |
| `npm run lint` | ESLint across workspaces |
| `npm run format` | Prettier format all files |

---

## 🔐 Authentication & Authorization

- **JWT** — Access tokens (15min) + Refresh tokens (7d, httpOnly cookie)
- **Passwords** — bcryptjs with 12 rounds
- **Validation** — Zod schemas on every `req.body` / `req.query`
- **RBAC** — Roles: `learner` | `instructor` | `admin`
- **Protected Routes** — Middleware enforces auth + role checks

---

## 🧪 Recommendation Engine — 3-Tier Hybrid

Executes in sequence on login/task completion (**target: <200ms**):

### Tier 1: Collaborative Filtering (CF)
- Cosine similarity between active user's `profileVector` / interaction history and other learners
- Finds k-nearest neighbors (k=5, k=10)
- Ranks unvisited courses by predicted utility

### Tier 2: Content-Based Filtering (CBF)
- Local NLP: `natural` TF-IDF feature vectors + `all-MiniLM-L6-v2` semantic embeddings
- Scores alignment against course descriptions, tags, prerequisites, difficulty

### Tier 3: Neural / Deep Scoring
- Non-linear learner-resource interaction scores
- Combines dense embedding cosine similarity with historical completion + assessment weights

### Ensemble
```
finalScore = w1 × CF + w2 × CBF + w3 × Deep
```
Returns Top-N courses with normalized rankings.

---

## 👤 Core Modules

### Module A: User Profiling & Adaptive Onboarding
- Captures academic background, domain skills, learning objectives, daily time availability
- **Adaptive questioning**: Dynamic difficulty adjustment based on previous answers
- Generates normalized 384-dim `profileVector` locally using `all-MiniLM-L6-v2` + skill weights
- **Cold-start accuracy target**: >71.5%

### Module B: 3-Tier Hybrid Recommendation Engine
- As described above — runs on every login and task completion

### Module C: Adaptive Daily Task Generator
- Prevents overwhelm from full-course loading
- Analyzes progress trajectory → identifies next conceptual frontier
- Uses free LLM (with structured JSON output + deterministic fallback)
- Decomposes into daily micro-learning units calibrated to `studyTimeMinutes` and competency
- Dynamically adjusts difficulty based on completion rates + quiz scores

### Module D: Real-Time Progress Tracking & Predictive Dashboard
- **Learner View**: Skill acquisition timelines, course trajectories, daily streaks, performance trends (Recharts)
- **Instructor/Admin View**: Cohort metrics, `DisengagementRiskScore` (completion velocity, score trends, login frequency)

### Module E: Automated Resume Builder & Job Matcher
- **Dynamic Portfolio**: Auto-catalogues credentials on course/skill completion
- **Resume Bullets**: Free LLM + local formatter generates industry-ready bullets
- **Job Matching**: Ranks Top-5 jobs by competency alignment against `skillsProfile` + embedding vector

---

## 🗄️ Database Schemas (Denormalized for Vector Lookups)

```typescript
// User
{
  name, email, passwordHash, role,
  onboardingCompleted: boolean,
  academicBackground: string,
  studyTimeMinutes: number,
  skills: [{ name: string, level: 'beginner'|'intermediate'|'advanced' }],
  interests: string[],
  profileVector: number[384],
  disengagementRiskScore: number
}

// Course
{
  title, description, domain,
  difficulty: 'beginner'|'intermediate'|'advanced',
  prerequisites: string[],
  modules: [{ title, content, durationMinutes }],
  skillsTaught: string[],
  tfidfTerms: object,
  embedding: number[384],
  eligibilityRules: object
}

// Interaction
{
  userId, courseId,
  status: 'enrolled'|'in_progress'|'completed',
  assessmentScores: number[],
  timeSpentMinutes: number,
  rating: number,
  updatedAt: Date
}

// DailyTask
{
  userId, courseId, date,
  title, microUnits: [{ step: string, completed: boolean }],
  difficultyLevel, estimatedMinutes,
  status: 'pending'|'completed'
}

// JobListing
{
  title, organization,
  type: 'corporate'|'gov_exam',
  requiredSkills: string[],
  minQualification: string,
  eligibilityCriteria: object,
  matchVector: number[384]
}
```

---

## 🌍 Environment Variables

```env
# Server
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_learning_rec
JWT_SECRET=super_secret_dev_key

# Free AI Provider
AI_PROVIDER=gemini              # gemini | groq | ollama | local | mock
GEMINI_API_KEY=your_free_key    # https://aistudio.google.com/
GROQ_API_KEY=your_free_key      # https://console.groq.com/
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

---

## 🧭 Development Roadmap (Vertical Slices)

| Slice | Status | Description |
|-------|--------|-------------|
| **1** | ✅ Done | Auth + Adaptive Onboarding (register, login, JWT, 2-step onboarding, profileVector) |
| **2** | ✅ Done | Course Seed + Local Embeddings + 3-Tier Recommendation Engine |
| **3** | ✅ Done | Free AI Daily Task Generator (pluggable provider, fallback) |
| **4** | 🚧 In Progress | Analytics Dashboard + Resume/Job Matcher |

See `plan.md` for current sprint details.

---

## 🧪 Testing

```bash
# Full test suite (API + recommendation validation)
npm run test

# Recommendation-specific: Precision@10, Recall@10, latency <200ms
npm run test:rec
```

---

## 📄 License

MIT License — Free for personal and commercial use.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the **Vibe Coding Rules** in `CLAUDE.md`:
   - Zero paid APIs
   - Plan first, code second
   - Vertical slices only
   - Strict localization (targeted edits)
   - Performance & edge cases first
   - Security standards (Zod + JWT + RBAC)
4. Commit with conventional messages
5. Push and open a PR

---

## 🙏 Acknowledgments

- **@huggingface/transformers** — Local ONNX Runtime embeddings
- **natural** — Pure JS NLP toolkit
- **Google Gemini Free Tier** — Generous free LLM access
- **shadcn/ui** — Beautiful accessible components
- **Recharts** — Composable charting library

---

**Built with ❤️ using 100% free AI**