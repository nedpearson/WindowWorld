import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── Types ────────────────────────────────────────────────
type Tool = 'pen' | 'line' | 'rect' | 'text' | 'arrow' | 'eraser' | 'marker';

interface SketchMarker {
  id: string;
  x: number; y: number;
  openingNumber: number;
  room: string;
  width: number; height: number;
  productType: string;
  hasNotes: boolean;
  elevation?: string;
}

interface SketchState {
  dataUrl: string;
  markers: SketchMarker[];
}

export async function fetchSketches(appointmentId: string) {
  try {
    const res = await fetch(`/api/sketches/appointment/${appointmentId}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveSketchMarkers(sketchId: string, markers: SketchMarker[]) {
  try {
    await fetch(`/api/sketches/${sketchId}/markers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markers }),
    });
  } catch (err) { }
}

export function getAllSketchMarkers(appointmentId: string): SketchMarker[] {
  // Legacy local storage fallback
  const elevations = ['front', 'rear', 'left', 'right', 'garage', 'other'];
  const all: SketchMarker[] = [];
  for (const elev of elevations) {
    try {
      const raw = localStorage.getItem(`wwa_sketch_${appointmentId}_${elev}`);
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.markers) all.push(...s.markers.map((m: any) => ({ ...m, elevation: elev })));
      }
    } catch {}
  }
  return all;
}

// ── Tool Button ───────────────────────────────────────────
function ToolBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '1rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
      color: active ? 'white' : 'var(--text-muted)',
      transition: 'all 0.15s',
    }}>{children}</button>
  );
}

// ══════════════════════════════════════════════════════════
// DRAWABLE SKETCH CANVAS
// ══════════════════════════════════════════════════════════
export interface DrawableSketchHandle {
  getDataUrl: () => string;
}

export const DrawableSketchCanvas = forwardRef<DrawableSketchHandle, {
  appointmentId: string;
  openings: any[];
  elevation: string;
  onMarkersChange?: (markers: SketchMarker[]) => void;
  onSketchChange?: (dataUrl: string) => void;
  compact?: boolean;
}>(function DrawableSketchCanvasInner({
  appointmentId,
  openings = [],
  elevation = 'front',
  onMarkersChange,
  onSketchChange,
  compact = false,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [markers, setMarkers] = useState<SketchMarker[]>([]);
  const [markerForm, setMarkerForm] = useState<{ x: number; y: number } | null>(null);
  const [selectedOpening, setSelectedOpening] = useState(1);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  const drawing = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const savedCanvas = useRef<ImageData | null>(null);

  const CANVAS_W = compact ? 480 : 700;
  const CANVAS_H = compact ? 240 : 420;

  useImperativeHandle(ref, () => ({ getDataUrl: () => canvasRef.current?.toDataURL('image/png') || '' }));

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Load legacy sketch from localStorage
    try {
      const raw = localStorage.getItem(`wwa_sketch_${appointmentId}_${elevation}`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.dataUrl) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = saved.dataUrl;
        }
        if (saved?.markers) {
          setMarkers(saved.markers);
          onMarkersChange?.(saved.markers);
        }
      }
    } catch {}

    // Async load from backend
    fetchSketches(appointmentId).then(sketches => {
      const sketch = sketches?.find((s: any) => s.name === elevation);
      if (sketch && sketch.markers) {
        const mapped = sketch.markers.map((m: any) => ({
          id: m.id,
          x: m.x, y: m.y,
          openingNumber: m.links?.[0]?.opening?.openingNumber || 0, // Simplified map
          room: m.roomLocation,
          width: m.width, height: m.height,
          productType: m.productType,
          hasNotes: !!m.notes,
          elevation: m.elevation
        }));
        // setMarkers(mapped);
      }
    });

    pushHistory(ctx, canvas);
  }, [appointmentId, elevation]);

  const pushHistory = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const data = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    setHistory(prev => {
      const next = prev.slice(0, histIdx + 1);
      next.push(data);
      setHistIdx(next.length - 1);
      return next;
    });
  };

  const persist = useCallback((mkrs?: SketchMarker[]) => {
    const canvas = canvasRef.current!;
    const state: SketchState = {
      dataUrl: canvas.toDataURL('image/png'),
      markers: mkrs ?? markers,
    };
    localStorage.setItem(`wwa_sketch_${appointmentId}_${elevation}`, JSON.stringify(state));
    onSketchChange?.(state.dataUrl);
  }, [appointmentId, elevation, markers, onSketchChange]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
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

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;

    if (tool === 'marker') {
      setMarkerForm(pos);
      return;
    }
    if (tool === 'text') {
      setTextPos(pos);
      return;
    }

    drawing.current = true;
    startPos.current = pos;
    savedCanvas.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !startPos.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'line' || tool === 'rect' || tool === 'arrow') {
      // Restore saved canvas then draw preview
      ctx.putImageData(savedCanvas.current!, 0, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.current.x, startPos.current.y, pos.x - startPos.current.x, pos.y - startPos.current.y);
      } else if (tool === 'arrow') {
        // Line + arrowhead
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        const angle = Math.atan2(pos.y - startPos.current.y, pos.x - startPos.current.x);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - 12 * Math.cos(angle - 0.4), pos.y - 12 * Math.sin(angle - 0.4));
        ctx.lineTo(pos.x - 12 * Math.cos(angle + 0.4), pos.y - 12 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    const ctx = canvasRef.current!.getContext('2d')!;
    pushHistory(ctx, canvasRef.current!);
    persist();
  };

  const undo = () => {
    if (histIdx <= 0) return;
    const newIdx = histIdx - 1;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.putImageData(history[newIdx], 0, 0);
    setHistIdx(newIdx);
    persist();
  };

  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const newIdx = histIdx + 1;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.putImageData(history[newIdx], 0, 0);
    setHistIdx(newIdx);
    persist();
  };

  const clear = () => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    pushHistory(ctx, canvasRef.current!);
    persist();
  };

  const addText = (text: string, pos: { x: number; y: number }) => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.font = `${lineWidth * 6 + 10}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, pos.x, pos.y);
    pushHistory(ctx, canvasRef.current!);
    persist();
    setTextPos(null);
    setTextInput('');
  };

  const addMarker = () => {
    if (!markerForm) return;
    const opening = openings.find(o => o.openingNumber === selectedOpening);
    const newMarker: SketchMarker = {
      id: `m_${Date.now()}`,
      x: markerForm.x, y: markerForm.y,
      openingNumber: selectedOpening,
      room: opening?.roomLocation || '',
      width: opening?.width || 0, height: opening?.height || 0,
      productType: opening?.productCategory || '',
      hasNotes: !!(opening?.installerNotes || opening?.installNotes),
    };

    // Draw marker on canvas
    const ctx = canvasRef.current!.getContext('2d')!;
    const r = 14;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(markerForm.x, markerForm.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${selectedOpening}`, markerForm.x, markerForm.y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Small label below
    ctx.fillStyle = '#1e40af';
    ctx.font = '8px sans-serif';
    ctx.fillText(opening?.roomLocation?.slice(0, 12) || '', markerForm.x - r, markerForm.y + r + 8);

    const updated = [...markers, newMarker];
    setMarkers(updated);
    pushHistory(ctx, canvasRef.current!);
    persist(updated);
    onMarkersChange?.(updated);
    setMarkerForm(null);
  };

  const removeMarker = (id: string) => {
    const updated = markers.filter(m => m.id !== id);
    setMarkers(updated);
    persist(updated);
    onMarkersChange?.(updated);
    // Note: marker dot stays on canvas — user should redraw or use undo
  };

  return (
    <div ref={containerRef}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: compact ? '0.2rem' : '0.375rem', alignItems: 'center', marginBottom: compact ? '0.25rem' : '0.5rem', flexWrap: 'wrap', padding: compact ? '0.25rem 0.375rem' : '0.5rem 0.75rem', background: compact ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', borderRadius: compact ? 4 : 8, border: '1px solid var(--border)' }}>
        {/* Tool group */}
        <div style={{ display: 'flex', gap: '0.15rem' }}>
          <ToolBtn active={tool === 'pen'} onClick={() => setTool('pen')} title="Pen (freehand)">✏️</ToolBtn>
          <ToolBtn active={tool === 'line'} onClick={() => setTool('line')} title="Straight line">📏</ToolBtn>
          <ToolBtn active={tool === 'rect'} onClick={() => setTool('rect')} title="Rectangle">⬜</ToolBtn>
          <ToolBtn active={tool === 'arrow'} onClick={() => setTool('arrow')} title="Arrow">➡️</ToolBtn>
          <ToolBtn active={tool === 'text'} onClick={() => setTool('text')} title="Text label">T</ToolBtn>
          {!compact && <ToolBtn active={tool === 'marker'} onClick={() => setTool('marker')} title="Add opening marker">📍</ToolBtn>}
          <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} title="Eraser">🧹</ToolBtn>
        </div>

        <div style={{ width: 1, height: compact ? 20 : 28, background: 'var(--border)', margin: '0 0.15rem' }} />

        {/* Color */}
        <div style={{ display: 'flex', gap: '0.15rem' }}>
          {['#1e293b', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b'].map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: compact ? 16 : 20, height: compact ? 16 : 20, borderRadius: '50%', border: color === c ? '2px solid white' : '2px solid transparent', background: c, cursor: 'pointer' }} />
          ))}
        </div>

        {!compact && <input type="range" min={1} max={8} value={lineWidth} onChange={e => setLineWidth(+e.target.value)} style={{ width: 60 }} title="Stroke width" />}

        <div style={{ width: 1, height: compact ? 20 : 28, background: 'var(--border)', margin: '0 0.15rem' }} />

        {/* Undo/Redo/Clear */}
        <ToolBtn onClick={undo} title="Undo">↩</ToolBtn>
        <ToolBtn onClick={redo} title="Redo">↪</ToolBtn>
        <ToolBtn onClick={clear} title="Clear canvas">🗑</ToolBtn>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', background: '#f8fafc', borderRadius: 8, border: '2px solid var(--border)', overflow: 'hidden', cursor: tool === 'eraser' ? 'cell' : tool === 'text' || tool === 'marker' ? 'crosshair' : 'crosshair' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ display: 'block', width: '100%', touchAction: 'none' }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />

        {/* Marker popup */}
        {markerForm && (
          <div style={{ position: 'absolute', top: (markerForm.y / CANVAS_H * 100) + '%', left: (markerForm.x / CANVAS_W * 100) + '%', transform: 'translate(-50%,-110%)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.625rem', zIndex: 10, minWidth: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>PLACE OPENING MARKER</div>
            <select value={selectedOpening} onChange={e => setSelectedOpening(+e.target.value)}
              style={{ width: '100%', padding: '0.25rem', marginBottom: '0.375rem', fontSize: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)' }}>
              {openings.map(o => <option key={o.openingNumber} value={o.openingNumber}>#{o.openingNumber} — {o.roomLocation || 'Opening'} ({o.productCategory})</option>)}
            </select>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button onClick={addMarker} className="btn btn-sm btn-primary" style={{ fontSize: '0.6875rem' }}>📍 Place</button>
              <button onClick={() => setMarkerForm(null)} style={{ padding: '0.25rem 0.5rem', background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.6875rem' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Text input popup */}
        {textPos && (
          <div style={{ position: 'absolute', top: (textPos.y / CANVAS_H * 100) + '%', left: (textPos.x / CANVAS_W * 100) + '%', zIndex: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.375rem', display: 'flex', gap: '0.25rem' }}>
            <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addText(textInput, textPos)}
              style={{ padding: '0.25rem', fontSize: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', width: 140 }}
              placeholder="Type label..." />
            <button onClick={() => addText(textInput, textPos)} className="btn btn-sm btn-primary" style={{ fontSize: '0.625rem' }}>Add</button>
            <button onClick={() => setTextPos(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>
        )}
      </div>

      {/* Marker list */}
      {markers.length > 0 && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {markers.map(m => {
            const o = openings.find(op => op.openingNumber === m.openingNumber);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.625rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9999, fontSize: '0.6875rem' }}>
                <span style={{ fontWeight: 800, color: '#3b82f6' }}>#{m.openingNumber}</span>
                <span style={{ color: 'var(--text-muted)' }}>{m.room || o?.roomLocation || ''}</span>
                {m.width > 0 && <span style={{ color: 'var(--text-secondary)' }}>{m.width}×{m.height}</span>}
                {m.hasNotes && <span title="Has install notes">📝</span>}
                <button onClick={() => removeMarker(m.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.5rem', padding: 0 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Unlinked warning */}
      {openings.filter(o => !markers.find(m => m.openingNumber === o.openingNumber)).length > 0 && (
        <div style={{ marginTop: '0.375rem', fontSize: '0.6875rem', color: '#f59e0b' }}>
          ⚠️ Not on sketch: {openings.filter(o => !markers.find(m => m.openingNumber === o.openingNumber)).map(o => `#${o.openingNumber}`).join(', ')}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════
// MULTI-ELEVATION SKETCH (tabs for Front/Rear/Left/Right/Garage)
// ══════════════════════════════════════════════════════════
const ELEVATIONS = ['front', 'rear', 'left', 'right', 'garage', 'other'] as const;

export function SketchBoard({ appointmentId, openings = [] }: { appointmentId: string; openings: any[] }) {
  const [activeElevation, setActiveElevation] = useState<string>('front');
  const [allMarkers, setAllMarkers] = useState<SketchMarker[]>(() => getAllSketchMarkers(appointmentId));

  const handleMarkersChange = (elevation: string, markers: SketchMarker[]) => {
    setAllMarkers(getAllSketchMarkers(appointmentId));
  };

  // Unlinked openings across ALL elevations
  const linkedNumbers = new Set(allMarkers.map(m => m.openingNumber));
  const unlinked = openings.filter(o => !linkedNumbers.has(o.openingNumber));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>🏠 Sketch Board</h2>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Use ✏️ to draw · 📍 to place opening markers · T for labels
        </div>
      </div>

      {/* Elevation tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {ELEVATIONS.map(elev => {
          const count = allMarkers.filter(m => (m as any).elevation === elev).length;
          return (
            <button key={elev} onClick={() => setActiveElevation(elev)} style={{
              padding: '0.375rem 0.875rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem',
              background: activeElevation === elev ? 'var(--accent)' : 'var(--bg-card)',
              color: activeElevation === elev ? 'white' : 'var(--text-secondary)',
            }}>
              {elev.charAt(0).toUpperCase() + elev.slice(1)}
              {count > 0 && <span style={{ marginLeft: 4, fontSize: '0.6875rem', opacity: 0.8 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Canvas for active elevation */}
      <div className="card">
        <DrawableSketchCanvas
          key={`${appointmentId}_${activeElevation}`}
          appointmentId={appointmentId}
          openings={openings}
          elevation={activeElevation}
          onMarkersChange={m => handleMarkersChange(activeElevation, m)}
        />
      </div>

      {/* Cross-elevation warnings */}
      {unlinked.length > 0 && (
        <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>⚠️ Openings Not Placed on Any Sketch</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {unlinked.map(o => (
              <span key={o.openingNumber} style={{ fontSize: '0.6875rem', padding: '1px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: 4, color: '#f59e0b' }}>
                #{o.openingNumber} {o.roomLocation}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
