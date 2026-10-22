import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2, BookOpen, Target } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { OnboardingView } from './views/OnboardingView';
import { RecommendationFeed } from './views/RecommendationFeed';
import { DailyTaskWidget } from './views/DailyTaskWidget';
import { ProgressSummary } from './views/ProgressSummary';
import { useAuthStore } from './hooks/useAuthStore';
import { api } from './services/api';
import { clsx } from 'clsx';

// Demo user IDs from Navbar
const DEMO_USERS = [
  { id: '6ad99527d2621ee6c604e74e', name: 'Peyton Garcia', tier: 'Intermediate' },
  { id: '6ad99527d2621ee6c604e750', name: 'Peyton Lewis', tier: 'Cold-Start' },
  { id: '6ad99527d2621ee6c604e74f', name: 'Alex Chen', tier: 'Beginner' },
  { id: '6ad99527d2621ee6c604e751', name: 'Jordan Kim', tier: 'Advanced' },
];

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

// Main Dashboard view
const DashboardView: React.FC = () => {
  const { user, userId } = useAuthStore();
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [streak, setStreak] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [tier, setTier] = useState('Novice');
  const [skills, setSkills] = useState<Array<{ skill: string; level: number; trend: 'up' | 'down' | 'stable' }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use selected demo user or current user
  const effectiveUserId = activeUserId || userId || '';

  const fetchProgress = useCallback(async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      // Fetch interactions to calculate streak and hours
      const interactionsRes = await api.getUserInteractions(effectiveUserId);
      const interactions = interactionsRes.data.interactions || [];

      // Calculate streak (consecutive days with activity)
      const dates = new Set(
        interactions
          .filter((i: { status: string; updatedAt?: string }) => i.status === 'completed' && i.updatedAt)
          .map((i: { updatedAt?: string }) => new Date(i.updatedAt!).toDateString())
      );
      let currentStreak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (dates.has(today) || dates.has(yesterday)) {
        let checkDate = new Date(dates.has(today) ? today : yesterday);
        while (dates.has(checkDate.toDateString())) {
          currentStreak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        }
      }

      // Calculate total hours
      const totalMinutes = interactions.reduce((sum: number, i: { timeSpentMinutes?: number }) => sum + (i.timeSpentMinutes || 0), 0);

      // Determine tier based on completed courses
      const completedCount = interactions.filter((i: { status: string }) => i.status === 'completed').length;
      let currentTier = 'Novice';
      if (completedCount >= 20) currentTier = 'Expert';
      else if (completedCount >= 10) currentTier = 'Advanced';
      else if (completedCount >= 5) currentTier = 'Intermediate';
      else if (completedCount >= 1) currentTier = 'Beginner';

      // Mock skills data based on user's interests
      const demoUser = DEMO_USERS.find(u => u.id === effectiveUserId);
      const userSkills = demoUser
        ? [
            { skill: 'Web Development', level: 65, trend: 'up' as const },
            { skill: 'Data Science', level: 40, trend: 'stable' as const },
            { skill: 'Machine Learning', level: 25, trend: 'up' as const },
            { skill: 'DevOps', level: 15, trend: 'stable' as const },
          ].slice(0, 3)
        : [
            { skill: 'React', level: 70, trend: 'up' as const },
            { skill: 'TypeScript', level: 55, trend: 'up' as const },
            { skill: 'Node.js', level: 45, trend: 'stable' as const },
          ];

      setStreak(currentStreak);
      setTotalHours(Math.round(totalMinutes / 60));
      setTier(currentTier);
      setSkills(userSkills);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onUserSelect={setActiveUserId} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name || 'Learner'}! 👋
              </h1>
              <p className="text-gray-500 mt-1">
                {activeUserId
                  ? `Viewing as ${DEMO_USERS.find(u => u.id === activeUserId)?.name}`
                  : 'Your personalized learning dashboard'}
              </p>
            </div>
            {activeUserId && (
              <button
                onClick={() => setActiveUserId('')}
                className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Reset to my account
              </button>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <ProgressSummary
          streak={streak}
          totalHours={totalHours}
          tier={tier}
          skills={skills}
          isLoading={isLoading}
        />

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/recommendations"
            className={clsx(
              'p-5 rounded-xl border transition-all flex items-center space-x-4',
              'bg-white border-gray-100 hover:border-indigo-300 hover:shadow-lg'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Get Recommendations</h3>
              <p className="text-sm text-gray-500">AI-powered course suggestions</p>
            </div>
          </a>

          <a
            href="/tasks"
            className={clsx(
              'p-5 rounded-xl border transition-all flex items-center space-x-4',
              'bg-white border-gray-100 hover:border-green-300 hover:shadow-lg'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Daily Tasks</h3>
              <p className="text-sm text-gray-500">Micro-learning units for today</p>
            </div>
          </a>

          <a
            href="/progress"
            className={clsx(
              'p-5 rounded-xl border transition-all flex items-center space-x-4',
              'bg-white border-gray-100 hover:border-purple-300 hover:shadow-lg'
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View Progress</h3>
              <p className="text-sm text-gray-500">Detailed analytics & insights</p>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
};

// Tasks view
const TasksView: React.FC = () => {
  const { userId } = useAuthStore();
  const [activeUserId, setActiveUserId] = useState<string>('');
  const effectiveUserId = activeUserId || userId || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onUserSelect={setActiveUserId} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Today's Tasks</h1>
          <p className="text-gray-500 mt-1">
            {activeUserId
              ? `Viewing tasks for ${DEMO_USERS.find(u => u.id === activeUserId)?.name}`
              : 'Your personalized micro-learning units'}
          </p>
        </div>
        <DailyTaskWidget userId={effectiveUserId} />
      </main>
    </div>
  );
};

// Recommendations view
const RecommendationsView: React.FC = () => {
  const { userId } = useAuthStore();
  const [activeUserId, setActiveUserId] = useState<string>('');
  const effectiveUserId = activeUserId || userId || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onUserSelect={setActiveUserId} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-gray-500 mt-1">
            {activeUserId
              ? `Viewing recommendations for ${DEMO_USERS.find(u => u.id === activeUserId)?.name}`
              : 'AI-powered personalized course suggestions'}
          </p>
        </div>
        <RecommendationFeed userId={effectiveUserId} />
      </main>
    </div>
  );
};

// Progress view
const ProgressView: React.FC = () => {
  const { userId } = useAuthStore();
  const [activeUserId, setActiveUserId] = useState<string>('');
  const effectiveUserId = activeUserId || userId || '';
  const [streak, setStreak] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [tier, setTier] = useState('Novice');
  const [skills, setSkills] = useState<Array<{ skill: string; level: number; trend: 'up' | 'down' | 'stable' }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);
    try {
      const interactionsRes = await api.getUserInteractions(effectiveUserId);
      const interactions = interactionsRes.data.interactions || [];

      const dates = new Set(
        interactions
          .filter((i: { status: string; updatedAt?: string }) => i.status === 'completed' && i.updatedAt)
          .map((i: { updatedAt?: string }) => new Date(i.updatedAt!).toDateString())
      );
      let currentStreak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (dates.has(today) || dates.has(yesterday)) {
        let checkDate = new Date(dates.has(today) ? today : yesterday);
        while (dates.has(checkDate.toDateString())) {
          currentStreak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        }
      }

      const totalMinutes = interactions.reduce((sum: number, i: { timeSpentMinutes?: number }) => sum + (i.timeSpentMinutes || 0), 0);
      const completedCount = interactions.filter((i: { status: string }) => i.status === 'completed').length;
      let currentTier = 'Novice';
      if (completedCount >= 20) currentTier = 'Expert';
      else if (completedCount >= 10) currentTier = 'Advanced';
      else if (completedCount >= 5) currentTier = 'Intermediate';
      else if (completedCount >= 1) currentTier = 'Beginner';

      const demoUser = DEMO_USERS.find(u => u.id === effectiveUserId);
      const userSkills = demoUser
        ? [
            { skill: 'Web Development', level: 65, trend: 'up' as const },
            { skill: 'Data Science', level: 40, trend: 'stable' as const },
            { skill: 'Machine Learning', level: 25, trend: 'up' as const },
            { skill: 'DevOps', level: 15, trend: 'stable' as const },
          ]
        : [
            { skill: 'React', level: 70, trend: 'up' as const },
            { skill: 'TypeScript', level: 55, trend: 'up' as const },
            { skill: 'Node.js', level: 45, trend: 'stable' as const },
          ];

      setStreak(currentStreak);
      setTotalHours(Math.round(totalMinutes / 60));
      setTier(currentTier);
      setSkills(userSkills);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onUserSelect={setActiveUserId} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Progress Analytics</h1>
          <p className="text-gray-500 mt-1">
            {activeUserId
              ? `Viewing progress for ${DEMO_USERS.find(u => u.id === activeUserId)?.name}`
              : 'Your learning journey insights'}
          </p>
        </div>
        <ProgressSummary
          streak={streak}
          totalHours={totalHours}
          tier={tier}
          skills={skills}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

// Settings view (placeholder)
const SettingsView: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Account</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Name:</strong> {user?.name || 'Demo User'}</p>
                <p><strong>Email:</strong> {user?.email || 'demo@example.com'}</p>
                <p><strong>Role:</strong> {user?.role || 'learner'}</p>
                <p><strong>Tier:</strong> {user?.onboardingCompleted ? 'Onboarded' : 'Not onboarded'}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Preferences</h3>
              <p className="text-sm text-gray-600">Preference settings coming soon...</p>
            </div>

            <button
              onClick={logout}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// App wrapper with auth initialization
const AppContent: React.FC = () => {
  const { initializeAuth, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on onboarding, redirect to onboarding
  if (!isAuthenticated && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If authenticated and on onboarding, redirect to dashboard
  if (isAuthenticated && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingView />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <RecommendationsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <ProgressView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsView />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;