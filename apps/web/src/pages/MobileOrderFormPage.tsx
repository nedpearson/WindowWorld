import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PaperOrderForm, PaperOrderFormHandle, OrderFormData, OpeningRow, emptyFormData } from '../components/PaperOrderForm';
import { api } from '../utils/api';
import { OpeningWizard } from '../components/OpeningWizard';
import { QuoteHealthWidget } from '../components/QuoteHealthWidget';
import { analyzeQuoteHealth, QuoteHealth } from '../utils/quoteHealth';
import { createOpeningWithDefaults } from '../utils/openingDefaults';
import { getSuggestedDefaults, detectBulkApplyOpportunities, BulkApplyOpportunity, learnFromSavedOpening } from '../utils/neverAskTwice';
import { AppointmentRecap } from '../components/AppointmentRecap';
import { SafetyGlazingBadge } from '../components/SafetyGlazingPanel';
import { FinalTemperedReview } from '../components/FinalTemperedReview';
import { buildSafetyReview, detectSafetyGlazingFromVoice, checkExportReadiness, OpeningSafetyReview, TemperedDecision } from '../utils/safetyGlazingRules';
import { OrielMeasurementMode, OrielMeasurementResult } from '../components/OrielMeasurementMode';
import { SpecialtyMeasurementMode, SpecialtyMeasurementResult } from '../components/SpecialtyMeasurementMode';
import { FinalMeasurementReview } from '../components/FinalMeasurementReview';
import { MeasurementAdjustment, checkMeasurementExportReadiness } from '../utils/measurementRules';

// ═══════════════════════════════════════════════════════════════
// MOBILE ORDER FORM — Field-friendly editing with form fidelity
// ═══════════════════════════════════════════════════════════════

type MobileTab = 'customer' | 'openings' | 'sketch' | 'notes' | 'recap' | 'preview';

export function MobileOrderFormPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const formRef = useRef<PaperOrderFormHandle>(null);

  const [tab, setTab] = useState<MobileTab>('customer');
  const [formData, setFormData] = useState<OrderFormData>(emptyFormData());
  const [loading, setLoading] = useState(true);
  const [editingOpening, setEditingOpening] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [health, setHealth] = useState<QuoteHealth | null>(null);
  const [bulkOpportunities, setBulkOpportunities] = useState<BulkApplyOpportunity[]>([]);
  const [safetyReviews, setSafetyReviews] = useState<Record<number, OpeningSafetyReview>>({});
  const [voiceSafetyWarnings, setVoiceSafetyWarnings] = useState<string[]>([]);
  const [measurementAdjustments, setMeasurementAdjustments] = useState<Record<number, MeasurementAdjustment>>({});
  const [orielMode, setOrielMode] = useState<number | null>(null);     // openingIndex
  const [specialtyMode, setSpecialtyMode] = useState<{ index: number; windowType: string } | null>(null);

  useEffect(() => {
    if (!appointmentId) { setLoading(false); return; }
    loadData();
  }, [appointmentId]);

  useEffect(() => {
    // Recalculate health & bulk opportunities whenever openings change
    const validOpenings = formData.openings.filter(o => o.qty > 0 || o.model);
    setHealth(analyzeQuoteHealth(formData, validOpenings));
    setBulkOpportunities(detectBulkApplyOpportunities(validOpenings));
  }, [formData]);

  const loadData = async () => {
    try {
      const result = await api.post(`/forms/auto-fill/order-form/${appointmentId}`, {});
      const fd = result.formData;
      setFormData({
        poNumber: fd.poNumber || '',
        accountNumber: fd.accountNumber || '',
        orderDate: fd.orderDate || '',
        customerName: fd.customerName || '',
        phone: fd.phone || '',
        phone2: fd.phone2 || '',
        address: fd.address || '',
        city: fd.city || '',
        state: fd.state || '',
        zip: fd.zip || '',
        estimator: fd.estimator || '',
        estimatorPhone: fd.estimatorPhone || '',
        notes: fd.sketchNotes || '',
        sketchDataUrl: '',
        pageNumber: 1,
        totalPages: fd.totalPages || 1,
        openings: mapOpenings(fd.openings || []),
      });
    } catch {}
    setLoading(false);
  };

  const mapOpenings = (arr: any[]): OpeningRow[] => {
    const rows = arr.map((o: any) => ({
      qty: o.qty || 1, model: o.model || o.seriesModel || o.productCategory || '', vinylColor: o.vinylColor || '',
      intColor: o.interiorColor || '', extColor: o.exteriorColor || '',
      width: o.width ? String(o.width) : '', height: o.height ? String(o.height) : '',
      legHeight: o.legHeight ? String(o.legHeight) : '', customRadius: o.customRadius ? String(o.customRadius) : '',
      windowNumber: o.windowNumber ? String(o.windowNumber) : String(o.openingNumber || ''),
      hinge: o.hinge || '', glassOption: o.glassOption || o.glassPackage || '', foamEnhanced: !!o.foamEnhanced,
      gridStyle: o.gridStyle || '', gridPattern: o.gridPattern || '', gridFull: !!o.gridFull, gridSpec: !!o.gridSpec,
      typeFill: !!o.typeFill, typeHalf: !!o.typeHalf, typeMine: !!o.typeMine,
      tempFull: !!o.tempFull, tempS: !!o.tempS, tempU: !!o.tempU,
      nailFin: !!o.nailFin, fullScreen: !!o.fullScreen || (o.screenOption?.toLowerCase().includes('full')),
      oriel: !!o.oriel, hor: !!o.horizontalRR,
      typeExt: o.exteriorType || '', typeInt: o.trimType || o.installType || '', rmvInst: o.removeInstallType || o.removalType || '', sill: !!o.sillRepair,
      gridOptions: o.gridStyle || '', obsc: '', temp: '', floor: o.floorNumber ? String(o.floorNumber) : '',
    }));
    const empty: OpeningRow = { qty: 0, model: '', vinylColor: '', intColor: '', extColor: '', width: '', height: '', legHeight: '', customRadius: '', windowNumber: '', hinge: '', glassOption: '', foamEnhanced: false, gridStyle: '', gridPattern: '', gridFull: false, gridSpec: false, typeFill: false, typeHalf: false, typeMine: false, tempFull: false, tempS: false, tempU: false, nailFin: false, fullScreen: false, oriel: false, hor: false, typeExt: '', typeInt: '', rmvInst: '', sill: false, gridOptions: '', obsc: '', temp: '', floor: '' };
    while (rows.length < 20) rows.push({ ...empty });
    return rows.slice(0, 20);
  };

  const updateField = (field: keyof OrderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateOpening = (idx: number, field: keyof OpeningRow, value: any) => {
    setFormData(prev => {
      const openings = [...prev.openings];
      openings[idx] = { ...openings[idx], [field]: value };
      return { ...prev, openings };
    });
  };

  const handleBulkApply = (opp: BulkApplyOpportunity) => {
    if (!confirm(`Apply ${opp.value} to ${opp.targetCount} remaining openings?`)) return;
    
    setFormData(prev => {
      const openings = [...prev.openings];
      for (let i = 0; i < openings.length; i++) {
        if (openings[i].qty > 0 || openings[i].model) {
          const mapToOpeningRowField: Record<string, keyof OpeningRow> = {
            interiorColor: 'intColor',
            exteriorColor: 'extColor',
            glassOption: 'glassOption',
            glassPackage: 'glassOption',
            gridStyle: 'gridStyle',
            foamEnhanced: 'foamEnhanced',
            removalType: 'rmvInst'
          };
          const targetField = mapToOpeningRowField[opp.field];
          if (targetField) {
            const currentVal = openings[i][targetField];
            if (!currentVal || currentVal === 'none' || String(currentVal) !== String(opp.value)) {
              openings[i] = { ...openings[i], [targetField]: opp.value };
            }
          }
        }
      }
      return { ...prev, openings };
    });
  };

  const handleFixIssue = (issue: any) => {
    if (issue.openingNumber) {
      setEditingOpening(issue.openingNumber - 1);
      setTab('openings');
    } else {
      setTab('customer');
    }
  };

  const addNewOpeningWizard = () => {
    const firstEmpty = formData.openings.findIndex(o => !o.model && !o.qty);
    if (firstEmpty >= 0) {
      setEditingOpening(firstEmpty);
    }
  };

  const handleSaveWizard = async (wizardData: any) => {
    if (editingOpening === null) return;
    
    // Map wizard data to OpeningRow format
    updateOpening(editingOpening, 'qty', wizardData.quantity || 1);
    updateOpening(editingOpening, 'model', wizardData.model || wizardData.seriesModel || wizardData.productCategory || '');
    updateOpening(editingOpening, 'width', String(wizardData.width || ''));
    updateOpening(editingOpening, 'height', String(wizardData.height || ''));
    updateOpening(editingOpening, 'intColor', wizardData.interiorColor || '');
    updateOpening(editingOpening, 'extColor', wizardData.exteriorColor || '');
    updateOpening(editingOpening, 'glassOption', wizardData.glassOption || wizardData.glassPackage || '');
    updateOpening(editingOpening, 'gridStyle', wizardData.gridStyle || '');
    updateOpening(editingOpening, 'foamEnhanced', !!wizardData.foamEnhanced);
    updateOpening(editingOpening, 'rmvInst', wizardData.removalType || wizardData.typeRemoved || '');
    updateOpening(editingOpening, 'windowNumber', String(editingOpening + 1));
    updateOpening(editingOpening, 'floor', String(wizardData.floorNumber || 1));
    updateOpening(editingOpening, 'typeExt', wizardData.exteriorType || '');
    updateOpening(editingOpening, 'typeInt', wizardData.installType || '');

    // Store safety review from wizard
    if (wizardData.safetyReview) {
      setSafetyReviews(prev => ({ ...prev, [editingOpening + 1]: wizardData.safetyReview }));
    } else {
      // Auto-build from opening data
      const autoReview = buildSafetyReview(wizardData, editingOpening + 1);
      if (autoReview.flags.length > 0) {
        setSafetyReviews(prev => ({ ...prev, [editingOpening + 1]: autoReview }));
      }
    }

    // Learn from this opening for Never Ask Twice
    learnFromSavedOpening(wizardData, 'current_rep_id');
    setEditingOpening(null);
  };

  const updateSafetyReview = (openingNum: number, updated: OpeningSafetyReview) => {
    setSafetyReviews(prev => ({ ...prev, [openingNum]: updated }));
  };

  const filledCount = formData.openings.filter(o => o.qty > 0 || o.model).length;

  // Voice-to-field (Web Speech API)
  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice not supported in this browser'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    setIsRecording(true);
    setVoiceText('');
    recognition.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setVoiceText(text);
      // Detect safety glazing keywords in voice
      const voiceMatches = detectSafetyGlazingFromVoice(text);
      if (voiceMatches.length > 0) {
        setVoiceSafetyWarnings(voiceMatches.map(m => `⚠️ "${m.matchedPhrase}" detected — ${m.flagReason}`));
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  if (loading) {
    return (
      <div className="mobile-field">
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>⏳ Loading form...</div>
      </div>
    );
  }

  return (
    <div className="mobile-field" style={{ paddingBottom: '70px', height: '100vh', overflowY: 'auto' }}>
      {/* Header */}
      <div className="mf-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
        <button className="mf-back" onClick={() => navigate(-1)}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>📋 Order Form</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            {formData.customerName || 'New Form'} · {filledCount} openings
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={async () => {
          try {
            await api.post('/forms', { appointmentId, formType: 'order_form', formData: JSON.stringify(formData), status: 'filled' });
            alert('Saved!');
          } catch { alert('Save failed'); }
        }}>💾 Save</button>
      </div>

      {/* Quote Health Widget */}
      {health && <QuoteHealthWidget health={health} onFixIssue={handleFixIssue} />}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflow: 'auto', background: '#fff', position: 'sticky', top: '56px', zIndex: 9 }}>
        {([
          { id: 'customer' as MobileTab, icon: '👤', label: 'Customer' },
          { id: 'openings' as MobileTab, icon: '🪟', label: `Openings (${filledCount})` },
          { id: 'sketch' as MobileTab, icon: '🏠', label: 'Sketch' },
          { id: 'notes' as MobileTab, icon: '📝', label: 'Notes' },
          { id: 'recap' as MobileTab, icon: '✅', label: 'Recap' },
          { id: 'preview' as MobileTab, icon: '🖨️', label: 'Preview' },
        ]).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setEditingOpening(null); }} style={{
            flex: 1, padding: '0.625rem 0.5rem', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.6875rem', whiteSpace: 'nowrap',
            background: tab === t.id ? 'rgba(59,130,246,0.1)' : 'transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div className="mf-content" style={{ padding: '1rem' }}>
        {/* ═══ CUSTOMER TAB ═══ */}
        {tab === 'customer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Voice button */}
            <button onClick={startVoice} style={{
              padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              background: isRecording ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.05)',
              cursor: 'pointer', textAlign: 'center', color: 'var(--text-primary)',
              fontSize: '1rem', fontWeight: 600,
            }}>
              {isRecording ? '🔴 Listening...' : '🎤 Voice-to-Field'}
            </button>
            {voiceText && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(139,92,246,0.08)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Heard: "{voiceText}"
              </div>
            )}
            {voiceSafetyWarnings.length > 0 && (
              <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  🛡️ Safety Glazing Keywords Detected
                </div>
                {voiceSafetyWarnings.map((w, i) => (
                  <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{w}</div>
                ))}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem', fontStyle: 'italic' }}>
                  Review tempered glass when editing the affected opening.
                </div>
              </div>
            )}

            {[
              { label: 'PO #', field: 'poNumber' as keyof OrderFormData },
              { label: 'Account #', field: 'accountNumber' as keyof OrderFormData },
              { label: 'Order Date', field: 'orderDate' as keyof OrderFormData },
              { label: 'Customer Name', field: 'customerName' as keyof OrderFormData },
              { label: 'Phone', field: 'phone' as keyof OrderFormData },
              { label: 'Phone 2', field: 'phone2' as keyof OrderFormData },
              { label: 'Address', field: 'address' as keyof OrderFormData },
              { label: 'City', field: 'city' as keyof OrderFormData },
              { label: 'State', field: 'state' as keyof OrderFormData },
              { label: 'Zip', field: 'zip' as keyof OrderFormData },
              { label: 'Estimator', field: 'estimator' as keyof OrderFormData },
            ].map(f => (
              <div key={f.field} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{f.label}</label>
                <input className="form-input" value={(formData[f.field] as string) || ''}
                  onChange={e => updateField(f.field, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {/* ═══ OPENINGS TAB ═══ */}
        {tab === 'openings' && (
          <div>
            {editingOpening !== null ? (
              // Use the new Wizard for editing/adding
              <OpeningWizard
                initialData={{
                  ...formData.openings[editingOpening],
                  // Pre-fill with Never Ask Twice defaults if it's a completely new opening
                  ...(!formData.openings[editingOpening].model && !formData.openings[editingOpening].qty 
                        ? getSuggestedDefaults(formData.openings.filter(o => o.qty > 0 || o.model), 'current_rep_id')
                        : {})
                }}
                appointmentId={appointmentId || ''}
                allOpenings={formData.openings.filter(o => o.qty > 0 || o.model)}
                onSave={handleSaveWizard}
                onCancel={() => setEditingOpening(null)}
              />
            ) : (
              // List View
              <>
                {/* Quick add */}
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', padding: '1rem', fontSize: '1rem' }}
                  onClick={addNewOpeningWizard}>
                  + Add Opening
                </button>

                {/* Bulk Apply Opportunities (Never Ask Twice) */}
                {bulkOpportunities.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Never Ask Twice Suggestions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {bulkOpportunities.map(opp => (
                        <div key={opp.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-secondary)', borderLeft: '3px solid var(--accent)' }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{opp.icon} {opp.value}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opp.description}</div>
                          </div>
                          <button className="btn btn-sm" onClick={() => handleBulkApply(opp)} style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                            Apply All
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opening cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {formData.openings.map((o, i) => {
                    if (!o.model && !o.qty) return null;
                    const opNum = i + 1;
                    const review = safetyReviews[opNum] || buildSafetyReview(o, opNum);
                    return (
                      <div key={i} className="card" style={{ padding: '0.75rem', border: `1px solid ${review.flags.length > 0 && review.safetyReviewStatus === 'not_started' ? 'var(--danger)' : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} onClick={() => setEditingOpening(i)}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ background: 'var(--accent)', color: '#fff', fontWeight: 800, padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>#{i + 1}</span>
                              <span style={{ fontWeight: 600 }}>{o.model || 'Untitled'}</span>
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {o.width && o.height ? `${o.width}" × ${o.height}"` : 'Missing dimensions'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', display: 'flex', gap: '0.5rem' }}>
                              {o.intColor && <span>Int: {o.intColor}</span>}
                              {o.extColor && <span>Ext: {o.extColor}</span>}
                              {o.gridStyle && <span>Grid: {o.gridStyle}</span>}
                            </div>
                          </div>
                          <button className="btn btn-sm" style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid var(--border)' }}>Edit</button>
                        </div>
                        {/* Safety Glazing Badge */}
                        <SafetyGlazingBadge
                          review={review}
                          onQuickMark={(decision: TemperedDecision) => {
                            const updated = { ...review, temperedRequired: decision, safetyReviewStatus: decision === 'yes' ? 'reviewed' as const : decision === 'unsure' ? 'unsure' as const : 'override' as const, reviewedAt: new Date() };
                            updateSafetyReview(opNum, updated);
                          }}
                        />
                        {/* Measurement Mode Quick Buttons */}
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setOrielMode(i)}
                            style={{ padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 700, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, color: 'var(--primary)', cursor: 'pointer' }}
                          >
                            🪟 Oriel Mode
                          </button>
                          {['circle_top', 'eyebrow', 'arch', 'quarter_arch'].map(wt => (
                            <button
                              key={wt}
                              onClick={() => setSpecialtyMode({ index: i, windowType: wt })}
                              style={{ padding: '0.25rem 0.625rem', fontSize: '0.6875rem', fontWeight: 600, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer' }}
                            >
                              {wt === 'circle_top' ? '⌒' : wt === 'eyebrow' ? '⌢' : wt === 'arch' ? '⌣' : '◜'} {wt.replace('_', ' ')}
                            </button>
                          ))}
                          {measurementAdjustments[opNum] && (
                            <span style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', background: measurementAdjustments[opNum].approved ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderRadius: 6, color: measurementAdjustments[opNum].approved ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                              {measurementAdjustments[opNum].approved ? '✅ Approved' : '⏳ Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ ORIEL MODE OVERLAY ═══ */}
        {orielMode !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, overflowY: 'auto', padding: '1rem' }}>
            <OrielMeasurementMode
              openingNumber={orielMode + 1}
              exteriorType={formData.openings[orielMode]?.typeExt}
              installType={formData.openings[orielMode]?.typeInt}
              onApprove={(result: OrielMeasurementResult) => {
                const opNum = orielMode + 1;
                setMeasurementAdjustments(prev => ({ ...prev, [opNum]: result.adjustment }));
                // Write approved measurements to order form
                setFormData(prev => {
                  const openings = [...prev.openings];
                  openings[orielMode] = {
                    ...openings[orielMode],
                    width: String(result.adjustment.adjustedWidth),
                    height: String(result.adjustment.adjustedHeight),
                    topSashConfirmed: true,
                  } as any;
                  return { ...prev, openings };
                });
                setOrielMode(null);
              }}
              onCancel={() => setOrielMode(null)}
            />
          </div>
        )}

        {/* ═══ SPECIALTY MODE OVERLAY ═══ */}
        {specialtyMode !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, overflowY: 'auto', padding: '1rem' }}>
            <SpecialtyMeasurementMode
              windowType={specialtyMode.windowType}
              openingNumber={specialtyMode.index + 1}
              exteriorType={formData.openings[specialtyMode.index]?.typeExt}
              installType={formData.openings[specialtyMode.index]?.typeInt}
              onApprove={(result: SpecialtyMeasurementResult) => {
                const opNum = specialtyMode.index + 1;
                setMeasurementAdjustments(prev => ({ ...prev, [opNum]: result.adjustment }));
                setFormData(prev => {
                  const openings = [...prev.openings];
                  openings[specialtyMode.index] = {
                    ...openings[specialtyMode.index],
                    width: String(result.adjustment.adjustedWidth || result.dimensions.width || ''),
                    height: String(result.adjustment.adjustedHeight || result.dimensions.height || ''),
                    legHeight: result.dimensions.legHeight ? String(result.dimensions.legHeight) : openings[specialtyMode.index]?.legHeight,
                    customRadius: result.computedDimensions?.radius ? String(result.computedDimensions.radius) : openings[specialtyMode.index]?.customRadius,
                  } as any;
                  return { ...prev, openings };
                });
                setSpecialtyMode(null);
              }}
              onCancel={() => setSpecialtyMode(null)}
            />
          </div>
        )}

        {/* ═══ SKETCH TAB ═══ */}
        {tab === 'sketch' && (
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Draw the house layout. Mark window positions.
            </p>
            <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border)' }}>
              <canvas
                width={600}
                height={360}
                style={{ width: '100%', display: 'block', touchAction: 'none' }}
              />
            </div>
          </div>
        )}

        {/* ═══ NOTES TAB ═══ */}
        {tab === 'notes' && (
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" style={{ minHeight: 200 }}
              value={formData.notes}
              onChange={e => updateField('notes', e.target.value)}
            />
          </div>
        )}

        {/* ═══ RECAP TAB ═══ */}
        {tab === 'recap' && (
          <div style={{ margin: '-1rem' }}>
            {/* Tempered Glass Final Review */}
            <div style={{ padding: '1rem' }}>
              <FinalTemperedReview
                reviews={Object.values(safetyReviews)}
                onResolve={(updated) => {
                  const newMap: Record<number, OpeningSafetyReview> = {};
                  updated.forEach(r => { newMap[r.openingNumber] = r; });
                  setSafetyReviews(newMap);
                }}
              />
            </div>
            {/* Measurement Accuracy Review */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
              <FinalMeasurementReview
                openings={formData.openings.filter(o => o.model || o.qty).map((o, i) => ({ ...o, openingNumber: i + 1 }))}
                adjustments={measurementAdjustments}
              />
            </div>
            <AppointmentRecap
              appointment={{ ...formData, id: appointmentId }}
              openings={formData.openings}
              health={health || { score: 0, status: 'Critical', issues: [], missingBlockers: 0, openingsCount: 0 }}
              onSignoff={() => {
                const safetyResult = checkExportReadiness(Object.values(safetyReviews));
                if (safetyResult.blocked) {
                  alert('Cannot sign off — safety glazing issues:\n\n' + safetyResult.blockers.join('\n'));
                  return;
                }
                const measureResult = checkMeasurementExportReadiness(
                  formData.openings.filter(o => o.model || o.qty).map((o, i) => ({ ...o, openingNumber: i + 1 })),
                  measurementAdjustments,
                );
                if (measureResult.blocked) {
                  alert('Cannot sign off — measurement issues:\n\n' + measureResult.blockers.join('\n'));
                  return;
                }
                alert('Order Locked & Customer Signed!');
              }}
            />
          </div>
        )}

        {/* ═══ PREVIEW TAB ═══ */}
        {tab === 'preview' && (
          <div className="paper-form-wrapper" style={{ padding: 0 }}>
            <PaperOrderForm
              ref={formRef}
              initialData={formData}
              editable={false}
            />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="mf-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', background: '#fff', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { id: 'customer' as MobileTab, icon: '👤', label: 'Customer' },
          { id: 'openings' as MobileTab, icon: '🪟', label: 'Openings' },
          { id: 'sketch' as MobileTab, icon: '🏠', label: 'Sketch' },
          { id: 'recap' as MobileTab, icon: '✅', label: 'Recap' },
          { id: 'preview' as MobileTab, icon: '🖨️', label: 'Preview' },
        ]).map(t => (
          <button key={t.id} className={`mf-nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem', background: 'none', border: 'none', color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)' }}>
            <span style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{t.icon}</span>
            <span style={{ fontSize: '0.625rem', fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
