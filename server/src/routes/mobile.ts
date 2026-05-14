import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const mobileRoutes = Router();
mobileRoutes.use(requireAuth);

// ── Recordings ──────────────────────────────────────────

// Create recording metadata
mobileRoutes.post('/recordings', async (req, res) => {
  try {
    const rec = await (prisma as any).$queryRaw`
      INSERT INTO "MobileRecording" ("id","userId","appointmentId","openingId","status","syncStatus","createdAt","updatedAt")
      VALUES (gen_random_uuid()::text, ${req.body.userId}, ${req.body.appointmentId ?? null}, ${req.body.openingId ?? null}, 'saved', 'pending', NOW(), NOW())
      RETURNING *
    `;
    res.status(201).json(Array.isArray(rec) ? rec[0] : rec);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create recording', details: err.message });
  }
});

// Get recordings for appointment
mobileRoutes.get('/recordings/appointment/:appointmentId', async (req, res) => {
  try {
    const recs = await (prisma as any).$queryRaw`
      SELECT r.*, 
             (SELECT json_agg(t) FROM "MobileRecordingTranscript" t WHERE t."recordingId" = r.id) as transcripts,
             (SELECT COUNT(*) FROM "MobileRecordingFieldExtraction" e WHERE e."recordingId" = r.id) as "extractionCount",
             (SELECT COUNT(*) FROM "MobileRecordingFieldExtraction" e WHERE e."recordingId" = r.id AND e.status = 'pending') as "pendingReviewCount"
      FROM "MobileRecording" r
      WHERE r."appointmentId" = ${req.params.appointmentId}
      ORDER BY r."createdAt" DESC
    `;
    res.json(recs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Update recording status
mobileRoutes.put('/recordings/:id', async (req, res) => {
  try {
    const { status, audioUrl, durationSeconds } = req.body;
    const updated = await (prisma as any).$queryRaw`
      UPDATE "MobileRecording" 
      SET status = COALESCE(${status ?? null}, status),
          "audioUrl" = COALESCE(${audioUrl ?? null}, "audioUrl"),
          "durationSeconds" = COALESCE(${durationSeconds ?? null}, "durationSeconds"),
          "updatedAt" = NOW()
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    res.json(Array.isArray(updated) ? updated[0] : updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Save transcript for a recording
mobileRoutes.post('/recordings/:id/transcripts', async (req, res) => {
  try {
    const { rawText, confidence = 0.85, provider = 'web_speech' } = req.body;
    const t = await (prisma as any).$queryRaw`
      INSERT INTO "MobileRecordingTranscript" ("id","recordingId","rawText","confidence","provider","createdAt")
      VALUES (gen_random_uuid()::text, ${req.params.id}, ${rawText}, ${confidence}, ${provider}, NOW())
      RETURNING *
    `;
    // Update recording status to extracting_fields
    await (prisma as any).$queryRaw`
      UPDATE "MobileRecording" SET status='transcribing', "updatedAt"=NOW() WHERE id=${req.params.id}
    `;
    res.status(201).json(Array.isArray(t) ? t[0] : t);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Text Notes ──────────────────────────────────────────

// Create text note
mobileRoutes.post('/notes', async (req, res) => {
  try {
    const { userId, appointmentId, openingId, noteText } = req.body;
    const note = await (prisma as any).$queryRaw`
      INSERT INTO "MobileTextNote" ("id","userId","appointmentId","openingId","noteText","extractionStatus","syncStatus","createdAt","updatedAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${appointmentId ?? null}, ${openingId ?? null}, ${noteText}, 'pending', 'pending', NOW(), NOW())
      RETURNING *
    `;
    res.status(201).json(Array.isArray(note) ? note[0] : note);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get notes for appointment
mobileRoutes.get('/notes/appointment/:appointmentId', async (req, res) => {
  try {
    const notes = await (prisma as any).$queryRaw`
      SELECT n.*,
             (SELECT json_agg(e) FROM "MobileTextNoteExtraction" e WHERE e."noteId" = n.id) as extractions
      FROM "MobileTextNote" n
      WHERE n."appointmentId" = ${req.params.appointmentId}
      ORDER BY n."createdAt" DESC
    `;
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Sync Queue ──────────────────────────────────────────

// Enqueue item
mobileRoutes.post('/sync-queue', async (req, res) => {
  try {
    const { userId, appointmentId, entityType, entityId, operation, payload } = req.body;
    const item = await (prisma as any).$queryRaw`
      INSERT INTO "MobileSyncQueue" ("id","userId","appointmentId","entityType","entityId","operation","payload","status","createdAt")
      VALUES (gen_random_uuid()::text, ${userId}, ${appointmentId ?? null}, ${entityType}, ${entityId}, ${operation}, ${JSON.stringify(payload)}::jsonb, 'pending', NOW())
      RETURNING *
    `;
    res.status(201).json(Array.isArray(item) ? item[0] : item);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Get pending queue for user
mobileRoutes.get('/sync-queue/pending/:userId', async (req, res) => {
  try {
    const items = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileSyncQueue"
      WHERE "userId" = ${req.params.userId} AND status = 'pending'
      ORDER BY "createdAt" ASC
      LIMIT 50
    `;
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Flush/sync a batch
mobileRoutes.post('/sync-queue/flush', async (req, res) => {
  try {
    const { userId } = req.body;
    // Process up to 20 pending items at a time
    const items: any[] = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileSyncQueue"
      WHERE "userId" = ${userId} AND status = 'pending'
      ORDER BY "createdAt" ASC
      LIMIT 20
    `;

    const results = { synced: 0, failed: 0, conflicts: 0 };
    for (const item of items) {
      try {
        if (item.entityType === 'opening' && item.operation === 'update') {
          await prisma.opening.update({ where: { id: item.entityId }, data: item.payload });
        } else if (item.entityType === 'appointment' && item.operation === 'update') {
          await prisma.appointment.update({ where: { id: item.entityId }, data: item.payload });
        }
        await (prisma as any).$queryRaw`
          UPDATE "MobileSyncQueue" SET status='synced', "syncedAt"=NOW() WHERE id=${item.id}
        `;
        results.synced++;
      } catch {
        await (prisma as any).$queryRaw`
          UPDATE "MobileSyncQueue" SET status='failed', "retryCount"="retryCount"+1 WHERE id=${item.id}
        `;
        results.failed++;
      }
    }
    res.json({ ...results, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Flush failed', details: err.message });
  }
});

// ── Offline Drafts ──────────────────────────────────────

mobileRoutes.post('/drafts', async (req, res) => {
  try {
    const { userId, appointmentId, draftType, draftData } = req.body;
    // Upsert draft per appointment+type
    const existing: any[] = await (prisma as any).$queryRaw`
      SELECT id FROM "MobileOfflineDraft"
      WHERE "userId"=${userId} AND "appointmentId"=${appointmentId ?? null} AND "draftType"=${draftType}
      LIMIT 1
    `;
    if (existing.length > 0) {
      await (prisma as any).$queryRaw`
        UPDATE "MobileOfflineDraft"
        SET "draftData"=${JSON.stringify(draftData)}::jsonb, "version"="version"+1, "updatedAt"=NOW()
        WHERE id=${existing[0].id}
      `;
      res.json({ id: existing[0].id, updated: true });
    } else {
      const draft = await (prisma as any).$queryRaw`
        INSERT INTO "MobileOfflineDraft" ("id","userId","appointmentId","draftType","draftData","syncStatus","version","createdAt","updatedAt")
        VALUES (gen_random_uuid()::text, ${userId}, ${appointmentId ?? null}, ${draftType}, ${JSON.stringify(draftData)}::jsonb, 'pending', 1, NOW(), NOW())
        RETURNING *
      `;
      res.status(201).json(Array.isArray(draft) ? draft[0] : draft);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

mobileRoutes.get('/drafts/:userId/:appointmentId', async (req, res) => {
  try {
    const drafts = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileOfflineDraft"
      WHERE "userId"=${req.params.userId} AND "appointmentId"=${req.params.appointmentId}
      ORDER BY "updatedAt" DESC
    `;
    res.json(drafts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Field Extractions Review ─────────────────────────────

// Get all pending extractions for appointment
mobileRoutes.get('/extractions/appointment/:appointmentId', async (req, res) => {
  try {
    const exts = await (prisma as any).$queryRaw`
      SELECT e.*, r."audioUrl", r.status as "recordingStatus"
      FROM "MobileRecordingFieldExtraction" e
      JOIN "MobileRecording" r ON r.id = e."recordingId"
      WHERE e."appointmentId" = ${req.params.appointmentId}
      ORDER BY e."confidenceScore" DESC, e."createdAt" DESC
    `;
    const textExts = await (prisma as any).$queryRaw`
      SELECT e.*, n."noteText" as "sourceText"
      FROM "MobileTextNoteExtraction" e
      JOIN "MobileTextNote" n ON n.id = e."noteId"
      WHERE n."appointmentId" = ${req.params.appointmentId}
      ORDER BY e."confidenceScore" DESC
    `;
    res.json({ recordingExtractions: exts, noteExtractions: textExts });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Approve/reject extraction
mobileRoutes.put('/extractions/:id', async (req, res) => {
  try {
    const { status, normalizedValue, appliedBy } = req.body;
    await (prisma as any).$queryRaw`
      UPDATE "MobileRecordingFieldExtraction"
      SET status=${status}, "normalizedValue"=COALESCE(${normalizedValue ?? null}, "normalizedValue"),
          "appliedBy"=${appliedBy ?? null}, "approvedAt"=NOW(), "updatedAt"=NOW()
      WHERE id=${req.params.id}
    `;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// Apply all approved extractions to actual fields
mobileRoutes.post('/extractions/apply/:appointmentId', async (req, res) => {
  try {
    const apptId = req.params.appointmentId;
    const approved: any[] = await (prisma as any).$queryRaw`
      SELECT * FROM "MobileRecordingFieldExtraction"
      WHERE "appointmentId"=${apptId} AND status='approved'
    `;

    const openingUpdates: Record<number, Record<string, any>> = {};
    const apptUpdates: Record<string, any> = {};
    let appliedCount = 0;

    for (const ext of approved) {
      if (ext.targetTable === 'Opening' && ext.openingNumber) {
        if (!openingUpdates[ext.openingNumber]) openingUpdates[ext.openingNumber] = {};
        const val = isNaN(Number(ext.normalizedValue)) ? ext.normalizedValue : Number(ext.normalizedValue);
        openingUpdates[ext.openingNumber][ext.targetField] = val;
      } else if (ext.targetTable === 'Appointment') {
        apptUpdates[ext.targetField] = ext.normalizedValue;
      }
    }

    // Apply opening updates
    for (const [numStr, fields] of Object.entries(openingUpdates)) {
      const num = Number(numStr);
      const existing = await prisma.opening.findFirst({ where: { appointmentId: apptId, openingNumber: num } });
      if (existing) {
        await prisma.opening.update({ where: { id: existing.id }, data: fields });
        appliedCount++;
      }
    }

    // Apply appointment updates
    if (Object.keys(apptUpdates).length > 0) {
      await prisma.appointment.update({ where: { id: apptId }, data: apptUpdates });
      appliedCount++;
    }

    // Mark applied
    await (prisma as any).$queryRaw`
      UPDATE "MobileRecordingFieldExtraction"
      SET status='applied', "updatedAt"=NOW()
      WHERE "appointmentId"=${apptId} AND status='approved'
    `;

    res.json({ success: true, appliedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Apply failed', details: err.message });
  }
});

// ── AI Quality Score ─────────────────────────────────────
mobileRoutes.post('/quality-score/:appointmentId', async (req, res) => {
  try {
    const apptId = req.params.appointmentId;
    const appt = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: { openings: { include: { photos: true } }, signatures: true, houseMap: { include: { markers: true } } }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const openings = appt.openings;
    const count = Math.max(openings.length, 1);

    let installerClarity = 0;
    let measConfidence = 0;
    let pricedCount = 0;

    for (const op of openings) {
      let ics = 0;
      if (op.roomLocation) ics += 20;
      if (op.elevation) ics += 20;
      if (op.width && op.height) ics += 20;
      if (op.installNotes && op.installNotes.length > 10) ics += 20;
      if (op.photos?.length > 0) ics += 20;
      installerClarity += ics;

      let mc = 0;
      if (op.width && op.width > 0) mc += 30;
      if (op.height && op.height > 0) mc += 30;
      if (!op.needsVerification) mc += 20;
      if (op.unitedInches && op.unitedInches > 0) mc += 20;
      measConfidence += mc;

      if ((op.totalPrice || 0) > 0) pricedCount++;
    }

    const installerClarityScore = Math.round(installerClarity / count);
    const measurementConfidenceScore = Math.round(measConfidence / count);
    const pricingConfidenceScore = Math.round((pricedCount / count) * 100);
    const contractAccuracyScore = Math.round(
      (((appt.depositAmount > 0 ? 1 : 0) + (appt.taxAmount > 0 ? 1 : 0) +
        (appt.totalAmount > 0 ? 1 : 0) + (appt.signatures?.length > 0 ? 1 : 0)) / 4) * 100
    );
    const sketchCompletenessScore = appt.houseMap?.sketchData ? Math.min(100, (appt.houseMap.markers?.length || 0) / count * 100) : 0;

    const overallScore = Math.round((installerClarityScore + measurementConfidenceScore + pricingConfidenceScore + contractAccuracyScore + sketchCompletenessScore) / 5);

    const criticalIssues = openings.filter(o => !o.width || !o.height || !o.productCategory).length;
    const riskLevel = overallScore < 50 || criticalIssues > 0 ? 'HIGH_RISK' : overallScore < 75 ? 'REVIEW' : 'PASS';

    await (prisma as any).$queryRaw`
      INSERT INTO "AppointmentQualityScore" ("id","appointmentId","overallScore","installerClarityScore","measurementConfidenceScore","pricingConfidenceScore","contractAccuracyScore","sketchCompletenessScore","riskLevel","criticalIssueCount","warningCount","computedAt")
      VALUES (gen_random_uuid()::text, ${apptId}, ${overallScore}, ${installerClarityScore}, ${measurementConfidenceScore}, ${pricingConfidenceScore}, ${contractAccuracyScore}, ${sketchCompletenessScore}, ${riskLevel}, ${criticalIssues}, 0, NOW())
    `;

    res.json({ overallScore, installerClarityScore, measurementConfidenceScore, pricingConfidenceScore, contractAccuracyScore, sketchCompletenessScore, riskLevel, criticalIssues });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

// ── Final Packet Check ───────────────────────────────────
mobileRoutes.post('/final-check/:appointmentId', async (req, res) => {
  try {
    const apptId = req.params.appointmentId;
    const appt = await prisma.appointment.findUnique({
      where: { id: apptId },
      include: { customer: true, openings: true, signatures: true }
    });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const checks: { type: string; passed: boolean; level: string; msg: string }[] = [];
    const add = (type: string, passed: boolean, level: string, msg: string) =>
      checks.push({ type, passed, level, msg });

    add('customer_name', !!(appt.customer.firstName && appt.customer.lastName), 'critical', 'Customer name required');
    add('customer_phone', !!appt.customer.phone, 'critical', 'Customer phone required');
    add('job_address', !!appt.jobAddress, 'critical', 'Job address required');
    add('has_openings', appt.openings.length > 0, 'critical', 'At least one opening required');
    add('pricing_complete', appt.totalAmount > 0, 'critical', 'Total amount must be calculated');
    add('deposit_recorded', appt.depositAmount > 0, 'warning', 'Deposit should be recorded');
    add('signature', appt.signatures.length > 0, 'warning', 'Customer signature recommended');

    const missingMeasurements = appt.openings.filter(o => !o.width || !o.height).length;
    add('measurements', missingMeasurements === 0, 'critical', `${missingMeasurements} opening(s) missing measurements`);

    const missingProduct = appt.openings.filter(o => !o.productCategory).length;
    add('products', missingProduct === 0, 'critical', `${missingProduct} opening(s) missing product type`);

    const criticalFailed = checks.filter(c => !c.passed && c.level === 'critical').length;
    const canExport = criticalFailed === 0;

    res.json({ checks, canExport, criticalFailed, totalChecks: checks.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Check failed', details: err.message });
  }
});
