import { useEffect, useState } from 'react';
import { api } from '../utils/api';

const SIDES = ['front', 'rear', 'left', 'right'] as const;

export function HouseMapView({ appointmentId, openings }: { appointmentId: string; openings: any[] }) {
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    api.getHouseMap(appointmentId).then(d => { setMap(d); setMarkers(d.markers || []); }).catch(console.error);
  }, [appointmentId]);

  const addMarker = async (elevation: string) => {
    const num = prompt('Opening number to place:');
    if (!num || !map) return;
    const n = parseInt(num);
    const opening = openings.find(o => o.openingNumber === n);
    try {
      const m = await api.addMarker({
        houseMapId: map.id, elevation, x: 50, y: 50, openingNumber: n,
        label: opening ? `#${n} ${opening.roomLocation || ''}` : `#${n}`
      });
      setMarkers([...markers, m]);
    } catch {}
  };

  const removeMarker = async (id: string) => {
    await api.deleteMarker(id);
    setMarkers(markers.filter(m => m.id !== id));
  };

  const gridStyle: Record<string, any> = {
    front: { gridColumn: '2', gridRow: '1' },
    left: { gridColumn: '1', gridRow: '2' },
    center: { gridColumn: '2', gridRow: '2' },
    right: { gridColumn: '3', gridRow: '2' },
    rear: { gridColumn: '2', gridRow: '3' },
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>🏠 House Elevation Map</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
        Click a side to place an opening marker. Each marker links to an opening record.
      </p>

      <div className="elevation-grid">
        {/* Spacer top-left */}
        <div />
        {/* Front */}
        <div className="elevation-side" style={gridStyle.front} onClick={() => addMarker('front')}>
          <span className="elevation-label">Front</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.5rem', justifyContent: 'center' }}>
            {markers.filter(m => m.elevation === 'front').map(m => (
              <div key={m.id} className="marker" title={m.label} onClick={e => { e.stopPropagation(); removeMarker(m.id); }}>
                {m.openingNumber}
              </div>
            ))}
          </div>
        </div>
        <div />

        {/* Left */}
        <div className="elevation-side" style={gridStyle.left} onClick={() => addMarker('left')}>
          <span className="elevation-label">Left</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.5rem', justifyContent: 'center' }}>
            {markers.filter(m => m.elevation === 'left').map(m => (
              <div key={m.id} className="marker" title={m.label} onClick={e => { e.stopPropagation(); removeMarker(m.id); }}>
                {m.openingNumber}
              </div>
            ))}
          </div>
        </div>

        {/* Center house */}
        <div className="elevation-center" style={gridStyle.center}>
          <span>🏠 HOUSE</span>
        </div>

        {/* Right */}
        <div className="elevation-side" style={gridStyle.right} onClick={() => addMarker('right')}>
          <span className="elevation-label">Right</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.5rem', justifyContent: 'center' }}>
            {markers.filter(m => m.elevation === 'right').map(m => (
              <div key={m.id} className="marker" title={m.label} onClick={e => { e.stopPropagation(); removeMarker(m.id); }}>
                {m.openingNumber}
              </div>
            ))}
          </div>
        </div>

        <div />
        {/* Rear */}
        <div className="elevation-side" style={gridStyle.rear} onClick={() => addMarker('rear')}>
          <span className="elevation-label">Rear</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.5rem', justifyContent: 'center' }}>
            {markers.filter(m => m.elevation === 'rear').map(m => (
              <div key={m.id} className="marker" title={m.label} onClick={e => { e.stopPropagation(); removeMarker(m.id); }}>
                {m.openingNumber}
              </div>
            ))}
          </div>
        </div>
        <div />
      </div>

      {/* Legend */}
      {markers.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Placed Markers</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {markers.map(m => (
              <span key={m.id} className="badge badge-progress">
                #{m.openingNumber} — {m.elevation} {m.label && `(${m.label})`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
