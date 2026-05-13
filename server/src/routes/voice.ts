import { Router } from 'express';
import { prisma } from '../index.js';

export const voiceRoutes = Router();

// Create voice session
voiceRoutes.post('/sessions', async (req, res) => {
  try {
    const session = await prisma.voiceSession.create({ data: req.body });
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create voice session', details: err.message });
  }
});

// Get session with transcripts and entities
voiceRoutes.get('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.voiceSession.findUnique({
      where: { id: req.params.id },
      include: { transcripts: true, entities: { orderBy: { openingNumber: 'asc' } } }
    });
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Save transcript
voiceRoutes.post('/transcripts', async (req, res) => {
  try {
    const transcript = await prisma.voiceTranscript.create({ data: req.body });
    res.status(201).json(transcript);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Parse transcript into entities (server-side NLP)
voiceRoutes.post('/parse', async (req, res) => {
  try {
    const { voiceSessionId, text } = req.body;
    const entities = parseVoiceText(text);
    const created = [];
    for (const e of entities) {
      const entity = await prisma.voiceExtractedEntity.create({
        data: { voiceSessionId, ...e }
      });
      created.push(entity);
    }
    await prisma.voiceSession.update({ where: { id: voiceSessionId }, data: { status: 'parsed' } });
    res.json({ entities: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Parse failed', details: err.message });
  }
});

// Apply entities to appointment
voiceRoutes.post('/apply/:sessionId', async (req, res) => {
  try {
    const session = await prisma.voiceSession.findUnique({
      where: { id: req.params.sessionId },
      include: { entities: { where: { status: 'accepted' } } }
    });
    if (!session || !session.appointmentId) return res.status(400).json({ error: 'No appointment linked' });

    // Group entities by type
    const customerFields: Record<string, string> = {};
    const openingMap: Record<number, Record<string, any>> = {};

    for (const e of session.entities) {
      if (e.entityType === 'customer') {
        customerFields[e.fieldName] = e.fieldValue;
      } else if (e.entityType === 'opening' || e.entityType === 'measurement' || e.entityType === 'option') {
        const num = e.openingNumber || 1;
        if (!openingMap[num]) openingMap[num] = {};
        const val = isNaN(Number(e.fieldValue)) ? e.fieldValue : Number(e.fieldValue);
        openingMap[num][e.fieldName] = val;
      }
    }

    // Apply customer fields
    if (Object.keys(customerFields).length > 0) {
      const appt = await prisma.appointment.findUnique({ where: { id: session.appointmentId } });
      if (appt) {
        await prisma.customer.update({ where: { id: appt.customerId }, data: customerFields });
      }
    }

    // Apply opening fields
    for (const [numStr, fields] of Object.entries(openingMap)) {
      const num = Number(numStr);
      const existing = await prisma.opening.findFirst({
        where: { appointmentId: session.appointmentId, openingNumber: num }
      });
      if (existing) {
        const width = fields.width ?? existing.width ?? 0;
        const height = fields.height ?? existing.height ?? 0;
        await prisma.opening.update({
          where: { id: existing.id },
          data: { ...fields, unitedInches: width + height }
        });
      } else {
        const width = fields.width ?? 0;
        const height = fields.height ?? 0;
        await prisma.opening.create({
          data: {
            appointmentId: session.appointmentId,
            openingNumber: num,
            unitedInches: width + height,
            ...fields
          }
        });
      }
    }

    await prisma.voiceSession.update({ where: { id: session.id }, data: { status: 'applied' } });
    res.json({ success: true, appliedCustomerFields: Object.keys(customerFields).length, appliedOpenings: Object.keys(openingMap).length });
  } catch (err: any) {
    res.status(500).json({ error: 'Apply failed', details: err.message });
  }
});

// Update entity status
voiceRoutes.put('/entities/:id', async (req, res) => {
  try {
    const entity = await prisma.voiceExtractedEntity.update({ where: { id: req.params.id }, data: req.body });
    res.json(entity);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Accept all entities in a session
voiceRoutes.post('/sessions/:id/accept-all', async (req, res) => {
  try {
    await prisma.voiceExtractedEntity.updateMany({
      where: { voiceSessionId: req.params.id, status: 'pending' },
      data: { status: 'accepted' }
    });
    await prisma.voiceSession.update({ where: { id: req.params.id }, data: { status: 'reviewed' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Voice text parser ────────────────────────────────────
function parseVoiceText(text: string) {
  const entities: any[] = [];
  const lower = text.toLowerCase();

  // Customer name
  const nameMatch = lower.match(/customer(?:\s+is)?\s+(\w+)\s+(\w+)/);
  if (nameMatch) {
    entities.push({ entityType: 'customer', fieldName: 'firstName', fieldValue: cap(nameMatch[1]), confidence: 0.9, status: 'pending' });
    entities.push({ entityType: 'customer', fieldName: 'lastName', fieldValue: cap(nameMatch[2]), confidence: 0.9, status: 'pending' });
  }

  // Address
  const addrMatch = lower.match(/(?:at|address)\s+([\d]+\s+[\w\s]+(?:street|st|drive|dr|road|rd|avenue|ave|boulevard|blvd|lane|ln|court|ct|way|circle|place|pl))/i);
  if (addrMatch) {
    entities.push({ entityType: 'customer', fieldName: 'address', fieldValue: cap(addrMatch[1]), confidence: 0.8, status: 'pending' });
  }

  // Parse openings: "window one..." or "opening one..." or "front window one..."
  const openingPattern = /(?:(?:front|rear|back|left|right|garage)\s+)?(?:window|opening|door)\s+(?:number\s+)?(\w+)\s+(?:is\s+)?(?:a\s+)?([\s\S]*?)(?=(?:(?:front|rear|back|left|right|garage)\s+)?(?:window|opening|door)\s+(?:number\s+)?\w+|$)/gi;
  let match;
  while ((match = openingPattern.exec(lower)) !== null) {
    const numWord = match[1];
    const details = match[2];
    const num = wordToNum(numWord);
    if (!num || num > 50) continue;

    // Elevation from prefix
    const elevMatch = match[0].match(/^(front|rear|back|left|right|garage)/);
    if (elevMatch) {
      const elev = elevMatch[1] === 'back' ? 'rear' : elevMatch[1];
      entities.push({ entityType: 'opening', fieldName: 'elevation', fieldValue: elev, openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    // Product type
    const products: Record<string, string> = {
      'double hung': 'double_hung', 'picture': 'picture', 'slider': 'slider',
      'casement': 'casement', 'awning': 'awning', 'patio door': 'patio_door',
      'circle top': 'circle_top', 'eyebrow': 'eyebrow', 'quarter arch': 'quarter_arch'
    };
    for (const [keyword, value] of Object.entries(products)) {
      if (details.includes(keyword)) {
        entities.push({ entityType: 'opening', fieldName: 'productCategory', fieldValue: value, openingNumber: num, confidence: 0.9, status: 'pending' });
        break;
      }
    }

    // Width × Height
    const dimMatch = details.match(/([\d]+(?:\s+and\s+[\w\s]+)?(?:\s*(?:and\s+)?(?:a\s+)?(?:half|quarter|eighth|three[- ]?eighth|one[- ]?eighth|five[- ]?eighth|seven[- ]?eighth|sixteenth|three[- ]?quarter)s?)?)\s*(?:wide|width)/);
    if (dimMatch) {
      entities.push({ entityType: 'measurement', fieldName: 'width', fieldValue: String(parseFraction(dimMatch[1])), openingNumber: num, confidence: 0.85, status: 'pending' });
    }
    const hMatch = details.match(/([\d]+(?:\s+and\s+[\w\s]+)?(?:\s*(?:and\s+)?(?:a\s+)?(?:half|quarter|eighth|three[- ]?eighth|one[- ]?eighth|five[- ]?eighth|seven[- ]?eighth|sixteenth|three[- ]?quarter)s?)?)\s*(?:tall|height|high)/);
    if (hMatch) {
      entities.push({ entityType: 'measurement', fieldName: 'height', fieldValue: String(parseFraction(hMatch[1])), openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    // Colors
    const colors = ['white', 'almond', 'clay', 'bronze', 'black', 'dark chocolate', 'forest green', 'beige', 'tan'];
    for (const c of colors) {
      if (details.includes(`${c} interior`)) entities.push({ entityType: 'option', fieldName: 'interiorColor', fieldValue: cap(c), openingNumber: num, confidence: 0.85, status: 'pending' });
      if (details.includes(`${c} exterior`)) entities.push({ entityType: 'option', fieldName: 'exteriorColor', fieldValue: cap(c), openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    // Grid
    const grids: Record<string, string> = { 'colonial': 'Colonial', 'prairie': 'Prairie', 'diamond': 'Diamond', 'perimeter': 'Perimeter' };
    for (const [k, v] of Object.entries(grids)) {
      if (details.includes(`${k} grid`)) entities.push({ entityType: 'option', fieldName: 'gridStyle', fieldValue: v, openingNumber: num, confidence: 0.85, status: 'pending' });
    }

    // Glass options
    if (details.includes('tempered')) entities.push({ entityType: 'option', fieldName: 'temperedGlass', fieldValue: 'full', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('obscure')) entities.push({ entityType: 'option', fieldName: 'obscureGlass', fieldValue: 'full', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('full screen')) entities.push({ entityType: 'option', fieldName: 'screenOption', fieldValue: 'Full', openingNumber: num, confidence: 0.85, status: 'pending' });
    if (details.includes('foam')) entities.push({ entityType: 'option', fieldName: 'foamEnhanced', fieldValue: 'true', openingNumber: num, confidence: 0.85, status: 'pending' });

    // Removal/install
    if (details.includes('remove') && details.includes('aluminum')) entities.push({ entityType: 'opening', fieldName: 'removalType', fieldValue: 'full_tearout', openingNumber: num, confidence: 0.8, status: 'pending' });
    if (details.includes('remove') && details.includes('vinyl')) entities.push({ entityType: 'opening', fieldName: 'removalType', fieldValue: 'full_tearout', openingNumber: num, confidence: 0.8, status: 'pending' });

    // Notes
    const noteMatch = details.match(/notes?[:\s]+(.+)/);
    if (noteMatch) entities.push({ entityType: 'opening', fieldName: 'installerNotes', fieldValue: cap(noteMatch[1].trim()), openingNumber: num, confidence: 0.7, status: 'pending' });
  }

  return entities;
}

function wordToNum(w: string): number | null {
  const nums: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12, '13': 13, '14': 14, '15': 15,
    '16': 16, '17': 17, '18': 18, '19': 19, '20': 20,
  };
  return nums[w.toLowerCase()] ?? null;
}

function parseFraction(text: string): number {
  let total = 0;
  const baseMatch = text.match(/(\d+)/);
  if (baseMatch) total = parseInt(baseMatch[1]);
  if (text.includes('half')) total += 0.5;
  if (text.includes('quarter') && !text.includes('three')) total += 0.25;
  if (text.includes('three quarter') || text.includes('three-quarter')) total += 0.75;
  if (text.includes('eighth') && !text.includes('three') && !text.includes('five') && !text.includes('seven')) total += 0.125;
  if (text.includes('three eighth') || text.includes('three-eighth')) total += 0.375;
  if (text.includes('five eighth') || text.includes('five-eighth')) total += 0.625;
  if (text.includes('seven eighth') || text.includes('seven-eighth')) total += 0.875;
  return total;
}

function cap(s: string): string { return s.replace(/\b\w/g, c => c.toUpperCase()); }
