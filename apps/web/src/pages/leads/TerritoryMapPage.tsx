import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon, CloudIcon,
  ListBulletIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────────
interface MapLead {
  id: string; name: string; address: string; city: string;
  status: string; score: number; urgency: number;
  isStorm: boolean; est: number; lat: number; lng: number; parish: string;
}

const STATUS_COLOR_DOT: Record<string, string> = {
  VERBAL_COMMIT: '#10b981', SOLD: '#10b981', PAID: '#10b981',
  PROPOSAL_SENT: '#7c3aed',
  APPOINTMENT_SET: '#06b6d4', INSPECTION_COMPLETE: '#06b6d4', MEASURING_COMPLETE: '#06b6d4',
  QUALIFIED: '#3b82f6', CONTACTED: '#3b82f6',
  NEW_LEAD: '#64748b', ATTEMPTING_CONTACT: '#f59e0b',
  LOST: '#ef4444' };

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Interactive Map component ─────────────────────────────────────────
function SimpleLeadsMap({ leads, selected, onSelect }: {
  leads: MapLead[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900" style={{ minHeight: 450, height: '100%' }}>
      {/* Map label */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400">
        Louisiana · {leads.length} leads mapped
      </div>

      <MapContainer 
        center={[30.9843, -91.9623]} // Center of Louisiana
        zoom={7} 
        style={{ height: '100%', width: '100%', minHeight: 450 }}
        zoomControl={true}
      >
        {/* Standard Google Maps tiles */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution='&copy; Google Maps'
        />

        {leads.map((lead) => {
          const isSelected = selected === lead.id;
          const color = STATUS_COLOR_DOT[lead.status] || '#64748b';
          const radius = isSelected ? 10 : lead.isStorm ? 8 : 7;

          return (
            <CircleMarker
              key={lead.id}
              center={[lead.lat, lead.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.85,
                color: isSelected ? 'white' : lead.isStorm ? '#7c3aed' : 'rgba(0,0,0,0.3)',
                weight: isSelected ? 2 : lead.isStorm ? 3 : 1,
              }}
              eventHandlers={{
                click: () => onSelect(lead.id),
              }}
            >
              <Popup className="text-slate-800">
                <div className="text-sm font-bold">{lead.name}</div>
                <div className="text-xs">{lead.city}, {lead.parish}</div>
                <div className="text-xs mt-1 font-semibold" style={{ color }}>{lead.status.replace(/_/g, ' ')}</div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-700 text-[10px] text-slate-500">
        {[
          { color: '#10b981', label: 'Sold / Verbal' },
          { color: '#7c3aed', label: 'Proposal Sent' },
          { color: '#06b6d4', label: 'In Funnel' },
          { color: '#64748b', label: 'New / Cold' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {label}
          </div>
        ))}
        <div className="mt-1 pt-1 border-t border-slate-700/50 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-1 ring-purple-400/50" />
          Storm lead
        </div>
      </div>
    </div>
  );
}

export function TerritoryMapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parishFilter, setParishFilter] = useState('');
  const [stormOnly, setStormOnly] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [leads, setLeads] = useState<MapLead[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    (apiClient as any).get('/leads/map', { params: { limit: 200 } })
      .then((r: any) => {
        const raw: any[] = r.data?.leads ?? r.data?.data ?? [];
        setLeads(raw.map((l: any) => ({
          id: l.id,
          name: `${l.firstName} ${l.lastName}`,
          address: l.address ?? '',
          city: l.city ?? '',
          status: l.status,
          score: l.aiScore ?? l.score ?? 50,
          urgency: l.urgency ?? 50,
          isStorm: l.isStormLead ?? false,
          est: l.estimatedValue ?? 0,
          lat: l.lat ?? l.latitude ?? 30.45,
          lng: l.lng ?? l.longitude ?? -91.18,
          parish: l.parish ?? l.county ?? l.city ?? 'Unknown' })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const parishes = [...new Set(leads.map((l) => l.parish))].sort();
  const filtered = leads.filter((l) => {
    if (parishFilter && l.parish !== parishFilter) return false;
    if (stormOnly && !l.isStorm) return false;
    return true;
  });
  const selectedLead = filtered.find((l) => l.id === selectedId);

  return (
    <div className="p-6 space-y-4 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Territory Map</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filtered.length} leads · Louisiana statewide coverage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('map')} className={clsx('btn-sm', view === 'map' ? 'btn-primary' : 'btn-secondary')}>
            <MapPinIcon className="h-4 w-4" /> Map
          </button>
          <button onClick={() => setView('list')} className={clsx('btn-sm', view === 'list' ? 'btn-primary' : 'btn-secondary')}>
            <ListBulletIcon className="h-4 w-4" /> List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={parishFilter} onChange={(e) => setParishFilter(e.target.value)} className="select w-48">
          <option value="">All parishes</option>
          {parishes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={() => setStormOnly(!stormOnly)}
          className={clsx(
            'btn-sm flex items-center gap-2',
            stormOnly ? 'btn-storm' : 'btn-secondary'
          )}
        >
          <CloudIcon className="h-4 w-4" />
          Storm leads only
          {stormOnly && <span className="bg-white/20 text-white text-[10px] px-1.5 rounded-full">
            {filtered.filter(l => l.isStorm).length}
          </span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          {view === 'map' ? (
            <SimpleLeadsMap
              leads={filtered}
              selected={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Parish</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Est. Value</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.sort((a, b) => b.score - a.score).map((lead) => (
                    <tr key={lead.id} onClick={() => setSelectedId(lead.id)} className="cursor-pointer">
                      <td>
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          {lead.name}
                          {lead.isStorm && <CloudIcon className="h-3.5 w-3.5 text-purple-400" />}
                        </div>
                        <div className="text-xs text-slate-600">{lead.address}, {lead.city}</div>
                      </td>
                      <td className="text-xs text-slate-400">{lead.parish}</td>
                      <td><span className="badge badge-blue text-[10px]">{lead.status.replace(/_/g, ' ')}</span></td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${lead.score}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 font-mono">{lead.score}</span>
                        </div>
                      </td>
                      <td className="font-semibold text-emerald-400 text-sm">${(lead.est / 1000).toFixed(1)}K</td>
                      <td>
                        <Link to={`/leads/${lead.id}`} className="btn-ghost btn-sm text-xs">Open →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {selectedLead ? (
            <motion.div
              key={selectedLead.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">{selectedLead.name}</span>
                    {selectedLead.isStorm && <CloudIcon className="h-4 w-4 text-purple-400" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedLead.address}, {selectedLead.city}</p>
                  <p className="text-xs text-slate-600">{selectedLead.parish}</p>
                </div>
                <span className="text-lg font-bold text-emerald-400">${(selectedLead.est / 1000).toFixed(1)}K</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-500">Lead Score</div>
                  <div className="text-lg font-bold text-white">{selectedLead.score}</div>
                </div>
                <div className="bg-slate-800 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-slate-500">Urgency</div>
                  <div className="text-lg font-bold text-white">{selectedLead.urgency}</div>
                </div>
              </div>

              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</div>
              <span className="badge badge-blue text-xs">{selectedLead.status.replace(/_/g, ' ')}</span>

              <div className="flex gap-2 pt-1">
                <Link to={`/leads/${selectedLead.id}`} className="btn-primary btn-sm flex-1 justify-center">
                  Open Lead →
                </Link>
                <Link to="/appointments" className="btn-secondary btn-sm">
                  Schedule
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="card p-4 text-center py-8">
              <MapPinIcon className="h-8 w-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Click a pin to view lead details</p>
            </div>
          )}

          {/* Parish summary */}
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">By Parish</div>
            <div className="space-y-2">
              {parishes.map((parish) => {
                const count = filtered.filter((l) => l.parish === parish).length;
                const storm = filtered.filter((l) => l.parish === parish && l.isStorm).length;
                if (count === 0) return null;
                return (
                  <div key={parish} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-300">{parish}</span>
                      {storm > 0 && <span className="text-[10px] text-purple-400 ml-1.5">⚡ {storm} storm</span>}
                    </div>
                    <span className="text-xs font-mono text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
