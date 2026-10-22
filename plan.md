# Project Plan: AI-Powered Learning Recommendation System

## Slice 1: Foundation & Data Seeding
- Initialize MERN monorepo boilerplate.
- Create flat MongoDB Mongoose schemas (`User`, `Course`, `Task`, `Resume`).
- Build `seed.ts` to generate 50 diverse learning resources and 30 synthetic learner profiles to test cold-start scenarios.

## Slice 2: Content-Based Filtering & NLP (Zero-Cost)
- Implement local TF-IDF text processing for course metadata using `natural`.
- Generate 384-dimensional dense vector embeddings using `@xenova/transformers` locally.
- Configure MongoDB Atlas M0 Vector Search for semantic querying.

## Slice 3: Collaborative Filtering & Hybrid Engine
- Implement user-user cosine similarity logic in Node.js.
- Build the 3-tier hybrid aggregation pipeline merging TF-IDF, semantic search, and collaborative scores.
- Write unit tests verifying Top-N (k=5, k=10) accuracy and cold-start fallback.

## Slice 4: Express Backend API
- Build RESTful endpoints for user onboarding, auth (JWT), and profile updates.
- Expose `GET /api/recommendations/:userId` returning the weighted course ranking.
- Expose `POST /api/tasks/generate` wrapping the free AI provider.

## Slice 5: React Frontend & Dashboard
- Build the interactive diagnostic onboarding flow to establish baseline user profiles.
- Create the predictive progress tracking dashboard visualizing mastery and task completion.
- Connect the React UI to the recommendation endpoints.

## Slice 6: Generative Tasks & Career Integration
- Integrate the Free-Tier Gemini API / local Ollama for the Daily AI Micro-Task Generator.
- Build the automated resume builder that translates completed courses into standardized bullet points.
- Finalize UI for job matching and export capabilities.