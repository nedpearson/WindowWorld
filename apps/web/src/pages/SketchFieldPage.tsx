// ═══════════════════════════════════════════════════════════════
// Sketch Field Page — Sketch-First Entry Point
// Primary field flow: draw house → drop markers → configure openings
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SketchSymbolToolbar, getMarkerSymbolFromTool } from '../components/SketchSymbolToolbar';
import type { SketchTool } from '../components/SketchSymbolToolbar';
import { drawMarkerOnCanvas, drawGroupConnector, hitTestMarker } from '../components/SketchMarkerRenderer';
import { MarkerDetailSheet } from '../components/MarkerDetailSheet';
import { JoinMullWorkflow } from '../components/JoinMullWorkflow';
import { createMarkerData, createOpeningFromMarker, validateSketchSync, calcUnitedInches } from '../utils/sketchSync';
import type { SketchMarkerData, MarkerGroupData, MarkerSymbol } from '../utils/sketchSync';
import api from '../utils/api';

const ELEVATIONS = ['front', 'rear', 'left', 'right', 'garage', 'other'] as const;
const CANVAS_W = 800;
const CANVAS_H = 500;

export default function SketchFieldPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [elevation, setElevation] = useState<string>('front');
  const [tool, setTool] = useState<SketchTool>('pen');
  const [markers, setMarkers] = useState<SketchMarkerData[]>([]);
  const [groups, setGroups] = useState<MarkerGroupData[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [joinMode, setJoinMode] = useState(false);
  const [joinSelected, setJoinSelected] = useState<string[]>([]);
  const [color, setColor] = useState('#1e293b');
  const [lineWidth] = useState(2);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [appointment, setAppointment] = useState<any>(null);

  // Canvas drawing state
  const drawing = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const savedCanvas = useRef<ImageData | null>(null);
  const historyStack = useRef<ImageData[]>([]);
  const historyIdx = useRef(-1);

  // Load appointment + openings
  useEffect(() => {
    if (!appointmentId) return;
    api.get(`/api/appointments/${appointmentId}`).then(r => {
      setAppointment(r.data);
      if (r.data.openings) setOpenings(r.data.openings);
    }).catch(() => {});

    // Load saved sketch from localStorage
    const saved = localStorage.getItem(`sketch_field_${appointmentId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.markers) setMarkers(data.markers);
        if (data.groups) setGroups(data.groups);
      } catch {}
    }
  }, [appointmentId]);

  // Re-render markers on canvas when markers/groups/elevation change
  useEffect(() => {
    redrawMarkers();
  }, [markers, groups, elevation, selectedMarkerId, joinSelected]);

  // Persist to localStorage
  const persist = useCallback(() => {
    if (!appointmentId) return;
    localStorage.setItem(`sketch_field_${appointmentId}`, JSON.stringify({ markers, groups }));
    setWarnings(validateSketchSync(markers, openings, groups));
  }, [appointmentId, markers, groups, openings]);

  useEffect(() => { persist(); }, [markers, groups, openings]);

  // ── Canvas helpers ──────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const pushHistory = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    historyStack.current = historyStack.current.slice(0, historyIdx.current + 1);
    historyStack.current.push(data);
    historyIdx.current = historyStack.current.length - 1;
  };

  const undo = () => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.putImageData(historyStack.current[historyIdx.current], 0, 0);
  };

  const redo = () => {
    if (historyIdx.current >= historyStack.current.length - 1) return;
    historyIdx.current++;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.putImageData(historyStack.current[historyIdx.current], 0, 0);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    pushHistory();
  };

  // Init canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Load saved canvas image
    const saved = localStorage.getItem(`sketch_canvas_${appointmentId}_${elevation}`);
    if (saved) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); pushHistory(); };
      img.src = saved;
    } else { pushHistory(); }
  }, [appointmentId, elevation]);

  const saveCanvasImage = () => {
    const url = canvasRef.current?.toDataURL('image/png');
    if (url) localStorage.setItem(`sketch_canvas_${appointmentId}_${elevation}`, url);
  };

  // ── Redraw markers overlay ──────────────────────────────
  const redrawMarkers = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    // Restore base drawing then overlay markers
    if (historyStack.current[historyIdx.current]) {
      ctx.putImageData(historyStack.current[historyIdx.current], 0, 0);
    }
    const elevMarkers = markers.filter(m => m.elevation === elevation);
    for (const m of elevMarkers) {
      const isSelected = m.id === selectedMarkerId;
      const isJoin = joinSelected.includes(m.id);
      drawMarkerOnCanvas(ctx, m, isSelected, isJoin);
    }
    // Draw group connectors
    for (const g of groups) {
      const gMarkers = elevMarkers.filter(m => g.memberMarkerIds.includes(m.id));
      if (gMarkers.length >= 2) drawGroupConnector(ctx, gMarkers, g.groupType);
    }
  };

  // ── Handle canvas interaction ───────────────────────────
  const handleCanvasDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    const elevMarkers = markers.filter(m => m.elevation === elevation);

    // Symbol placement
    const markerSymbol = getMarkerSymbolFromTool(tool);
    if (markerSymbol) {
      if (joinMode) {
        // In join mode, toggle marker selection
        const hit = elevMarkers.find(m => hitTestMarker(m, pos.x, pos.y));
        if (hit && hit.markerSymbol !== 'front_door' && hit.markerSymbol !== 'note') {
          setJoinSelected(prev =>
            prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]
          );
        }
        return;
      }

      // Check if tapping existing marker
      const hitMarker = elevMarkers.find(m => hitTestMarker(m, pos.x, pos.y));
      if (hitMarker) {
        setSelectedMarkerId(hitMarker.id);
        return;
      }

      // Place new marker
      const newMarker = createMarkerData(
        `sketch_${appointmentId}`, markerSymbol, pos.x, pos.y, elevation, markers
      );
      const updatedMarkers = [...markers, newMarker];
      setMarkers(updatedMarkers);

      // Auto-create opening for window/door markers
      if (markerSymbol !== 'note' && markerSymbol !== 'arrow' && markerSymbol !== 'front_door') {
        const newOpening = createOpeningFromMarker(newMarker, appointmentId || '');
        setOpenings(prev => [...prev, newOpening]);
      }
      setSelectedMarkerId(newMarker.id);
      return;
    }

    // Join/mull tool
    if (tool === 'join_mull') {
      setJoinMode(true);
      const hit = elevMarkers.find(m => hitTestMarker(m, pos.x, pos.y));
      if (hit && hit.markerSymbol !== 'front_door' && hit.markerSymbol !== 'note') {
        setJoinSelected(prev =>
          prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]
        );
      }
      return;
    }

    // Eraser tool — delete marker
    if (tool === 'eraser') {
      const hit = elevMarkers.find(m => hitTestMarker(m, pos.x, pos.y));
      if (hit) {
        setMarkers(prev => prev.filter(m => m.id !== hit.id));
        setOpenings(prev => prev.filter(o => o.openingNumber !== hit.markerNumber));
        return;
      }
    }

    // Drawing tools
    drawing.current = true;
    startPos.current = pos;
    const ctx = canvasRef.current!.getContext('2d')!;
    savedCanvas.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'pen') { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const handleCanvasMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !startPos.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    if (tool === 'pen') { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
    else if (tool === 'line' || tool === 'rect') {
      ctx.putImageData(savedCanvas.current!, 0, 0);
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
      ctx.beginPath();
      if (tool === 'line') { ctx.moveTo(startPos.current.x, startPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
      else { ctx.strokeRect(startPos.current.x, startPos.current.y, pos.x - startPos.current.x, pos.y - startPos.current.y); }
    }
  };

  const handleCanvasUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    pushHistory();
    saveCanvasImage();
  };

  // ── Marker updates ─────────────────────────────────────
  const updateMarker = (updates: Partial<SketchMarkerData>) => {
    if (!selectedMarkerId) return;
    setMarkers(prev => prev.map(m => m.id === selectedMarkerId ? { ...m, ...updates } : m));
    // Sync to opening
    const marker = markers.find(m => m.id === selectedMarkerId);
    if (marker && marker.markerNumber) {
      setOpenings(prev => prev.map(o => {
        if (o.openingNumber !== marker.markerNumber) return o;
        const sync: any = {};
        if (updates.width !== undefined) sync.width = updates.width;
        if (updates.height !== undefined) sync.height = updates.height;
        if (updates.roomLocation !== undefined) sync.roomLocation = updates.roomLocation;
        if (updates.elevation !== undefined) sync.elevation = updates.elevation;
        if (updates.floorNumber !== undefined) sync.floorNumber = updates.floorNumber;
        if (updates.windowType !== undefined) sync.productCategory = updates.windowType;
        if (updates.unitedInches !== undefined) sync.unitedInches = updates.unitedInches;
        if (updates.exteriorMaterial !== undefined) sync.exteriorType = updates.exteriorMaterial;
        if (updates.removalType !== undefined) sync.removalType = updates.removalType;
        if (updates.installType !== undefined) sync.installType = updates.installType;
        return { ...o, ...sync };
      }));
    }
  };

  const updateOpening = (fields: Record<string, any>) => {
    const marker = markers.find(m => m.id === selectedMarkerId);
    if (!marker || !marker.markerNumber) return;
    setOpenings(prev => prev.map(o =>
      o.openingNumber === marker.markerNumber ? { ...o, ...fields } : o
    ));
  };

  const deleteMarker = () => {
    if (!selectedMarkerId) return;
    const marker = markers.find(m => m.id === selectedMarkerId);
    setMarkers(prev => prev.filter(m => m.id !== selectedMarkerId));
    if (marker?.markerNumber) setOpenings(prev => prev.filter(o => o.openingNumber !== marker.markerNumber));
    setSelectedMarkerId(null);
  };

  const handleJoinConfirm = (groupData: Omit<MarkerGroupData, 'id'>) => {
    const newGroup: MarkerGroupData = { ...groupData, id: `grp_${Date.now()}` };
    setGroups(prev => [...prev, newGroup]);
    setMarkers(prev => prev.map(m =>
      newGroup.memberMarkerIds.includes(m.id) ? { ...m, groupId: newGroup.id } : m
    ));
    setJoinMode(false);
    setJoinSelected([]);
  };

  const selectedMarker = markers.find(m => m.id === selectedMarkerId);
  const selectedOpening = selectedMarker ? openings.find(o => o.openingNumber === selectedMarker.markerNumber) : null;
  const elevMarkers = markers.filter(m => m.elevation === elevation);
  const openingMarkerCount = elevMarkers.filter(m => m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow' && m.markerSymbol !== 'front_door').length;
  const totalMarkerCount = markers.filter(m => m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow' && m.markerSymbol !== 'front_door').length;
  const blockers = warnings.filter(w => w.severity === 'blocker');
  const customer = appointment?.customer;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>🏠 Sketch Field Flow</h2>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {customer ? `${customer.firstName} ${customer.lastName}` : 'Loading...'} · {totalMarkerCount} openings
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={() => navigate(`/appointments/${appointmentId}`)} style={{ padding: '0.375rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            ← Back
          </button>
          <button onClick={() => navigate(`/appointments/${appointmentId}/lockdown`)} style={{ padding: '0.375rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: blockers.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)', color: blockers.length > 0 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: '0.75rem' }}>
            {blockers.length > 0 ? `⚠️ ${blockers.length} Blockers` : '✓ Lockdown Review'}
          </button>
        </div>
      </div>

      {/* Elevation Tabs */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.5rem', overflowX: 'auto' }}>
        {ELEVATIONS.map(elev => {
          const cnt = markers.filter(m => m.elevation === elev && m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow').length;
          return (
            <button key={elev} onClick={() => { setElevation(elev); setSelectedMarkerId(null); }}
              style={{
                padding: '0.35rem 0.75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap',
                background: elevation === elev ? 'var(--accent)' : 'var(--bg-card)',
                color: elevation === elev ? '#fff' : 'var(--text-secondary)',
              }}>
              {elev.charAt(0).toUpperCase() + elev.slice(1)} {cnt > 0 && <span style={{ opacity: 0.8 }}>({cnt})</span>}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <SketchSymbolToolbar
        activeTool={tool}
        onToolChange={t => {
          setTool(t);
          if (t === 'join_mull') { setJoinMode(true); setJoinSelected([]); }
          else if (joinMode) { setJoinMode(false); setJoinSelected([]); }
        }}
        onUndo={undo} onRedo={redo} onClear={clearCanvas}
        joinMode={joinMode} selectedForJoinCount={joinSelected.length}
        compact
      />

      {/* Canvas */}
      <div style={{ marginTop: '0.5rem', borderRadius: 12, border: '2px solid var(--border)', overflow: 'hidden', background: '#f8fafc', position: 'relative' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ display: 'block', width: '100%', touchAction: 'none', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={handleCanvasDown} onMouseMove={handleCanvasMove} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasUp}
          onTouchStart={handleCanvasDown} onTouchMove={handleCanvasMove} onTouchEnd={handleCanvasUp}
        />
        {/* Marker count badge */}
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
          {openingMarkerCount} on this side
        </div>
      </div>

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>
            ⚠️ {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
          </div>
          {warnings.slice(0, 3).map((w, i) => (
            <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>• {w.message}</div>
          ))}
          {warnings.length > 3 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{warnings.length - 3} more</div>}
        </div>
      )}

      {/* Opening List */}
      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
          OPENINGS ({totalMarkerCount})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {markers.filter(m => m.markerNumber !== null && m.markerSymbol !== 'front_door' && m.markerSymbol !== 'note' && m.markerSymbol !== 'arrow').map(m => (
            <button key={m.id} onClick={() => { setElevation(m.elevation); setSelectedMarkerId(m.id); }}
              style={{
                padding: '0.3rem 0.625rem', borderRadius: 8, border: '1px solid',
                borderColor: m.validationStatus === 'complete' ? '#22c55e' : m.validationStatus === 'measured' ? '#f59e0b' : '#ef4444',
                background: m.id === selectedMarkerId ? 'rgba(59,130,246,0.15)' : 'transparent',
                cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
                color: 'var(--text-secondary)',
              }}>
              <span style={{ fontWeight: 800, color: '#3b82f6' }}>#{m.markerNumber}</span>
              {' '}{m.roomLocation || m.windowType || ''}
              {m.width && m.height ? ` ${m.width}×${m.height}` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Detail Sheet */}
      {selectedMarker && selectedMarker.markerSymbol !== 'front_door' && selectedMarker.markerSymbol !== 'note' && selectedMarker.markerSymbol !== 'arrow' && (
        <MarkerDetailSheet
          marker={selectedMarker}
          opening={selectedOpening}
          onUpdate={updateMarker}
          onOpeningUpdate={updateOpening}
          onClose={() => setSelectedMarkerId(null)}
          onDelete={deleteMarker}
        />
      )}

      {/* Join/Mull Workflow */}
      {joinMode && (
        <JoinMullWorkflow
          selectedMarkers={markers.filter(m => joinSelected.includes(m.id))}
          onConfirm={handleJoinConfirm}
          onCancel={() => { setJoinMode(false); setJoinSelected([]); setTool('pen'); }}
        />
      )}
    </div>
  );
}
