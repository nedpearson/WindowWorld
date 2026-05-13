import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  const links = [
    { to: '/forms', label: '📋 Fill Forms' },
    { to: '/', label: '📊 Dashboard' },
    { to: '/appointments', label: '📅 Appointments' },
    { to: '/office', label: '🏢 Office Queue' },
    { to: '/pricing', label: '💰 Pricing Admin' },
    { to: '/pricing-import', label: '📦 Pricing Import' },
    { to: '/mobile', label: '📱 Mobile Field App' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="burger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Window World</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Overlay */}
      {sidebarOpen && <div className="overlay open" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.5rem' }}>🪟</span>
          <h1>Window World</h1>
        </div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setSidebarOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            {user?.name}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content fade-in">
        {children}
      </main>
    </div>
  );
}
