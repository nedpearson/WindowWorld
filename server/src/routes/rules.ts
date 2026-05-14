import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../index.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

export const rulesRoutes = Router();
rulesRoutes.use(requireAuth);

// ── JSON file fallback when BusinessRule table doesn't exist in DB ────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../../../data');
const RULES_FILE = join(DATA_DIR, 'business_rules.json');

const SEED_RULES = [
  { id: 'rule_brick_ext', name: 'Brick → EXT Install', description: 'Brick exterior defaults Install Type to EXT', triggerField: 'exteriorType', triggerValue: 'Brick', actionType: 'set_field', actionField: 'installType', actionValue: 'EXT', severity: 'info', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_siding_int', name: 'Siding → INT Install', description: 'Siding exterior defaults to INT Install and requires trim', triggerField: 'exteriorType', triggerValue: 'Siding', actionType: 'require_confirmation', actionField: 'installType', actionValue: 'INT', severity: 'info', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_tempered_warning', name: 'Tempered Glass Warning', description: 'Warn if bathroom window lacks tempered glass', triggerField: 'roomLocation', triggerValue: 'Bath', actionType: 'warn', message: 'Bathroom window may require tempered glass', severity: 'warning', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_picture_no_screen', name: 'Picture Window → No Screen', description: 'Picture windows do not have screens', triggerField: 'productCategory', triggerValue: 'picture', actionType: 'set_field', actionField: 'screenOption', actionValue: 'None', severity: 'info', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'rule_clear_story', name: 'Clear Story → Ladder Required', description: 'Upper floor clear story windows require ladder note', triggerField: 'floorNumber', triggerValue: '2', actionType: 'warn', message: 'Clear story window: add ladder/scaffold note for installer', severity: 'warning', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

function loadJsonRules(): any[] {
  try {
    if (!existsSync(RULES_FILE)) {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(RULES_FILE, JSON.stringify(SEED_RULES, null, 2));
      return SEED_RULES;
    }
    return JSON.parse(readFileSync(RULES_FILE, 'utf-8'));
  } catch {
    return SEED_RULES;
  }
}

function saveJsonRules(rules: any[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
  } catch (e) {
    console.error('Failed to save rules to JSON:', e);
  }
}

// ── Try Prisma first, fall back to JSON file ──────────────────────────────────
async function getRules(): Promise<any[]> {
  try {
    return await (prisma as any).businessRule.findMany({ orderBy: { createdAt: 'asc' } });
  } catch {
    return loadJsonRules();
  }
}

async function createRule(data: any): Promise<any> {
  try {
    return await (prisma as any).businessRule.create({ data });
  } catch {
    const rules = loadJsonRules();
    const newRule = { ...data, id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveJsonRules([...rules, newRule]);
    return newRule;
  }
}

async function updateRule(id: string, data: any): Promise<any> {
  try {
    return await (prisma as any).businessRule.update({ where: { id }, data });
  } catch {
    const rules = loadJsonRules();
    const idx = rules.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Rule not found');
    rules[idx] = { ...rules[idx], ...data, updatedAt: new Date().toISOString() };
    saveJsonRules(rules);
    return rules[idx];
  }
}

async function deleteRule(id: string): Promise<void> {
  try {
    await (prisma as any).businessRule.delete({ where: { id } });
  } catch {
    const rules = loadJsonRules().filter(r => r.id !== id);
    saveJsonRules(rules);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// List all rules
rulesRoutes.get('/', async (_req, res) => {
  try {
    res.json(await getRules());
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch rules', details: err.message });
  }
});

// Get single rule
rulesRoutes.get('/:id', async (req, res) => {
  try {
    const rules = await getRules();
    const rule = rules.find(r => r.id === String(req.params.id));
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create rule — admin/manager only
rulesRoutes.post('/', requireAdmin, async (req, res) => {
  try {
    const rule = await createRule(req.body);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create rule', details: err.message });
  }
});

// Update rule — admin/manager only
rulesRoutes.put('/:id', requireAdmin, async (req, res) => {
  try {
    const rule = await updateRule(String(req.params.id), req.body);
    res.json(rule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update rule', details: err.message });
  }
});

// Toggle active — admin only
rulesRoutes.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const rules = await getRules();
    const existing = rules.find(r => r.id === String(req.params.id));
    if (!existing) return res.status(404).json({ error: 'Rule not found' });
    const updated = await updateRule(String(req.params.id), { isActive: !existing.isActive });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle rule', details: err.message });
  }
});

// Delete rule — admin only
rulesRoutes.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteRule(String(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete rule', details: err.message });
  }
});
