import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store';

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newCust, setNewCust] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', state: 'LA', zip: '' });
  const [newAppt, setNewAppt] = useState({ jobAddress: '', projectType: 'replacement', appointmentDate: '' });
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const load = () => {
    const params: Record<string, string> = {};
    if (filter !== 'all') params.status = filter;
    if (search) params.search = search;
    api.getAppointments(params).then(setAppointments).catch(console.error);
  };

  useEffect(() => { load(); }, [filter, search]);

  const createNew = async () => {
    try {
      const cust = await api.createCustomer(newCust);
      const appt = await api.createAppointment({
        customerId: cust.id, userId: user!.id,
        jobAddress: newAppt.jobAddress || newCust.address,
        appointmentDate: newAppt.appointmentDate ? new Date(newAppt.appointmentDate).toISOString() : new Date().toISOString(),
        projectType: newAppt.projectType,
      });
      navigate(`/appointments/${appt.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: 'badge-draft', in_progress: 'badge-progress', quoted: 'badge-quoted', sold: 'badge-sold', cancelled: 'badge-danger', needs_remeasure: 'badge-warning' };
    return map[s] || 'badge-draft';
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="fade-in">
      <div className="card-header" style={{ marginBottom: '1.5rem' }}>
        <h1>📅 Appointments</h1>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ New Appointment</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'draft', 'in_progress', 'quoted', 'sold', 'needs_remeasure'].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <input className="form-input" placeholder="Search by name or address..." value={search}
        onChange={e => setSearch(e.target.value)} style={{ marginBottom: '1rem', maxWidth: 400 }} />

      {/* List */}
      <div className="card-grid">
        {appointments.map((a: any) => (
          <div key={a.id} className="card" style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/appointments/${a.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
              <h3>{a.customer.firstName} {a.customer.lastName}</h3>
              <span className={`badge ${statusBadge(a.status)}`}>{a.status.replace('_', ' ')}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              📍 {a.jobAddress || 'No address'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {a._count?.openings || 0} openings · {a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString() : 'No date'}
            </p>
            {a.totalAmount > 0 && (
              <p style={{ fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>{fmt(a.totalAmount)}</p>
            )}
          </div>
        ))}
        {appointments.length === 0 && (
          <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>No appointments found</p>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowNew(false)}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New Appointment</h2>

            <h3 style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>Customer Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" value={newCust.firstName} onChange={e => setNewCust({ ...newCust, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={newCust.lastName} onChange={e => setNewCust({ ...newCust, lastName: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={newCust.city} onChange={e => setNewCust({ ...newCust, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={newCust.state} onChange={e => setNewCust({ ...newCust, state: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">ZIP</label>
                <input className="form-input" value={newCust.zip} onChange={e => setNewCust({ ...newCust, zip: e.target.value })} />
              </div>
            </div>

            <h3 style={{ margin: '1.25rem 0 0.75rem', color: 'var(--accent)' }}>Appointment</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date/Time</label>
                <input className="form-input" type="datetime-local" value={newAppt.appointmentDate} onChange={e => setNewAppt({ ...newAppt, appointmentDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Project Type</label>
                <select className="form-select" value={newAppt.projectType} onChange={e => setNewAppt({ ...newAppt, projectType: e.target.value })}>
                  <option value="replacement">Replacement</option>
                  <option value="new_construction">New Construction</option>
                  <option value="remodel">Remodel</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={createNew} disabled={!newCust.firstName || !newCust.lastName}>
                Create Appointment
              </button>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
