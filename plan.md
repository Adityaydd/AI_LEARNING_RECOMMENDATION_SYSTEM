# Implementation Plan: User Registration/Login & Onboarding Flow

## Overview
Implement user registration, login, and a 2-step adaptive onboarding flow (domain selection → skills multi-select) that computes profileVector using local embeddings and saves to user profile.

## Current State
- ✅ Backend auth routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`
- ✅ Backend onboarding routes exist but incomplete: `/api/onboarding/start`, `/api/onboarding/answer`, `/api/onboarding/complete`
- ✅ Frontend auth store with JWT persistence (Zustand + localStorage)
- ✅ Frontend OnboardingView exists (3-step) but uses mock data
- ❌ Frontend LoginView, RegisterView - NOT CREATED
- ❌ Onboarding not connected to backend
- ❌ 2-step flow not implemented (currently 3-step)

## Requirements from User
- **2-step onboarding:**
  1. Step 1 (single-select): Target domain/role → "Web Development", "Data Science", "Machine Learning", etc.
  2. Step 2 (multi-select): Skills checkboxes based on chosen domain
- **Backend:** PUT /api/users/:id/onboarding endpoint (or use existing /api/onboarding/complete) to save learning goals
- **Frontend:** Login/Register views, onboarding flow, redirect to /recommendations
- **Connect auth flow to existing JWT + Zustand store**
- **Compute profileVector** using local embeddings (aiProvider.generateTextEmbeddings)

## Phase 1: Frontend Auth Views
1. Create `client/src/views/LoginView.tsx` - email/password form, link to register
2. Create `client/src/views/RegisterView.tsx` - name, email, password, studyTimeMinutes, link to login
3. Update `client/src/App.tsx` - add `/login` and `/register` routes (public, no ProtectedRoute)
4. Update `client/src/components/Navbar.tsx` - show Login/Register when not authenticated

## Phase 2: Backend Onboarding Enhancement
1. Update `server/src/routes/onboarding.ts`:
   - Store answers in user document as temporary fields or session
   - POST `/api/onboarding/complete`: 
     - Compute profileVector using aiProvider.generateTextEmbeddings (combine interests, skills, academicBackground)
     - Save skills[], interests[], studyTimeMinutes, onboardingCompleted=true
     - Return updated user profile
   - Add validation schemas for answers

## Phase 3: Frontend Onboarding Integration
1. Update `client/src/views/OnboardingView.tsx`:
   - Use real API endpoints (startOnboarding, answerOnboarding, completeOnboarding)
   - Change to 2-step flow:
     - Step 1: Domain single-select (from DOMAINS list)
     - Step 2: Skills multi-select (checkboxes from domain-relevant skills)
   - Include studyTimeMinutes (can be from registration or added to onboarding)
   - On complete: call completeOnboarding, get user profile, update auth store, redirect to /recommendations

## Phase 4: Navigation & Flow
1. App.tsx routing:
   - `/login` → LoginView (public)
   - `/register` → RegisterView (public)
   - `/onboarding` → OnboardingView (protected, redirects to /dashboard if completed)
   - `/dashboard` → DashboardView (protected)
   - etc.
2. After register/login → check onboardingCompleted → redirect to /onboarding or /recommendations
3. After onboarding complete → redirect to /recommendations

## Data Models
**User.onboardingAnswers** (temporary, during onboarding):
```typescript
{
  targetDomain: string,
  skills: string[],  // multi-select
  studyTimeMinutes: number
}
```

**User profile after onboarding:**
```typescript
{
  onboardingCompleted: true,
  interests: [targetDomain],
  skills: [{ name: skill, level: 'beginner' }],  // default level
  studyTimeMinutes: number,
  profileVector: number[384],  // from aiProvider.generateTextEmbeddings
  academicBackground: string  // optional
}
```

## Technical Details
- Use existing `aiProvider.generateTextEmbeddings()` for profileVector computation
- Embedding text: combine targetDomain + skills + academicBackground
- Skills default to 'beginner' level (user can update later)
- Study time from registration form (default 30 min)
- All API calls through `api` service with JWT interceptor

## File Changes
1. `client/src/views/LoginView.tsx` (NEW)
2. `client/src/views/RegisterView.tsx` (NEW)
3. `client/src/views/OnboardingView.tsx` (MODIFY - 2-step flow, real API)
4. `client/src/App.tsx` (MODIFY - add routes, fix redirect logic)
5. `client/src/components/Navbar.tsx` (MODIFY - auth state UI)
6. `server/src/routes/onboarding.ts` (MODIFY - save answers, compute profileVector)
7. `client/src/services/api.ts` (MODIFY - add/update onboarding methods if needed)
8. `server/src/models/User.ts` (MODIFY - add onboardingAnswers schema if needed)

## Testing Checklist
- [ ] Register new user → lands on onboarding
- [ ] Login existing user without onboarding → lands on onboarding
- [ ] Login existing user with onboarding → lands on dashboard/recommendations
- [ ] Onboarding step 1: select domain → step 2: select skills → complete → profileVector computed
- [ ] After onboarding → redirected to /recommendations
- [ ] Recommendations work with new user's profileVector
- [ ] JWT tokens persist across refresh
- [ ] Logout clears auth state