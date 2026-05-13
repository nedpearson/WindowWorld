import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { validateQRSession, revokeQRSession } from '../utils/qrSessionStore';
import { TabletSigningMode } from '../components/TabletSigningMode';
import { api } from '../utils/api';

// ══════════════════════════════════════════════════════════
// ISOLATED SIGNING PAGE — /sign/:token
//
// Security properties:
//  - Validates token from localStorage (same-origin only)
//  - Token must match appointmentId + not be expired
//  - Renders ONLY TabletSigningMode for that appointment
//  - No sidebar, no nav, no other data
//  - On completion or manual exit: revokes token immediately
//  - If token invalid/expired: shows error with NO appointment data
// ══════════════════════════════════════════════════════════

type PageState = 'validating' | 'valid' | 'expired' | 'invalid' | 'done';

export function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<PageState>('validating');
  const [appointment, setAppointment] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); setErrorMsg('No token provided.'); return; }

    const session = validateQRSession(token);

    if (!session) {
      setState('expired');
      setErrorMsg('This signing link has expired or is invalid. Please ask the rep to generate a new QR code.');
      return;
    }

    // Load ONLY this appointment — never expose other appointments
    api.getAppointment(session.appointmentId)
      .then(data => {
        // Double-check: appointment must match token
        if (data.id !== session.appointmentId) {
          setState('invalid');
          setErrorMsg('Session mismatch. Please ask the rep to generate a new QR code.');
          return;
        }
        setAppointment(data);
        setState('valid');
      })
      .catch(() => {
        setState('invalid');
        setErrorMsg('Could not load appointment. Ensure you are on the same network as the rep.');
      });
  }, [token]);

  const handleDone = () => {
    if (token) revokeQRSession(token); // consume token
    setState('done');
  };

  // ── Error / expired / done states ────────────────────────
  if (state === 'validating') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }}>🔐</div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>Validating secure session…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontSize: '4rem' }}>✅</div>
        <h1 style={{ color: '#22c55e', fontSize: '1.5rem', textAlign: 'center' }}>Signing Complete</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '0.9375rem' }}>
          All signatures have been captured. Please return the device to the sales representative.
        </p>
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          🔒 This session has been closed. No appointment data is accessible.
        </div>
      </div>
    );
  }

  if (state === 'expired' || state === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>⏰</div>
        <h1 style={{ color: '#ef4444', fontSize: '1.375rem', textAlign: 'center' }}>
          {state === 'expired' ? 'QR Code Expired' : 'Invalid Session'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 380, fontSize: '0.9375rem', lineHeight: 1.6 }}>
          {errorMsg}
        </p>
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          🔒 For security, no appointment data is displayed on this screen.
        </div>
      </div>
    );
  }

  // ── Valid: render ONLY the signing mode ───────────────────
  if (state === 'valid' && appointment) {
    return (
      // Full-screen signing mode with no surrounding chrome
      // onClose triggers token revocation + done state
      <TabletSigningMode
        appointment={appointment}
        onClose={handleDone}
      />
    );
  }

  return null;
}
