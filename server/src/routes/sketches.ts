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

// Sync markers for a sketch
sketchRoutes.post('/:sketchId/markers', async (req, res) => {
  try {
    const { markers } = req.body; // Array of markers
    const sketchId = req.params.sketchId;
    
    // Simplistic sync: delete existing markers, insert new
    await prisma.sketchMarker.deleteMany({ where: { sketchId } });
    
    if (markers && markers.length > 0) {
      await prisma.sketchMarker.createMany({
        data: markers.map((m: any) => ({
          sketchId,
          markerType: m.markerType || 'window',
          x: m.x,
          y: m.y,
          width: m.width,
          height: m.height,
          elevation: m.elevation,
          roomLocation: m.roomLocation,
          productType: m.productType,
          notes: m.notes
        }))
      });
    }

    const updatedMarkers = await prisma.sketchMarker.findMany({ where: { sketchId } });
    res.json(updatedMarkers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync markers' });
  }
});

// Upload rendered sketch PNG for Order Form Excel insertion
sketchRoutes.post('/upload-for-export', async (req, res) => {
  try {
    const multer = (await import('multer')).default;
    const path = (await import('path'));
    const fs = (await import('fs'));
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
