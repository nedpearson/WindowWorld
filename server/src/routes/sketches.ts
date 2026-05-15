import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

export const sketchRoutes = Router();
sketchRoutes.use(requireAuth);

// Get sketches by appointment ID
sketchRoutes.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const sketches = await prisma.formSketch.findMany({
      where: { appointmentId: req.params.appointmentId },
      include: {
        layers: true,
        markers: {
          include: {
            links: true
          }
        },
        validations: true,
        pricingValidations: true,
        aiInterpretations: true,
        warnings: true,
        scores: true,
        clarityScores: true
      }
    });
    res.json(sketches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sketches' });
  }
});

// Create a new sketch
sketchRoutes.post('/', async (req, res) => {
  try {
    const { appointmentId, name } = req.body;
    const sketch = await prisma.formSketch.create({
      data: { appointmentId, name },
      include: { layers: true, markers: true }
    });
    res.status(201).json(sketch);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sketch' });
  }
});

// Sync markers for a sketch (enhanced for sketch-first flow)
sketchRoutes.post('/:sketchId/markers', async (req, res) => {
  try {
    const { markers } = req.body;
    const sketchId = req.params.sketchId;
    
    // Delete existing markers, insert new
    await prisma.sketchMarker.deleteMany({ where: { sketchId } });
    
    if (markers && markers.length > 0) {
      await prisma.sketchMarker.createMany({
        data: markers.map((m: any) => ({
          sketchId,
          markerType: m.markerType || 'window',
          markerNumber: m.markerNumber || null,
          markerSymbol: m.markerSymbol || null,
          markerLabel: m.markerLabel || null,
          windowType: m.windowType || m.productType || null,
          shapeType: m.shapeType || null,
          x: m.x,
          y: m.y,
          width: m.width || null,
          height: m.height || null,
          unitedInches: m.unitedInches || null,
          elevation: m.elevation || null,
          roomLocation: m.roomLocation || null,
          floorNumber: m.floorNumber || 1,
          productType: m.productType || null,
          specialtyType: m.specialtyType || null,
          ladderReq: m.ladderReq || false,
          removalType: m.removalType || null,
          installType: m.installType || null,
          exteriorMaterial: m.exteriorMaterial || null,
          notes: m.notes || null,
          pricingStatus: m.pricingStatus || null,
          linkedOrderRowNumber: m.linkedOrderRowNumber || null,
          validationStatus: m.validationStatus || 'incomplete',
          groupId: m.groupId || null,
        }))
      });
    }

    const updatedMarkers = await prisma.sketchMarker.findMany({
      where: { sketchId },
      include: { links: true, group: true },
    });
    res.json(updatedMarkers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync markers' });
  }
});

// Create marker group (join/mull)
sketchRoutes.post('/:sketchId/groups', async (req, res) => {
  try {
    const { groupType, groupNote, keepSeparateRows, memberMarkerIds } = req.body;
    const sketchId = req.params.sketchId;

    const group = await prisma.sketchMarkerGroup.create({
      data: {
        sketchId,
        groupType: groupType || 'mull_pair',
        groupNote: groupNote || null,
        keepSeparateRows: keepSeparateRows ?? true,
        needsReview: true,
        pricingReviewed: false,
      },
    });

    // Link markers to group
    if (memberMarkerIds && memberMarkerIds.length > 0) {
      await prisma.sketchMarker.updateMany({
        where: { id: { in: memberMarkerIds }, sketchId },
        data: { groupId: group.id },
      });
      // Create group member entries
      for (let i = 0; i < memberMarkerIds.length; i++) {
        await prisma.sketchMarkerGroupMember.create({
          data: { groupId: group.id, markerId: memberMarkerIds[i], position: i },
        });
      }
    }

    const fullGroup = await prisma.sketchMarkerGroup.findUnique({
      where: { id: group.id },
      include: { markers: true, members: true },
    });
    res.status(201).json(fullGroup);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create marker group' });
  }
});

// Get groups for a sketch
sketchRoutes.get('/:sketchId/groups', async (req, res) => {
  try {
    const groups = await prisma.sketchMarkerGroup.findMany({
      where: { sketchId: req.params.sketchId },
      include: { markers: true, members: true },
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Delete a group
sketchRoutes.delete('/groups/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    // Unlink markers
    await prisma.sketchMarker.updateMany({
      where: { groupId },
      data: { groupId: null },
    });
    await prisma.sketchMarkerGroupMember.deleteMany({ where: { groupId } });
    await prisma.sketchMarkerGroup.delete({ where: { id: groupId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Upload rendered sketch PNG for Order Form Excel insertion
sketchRoutes.post('/upload-for-export', async (req, res) => {
  try {
    const path = await import('path');
    const fs = await import('fs');
    const { fileURLToPath } = await import('url');
    const __filename3 = fileURLToPath(import.meta.url);
    const __dirname3 = path.dirname(__filename3);

    const sketchDir = path.resolve(__dirname3, '../../../data/sketches');
    if (!fs.existsSync(sketchDir)) {
      fs.mkdirSync(sketchDir, { recursive: true });
    }

    // Simple file save from multipart form
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      // Extract appointmentId from the multipart boundary
      const bodyStr = body.toString('latin1');
      const appointmentIdMatch = bodyStr.match(/name="appointmentId"\r\n\r\n([^\r\n]+)/);
      const appointmentId = appointmentIdMatch?.[1] || 'unknown';

      // Extract PNG data
      const pngStart = body.indexOf(Buffer.from([0x89, 0x50, 0x4E, 0x47])); // PNG magic
      if (pngStart < 0) {
        return res.status(400).json({ error: 'No PNG data found' });
      }

      // Find boundary end for the file part
      const boundaryMatch = bodyStr.match(/^--([\S]+)/);
      const boundary = boundaryMatch ? `--${boundaryMatch[1]}` : '';
      const endBoundary = Buffer.from(`\r\n${boundary}`);
      let pngEnd = body.indexOf(endBoundary, pngStart);
      if (pngEnd < 0) pngEnd = body.length;

      const pngData = body.subarray(pngStart, pngEnd);
      const filePath = path.join(sketchDir, `${appointmentId}.png`);
      fs.writeFileSync(filePath, pngData);

      res.json({ success: true, path: filePath, size: pngData.length });
    });
  } catch (err: any) {
    console.error('Sketch upload error:', err);
    res.status(500).json({ error: 'Failed to upload sketch' });
  }
});
