// ═══════════════════════════════════════════════════════════════
// Sketch Symbol Toolbar — Mobile-Optimized Drawing Tools
// Front Door, Window X, Patio Door, Special Shape, Oriel,
// Note, Arrow, Join/Mull, Eraser, Undo/Redo
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import type { MarkerSymbol } from '../utils/sketchSync';

export type SketchTool = 'pen' | 'line' | 'rect' | 'eraser'
  | 'window_x' | 'front_door' | 'patio_door' | 'special_shape' | 'oriel'
  | 'note' | 'arrow' | 'join_mull';

interface ToolDef {
  id: SketchTool;
  icon: string;
  label: string;
  category: 'draw' | 'symbol' | 'action';
  tooltip: string;
  markerSymbol?: MarkerSymbol;
}

const TOOLS: ToolDef[] = [
  // ── Drawing ──
  { id: 'pen', icon: '✏️', label: 'Pen', category: 'draw', tooltip: 'Freehand draw' },
  { id: 'line', icon: '📏', label: 'Line', category: 'draw', tooltip: 'Straight line' },
  { id: 'rect', icon: '⬜', label: 'Rect', category: 'draw', tooltip: 'Rectangle' },
  // ── Symbols ──
  { id: 'front_door', icon: '🚪', label: 'Door', category: 'symbol', tooltip: 'Front door marker', markerSymbol: 'front_door' },
  { id: 'window_x', icon: '✕', label: 'Window', category: 'symbol', tooltip: 'Window marker (X)', markerSymbol: 'window_x' },
  { id: 'patio_door', icon: '🚪↔', label: 'Patio', category: 'symbol', tooltip: 'Patio door marker', markerSymbol: 'patio_door' },
  { id: 'special_shape', icon: '⬡', label: 'Shape', category: 'symbol', tooltip: 'Special shape marker', markerSymbol: 'special_shape' },
  { id: 'oriel', icon: '🔲', label: 'Oriel', category: 'symbol', tooltip: 'Oriel window marker', markerSymbol: 'oriel' },
  { id: 'note', icon: '📝', label: 'Note', category: 'symbol', tooltip: 'Add note to sketch', markerSymbol: 'note' },
  { id: 'arrow', icon: '➡️', label: 'Arrow', category: 'symbol', tooltip: 'Label / arrow', markerSymbol: 'arrow' },
  // ── Actions ──
  { id: 'join_mull', icon: '🔗', label: 'Join', category: 'action', tooltip: 'Join/mull selected markers' },
  { id: 'eraser', icon: '🧹', label: 'Erase', category: 'action', tooltip: 'Erase / delete marker' },
];

export function SketchSymbolToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  joinMode,
  selectedForJoinCount,
  compact = false,
}: {
  activeTool: SketchTool;
  onToolChange: (tool: SketchTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  joinMode?: boolean;
  selectedForJoinCount?: number;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const btnSize = compact ? 40 : 48;

  const renderBtn = (t: ToolDef) => {
    const isActive = activeTool === t.id;
    const isJoinActive = t.id === 'join_mull' && joinMode;

    return (
      <button
        key={t.id}
        onClick={() => onToolChange(t.id)}
        title={t.tooltip}
        style={{
          width: btnSize, height: btnSize,
          border: 'none',
          borderRadius: 10,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          fontSize: t.id === 'window_x' ? '1.25rem' : '1.1rem',
          fontWeight: t.id === 'window_x' ? 900 : 400,
          background: isActive || isJoinActive
            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
            : 'rgba(255,255,255,0.06)',
          color: isActive || isJoinActive ? 'white' : 'var(--text-muted)',
          boxShadow: isActive ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
      >
        <span>{t.icon}</span>
        <span style={{ fontSize: '0.5rem', fontWeight: 600, letterSpacing: 0.5, opacity: 0.85 }}>{t.label}</span>
        {t.id === 'join_mull' && selectedForJoinCount !== undefined && selectedForJoinCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#f59e0b', color: '#000',
            fontSize: '0.6rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{selectedForJoinCount}</span>
        )}
      </button>
    );
  };

  return (
    <div style={{
      background: 'var(--bg-card, #1a1a2e)',
      borderRadius: 12,
      border: '1px solid var(--border, rgba(255,255,255,0.1))',
      padding: compact ? '0.35rem' : '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    }}>
      {/* Toggle for compact mode */}
      {compact && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '0.7rem',
            padding: '0.15rem 0.5rem', textAlign: 'center',
          }}
        >{expanded ? '▲ Collapse' : '▼ Tools'}</button>
      )}

      {expanded && (
        <>
          {/* Drawing tools */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {TOOLS.filter(t => t.category === 'draw').map(renderBtn)}
            <div style={{ width: 1, height: btnSize, background: 'var(--border)', margin: '0 0.1rem' }} />
            {TOOLS.filter(t => t.category === 'symbol').map(renderBtn)}
          </div>

          {/* Actions row */}
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {TOOLS.filter(t => t.category === 'action').map(renderBtn)}
            </div>
            <div style={{ display: 'flex', gap: '0.15rem' }}>
              <button onClick={onUndo} title="Undo" style={actionBtnStyle(btnSize)}>↩</button>
              <button onClick={onRedo} title="Redo" style={actionBtnStyle(btnSize)}>↪</button>
              <button onClick={onClear} title="Clear canvas" style={actionBtnStyle(btnSize)}>🗑</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function actionBtnStyle(size: number): React.CSSProperties {
  return {
    width: size * 0.75, height: size * 0.75,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    transition: 'all 0.15s',
  };
}

// ── Helper: Get marker symbol from tool ─────────────────────
export function getMarkerSymbolFromTool(tool: SketchTool): MarkerSymbol | null {
  const toolDef = TOOLS.find(t => t.id === tool);
  return toolDef?.markerSymbol || null;
}

// ── Export tool list for external use ────────────────────────
export { TOOLS as SKETCH_TOOLS };
export type { ToolDef };
