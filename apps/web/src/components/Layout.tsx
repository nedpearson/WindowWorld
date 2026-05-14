import { useState, useEffect, type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store';

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [ipError, setIpError] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };
  const canGoBack = location.pathname !== '/';

  // Build the mobile URL
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  const mobileUrl = isLocalhost && lanIp
    ? `http://${lanIp}:${window.location.port || 80}/mobile`
    : `${window.location.protocol}//${window.location.host}/mobile`;

  const links = [
    { to: '/forms', label: '📋 Fill Forms' },
    { to: '/', label: '📊 Dashboard' },
    { to: '/appointments', label: '📅 Appointments' },
    { to: '/office', label: '🏢 Office Queue' },
    { to: '/pricing', label: '💰 Pricing Admin' },
    { to: '/pricing-import', label: '📦 Pricing Import' },
    { to: '/rules', label: '⚡ Rule Engine' },
    { to: '/measurement-rules', label: '📐 Measurement Rules' },
    { to: '/mobile', label: '📱 Mobile Field App' },
  ];

  // Fetch the real LAN IP when the QR panel is first opened (only locally)
  useEffect(() => {
    if (!showQR || lanIp !== null || !isLocalhost) return; // only fetch once, and only on localhost
    fetch('/api/network-ip')
      .then(r => r.json())
      .then(data => {
        if (data.ip && data.ip !== 'localhost') setLanIp(data.ip);
        else setIpError(true);
      })
      .catch(() => setIpError(true));
  }, [showQR, lanIp, isLocalhost]);

  return (
    <div className="app-layout">
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="burger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Window World</span>
        {canGoBack ? (
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '0.25rem 0.625rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            ← Back
          </button>
        ) : <div style={{ width: 60 }} />}
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

        {/* ── QR Code — scan to open Mobile Field App ── */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowQR(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: showQR ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showQR ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
              borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer',
              color: showQR ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.2s',
            }}>
            <span>📱 Open on Phone</span>
            <span style={{ fontSize: '0.625rem', opacity: 0.7 }}>{showQR ? '▲' : '▼'}</span>
          </button>

          {showQR && (
            <div style={{
              marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              padding: '1rem', background: 'white', borderRadius: 10,
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}>
              {/* Loading state while fetching IP */}
              {isLocalhost && !lanIp && !ipError && (
                <div style={{ height: 172, width: 172, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                  Finding network IP…
                </div>
              )}

              {/* Error state */}
              {isLocalhost && ipError && (
                <div style={{ width: 172, color: '#ef4444', fontSize: '0.6875rem', textAlign: 'center', lineHeight: 1.5 }}>
                  Could not detect LAN IP.
                  <br />Run <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, color: '#0f172a' }}>ipconfig</code> (Windows) or <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3, color: '#0f172a' }}>ifconfig</code> (Mac) and type the IP below:<br />
                  <input
                    style={{ marginTop: 6, width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 8px', fontSize: '0.75rem', color: '#0f172a', textAlign: 'center' }}
                    placeholder="192.168.x.x"
                    onChange={e => { if (e.target.value.match(/^\d+\.\d+\.\d+\.\d+$/)) setLanIp(e.target.value); }}
                  />
                </div>
              )}

              {/* QR code — only render once we have a real IP or if we're in prod */}
              {(!isLocalhost || lanIp) && (
                <>
                  <QRCodeSVG
                    value={mobileUrl}
                    size={172}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="M"
                    includeMargin={false}
                  />
                  <div style={{
                    fontSize: '0.5625rem', color: '#475569', textAlign: 'center',
                    wordBreak: 'break-all', maxWidth: 172, lineHeight: 1.4, fontWeight: 600,
                  }}>
                    {mobileUrl}
                  </div>
                </>
              )}

              {isLocalhost && (
                <div style={{ fontSize: '0.5625rem', color: '#94a3b8', textAlign: 'center' }}>
                  📶 Same Wi-Fi network required
                </div>
              )}
            </div>
          )}
        </div>

        {/* User / Sign Out */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
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
        {/* Global back button — desktop */}
        {canGoBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              marginBottom: '1rem', padding: '0.375rem 0.875rem',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-secondary)', fontSize: '0.8125rem',
              fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}>
            ← Back
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
