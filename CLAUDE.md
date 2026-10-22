# CLAUDE.md — AI-Powered Personalized Learning Recommendation System (100% Free AI Stack)

## 1. Project Context & Vision

We are building an end-to-end **AI-Powered Personalized Learning Recommendation System** based on our research paper architecture. It solves the "one-size-fits-all" LMS problem by combining a **3-tier hybrid recommendation engine**, **adaptive daily micro-task generation**, **real-time predictive progress analytics**, and **automated resume/job matching**.

**STRICT CONSTRAINT — 100% FREE AI LAYER:**
Every AI, NLP, embedding, and LLM feature in this project **must run at $0 cost** without requiring any paid API subscriptions or credit-card-gated services.

## 2. Tech Stack (MERN + 100% Free AI Architecture)

* **Frontend:** React.js (Vite) + TypeScript, Tailwind CSS, `shadcn/ui`, Lucide Icons, Recharts (for real-time analytics dashboards).
* **Backend:** Node.js + Express.js (RESTful API, ES Modules), Mongoose ODM.
* **Database:** MongoDB Atlas Free Tier (M0 Cluster) or Local MongoDB Community Edition.
* **100% Free AI & Recommendation Layer:**
  * **Local Vector Embeddings ($0 Cost, In-Process):** `@huggingface/transformers` (or `@xenova/transformers`) running `Xenova/all-MiniLM-L6-v2` locally inside Node.js via ONNX Runtime to generate $384$-dimensional semantic embeddings with zero external API calls.
  * **Local NLP & TF-IDF:** `natural` npm package for local tokenization, stemming, and TF-IDF vector computation.
  * **Free Generative LLM Layer (Daily Tasks, Onboarding Calibration, Resume Synthesis):**
    * **Primary (Cloud Free Tier, No Credit Card):** Google Gemini Free Tier (`@google/genai` using `gemini-2.5-flash`) or Groq Free API (`llama-3.3-70b-versatile`).
    * **Local Fallback (100% Offline Free):** Local **Ollama** (`http://localhost:11434/api/chat` running `llama3.2:3b` or `qwen2.5-coder:3b`) + deterministic template fallback so the app works even with zero internet or API keys.
  * **Provider Abstraction:** Wrap all LLM calls in `server/src/services/aiProvider.js` controlled by `.env` (`AI_PROVIDER=gemini | groq | ollama | mock`).
* **Authentication & Security:** JWT (Access + Refresh tokens), `bcryptjs` password hashing, `zod` input validation/sanitization, Role-Based Access Control (`learner`, `instructor`, `admin`).

## 3. Core Architecture & The 5 Functional Modules

All code must align with these five core modules defined in the system specification:

### Module A: User Profiling & Adaptive Onboarding (Cold-Start Solver)

* Captures academic background, domain skill levels, learning objectives, and daily time availability upon registration.
* Uses **adaptive questioning**: subsequent assessment questions dynamically adjust in difficulty based on the user's previous answer to estimate competency quickly.
* Generates a normalized $384$-dimensional `profileVector` locally using `all-MiniLM-L6-v2` + skill weights to solve the cold-start recommendation problem immediately (target Cold-Start Accuracy: $>71.5\%$).

### Module B: 3-Tier Hybrid Recommendation Engine

Executes in the following sequence upon login or task completion (target latency: $<200\text{ms}$):

1. **Collaborative Filtering (CF):** Computes mathematical cosine similarity in Node.js between the active user's `profileVector` / interaction history and other learners to find $k$-nearest neighbors ($k=5$, $k=10$) and rank unvisited courses by predicted utility.
2. **Content-Based Filtering (CBF):** Uses local NLP (`natural` TF-IDF feature vectors + local `all-MiniLM-L6-v2` semantic embeddings) on course descriptions, tags, prerequisites, and difficulty to score alignment against the learner's declared interests.
3. **Neural / Deep Scoring Layer:** Computes non-linear learner-resource interaction scores by combining dense embedding cosine similarity with historical completion and assessment weights.
4. **Weighted Ensemble:** Combines the normalized rankings from all three tiers ($\text{score} = w_1 \cdot \text{CF} + w_2 \cdot \text{CBF} + w_3 \cdot \text{DL}$) to return Top-$N$ courses in $<200\text{ms}$.

### Module C: Adaptive Daily Task Generator

* Prevents overwhelm from single-enrollment full-course loading.
* Analyzes the learner's current progress trajectory, identifies the next conceptual frontier, and uses the **free LLM provider** (with structured JSON output + local deterministic fallback) to decompose it into achievable **daily micro-learning units** calibrated to the user's `studyTimeMinutes` and competency level.
* Dynamically adjusts task difficulty based on real-time completion rates and quiz scores.

### Module D: Real-Time Progress Tracking & Predictive Dashboard

* **Learner View:** Visualizes skill acquisition timelines, course trajectories, daily task streaks, and performance trends using Recharts.
* **Instructor/Admin View:** Monitors cohort metrics and uses local predictive heuristics (completion velocity, score trends, login frequency) to calculate a `DisengagementRiskScore` and flag at-risk learners for proactive intervention.

### Module E: Automated Resume Builder & Job Matcher

* **Dynamic Portfolio:** When a user completes a course or masters a skill, automatically catalogues the credential and uses the free LLM layer (or local formatter) to generate standardized, industry-ready resume bullet points.
* **Job Recommendation Engine:** Matches the learner's accumulated `skillsProfile` and local embedding vector against curated `JobListing` documents (including government exam and corporate eligibility criteria), ranking Top-$5$ jobs by competency alignment.

## 4. Core MongoDB Schema Blueprint

Keep schemas flat and denormalized where vector/similarity lookups occur:

* **`User`**: `{ name, email, passwordHash, role, onboardingCompleted, academicBackground, studyTimeMinutes, skills: [{ name, level }], interests: [String], profileVector: [Number], DisengagementRiskScore: Number }`
* **`Course`**: `{ title, description, domain, difficulty: 'beginner'|'intermediate'|'advanced', prerequisites: [String], modules: [{ title, content, durationMinutes }], skillsTaught: [String], tfidfTerms: [Object], embedding: [Number], eligibilityRules: Object }`
* **`Interaction`**: `{ userId, courseId, status: 'enrolled'|'in_progress'|'completed', assessmentScores: [Number], timeSpentMinutes: Number, rating: Number, updatedAt: Date }`
* **`DailyTask`**: `{ userId, courseId, date, title, microUnits: [{ step, completed }], difficultyLevel, estimatedMinutes, status: 'pending'|'completed' }`
* **`JobListing`**: `{ title, organization, type: 'corporate'|'gov_exam', requiredSkills: [String], minQualification: String, eligibilityCriteria: Object, matchVector: [Number] }`

## 5. Environment Variables (`.env.example`)

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_learning_rec
JWT_SECRET=super_secret_dev_key

# Free AI Provider Configuration ('gemini' | 'groq' | 'ollama' | 'local_fallback')
AI_PROVIDER=gemini
GEMINI_API_KEY=your_free_google_ai_studio_key
GROQ_API_KEY=your_free_groq_key
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b
```

## 6. Development Commands

```bash
# Root / Workspace
npm run dev           # Run both client (Vite) and server (Express) concurrently
npm run seed          # Seed 30 synthetic learner profiles, precomputed local embeddings, courses, and jobs
npm test              # Run API & recommendation validation suite (Precision@10, Recall@10)

# Backend (/server)
cd server && npm run dev
cd server && npm run test:rec   # Validate k=5 and k=10 recommendation consistency & <200ms latency

# Frontend (/client)
cd client && npm run dev
cd client && npm run build      # TypeScript check + Vite bundle
```

## 7. AI Provider Pattern — Pluggable Architecture

The AI layer uses an **External API Provider Pattern** to enable zero-downtime provider switching and graceful degradation.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AIProvider Interface                      │
│  (server/src/services/ai/aiProvider.ts)                     │
├─────────────────────────────────────────────────────────────┤
│  • generateDailyTasks(userProfile, course)                  │
│  • generateTextEmbeddings(text)                             │
│  • tailorResumeBullet(courseTitle, skills)                  │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       ┌────────────┐ ┌──────────┐ ┌──────────┐
       │ Gemini     │ │ Local    │ │ Mock     │
       │ Provider   │ │ TF-IDF   │ │ Provider │
       │ (Primary)  │ │ Fallback │ │ (Tests)  │
       └────────────┘ └──────────┘ └──────────┘
```

### Current Providers

| Provider | File | Use Case | Cost |
|----------|------|----------|------|
| **Gemini** | `server/src/services/ai/geminiProvider.ts` | Primary cloud free tier | Free tier |
| **Local TF-IDF** | Built into `geminiProvider.ts` | Fallback when API unavailable | $0 |
| **Mock** | (future) `mockProvider.ts` | CI/CD, offline dev | $0 |

### Configuration

Set the active provider via environment variable:

```env
# server/.env or root .env.example
AI_PROVIDER=gemini          # gemini | local | mock
GEMINI_API_KEY=your_key     # Get from https://aistudio.google.com/
```

### Switching Providers

1. **Add a new provider**: Create `server/src/services/ai/<name>Provider.ts` implementing `AIProvider` interface
2. **Register in factory**: Update `getAIProvider()` in `geminiProvider.ts` (or create a dedicated factory)
3. **Set env var**: Change `AI_PROVIDER=<name>` and add required API keys
4. **No code changes needed** in controllers/services — they depend on the interface only

### Graceful Fallback Behavior

The `GeminiProvider` automatically falls back to local TF-IDF when:
- `GEMINI_API_KEY` is not set
- API returns 429 (rate limit) or quota exceeded
- Network errors occur
- JSON parsing fails

This ensures **tests and builds never fail** due to external API issues.

### Usage in Services

```typescript
// In any service/controller:
import { getAIProvider } from '../services/ai/geminiProvider.js';

const aiProvider = getAIProvider();

// Generate daily tasks
const tasks = await aiProvider.generateDailyTasks(userProfile, course);

// Generate embeddings for recommendations
const embedding = await aiProvider.generateTextEmbeddings(text);

// Tailor resume bullets
const bullet = await aiProvider.tailorResumeBullet(courseTitle, skills);
```

### Adding a New Provider (e.g., Groq, Ollama)

1. Create `server/src/services/ai/groqProvider.ts`:
```typescript
import { AIProvider } from './aiProvider.js';

export class GroqProvider implements AIProvider {
  async generateDailyTasks(...) { /* ... */ }
  async generateTextEmbeddings(...) { /* ... */ }
  async tailorResumeBullet(...) { /* ... */ }
}
```

2. Update factory in `geminiProvider.ts` (or create `providerFactory.ts`):
```typescript
export function getAIProvider(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    case 'groq': return new GroqProvider();
    case 'ollama': return new OllamaProvider();
    case 'local': return new LocalProvider();
    case 'gemini':
    default: return new GeminiProvider();
  }
}
```

3. Add env vars to `.env.example`

---

## 8. Vibe Coding Rules & Guardrails for Claude

1. **Zero Paid APIs Rule:** Never import or require paid-only SDKs (no paid OpenAI or Anthropic API dependencies). Always use `@huggingface/transformers` + `natural` for local embeddings/NLP, and route generative prompts through the unified free `aiProvider.js` service (supporting Gemini Free Tier, Groq Free Tier, Ollama, and an automatic zero-key deterministic fallback).
2. **Plan First, Code Second:** Never generate multi-file features without updating `plan.md` first. Ask clarifying questions if requirements are ambiguous.
3. **Vertical Slices Only:** Build and verify one slice at a time (e.g., *Slice 1: Auth + Adaptive Onboarding -> Slice 2: Course Seed + Local Embeddings + 3-Tier Rec Engine -> Slice 3: Free AI Daily Task Generator -> Slice 4: Analytics + Resume/Job Matcher*).
4. **Strict Localization:** Do not rewrite entire files when a targeted edit suffices. Do not install unapproved npm packages without asking.
5. **Performance & Edge Cases:**
   * Recommendation endpoints must respond in $<200\text{ms}$ (precompute `all-MiniLM-L6-v2` embeddings and TF-IDF vectors when seeding or creating courses).
   * Always handle cold-start edge cases: users with zero declared interests, conflicting qualifications, or empty interaction histories must fall back gracefully to onboarding-seeded recommendations.
6. **Security Standards:** Enforce `zod` schema validation on every Express `req.body`/`req.query`, sanitize inputs against NoSQL/SQL injection, and protect all routes with JWT + RBAC middleware.