import { Router } from 'express';
import { prisma } from '../index.js';

export const validationRoutes = Router();

// GET /api/validation/:appointmentId — Run full validation
validationRoutes.get('/:appointmentId', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: {
        customer: true,
        openings: { orderBy: { openingNumber: 'asc' } },
        lineItems: true,
        signatures: true,
        houseMap: { include: { markers: true } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Server-side validation mirrors the client engine
    const issues: any[] = [];
    const customer = appointment.customer;
    const openings = appointment.openings || [];

    // Customer checks
    if (!customer.firstName) issues.push({ field: 'firstName', severity: 'BLOCKER', message: 'Missing customer first name' });
    if (!customer.lastName) issues.push({ field: 'lastName', severity: 'BLOCKER', message: 'Missing customer last name' });
    if (!customer.phone) issues.push({ field: 'phone', severity: 'BLOCKER', message: 'Missing customer phone' });
    if (!customer.address) issues.push({ field: 'address', severity: 'BLOCKER', message: 'Missing customer address' });
    if (!customer.city) issues.push({ field: 'city', severity: 'HIGH', message: 'Missing city' });
    if (!customer.state) issues.push({ field: 'state', severity: 'HIGH', message: 'Missing state' });
    if (!customer.zip) issues.push({ field: 'zip', severity: 'HIGH', message: 'Missing ZIP' });

    // Job checks
    if (!appointment.appointmentDate) issues.push({ field: 'appointmentDate', severity: 'BLOCKER', message: 'Missing order date' });

    // Opening checks
    if (openings.length === 0) {
      issues.push({ field: 'openings', severity: 'BLOCKER', message: 'No openings entered' });
    }

    for (const op of openings) {
      const prefix = `Opening #${op.openingNumber}`;
      if (!op.width || op.width <= 0) issues.push({ field: `opening.${op.openingNumber}.width`, severity: 'BLOCKER', message: `${prefix}: Missing width` });
      if (!op.height || op.height <= 0) issues.push({ field: `opening.${op.openingNumber}.height`, severity: 'BLOCKER', message: `${prefix}: Missing height` });
      if (!op.productCategory) issues.push({ field: `opening.${op.openingNumber}.productCategory`, severity: 'BLOCKER', message: `${prefix}: Missing product type` });
      if (!op.seriesModel) issues.push({ field: `opening.${op.openingNumber}.seriesModel`, severity: 'BLOCKER', message: `${prefix}: Missing model` });
      if (!op.interiorColor) issues.push({ field: `opening.${op.openingNumber}.interiorColor`, severity: 'BLOCKER', message: `${prefix}: Missing interior color` });
      if (!op.exteriorColor) issues.push({ field: `opening.${op.openingNumber}.exteriorColor`, severity: 'BLOCKER', message: `${prefix}: Missing exterior color` });
      if (!op.roomLocation) issues.push({ field: `opening.${op.openingNumber}.roomLocation`, severity: 'HIGH', message: `${prefix}: Missing room/location` });
      if (!op.elevation) issues.push({ field: `opening.${op.openingNumber}.elevation`, severity: 'HIGH', message: `${prefix}: Missing elevation` });
      if (!op.glassPackage) issues.push({ field: `opening.${op.openingNumber}.glassPackage`, severity: 'HIGH', message: `${prefix}: Missing glass package` });
      if (!op.gridStyle) issues.push({ field: `opening.${op.openingNumber}.gridStyle`, severity: 'HIGH', message: `${prefix}: Missing grid selection` });
      if (!op.screenOption) issues.push({ field: `opening.${op.openingNumber}.screenOption`, severity: 'HIGH', message: `${prefix}: Missing screen option` });
      if (!op.removalType) issues.push({ field: `opening.${op.openingNumber}.removalType`, severity: 'HIGH', message: `${prefix}: Missing removal/install type` });
      if (!op.totalPrice || op.totalPrice <= 0) issues.push({ field: `opening.${op.openingNumber}.totalPrice`, severity: 'BLOCKER', message: `${prefix}: No price set` });

      // Specialty checks
      const specialtyShapes = ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'];
      if (specialtyShapes.includes(op.productCategory || '') && !op.radius) {
        issues.push({ field: `opening.${op.openingNumber}.radius`, severity: 'HIGH', message: `${prefix}: Specialty shape missing radius` });
      }
    }

    // Sketch checks
    if (!appointment.houseMap?.sketchData) {
      issues.push({ field: 'sketch', severity: 'HIGH', message: 'No home sketch drawn' });
    }

    // Deposit check
    if (appointment.totalAmount > 0 && appointment.depositAmount <= 0) {
      issues.push({ field: 'deposit', severity: 'BLOCKER', message: 'No deposit recorded' });
    }

    // Lead paint check
    if (customer.preLead1978) {
      issues.push({ field: 'leadPaint', severity: 'BLOCKER', message: 'Pre-1978 home — Lead paint acknowledgement required' });
    }

    // Reconciliation check
    const computedTotal = openings.reduce((s, o) => s + (o.totalPrice || 0), 0);
    if (appointment.subtotal > 0 && Math.abs(computedTotal - appointment.subtotal) > 0.01) {
      issues.push({ field: 'reconcile', severity: 'BLOCKER', message: `Opening totals ($${computedTotal.toFixed(2)}) do not match subtotal ($${appointment.subtotal.toFixed(2)})` });
    }

    const blockers = issues.filter(i => i.severity === 'BLOCKER').length;
    const canExport = blockers === 0;

    // Calculate per-opening completeness
    const openingCompleteness = openings.map(op => {
      const requiredFields = ['width', 'height', 'productCategory', 'seriesModel', 'interiorColor', 'exteriorColor',
        'roomLocation', 'elevation', 'glassPackage', 'gridStyle', 'screenOption', 'removalType'];
      const filled = requiredFields.filter(f => {
        const val = (op as any)[f];
        return val !== null && val !== undefined && val !== '' && val !== 0;
      }).length;
      return {
        openingNumber: op.openingNumber,
        roomLocation: op.roomLocation || 'Unnamed',
        total: requiredFields.length,
        filled,
        pct: Math.round((filled / requiredFields.length) * 100),
        missing: requiredFields.filter(f => {
          const val = (op as any)[f];
          return val === null || val === undefined || val === '' || val === 0;
        }),
      };
    });

    // Overall completeness
    const totalChecks = openingCompleteness.reduce((s, o) => s + o.total, 0) + 10; // 10 for header fields
    const totalFilled = openingCompleteness.reduce((s, o) => s + o.filled, 0) +
      [customer.firstName, customer.lastName, customer.phone, customer.address,
       customer.city, customer.state, customer.zip,
       appointment.appointmentDate, appointment.jobAddress, appointment.userId]
        .filter(v => v !== null && v !== undefined && v !== '').length;
    const overallPct = totalChecks > 0 ? Math.round((totalFilled / totalChecks) * 100) : 0;

    // Update completion on appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { completionPct: overallPct },
    });

    res.json({
      issues,
      blockers,
      high: issues.filter(i => i.severity === 'HIGH').length,
      medium: issues.filter(i => i.severity === 'MEDIUM').length,
      low: issues.filter(i => i.severity === 'LOW').length,
      canExport,
      overallPct,
      openingCompleteness,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
