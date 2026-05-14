import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export function RuleEngineAdminPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from /api/rules
    setRules([
      { id: '1', name: 'Brick → EXT Install', description: 'Brick exterior defaults Install Type to EXT', triggerField: 'exteriorType', triggerValue: 'Brick', actionType: 'set_field', actionField: 'installType', actionValue: 'EXT', isActive: true },
      { id: '2', name: 'Siding → INT Install', description: 'Siding exterior defaults to INT Install and requires trim', triggerField: 'exteriorType', triggerValue: 'Siding', actionType: 'require_confirmation', actionField: 'installType', actionValue: 'INT', isActive: true },
      { id: '3', name: 'Tempered Glass Warning', description: 'Warn if bathroom window lacks tempered glass', triggerField: 'roomLocation', triggerValue: 'Bath', actionType: 'warn', message: 'Bathroom window may require tempered glass', isActive: true },
    ]);
    setLoading(false);
  }, []);

  if (loading) return <div>Loading Rule Engine...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>⚡ Custom Rule Engine</h2>
          <p style={{ color: 'var(--text-muted)' }}>Configure Window World intelligence rules for the field app.</p>
        </div>
        <button className="btn btn-primary">+ New Rule</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Rule Name</th>
              <th style={{ padding: '1rem' }}>Trigger</th>
              <th style={{ padding: '1rem' }}>Action</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Controls</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: rule.isActive ? 'var(--success)' : 'var(--text-muted)' }} />
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{rule.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{rule.description}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge">IF {rule.triggerField} = {rule.triggerValue}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {rule.actionType === 'set_field' && <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}>SET {rule.actionField} = {rule.actionValue}</span>}
                  {rule.actionType === 'warn' && <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>WARN: {rule.message}</span>}
                  {rule.actionType === 'require_confirmation' && <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>CONFIRM: SET {rule.actionField} = {rule.actionValue}</span>}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn btn-sm btn-secondary">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
