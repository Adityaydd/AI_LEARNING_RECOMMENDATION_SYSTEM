import React, { useState } from 'react';
import { Menu, X, User, ChevronDown, BookOpen, CheckSquare, TrendingUp, LogOut, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { clsx } from 'clsx';

const DEMO_USERS = [
  { id: '6ad99527d2621ee6c604e74e', name: 'Peyton Garcia', tier: 'Intermediate', description: 'Has interaction history' },
  { id: '6ad99527d2621ee6c604e750', name: 'Peyton Lewis', tier: 'Cold-Start', description: 'No interactions yet' },
  { id: '6ad99527d2621ee6c604e74f', name: 'Alex Chen', tier: 'Beginner', description: 'New learner' },
  { id: '6ad99527d2621ee6c604e751', name: 'Jordan Kim', tier: 'Advanced', description: 'Experienced dev' },
];

interface NavbarProps {
  onUserSelect?: (userId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onUserSelect }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setUserMenuOpen(false);
    if (onUserSelect) {
      onUserSelect(userId);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: TrendingUp },
    { name: 'Recommendations', href: '/recommendations', icon: BookOpen },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Progress', href: '/progress', icon: TrendingUp },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-indigo-600">LearnAI</h1>
            </div>

            <div className="hidden lg:ml-8 lg:flex lg:space-x-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    location.pathname === item.href
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Demo User Selector */}
            <div className="relative">
              <button
                type="button"
                className={clsx(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:block">
                  {selectedUserId
                    ? DEMO_USERS.find(u => u.id === selectedUserId)?.name || 'Select User'
                    : user?.name || 'Demo User'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase">Switch Demo User</p>
                  </div>
                  {DEMO_USERS.map((demoUser) => (
                    <button
                      key={demoUser.id}
                      onClick={() => handleUserSelect(demoUser.id)}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        selectedUserId === demoUser.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <div className="font-medium">{demoUser.name}</div>
                      <div className="text-xs text-gray-500">
                        {demoUser.tier} • {demoUser.description}
                      </div>
                    </button>
                  ))}
                  <hr className="my-1 border-gray-100" />
                  {isAuthenticated && (
                    <>
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User Avatar */}
            {isAuthenticated && user && (
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-700 font-medium text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center px-3 py-2 rounded-md text-base font-medium',
                  location.pathname === item.href
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};