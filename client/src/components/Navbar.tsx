import React, { useState } from 'react';
import { Menu, X, User, ChevronDown, BookOpen, CheckSquare, TrendingUp, LogOut, Settings, Lock, UserPlus } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { useDemoUser, DEMO_USERS } from '../hooks/useDemoUser';
import { clsx } from 'clsx';

interface NavbarProps {
  // onUserSelect is now handled by global context
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { activeUserId, setActiveUserId, getActiveUser } = useDemoUser();

  const handleUserSelect = (userId: string) => {
    setUserMenuOpen(false);
    setActiveUserId(userId);
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
              <Link to="/dashboard" className="text-xl font-bold text-indigo-600">LearnAI</Link>
            </div>

            <div className="hidden lg:ml-8 lg:flex lg:space-x-4">
              {isAuthenticated ? (
                navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-2" />
                    {item.name}
                  </Link>
                ))
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    <Lock className="h-5 w-5 mr-2" />
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
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
                      {activeUserId
                        ? getActiveUser()?.name || 'Select User'
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
                            activeUserId === demoUser.id
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
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 block"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {user && (
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-700 font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors hidden sm:block"
                >
                  <Lock className="h-5 w-5 mr-2" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2 rounded-md text-base font-medium',
                    location.pathname === item.href
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              ))
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Lock className="h-5 w-5 mr-3" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <UserPlus className="h-5 w-5 mr-3" />
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};