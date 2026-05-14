import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

// ═══════════════════════════════════════════════════════════
// My Commissions — Sales Rep Commission Records Dashboard
// Office Mode > My Commissions
// ═══════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  imported:        { label: 'Imported',       color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  pending:         { label: 'Pending',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  expected:        { label: 'Expected',       color: '#a78bfa', bg: 'rgba(139,92,246,0.12)' },
  paid:            { label: 'Paid',           color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  partially_paid:  { label: 'Partial',        color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  disputed:        { label: 'Disputed',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  adjusted:        { label: 'Adjusted',       color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  ignored:         { label: 'Ignored',        color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export function CommissionsPage() {
  const [tab, setTab] = useState<'dashboard' | 'records' | 'import' | 'reports'>('dashboard');
  const [templateInfo, setTemplateInfo] = useState<any>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'analyzing' | 'preview' | 'importing' | 'done'>('idle');
  const [importData, setImportData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.get('/commissions/dashboard');
      setDashboard(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await api.get(`/commissions?${params.toString()}`);
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Records load error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (tab === 'records') loadRecords(); }, [tab, loadRecords]);

  // ── Import flow ──
  const analyzeSheet = async () => {
    setImportState('analyzing');
    try {
      const data = await api.post('/commissions/import/analyze', {});
      setImportData(data);
      setImportState('preview');
    } catch (err: any) {
      alert(err.message || 'Analysis failed');
      setImportState('idle');
    }
  };

  const executeImport = async () => {
    if (!importData?.parsedData) return;
    setImportState('importing');
    try {
      const result = await api.post('/commissions/import/execute', {
        filePath: importData.filePath,
        parsedData: importData.parsedData,
        columnMapping: importData.suggestedMapping,
      });
      setImportResult(result);
      setImportState('done');
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Import failed');
      setImportState('preview');
    }
  };

  const exportExcel = async () => {
    try {
      const token = localStorage.getItem('wwa_token');
      const res = await fetch('/api/commissions/export/excel', {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Commission_Export.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const loadTemplateInfo = async () => {
    try {
      const data = await api.get('/commissions/report/template-info');
      setTemplateInfo(data);
    } catch (err) {
      console.error('Template info error:', err);
    }
  };

  const generateReport = async (recordId?: string) => {
    setReportGenerating(true);
    try {
      const token = localStorage.getItem('wwa_token');
      const endpoint = recordId ? '/api/commissions/report/generate' : '/api/commissions/report/generate-blank';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(recordId ? { recordId } : {}),
      });
      if (!res.ok) throw new Error('Report generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disp = res.headers.get('Content-Disposition') || '';
      const match = disp.match(/filename=([^;]+)/);
      a.href = url;
      a.download = match ? match[1] : 'Commission_Report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Report generation failed: ' + err.message);
    } finally {
      setReportGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1>💰 My Commissions</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-sm" onClick={exportExcel} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
            📥 Export Excel
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem' }}>
        {(['dashboard', 'records', 'import', 'reports'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'reports' && !templateInfo) loadTemplateInfo(); }}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize' }}>
            {t === 'dashboard' ? '📊 Dashboard' : t === 'records' ? '📋 Records' : t === 'import' ? '📂 Import' : '📄 Reports'}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {tab === 'dashboard' && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <StatCard label="Total Records" value={dashboard?.totalRecords || 0} color="#3b82f6" />
            <StatCard label="Total Commission" value={fmt(dashboard?.totalCommission || 0)} color="#22c55e" />
            <StatCard label="Total Paid" value={fmt(dashboard?.totalPaid || 0)} color="#10b981" />
            <StatCard label="Unpaid" value={fmt(dashboard?.totalUnpaid || 0)} color="#f59e0b" />
            <StatCard label="Pending" value={fmt(dashboard?.totalPending || 0)} color="#a78bfa" />
          </div>

          {/* Status breakdown */}
          {dashboard?.byStatus && Object.keys(dashboard.byStatus).length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>By Status</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Object.entries(dashboard.byStatus).map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.imported;
                  return (
                    <span key={status} style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                      background: cfg.bg, color: cfg.color,
                    }}>
                      {cfg.label}: {count as number}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent records */}
          {dashboard?.recentRecords?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Recent Commission Records</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr><th>Customer</th><th>Address</th><th>Job Amt</th><th>Commission</th><th>Paid</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {dashboard.recentRecords.map((r: any) => {
                      const cfg = STATUS_CONFIG[r.commissionStatus] || STATUS_CONFIG.imported;
                      return (
                        <tr key={r.id}>
                          <td><strong>{r.customerName || '—'}</strong></td>
                          <td>{r.customerAddress || '—'}</td>
                          <td>{fmt(r.jobAmount)}</td>
                          <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(r.commissionAmount)}</td>
                          <td>{fmt(r.paidAmount)}</td>
                          <td><span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 4 }}>{cfg.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import History */}
          {dashboard?.recentImports?.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Import History</h3>
              {dashboard.recentImports.map((imp: any) => (
                <div key={imp.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <strong>{imp.sourceFileName}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{imp.sourceSheetName} · {imp.importedRows} rows · {new Date(imp.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    color: imp.status === 'completed' ? '#22c55e' : '#f59e0b',
                    background: imp.status === 'completed' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                  }}>{imp.status}</span>
                </div>
              ))}
            </div>
          )}

          {!dashboard && <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>}
          {dashboard && dashboard.totalRecords === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</div>
              <p>No commission records yet. Go to <strong>Import</strong> tab to import your commission sheet.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ RECORDS TAB ═══ */}
      {tab === 'records' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              className="form-input"
              placeholder="Search customer, address, contract..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-secondary" onClick={loadRecords}>🔄</button>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3>Commission Records ({total})</h3>
            </div>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : records.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Customer</th><th>Address</th><th>Region</th><th>Sold Date</th>
                      <th># Win</th><th>Job Amt</th><th>Commission</th><th>Paid</th><th>Unpaid</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => {
                      const cfg = STATUS_CONFIG[r.commissionStatus] || STATUS_CONFIG.imported;
                      const paid = (r.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                      const unpaid = Number(r.commissionAmount || 0) - paid;
                      return (
                        <tr key={r.id}>
                          <td><strong>{r.customerName || '—'}</strong></td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customerAddress || '—'}</td>
                          <td>{r.region || '—'}</td>
                          <td>{r.soldDate ? new Date(r.soldDate).toLocaleDateString() : '—'}</td>
                          <td>{r.numWindows || '—'}</td>
                          <td>{fmt(Number(r.jobAmount || 0))}</td>
                          <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(Number(r.commissionAmount || 0))}</td>
                          <td>{fmt(paid)}</td>
                          <td style={{ color: unpaid > 0 ? '#f59e0b' : '#22c55e' }}>{fmt(unpaid)}</td>
                          <td>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 4 }}>
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ IMPORT TAB ═══ */}
      {tab === 'import' && (
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>📂 Import Commission Sheet</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Import from: <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                C:\Users\nedpe\Desktop\WINDOW WORLD DOCS\Commission Sheet BTR.xlsx
              </code>
            </p>

            {importState === 'idle' && (
              <button className="btn btn-primary" onClick={analyzeSheet}>
                🔍 Analyze Commission Sheet
              </button>
            )}

            {importState === 'analyzing' && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                ⏳ Analyzing workbook...
              </div>
            )}

            {importState === 'preview' && importData && (
              <div>
                {/* File info */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>📄 {importData.fileName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {importData.sheets?.length || 0} sheet(s) detected
                  </div>
                </div>

                {/* Customer Info preview */}
                {importData.parsedData?.customerInfo && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Customer Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                      {Object.entries(importData.parsedData.customerInfo).map(([k, v]) => (
                        v ? (
                          <div key={k} style={{ display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)', minWidth: 100 }}>{k}:</span>
                            <strong>{String(v)}</strong>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {/* Products preview */}
                {importData.parsedData?.products?.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Products / Line Items ({importData.parsedData.products.length})</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.75rem' }}>
                        <thead>
                          <tr><th>Row</th><th>Qty</th><th>Product</th><th>Book $</th><th>Comm/Unit</th><th>Total Comm</th></tr>
                        </thead>
                        <tbody>
                          {importData.parsedData.products.map((p: any, i: number) => (
                            <tr key={i}>
                              <td>{p.row}</td>
                              <td>{p.qty}</td>
                              <td>{p.product}</td>
                              <td>{fmt(p.bookPrice)}</td>
                              <td>{fmt(p.commissionPerUnit)}</td>
                              <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(p.totalCommission)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Column Mapping preview */}
                {importData.suggestedMapping && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Column Mapping</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem', fontSize: '0.75rem' }}>
                      {Object.entries(importData.suggestedMapping).map(([field, source]) => (
                        <div key={field} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
                          <span style={{ color: 'var(--text-muted)' }}>{field}:</span>
                          <span>{String(source)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={executeImport}>
                    ✅ Import Commission Record
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setImportState('idle'); setImportData(null); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {importState === 'importing' && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                ⏳ Importing commission data...
              </div>
            )}

            {importState === 'done' && importResult && (
              <div>
                <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>✅ Import Successful</div>
                  <div style={{ fontSize: '0.8125rem' }}>
                    <p>Import ID: {importResult.importId}</p>
                    <p>Record ID: {importResult.recordId}</p>
                    <p>Rows imported: {importResult.importedRows}</p>
                    {importResult.commission?.commissionAmount && (
                      <p>Total Commission: <strong style={{ color: '#22c55e' }}>{fmt(Number(importResult.commission.commissionAmount))}</strong></p>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => { setTab('dashboard'); loadDashboard(); setImportState('idle'); }}>
                  View Dashboard →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ REPORTS TAB ═══ */}
      {tab === 'reports' && (
        <div>
          {/* Template Info */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>📄 Commission Report — Exact Template Replica</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Generates an exact copy of the BTR Commission Sheet (CS-2400) workbook,
              populated with your commission data. All formulas, formatting, borders,
              merged cells, and print settings are preserved.
            </p>

            {templateInfo && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>TEMPLATE</div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{templateInfo.templateFile}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Form {templateInfo.formNumber} · Rev. {templateInfo.revised}</div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>PRESERVED</div>
                  <div style={{ fontSize: '0.8125rem' }}>
                    {templateInfo.mergeCount} merges · {templateInfo.formulaCount} formulas
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    {templateInfo.orientation} · Scale {templateInfo.scale}% · Print: {templateInfo.printArea}
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>INPUT CELLS</div>
                  <div style={{ fontSize: '0.8125rem' }}>{templateInfo.inputCellCount} mapped cells</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    Customer ({templateInfo.sections?.customerInfo?.cells}) · Products ({templateInfo.sections?.productQuantities?.cells}) · Options ({templateInfo.sections?.optionQuantities?.cells})
                  </div>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>TOTALS FORMULA</div>
                  <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>=SUM(I13:I43)+SUM(V11:V43)</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Cell {templateInfo.sections?.formulas?.totalCell}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => generateReport()} disabled={reportGenerating}>
                {reportGenerating ? '⏳ Generating...' : '📥 Download Blank Commission Sheet'}
              </button>
            </div>
          </div>

          {/* Generate from records */}
          {records.length > 0 || dashboard?.recentRecords?.length > 0 ? (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Generate from Commission Record</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Select a commission record to generate a populated report.
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr><th>Customer</th><th>Region</th><th># Win</th><th>Job Amt</th><th>Commission</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {(dashboard?.recentRecords || []).map((r: any) => (
                      <tr key={r.id}>
                        <td><strong>{r.customerName || '—'}</strong></td>
                        <td>{r.region || 'BTR'}</td>
                        <td>{r.numWindows || '—'}</td>
                        <td>{fmt(r.jobAmount)}</td>
                        <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(r.commissionAmount)}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => generateReport(r.id)} disabled={reportGenerating}>
                            📄 Generate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No commission records to generate reports from. Import data first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stat Card Component ──
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
