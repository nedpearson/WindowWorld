export function ValidationWarnings({ appointment }: { appointment: any }) {
  const w: string[] = [];
  const c = appointment.customer;
  const o = appointment.openings || [];

  if (!c.phone && !c.email) w.push('Missing customer contact info (phone or email)');
  if (!appointment.jobAddress) w.push('Missing job address');
  if (o.length === 0) w.push('No openings entered');

  o.forEach((op: any) => {
    if (!op.width || !op.height) w.push(`Opening #${op.openingNumber}: Missing dimensions`);
    if (!op.productCategory) w.push(`Opening #${op.openingNumber}: Missing product type`);
    if (!op.interiorColor || !op.exteriorColor) w.push(`Opening #${op.openingNumber}: Missing color selection`);
    if (op.needsVerification) w.push(`Opening #${op.openingNumber}: Price needs verification`);
    if (['eyebrow','circle_top','quarter_arch','custom_shape'].includes(op.productCategory) && !op.radius) {
      w.push(`Opening #${op.openingNumber}: Specialty shape missing radius`);
    }
  });

  if (c.preLead1978) w.push('Pre-1978 home — Lead paint acknowledgement required');
  if (appointment.totalAmount > 0 && appointment.depositAmount <= 0) w.push('No deposit recorded');

  if (w.length === 0) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <ul className="warning-list">
        {w.slice(0, 8).map((msg, i) => (
          <li key={i} className="warning-item">⚠ {msg}</li>
        ))}
        {w.length > 8 && <li className="warning-item">...and {w.length - 8} more warnings</li>}
      </ul>
    </div>
  );
}
