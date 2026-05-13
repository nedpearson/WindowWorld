import { Router } from 'express';
import { prisma } from '../index.js';

export const formsRoutes = Router();

// Create form instance
formsRoutes.post('/', async (req, res) => {
  try {
    const form = await prisma.formInstance.create({ data: req.body });
    res.status(201).json(form);
  } catch (err: any) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

// Get form instances for appointment
formsRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const forms = await prisma.formInstance.findMany({
      where: { appointmentId: req.params.appointmentId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(forms);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Get form instance
formsRoutes.get('/:id', async (req, res) => {
  try {
    const form = await prisma.formInstance.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ error: 'Not found' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Update form instance
formsRoutes.put('/:id', async (req, res) => {
  try {
    const form = await prisma.formInstance.update({ where: { id: req.params.id }, data: req.body });
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Auto-fill order form from appointment
formsRoutes.post('/auto-fill/order-form/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: {
        customer: true,
        openings: { orderBy: { openingNumber: 'asc' }, include: { photos: true } },
        user: true,
        houseMap: { include: { markers: true } }
      }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const formData = {
      poNumber: appt.poNumber || '',
      accountNumber: appt.accountNumber || '',
      orderDate: new Date().toISOString().split('T')[0],
      customerName: `${appt.customer.firstName} ${appt.customer.lastName}`,
      phone: appt.customer.phone || '',
      phone2: appt.customer.phone2 || '',
      address: appt.jobAddress || appt.customer.address || '',
      city: appt.jobCity || appt.customer.city || '',
      state: appt.jobState || appt.customer.state || 'LA',
      zip: appt.jobZip || appt.customer.zip || '',
      estimator: appt.user.name,
      openings: appt.openings.map(o => ({
        openingNumber: o.openingNumber,
        qty: o.quantity,
        model: o.productModel || o.seriesModel || '',
        vinylColor: o.interiorColor === o.exteriorColor ? o.interiorColor : '',
        interiorColor: o.interiorColor || '',
        exteriorColor: o.exteriorColor || '',
        width: o.width,
        height: o.height,
        unitedInches: o.unitedInches,
        legHeight: o.legHeight,
        customRadius: o.customRadius,
        windowNumber: o.openingNumber,
        hinge: o.hinge || '',
        glassOption: o.glassPackage || '',
        foamEnhanced: o.foamEnhanced,
        gridStyle: o.gridStyle || '',
        gridPattern: o.gridPattern || '',
        obscure: o.obscureGlass || 'none',
        tempered: o.temperedGlass || 'none',
        nailFin: o.nailFin,
        fullScreen: o.screenOption === 'Full',
        oriel: o.oriel,
        horizontalRR: o.horizontalRR,
        exteriorType: o.exteriorType || '',
        floorNumber: o.floorNumber || 1,
        trimType: o.trimType || '',
        removeInstallType: `${o.removalType || ''} / ${o.installType || ''}`,
        sillRepair: o.sillRepair,
        notes: o.installerNotes || '',
        elevation: o.elevation || '',
        roomLocation: o.roomLocation || '',
      })),
      sketchMarkers: appt.houseMap?.markers?.map(m => ({
        elevation: m.elevation,
        openingNumber: m.openingNumber,
        x: m.x,
        y: m.y,
        label: m.label,
        roomName: m.roomName,
        floorLevel: m.floorLevel,
      })) || [],
      sketchNotes: appt.houseMap?.notes || '',
      totalPages: Math.ceil((appt.openings.length || 0) / 10),
    };

    // Create or update form instance
    const existing = await prisma.formInstance.findFirst({
      where: { appointmentId: appt.id, formType: 'order_form' }
    });

    let form;
    if (existing) {
      form = await prisma.formInstance.update({
        where: { id: existing.id },
        data: { formData: JSON.stringify(formData), status: 'filled' }
      });
    } else {
      form = await prisma.formInstance.create({
        data: { appointmentId: appt.id, formType: 'order_form', formData: JSON.stringify(formData), status: 'filled' }
      });
    }

    res.json({ form, formData });
  } catch (err: any) {
    res.status(500).json({ error: 'Auto-fill failed', details: err.message });
  }
});

// Auto-fill contract from appointment
formsRoutes.post('/auto-fill/contract/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: {
        customer: true,
        openings: { orderBy: { openingNumber: 'asc' } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        user: true,
      }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // Count by category
    const doubleHungCount = appt.openings.filter(o => o.productCategory === 'double_hung').reduce((s, o) => s + o.quantity, 0);
    const otherStyleCount = appt.openings.filter(o => !['double_hung', 'patio_door', 'eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(o.productCategory || '')).reduce((s, o) => s + o.quantity, 0);
    const specialtyCount = appt.openings.filter(o => ['eyebrow', 'circle_top', 'quarter_arch', 'custom_shape'].includes(o.productCategory || '')).reduce((s, o) => s + o.quantity, 0);
    const doorCount = appt.openings.filter(o => o.productCategory === 'patio_door').reduce((s, o) => s + o.quantity, 0);
    const totalWindows = appt.openings.reduce((s, o) => s + o.quantity, 0);

    const formData = {
      customerName: `${appt.customer.firstName} ${appt.customer.lastName}`,
      address: appt.jobAddress || appt.customer.address || '',
      city: appt.jobCity || appt.customer.city || '',
      state: appt.jobState || appt.customer.state || 'LA',
      zip: appt.jobZip || appt.customer.zip || '',
      email: appt.customer.email || '',
      customerId: appt.customer.customerId || '',
      phone: appt.customer.phone || '',
      phone2: appt.customer.phone2 || '',
      completeJob: appt.completeJob,
      totalWindows,
      doubleHungQty: doubleHungCount,
      otherStyleQty: otherStyleCount,
      specialtyQty: specialtyCount,
      doorQty: doorCount,
      optionsQty: appt.lineItems.filter(li => li.category === 'option').length,
      preLead1978: appt.customer.preLead1978,
      // Pricing
      totalListPrice: appt.subtotal,
      adminSetupFee: appt.adminFee,
      salesTaxRate: appt.taxRate,
      salesTaxAmount: appt.taxAmount,
      totalAmount: appt.totalAmount,
      customOrderDeposit: appt.depositAmount,
      balancePaidToInstaller: appt.balanceDue,
      amountFinanced: appt.financingAmount,
      discount: appt.discount,
      // Line items for contract body
      lineItems: appt.lineItems.map(li => ({
        label: li.label,
        category: li.category,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        totalPrice: li.totalPrice,
        needsVerification: li.needsVerification
      })),
      estimator: appt.user.name,
      estimatorDate: new Date().toISOString().split('T')[0],
    };

    // Reconciliation check
    const openingsSubtotal = appt.openings.reduce((s, o) => s + o.totalPrice, 0);
    const lineItemsSubtotal = appt.lineItems.reduce((s, li) => s + li.totalPrice, 0);
    const reconciled = Math.abs(appt.subtotal - (openingsSubtotal + lineItemsSubtotal)) < 0.01;

    const existing = await prisma.formInstance.findFirst({
      where: { appointmentId: appt.id, formType: 'contract' }
    });

    let form;
    if (existing) {
      form = await prisma.formInstance.update({
        where: { id: existing.id },
        data: { formData: JSON.stringify(formData), status: reconciled ? 'filled' : 'draft' }
      });
    } else {
      form = await prisma.formInstance.create({
        data: { appointmentId: appt.id, formType: 'contract', formData: JSON.stringify(formData), status: reconciled ? 'filled' : 'draft' }
      });
    }

    res.json({ form, formData, reconciled, reconciliationNote: reconciled ? 'Totals match' : 'WARNING: Opening totals do not match appointment subtotal' });
  } catch (err: any) {
    res.status(500).json({ error: 'Auto-fill failed', details: err.message });
  }
});
