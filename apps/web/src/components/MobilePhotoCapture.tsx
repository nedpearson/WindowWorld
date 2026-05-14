import { useState, useRef } from 'react';
import { useMobileStore } from '../store/mobileStore';

const PHOTO_TYPES = [
  { id: 'interior', label: 'Interior', icon: '🏠' },
  { id: 'exterior', label: 'Exterior', icon: '🏡' },
  { id: 'sill', label: 'Sill', icon: '🪵' },
  { id: 'damage', label: 'Damage', icon: '⚠️' },
  { id: 'specialty', label: 'Specialty Shape', icon: '🔷' },
  { id: 'tape', label: 'Tape Measure', icon: '📏' },
  { id: 'track', label: 'Track/Frame', icon: '🚪' },
  { id: 'other', label: 'Other', icon: '📷' },
];

export function MobilePhotoCapture({
  appointmentId,
  openingId,
  openingNumber,
  onClose,
  onPhotoAdded,
}: {
  appointmentId: string;
  openingId?: string;
  openingNumber?: number;
  onClose: () => void;
  onPhotoAdded?: () => void;
}) {
  const mobile = useMobileStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const savePhoto = () => {
    if (!preview || !photoType) return;
    setSaving(true);
    // Queue for upload — store locally first
    mobile.enqueuePhoto({
      openingId: openingId || '',
      appointmentId,
      file: preview,
      localUrl: preview,
    });
    // Also save to sync queue
    mobile.enqueue({
      entityType: 'photo',
      entityId: `photo_${Date.now()}`,
      operation: 'create',
      payload: {
        appointmentId,
        openingId,
        openingNumber,
        photoType,
        note,
        base64: preview.slice(0, 100) + '...', // Don't store full base64 in queue
      },
    });
    setSaving(false);
    setPreview(null);
    setPhotoType('');
    setNote('');
    onPhotoAdded?.();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 250, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', background: 'var(--bg-secondary)',
        borderRadius: '20px 20px 0 0', padding: '1.25rem',
        maxHeight: '92dvh', overflowY: 'auto',
        paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>📷 Add Photo {openingNumber ? `— Opening #${openingNumber}` : ''}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Photo type selector */}
        {!preview && (
          <>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Photo Type
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {PHOTO_TYPES.map(pt => (
                <button key={pt.id} onClick={() => setPhotoType(pt.id)} style={{
                  padding: '0.75rem 0.25rem', borderRadius: 10, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  background: photoType === pt.id ? 'rgba(59,130,246,0.15)' : 'var(--bg-input)',
                  border: `1px solid ${photoType === pt.id ? 'var(--accent)' : 'var(--border)'}`,
                  color: photoType === pt.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '0.6875rem', fontWeight: 600,
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{pt.icon}</span>
                  {pt.label}
                </button>
              ))}
            </div>

            {/* Capture buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button onClick={() => fileRef.current?.click()} disabled={!photoType} style={{
                padding: '1.25rem', borderRadius: 12, cursor: photoType ? 'pointer' : 'not-allowed',
                background: photoType ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--bg-input)',
                color: photoType ? 'white' : 'var(--text-muted)', border: 'none',
                fontWeight: 700, fontSize: '0.9375rem',
              }}>
                📸 Take Photo
              </button>
              <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => handleCapture(e);
                input.click();
              }} disabled={!photoType} style={{
                padding: '1.25rem', borderRadius: 12, cursor: photoType ? 'pointer' : 'not-allowed',
                background: 'var(--bg-input)', color: photoType ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.9375rem',
              }}>
                🖼 Upload
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleCapture} style={{ display: 'none' }} />
            {!photoType && <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem', textAlign: 'center' }}>Select a photo type first</div>}
          </>
        )}

        {/* Preview */}
        {preview && (
          <div>
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid var(--border)' }}>
              <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>
                {PHOTO_TYPES.find(p => p.id === photoType)?.icon} {PHOTO_TYPES.find(p => p.id === photoType)?.label}
              </span>
              {openingNumber && <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: 'var(--success)' }}>Opening #{openingNumber}</span>}
            </div>
            <input type="text" placeholder="Add a note (optional)..." value={note} onChange={e => setNote(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem 0.75rem', color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.75rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button onClick={savePhoto} disabled={saving} style={{
                padding: '0.875rem', background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              }}>
                {saving ? 'Saving…' : '✓ Save Photo'}
              </button>
              <button onClick={() => { setPreview(null); }} style={{
                padding: '0.875rem', background: 'var(--bg-input)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              }}>
                ← Retake
              </button>
            </div>
          </div>
        )}

        {/* Pending photos count */}
        {mobile.pendingPhotos() > 0 && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--warning)', textAlign: 'center' }}>
            📤 {mobile.pendingPhotos()} photo(s) pending upload
          </div>
        )}
      </div>
    </div>
  );
}
