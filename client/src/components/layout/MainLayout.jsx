import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { LayoutDashboard, FileText, History, Settings as SettingsIcon, Menu, X, LogOut, ShieldAlert, Receipt, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  let navigation = [];

  if (user?.role === 'CASHIER') {
    navigation.push({ name: 'Dashboard', href: '/', icon: LayoutDashboard });
    navigation.push({ name: 'Pending Payouts', href: '/cashier/expenses', icon: Receipt });
    navigation.push({ name: 'Record Transfer', href: '/transfers/new', icon: FileText });
    navigation.push({ name: 'Transfer History', href: '/transfers', icon: History });
  } else {
    // Admin and Collector have standard receipt routes
    navigation.push({ name: 'Dashboard', href: '/', icon: LayoutDashboard });
    navigation.push({ name: 'New Receipt', href: '/donations/new', icon: FileText });
    navigation.push({ name: 'Receipt History', href: '/donations/history', icon: History });
  }

  if (user?.role === 'COLLECTOR') {
    navigation.push({ name: 'My Expenses', href: '/expenses', icon: Receipt });
  }

  if (user?.role === 'ADMIN') {
    navigation.push({ name: 'Manage Expenses', href: '/manage-expenses', icon: Receipt });
    navigation.push({ name: 'Transfer History', href: '/transfers', icon: History });
    navigation.push({ name: 'Manage Users', href: '/users', icon: SettingsIcon });
    navigation.push({ name: 'Security Logs', href: '/security-logs', icon: ShieldAlert });
    navigation.push({ name: 'Settings', href: '/settings', icon: SettingsIcon });
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
        transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col justify-between
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <span className="text-lg font-bold text-slate-900 dark:text-white truncate">Abdul Kalam Youth Welfare Association</span>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-slate-700">
              <X size={20} />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200'
                      : 'text-slate-600 hover:bg-slate-500/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-500/10 dark:hover:text-white'}
                  `}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-600 dark:text-primary-300' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 text-center shrink-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Created by <span className="font-bold text-slate-900 dark:text-white">Manoj</span>
          </p>
          <p className="text-xs mt-1">
            <a href="https://pmjprojects.vercel.app" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-blue-800 dark:text-primary-400 dark:hover:text-blue-300 hover:underline">
              PMJ Projects
            </a>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50 dark:bg-slate-900">

        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              Welcome, {user?.name}
              {user?.role === 'ADMIN' && (
                <span className="px-2 py-0.5 rounded text-xs bg-primary-100 text-blue-800 dark:bg-primary-900 dark:text-primary-200">Admin</span>

              )}
            </span>
            <button
              onClick={logout}
              className="flex items-center text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <LogOut size={16} className="mr-1" />
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
