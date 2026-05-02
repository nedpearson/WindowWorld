import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import clsx from 'clsx';
import { MapPinIcon, ArrowPathIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

// Fix leaflet default marker icon broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Numbered stop marker ─────────────────────────────────────
function makeStopIcon(n: number, status: string) {
  const color = status === 'completed' ? '#64748b'
    : status === 'confirmed'  ? '#10b981'
    : status === 'in_progress'? '#f59e0b'
    : '#3b82f6';
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50%;background:${color};
      border:2px solid white;display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:12px;font-family:monospace;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    ">${n}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function makeGPSIcon() {
  return L.divIcon({
    html: `<div style="
      width:16px;height:16px;border-radius:50%;background:#3b82f6;
      border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);
    "></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// ─── Recenter button ──────────────────────────────────────────
function RecenterButton({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  if (!pos) return null;
  return (
    <button
      onClick={() => map.flyTo(pos, 14, { duration: 0.8 })}
      className="absolute bottom-16 right-3 z-[1000] w-10 h-10 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-center text-slate-800 shadow-lg active:scale-95 transition-transform"
      title="Center on me"
    >
      <svg className="h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /><line x1="12" y1="4" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="20" /><line x1="4" y1="12" x2="2" y2="12" /><line x1="22" y1="12" x2="20" y2="12" />
      </svg>
    </button>
  );
}

// ─── MapTab ───────────────────────────────────────────────────
interface Stop {
  id: string; order: number; status: string; type: string;
  lead: { id: string; name: string; address: string; city: string; zip: string; phone: string; lat?: number; lng?: number };
  time: string;
}

interface MapTabProps {
  stops: Stop[];
  activeStopId: string | null;
  onSelectStop: (id: string) => void;
}

// Baton Rouge default center
const DEFAULT_CENTER: [number, number] = [30.4515, -91.1871];

export function MapTab({ stops, activeStopId, onSelectStop }: MapTabProps) {
  // Guard against SSR / service worker pre-render environments
  if (typeof window === 'undefined') return null;

  const [gpsPos, setGpsPos] = useState<[number, number] | null>(null);
  const [gpsError, setGpsError] = useState('');
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const watchId = useRef<number | null>(null);


  // Geocode stop addresses that lack lat/lng using Nominatim
  const [geocoded, setGeocoded] = useState<Map<string, [number, number]>>(new Map());

  useEffect(() => {
    const pending = stops.filter(s => !s.lead.lat && !s.lead.lng && !geocoded.has(s.id));
    pending.forEach(async (stop) => {
      const q = encodeURIComponent(`${stop.lead.address}, ${stop.lead.city}, Louisiana`);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
        const data = await r.json();
        if (data[0]) {
          setGeocoded(prev => new Map(prev).set(stop.id, [parseFloat(data[0].lat), parseFloat(data[0].lon)]));
        }
      } catch { /* silently skip */ }
    });
  }, [stops]); // eslint-disable-line react-hooks/exhaustive-deps

  // GPS watch
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setGpsPos([p.coords.latitude, p.coords.longitude]),
      (e) => setGpsError(e.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  // Build ordered coordinates for polyline route
  const routeCoords: [number, number][] = stops
    .map(s => s.lead.lat ? [s.lead.lat, s.lead.lng!] as [number, number] : geocoded.get(s.id) ?? null)
    .filter(Boolean) as [number, number][];

  const mapCenter: [number, number] = gpsPos ?? routeCoords[0] ?? DEFAULT_CENTER;

  const tileUrl = mapType === 'satellite'
    ? 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
    : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  const tileAttr = '&copy; Google Maps';

  return (
    <div className="relative h-full min-h-[60vh] rounded-2xl overflow-hidden border border-slate-300 bg-slate-100">
      {/* Map type toggle */}
      <div className="absolute top-3 left-3 z-[1000] flex rounded-xl overflow-hidden border border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm">
        {(['street', 'satellite'] as const).map(t => (
          <button key={t} onClick={() => setMapType(t)}
            className={clsx('px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
              mapType === t ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Stop count badge */}
      <div className="absolute top-3 right-3 z-[1000] px-2.5 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-800 backdrop-blur-sm shadow-sm">
        {stops.length} stops
      </div>

      {/* GPS error */}
      {gpsError && (
        <div className="absolute bottom-20 left-3 right-3 z-[1000] p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-xs text-red-300 text-center">
          GPS: {gpsError}
        </div>
      )}

      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '100%', minHeight: '60vh', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} attribution={tileAttr} maxZoom={19} />

        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 4', opacity: 0.7 }}
          />
        )}

        {/* Stop markers */}
        {stops.map(stop => {
          const pos: [number, number] | null =
            stop.lead.lat ? [stop.lead.lat, stop.lead.lng!] : geocoded.get(stop.id) ?? null;
          if (!pos) return null;
          return (
            <Marker key={stop.id} position={pos} icon={makeStopIcon(stop.order, stop.status)}>
              <Popup>
                <div style={{ minWidth: 180, fontFamily: 'sans-serif' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{stop.lead.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{stop.time} · {stop.type}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{stop.lead.address}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={`tel:${stop.lead.phone}`}
                      style={{ flex: 1, padding: '6px', background: '#1e293b', color: '#94a3b8', borderRadius: 8, textAlign: 'center', fontSize: 11, textDecoration: 'none' }}>
                      📞 Call
                    </a>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.lead.address}, ${stop.lead.city}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, padding: '6px', background: '#2563eb', color: 'white', borderRadius: 8, textAlign: 'center', fontSize: 11, textDecoration: 'none' }}>
                      🧭 Go
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* GPS marker */}
        {gpsPos && <Marker position={gpsPos} icon={makeGPSIcon()} />}

        <RecenterButton pos={gpsPos} />
      </MapContainer>

      {/* Route summary strip */}
      {stops.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[999] bg-white/95 backdrop-blur-sm border-t border-slate-200 px-3 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {stops.map(stop => (
              <button
                key={stop.id}
                onClick={() => onSelectStop(stop.id)}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                  activeStopId === stop.id
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                    : stop.status === 'completed'
                    ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                    : 'bg-white text-slate-700 border-slate-200 active:bg-slate-50'
                )}
              >
                <span className={clsx(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  activeStopId === stop.id ? "bg-white/20" : "bg-slate-200 text-slate-600"
                )}>
                  {stop.order}
                </span>
                {stop.lead.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
