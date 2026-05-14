import { useState, useEffect } from 'react';
import { applyAutoRules, generateOpeningName, generateSmartInstallNotes, RuleContext, RuleResult } from '../utils/businessRules';
import { createOpeningWithDefaults, applyConditionalDefaults, trackOverride, DefaultTracker } from '../utils/openingDefaults';
import { calculateOpeningConfidence } from '../utils/quoteHealth';
import { WizardSafetyAnswers, evaluateWizardAnswers, buildSafetyReview } from '../utils/safetyGlazingRules';
import { WizardSafetyQuestionsStep } from './WizardSafetyQuestionsStep';
import { SafetyGlazingPanel } from './SafetyGlazingPanel';
import { QuickWxH } from './QuickMeasure';

const STEPS = [
  { id: 'location', label: 'Location' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'product', label: 'Product & Model' },
  { id: 'colors', label: 'Colors' },
  { id: 'options', label: 'Grids & Glass' },
  { id: 'install', label: 'Installation' },
  { id: 'safety', label: '🛡️ Safety Glass' },
  { id: 'review', label: 'Review' },
];

export function OpeningWizard({
  initialData,
  appointmentId,
  allOpenings,
  onSave,
  onCancel,
}: {
  initialData: any;
  appointmentId: string;
  allOpenings: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState({ ...initialData });
  const [ruleResults, setRuleResults] = useState<RuleResult[]>([]);
  const [tracker, setTracker] = useState<DefaultTracker>({ defaultedFields: {}, overriddenFields: {} });
  const [wizardSafetyAnswers, setWizardSafetyAnswers] = useState<WizardSafetyAnswers>({});
  const safetyReview = buildSafetyReview(data, data.openingNumber || 1, [], wizardSafetyAnswers);

  useEffect(() => {
    // If it's a totally new opening, apply Window World defaults
    if (!initialData.model && !initialData.qty && !initialData.width) {
       const { opening, tracker: newTracker } = createOpeningWithDefaults(
         appointmentId,
         (allOpenings.length) + 1,
         allOpenings,
         initialData // These are the neverAskTwice suggestions passed from parent
       );
       setData(opening);
       setTracker(newTracker);
    }
  }, []);

  const update = (fields: Partial<typeof data>) => {
    let newData = { ...data, ...fields };
    let newTracker = { ...tracker };
    
    // Track overrides
    for (const key of Object.keys(fields)) {
      newTracker = trackOverride(newTracker, key, (fields as Record<string, unknown>)[key]);
    }
    
    // Apply conditional defaults
    const changedField = Object.keys(fields)[0];
    if (changedField) {
      const condResult = applyConditionalDefaults(newData, newTracker, changedField);
      newData = condResult.opening;
      newTracker = condResult.tracker;
      
      if (condResult.appliedRules.length > 0) {
        setRuleResults(prev => [
          ...prev,
          ...condResult.appliedRules.map(r => ({
            ruleId: r.id,
            ruleName: r.name,
            severity: 'high' as const,
            autoApplied: true,
            requiresConfirmation: false,
            actions: [{ type: 'set_field' as const, field: r.setField, message: r.description, applied: true, confirmed: true }]
          }))
        ]);
      }
    }

    // Evaluate business rules
    const context: RuleContext = { allOpenings, appointment: { id: appointmentId } };
    const { updated, results } = applyAutoRules(newData, context);
    
    setData(updated);
    setTracker(newTracker);
    if (results.length > 0) setRuleResults(prev => [...prev, ...results]);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Merge safety review data into opening before saving
      const wizardResult = evaluateWizardAnswers(wizardSafetyAnswers);
      const finalData = {
        ...data,
        // Populate order form tempered fields from safety review
        temperedFull: safetyReview.temperedFull || (wizardResult.recommendation === 'yes' && !safetyReview.temperedHalf),
        temperedHalf: safetyReview.temperedHalf,
        tempFull: safetyReview.temperedFull,
        tempS: safetyReview.temperedHalf,
        safetyReview: safetyReview,
        safetyGlazingFlags: safetyReview.flags,
        wizardSafetyAnswers,
      };
      onSave(finalData);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = STEPS[currentStep];

  return (
    <div className="card" style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>🪄 Opening Wizard — {generateOpeningName(data)}</h3>
        <button onClick={onCancel} style={{
          padding: '0.375rem 0.875rem', borderRadius: 6, cursor: 'pointer',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
          color: '#ef4444', fontWeight: 600, fontSize: '0.8125rem',
        }}>Cancel</button>
      </div>

      {/* Step progress bar */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: i === currentStep
              ? '#3b82f6'
              : i < currentStep
                ? '#22c55e'
                : 'rgba(255,255,255,0.12)',
            transition: 'background 0.2s',
          }} title={s.label} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{step.label}</h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Step {currentStep + 1} of {STEPS.length}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {step.id === 'location' && (
          <div className="form-group">
            <label className="form-label">Room Location</label>
            <input className="form-input" value={data.roomLocation || ''} onChange={e => update({ roomLocation: e.target.value })} placeholder="e.g. Living Room" autoFocus />
            
            <label className="form-label" style={{ marginTop: '1rem' }}>Elevation</label>
            <select className="form-input" value={data.elevation || ''} onChange={e => update({ elevation: e.target.value })}>
              <option value="">Select Elevation...</option>
              <option value="front">Front</option>
              <option value="rear">Rear</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="garage">Garage</option>
              <option value="other">Other</option>
            </select>

            <label className="form-label" style={{ marginTop: '1rem' }}>Floor Number</label>
            <input className="form-input" type="number" value={data.floorNumber || 1} onChange={e => update({ floorNumber: parseInt(e.target.value) || 1 })} min="1" max="10" />
          </div>
        )}

        {step.id === 'measurements' && (
          <div className="form-group">
            <QuickWxH 
              width={data.width || 0}
              height={data.height || 0}
              onWidthChange={(w) => update({ width: w })}
              onHeightChange={(h) => update({ height: h })}
              productCategory={data.productCategory || 'double_hung'}
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Width (in)</label>
                <input className="form-input" type="number" step="0.125" value={data.width || ''} onChange={e => update({ width: parseFloat(e.target.value) || 0 })} autoFocus />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Height (in)</label>
                <input className="form-input" type="number" step="0.125" value={data.height || ''} onChange={e => update({ height: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <label className="form-label">Leg Height (Specialty)</label>
              <input className="form-input" type="number" step="0.125" value={data.legHeight || ''} onChange={e => update({ legHeight: parseFloat(e.target.value) || null })} />
            </div>
          </div>
        )}

        {step.id === 'product' && (
          <div className="form-group">
            <label className="form-label">Product Category</label>
            <select className="form-input" value={data.productCategory || 'double_hung'} onChange={e => update({ productCategory: e.target.value })} autoFocus>
              <option value="double_hung">Double Hung</option>
              <option value="picture">Picture Window</option>
              <option value="slider">Slider</option>
              <option value="casement">Casement</option>
              <option value="awning">Awning</option>
              <option value="patio_door">Patio Door</option>
              <option value="custom_shape">Specialty Shape</option>
            </select>

            <label className="form-label" style={{ marginTop: '1rem' }}>Model / Series</label>
            <input className="form-input" value={data.model || '4000 Series'} onChange={e => update({ model: e.target.value })} />
          </div>
        )}

        {step.id === 'colors' && (
          <div className="form-group">
            <label className="form-label">Interior Color</label>
            <select className="form-input" value={data.interiorColor || 'White'} onChange={e => update({ interiorColor: e.target.value })} autoFocus>
              <option value="White">White</option>
              <option value="Almond">Almond</option>
              <option value="Clay">Clay</option>
              <option value="Woodgrain">Woodgrain</option>
            </select>

            <label className="form-label" style={{ marginTop: '1rem' }}>Exterior Color</label>
            <select className="form-input" value={data.exteriorColor || 'White'} onChange={e => update({ exteriorColor: e.target.value })}>
              <option value="White">White</option>
              <option value="Almond">Almond</option>
              <option value="Clay">Clay</option>
              <option value="Bronze">Bronze</option>
              <option value="Black">Black</option>
            </select>
          </div>
        )}

        {step.id === 'options' && (
          <div className="form-group">
            <label className="form-label">Grid Style</label>
            <select className="form-input" value={data.gridStyle || 'None'} onChange={e => update({ gridStyle: e.target.value })} autoFocus>
              <option value="None">None</option>
              <option value="Colonial">Colonial</option>
              <option value="Prairie">Prairie</option>
              <option value="Diamond">Diamond</option>
            </select>

            <label className="form-label" style={{ marginTop: '1rem' }}>Glass Option</label>
            <select className="form-input" value={data.glassOption || 'SolarZone'} onChange={e => update({ glassOption: e.target.value })}>
              <option value="Clear">Clear</option>
              <option value="SolarZone">SolarZone (Low-E/Argon)</option>
              <option value="SolarZone Elite">SolarZone Elite</option>
            </select>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={data.temperedGlass === 'full'} onChange={e => update({ temperedGlass: e.target.checked ? 'full' : 'none' })} />
                Tempered Glass
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={data.obscureGlass === 'standard'} onChange={e => update({ obscureGlass: e.target.checked ? 'standard' : 'none' })} />
                Obscure Glass
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={data.fullScreen || false} onChange={e => update({ fullScreen: e.target.checked })} />
                Full Screen
              </label>
            </div>
          </div>
        )}

        {step.id === 'install' && (
          <div className="form-group">
            <label className="form-label">Exterior/Install Type</label>
            <select className="form-input" value={data.exteriorType || ''} onChange={e => update({ exteriorType: e.target.value })} autoFocus>
              <option value="">Select Exterior...</option>
              <option value="Brick">Brick</option>
              <option value="Siding">Siding (requires trim/header)</option>
              <option value="Wood">Wood</option>
              <option value="Stucco">Stucco</option>
            </select>

            <label className="form-label" style={{ marginTop: '1rem' }}>Install Notes</label>
            <textarea className="form-input" value={data.installNotes || ''} onChange={e => update({ installNotes: e.target.value })} rows={3} placeholder="Ladder access, sill repair, etc..." />
            
            {/* Smart Install Notes Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {generateSmartInstallNotes(data).map((sn, i) => (
                <button key={i} className="badge" style={{ cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--accent)' }}
                  onClick={() => update({ installNotes: ((data.installNotes || '') + ' ' + sn.note).trim() })}>
                  + {sn.note}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.id === 'safety' && (
          <WizardSafetyQuestionsStep
            answers={wizardSafetyAnswers}
            onChange={setWizardSafetyAnswers}
          />
        )}

        {step.id === 'review' && (
          <div>
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ marginBottom: '0.5rem' }}>{generateOpeningName(data)}</h4>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  <strong>Size:</strong> {data.width} × {data.height}
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  <strong>Type:</strong> {data.productCategory} ({data.model})
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  <strong>Colors:</strong> Int: {data.interiorColor} | Ext: {data.exteriorColor}
                </p>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                  <strong>Options:</strong> Grids: {data.gridStyle} | Glass: {data.glassOption}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: calculateOpeningConfidence(data) >= 80 ? 'var(--success)' : calculateOpeningConfidence(data) >= 50 ? 'var(--warning)' : 'var(--danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.25rem', margin: '0 auto' }}>
                  {calculateOpeningConfidence(data)}
                </div>
                <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</div>
              </div>
            </div>

            {ruleResults.map((res, i) => (
              <div key={i} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem', borderColor: res.severity === 'blocker' ? 'var(--danger)' : res.severity === 'high' ? 'var(--warning)' : 'var(--primary)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{res.ruleName}</div>
                {res.actions.map((act, j) => (
                  <div key={j} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    • {act.message} {act.applied ? '(Applied)' : ''}
                  </div>
                ))}
              </div>
            ))}

            {/* Safety Glazing Review inline */}
            <SafetyGlazingPanel
              review={safetyReview}
              openingNumber={data.openingNumber || 1}
              onChange={(updated) => {
                update({
                  temperedFull: updated.temperedFull,
                  temperedHalf: updated.temperedHalf,
                  tempFull: updated.temperedFull,
                  tempS: updated.temperedHalf,
                });
              }}
            />
          </div>
        )}

      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-secondary" onClick={handlePrev} disabled={currentStep === 0}>← Back</button>
        <button className="btn btn-primary" onClick={handleNext}>
          {currentStep === STEPS.length - 1 ? 'Save Opening' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
