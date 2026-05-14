import { useState } from 'react';
import { FINANCE_PLANS, calculateMonthlyPayment, type FinancePlan } from '../config/referenceDocuments';

interface Props {
  jobAmount: number;
  selectedPlanId?: string;
  onSelectPlan?: (planId: string | null) => void;
  onAcknowledge?: (key: string, value: boolean) => void;
  acknowledgments?: Record<string, boolean>;
}

export function FinanceOptionsPanel({
  jobAmount, selectedPlanId, onSelectPlan, onAcknowledge, acknowledgments = {},
}: Props) {
  const [expanded, setExpanded] = useState(!!selectedPlanId);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const openFinanceDoc = () => {
    window.open('/api/documents/view/finance_options', '_blank');
  };

  return (
    <div className="card" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          💳 Financing Options
          {selectedPlanId && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>
              Plan Selected
            </span>
          )}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Job Total: <strong>{fmt(jobAmount)}</strong> — Select a financing option to present to the customer.
          </p>

          {/* Finance plan cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {FINANCE_PLANS.filter(p => p.active).map(plan => {
              const monthly = calculateMonthlyPayment(plan, jobAmount);
              const isSelected = selectedPlanId === plan.id;
              const eligible = monthly !== null;

              return (
                <div key={plan.id}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 8,
                    border: isSelected ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(59,130,246,0.08)' : eligible ? 'var(--bg-input)' : 'rgba(0,0,0,0.03)',
                    cursor: eligible ? 'pointer' : 'not-allowed',
                    opacity: eligible ? 1 : 0.5,
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => {
                    if (!eligible) return;
                    onSelectPlan?.(isSelected ? null : plan.id);
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                        {isSelected && '✅ '}{plan.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                        {plan.disclosureText}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {eligible ? (
                        <>
                          <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#3b82f6' }}>
                            {fmt(monthly!)}/mo
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {plan.termMonths} months
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                          Min: {fmt(plan.minimumAmount || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* No financing option */}
            <div style={{
              padding: '0.5rem 1rem', borderRadius: 8,
              border: !selectedPlanId ? '2px solid var(--text-muted)' : '1px solid var(--border-subtle)',
              background: !selectedPlanId ? 'rgba(0,0,0,0.04)' : 'transparent',
              cursor: 'pointer', fontSize: '0.8125rem',
            }} onClick={() => onSelectPlan?.(null)}>
              {!selectedPlanId && '✅ '}No Financing — Cash/Check/Card
            </div>
          </div>

          {/* Document link */}
          <button className="btn btn-sm btn-secondary" onClick={openFinanceDoc} style={{ marginBottom: '1rem' }}>
            📊 View Full Finance Options Worksheet
          </button>

          {/* Acknowledgments */}
          {selectedPlanId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={acknowledgments['financing_discussed'] || false}
                  onChange={e => onAcknowledge?.('financing_discussed', e.target.checked)}
                />
                Financing options discussed with customer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={acknowledgments['finance_in_packet'] || false}
                  onChange={e => onAcknowledge?.('finance_in_packet', e.target.checked)}
                />
                Finance summary included in customer packet
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
