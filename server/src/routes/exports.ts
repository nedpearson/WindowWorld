import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { generateWorkbookBuffer, type AppointmentExportData, type OpeningData } from '../workbookEngine.js';

export const exportRoutes = Router();
exportRoutes.use(requireAuth);

// Export appointment as JSON
exportRoutes.get('/json/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: {
        customer: true, openings: true, lineItems: true,
        houseMap: { include: { markers: true } }, payments: true, signatures: true
      }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export openings as CSV
exportRoutes.get('/csv/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: { customer: true, openings: { orderBy: { openingNumber: 'asc' } } }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const headers = ['Opening#', 'Room', 'Elevation', 'Width', 'Height', 'UI', 'Product', 'Series', 'IntColor', 'ExtColor', 'Grid', 'Glass', 'BasePrice', 'Total'];
    const rows = appt.openings.map(o => [
      o.openingNumber, o.roomLocation || '', o.elevation || '', o.width || '', o.height || '',
      o.unitedInches || '', o.productCategory || '', o.seriesModel || '', o.interiorColor || '',
      o.exteriorColor || '', o.gridStyle || '', o.glassPackage || '', o.basePrice, o.totalPrice
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${appt.customer.lastName}_openings.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'CSV export failed' });
  }
});

// ═══════════════════════════════════════════════════
// Export filled Excel workbook (Contract + Order Form)
// ═══════════════════════════════════════════════════
exportRoutes.get('/excel/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: {
        customer: true,
        openings: { orderBy: { openingNumber: 'asc' } },
        user: true,
      }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // Map DB openings → workbook opening format
    const openings: OpeningData[] = appt.openings.map(o => ({
      qty: 1,
      model: mapProductCategoryToModel(o.productCategory, o.seriesModel),
      vinylColor: (o.interiorColor === 'White' || !o.interiorColor) ? 'WH' : 'BG',
      intColor: o.interiorColor || undefined,
      extColor: o.exteriorColor || undefined,
      width: o.width ?? undefined,
      height: o.height ?? undefined,
      windowNumber: o.openingNumber ?? undefined,
      glassOption: mapGlassPackage(o.glassPackage),
      foamEnhanced: o.foamEnhanced ? 'Y' : undefined,
      gridStyle: o.gridStyle || undefined,
      gridPattern: o.gridPattern || undefined,
      obscureFull: o.obscureGlass === 'full' ? 'FULL' : o.obscureGlass === 'bottom' ? 'BSO' : undefined,
      temperedFull: o.temperedGlass === 'full' ? 'FULL' : o.temperedGlass === 'bottom' ? 'BSO' : undefined,
      fullScreen: o.screenOption === 'Full' ? 'Y' : undefined,
      typeRemoved: 'ALUM', // Default per business rules
      typeInstall: undefined, // Set by exterior type
      sillRepair: undefined,
    }));

    const exportData: AppointmentExportData = {
      customer: {
        firstName: appt.customer.firstName,
        lastName: appt.customer.lastName,
        email: appt.customer.email || undefined,
        address: appt.jobAddress || appt.customer.address,
        city: appt.jobCity || appt.customer.city,
        state: appt.jobState || appt.customer.state || 'LA',
        zip: appt.jobZip || appt.customer.zip,
        phone: appt.customer.phone,
        phoneSecondary: undefined,
      },
      openings,
      estimatorName: appt.user?.name || undefined,
      completeJob: 'Y',
      orderDate: appt.appointmentDate || new Date(),
      notes: appt.notes || undefined,
    };

    const buffer = await generateWorkbookBuffer(exportData);

    const fileName = `${appt.customer.lastName}_${appt.customer.firstName}_Contract.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Excel export failed', details: err?.message });
  }
});

// ── Helper: map app product category to Window World model number ──
function mapProductCategoryToModel(category: string | null, series: string | null): string {
  if (!category) return '';
  const s = series || '4000';
  const map: Record<string, string> = {
    'double_hung': s.includes('6000') ? '0601' : '3001',
    'picture': '3004',
    'slider': '3002',
    'casement': '0951',
    'awning': '0951',
    'patio_door': '6105',
    'circle_top': 'S105',
    'eyebrow': 'S110',
  };
  return map[category] || '';
}

// ── Helper: map glass package name to workbook code ──
function mapGlassPackage(pkg: string | null | undefined): string | undefined {
  if (!pkg) return undefined;
  if (pkg.toLowerCase().includes('elite')) return 'LEE';
  if (pkg.toLowerCase().includes('solar')) return 'LEE';
  if (pkg.toLowerCase().includes('low-e')) return 'LE';
  return undefined;
}

