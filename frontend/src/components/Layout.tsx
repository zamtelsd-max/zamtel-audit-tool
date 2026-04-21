import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/authSlice';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: '/', icon: '📊', label: 'Dashboard' },
  { to: '/devices', icon: '📱', label: 'Devices' },
  { to: '/cases', icon: '📋', label: 'Audit Cases' },
  { to: '/alerts', icon: '🔔', label: 'Alerts' },
  { to: '/bulk-import', icon: '📤', label: 'Bulk Import', roles: ['ADMIN', 'MARKET_MANAGEMENT'] },
  { to: '/users', icon: '👥', label: 'Users', roles: ['ADMIN'] },
  { to: '/reports', icon: '📈', label: 'Reports' },
];

function roleColor(role: string) {
  const colors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    TRADE_AUDITOR: 'bg-blue-100 text-blue-700',
    MARKET_MANAGEMENT: 'bg-purple-100 text-purple-700',
    TDR: 'bg-teal-100 text-teal-700',
    TEAM_LEAD: 'bg-orange-100 text-orange-700',
    AGENT: 'bg-green-100 text-green-700',
  };
  return colors[role] || 'bg-gray-100 text-gray-700';
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 bg-zamtel-green-dark">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-zamtel-green text-sm">Z</div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">Zamtel</div>
            <div className="text-green-200 text-xs leading-tight">Audit Tool</div>
          </div>
        </div>
        <p className="text-green-300 text-xs mt-1 italic">Create Your World</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-zamtel-green shadow-sm'
                  : 'text-green-100 hover:bg-zamtel-green-light hover:text-white'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-zamtel-green-light">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-zamtel-pink flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${roleColor(user?.role || '')}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-green-200 hover:text-white text-sm flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zamtel-green-light transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 bg-zamtel-green transform transition-transform duration-200 lg:translate-x-0 lg:static lg:flex lg:flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-zamtel-green font-bold text-lg">Zamtel</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600 text-sm">Trade Audit Tool</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm hidden sm:block">{user?.name}</span>
            <div className="w-8 h-8 rounded-full bg-zamtel-green flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
