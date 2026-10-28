import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const DEMO_USERS = [
  {
    id: '6ad99527d2621ee6c604e74e',
    name: 'Peyton Garcia',
    tier: 'Intermediate',
    description: 'Has interaction history',
    skills: [
      { name: 'JavaScript', level: 'intermediate' },
      { name: 'React', level: 'intermediate' },
      { name: 'Node.js', level: 'beginner' },
    ],
    interests: ['Web Development', 'Frontend Engineering'],
  },
  {
    id: '6ad99527d2621ee6c604e750',
    name: 'Peyton Lewis',
    tier: 'Cold-Start',
    description: 'No interactions yet',
    skills: [],
    interests: ['Data Science'],
  },
  {
    id: '6ad99527d2621ee6c604e74f',
    name: 'Alex Chen',
    tier: 'Beginner',
    description: 'New learner',
    skills: [
      { name: 'Python', level: 'beginner' },
    ],
    interests: ['Machine Learning', 'Data Science'],
  },
  {
    id: '6ad99527d2621ee6c604e751',
    name: 'Jordan Kim',
    tier: 'Advanced',
    description: 'Experienced dev',
    skills: [
      { name: 'TypeScript', level: 'advanced' },
      { name: 'React', level: 'advanced' },
      { name: 'Node.js', level: 'intermediate' },
      { name: 'AWS', level: 'intermediate' },
    ],
    interests: ['Backend Engineering', 'DevOps & Cloud', 'Software Architecture'],
  },
];

const STORAGE_KEY = 'selected_demo_user';

interface DemoUserContextType {
  activeUserId: string;
  setActiveUserId: (userId: string) => void;
  effectiveUserId: (userId: string) => string;
  getActiveUser: () => typeof DEMO_USERS[0] | null;
  clearActiveUser: () => void;
}

const DemoUserContext = createContext<DemoUserContextType | undefined>(undefined);

export const DemoUserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize from localStorage
  const [activeUserId, setActiveUserIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'string' && DEMO_USERS.find(u => u.id === parsed)) {
            return parsed;
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
    return '';
  });

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeUserId) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeUserId));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [activeUserId]);

  const setActiveUserId = (userId: string) => {
    setActiveUserIdState(userId);
  };

  const clearActiveUser = () => {
    setActiveUserIdState('');
    // Clear localStorage immediately to avoid timing issues
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const effectiveUserId = (userId: string) => {
    return activeUserId || userId || '';
  };

  const getActiveUser = () => {
    if (!activeUserId) return null;
    return DEMO_USERS.find(u => u.id === activeUserId) || null;
  };

  const contextValue = {
    activeUserId,
    setActiveUserId,
    effectiveUserId,
    getActiveUser,
    clearActiveUser,
  };

  return (
    <DemoUserContext.Provider value={contextValue}>
      {children}
    </DemoUserContext.Provider>
  );
};

export const useDemoUser = (): DemoUserContextType => {
  const context = useContext(DemoUserContext);
  if (!context) {
    throw new Error('useDemoUser must be used within a DemoUserProvider');
  }
  return context;
};

export { DEMO_USERS };