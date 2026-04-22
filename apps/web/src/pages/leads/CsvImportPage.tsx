import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowUpTrayIcon, DocumentIcon, CheckCircleIcon, ArrowPathIcon, TableCellsIcon,
  UserPlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import apiClient from '../../api/client';

// ─── Types ────────────────────────────────────────────────
interface CsvRow {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zip: string;
  source: string;
  notes: string;
  isStorm: boolean;
  _status: 'valid' | 'duplicate' | 'error';
  _errors: string[];
}

// ─── Demo parsed rows ──────────────────────────────────────
const DEMO_ROWS: CsvRow[] = [
  { firstName: 'Terry', lastName: 'Boudreaux', phone: '(225) 555-7701', email: 'terry.b@gmail.com', address: '4412 Perkins Rd', city: 'Baton Rouge', zip: '70808', source: 'home-show', notes: 'Interested in sliding doors too', isStorm: false, _status: 'valid', _errors: [] },
  { firstName: 'Gina', lastName: 'Trahan', phone: '(225) 555-2234', email: '', address: '221 Airline Hwy', city: 'Baton Rouge', zip: '70806', source: 'home-show', notes: '', isStorm: false, _status: 'valid', _errors: [] },
  { firstName: 'Patricia', lastName: 'Landry', phone: '(225) 555-1002', email: 'patricia.landry@yahoo.com', address: '312 Sherwood Forest Blvd', city: 'Baton Rouge', zip: '70815', source: 'home-show', notes: '', isStorm: false, _status: 'duplicate', _errors: ['Phone matches existing lead: Patricia Landry'] },
  { firstName: 'Earl', lastName: 'Thibaut', phone: '(225) 555-8812', email: 'earl.t@cox.net', address: '8801 Airline', city: 'Baton Rouge', zip: '70815', source: 'storm-list', notes: 'Storm damage photo attached', isStorm: true, _status: 'valid', _errors: [] },
  { firstName: 'Marie', lastName: '', phone: '', email: 'marie@outlook.com', address: '3321 Old Hammond', city: 'Baton Rouge', zip: '70816', source: 'home-show', notes: '', isStorm: false, _status: 'error', _errors: ['Missing last name', 'Missing phone number'] },
  { firstName: 'Donald', lastName: 'Pitre', phone: '(985) 555-3341', email: 'donald.pitre@gmail.com', address: '7812 Hwy 22', city: 'Mandeville', zip: '70471', source: 'storm-list', notes: '', isStorm: true, _status: 'valid', _errors: [] },
  { firstName: 'Wanda', lastName: 'Fontenot', phone: '(337) 555-6612', email: '', address: '229 Pinhook Rd', city: 'Lafayette', zip: '70503', source: 'home-show', notes: 'Called booth multiple times', isStorm: false, _status: 'valid', _errors: [] },
];

const COLUMN_MAP = [
  { csv: 'First Name', field: 'firstName' },
  { csv: 'Last Name', field: 'lastName' },
  { csv: 'Phone', field: 'phone' },
  { csv: 'Email', field: 'email' },
  { csv: 'Address', field: 'address' },
  { csv: 'City', field: 'city' },
  { csv: 'Zip', field: 'zip' },
  { csv: 'Source', field: 'source' },
  { csv: 'Notes', field: 'notes' },
];

export function CsvImportPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [_fileName, setFileName] = useState('');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    toast.success(`Parsing "${file.name}"…`);
    // Simulate parse → show demo data
    setTimeout(() => { setRows(DEMO_ROWS); setStep('preview'); }, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r._status === 'valid');
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const result: any = await apiClient.leads.bulkImport({ leads: validRows });
      const imported = result?.imported ?? validRows.length;
      const skipped = result?.skipped ?? 0;
      const failed = result?.failed ?? 0;
      setImported(imported);
      setStep('done');
      toast.success(`${imported} leads imported!${skipped > 0 ? ` ${skipped} duplicates skipped.` : ''}${failed > 0 ? ` ${failed} failed.` : ''}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Import failed — please try again');
    } finally {
      setImporting(false);
    }
  };

  const filtered = rows.filter(r => filter === 'all' || r._status === filter);
  const validCount = rows.filter(r => r._status === 'valid').length;
  const dupCount = rows.filter(r => r._status === 'duplicate').length;
  const errCount = rows.filter(r => r._status === 'error').length;

  return (
    <div className="p-6 space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <ArrowUpTrayIcon className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold text-white">CSV Lead Import</h1>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Bulk-import leads from home shows, Angi, door-knock lists, or any spreadsheet</p>
        </div>
        {step !== 'upload' && (
          <button onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
            className="btn-ghost btn-sm flex items-center gap-1.5">
            <ArrowPathIcon className="h-4 w-4" /> Start Over
          </button>
        )}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-slate-700 hover:border-brand-500/50 rounded-2xl p-12 text-center transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}>
            <ArrowUpTrayIcon className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium text-sm">Drop your CSV file here</p>
            <p className="text-slate-500 text-xs mt-1">or click to browse · CSV, XLS, XLSX accepted</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          </div>

          {/* Column guide */}
          <div className="card mt-5 p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TableCellsIcon className="h-4 w-4 text-slate-400" /> Expected CSV Columns
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLUMN_MAP.map(c => (
                <div key={c.field} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-brand-500/40 flex-shrink-0" />
                  <span className="text-slate-400">{c.csv}</span>
                  <span className="text-slate-700">(→ {c.field})</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 mt-3">Column headers are case-insensitive. Download our <
            a href="#" className="text-brand-400 hover:underline">template CSV</a> to get started.</p>
          </div>

          {/* Quick try */}
          <button onClick={() => { setFileName('home_show_leads.csv'); setRows(DEMO_ROWS); setStep('preview'); }}
            className="btn-secondary btn-sm mt-4 flex items-center gap-1.5">
            <DocumentIcon className="h-4 w-4" /> Try with demo data →
          </button>
        </motion.div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Rows', value: rows.length, color: 'text-white' },
              { label: 'Ready to Import', value: validCount, color: 'text-emerald-400' },
              { label: 'Duplicates Skipped', value: dupCount, color: 'text-amber-400' },
              { label: 'Errors (Fix First)', value: errCount, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <div className={clsx('text-2xl font-bold', s.color)}>{s.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Show:</span>
            {(['all', 'valid', 'duplicate', 'error'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={clsx('btn-sm text-xs capitalize', filter === f ? 'btn-primary' : 'btn-secondary')}>
                {f} {f !== 'all' && `(${rows.filter(r => r._status === f).length})`}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Address</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filtered.map((row, i) => (
                    <tr key={i} className={clsx('transition-colors',
                      row._status === 'duplicate' ? 'bg-amber-500/4' :
                      row._status === 'error' ? 'bg-red-500/4' : '')}>
                      <td className="px-4 py-2.5">
                        <span className={clsx('text-[9px] border px-1.5 py-0.5 rounded-full font-medium',
                          row._status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          row._status === 'duplicate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20')}>
                          {row._status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-200">{row.firstName} {row.lastName}</td>
                      <td className="px-4 py-2.5 text-slate-400">{row.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-400">{row.address}, {row.city}</td>
                      <td className="px-4 py-2.5 text-slate-500 capitalize">{row.source?.replace(/-/g, ' ')}</td>
                      <td className="px-4 py-2.5">
                        {row._errors.length > 0 ? (
                          <div className="text-red-400 text-[10px]">{row._errors.join(' · ')}</div>
                        ) : row._status === 'duplicate' ? (
                          <div className="text-amber-400 text-[10px]">{row._errors[0]}</div>
                        ) : <span className="text-emerald-600 text-[10px]">✓ Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 text-xs text-slate-500">
              {validCount} leads will be imported · {dupCount} duplicates skipped · {errCount} rows skipped (fix errors first)
            </div>
            <button onClick={handleImport} disabled={validCount === 0 || importing}
              className="btn-primary flex items-center gap-2">
              {importing ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <UserPlusIcon className="h-4 w-4" />}
              {importing ? 'Importing…' : `Import ${validCount} Leads`}
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16">
          <CheckCircleIcon className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">{imported} leads imported!</h2>
          <p className="text-slate-400 text-sm mt-2">All leads are now in your pipeline and assigned to the queue.</p>
          <div className="flex items-center gap-3 justify-center mt-6">
            <Link to="/leads" className="btn-primary flex items-center gap-2">View All Leads →</Link>
            <button onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
              className="btn-secondary">Import Another File</button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
