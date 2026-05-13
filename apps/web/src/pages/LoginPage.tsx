import { useState } from 'react';
import { useAuthStore } from '../store';
import { api } from '../utils/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.login(email, password);
      setAuth(user, token);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      padding: '1rem'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🪟</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>Window World</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Appointment Assistant</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem',
              color: 'var(--danger)', fontSize: '0.875rem'
            }}>{error}</div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="nedpearson@gmail.com" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Admin: nedpearson@gmail.com / admin123<br />
          Demo: demo@windowworld.com / demo123
        </div>
      </div>
    </div>
  );
}
