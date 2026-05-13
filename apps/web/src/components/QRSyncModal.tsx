import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  createQRSession, getSigningURL, getSessionTTLSeconds,
  revokeQRSession, type QRSession,
} from '../utils/qrSessionStore';

// ── Countdown ring ────────────────────────────────────────
function CountdownRing({ totalSeconds, remaining }: { totalSeconds: number; remaining: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const pct = remaining / totalSeconds;
  const color = remaining > 180 ? '#22c55e' : remaining > 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={60} height={60} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={30} cy={30} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
      <text x={30} y={30} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={9} fontWeight={700} style={{ transform: 'rotate(90deg)', transformOrigin: '30px 30px' }}>
        {remaining > 60 ? `${Math.floor(remaining / 60)}m` : `${remaining}s`}
      </text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════
// QR SYNC MODAL
// ══════════════════════════════════════════════════════════
export function QRSyncModal({
  appointment,
  userId,
  userEmail,
  onClose,
}: {
  appointment: any;
  userId: string;
  userEmail: string;
  onClose: () => void;
}) {
  const [session, setSession] = useState<QRSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [ttl, setTtl] = useState(900); // 15 min
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const customerName = `${appointment.customer?.firstName || ''} ${appointment.customer?.lastName || ''}`.trim() || 'Customer';

  const generateSession = async () => {
    const s = createQRSession(appointment.id, userId, userEmail, customerName);
    setSession(s);
    setExpired(false);
    setTtl(900);

    const url = getSigningURL(s.token);

    // Generate QR code as data URL (high error correction)
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 280,
      color: { dark: '#0f172a', light: '#f8fafc' },
    });
    setQrDataUrl(dataUrl);
  };

  // Countdown timer
  useEffect(() => {
    if (!session) return;
    timerRef.current = setInterval(() => {
      const remaining = getSessionTTLSeconds(session);
      setTtl(remaining);
      if (remaining <= 0) {
        setExpired(true);
        clearInterval(timerRef.current!);
      }
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [session]);

  // Generate on mount
  useEffect(() => { generateSession(); }, []);

  // Cleanup on close
  const handleClose = () => {
    if (session) revokeQRSession(session.token);
    onClose();
  };

  const handleRefresh = () => {
    if (session) revokeQRSession(session.token);
    generateSession();
  };

  const handleCopy = () => {
    if (!session) return;
    navigator.clipboard.writeText(getSigningURL(session.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const signingUrl = session ? getSigningURL(session.token) : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
    }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '1.5rem', maxWidth: 420, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', margin: '1rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>📱 Customer Signing QR</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Hand the tablet to <strong style={{ color: 'var(--text-primary)' }}>{customerName}</strong> to sign
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Security notice */}
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.875rem', flexShrink: 0 }}>🔒</span>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Token scoped to <strong>this appointment only</strong> (ID: {appointment.id?.slice(0, 8)}…). 
            Auto-expires in 15 minutes. Shows <strong>only the signing screen</strong> — no other data accessible.
          </div>
        </div>

        {/* QR Code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {expired ? (
            <div style={{ width: 280, height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 12, border: '2px solid rgba(239,68,68,0.3)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏰</div>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>QR Code Expired</div>
              <button onClick={handleRefresh} className="btn btn-primary btn-sm">Generate New Code</button>
            </div>
          ) : qrDataUrl ? (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '3px solid rgba(59,130,246,0.4)', boxShadow: '0 0 0 6px rgba(59,130,246,0.08)' }}>
              <img src={qrDataUrl} alt="Signing QR Code" style={{ display: 'block', width: 280, height: 280 }} />
            </div>
          ) : (
            <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 12 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generating...</div>
            </div>
          )}

          {/* Countdown */}
          {!expired && session && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CountdownRing totalSeconds={900} remaining={ttl} />
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: ttl > 60 ? 'var(--text-primary)' : '#ef4444' }}>
                  {ttl > 0 ? `Expires in ${Math.floor(ttl / 60)}:${String(ttl % 60).padStart(2, '0')}` : 'Expired'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Scan with tablet camera</div>
              </div>
            </div>
          )}
        </div>

        {/* URL + actions */}
        <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>SIGNING URL (token-scoped)</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {signingUrl}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={handleCopy} className="btn btn-sm btn-secondary" style={{ flex: 1 }}>
            {copied ? '✓ Copied!' : '📋 Copy URL'}
          </button>
          <button onClick={handleRefresh} className="btn btn-sm btn-secondary">
            🔄 Refresh
          </button>
          <button onClick={handleClose} className="btn btn-sm btn-primary" style={{ flex: 1 }}>
            Done
          </button>
        </div>

        {/* Usage instructions */}
        <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>How to use:</strong><br />
          1. Hand the tablet to the customer<br />
          2. Have them open the camera app and scan the QR code<br />
          3. They'll see only the signing screen for this appointment<br />
          4. After all signatures are collected, the session auto-closes<br />
          5. No other appointment data is visible to the customer
        </div>
      </div>
    </div>
  );
}
