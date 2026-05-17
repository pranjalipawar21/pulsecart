import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Staff from './pages/Staff';
import './index.css';

const OWNER_PAGES = [
  { id: 'dashboard', label: 'Dashboard',  icon: '📊', section: 'MAIN' },
  { id: 'inventory', label: 'Inventory',  icon: '📦', section: 'MAIN' },
  { id: 'sales',     label: 'Sales',      icon: '💰', section: 'MAIN' },
  { id: 'alerts',    label: 'Alerts',     icon: '🔔', section: 'MAIN' },
  { id: 'analytics', label: 'Analytics',  icon: '📈', section: 'REPORTS' },
  { id: 'reports',   label: 'Reports',    icon: '📄', section: 'REPORTS' },
  { id: 'staff',     label: 'Staff',      icon: '👥', section: 'MANAGE' },
  { id: 'settings',  label: 'Settings',   icon: '⚙️',  section: 'MANAGE' },
];

const STAFF_PAGES = [
  { id: 'inventory', label: 'Inventory', icon: '📦', section: 'MAIN' },
  { id: 'sales',     label: 'Sales',     icon: '💰', section: 'MAIN' },
  { id: 'alerts',    label: 'Alerts',    icon: '🔔', section: 'MAIN' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️',  section: 'MANAGE' },
];

function Sidebar({ page, setPage, user, isOwner, logout, collapsed, setCollapsed, alertCount }) {
  const pages = isOwner ? OWNER_PAGES : STAFF_PAGES;
  const sections = [...new Set(pages.map(p => p.section))];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">P</div>
        <div className="logo-text">
          <div className="logo-name">PulseCart</div>
          <div className="logo-sub">Retail Intelligence</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map(sec => (
          <div key={sec}>
            <div className="nav-section">{sec}</div>
            {pages.filter(p => p.section === sec).map(p => (
              <button
                key={p.id}
                className={`nav-item ${page === p.id ? 'active' : ''}`}
                onClick={() => setPage(p.id)}
              >
                <span className="nav-icon">{p.icon}</span>
                <span>{p.label}</span>
                {p.id === 'alerts' && alertCount > 0 && (
                  <span className="nav-badge">{alertCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={logout}>
          <div className="user-avatar">{(user.username[0] || 'U').toUpperCase()}</div>
          <div>
            <div className="user-name">{user.full_name || user.username}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button
          className="nav-item"
          style={{ marginTop: 4 }}
          onClick={() => setCollapsed(c => !c)}
        >
          <span className="nav-icon">{collapsed ? '→' : '←'}</span>
          <span>Collapse</span>
        </button>
      </div>
    </aside>
  );
}

function Topbar({ page, isOwner, theme, toggleTheme }) {
  const titles = {
    dashboard: 'Dashboard',  inventory: 'Inventory Management',
    sales: 'Sales',          alerts: 'Reorder Alerts',
    analytics: 'Analytics',  reports: 'Reports & Exports',
    staff: 'Staff Management', settings: 'Settings',
  };
  return (
    <header className="topbar">
      <div className="topbar-title">
        {titles[page] || 'PulseCart'}
        {page === 'analytics' && !isOwner && (
          <span className="topbar-sub">Owner access required</span>
        )}
      </div>
      <button
        className="btn btn-outline btn-sm"
        onClick={toggleTheme}
        title="Toggle theme"
      >
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    </header>
  );
}

function PageView({ page, isOwner, alertCount, setAlertCount }) {
  if (page === 'dashboard' && isOwner) return <Dashboard />;
  if (page === 'inventory') return <Inventory isOwner={isOwner} />;
  if (page === 'sales')     return <Sales isOwner={isOwner} />;
  if (page === 'alerts')    return <Alerts isOwner={isOwner} onCountChange={setAlertCount} />;
  if (page === 'analytics' && isOwner) return <Analytics />;
  if (page === 'reports'   && isOwner) return <Reports />;
  if (page === 'staff'     && isOwner) return <Staff />;
  if (page === 'settings') return <Settings isOwner={isOwner} />;
  return (
    <div className="page-content">
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <div className="empty-title">Access Restricted</div>
        <div className="empty-sub">You don't have permission to view this page.</div>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, isOwner, logout } = useAuth();
  const [page, setPage] = useState(isOwner ? 'dashboard' : 'inventory');
  const [collapsed, setCollapsed] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('pc_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pc_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <div className="app-layout">
      <Sidebar
        page={page} setPage={setPage}
        user={user} isOwner={isOwner} logout={logout}
        collapsed={collapsed} setCollapsed={setCollapsed}
        alertCount={alertCount}
      />
      <div className={`main-area ${collapsed ? 'collapsed' : ''}`}>
        <Topbar page={page} isOwner={isOwner} theme={theme} toggleTheme={toggleTheme} />
        <PageView page={page} isOwner={isOwner} alertCount={alertCount} setAlertCount={setAlertCount} />
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  if (!user) {
    return showRegister
      ? <Register onBack={() => setShowRegister(false)} />
      : <Login onRegister={() => setShowRegister(true)} />;
  }
  return <AppShell />;
}
