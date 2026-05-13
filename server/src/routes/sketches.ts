import { Router } from 'express';
import { prisma } from '../index.js';

export const sketchRoutes = Router();

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
