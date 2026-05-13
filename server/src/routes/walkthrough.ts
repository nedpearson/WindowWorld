import { Router } from 'express';
import { prisma } from '../index.js';

export const walkthroughRoutes = Router();

const ROOM_PRESETS = [
  { roomName: 'Exterior', roomType: 'exterior', sortOrder: 0 },
  { roomName: 'Living Room', roomType: 'living', sortOrder: 1 },
  { roomName: 'Kitchen', roomType: 'kitchen', sortOrder: 2 },
  { roomName: 'Master Bedroom', roomType: 'bedroom', sortOrder: 3 },
  { roomName: 'Bedroom 2', roomType: 'bedroom', sortOrder: 4 },
  { roomName: 'Bathroom', roomType: 'bathroom', sortOrder: 5 },
  { roomName: 'Patio Door Area', roomType: 'patio', sortOrder: 6 },
  { roomName: 'Upstairs', roomType: 'upstairs', sortOrder: 7, floorNumber: 2 },
  { roomName: 'Garage', roomType: 'garage', sortOrder: 8 },
  { roomName: 'Other', roomType: 'other', sortOrder: 9 },
];

// Start a walkthrough session
walkthroughRoutes.post('/start', async (req, res) => {
  try {
    const { appointmentId, userId, rooms } = req.body;
    const roomList = rooms?.length ? rooms : ROOM_PRESETS;

    const session: any[] = await (prisma as any).$queryRaw`
      INSERT INTO "WalkthroughSession" ("id","appointmentId","userId","status","totalRooms","createdAt","updatedAt")
      VALUES (gen_random_uuid()::text, ${appointmentId}, ${userId}, 'in_progress', ${roomList.length}, NOW(), NOW())
      RETURNING *
    `;
    const sess = session[0];

    for (const r of roomList) {
      await (prisma as any).$queryRaw`
        INSERT INTO "WalkthroughRoom" ("id","sessionId","appointmentId","roomName","roomType","floorNumber","sortOrder","createdAt","updatedAt")
        VALUES (gen_random_uuid()::text, ${sess.id}, ${appointmentId}, ${r.roomName}, ${r.roomType}, ${r.floorNumber || 1}, ${r.sortOrder}, NOW(), NOW())
      `;
    }
    const allRooms = await (prisma as any).$queryRaw`
      SELECT * FROM "WalkthroughRoom" WHERE "sessionId"=${sess.id} ORDER BY "sortOrder"
    `;
    res.status(201).json({ session: sess, rooms: allRooms });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get walkthrough for appointment
walkthroughRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const sessions: any[] = await (prisma as any).$queryRaw`
      SELECT * FROM "WalkthroughSession" WHERE "appointmentId"=${req.params.appointmentId} ORDER BY "createdAt" DESC LIMIT 1
    `;
    if (!sessions.length) return res.json(null);
    const sess = sessions[0];
    const rooms = await (prisma as any).$queryRaw`
      SELECT r.*,
        (SELECT json_agg(o ORDER BY o."openingNumber") FROM "WalkthroughRoomOpening" o WHERE o."roomId"=r.id) as openings,
        (SELECT json_agg(n ORDER BY n."createdAt") FROM "WalkthroughRoomNote" n WHERE n."roomId"=r.id) as notes
      FROM "WalkthroughRoom" r WHERE r."sessionId"=${sess.id} ORDER BY r."sortOrder"
    `;
    res.json({ session: sess, rooms });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Update room status
walkthroughRoutes.put('/rooms/:roomId', async (req, res) => {
  try {
    const { status, completionPct, openingCount, notes } = req.body;
    await (prisma as any).$queryRaw`
      UPDATE "WalkthroughRoom"
      SET status=COALESCE(${status ?? null}, status), "completionPct"=COALESCE(${completionPct ?? null}, "completionPct"),
          "openingCount"=COALESCE(${openingCount ?? null}, "openingCount"), notes=COALESCE(${notes ?? null}, notes), "updatedAt"=NOW()
      WHERE id=${req.params.roomId}
    `;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Add opening to room
walkthroughRoutes.post('/rooms/:roomId/openings', async (req, res) => {
  try {
    const { openingId, openingNumber, productType, width, height, notes } = req.body;
    const op = await (prisma as any).$queryRaw`
      INSERT INTO "WalkthroughRoomOpening" ("id","roomId","openingId","openingNumber","productType","width","height","notes","createdAt")
      VALUES (gen_random_uuid()::text, ${req.params.roomId}, ${openingId ?? null}, ${openingNumber ?? null}, ${productType ?? null}, ${width ?? null}, ${height ?? null}, ${notes ?? null}, NOW())
      RETURNING *
    `;
    res.status(201).json(Array.isArray(op) ? op[0] : op);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Add note to room
walkthroughRoutes.post('/rooms/:roomId/notes', async (req, res) => {
  try {
    const { noteType, noteText, audioUrl } = req.body;
    const n = await (prisma as any).$queryRaw`
      INSERT INTO "WalkthroughRoomNote" ("id","roomId","noteType","noteText","audioUrl","createdAt")
      VALUES (gen_random_uuid()::text, ${req.params.roomId}, ${noteType || 'text'}, ${noteText ?? null}, ${audioUrl ?? null}, NOW())
      RETURNING *
    `;
    res.status(201).json(Array.isArray(n) ? n[0] : n);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Complete session
walkthroughRoutes.post('/complete/:sessionId', async (req, res) => {
  try {
    const rooms: any[] = await (prisma as any).$queryRaw`
      SELECT * FROM "WalkthroughRoom" WHERE "sessionId"=${req.params.sessionId}
    `;
    const completed = rooms.filter(r => r.status === 'completed').length;
    const pct = rooms.length > 0 ? Math.round((completed / rooms.length) * 100) : 0;
    const completedRooms = rooms.filter(r => r.status === 'completed').map(r => r.roomName);

    await (prisma as any).$queryRaw`
      UPDATE "WalkthroughSession"
      SET status='completed', "completionPct"=${pct}, "completedRooms"=${JSON.stringify(completedRooms)}::jsonb, "completedAt"=NOW(), "updatedAt"=NOW()
      WHERE id=${req.params.sessionId}
    `;
    const skipped = rooms.filter(r => r.status !== 'completed').map(r => r.roomName);
    res.json({ completionPct: pct, completedRooms, skippedRooms: skipped });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Opening Templates ────────────────────────────────

// List templates
walkthroughRoutes.get('/templates', async (_req, res) => {
  try {
    const templates = await (prisma as any).$queryRaw`SELECT * FROM "OpeningTemplate" ORDER BY "usageCount" DESC, "name"`;
    res.json(templates);
  } catch (err: any) { res.status(500).json({ error: 'Failed', details: err.message }); }
});

// Apply template to opening(s)
walkthroughRoutes.post('/templates/:templateId/apply', async (req, res) => {
  try {
    const { openingIds, appointmentId, userId } = req.body;
    const templates: any[] = await (prisma as any).$queryRaw`SELECT * FROM "OpeningTemplate" WHERE id=${req.params.templateId}`;
    if (!templates.length) return res.status(404).json({ error: 'Template not found' });
    const t = templates[0];

    const fields: Record<string, any> = {};
    if (t.productCategory) fields.productCategory = t.productCategory;
    if (t.interiorColor) fields.interiorColor = t.interiorColor;
    if (t.exteriorColor) fields.exteriorColor = t.exteriorColor;
    if (t.gridStyle) fields.gridStyle = t.gridStyle;
    if (t.temperedGlass) fields.temperedGlass = t.temperedGlass;
    if (t.obscureGlass) fields.obscureGlass = t.obscureGlass;
    if (t.screenOption) fields.screenOption = t.screenOption;
    if (t.foamEnhanced) fields.foamEnhanced = t.foamEnhanced;
    if (t.installNotes) fields.installNotes = t.installNotes;
    if (t.removalType) fields.removalType = t.removalType;

    let applied = 0;
    for (const oid of openingIds) {
      await prisma.opening.update({ where: { id: oid }, data: fields });
      await (prisma as any).$queryRaw`
        INSERT INTO "OpeningTemplateUsageLog" ("id","templateId","appointmentId","openingId","userId","appliedAt")
        VALUES (gen_random_uuid()::text, ${req.params.templateId}, ${appointmentId ?? null}, ${oid}, ${userId ?? null}, NOW())
      `;
      applied++;
    }
    await (prisma as any).$queryRaw`UPDATE "OpeningTemplate" SET "usageCount"="usageCount"+${applied} WHERE id=${req.params.templateId}`;
    res.json({ success: true, applied, fields });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── AI Chat (local rule-based) ───────────────────────

walkthroughRoutes.post('/ai-chat', async (req, res) => {
  try {
    const { appointmentId, userId, question } = req.body;
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true, openings: { include: { photos: true } }, signatures: true, houseMap: { include: { markers: true } } }
    });
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const openings = appt.openings || [];
    const q = question.toLowerCase();
    let answer = '';
    const actions: { label: string; jumpStep?: number; openingNumber?: number }[] = [];

    if (q.includes('forget') || q.includes('missing') || q.includes('incomplete')) {
      const missing: string[] = [];
      const noMeas = openings.filter(o => !o.width || !o.height);
      if (noMeas.length) { missing.push(`${noMeas.length} opening(s) missing measurements`); noMeas.forEach(o => actions.push({ label: `Fix Opening #${o.openingNumber}`, jumpStep: 3, openingNumber: o.openingNumber })); }
      const noProduct = openings.filter(o => !o.productCategory);
      if (noProduct.length) missing.push(`${noProduct.length} opening(s) missing product type`);
      const noRoom = openings.filter(o => !o.roomLocation);
      if (noRoom.length) missing.push(`${noRoom.length} opening(s) missing room label`);
      if (!appt.houseMap?.sketchData) missing.push('No sketch drawn');
      if (!appt.signatures?.length) missing.push('No signatures captured');
      if (appt.totalAmount <= 0) missing.push('No pricing calculated');
      answer = missing.length ? `Found ${missing.length} issue(s):\n• ${missing.join('\n• ')}` : '✅ Everything looks complete!';
    } else if (q.includes('second floor') || q.includes('upstairs')) {
      const upstairs = openings.filter(o => (o.floorNumber || 1) >= 2);
      answer = upstairs.length ? `${upstairs.length} second-floor opening(s): ${upstairs.map(o => `#${o.openingNumber}`).join(', ')}` : 'No second-floor openings found.';
    } else if (q.includes('sketch') || q.includes('marker')) {
      const markerCount = appt.houseMap?.markers?.length || 0;
      answer = markerCount < openings.length ? `Only ${markerCount}/${openings.length} openings have sketch markers.` : `All ${openings.length} openings have markers. ✅`;
      if (markerCount < openings.length) actions.push({ label: 'Go to Sketch', jumpStep: 2 });
    } else if (q.includes('pricing') || q.includes('price') || q.includes('quote')) {
      const zeroPriced = openings.filter(o => !o.totalPrice || o.totalPrice <= 0);
      answer = zeroPriced.length ? `${zeroPriced.length} opening(s) have no price: ${zeroPriced.map(o => `#${o.openingNumber}`).join(', ')}` : `All openings priced. Total: $${appt.totalAmount.toFixed(2)}`;
      if (zeroPriced.length) actions.push({ label: 'Review Pricing', jumpStep: 4 });
    } else if (q.includes('signature') || q.includes('sign')) {
      answer = appt.signatures?.length ? `${appt.signatures.length} signature(s) captured. ✅` : '⚠ No signatures captured yet.';
      if (!appt.signatures?.length) actions.push({ label: 'Go to Signatures', jumpStep: 5 });
    } else if (q.includes('contract') || q.includes('reconcil')) {
      const computed = openings.reduce((s, o) => s + (o.totalPrice || 0), 0);
      if (appt.subtotal > 0 && Math.abs(computed - appt.subtotal) > 0.01) {
        answer = `⚠ Contract mismatch: openings total $${computed.toFixed(2)} vs recorded $${appt.subtotal.toFixed(2)}`;
      } else { answer = '✅ Contract totals reconcile.'; }
    } else {
      const issues: string[] = [];
      const noMeas = openings.filter(o => !o.width || !o.height).length;
      if (noMeas) issues.push(`${noMeas} missing measurements`);
      if (!appt.houseMap?.sketchData) issues.push('No sketch');
      if (!appt.signatures?.length) issues.push('No signatures');
      answer = issues.length ? `Quick check: ${issues.join(', ')}` : '✅ Appointment looks good!';
    }

    // Save chat
    let sessionId: string;
    const existing: any[] = await (prisma as any).$queryRaw`
      SELECT id FROM "AiChatSession" WHERE "appointmentId"=${appointmentId} AND "userId"=${userId} AND status='active' LIMIT 1
    `;
    if (existing.length) { sessionId = existing[0].id; }
    else {
      const s: any[] = await (prisma as any).$queryRaw`
        INSERT INTO "AiChatSession" ("id","appointmentId","userId","status","createdAt") VALUES (gen_random_uuid()::text,${appointmentId},${userId},'active',NOW()) RETURNING id
      `;
      sessionId = s[0].id;
    }
    await (prisma as any).$queryRaw`INSERT INTO "AiChatMessage" ("id","sessionId","role","content","createdAt") VALUES (gen_random_uuid()::text,${sessionId},'user',${question},NOW())`;
    await (prisma as any).$queryRaw`INSERT INTO "AiChatMessage" ("id","sessionId","role","content","actionItems","createdAt") VALUES (gen_random_uuid()::text,${sessionId},'assistant',${answer},${JSON.stringify(actions)}::jsonb,NOW())`;

    res.json({ answer, actions, sessionId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Callback Risk Score ──────────────────────────────

walkthroughRoutes.post('/callback-risk/:appointmentId', async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: { openings: { include: { photos: true } }, signatures: true, houseMap: { include: { markers: true } } }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });
    const openings = appt.openings;
    const count = Math.max(openings.length, 1);

    const noMeas = openings.filter(o => !o.width || !o.height).length;
    const measurementRisk = Math.round((noMeas / count) * 100);
    const markerCount = appt.houseMap?.markers?.length || 0;
    const sketchRisk = !appt.houseMap?.sketchData ? 100 : Math.round(Math.max(0, 100 - (markerCount / count) * 100));
    const zeroPriced = openings.filter(o => !o.totalPrice || o.totalPrice <= 0).length;
    const pricingRisk = Math.round((zeroPriced / count) * 100);
    const noNotes = openings.filter(o => !o.installNotes).length;
    const notesRisk = Math.round((noNotes / count) * 100);
    const signatureRisk = appt.signatures?.length ? 0 : 100;
    const overallRisk = Math.round((measurementRisk + sketchRisk + pricingRisk + notesRisk + signatureRisk) / 5);

    const blockers: string[] = [];
    if (measurementRisk > 50) blockers.push('Missing measurements');
    if (sketchRisk > 80) blockers.push('No sketch');
    if (pricingRisk > 50) blockers.push('Missing pricing');
    if (signatureRisk > 0) blockers.push('Missing signatures');

    const riskLevel = overallRisk > 60 ? 'HIGH_RISK' : overallRisk > 30 ? 'REVIEW' : 'PASS';

    await (prisma as any).$queryRaw`
      INSERT INTO "CallbackRiskScore" ("id","appointmentId","overallRisk","measurementRisk","sketchRisk","pricingRisk","notesRisk","signatureRisk","riskLevel","blockers","computedAt")
      VALUES (gen_random_uuid()::text, ${req.params.appointmentId}, ${overallRisk}, ${measurementRisk}, ${sketchRisk}, ${pricingRisk}, ${notesRisk}, ${signatureRisk}, ${riskLevel}, ${JSON.stringify(blockers)}::jsonb, NOW())
    `;

    res.json({ overallRisk, measurementRisk, sketchRisk, pricingRisk, notesRisk, signatureRisk, riskLevel, blockers });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});
