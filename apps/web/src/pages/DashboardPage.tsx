import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    draft: 'badge-draft', in_progress: 'badge-progress', quoted: 'badge-quoted',
    sold: 'badge-sold', cancelled: 'badge-danger', needs_remeasure: 'badge-warning'
  };
  return map[s] || 'badge-draft';
};

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.dashboardStats().then(setStats).catch(console.error);
    api.dashboardRecent().then(setRecent).catch(console.error);
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="fade-in">
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <h1>📊 Dashboard</h1>
        <button className="btn btn-primary" onClick={() => navigate('/appointments')}>
          + New Appointment
        </button>
      </div>

      {stats ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.todayAppointments}</div>
            <div className="stat-label">Today's Appts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.draftCount}</div>
            <div className="stat-label">Drafts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--info)' }}>{stats.quotedCount}</div>
            <div className="stat-label">Quoted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.soldCount}</div>
            <div className="stat-label">Sold</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{stats.needsRemeasure}</div>
            <div className="stat-label">Needs Remeasure</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(stats.totalRevenue)}</div>
            <div className="stat-label">Total Revenue (Sold)</div>
          </div>
        </div>
      ) : <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No appointments yet</p>
        ) : (
          <div className="card-grid">
            {recent.map((a: any) => (
              <div key={a.id} className="card" style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/appointments/${a.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3>{a.customer.firstName} {a.customer.lastName}</h3>
                  <span className={`badge ${statusBadge(a.status)}`}>{a.status.replace('_', ' ')}</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {a.jobAddress || 'No address'} · {a._count?.openings || 0} openings
                </p>
                {a.totalAmount > 0 && (
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', marginTop: '0.5rem' }}>
                    {fmt(a.totalAmount)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
