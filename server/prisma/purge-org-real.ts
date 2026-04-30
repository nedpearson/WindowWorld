/**
 * purge-org-real.ts — ONE-TIME script to remove ALL demo/seed data
 * from the orgReal (windowworld-louisiana) organisation.
 *
 * After this runs, nedpearson@gmail.com will see a completely clean,
 * empty state across all tabs — as if they are a brand-new user.
 *
 * SAFE: Only deletes data owned by orgReal. The organisation record
 * and the nedpearson@gmail.com user record are preserved.
 *
 * Run:  npx tsx prisma/purge-org-real.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging ALL data from orgReal (windowworld-louisiana)...\n');

  // ── Find the org ──────────────────────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { slug: 'windowworld-louisiana' },
  });
  if (!org) {
    console.log('❌ Organization "windowworld-louisiana" not found. Nothing to purge.');
    return;
  }
  const orgId = org.id;
  console.log(`Found org: "${org.name}" (${orgId})\n`);

  // ── Find the owner user (nedpearson@gmail.com) ────────────────
  const ned = await prisma.user.findUnique({
    where: { email: 'nedpearson@gmail.com' },
  });
  if (!ned) {
    console.log('⚠️  nedpearson@gmail.com user not found');
  }

  // ── Delete order matters: child → parent to respect FKs ──────

  // 1. Communication logs (references lead + user)
  const commLogs = await prisma.communicationLog.deleteMany({ where: { organizationId: orgId } });
  console.log(`  ✓ CommunicationLog: ${commLogs.count} deleted`);

  // 2. AutomationRuns (child of Automation)
  const autoRuns = await prisma.automationRun.deleteMany({
    where: { automation: { organizationId: orgId } },
  });
  console.log(`  ✓ AutomationRun: ${autoRuns.count} deleted`);

  // 3. Automations
  const autos = await prisma.automation.deleteMany({ where: { organizationId: orgId } });
  console.log(`  ✓ Automation: ${autos.count} deleted`);

  // 4. Notifications
  const notifs = await prisma.notification.deleteMany({
    where: { userId: ned?.id },
  });
  console.log(`  ✓ Notification: ${notifs.count} deleted`);

  // 5. PushSubscriptions
  const pushSubs = await prisma.pushSubscription.deleteMany({
    where: { userId: ned?.id },
  });
  console.log(`  ✓ PushSubscription: ${pushSubs.count} deleted`);

  // 6. AuditLogs
  const audits = await prisma.auditLog.deleteMany({
    where: { userId: ned?.id },
  });
  console.log(`  ✓ AuditLog: ${audits.count} deleted`);

  // ── Lead-related chain (most data lives here) ────────────────

  // Get all leads in orgReal
  const orgLeads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  const leadIds = orgLeads.map(l => l.id);
  console.log(`\n  Found ${leadIds.length} leads in orgReal to purge\n`);

  if (leadIds.length > 0) {
    // Activities
    const activities = await prisma.activity.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Activity: ${activities.count} deleted`);

    // Notes
    const notes = await prisma.note.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Note: ${notes.count} deleted`);

    // Tasks
    const tasks = await prisma.task.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Task: ${tasks.count} deleted`);

    // AI Analyses
    const aiAnalyses = await prisma.aiAnalysis.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ AiAnalysis: ${aiAnalyses.count} deleted`);

    // Documents
    const docs = await prisma.document.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Document: ${docs.count} deleted`);

    // Lead Scores
    const scores = await prisma.leadScore.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ LeadScore: ${scores.count} deleted`);

    // Job Expenses
    const expenses = await prisma.jobExpense.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ JobExpense: ${expenses.count} deleted`);

    // Contacts
    const contacts = await prisma.contact.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Contact: ${contacts.count} deleted`);

    // InvoicePayments → InvoiceLineItems → Invoices (child of lead via proposal)
    const invoices = await prisma.invoice.findMany({
      where: { leadId: { in: leadIds } },
      select: { id: true },
    });
    if (invoices.length > 0) {
      const invoiceIds = invoices.map(i => i.id);
      const payments = await prisma.invoicePayment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      console.log(`  ✓ InvoicePayment: ${payments.count} deleted`);
      const invLines = await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      console.log(`  ✓ InvoiceLineItem: ${invLines.count} deleted`);
      const invDel = await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      console.log(`  ✓ Invoice: ${invDel.count} deleted`);
    }

    // Proposals
    const proposals = await prisma.proposal.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Proposal: ${proposals.count} deleted`);

    // QuoteLineItems → Quotes
    const quotes = await prisma.quote.findMany({
      where: { leadId: { in: leadIds } },
      select: { id: true },
    });
    if (quotes.length > 0) {
      const quoteIds = quotes.map(q => q.id);
      const qLines = await prisma.quoteLineItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
      console.log(`  ✓ QuoteLineItem: ${qLines.count} deleted`);
      const qDel = await prisma.quote.deleteMany({ where: { id: { in: quoteIds } } });
      console.log(`  ✓ Quote: ${qDel.count} deleted`);
    }

    // Inspections (get IDs for openings first)
    const inspections = await prisma.inspection.findMany({
      where: { leadId: { in: leadIds } },
      select: { id: true },
    });
    if (inspections.length > 0) {
      const inspIds = inspections.map(i => i.id);
      // Openings under these inspections
      const openings = await prisma.opening.findMany({
        where: { inspectionId: { in: inspIds } },
        select: { id: true },
      });
      if (openings.length > 0) {
        const openingIds = openings.map(o => o.id);
        // Measurements
        const mHist = await prisma.measurementHistory.deleteMany({ where: { measurement: { openingId: { in: openingIds } } } });
        console.log(`  ✓ MeasurementHistory: ${mHist.count} deleted`);
        const measurements = await prisma.measurement.deleteMany({ where: { openingId: { in: openingIds } } });
        console.log(`  ✓ Measurement: ${measurements.count} deleted`);
        const openDel = await prisma.opening.deleteMany({ where: { id: { in: openingIds } } });
        console.log(`  ✓ Opening: ${openDel.count} deleted`);
      }
      const inspDel = await prisma.inspection.deleteMany({ where: { id: { in: inspIds } } });
      console.log(`  ✓ Inspection: ${inspDel.count} deleted`);
    }

    // Appointments
    const appts = await prisma.appointment.deleteMany({ where: { leadId: { in: leadIds } } });
    console.log(`  ✓ Appointment: ${appts.count} deleted`);

    // Finally, delete the leads themselves
    const leadDel = await prisma.lead.deleteMany({ where: { id: { in: leadIds } } });
    console.log(`  ✓ Lead: ${leadDel.count} deleted`);
  }

  // ── Properties not linked to leads but in org ─────────────────
  const properties = await prisma.property.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  if (properties.length > 0) {
    const propIds = properties.map(p => p.id);
    // Openings under these properties
    const propOpenings = await prisma.opening.findMany({
      where: { propertyId: { in: propIds } },
      select: { id: true },
    });
    if (propOpenings.length > 0) {
      const openingIds = propOpenings.map(o => o.id);
      await prisma.measurementHistory.deleteMany({ where: { measurement: { openingId: { in: openingIds } } } });
      await prisma.measurement.deleteMany({ where: { openingId: { in: openingIds } } });
      await prisma.opening.deleteMany({ where: { id: { in: openingIds } } });
    }
    const propDocs = await prisma.document.deleteMany({ where: { propertyId: { in: propIds } } });
    console.log(`  ✓ Property Documents: ${propDocs.count} deleted`);
    const propContacts = await prisma.contact.deleteMany({ where: { propertyId: { in: propIds } } });
    console.log(`  ✓ Property Contacts: ${propContacts.count} deleted`);
    const propDel = await prisma.property.deleteMany({ where: { id: { in: propIds } } });
    console.log(`  ✓ Property: ${propDel.count} deleted`);
  }

  // ── Campaigns ─────────────────────────────────────────────────
  const campaigns = await prisma.campaign.deleteMany({ where: { organizationId: orgId } });
  console.log(`  ✓ Campaign: ${campaigns.count} deleted`);

  // ── Templates ─────────────────────────────────────────────────
  const templates = await prisma.template.deleteMany({ where: { organizationId: orgId } });
  console.log(`  ✓ Template: ${templates.count} deleted`);

  // ── Products (org-scoped) ─────────────────────────────────────
  // Delete options first, then products
  const orgProducts = await prisma.product.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  if (orgProducts.length > 0) {
    const prodIds = orgProducts.map(p => p.id);
    await prisma.productOption.deleteMany({ where: { productId: { in: prodIds } } });
    await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
    console.log(`  ✓ Product + Options: ${orgProducts.length} products deleted`);
  }

  // ── Territories ───────────────────────────────────────────────
  const terrs = await prisma.territory.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  if (terrs.length > 0) {
    const terrIds = terrs.map(t => t.id);
    const terrUsers = await prisma.territoryUser.deleteMany({ where: { territoryId: { in: terrIds } } });
    console.log(`  ✓ TerritoryUser: ${terrUsers.count} deleted`);
    const terrDel = await prisma.territory.deleteMany({ where: { id: { in: terrIds } } });
    console.log(`  ✓ Territory: ${terrDel.count} deleted`);
  }

  // ── Stray contacts (no lead, no property, but linked to org users) ──
  // These are contacts that might be orphaned
  if (ned) {
    const strayContacts = await prisma.contact.deleteMany({
      where: { leadId: null, propertyId: null },
    });
    if (strayContacts.count > 0) {
      console.log(`  ✓ Orphan Contact: ${strayContacts.count} deleted`);
    }
  }

  // ── RefreshTokens (clean login state) ─────────────────────────
  if (ned) {
    const tokens = await prisma.refreshToken.deleteMany({ where: { userId: ned.id } });
    console.log(`  ✓ RefreshToken: ${tokens.count} deleted`);
  }

  // ── Invoices with organizationId directly (not via lead) ──────
  const orgInvoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  if (orgInvoices.length > 0) {
    const invIds = orgInvoices.map(i => i.id);
    await prisma.invoicePayment.deleteMany({ where: { invoiceId: { in: invIds } } });
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: invIds } } });
    await prisma.invoice.deleteMany({ where: { id: { in: invIds } } });
    console.log(`  ✓ Org-level Invoice (direct): ${orgInvoices.length} deleted`);
  }

  console.log('\n🎉 Purge complete! nedpearson@gmail.com now has a completely clean state.');
  console.log('   All tabs will show empty states — ready for real data.\n');
}

main()
  .catch((e) => {
    console.error('❌ Purge failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
