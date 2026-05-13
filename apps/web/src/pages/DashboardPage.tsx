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

  // Find appointments that need form completion (not sold/cancelled)
  const activeAppts = recent.filter((a: any) => !['sold', 'cancelled'].includes(a.status));
  const incompleteAppts = activeAppts.filter((a: any) => (a.completionPct || 0) < 100);

  return (
    <div className="fade-in">
      {/* ═══ PRIMARY CTA ═══ */}
      <div style={{
        marginBottom: '1.5rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(59,130,246,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>📋 Complete Appointment Forms</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {incompleteAppts.length > 0
                ? `${incompleteAppts.length} appointment${incompleteAppts.length > 1 ? 's' : ''} need form completion`
                : 'All appointments are up to date'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/appointments')}
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}>
              📋 Start Forms →
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/appointments')}>
              + New Appointment
            </button>
          </div>
        </div>

        {/* Quick links to incomplete appointments */}
        {incompleteAppts.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {incompleteAppts.slice(0, 5).map((a: any) => (
              <button key={a.id} className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)' }}
                onClick={() => navigate(`/appointments/${a.id}`)}>
                {a.customer.firstName} {a.customer.lastName}
                <span style={{ marginLeft: '0.375rem', fontSize: '0.625rem', color: '#f59e0b' }}>
                  {a._count?.openings || 0} openings
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
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

      {/* Recent activity */}
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
