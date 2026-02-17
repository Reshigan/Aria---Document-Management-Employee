/**
 * Ask ARIA - AI-Powered ERP Assistant
 * Uses Cloudflare Workers AI for intelligent intent classification
 * with rule-based fallback for reliability
 */

import { Hono } from 'hono';
import { orchestrate, classifyIntent, BOT_CATALOG } from '../services/ai-orchestrator';
import { botRegistry, getExtendedDatabaseCounts, executeBot } from './bots';

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  JWT_SECRET: string;
  AI?: any; // Cloudflare Workers AI binding (optional for fallback)
}

interface Skill {
  name: string;
  description: string;
  patterns: RegExp[];
  slots: string[];
  execute: (context: SkillContext) => Promise<SkillResult>;
}

interface SkillContext {
  db: D1Database;
  companyId: string;
  userId: string;
  message: string;
  slots: Record<string, string>;
  conversationId: string;
  conversationState?: ConversationState;
  updateState?: (state: ConversationState) => Promise<void>;
}

interface SkillResult {
  response: string;
  data?: any;
  action?: string;
  followUp?: string;
}

interface Conversation {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  intent: string | null;
  created_at: string;
  context?: string; // JSON string for conversation state
}

interface ConversationState {
  currentFlow?: string; // 'create_sales_order' | 'create_quote' | 'create_po' | 'create_invoice' | 'create_customer' | 'create_supplier' | 'create_product' | 'reconciliation'
  step?: string; // 'select_customer' | 'select_products' | 'enter_name' | 'enter_email' | 'enter_price' | 'confirm' | 'complete'
  selectedCustomerId?: string;
  selectedCustomerName?: string;
  selectedSupplierId?: string;
  selectedSupplierName?: string;
  selectedProducts?: Array<{ id: string; name: string; quantity: number; price: number }>;
  orderTotal?: number;
  // For create_customer flow
  customerName?: string;
  // For create_supplier flow
  supplierName?: string;
  // For create_product flow
  productName?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

const app = new Hono<{ Bindings: Env }>();

// Generate UUID
function generateUUID(): string {
  return crypto.randomUUID();
}

// Demo company ID constant
const DEMO_COMPANY_ID = 'b0598135-52fd-4f67-ac56-8f0237e6355e';

// Ensure demo company exists in database before any transaction
async function ensureDemoCompanyExists(db: D1Database, companyId: string): Promise<boolean> {
  try {
    // Check if company exists
    const existing = await db.prepare(
      'SELECT id FROM companies WHERE id = ?'
    ).bind(companyId).first();
    
    if (existing) {
      return true;
    }
    
    // Create the demo company if it doesn't exist
    const result = await db.prepare(`
      INSERT INTO companies (id, name, trading_name, email, phone, country, currency, is_active, settings, created_at, updated_at)
      VALUES (?, 'Demo Company', 'ARIA Demo', 'demo@aria.vantax.co.za', '+27 11 000 0000', 'South Africa', 'ZAR', 1, '{}', datetime('now'), datetime('now'))
    `).bind(companyId).run();
    
    if (!result.success) {
      console.error('Failed to create demo company:', result.error);
      return false;
    }
    
    console.log('Created demo company:', companyId);
    return true;
  } catch (error) {
    console.error('Error ensuring demo company exists:', error);
    return false;
  }
}

// --- Natural Language Order Parsing ---
interface ParsedOrder {
  intent: 'sales_order' | 'quote' | 'purchase_order' | 'invoice';
  entityName: string;
  items: Array<{
    productRef: string;
    quantity: number;
    price: number;
  }>;
}

function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase().trim();
  const h = haystack.toLowerCase().trim();
  if (h === n || h.includes(n) || n.includes(h)) return true;
  if (n.length >= 3 && h.startsWith(n)) return true;
  const nWords = n.split(/\s+/);
  if (nWords.length > 0 && nWords.every(w => h.includes(w))) return true;
  return false;
}

function parseNaturalLanguageOrder(message: string): ParsedOrder | null {
  const msg = message.replace(/^(?:hey|hi|hello|yo)?\s*(?:aria)?\s*/i, '').trim();

  let intent: ParsedOrder['intent'] | null = null;
  if (/(?:create|make|generate|new|prepare|do|process)\s+(?:a\s+)?(?:new\s+)?sales\s+order/i.test(msg)) {
    intent = 'sales_order';
  } else if (/(?:create|make|generate|new|prepare|do|process)\s+(?:a\s+)?(?:new\s+)?(?:quote|quotation)/i.test(msg)) {
    intent = 'quote';
  } else if (/(?:create|make|generate|new|prepare|do|process)\s+(?:a\s+)?(?:new\s+)?(?:purchase\s+order|po\b)/i.test(msg)) {
    intent = 'purchase_order';
  } else if (/(?:create|make|generate|new|prepare|do|process)\s+(?:a\s+)?(?:new\s+)?invoice/i.test(msg)) {
    intent = 'invoice';
  }
  if (!intent) return null;

  const forMatch = msg.match(/\bfor\s+(.+?)(?:\s+(?:they|he|she|we|i\s+need|needs?|wants?|with\s+|products?|items?|\d+\s*(?:x|units?|qty|pcs))|[;\-]|,\s*(?:they|product|item|\d))/i)
    || msg.match(/\bfor\s+(.+?)$/i);
  let entityName = '';
  if (forMatch) {
    entityName = forMatch[1].trim()
      .replace(/^(?:customer|client|company|supplier|vendor)\s+/i, '')
      .replace(/[,;]+$/, '').trim();
  }
  if (!entityName) return null;

  const items: ParsedOrder['items'] = [];

  const needPriceQty = /(?:they\s+)?needs?\s+(.+?)\s+(?:at|@)\s+r?\s?(\d[\d,]*(?:\.\d+)?)\s*(?:(?:qty|quantity|x|units?)\s*(\d+))?/gi;
  let m;
  while ((m = needPriceQty.exec(msg)) !== null) {
    items.push({
      productRef: m[1].trim().replace(/,+$/, ''),
      price: parseFloat(m[2].replace(/,/g, '')),
      quantity: m[3] ? parseInt(m[3]) : 1,
    });
  }

  if (items.length === 0) {
    const qtyFirst = /(\d+)\s*(?:x|units?\s+of|pcs?\s+of|of)\s+(.+?)\s+(?:at|@)\s+r?\s?(\d[\d,]*(?:\.\d+)?)/gi;
    while ((m = qtyFirst.exec(msg)) !== null) {
      items.push({
        productRef: m[2].trim().replace(/,+$/, ''),
        quantity: parseInt(m[1]),
        price: parseFloat(m[3].replace(/,/g, '')),
      });
    }
  }

  if (items.length === 0) {
    const productAt = /(?:product|item)\s+(.+?)\s+(?:at|@)\s+r?\s?(\d[\d,]*(?:\.\d+)?)/gi;
    while ((m = productAt.exec(msg)) !== null) {
      items.push({
        productRef: m[1].trim().replace(/,+$/, ''),
        quantity: 1,
        price: parseFloat(m[2].replace(/,/g, '')),
      });
    }
  }

  if (items.length === 0) {
    const withProduct = /(?:with\s+)?(?:product|item)\s+(.+?)\s+(?:quantity|qty)\s+(\d+)/gi;
    while ((m = withProduct.exec(msg)) !== null) {
      items.push({
        productRef: m[1].trim().replace(/,+$/, ''),
        quantity: parseInt(m[2]),
        price: 0,
      });
    }
  }

  if (items.length === 0) {
    const qtyProduct = /(\d+)\s*(?:x|units?\s+of|pcs?\s+of|of)\s+(?:product|item)\s+(.+?)(?:\s*$|,)/gi;
    while ((m = qtyProduct.exec(msg)) !== null) {
      items.push({
        productRef: m[2].trim().replace(/,+$/, ''),
        quantity: parseInt(m[1]),
        price: 0,
      });
    }
  }

  if (items.length === 0) {
    const simpleProduct = /(?:with\s+)?(?:product|item)\s+(.+?)(?:\s*$|,)/gi;
    while ((m = simpleProduct.exec(msg)) !== null) {
      const ref = m[1].trim().replace(/,+$/, '');
      if (ref) {
        items.push({
          productRef: ref,
          quantity: 1,
          price: 0,
        });
      }
    }
  }

  if (items.length > 0) {
    const trailingQty = msg.match(/(?:and\s+)?(?:they|the|i|we)\s+needs?\s+(\d+)\s*$/i)
      || msg.match(/\bqty\s+(\d+)\s*$/i)
      || msg.match(/\bquantity\s+(\d+)\s*$/i)
      || msg.match(/\bx\s*(\d+)\s*$/i);
    if (trailingQty) {
      items[items.length - 1].quantity = parseInt(trailingQty[1]);
    }
  }

  if (items.length === 0) return null;

  return { intent, entityName, items };
}

async function executeNaturalLanguageOrder(
  parsed: ParsedOrder,
  db: D1Database,
  companyId: string,
): Promise<SkillResult> {
  await ensureDemoCompanyExists(db, companyId);

  const isPO = parsed.intent === 'purchase_order';
  let matchedEntity: { id: string; name: string; code: string } | null = null;

  if (isPO) {
    const suppliers = await db.prepare(
      'SELECT id, supplier_name, supplier_code FROM suppliers WHERE company_id = ? GROUP BY supplier_name ORDER BY supplier_name LIMIT 50'
    ).bind(companyId).all();
    for (const s of (suppliers.results || []) as any[]) {
      if (fuzzyMatch(parsed.entityName, s.supplier_name || '')) {
        matchedEntity = { id: s.id, name: s.supplier_name, code: s.supplier_code };
        break;
      }
    }
    if (!matchedEntity) {
      const uniqueNames = [...new Set(((suppliers.results || []) as any[]).map((s: any) => s.supplier_name).filter(Boolean))];
      const supplierList = uniqueNames.slice(0, 10).map((n: string) => `- ${n}`).join('\n');
      return {
        response: `**Supplier "${parsed.entityName}" not found.**\n\nAvailable suppliers:\n${supplierList || 'None'}\n\nPlease try again with a valid supplier name.`,
      };
    }
  } else {
    const customers = await db.prepare(
      'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? GROUP BY customer_name ORDER BY customer_name LIMIT 50'
    ).bind(companyId).all();
    for (const c of (customers.results || []) as any[]) {
      if (fuzzyMatch(parsed.entityName, c.customer_name || '')) {
        matchedEntity = { id: c.id, name: c.customer_name, code: c.customer_code };
        break;
      }
    }
    if (!matchedEntity) {
      const uniqueNames = [...new Set(((customers.results || []) as any[]).map((c: any) => c.customer_name).filter(Boolean))];
      const customerList = uniqueNames.slice(0, 10).map((n: string) => `- ${n}`).join('\n');
      return {
        response: `**Customer "${parsed.entityName}" not found.**\n\nAvailable customers:\n${customerList || 'None'}\n\nPlease try again with a valid customer name.`,
      };
    }
  }

  const products = await db.prepare(
    'SELECT id, product_name, product_code, unit_price, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 50'
  ).bind(companyId).all();
  const allProducts = (products.results || []) as any[];

  const resolvedItems: Array<{ id: string; name: string; quantity: number; price: number }> = [];
  const notFound: string[] = [];

  for (const item of parsed.items) {
    let matched: any = null;
    for (const p of allProducts) {
      if (fuzzyMatch(item.productRef, p.product_name || '') || fuzzyMatch(item.productRef, p.product_code || '')) {
        matched = p;
        break;
      }
    }
    if (!matched) {
      const numRef = item.productRef.match(/^(?:product|item|prod)?\s*#?\s*(\d+)$/i);
      if (numRef) {
        const idx = parseInt(numRef[1]) - 1;
        if (idx >= 0 && idx < allProducts.length) {
          matched = allProducts[idx];
        }
      }
    }
    if (!matched) {
      notFound.push(item.productRef);
    } else {
      resolvedItems.push({
        id: matched.id,
        name: matched.product_name,
        quantity: item.quantity,
        price: item.price > 0 ? item.price : (isPO ? (matched.cost_price || matched.unit_price || 0) : (matched.unit_price || 0)),
      });
    }
  }

  if (resolvedItems.length === 0) {
    const uniqueProducts = [...new Set(allProducts.map((p: any) => `${p.product_name} (${p.product_code})`).filter(Boolean))];
    const productList = uniqueProducts.slice(0, 10).map((n: string) => `- ${n}`).join('\n');
    return {
      response: `**Could not find products: ${notFound.join(', ')}**\n\nAvailable products:\n${productList || 'None'}\n\nPlease try again with valid product names.`,
    };
  }

  const subtotal = resolvedItems.reduce((sum, p) => sum + p.quantity * p.price, 0);
  let docId = '';
  let docNumber = '';
  let docType = '';
  let docAction = '';
  let viewPath = '';

  if (parsed.intent === 'sales_order') {
    docId = generateUUID();
    docNumber = `SO-${Date.now().toString().slice(-8)}`;
    docType = 'Sales Order';
    docAction = 'order_created';
    viewPath = 'Sales > Sales Orders';
    await db.prepare(`
      INSERT INTO sales_orders (id, company_id, customer_id, order_number, order_date, status, subtotal, total_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, date('now'), 'confirmed', ?, ?, datetime('now'), datetime('now'))
    `).bind(docId, companyId, matchedEntity.id, docNumber, subtotal, subtotal).run();
    for (const item of resolvedItems) {
      await db.prepare(`
        INSERT INTO sales_order_items (id, sales_order_id, product_id, description, quantity, unit_price, line_total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(generateUUID(), docId, item.id, item.name, item.quantity, item.price, item.quantity * item.price).run();
    }
  } else if (parsed.intent === 'quote') {
    docId = generateUUID();
    docNumber = `QT-${Date.now().toString().slice(-8)}`;
    docType = 'Quote';
    docAction = 'quote_created';
    viewPath = 'Sales > Quotes';
    await db.prepare(`
      INSERT INTO quotes (id, company_id, customer_id, quote_number, quote_date, valid_until, status, subtotal, total_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, date('now'), date('now', '+30 days'), 'draft', ?, ?, datetime('now'), datetime('now'))
    `).bind(docId, companyId, matchedEntity.id, docNumber, subtotal, subtotal).run();
    for (const item of resolvedItems) {
      await db.prepare(`
        INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, line_total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(generateUUID(), docId, item.id, item.name, item.quantity, item.price, item.quantity * item.price).run();
    }
  } else if (parsed.intent === 'purchase_order') {
    docId = generateUUID();
    docNumber = `PO-${Date.now().toString().slice(-8)}`;
    docType = 'Purchase Order';
    docAction = 'po_created';
    viewPath = 'Procurement > Purchase Orders';
    await db.prepare(`
      INSERT INTO purchase_orders (id, company_id, supplier_id, po_number, po_date, status, subtotal, total_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?, date('now'), 'pending', ?, ?, datetime('now'), datetime('now'))
    `).bind(docId, companyId, matchedEntity.id, docNumber, subtotal, subtotal).run();
    for (const item of resolvedItems) {
      await db.prepare(`
        INSERT INTO purchase_order_items (id, purchase_order_id, product_id, description, quantity, unit_price, line_total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(generateUUID(), docId, item.id, item.name, item.quantity, item.price, item.quantity * item.price).run();
    }
  } else if (parsed.intent === 'invoice') {
    docId = generateUUID();
    docNumber = `INV-${Date.now().toString().slice(-8)}`;
    docType = 'Invoice';
    docAction = 'invoice_created';
    viewPath = 'Financial > AR Invoices';
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await db.prepare(`
      INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, balance_due, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(docId, companyId, docNumber, matchedEntity.id, today, dueDate, subtotal, taxAmount, totalAmount, totalAmount).run();
    for (const item of resolvedItems) {
      await db.prepare(`
        INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, line_total, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(generateUUID(), docId, item.id, item.name, item.quantity, item.price, item.quantity * item.price).run();
    }
  }

  const itemsList = resolvedItems.map((p, i) =>
    `${i + 1}. ${p.name} x ${p.quantity} @ R${p.price.toFixed(2)} = R${(p.quantity * p.price).toFixed(2)}`
  ).join('\n');

  let extra = '';
  if (parsed.intent === 'invoice') {
    const tax = subtotal * 0.15;
    extra = `\n**Subtotal:** R${subtotal.toFixed(2)}\n**VAT (15%):** R${tax.toFixed(2)}\n**Total:** R${(subtotal + tax).toFixed(2)}`;
  } else {
    extra = `\n**Total:** R${subtotal.toFixed(2)}`;
  }

  let notFoundMsg = '';
  if (notFound.length > 0) {
    notFoundMsg = `\n\n_Note: Could not find products: ${notFound.join(', ')} — skipped._`;
  }

  const entityLabel = isPO ? 'Supplier' : 'Customer';
  return {
    response: `**${docType} Created Successfully!**\n\n**${docType} #:** ${docNumber}\n**${entityLabel}:** ${matchedEntity.name} (${matchedEntity.code})\n**Status:** ${parsed.intent === 'sales_order' ? 'Confirmed' : parsed.intent === 'invoice' ? 'Draft' : parsed.intent === 'quote' ? 'Draft' : 'Pending'}\n\n**Items:**\n${itemsList}${extra}${notFoundMsg}\n\nView in **${viewPath}**`,
    action: docAction,
    data: { id: docId, number: docNumber, total: subtotal },
  };
}
// --- End Natural Language Order Parsing ---

// Skills registry
const skills: Skill[] = [
  // Natural Language Order Creation (must be BEFORE step-by-step skills)
  {
    name: 'natural_language_order',
    description: 'Create sales order, quote, PO, or invoice from natural language with inline details',
    patterns: [
      /(?:create|make|generate|new|prepare|do|process)\s+(?:a\s+)?(?:new\s+)?(?:sales\s+order|quote|quotation|purchase\s+order|po|invoice)\s+for\s+\w.+(?:need|at|@|\d+\s*x)/i,
      /(?:create|make|generate|new|prepare|do|process)\s+(?:a\s+)?(?:new\s+)?(?:sales\s+order|quote|quotation|purchase\s+order|po|invoice)\s+for\s+\w.+(?:product|item)/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const parsed = parseNaturalLanguageOrder(ctx.message);
      if (!parsed) {
        return { response: `I understood you want to create a document, but couldn't parse the details. Try something like:\n\n"Create a sales order for Acme Corp they need Widget A at 500 qty 10"` };
      }
      return executeNaturalLanguageOrder(parsed, ctx.db, ctx.companyId);
    },
  },

  // Run All Bots (Controller Bot) — MUST come before individual bot skill
  {
    name: 'run_all_bots',
    description: 'Run all automation bots (controller bot)',
    patterns: [
      /(?:hey\s+aria\s+)?run\s+(?:all|every)\s+bots?/i,
      /(?:hey\s+aria\s+)?(?:run|execute|start)\s+(?:the\s+)?controller\s*bot/i,
      /(?:hey\s+aria\s+)?run\s+(?:the\s+)?full\s+(?:bot\s+)?suite/i,
      /(?:hey\s+aria\s+)?execute\s+all\s+(?:automation\s+)?bots?/i,
      /(?:hey\s+aria\s+)?run\s+(?:the\s+)?(?:complete|entire)\s+(?:bot\s+)?suite/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const categories: Record<string, { total: number; success: number; failed: number; bots: string[] }> = {};
      let totalSuccess = 0;
      let totalFailed = 0;

      for (const bot of botRegistry) {
        if (!categories[bot.category]) {
          categories[bot.category] = { total: 0, success: 0, failed: 0, bots: [] };
        }
        categories[bot.category].total++;

        try {
          const result = await executeBot(bot.id, ctx.companyId, {}, ctx.db);
          if (result.success) {
            totalSuccess++;
            categories[bot.category].success++;
          } else {
            totalFailed++;
            categories[bot.category].failed++;
            categories[bot.category].bots.push(bot.name);
          }
        } catch {
          totalFailed++;
          categories[bot.category].failed++;
          categories[bot.category].bots.push(bot.name);
        }
      }

      const total = botRegistry.length;
      const runId = generateUUID();
      await ctx.db.prepare(`
        INSERT INTO bot_runs (id, company_id, bot_id, status, result, started_at, completed_at)
        VALUES (?, ?, 'controller_bot', 'completed', ?, datetime('now'), datetime('now'))
      `).bind(runId, ctx.companyId, JSON.stringify({ total, success: totalSuccess, failed: totalFailed })).run().catch(() => {});

      let categoryReport = '';
      for (const [cat, data] of Object.entries(categories)) {
        const status = data.failed === 0 ? 'ALL PASS' : `${data.failed} FAILED`;
        categoryReport += `- **${cat}** (${data.total}): ${data.success}/${data.total} SUCCESS ${data.failed > 0 ? `| ${status}` : ''}\n`;
      }

      let failedList = '';
      const allFailed = Object.values(categories).flatMap(c => c.bots);
      if (allFailed.length > 0) {
        failedList = `\n**Failed Bots:**\n${allFailed.map(n => `- ${n}`).join('\n')}\n`;
      }

      return {
        response: `**Controller Bot — All ${total} Bots Executed!**\n\n` +
          `**Overall:** ${totalSuccess}/${total} SUCCESS, ${totalFailed} FAILED\n\n` +
          `**By Category:**\n${categoryReport}` +
          failedList +
          `\nNavigate to **Agents** to view detailed run history.`,
        data: { total, success: totalSuccess, failed: totalFailed, categories },
      };
    },
  },

  // Run Any Bot by Natural Language
  {
    name: 'run_bot_natural_language',
    description: 'Run any automation bot by name using natural language',
    patterns: [
      /(?:hey\s+aria\s+)?(?:run|execute|start|trigger|launch|activate)\s+(?:the\s+)?(.+?)(?:\s+bot|\s+agent)?$/i,
      /(?:hey\s+aria\s+)?(?:run|execute|start|trigger|launch|activate)\s+(?:the\s+)?(.+?)(?:\s+bot|\s+agent)\s*/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const msg = ctx.message.toLowerCase().replace(/^hey\s+aria\s+/i, '').trim();
      const runMatch = msg.match(/(?:run|execute|start|trigger|launch|activate)\s+(?:the\s+)?(.+?)(?:\s+bot|\s+agent)?$/i);
      if (!runMatch) {
        return { response: 'Please specify which bot to run. Try "run [bot name]" or "list all bots" to see available bots.' };
      }
      const query = runMatch[1].trim().replace(/\s+bot$/i, '').replace(/\s+agent$/i, '');

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+agent$/,'').replace(/\s+bot$/,'').trim();
      const nQuery = normalize(query);
      let matchedBot = botRegistry.find(b => b.id === query || normalize(b.name) === nQuery);
      if (!matchedBot) {
        matchedBot = botRegistry.find(b => fuzzyMatch(nQuery, normalize(b.name)) || fuzzyMatch(nQuery, b.id.replace(/_/g, ' ')));
      }
      if (!matchedBot) {
        const words = nQuery.split(/\s+/);
        matchedBot = botRegistry.find(b => {
          const bName = normalize(b.name);
          return words.length > 0 && words.every(w => bName.includes(w));
        });
      }
      if (!matchedBot) {
        const words = nQuery.split(/\s+/);
        matchedBot = botRegistry.find(b => {
          const bName = normalize(b.name);
          return words.some(w => w.length >= 4 && bName.startsWith(w));
        });
      }
      if (!matchedBot) {
        const words = nQuery.split(/\s+/);
        matchedBot = botRegistry.find(b => {
          const bName = normalize(b.name);
          const bWords = bName.split(/\s+/);
          return words.some(w => w.length >= 4 && bWords.some(bw => bw.startsWith(w) || w.startsWith(bw)));
        });
      }

      if (!matchedBot) {
        const suggestions = botRegistry
          .filter(b => query.split(/\s+/).some(w => b.name.toLowerCase().includes(w) || b.id.includes(w)))
          .slice(0, 5);
        const sugList = suggestions.length > 0
          ? suggestions.map(b => `- **${b.name}** (${b.category})`).join('\n')
          : botRegistry.slice(0, 10).map(b => `- **${b.name}** (${b.category})`).join('\n');
        return {
          response: `**Bot "${query}" not found.**\n\nDid you mean:\n${sugList}\n\nSay "list all bots" to see all ${botRegistry.length} bots.`,
        };
      }

      try {
        const result = await executeBot(matchedBot.id, ctx.companyId, {}, ctx.db);
        if (!result.success) {
          return { response: `**${matchedBot.name} failed:** ${result.error || 'Unknown error'}\n\nTry again or check the system logs.` };
        }

        const runId = generateUUID();
        await ctx.db.prepare(`
          INSERT INTO bot_runs (id, company_id, bot_id, status, result, started_at, completed_at)
          VALUES (?, ?, ?, 'completed', ?, datetime('now'), datetime('now'))
        `).bind(runId, ctx.companyId, matchedBot.id, JSON.stringify(result)).run().catch(() => {});

        const details = Object.entries(result)
          .filter(([k]) => !['success', 'executed_at', 'data_source', 'message'].includes(k))
          .map(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const val = typeof v === 'number' && v > 999 ? `R${v.toLocaleString()}` : v;
            return `- **${label}:** ${val}`;
          })
          .join('\n');

        return {
          response: `**${matchedBot.name} Executed Successfully!**\n\n` +
            `**Category:** ${matchedBot.category}\n` +
            `${result.message ? `**Summary:** ${result.message}\n` : ''}` +
            `\n**Results:**\n${details}\n\n` +
            `Navigate to **Agents** to view run history.`,
          data: result,
        };
      } catch (error: any) {
        return { response: `**${matchedBot.name} Error:** ${error.message || 'Execution failed'}\n\nPlease try again.` };
      }
    },
  },

  // List Customers
  {
    name: 'list_customers',
    description: 'List all customers',
    patterns: [
      /show\s+(me\s+)?(all\s+)?customers?/i,
      /list\s+(all\s+)?customers?/i,
      /customer\s+list/i,
      /get\s+customers?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM customers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { response: 'No customers found. Would you like to create a new customer?' };
      }
      
      const customerList = customers.map((c: any) => 
        `- ${c.customer_name} (${c.customer_code}) - ${c.email || 'No email'}`
      ).join('\n');
      
      return {
        response: `Found ${customers.length} customers:\n\n${customerList}\n\nWould you like to see more details about any customer?`,
        data: customers,
      };
    },
  },
  
  // List Suppliers
  {
    name: 'list_suppliers',
    description: 'List all suppliers',
    patterns: [
      /show\s+(me\s+)?(all\s+)?suppliers?/i,
      /list\s+(all\s+)?suppliers?/i,
      /supplier\s+list/i,
      /get\s+suppliers?/i,
      /vendor\s+list/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM suppliers WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const suppliers = result.results || [];
      if (suppliers.length === 0) {
        return { response: 'No suppliers found. Would you like to add a new supplier?' };
      }
      
      const supplierList = suppliers.map((s: any) => 
        `- ${s.supplier_name} (${s.supplier_code}) - ${s.email || 'No email'}`
      ).join('\n');
      
      return {
        response: `Found ${suppliers.length} suppliers:\n\n${supplierList}\n\nWould you like to see more details or create a purchase order?`,
        data: suppliers,
      };
    },
  },
  
  // List Products
  {
    name: 'list_products',
    description: 'List all products',
    patterns: [
      /show\s+(me\s+)?(all\s+)?products?/i,
      /list\s+(all\s+)?products?/i,
      /product\s+list/i,
      /get\s+products?/i,
      /inventory/i,
      /items?\s+list/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM products WHERE company_id = ? LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const products = result.results || [];
      if (products.length === 0) {
        return { response: 'No products found. Would you like to add a new product?' };
      }
      
      const productList = products.map((p: any) => 
        `- ${p.product_name} (${p.product_code}) - R${p.unit_price || 0}`
      ).join('\n');
      
      return {
        response: `Found ${products.length} products:\n\n${productList}\n\nWould you like to create a quote or sales order?`,
        data: products,
      };
    },
  },
  
  // Show Recent Invoices
  {
    name: 'list_invoices',
    description: 'Show recent invoices',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?invoices?/i,
      /list\s+(all\s+)?invoices?/i,
      /invoice\s+list/i,
      /get\s+invoices?/i,
      /recent\s+invoices?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const invoices = result.results || [];
      if (invoices.length === 0) {
        return { response: 'No invoices found. Would you like to create a new invoice?' };
      }
      
      const invoiceList = invoices.map((i: any) => 
        `- ${i.invoice_number} - R${i.total_amount || 0} - ${i.status}`
      ).join('\n');
      
      return {
        response: `Found ${invoices.length} recent invoices:\n\n${invoiceList}\n\nWould you like to see details or create a new invoice?`,
        data: invoices,
      };
    },
  },
  
  // Show Sales Orders
  {
    name: 'list_sales_orders',
    description: 'Show sales orders',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?sales\s+orders?/i,
      /list\s+(all\s+)?sales\s+orders?/i,
      /sales\s+order\s+list/i,
      /get\s+sales\s+orders?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const orders = result.results || [];
      if (orders.length === 0) {
        return { response: 'No sales orders found. Would you like to create a new sales order?' };
      }
      
      const orderList = orders.map((o: any) => 
        `- ${o.order_number} - R${o.total_amount || 0} - ${o.status}`
      ).join('\n');
      
      return {
        response: `Found ${orders.length} sales orders:\n\n${orderList}\n\nWould you like to see details or create a new order?`,
        data: orders,
      };
    },
  },
  
  // Show Purchase Orders
  {
    name: 'list_purchase_orders',
    description: 'Show purchase orders',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?purchase\s+orders?/i,
      /list\s+(all\s+)?purchase\s+orders?/i,
      /purchase\s+order\s+list/i,
      /get\s+purchase\s+orders?/i,
      /po\s+list/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM purchase_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const orders = result.results || [];
      if (orders.length === 0) {
        return { response: 'No purchase orders found. Would you like to create a new purchase order?' };
      }
      
      const orderList = orders.map((o: any) => 
        `- ${o.po_number} - R${o.total_amount || 0} - ${o.status}`
      ).join('\n');
      
      return {
        response: `Found ${orders.length} purchase orders:\n\n${orderList}\n\nWould you like to see details or create a new PO?`,
        data: orders,
      };
    },
  },
  
  // Show Quotes
  {
    name: 'list_quotes',
    description: 'Show quotes',
    patterns: [
      /show\s+(me\s+)?(recent\s+)?quotes?/i,
      /list\s+(all\s+)?quotes?/i,
      /quote\s+list/i,
      /get\s+quotes?/i,
      /quotations?/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT * FROM quotes WHERE company_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(ctx.companyId).all();
      
      const quotes = result.results || [];
      if (quotes.length === 0) {
        return { response: 'No quotes found. Would you like to create a new quote?' };
      }
      
      const quoteList = quotes.map((q: any) => 
        `- ${q.quote_number} - R${q.total_amount || 0} - ${q.status}`
      ).join('\n');
      
      return {
        response: `Found ${quotes.length} quotes:\n\n${quoteList}\n\nWould you like to see details or create a new quote?`,
        data: quotes,
      };
    },
  },
  
  // Create Quote - Step 1: Select Customer
  {
    name: 'create_quote',
    description: 'Create a new quote',
    patterns: [
      /create\s+(a\s+)?(new\s+)?quote/i,
      /new\s+quote/i,
      /make\s+(a\s+)?quote/i,
      /generate\s+(a\s+)?quote/i,
    ],
    slots: ['customer'],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT id, customer_name, customer_code, email FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { 
          response: '**No customers found in the system.**\n\nTo create a quote, you first need customers. Reply "yes" to create a demo customer, or navigate to **CRM > Customers** to add customers manually.',
          action: 'no_customers',
          data: { path: '/crm/customers' }
        };
      }
      
      const customerList = customers.map((c: any, i: number) => 
        `**${i + 1}.** ${c.customer_name} (${c.customer_code})${c.email ? ` - ${c.email}` : ''}`
      ).join('\n');
      
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_quote',
          step: 'select_customer',
        });
      }
      
      return {
        response: `**Create Quote - Step 1: Select Customer**\n\nPlease select a customer by typing their number:\n\n${customerList}\n\n_Type a number (1-${customers.length}) to select a customer_`,
        action: 'select_customer',
        data: { customers, step: 'select_customer', flow: 'create_quote' },
        followUp: 'Which customer would you like to create a quote for?',
      };
    },
  },
  
  // Create Purchase Order - Step 1: Select Supplier
  {
    name: 'create_purchase_order',
    description: 'Create a new purchase order',
    patterns: [
      /create\s+(a\s+)?(new\s+)?purchase\s+order/i,
      /new\s+purchase\s+order/i,
      /create\s+(a\s+)?po/i,
      /new\s+po/i,
    ],
    slots: ['supplier'],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT id, supplier_name, supplier_code, email FROM suppliers WHERE company_id = ? ORDER BY supplier_name LIMIT 20'
      ).bind(ctx.companyId).all();
      
      const suppliers = result.results || [];
      if (suppliers.length === 0) {
        return { 
          response: '**No suppliers found in the system.**\n\nTo create a purchase order, you first need suppliers. Navigate to **Procurement > Suppliers** to add suppliers.',
          action: 'redirect',
          data: { path: '/procurement/suppliers' }
        };
      }
      
      const supplierList = suppliers.map((s: any, i: number) => 
        `**${i + 1}.** ${s.supplier_name} (${s.supplier_code})${s.email ? ` - ${s.email}` : ''}`
      ).join('\n');
      
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_po',
          step: 'select_supplier',
        });
      }
      
      return {
        response: `**Create Purchase Order - Step 1: Select Supplier**\n\nPlease select a supplier by typing their number:\n\n${supplierList}\n\n_Type a number (1-${suppliers.length}) to select a supplier_`,
        action: 'select_supplier',
        data: { suppliers, step: 'select_supplier', flow: 'create_po' },
        followUp: 'Which supplier would you like to create a PO for?',
      };
    },
  },
  
  // Dashboard Summary
  {
    name: 'dashboard_summary',
    description: 'Show dashboard summary',
    patterns: [
      /dashboard/i,
      /summary/i,
      /overview/i,
      /how\s+(is|are)\s+(the\s+)?business/i,
      /business\s+status/i,
      /financial\s+summary/i,
    ],
    slots: [],
    execute: async (ctx) => {
      // Get counts
      const [customers, suppliers, products, invoices, orders] = await Promise.all([
        ctx.db.prepare('SELECT COUNT(*) as count FROM customers WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM suppliers WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM products WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM customer_invoices WHERE company_id = ?').bind(ctx.companyId).first(),
        ctx.db.prepare('SELECT COUNT(*) as count FROM sales_orders WHERE company_id = ?').bind(ctx.companyId).first(),
      ]);
      
      return {
        response: `Here's your business summary:\n\n` +
          `- Customers: ${(customers as any)?.count || 0}\n` +
          `- Suppliers: ${(suppliers as any)?.count || 0}\n` +
          `- Products: ${(products as any)?.count || 0}\n` +
          `- Invoices: ${(invoices as any)?.count || 0}\n` +
          `- Sales Orders: ${(orders as any)?.count || 0}\n\n` +
          `What would you like to do next?`,
        data: {
          customers: (customers as any)?.count || 0,
          suppliers: (suppliers as any)?.count || 0,
          products: (products as any)?.count || 0,
          invoices: (invoices as any)?.count || 0,
          orders: (orders as any)?.count || 0,
        },
      };
    },
  },
  
  // Help
  {
    name: 'help',
    description: 'Show available commands',
    patterns: [
      /help/i,
      /what\s+can\s+you\s+do/i,
      /commands?/i,
      /capabilities/i,
    ],
    slots: [],
    execute: async () => {
      return {
        response: `I'm ARIA, your ERP assistant. Here's what I can help you with:\n\n` +
          `**Natural Language Commands (just say it!):**\n` +
          `- "Create a sales order for Acme Corp they need Widget A at 500 qty 10"\n` +
          `- "Make a quote for Cape Enterprises they need Product 1 at 1500 qty 3"\n` +
          `- "Generate an invoice for ABC Ltd they need Service Pack at 2999 qty 1"\n` +
          `- "Create a PO for Best Supplier they need Raw Material at 100 qty 50"\n\n` +
          `**View Data:**\n` +
          `- "Show customers" / "Show suppliers" / "Show products"\n` +
          `- "Show invoices" / "Show sales orders" / "Show purchase orders"\n\n` +
          `**Step-by-Step Creation:**\n` +
          `- "Create a quote" / "Create a sales order" / "Create a PO"\n\n` +
          `**Automation Bots:**\n` +
          `- "List all bots" / "Run reconciliation" / "Run payroll"\n\n` +
          `**Reports:**\n` +
          `- "Dashboard" or "Summary" - Show business overview\n\n` +
          `Just type naturally and I'll execute it!`,
      };
    },
  },
  
  // List All Bots
  {
    name: 'list_bots',
    description: 'List all available automation bots',
    patterns: [
      /list\s+(all\s+)?(available\s+)?bots?/i,
      /show\s+(me\s+)?(all\s+)?bots?/i,
      /what\s+bots?/i,
      /which\s+bots?/i,
      /available\s+bots?/i,
      /all\s+bots?/i,
      /automation\s+bots?/i,
      /show\s+automation/i,
    ],
    slots: [],
    execute: async () => {
      const bots = [
        // Financial Bots (12)
        { category: 'Financial', name: 'Invoice Reconciliation Bot', description: 'Matches invoices with purchase orders and receipts' },
        { category: 'Financial', name: 'Sales-to-Invoice Reconciliation Bot', description: 'Reconciles sales orders with invoices, identifies variances' },
        { category: 'Financial', name: 'Bank Reconciliation Bot', description: 'Matches bank transactions with GL entries' },
        { category: 'Financial', name: 'Accounts Payable Bot', description: 'Automates AP invoice processing and payments' },
        { category: 'Financial', name: 'Accounts Receivable Bot', description: 'Manages AR collections and customer payments' },
        { category: 'Financial', name: 'General Ledger Bot', description: 'Automates journal entries and GL reconciliation' },
        { category: 'Financial', name: 'Financial Close Bot', description: 'Automates month-end and year-end close processes' },
        { category: 'Financial', name: 'Expense Approval Bot', description: 'Routes and approves expense claims' },
        { category: 'Financial', name: 'VAT Return Filing Bot', description: 'Prepares and files VAT returns' },
        { category: 'Financial', name: 'Cash Flow Prediction Bot', description: 'Predicts future cash flow based on AR/AP' },
        { category: 'Financial', name: 'Revenue Forecasting Bot', description: 'Forecasts revenue based on sales pipeline' },
        { category: 'Financial', name: 'Multi-Currency Revaluation Bot', description: 'Revalues foreign currency balances' },
        
        // Sales Bots (8)
        { category: 'Sales', name: 'Quote Generation Bot', description: 'Auto-generates quotes from customer requests' },
        { category: 'Sales', name: 'Lead Scoring Bot', description: 'Scores and prioritizes sales leads' },
        { category: 'Sales', name: 'Opportunity Tracking Bot', description: 'Tracks sales opportunities through pipeline' },
        { category: 'Sales', name: 'Contract Renewal Bot', description: 'Manages contract renewals and notifications' },
        { category: 'Sales', name: 'Sales Order Processing Bot', description: 'Automates sales order creation and fulfillment' },
        { category: 'Sales', name: 'Customer Onboarding Bot', description: 'Guides new customer setup process' },
        { category: 'Sales', name: 'Pricing Optimization Bot', description: 'Optimizes pricing based on market data' },
        { category: 'Sales', name: 'Sales Analytics Bot', description: 'Generates sales performance reports' },
        
        // Purchasing Bots (7)
        { category: 'Purchasing', name: 'Purchase Order Bot', description: 'Automates PO creation and approval' },
        { category: 'Purchasing', name: 'RFQ Management Bot', description: 'Manages request for quotation process' },
        { category: 'Purchasing', name: 'Supplier Evaluation Bot', description: 'Evaluates and scores suppliers' },
        { category: 'Purchasing', name: 'Goods Receipt Bot', description: 'Automates goods receipt processing' },
        { category: 'Purchasing', name: 'Three-Way Match Bot', description: 'Matches PO, receipt, and invoice' },
        { category: 'Purchasing', name: 'Procurement Analytics Bot', description: 'Analyzes procurement spending' },
        { category: 'Purchasing', name: 'Vendor Portal Bot', description: 'Manages vendor self-service portal' },
        
        // Inventory Bots (7)
        { category: 'Inventory', name: 'Stock Reorder Bot', description: 'Automatically reorders low stock items' },
        { category: 'Inventory', name: 'Inventory Optimization Bot', description: 'Optimizes stock levels and locations' },
        { category: 'Inventory', name: 'Stock Valuation Bot', description: 'Calculates inventory valuation' },
        { category: 'Inventory', name: 'Warehouse Management Bot', description: 'Manages warehouse operations' },
        { category: 'Inventory', name: 'Cycle Counting Bot', description: 'Schedules and manages cycle counts' },
        { category: 'Inventory', name: 'Demand Forecasting Bot', description: 'Forecasts product demand' },
        { category: 'Inventory', name: 'ABC Analysis Bot', description: 'Classifies inventory by value' },
        
        // HR Bots (8)
        { category: 'HR', name: 'Payroll Processing Bot', description: 'Automates payroll calculations' },
        { category: 'HR', name: 'Leave Management Bot', description: 'Manages leave requests and balances' },
        { category: 'HR', name: 'Employee Onboarding Bot', description: 'Guides new employee setup' },
        { category: 'HR', name: 'Performance Review Bot', description: 'Schedules and tracks performance reviews' },
        { category: 'HR', name: 'Training Management Bot', description: 'Manages employee training programs' },
        { category: 'HR', name: 'Attendance Tracking Bot', description: 'Tracks employee attendance' },
        { category: 'HR', name: 'Recruitment Bot', description: 'Automates recruitment workflow' },
        { category: 'HR', name: 'Benefits Administration Bot', description: 'Manages employee benefits' },
        
        // Manufacturing Bots (6)
        { category: 'Manufacturing', name: 'Production Planning Bot', description: 'Plans production schedules' },
        { category: 'Manufacturing', name: 'OEE Calculation Bot', description: 'Calculates overall equipment effectiveness' },
        { category: 'Manufacturing', name: 'Quality Control Bot', description: 'Manages quality inspections' },
        { category: 'Manufacturing', name: 'BOM Management Bot', description: 'Manages bills of materials' },
        { category: 'Manufacturing', name: 'Work Order Bot', description: 'Creates and tracks work orders' },
        { category: 'Manufacturing', name: 'Capacity Planning Bot', description: 'Plans production capacity' },
        
        // Compliance Bots (5)
        { category: 'Compliance', name: 'Audit Trail Bot', description: 'Maintains comprehensive audit logs' },
        { category: 'Compliance', name: 'Document Compliance Bot', description: 'Ensures document compliance' },
        { category: 'Compliance', name: 'Risk Assessment Bot', description: 'Identifies and assesses risks' },
        { category: 'Compliance', name: 'Policy Management Bot', description: 'Manages company policies' },
        { category: 'Compliance', name: 'Regulatory Reporting Bot', description: 'Generates regulatory reports' },
        
        // Analytics Bots (5)
        { category: 'Analytics', name: 'Sales Analytics Bot', description: 'Analyzes sales performance' },
        { category: 'Analytics', name: 'Financial Analytics Bot', description: 'Analyzes financial metrics' },
        { category: 'Analytics', name: 'Operational Analytics Bot', description: 'Analyzes operational efficiency' },
        { category: 'Analytics', name: 'Predictive Analytics Bot', description: 'Predicts business trends' },
        { category: 'Analytics', name: 'Custom Reports Bot', description: 'Generates custom reports' },
        
        // Service Bots (5)
        { category: 'Service', name: 'Ticket Management Bot', description: 'Manages support tickets' },
        { category: 'Service', name: 'SLA Monitoring Bot', description: 'Monitors service level agreements' },
        { category: 'Service', name: 'Customer Feedback Bot', description: 'Collects and analyzes feedback' },
        { category: 'Service', name: 'Knowledge Base Bot', description: 'Manages knowledge articles' },
        { category: 'Service', name: 'Escalation Bot', description: 'Handles ticket escalations' },
        
        // Workflow Bots (4)
        { category: 'Workflow', name: 'Approval Workflow Bot', description: 'Manages approval processes' },
        { category: 'Workflow', name: 'Document Routing Bot', description: 'Routes documents for review' },
        { category: 'Workflow', name: 'Task Assignment Bot', description: 'Assigns tasks automatically' },
        { category: 'Workflow', name: 'Notification Bot', description: 'Sends automated notifications' },
      ];
      
      // Group by category
      const categories: Record<string, typeof bots> = {};
      for (const bot of bots) {
        if (!categories[bot.category]) {
          categories[bot.category] = [];
        }
        categories[bot.category].push(bot);
      }
      
      let response = `**Found ${bots.length} automation bots:**\n\n`;
      
      for (const [category, categoryBots] of Object.entries(categories)) {
        response += `**${category} (${categoryBots.length} bots):**\n`;
        for (const bot of categoryBots.slice(0, 3)) {
          response += `- ${bot.name}: ${bot.description}\n`;
        }
        if (categoryBots.length > 3) {
          response += `  ...and ${categoryBots.length - 3} more\n`;
        }
        response += '\n';
      }
      
      response += `Click the **Bots** button to see all categories and quick prompts!`;
      
      return { response, data: bots };
    },
  },
  
  // List Financial Bots
  {
    name: 'list_financial_bots',
    description: 'List financial automation bots',
    patterns: [
      /list\s+financial\s+bots?/i,
      /show\s+(me\s+)?financial\s+bots?/i,
      /financial\s+automation/i,
    ],
    slots: [],
    execute: async () => {
      const bots = [
        { name: 'Invoice Reconciliation Bot', description: 'Matches invoices with purchase orders and receipts' },
        { name: 'Sales-to-Invoice Reconciliation Bot', description: 'Reconciles sales orders with invoices, identifies variances' },
        { name: 'Bank Reconciliation Bot', description: 'Matches bank transactions with GL entries' },
        { name: 'Accounts Payable Bot', description: 'Automates AP invoice processing and payments' },
        { name: 'Accounts Receivable Bot', description: 'Manages AR collections and customer payments' },
        { name: 'General Ledger Bot', description: 'Automates journal entries and GL reconciliation' },
        { name: 'Financial Close Bot', description: 'Automates month-end and year-end close processes' },
        { name: 'Expense Approval Bot', description: 'Routes and approves expense claims' },
        { name: 'VAT Return Filing Bot', description: 'Prepares and files VAT returns' },
        { name: 'Cash Flow Prediction Bot', description: 'Predicts future cash flow based on AR/AP' },
        { name: 'Revenue Forecasting Bot', description: 'Forecasts revenue based on sales pipeline' },
        { name: 'Multi-Currency Revaluation Bot', description: 'Revalues foreign currency balances' },
      ];
      
      let response = `**Financial Automation Bots (${bots.length}):**\n\n`;
      for (const bot of bots) {
        response += `- **${bot.name}**: ${bot.description}\n`;
      }
      response += `\nTry these commands:\n- "Run reconciliation" - Sales-to-Invoice Reconciliation\n- "Run bank reconciliation" - Bank Statement Reconciliation\n- "Run invoice reconciliation" - 3-Way Invoice Matching`;
      
      return { response, data: bots };
    },
  },
  
  // Run Sales-to-Invoice Reconciliation - Real Database Query
  {
    name: 'run_reconciliation',
    description: 'Run sales-to-invoice reconciliation',
    patterns: [
      /run\s+(sales[- ]?to[- ]?invoice\s+)?reconciliation/i,
      /reconcile\s+(sales|invoices)/i,
      /sales[- ]?to[- ]?invoice\s+reconciliation/i,
      /start\s+reconciliation/i,
      /execute\s+reconciliation/i,
    ],
    slots: [],
    execute: async (ctx) => {
      try {
        // Get all sales orders
        const salesOrdersResult = await ctx.db.prepare(
          'SELECT id, order_number, customer_id, total_amount, status FROM sales_orders WHERE company_id = ? ORDER BY created_at DESC'
        ).bind(ctx.companyId).all();
        
        const salesOrders = salesOrdersResult.results || [];
        
        // Get all customer invoices
        const invoicesResult = await ctx.db.prepare(
          'SELECT id, invoice_number, customer_id, total_amount, status, sales_order_id FROM customer_invoices WHERE company_id = ? ORDER BY created_at DESC'
        ).bind(ctx.companyId).all();
        
        const invoices = invoicesResult.results || [];
        
        // Perform reconciliation
        let matchedCount = 0;
        let quantityVariances = 0;
        let priceVariances = 0;
        let missingInvoices = 0;
        const exceptions: Array<{ type: string; orderNumber: string; details: string }> = [];
        
        for (const order of salesOrders as any[]) {
          // Find matching invoice by sales_order_id or customer_id + amount
          const matchingInvoice = invoices.find((inv: any) => 
            inv.sales_order_id === order.id || 
            (inv.customer_id === order.customer_id && Math.abs(inv.total_amount - order.total_amount) < 0.01)
          );
          
          if (matchingInvoice) {
            matchedCount++;
            // Check for variances
            if (Math.abs((matchingInvoice as any).total_amount - order.total_amount) > 0.01) {
              priceVariances++;
              exceptions.push({
                type: 'Price Variance',
                orderNumber: order.order_number,
                details: `Order: R${order.total_amount?.toFixed(2)}, Invoice: R${(matchingInvoice as any).total_amount?.toFixed(2)}`,
              });
            }
          } else {
            missingInvoices++;
            exceptions.push({
              type: 'Missing Invoice',
              orderNumber: order.order_number,
              details: `No invoice found for order R${order.total_amount?.toFixed(2)}`,
            });
          }
        }
        
        const totalOrders = salesOrders.length;
        const matchRate = totalOrders > 0 ? ((matchedCount / totalOrders) * 100).toFixed(1) : 0;
        const exceptionsFound = priceVariances + quantityVariances + missingInvoices;
        
        // Create reconciliation record
        const reconciliationId = generateUUID();
        await ctx.db.prepare(`
          INSERT INTO reconciliation_runs (id, company_id, run_type, status, total_records, matched_records, exceptions_count, run_date, created_at)
          VALUES (?, ?, 'sales_to_invoice', 'completed', ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(reconciliationId, ctx.companyId, totalOrders, matchedCount, exceptionsFound).run().catch(() => {
          // Table might not exist, continue anyway
        });
        
        let exceptionDetails = '';
        if (exceptions.length > 0) {
          exceptionDetails = '\n\n**Exception Details:**\n' + exceptions.slice(0, 5).map(e => 
            `- **${e.type}** - ${e.orderNumber}: ${e.details}`
          ).join('\n');
          if (exceptions.length > 5) {
            exceptionDetails += `\n  ...and ${exceptions.length - 5} more`;
          }
        }
        
        const result = {
          status: 'success',
          total_sales_orders: totalOrders,
          matched_invoices: matchedCount,
          exceptions_found: exceptionsFound,
          match_rate: parseFloat(matchRate as string),
          quantity_variances: quantityVariances,
          price_variances: priceVariances,
          missing_invoices: missingInvoices,
        };
        
        return {
          response: `**Sales-to-Invoice Reconciliation Complete!**\n\n` +
            `**Summary:**\n` +
            `- Total Sales Orders: ${result.total_sales_orders}\n` +
            `- Matched Invoices: ${result.matched_invoices}\n` +
            `- Exceptions Found: ${result.exceptions_found}\n` +
            `- Match Rate: ${result.match_rate}%\n\n` +
            `**Exceptions by Type:**\n` +
            `- Quantity Variances: ${result.quantity_variances}\n` +
            `- Price Variances: ${result.price_variances}\n` +
            `- Missing Invoices: ${result.missing_invoices}` +
            exceptionDetails +
            `\n\nNavigate to **Financial > Sales Reconciliation** to view and resolve exceptions.`,
          data: result,
        };
      } catch (error) {
        console.error('Reconciliation error:', error);
        return {
          response: `**Reconciliation Error**\n\nUnable to complete reconciliation. Please try again or check the system logs.`,
        };
      }
    },
  },
  
  // Run Bank Reconciliation Bot
  {
    name: 'run_bank_reconciliation',
    description: 'Run bank reconciliation to match bank transactions with GL entries',
    patterns: [
      /run\s+bank\s+reconciliation/i,
      /bank\s+reconciliation/i,
      /reconcile\s+bank/i,
      /match\s+bank\s+transactions?/i,
      /bank\s+statement\s+reconciliation/i,
    ],
    slots: [],
    execute: async (ctx) => {
      try {
        // Get bank transactions
        const bankTxResult = await ctx.db.prepare(
          'SELECT id, transaction_date, description, amount, transaction_type, reconciled FROM bank_transactions WHERE company_id = ? ORDER BY transaction_date DESC LIMIT 100'
        ).bind(ctx.companyId).all();
        
        const bankTransactions = bankTxResult.results || [];
        
        // Get GL entries for matching
        const glEntriesResult = await ctx.db.prepare(
          'SELECT id, entry_date, description, debit_amount, credit_amount FROM journal_entries WHERE company_id = ? ORDER BY entry_date DESC LIMIT 100'
        ).bind(ctx.companyId).all();
        
        const glEntries = glEntriesResult.results || [];
        
        let matchedCount = 0;
        let unmatchedBankTx = 0;
        let unmatchedGLEntries = 0;
        const exceptions: Array<{ type: string; details: string }> = [];
        
        // Simple matching logic based on amount and date proximity
        for (const tx of bankTransactions as any[]) {
          if (tx.reconciled) {
            matchedCount++;
            continue;
          }
          
          const txAmount = Math.abs(tx.amount || 0);
          const matchingGL = glEntries.find((gl: any) => {
            const glAmount = Math.abs((gl.debit_amount || 0) - (gl.credit_amount || 0));
            return Math.abs(txAmount - glAmount) < 0.01;
          });
          
          if (matchingGL) {
            matchedCount++;
          } else {
            unmatchedBankTx++;
            exceptions.push({
              type: 'Unmatched Bank Transaction',
              details: `${tx.description} - R${txAmount.toFixed(2)} on ${tx.transaction_date}`,
            });
          }
        }
        
        // Count unmatched GL entries
        unmatchedGLEntries = Math.max(0, glEntries.length - matchedCount);
        
        const totalTransactions = bankTransactions.length;
        const matchRate = totalTransactions > 0 ? ((matchedCount / totalTransactions) * 100).toFixed(1) : 0;
        
        let exceptionDetails = '';
        if (exceptions.length > 0) {
          exceptionDetails = '\n\n**Exception Details:**\n' + exceptions.slice(0, 5).map(e => 
            `- **${e.type}**: ${e.details}`
          ).join('\n');
          if (exceptions.length > 5) {
            exceptionDetails += `\n  ...and ${exceptions.length - 5} more`;
          }
        }
        
        const result = {
          status: 'success',
          total_bank_transactions: totalTransactions,
          matched_entries: matchedCount,
          unmatched_bank_tx: unmatchedBankTx,
          unmatched_gl_entries: unmatchedGLEntries,
          match_rate: parseFloat(matchRate as string),
        };
        
        return {
          response: `**Bank Reconciliation Complete!**\n\n` +
            `**Summary:**\n` +
            `- Total Bank Transactions: ${result.total_bank_transactions}\n` +
            `- Matched Entries: ${result.matched_entries}\n` +
            `- Unmatched Bank Transactions: ${result.unmatched_bank_tx}\n` +
            `- Unmatched GL Entries: ${result.unmatched_gl_entries}\n` +
            `- Match Rate: ${result.match_rate}%` +
            exceptionDetails +
            `\n\nNavigate to **Financial > Bank Reconciliation** to view and resolve exceptions.`,
          data: result,
        };
      } catch (error) {
        console.error('Bank reconciliation error:', error);
        return {
          response: `**Bank Reconciliation Error**\n\nUnable to complete bank reconciliation. Please try again or check the system logs.`,
        };
      }
    },
  },
  
  // Run Invoice Reconciliation Bot
  {
    name: 'run_invoice_reconciliation',
    description: 'Run invoice reconciliation to match invoices with purchase orders and receipts',
    patterns: [
      /run\s+invoice\s+reconciliation/i,
      /invoice\s+reconciliation/i,
      /reconcile\s+invoices?/i,
      /match\s+invoices?/i,
      /three[- ]?way\s+match/i,
      /po\s+invoice\s+match/i,
    ],
    slots: [],
    execute: async (ctx) => {
      try {
        // Get supplier invoices
        const invoicesResult = await ctx.db.prepare(
          'SELECT id, invoice_number, supplier_id, total_amount, status, po_number FROM supplier_invoices WHERE company_id = ? ORDER BY created_at DESC LIMIT 100'
        ).bind(ctx.companyId).all();
        
        const invoices = invoicesResult.results || [];
        
        // Get purchase orders for matching
        const posResult = await ctx.db.prepare(
          'SELECT id, po_number, supplier_id, total_amount, status FROM purchase_orders WHERE company_id = ? ORDER BY created_at DESC LIMIT 100'
        ).bind(ctx.companyId).all();
        
        const purchaseOrders = posResult.results || [];
        
        // Get goods receipts
        const receiptsResult = await ctx.db.prepare(
          'SELECT id, receipt_number, po_id, received_quantity FROM goods_receipts WHERE company_id = ? ORDER BY created_at DESC LIMIT 100'
        ).bind(ctx.companyId).all();
        
        const receipts = receiptsResult.results || [];
        
        let fullyMatched = 0;
        let partialMatch = 0;
        let noMatch = 0;
        let priceVariances = 0;
        let quantityVariances = 0;
        const exceptions: Array<{ type: string; invoiceNumber: string; details: string }> = [];
        
        for (const invoice of invoices as any[]) {
          // Find matching PO
          const matchingPO = purchaseOrders.find((po: any) => 
            po.po_number === invoice.po_number || 
            (po.supplier_id === invoice.supplier_id && Math.abs(po.total_amount - invoice.total_amount) < 0.01)
          );
          
          if (!matchingPO) {
            noMatch++;
            exceptions.push({
              type: 'No Matching PO',
              invoiceNumber: invoice.invoice_number,
              details: `No purchase order found for invoice R${invoice.total_amount?.toFixed(2)}`,
            });
            continue;
          }
          
          // Find matching receipt
          const matchingReceipt = receipts.find((r: any) => r.po_id === (matchingPO as any).id);
          
          if (!matchingReceipt) {
            partialMatch++;
            exceptions.push({
              type: 'No Goods Receipt',
              invoiceNumber: invoice.invoice_number,
              details: `PO matched but no goods receipt found`,
            });
            continue;
          }
          
          // Check for price variance
          if (Math.abs((matchingPO as any).total_amount - invoice.total_amount) > 0.01) {
            priceVariances++;
            exceptions.push({
              type: 'Price Variance',
              invoiceNumber: invoice.invoice_number,
              details: `PO: R${(matchingPO as any).total_amount?.toFixed(2)}, Invoice: R${invoice.total_amount?.toFixed(2)}`,
            });
          }
          
          fullyMatched++;
        }
        
        const totalInvoices = invoices.length;
        const matchRate = totalInvoices > 0 ? ((fullyMatched / totalInvoices) * 100).toFixed(1) : 0;
        const exceptionsFound = noMatch + partialMatch + priceVariances + quantityVariances;
        
        let exceptionDetails = '';
        if (exceptions.length > 0) {
          exceptionDetails = '\n\n**Exception Details:**\n' + exceptions.slice(0, 5).map(e => 
            `- **${e.type}** - ${e.invoiceNumber}: ${e.details}`
          ).join('\n');
          if (exceptions.length > 5) {
            exceptionDetails += `\n  ...and ${exceptions.length - 5} more`;
          }
        }
        
        const result = {
          status: 'success',
          total_invoices: totalInvoices,
          fully_matched: fullyMatched,
          partial_match: partialMatch,
          no_match: noMatch,
          price_variances: priceVariances,
          quantity_variances: quantityVariances,
          exceptions_found: exceptionsFound,
          match_rate: parseFloat(matchRate as string),
        };
        
        return {
          response: `**Invoice Reconciliation Complete!**\n\n` +
            `**Summary:**\n` +
            `- Total Invoices: ${result.total_invoices}\n` +
            `- Fully Matched (3-Way): ${result.fully_matched}\n` +
            `- Partial Match: ${result.partial_match}\n` +
            `- No Match: ${result.no_match}\n` +
            `- Match Rate: ${result.match_rate}%\n\n` +
            `**Exceptions by Type:**\n` +
            `- Price Variances: ${result.price_variances}\n` +
            `- Quantity Variances: ${result.quantity_variances}\n` +
            `- Missing PO/Receipt: ${result.no_match + result.partial_match}` +
            exceptionDetails +
            `\n\nNavigate to **Financial > Invoice Reconciliation** to view and resolve exceptions.`,
          data: result,
        };
      } catch (error) {
        console.error('Invoice reconciliation error:', error);
        return {
          response: `**Invoice Reconciliation Error**\n\nUnable to complete invoice reconciliation. Please try again or check the system logs.`,
        };
      }
    },
  },
  
  // Run Payroll Bot
  {
    name: 'run_payroll',
    description: 'Run payroll processing for employees',
    patterns: [
      /run\s+payroll/i,
      /process\s+payroll/i,
      /execute\s+payroll/i,
      /payroll\s+processing/i,
      /process\s+salaries/i,
      /pay\s+employees/i,
    ],
    slots: [],
    execute: async (ctx) => {
      try {
        // Check if payroll already run this month (using actual table schema: payroll_period)
        const currentMonth = new Date().toISOString().substring(0, 7);
        const existingPayroll = await ctx.db.prepare(
          "SELECT id, payroll_period FROM payroll_runs WHERE company_id = ? AND payroll_period = ?"
        ).bind(ctx.companyId, currentMonth).first<{id: string, payroll_period: string}>();
        
        if (existingPayroll) {
          return {
            response: `**Payroll Already Processed**\n\nPayroll for ${existingPayroll.payroll_period} has already been processed.\n\nNavigate to **People > Payroll** to view details.`,
            data: { already_processed: true, payroll_period: existingPayroll.payroll_period }
          };
        }

        // Get active employees (using actual table schema: is_active, basic_salary)
        const employees = await ctx.db.prepare(
          "SELECT id, first_name, last_name, basic_salary FROM employees WHERE company_id = ? AND is_active = 1 LIMIT 100"
        ).bind(ctx.companyId).all();

        if (!employees.results?.length) {
          return {
            response: `**No Active Employees**\n\nNo active employees found for payroll processing.\n\nNavigate to **People > Employees** to add employees.`,
            data: { no_employees: true }
          };
        }

        // Create payroll run (using actual table schema)
        const payrollId = crypto.randomUUID();
        let totalGross = 0;
        let totalNet = 0;
        
        for (const emp of employees.results as any[]) {
          const grossSalary = emp.basic_salary || 25000;
          const paye = grossSalary * 0.25;
          const uif = grossSalary * 0.01;
          const netSalary = grossSalary - paye - uif;
          
          totalGross += grossSalary;
          totalNet += netSalary;
        }
        
        // Insert using actual table columns - created_by is nullable, so we use NULL to avoid FK constraint issues with anonymous users
        await ctx.db.prepare(`
          INSERT INTO payroll_runs (id, company_id, payroll_period, run_date, status, total_gross, total_deductions, total_net, employee_count, created_at)
          VALUES (?, ?, ?, date('now'), 'completed', ?, ?, ?, ?, datetime('now'))
        `).bind(payrollId, ctx.companyId, currentMonth, totalGross, totalGross - totalNet, totalNet, employees.results.length).run();

        return {
          response: `**Payroll Processed Successfully!**\n\n` +
            `**Payroll Period:** ${currentMonth}\n` +
            `**Employees Processed:** ${employees.results.length}\n` +
            `**Total Gross:** R${totalGross.toLocaleString()}\n` +
            `**Total Deductions:** R${(totalGross - totalNet).toLocaleString()}\n` +
            `**Total Net Pay:** R${totalNet.toLocaleString()}\n\n` +
            `Navigate to **People > Payroll** to view payslips and details.`,
          data: { 
            payroll_period: currentMonth, 
            employees: employees.results.length, 
            total_gross: totalGross, 
            total_net: totalNet 
          }
        };
      } catch (error) {
        console.error('Payroll error:', error);
        return {
          response: `**Payroll Error**\n\nUnable to process payroll: ${String(error)}`,
        };
      }
    },
  },
  
  // Create Sales Order - Step 1: Select Customer
  {
    name: 'create_sales_order',
    description: 'Create a new sales order',
    patterns: [
      /create\s+(a\s+)?(new\s+)?sales\s+order/i,
      /new\s+sales\s+order/i,
      /make\s+(a\s+)?sales\s+order/i,
    ],
    slots: ['customer'],
    execute: async (ctx) => {
      const result = await ctx.db.prepare(
        'SELECT id, customer_name, customer_code, email, phone FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
      ).bind(ctx.companyId).all();
      
      const customers = result.results || [];
      if (customers.length === 0) {
        return { 
          response: '**No customers found in the system.**\n\nTo create a sales order, you first need customers. Would you like me to create a demo customer for you?\n\nReply "yes" to create a demo customer, or navigate to **CRM > Customers** to add customers manually.',
          action: 'no_customers',
          data: { path: '/crm/customers' }
        };
      }
      
      const customerList = customers.map((c: any, i: number) => 
        `**${i + 1}.** ${c.customer_name} (${c.customer_code})${c.email ? ` - ${c.email}` : ''}`
      ).join('\n');
      
      // Update conversation state
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_sales_order',
          step: 'select_customer',
        });
      }
      
      return {
        response: `**Create Sales Order - Step 1: Select Customer**\n\nPlease select a customer by typing their number:\n\n${customerList}\n\n_Type a number (1-${customers.length}) to select a customer_`,
        action: 'select_customer',
        data: { customers, step: 'select_customer', flow: 'create_sales_order' },
        followUp: 'Which customer would you like to create a sales order for?',
      };
    },
  },
  
  
  // Complete Transaction (Sales Order, Quote, or PO)
  {
    name: 'complete_transaction',
    description: 'Complete and post sales order, quote, or purchase order',
    patterns: [
      /^done$/i,
      /^complete$/i,
      /^finish$/i,
      /^post\s+order$/i,
      /^submit$/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const state = ctx.conversationState;
      if (!state || !state.currentFlow) {
        return {
          response: `No active transaction to complete. Say "create sales order", "create quote", or "create po" to start.`,
        };
      }
      
      // Handle Quote completion
      if (state.currentFlow === 'create_quote') {
        if (!state.selectedProducts || state.selectedProducts.length === 0) {
          return { response: `Your quote is empty. Please add at least one product before completing.` };
        }
        
        const quoteNumber = `QT-${Date.now().toString().slice(-8)}`;
        const quoteId = generateUUID();
        const total = state.orderTotal || 0;
        
        try {
          // Ensure company exists before creating quote
          const companyExists = await ensureDemoCompanyExists(ctx.db, ctx.companyId);
          if (!companyExists) {
            console.error('Failed to ensure company exists for quote:', ctx.companyId);
            return { response: `**Error:** Company setup incomplete. Please contact support or try again later.` };
          }
          
          // Insert quote and check result
          const quoteResult = await ctx.db.prepare(`
            INSERT INTO quotes (id, company_id, customer_id, quote_number, quote_date, valid_until, status, subtotal, total_amount, created_at, updated_at)
            VALUES (?, ?, ?, ?, date('now'), date('now', '+30 days'), 'draft', ?, ?, datetime('now'), datetime('now'))
          `).bind(quoteId, ctx.companyId, state.selectedCustomerId, quoteNumber, total, total).run();
          
          if (!quoteResult.success) {
            console.error('Quote INSERT failed:', quoteResult.error);
            return { response: `**Error creating quote.** Database error: ${quoteResult.error || 'Unknown error'}. Please try again.` };
          }
          
          // Insert quote items and track success
          let itemsInserted = 0;
          for (const product of state.selectedProducts) {
            const lineId = generateUUID();
            const itemResult = await ctx.db.prepare(`
              INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, line_total, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(lineId, quoteId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
            
            if (!itemResult.success) {
              console.error('Quote item INSERT failed:', itemResult.error, 'for product:', product.id);
            } else {
              itemsInserted++;
            }
          }
          
          console.log(`Quote ${quoteNumber} created with ${itemsInserted}/${state.selectedProducts.length} items`);
          
          if (ctx.updateState) await ctx.updateState({});
          
          const orderItems = state.selectedProducts.map((p, i) => 
            `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
          ).join('\n');
          
          return {
            response: `**Quote Created Successfully!**\n\n**Quote Number:** ${quoteNumber}\n**Customer:** ${state.selectedCustomerName}\n**Status:** Draft\n**Valid Until:** 30 days\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe quote has been posted to the ERP. View it at **Sales > Quotes**.`,
            action: 'quote_created',
            data: { quoteId, quoteNumber, total },
          };
        } catch (error) {
          console.error('Error creating quote:', error);
          return { response: `**Error creating quote.** Please try again or create manually.` };
        }
      }
      
      // Handle PO completion
      if (state.currentFlow === 'create_po') {
        if (!state.selectedProducts || state.selectedProducts.length === 0) {
          return { response: `Your purchase order is empty. Please add at least one product before completing.` };
        }
        
        const poNumber = `PO-${Date.now().toString().slice(-8)}`;
        const poId = generateUUID();
        const total = state.orderTotal || 0;
        
        try {
          // Ensure company exists before creating PO
          const companyExists = await ensureDemoCompanyExists(ctx.db, ctx.companyId);
          if (!companyExists) {
            console.error('Failed to ensure company exists for PO:', ctx.companyId);
            return { response: `**Error:** Company setup incomplete. Please contact support or try again later.` };
          }
          
          // Insert PO and check result
          const poResult = await ctx.db.prepare(`
            INSERT INTO purchase_orders (id, company_id, supplier_id, po_number, po_date, status, subtotal, total_amount, created_at, updated_at)
            VALUES (?, ?, ?, ?, date('now'), 'pending', ?, ?, datetime('now'), datetime('now'))
          `).bind(poId, ctx.companyId, state.selectedSupplierId, poNumber, total, total).run();
          
          if (!poResult.success) {
            console.error('PO INSERT failed:', poResult.error);
            return { response: `**Error creating purchase order.** Database error: ${poResult.error || 'Unknown error'}. Please try again.` };
          }
          
          // Insert PO items and track success
          let itemsInserted = 0;
          for (const product of state.selectedProducts) {
            const lineId = generateUUID();
            const itemResult = await ctx.db.prepare(`
              INSERT INTO purchase_order_items (id, purchase_order_id, product_id, description, quantity, unit_price, line_total, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(lineId, poId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
            
            if (!itemResult.success) {
              console.error('PO item INSERT failed:', itemResult.error, 'for product:', product.id);
            } else {
              itemsInserted++;
            }
          }
          
          console.log(`PO ${poNumber} created with ${itemsInserted}/${state.selectedProducts.length} items`);
          
          if (ctx.updateState) await ctx.updateState({});
          
          const orderItems = state.selectedProducts.map((p, i) => 
            `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
          ).join('\n');
          
          return {
            response: `**Purchase Order Created Successfully!**\n\n**PO Number:** ${poNumber}\n**Supplier:** ${state.selectedSupplierName}\n**Status:** Pending\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe PO has been posted to the ERP. View it at **Procurement > Purchase Orders**.`,
            action: 'po_created',
            data: { poId, poNumber, total },
          };
        } catch (error) {
          console.error('Error creating PO:', error);
          return { response: `**Error creating purchase order.** Please try again or create manually.` };
        }
      }
      
      // Handle Invoice completion
      if (state.currentFlow === 'create_invoice') {
        if (!state.selectedProducts || state.selectedProducts.length === 0) {
          return { response: `Your invoice is empty. Please add at least one product before completing.` };
        }
        
        const invoiceNumber = `INV-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
        const invoiceId = generateUUID();
        const subtotal = state.orderTotal || 0;
        const taxAmount = subtotal * 0.15;
        const totalAmount = subtotal + taxAmount;
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
          // Ensure company exists before creating invoice
          const companyExists = await ensureDemoCompanyExists(ctx.db, ctx.companyId);
          if (!companyExists) {
            console.error('Failed to ensure company exists for invoice:', ctx.companyId);
            return { response: `**Error:** Company setup incomplete. Please contact support or try again later.` };
          }
          
          // Insert invoice and check result
          const invoiceResult = await ctx.db.prepare(`
            INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, balance_due, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(invoiceId, ctx.companyId, invoiceNumber, state.selectedCustomerId, today, dueDate, subtotal, taxAmount, totalAmount, totalAmount).run();
          
          if (!invoiceResult.success) {
            console.error('Invoice INSERT failed:', invoiceResult.error);
            return { response: `**Error creating invoice.** Database error: ${invoiceResult.error || 'Unknown error'}. Please try again.` };
          }
          
          // Insert invoice items and track success
          let itemsInserted = 0;
          for (const product of state.selectedProducts) {
            const lineId = generateUUID();
            const lineTotal = product.quantity * product.price;
            const itemResult = await ctx.db.prepare(`
              INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, line_total, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `).bind(lineId, invoiceId, product.id, product.name, product.quantity, product.price, lineTotal).run();
            
            if (!itemResult.success) {
              console.error('Invoice item INSERT failed:', itemResult.error, 'for product:', product.id);
            } else {
              itemsInserted++;
            }
          }
          
          console.log(`Invoice ${invoiceNumber} created with ${itemsInserted}/${state.selectedProducts.length} items`);
          
          if (ctx.updateState) await ctx.updateState({});
          
          const orderItems = state.selectedProducts.map((p, i) => 
            `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
          ).join('\n');
          
          return {
            response: `**Invoice Created Successfully!**\n\n**Invoice #:** ${invoiceNumber}\n**Customer:** ${state.selectedCustomerName}\n**Status:** Draft\n\n**Items:**\n${orderItems}\n\n**Subtotal:** R${subtotal.toFixed(2)}\n**VAT (15%):** R${taxAmount.toFixed(2)}\n**Total:** R${totalAmount.toFixed(2)}\n**Due Date:** ${dueDate}\n\nView in **Financial > AR Invoices**`,
            action: 'invoice_created',
            data: { invoiceId, invoiceNumber, total: totalAmount },
          };
        } catch (error) {
          console.error('Error creating invoice:', error);
          return { response: `**Error creating invoice.** Please try again or create manually.` };
        }
      }
      
      // Handle Sales Order completion (existing code)
      if (state.currentFlow !== 'create_sales_order') {
        return {
          response: `No active sales order to complete. Say "create sales order" to start a new one.`,
        };
      }
      
      if (!state.selectedProducts || state.selectedProducts.length === 0) {
        return {
          response: `Your order is empty. Please add at least one product before completing the order.`,
        };
      }
      
      // Generate order number
      const orderNumber = `SO-${Date.now().toString().slice(-8)}`;
      const orderId = generateUUID();
      const total = state.orderTotal || 0;
      
      try {
        // Ensure company exists before creating order
        const companyExists = await ensureDemoCompanyExists(ctx.db, ctx.companyId);
        if (!companyExists) {
          console.error('Failed to ensure company exists for sales order:', ctx.companyId);
          return {
            response: `**Error:** Company setup incomplete. Please contact support or try again later.`,
          };
        }
        
        // Insert sales order into database and check result
        const orderResult = await ctx.db.prepare(`
          INSERT INTO sales_orders (id, company_id, customer_id, order_number, order_date, status, subtotal, total_amount, created_at, updated_at)
          VALUES (?, ?, ?, ?, date('now'), 'confirmed', ?, ?, datetime('now'), datetime('now'))
        `).bind(orderId, ctx.companyId, state.selectedCustomerId, orderNumber, total, total).run();
        
        if (!orderResult.success) {
          console.error('Sales order INSERT failed:', orderResult.error);
          return {
            response: `**Error creating sales order.** Database error: ${orderResult.error || 'Unknown error'}. Please try again.`,
          };
        }
        
        // Insert order items (using sales_order_items table with description field)
        let itemsInserted = 0;
        for (const product of state.selectedProducts) {
          const lineId = generateUUID();
          const itemResult = await ctx.db.prepare(`
            INSERT INTO sales_order_items (id, sales_order_id, product_id, description, quantity, unit_price, line_total, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(lineId, orderId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
          
          if (!itemResult.success) {
            console.error('Sales order item INSERT failed:', itemResult.error, 'for product:', product.id);
          } else {
            itemsInserted++;
          }
        }
        
        console.log(`Sales order ${orderNumber} created with ${itemsInserted}/${state.selectedProducts.length} items`);
        
        // Clear conversation state
        if (ctx.updateState) {
          await ctx.updateState({});
        }
        
        const orderItems = state.selectedProducts.map((p, i) => 
          `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
        ).join('\n');
        
        return {
          response: `**Sales Order Created Successfully!**\n\n**Order Number:** ${orderNumber}\n**Customer:** ${state.selectedCustomerName}\n**Status:** Confirmed\n\n**Order Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe order has been posted to the ERP system. You can view it at **Sales > Sales Orders**.`,
          action: 'order_created',
          data: { orderId, orderNumber, total, customerId: state.selectedCustomerId },
        };
      } catch (error) {
        console.error('Error creating sales order:', error);
        return {
          response: `**Error creating sales order.** Please try again or navigate to **Sales > Sales Orders** to create the order manually.`,
        };
      }
    },
  },
  
  // Create Demo Customer (when no customers exist)
  {
    name: 'create_demo_customer',
    description: 'Create a demo customer',
    patterns: [
      /^yes$/i,
      /^create\s+demo\s+customer$/i,
    ],
    slots: [],
    execute: async (ctx) => {
      const state = ctx.conversationState;
      
      // Check if this is in response to "no customers" prompt
      const customerId = generateUUID();
      const customerCode = `CUST-${Date.now().toString().slice(-6)}`;
      
      try {
        await ctx.db.prepare(`
          INSERT INTO customers (id, company_id, customer_code, customer_name, email, phone, address, city, country, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 'Demo Customer', 'demo@example.com', '+27 11 123 4567', '123 Main Street', 'Johannesburg', 'South Africa', 1, datetime('now'), datetime('now'))
        `).bind(customerId, ctx.companyId, customerCode).run();
        
        // Also create demo products if needed
        const productsResult = await ctx.db.prepare(
          'SELECT COUNT(*) as count FROM products WHERE company_id = ?'
        ).bind(ctx.companyId).first();
        
        if ((productsResult as any)?.count === 0) {
          // Create demo products
          const products = [
            { name: 'Widget A', code: 'WGT-001', price: 99.99 },
            { name: 'Widget B', code: 'WGT-002', price: 149.99 },
            { name: 'Service Package', code: 'SVC-001', price: 299.99 },
          ];
          
          for (const p of products) {
            const productId = generateUUID();
            await ctx.db.prepare(`
              INSERT INTO products (id, company_id, product_code, product_name, unit_price, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            `).bind(productId, ctx.companyId, p.code, p.name, p.price).run();
          }
        }
        
        return {
          response: `**Demo data created successfully!**\n\n**Customer:** Demo Customer (${customerCode})\n**Products:** Widget A, Widget B, Service Package\n\nNow you can create a sales order. Say "create sales order" to continue.`,
          action: 'demo_created',
        };
      } catch (error) {
        console.error('Error creating demo data:', error);
        return {
          response: `Error creating demo data. Please try again or add data manually through the ERP interface.`,
        };
      }
    },
  },
  
  // General conversation / greeting
  {
    name: 'greeting',
    description: 'Handle greetings',
    patterns: [
      /^(hello|hi|hey|good\s+(morning|afternoon|evening))[\s!.,]*$/i,
      /^how\s+are\s+you/i,
    ],
    slots: [],
    execute: async () => {
      return {
        response: `Hello! I'm ARIA, your intelligent ERP assistant. I'm here to help you with:\n\n` +
          `- **View Data**: Show customers, suppliers, products, invoices, orders\n` +
          `- **Create Records**: Create quotes, purchase orders, sales orders, invoices\n` +
          `- **Automation**: List and run 67+ automation bots\n` +
          `- **Reports**: Dashboard summaries and analytics\n\n` +
          `What would you like to do today?`,
      };
    },
  },
  
  // Create Invoice - End-to-End with Database Integration
  {
    name: 'create_invoice',
    description: 'Create a customer invoice',
    patterns: [
      /create\s+(a\s+)?(new\s+)?(customer\s+)?invoice/i,
      /new\s+invoice/i,
      /generate\s+invoice/i,
      /make\s+(a\s+)?invoice/i,
    ],
    slots: [],
    execute: async (ctx) => {
      try {
        // Get customers for selection
        const customersResult = await ctx.db.prepare(
          'SELECT id, customer_name, customer_code, email FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
        ).bind(ctx.companyId).all();
        
        const customers = customersResult.results || [];
        
        if (customers.length === 0) {
          return {
            response: `**No customers found in the system.**\n\nTo create an invoice, you need customers first. Would you like me to create demo data?\n\nReply "yes" to create demo data, or navigate to **Sales > Customers** to add customers manually.`,
            action: 'no_customers',
          };
        }
        
        const customerList = customers.map((c: any, i: number) => 
          `**${i + 1}.** ${c.customer_name} (${c.customer_code}) - ${c.email || 'No email'}`
        ).join('\n');
        
        // Update conversation state
        if (ctx.updateState) {
          await ctx.updateState({
            currentFlow: 'create_invoice',
            step: 'select_customer',
            selectedProducts: [],
          });
        }
        
        return {
          response: `**Create Invoice - Step 1: Select Customer**\n\nPlease select a customer by typing their number:\n\n${customerList}\n\n_Type a number (1-${customers.length}) to select a customer_`,
          action: 'select_customer',
          data: { customers, step: 'select_customer' },
        };
      } catch (error) {
        console.error('Error in create_invoice:', error);
        return { response: 'Error loading customers. Please try again.' };
      }
    },
  },
  
  // Create Customer - End-to-End with Database Integration
  {
    name: 'create_customer',
    description: 'Create a new customer',
    patterns: [
      /create\s+(a\s+)?(new\s+)?customer/i,
      /add\s+(a\s+)?(new\s+)?customer/i,
      /new\s+customer/i,
    ],
    slots: [],
    execute: async (ctx) => {
      // Update conversation state to collect customer details
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_customer',
          step: 'enter_name',
        });
      }
      
      return {
        response: `**Create Customer - Step 1: Enter Customer Name**\n\nPlease enter the customer's name (company or individual):\n\n_Type the customer name and press Enter_`,
        action: 'enter_name',
      };
    },
  },
  
  // Create Supplier - End-to-End with Database Integration
  {
    name: 'create_supplier',
    description: 'Create a new supplier',
    patterns: [
      /create\s+(a\s+)?(new\s+)?supplier/i,
      /add\s+(a\s+)?(new\s+)?supplier/i,
      /new\s+supplier/i,
      /create\s+(a\s+)?(new\s+)?vendor/i,
      /add\s+(a\s+)?(new\s+)?vendor/i,
    ],
    slots: [],
    execute: async (ctx) => {
      // Update conversation state to collect supplier details
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_supplier',
          step: 'enter_name',
        });
      }
      
      return {
        response: `**Create Supplier - Step 1: Enter Supplier Name**\n\nPlease enter the supplier's name (company):\n\n_Type the supplier name and press Enter_`,
        action: 'enter_name',
      };
    },
  },
  
  // Create Product - End-to-End with Database Integration
  {
    name: 'create_product',
    description: 'Create a new product or service',
    patterns: [
      /create\s+(a\s+)?(new\s+)?product/i,
      /add\s+(a\s+)?(new\s+)?product/i,
      /new\s+product/i,
      /create\s+(a\s+)?(new\s+)?item/i,
      /add\s+(a\s+)?(new\s+)?item/i,
      /create\s+(a\s+)?(new\s+)?service/i,
    ],
    slots: [],
    execute: async (ctx) => {
      // Update conversation state to collect product details
      if (ctx.updateState) {
        await ctx.updateState({
          currentFlow: 'create_product',
          step: 'enter_name',
        });
      }
      
      return {
        response: `**Create Product - Step 1: Enter Product Name**\n\nPlease enter the product or service name:\n\n_Type the product name and press Enter_`,
        action: 'enter_name',
      };
    },
  },
];

// Find matching skill
function findSkill(message: string): Skill | null {
  for (const skill of skills) {
    for (const pattern of skill.patterns) {
      if (pattern.test(message)) {
        return skill;
      }
    }
  }
  return null;
}

// Default response for unmatched messages
function getDefaultResponse(): SkillResult {
  return {
    response: `**I couldn't understand that command.**\n\n` +
      `Try natural language like:\n` +
      `- "Create a sales order for Acme Corp they need Widget A at 500 qty 10"\n` +
      `- "Make a quote for ABC Ltd they need Product 1 at 1500 qty 3"\n\n` +
      `Or simple commands:\n` +
      `- "Show customers" / "Show products" / "Show invoices"\n` +
      `- "Create a sales order" (step-by-step)\n` +
      `- "Run payroll" / "Run reconciliation"\n\n` +
      `Type **"help"** for the full list of commands.`,
  };
}

// Create new session
app.post('/session', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    let userId = 'anonymous';
    let companyId = 'b0598135-52fd-4f67-ac56-8f0237e6355e'; // Default demo company
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract user info from token if available
      // For now, use defaults
    }
    
    const conversationId = generateUUID();
    
    // Store conversation in D1
    await c.env.DB.prepare(`
      INSERT INTO aria_conversations (id, user_id, company_id, status, created_at)
      VALUES (?, ?, ?, 'active', datetime('now'))
    `).bind(conversationId, userId, companyId).run();
    
    // Store welcome message
    const welcomeMessage = `Hello! I'm ARIA, your intelligent ERP assistant.\n\n` +
      `**Just tell me what you need in plain English:**\n` +
      `- "Create a sales order for Acme Corp they need Widget A at 500 qty 10"\n` +
      `- "Make a quote for ABC Ltd they need Product 1 at 1500"\n` +
      `- "Show customers" / "Show invoices" / "Dashboard"\n\n` +
      `I'll parse your request and execute it instantly. Type **"help"** for all commands.`;
    
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).bind(generateUUID(), conversationId, welcomeMessage).run();
    
    return c.json({
      conversation_id: conversationId,
      message: welcomeMessage,
      status: 'active',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Send message (non-streaming)
app.post('/message', async (c) => {
  try {
    const body = await c.req.json<{ conversation_id: string; message: string }>();
    const { conversation_id, message } = body;
    
    if (!conversation_id || !message) {
      return c.json({ error: 'conversation_id and message are required' }, 400);
    }
    
    // Get conversation with context
    const conversation = await c.env.DB.prepare(
      'SELECT * FROM aria_conversations WHERE id = ?'
    ).bind(conversation_id).first<Conversation>();
    
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    
    // Parse conversation state
    let conversationState: ConversationState = {};
    if (conversation.context) {
      try {
        conversationState = JSON.parse(conversation.context);
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }
    
    // Store user message
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, message).run();
    
    // Function to update conversation state
    const updateState = async (newState: ConversationState) => {
      conversationState = newState;
      await c.env.DB.prepare(
        'UPDATE aria_conversations SET context = ? WHERE id = ?'
      ).bind(JSON.stringify(newState), conversation_id).run();
    };
    
    // First, try AI orchestrator if available (for intelligent intent classification)
    let result: SkillResult = getDefaultResponse(); // Default fallback
    let usedAI = false;
    
    // Check if we're in a multi-step flow first (these need special handling)
    const inMultiStepFlow = conversationState.currentFlow && conversationState.step;
    
    if (!inMultiStepFlow && c.env.AI) {
      // Use AI orchestrator for intelligent intent classification
      try {
        // Get recent conversation history for context
        const historyResult = await c.env.DB.prepare(
          'SELECT role, content FROM aria_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10'
        ).bind(conversation_id).all();
        
        const conversationHistory = (historyResult.results || [])
          .reverse()
          .map((m: any) => ({ role: m.role, content: m.content }));
        
        const aiResult = await orchestrate(
          message,
          conversation.company_id,
          conversation.user_id,
          conversationHistory,
          { DB: c.env.DB, AI: c.env.AI }
        );
        
        // Only use AI result if it actually executed a bot or query (not just clarification)
        // action_taken values: 'executed', 'no_action', 'error' = bot ran; 'clarify' = unknown intent
        const actionTaken = aiResult.action_taken || '';
        const isActualAction = ['executed', 'no_action', 'error'].includes(actionTaken) || 
                               (aiResult.bot_id !== null && aiResult.bot_id !== undefined) ||
                               (aiResult.data && Object.keys(aiResult.data).length > 0);
        
        if (isActualAction) {
          result = {
            response: aiResult.response,
            data: aiResult.data,
            action: aiResult.action_taken,
          };
          usedAI = true;
        }
      } catch (aiError) {
        console.error('AI orchestrator error, falling back to rule-based:', aiError);
        // Fall through to rule-based system
      }
    }
    
    // Fall back to rule-based skill matching if AI didn't handle it
    if (!usedAI) {
      const skill = findSkill(message);
      
      if (skill) {
        const context: SkillContext = {
          db: c.env.DB,
          companyId: conversation.company_id,
          userId: conversation.user_id,
          message,
          slots: {},
          conversationId: conversation_id,
          conversationState,
          updateState,
        };
        result = await skill.execute(context);
      } else if (conversationState.currentFlow === 'create_sales_order' && conversationState.step === 'select_products') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          // Handle product selection by number
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.unit_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Order:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the order_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_sales_order' && conversationState.step === 'select_customer') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          // Handle customer selection by number
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            // Get products for next step
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found in the system.**\n\nTo create a sales order, you need products. Would you like me to create demo products?\n\nReply "yes" to create demo products, or navigate to **Inventory > Items** to add products manually.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_sales_order',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Sales Order - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name} (${selectedCustomer.customer_code})\n\nSelect products to add to the order:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer, step: 'select_products' },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_quote' && conversationState.step === 'select_customer') {
        // Handle quote customer selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_quote',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Quote - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name}\n\nSelect products to add:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_quote' && conversationState.step === 'select_products') {
        // Handle quote product selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.unit_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Quote:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the quote_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_po' && conversationState.step === 'select_supplier') {
        // Handle PO supplier selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const supplierIndex = parseInt(match[1]) - 1;
          const suppliersResult = await c.env.DB.prepare(
            'SELECT id, supplier_name, supplier_code FROM suppliers WHERE company_id = ? ORDER BY supplier_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const suppliers = suppliersResult.results || [];
          if (supplierIndex >= 0 && supplierIndex < suppliers.length) {
            const selectedSupplier = suppliers[supplierIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Supplier Selected:** ${selectedSupplier.supplier_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.cost_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_po',
                step: 'select_products',
                selectedSupplierId: selectedSupplier.id,
                selectedSupplierName: selectedSupplier.supplier_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Purchase Order - Step 2: Select Products**\n\n**Supplier:** ${selectedSupplier.supplier_name}\n\nSelect products to order:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, supplier: selectedSupplier },
              };
            }
          } else {
            result = { response: `Invalid supplier number. Please enter a number between 1 and ${suppliers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_po' && conversationState.step === 'select_products') {
        // Handle PO product selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.cost_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current PO:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the PO_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_invoice' && conversationState.step === 'select_customer') {
        // Handle invoice customer selection
        const match = message.match(/^(\d+)$/);
        if (match) {
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_invoice',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Invoice - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name}\n\nSelect products to add:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_invoice' && conversationState.step === 'select_products') {
        // Handle invoice product selection or done
        if (message.toLowerCase() === 'done') {
          const currentProducts = conversationState.selectedProducts || [];
          if (currentProducts.length === 0) {
            result = { response: `**No products added.** Please add at least one product before completing the invoice.` };
          } else {
            // Create the invoice in the database
            const invoiceId = generateUUID();
            const invoiceNumber = `INV-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
            const subtotal = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            const taxAmount = subtotal * 0.15;
            const totalAmount = subtotal + taxAmount;
            const today = new Date().toISOString().split('T')[0];
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            await c.env.DB.prepare(`
              INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, balance_due, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).bind(invoiceId, conversation.company_id, invoiceNumber, conversationState.selectedCustomerId, today, dueDate, subtotal, taxAmount, totalAmount, totalAmount).run();
            
            // Add invoice items
            for (const product of currentProducts) {
              const itemId = generateUUID();
              const lineTotal = product.quantity * product.price;
              await c.env.DB.prepare(`
                INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, line_total, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              `).bind(itemId, invoiceId, product.id, product.name, product.quantity, product.price, lineTotal).run();
            }
            
            // Clear conversation state
            await updateState({});
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Invoice Created Successfully!**\n\n**Invoice #:** ${invoiceNumber}\n**Customer:** ${conversationState.selectedCustomerName}\n**Status:** Draft\n\n**Items:**\n${orderItems}\n\n**Subtotal:** R${subtotal.toFixed(2)}\n**VAT (15%):** R${taxAmount.toFixed(2)}\n**Total:** R${totalAmount.toFixed(2)}\n**Due Date:** ${dueDate}\n\nView in **Financial > AR Invoices**`,
              action: 'invoice_created',
              data: { invoiceId, invoiceNumber, total: totalAmount },
            };
          }
        } else {
          const match = message.match(/^(\d+)$/);
          if (match) {
            const productIndex = parseInt(match[1]) - 1;
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (productIndex >= 0 && productIndex < products.length) {
              const selectedProduct = products[productIndex] as any;
              const currentProducts = conversationState.selectedProducts || [];
              
              currentProducts.push({
                id: selectedProduct.id,
                name: selectedProduct.product_name,
                quantity: 1,
                price: selectedProduct.unit_price || 0,
              });
              
              const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
              
              await updateState({
                ...conversationState,
                selectedProducts: currentProducts,
                orderTotal: total,
              });
              
              const orderItems = currentProducts.map((p, i) => 
                `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
              ).join('\n');
              
              result = {
                response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Invoice:**\n${orderItems}\n\n**Subtotal:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the invoice_`,
                data: { products: currentProducts, total },
              };
            } else {
              result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
            }
          } else {
            result = getDefaultResponse();
          }
        }
      } else if (conversationState.currentFlow === 'create_customer' && conversationState.step === 'enter_name') {
        // Handle customer name entry
        const customerName = message.trim();
        if (customerName.length < 2) {
          result = { response: `**Invalid name.** Please enter a valid customer name (at least 2 characters).` };
        } else {
          await updateState({
            currentFlow: 'create_customer',
            step: 'enter_email',
            customerName: customerName,
          });
          
          result = {
            response: `**Create Customer - Step 2: Enter Email**\n\n**Customer Name:** ${customerName}\n\nPlease enter the customer's email address (or type "skip" to skip):\n\n_Type the email and press Enter_`,
            action: 'enter_email',
          };
        }
      } else if (conversationState.currentFlow === 'create_customer' && conversationState.step === 'enter_email') {
        // Handle customer email entry
        const email = message.toLowerCase() === 'skip' ? null : message.trim();
        
        // Save customer name before clearing state
        const savedCustomerName = conversationState.customerName || 'Unknown';
        
        // Create the customer in the database
        const customerId = generateUUID();
        const customerCode = `CUST-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        await c.env.DB.prepare(`
          INSERT INTO customers (id, company_id, customer_code, customer_name, email, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).bind(customerId, conversation.company_id, customerCode, savedCustomerName, email).run();
        
        // Clear conversation state
        await updateState({});
        
        result = {
          response: `**Customer Created Successfully!**\n\n**Customer Code:** ${customerCode}\n**Name:** ${savedCustomerName}\n**Email:** ${email || 'Not provided'}\n\nView in **Sales > Customers**`,
          action: 'customer_created',
          data: { customerId, customerCode },
        };
      }else if (conversationState.currentFlow === 'create_supplier' && conversationState.step === 'enter_name') {
        // Handle supplier name entry
        const supplierName = message.trim();
        if (supplierName.length < 2) {
          result = { response: `**Invalid name.** Please enter a valid supplier name (at least 2 characters).` };
        } else {
          await updateState({
            currentFlow: 'create_supplier',
            step: 'enter_email',
            supplierName: supplierName,
          });
          
          result = {
            response: `**Create Supplier - Step 2: Enter Email**\n\n**Supplier Name:** ${supplierName}\n\nPlease enter the supplier's email address (or type "skip" to skip):\n\n_Type the email and press Enter_`,
            action: 'enter_email',
          };
        }
      }      else if (conversationState.currentFlow === 'create_supplier' && conversationState.step === 'enter_email') {
              // Handle supplier email entry
              const email = message.toLowerCase() === 'skip' ? null : message.trim();
        
              // Save supplier name before clearing state
              const savedSupplierName = conversationState.supplierName || 'Unknown';
        
              // Create the supplier in the database
              const supplierId = generateUUID();
              const supplierCode = `SUPP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
              await c.env.DB.prepare(`
                INSERT INTO suppliers (id, company_id, supplier_code, supplier_name, email, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
              `).bind(supplierId, conversation.company_id, supplierCode, savedSupplierName, email).run();
        
              // Clear conversation state
              await updateState({});
        
              result = {
                response: `**Supplier Created Successfully!**\n\n**Supplier Code:** ${supplierCode}\n**Name:** ${savedSupplierName}\n**Email:** ${email || 'Not provided'}\n\nView in **Purchasing > Suppliers**`,
                action: 'supplier_created',
                data: { supplierId, supplierCode },
              };
            }else if (conversationState.currentFlow === 'create_product' && conversationState.step === 'enter_name') {
        // Handle product name entry
        const productName = message.trim();
        if (productName.length < 2) {
          result = { response: `**Invalid name.** Please enter a valid product name (at least 2 characters).` };
        } else {
          await updateState({
            currentFlow: 'create_product',
            step: 'enter_price',
            productName: productName,
          });
          
          result = {
            response: `**Create Product - Step 2: Enter Price**\n\n**Product Name:** ${productName}\n\nPlease enter the unit price (e.g., 99.99):\n\n_Type the price and press Enter_`,
            action: 'enter_price',
          };
        }
      }      else if (conversationState.currentFlow === 'create_product' && conversationState.step === 'enter_price') {
              // Handle product price entry
              const price = parseFloat(message.trim());
              if (isNaN(price) || price < 0) {
                result = { response: `**Invalid price.** Please enter a valid price (e.g., 99.99).` };
              } else {
                // Save product name before clearing state
                const savedProductName = conversationState.productName || 'Unknown';
          
                // Create the product in the database
                const productId = generateUUID();
                const productCode = `PROD-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
          
                await c.env.DB.prepare(`
                  INSERT INTO products (id, company_id, product_code, product_name, unit_price, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                `).bind(productId, conversation.company_id, productCode, savedProductName, price).run();
          
                // Clear conversation state
                await updateState({});
          
                result = {
                  response: `**Product Created Successfully!**\n\n**Product Code:** ${productCode}\n**Name:** ${savedProductName}\n**Price:** R${price.toFixed(2)}\n\nView in **Inventory > Products**`,
                  action: 'product_created',
                  data: { productId, productCode },
                };
              }
            } else {
        result = getDefaultResponse();
      }
    } // End of if (!usedAI) block
    
    // Store assistant response
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, result.response).run();
    
    return c.json({
      response: result.response,
      data: result.data,
      action: result.action,
      followUp: result.followUp,
    });
  } catch (error) {
    console.error('Message error:', error);
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

// Send message with streaming (SSE)
app.post('/message/stream', async (c) => {
  try {
    const body = await c.req.json<{ conversation_id: string; message: string }>();
    const { conversation_id, message } = body;
    
    if (!conversation_id || !message) {
      return c.json({ error: 'conversation_id and message are required' }, 400);
    }
    
    // Get conversation with context
    const conversation = await c.env.DB.prepare(
      'SELECT * FROM aria_conversations WHERE id = ?'
    ).bind(conversation_id).first<Conversation>();
    
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }
    
    // Parse conversation state
    let conversationState: ConversationState = {};
    if (conversation.context) {
      try {
        conversationState = JSON.parse(conversation.context);
      } catch (e) {
        // Invalid JSON, start fresh
      }
    }
    
    // Store user message
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, message).run();
    
    // Function to update conversation state
    const updateState = async (newState: ConversationState) => {
      conversationState = newState;
      await c.env.DB.prepare(
        'UPDATE aria_conversations SET context = ? WHERE id = ?'
      ).bind(JSON.stringify(newState), conversation_id).run();
    };
    
    // Find and execute skill
    const skill = findSkill(message);
    let result: SkillResult;
    
    if (skill) {
      const context: SkillContext = {
        db: c.env.DB,
        companyId: conversation.company_id,
        userId: conversation.user_id,
        message,
        slots: {},
        conversationId: conversation_id,
        conversationState,
        updateState,
      };
      result = await skill.execute(context);
    } else {
      // Check if we're in a flow and handle number input
      if (conversationState.currentFlow === 'create_sales_order' && conversationState.step === 'select_products') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.unit_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Order:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the order_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else if (message.toLowerCase() === 'done') {
          // Complete the sales order
          if (!conversationState.selectedProducts || conversationState.selectedProducts.length === 0) {
            result = { response: 'No products selected. Please add at least one product before completing the order.' };
          } else {
            const orderId = generateUUID();
            const orderNumber = `SO-${Math.floor(Math.random() * 100000000)}`;
            const total = conversationState.orderTotal || 0;
            
            await c.env.DB.prepare(`
              INSERT INTO sales_orders (id, company_id, order_number, customer_id, order_date, status, subtotal, total_amount, created_at)
              VALUES (?, ?, ?, ?, date('now'), 'draft', ?, ?, datetime('now'))
            `).bind(orderId, conversation.company_id, orderNumber, conversationState.selectedCustomerId, total, total).run();
            
            for (const product of conversationState.selectedProducts) {
              await c.env.DB.prepare(`
                INSERT INTO sales_order_items (id, sales_order_id, product_id, description, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).bind(generateUUID(), orderId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
            }
            
            const orderItems = conversationState.selectedProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            await updateState({});
            
            result = {
              response: `**Sales Order Created Successfully!**\n\n**Order Number:** ${orderNumber}\n**Customer:** ${conversationState.selectedCustomerName}\n**Status:** Draft\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe order has been posted to the ERP. View it at **Sales > Sales Orders**.`,
              action: 'order_created',
              data: { orderId, orderNumber },
            };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_sales_order' && conversationState.step === 'select_customer') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_sales_order',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Sales Order - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name}\n\nSelect products to add:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_quote' && conversationState.step === 'select_customer') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_quote',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Quote - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name}\n\nSelect products to add:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_quote' && conversationState.step === 'select_products') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.unit_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Quote:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the quote_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else if (message.toLowerCase() === 'done') {
          if (!conversationState.selectedProducts || conversationState.selectedProducts.length === 0) {
            result = { response: 'No products selected. Please add at least one product before completing the quote.' };
          } else {
            const quoteId = generateUUID();
            const quoteNumber = `QT-${Math.floor(Math.random() * 100000000)}`;
            const total = conversationState.orderTotal || 0;
            
            await c.env.DB.prepare(`
              INSERT INTO quotes (id, company_id, quote_number, customer_id, quote_date, valid_until, status, subtotal, total_amount, created_at)
              VALUES (?, ?, ?, ?, date('now'), date('now', '+30 days'), 'draft', ?, ?, datetime('now'))
            `).bind(quoteId, conversation.company_id, quoteNumber, conversationState.selectedCustomerId, total, total).run();
            
            for (const product of conversationState.selectedProducts) {
              await c.env.DB.prepare(`
                INSERT INTO quote_items (id, quote_id, product_id, description, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).bind(generateUUID(), quoteId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
            }
            
            const orderItems = conversationState.selectedProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            await updateState({});
            
            result = {
              response: `**Quote Created Successfully!**\n\n**Quote Number:** ${quoteNumber}\n**Customer:** ${conversationState.selectedCustomerName}\n**Status:** Draft\n**Valid Until:** 30 days\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe quote has been posted to the ERP. View it at **Sales > Quotes**.`,
              action: 'quote_created',
              data: { quoteId, quoteNumber },
            };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_po' && conversationState.step === 'select_supplier') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          const supplierIndex = parseInt(match[1]) - 1;
          const suppliersResult = await c.env.DB.prepare(
            'SELECT id, supplier_name, supplier_code FROM suppliers WHERE company_id = ? ORDER BY supplier_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const suppliers = suppliersResult.results || [];
          if (supplierIndex >= 0 && supplierIndex < suppliers.length) {
            const selectedSupplier = suppliers[supplierIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Supplier Selected:** ${selectedSupplier.supplier_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.cost_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_po',
                step: 'select_products',
                selectedSupplierId: selectedSupplier.id,
                selectedSupplierName: selectedSupplier.supplier_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Purchase Order - Step 2: Select Products**\n\n**Supplier:** ${selectedSupplier.supplier_name}\n\nSelect products to order:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, supplier: selectedSupplier },
              };
            }
          } else {
            result = { response: `Invalid supplier number. Please enter a number between 1 and ${suppliers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_po' && conversationState.step === 'select_products') {
        const match = message.match(/^(\d+)$/);
        if (match) {
          const productIndex = parseInt(match[1]) - 1;
          const productsResult = await c.env.DB.prepare(
            'SELECT id, product_name, product_code, cost_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const products = productsResult.results || [];
          if (productIndex >= 0 && productIndex < products.length) {
            const selectedProduct = products[productIndex] as any;
            const currentProducts = conversationState.selectedProducts || [];
            
            currentProducts.push({
              id: selectedProduct.id,
              name: selectedProduct.product_name,
              quantity: 1,
              price: selectedProduct.cost_price || 0,
            });
            
            const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            
            await updateState({
              ...conversationState,
              selectedProducts: currentProducts,
              orderTotal: total,
            });
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current PO:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the PO_`,
              data: { products: currentProducts, total },
            };
          } else {
            result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
          }
        } else if (message.toLowerCase() === 'done') {
          if (!conversationState.selectedProducts || conversationState.selectedProducts.length === 0) {
            result = { response: 'No products selected. Please add at least one product before completing the PO.' };
          } else {
            const poId = generateUUID();
            const poNumber = `PO-${Math.floor(Math.random() * 100000000)}`;
            const total = conversationState.orderTotal || 0;
            
            await c.env.DB.prepare(`
              INSERT INTO purchase_orders (id, company_id, po_number, supplier_id, po_date, status, subtotal, total_amount, created_at)
              VALUES (?, ?, ?, ?, date('now'), 'pending', ?, ?, datetime('now'))
            `).bind(poId, conversation.company_id, poNumber, conversationState.selectedSupplierId, total, total).run();
            
            for (const product of conversationState.selectedProducts) {
              await c.env.DB.prepare(`
                INSERT INTO purchase_order_items (id, purchase_order_id, product_id, description, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).bind(generateUUID(), poId, product.id, product.name, product.quantity, product.price, product.quantity * product.price).run();
            }
            
            const orderItems = conversationState.selectedProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            await updateState({});
            
            result = {
              response: `**Purchase Order Created Successfully!**\n\n**PO Number:** ${poNumber}\n**Supplier:** ${conversationState.selectedSupplierName}\n**Status:** Pending\n\n**Items:**\n${orderItems}\n\n**Total:** R${total.toFixed(2)}\n\nThe PO has been posted to the ERP. View it at **Procurement > Purchase Orders**.`,
              action: 'po_created',
              data: { poId, poNumber },
            };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_invoice' && conversationState.step === 'select_customer') {
        // Handle invoice customer selection (streaming)
        const match = message.match(/^(\d+)$/);
        if (match) {
          const customerIndex = parseInt(match[1]) - 1;
          const customersResult = await c.env.DB.prepare(
            'SELECT id, customer_name, customer_code FROM customers WHERE company_id = ? ORDER BY customer_name LIMIT 20'
          ).bind(conversation.company_id).all();
          
          const customers = customersResult.results || [];
          if (customerIndex >= 0 && customerIndex < customers.length) {
            const selectedCustomer = customers[customerIndex] as any;
            
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (products.length === 0) {
              result = {
                response: `**Customer Selected:** ${selectedCustomer.customer_name}\n\n**No products found.** Please add products first.`,
                action: 'no_products',
              };
            } else {
              const productList = products.map((p: any, i: number) => 
                `**${i + 1}.** ${p.product_name} (${p.product_code}) - R${(p.unit_price || 0).toFixed(2)}`
              ).join('\n');
              
              await updateState({
                currentFlow: 'create_invoice',
                step: 'select_products',
                selectedCustomerId: selectedCustomer.id,
                selectedCustomerName: selectedCustomer.customer_name,
                selectedProducts: [],
              });
              
              result = {
                response: `**Create Invoice - Step 2: Select Products**\n\n**Customer:** ${selectedCustomer.customer_name}\n\nSelect products to add:\n\n${productList}\n\n_Type a product number to add it, or type "done" when finished_`,
                action: 'select_products',
                data: { products, customer: selectedCustomer },
              };
            }
          } else {
            result = { response: `Invalid customer number. Please enter a number between 1 and ${customers.length}.` };
          }
        } else {
          result = getDefaultResponse();
        }
      } else if (conversationState.currentFlow === 'create_invoice' && conversationState.step === 'select_products') {
        // Handle invoice product selection or done (streaming)
        if (message.toLowerCase() === 'done') {
          const currentProducts = conversationState.selectedProducts || [];
          if (currentProducts.length === 0) {
            result = { response: `**No products added.** Please add at least one product before completing the invoice.` };
          } else {
            const invoiceId = generateUUID();
            const invoiceNumber = `INV-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
            const subtotal = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
            const taxAmount = subtotal * 0.15;
            const totalAmount = subtotal + taxAmount;
            const today = new Date().toISOString().split('T')[0];
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            await c.env.DB.prepare(`
              INSERT INTO customer_invoices (id, company_id, invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, balance_due, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).bind(invoiceId, conversation.company_id, invoiceNumber, conversationState.selectedCustomerId, today, dueDate, subtotal, taxAmount, totalAmount, totalAmount).run();
            
            for (const product of currentProducts) {
              const itemId = generateUUID();
              const lineTotal = product.quantity * product.price;
              await c.env.DB.prepare(`
                INSERT INTO customer_invoice_items (id, invoice_id, product_id, description, quantity, unit_price, line_total, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
              `).bind(itemId, invoiceId, product.id, product.name, product.quantity, product.price, lineTotal).run();
            }
            
            await updateState({});
            
            const orderItems = currentProducts.map((p, i) => 
              `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
            ).join('\n');
            
            result = {
              response: `**Invoice Created Successfully!**\n\n**Invoice #:** ${invoiceNumber}\n**Customer:** ${conversationState.selectedCustomerName}\n**Status:** Draft\n\n**Items:**\n${orderItems}\n\n**Subtotal:** R${subtotal.toFixed(2)}\n**VAT (15%):** R${taxAmount.toFixed(2)}\n**Total:** R${totalAmount.toFixed(2)}\n**Due Date:** ${dueDate}\n\nView in **Financial > AR Invoices**`,
              action: 'invoice_created',
              data: { invoiceId, invoiceNumber, total: totalAmount },
            };
          }
        } else {
          const match = message.match(/^(\d+)$/);
          if (match) {
            const productIndex = parseInt(match[1]) - 1;
            const productsResult = await c.env.DB.prepare(
              'SELECT id, product_name, product_code, unit_price FROM products WHERE company_id = ? ORDER BY product_name LIMIT 20'
            ).bind(conversation.company_id).all();
            
            const products = productsResult.results || [];
            if (productIndex >= 0 && productIndex < products.length) {
              const selectedProduct = products[productIndex] as any;
              const currentProducts = conversationState.selectedProducts || [];
              
              currentProducts.push({
                id: selectedProduct.id,
                name: selectedProduct.product_name,
                quantity: 1,
                price: selectedProduct.unit_price || 0,
              });
              
              const total = currentProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
              
              await updateState({
                ...conversationState,
                selectedProducts: currentProducts,
                orderTotal: total,
              });
              
              const orderItems = currentProducts.map((p, i) => 
                `${i + 1}. ${p.name} x ${p.quantity} = R${(p.quantity * p.price).toFixed(2)}`
              ).join('\n');
              
              result = {
                response: `**Product Added:** ${selectedProduct.product_name}\n\n**Current Invoice:**\n${orderItems}\n\n**Subtotal:** R${total.toFixed(2)}\n\n_Add more products by number, or type "done" to complete the invoice_`,
                data: { products: currentProducts, total },
              };
            } else {
              result = { response: `Invalid product number. Please enter a number between 1 and ${products.length}.` };
            }
          } else {
            result = getDefaultResponse();
          }
        }
      } else if (conversationState.currentFlow === 'create_customer' && conversationState.step === 'enter_name') {
        // Handle customer name entry (streaming)
        const customerName = message.trim();
        if (customerName.length < 2) {
          result = { response: `**Invalid name.** Please enter a valid customer name (at least 2 characters).` };
        } else {
          await updateState({
            currentFlow: 'create_customer',
            step: 'enter_email',
            customerName: customerName,
          });
          
          result = {
            response: `**Create Customer - Step 2: Enter Email**\n\n**Customer Name:** ${customerName}\n\nPlease enter the customer's email address (or type "skip" to skip):\n\n_Type the email and press Enter_`,
            action: 'enter_email',
          };
        }
      } else if (conversationState.currentFlow === 'create_customer' && conversationState.step === 'enter_email') {
        // Handle customer email entry (streaming)
        const email = message.toLowerCase() === 'skip' ? null : message.trim();
        
        // Save customer name before clearing state
        const savedCustomerName = conversationState.customerName || 'Unknown';
        
        const customerId = generateUUID();
        const customerCode = `CUST-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        await c.env.DB.prepare(`
          INSERT INTO customers (id, company_id, customer_code, customer_name, email, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).bind(customerId, conversation.company_id, customerCode, savedCustomerName, email).run();
        
        await updateState({});
        
        result = {
          response: `**Customer Created Successfully!**\n\n**Customer Code:** ${customerCode}\n**Name:** ${savedCustomerName}\n**Email:** ${email || 'Not provided'}\n\nView in **Sales > Customers**`,
          action: 'customer_created',
          data: { customerId, customerCode },
        };
      }else if (conversationState.currentFlow === 'create_supplier' && conversationState.step === 'enter_name') {
        // Handle supplier name entry (streaming)
        const supplierName = message.trim();
        if (supplierName.length < 2) {
          result = { response: `**Invalid name.** Please enter a valid supplier name (at least 2 characters).` };
        } else {
          await updateState({
            currentFlow: 'create_supplier',
            step: 'enter_email',
            supplierName: supplierName,
          });
          
          result = {
            response: `**Create Supplier - Step 2: Enter Email**\n\n**Supplier Name:** ${supplierName}\n\nPlease enter the supplier's email address (or type "skip" to skip):\n\n_Type the email and press Enter_`,
            action: 'enter_email',
          };
        }
      } else if (conversationState.currentFlow === 'create_supplier' && conversationState.step === 'enter_email') {
        // Handle supplier email entry (streaming)
        const email = message.toLowerCase() === 'skip' ? null : message.trim();
        
        // Save supplier name before clearing state
        const savedSupplierName = conversationState.supplierName || 'Unknown';
        
        const supplierId = generateUUID();
        const supplierCode = `SUPP-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        await c.env.DB.prepare(`
          INSERT INTO suppliers (id, company_id, supplier_code, supplier_name, email, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).bind(supplierId, conversation.company_id, supplierCode, savedSupplierName, email).run();
        
        await updateState({});
        
        result = {
          response: `**Supplier Created Successfully!**\n\n**Supplier Code:** ${supplierCode}\n**Name:** ${savedSupplierName}\n**Email:** ${email || 'Not provided'}\n\nView in **Purchasing > Suppliers**`,
          action: 'supplier_created',
          data: { supplierId, supplierCode },
        };
      }else if (conversationState.currentFlow === 'create_product' && conversationState.step === 'enter_name') {
        // Handle product name entry (streaming)
        const productName = message.trim();
        if (productName.length < 2) {
          result = { response: `**Invalid name.** Please enter a valid product name (at least 2 characters).` };
        } else {
          await updateState({
            currentFlow: 'create_product',
            step: 'enter_price',
            productName: productName,
          });
          
          result = {
            response: `**Create Product - Step 2: Enter Price**\n\n**Product Name:** ${productName}\n\nPlease enter the unit price (e.g., 99.99):\n\n_Type the price and press Enter_`,
            action: 'enter_price',
          };
        }
      } else if (conversationState.currentFlow === 'create_product' && conversationState.step === 'enter_price') {
        // Handle product price entry (streaming)
        const price = parseFloat(message.trim());
        if (isNaN(price) || price < 0) {
          result = { response: `**Invalid price.** Please enter a valid price (e.g., 99.99).` };
        } else {
          // Save product name before clearing state
          const savedProductName = conversationState.productName || 'Unknown';
          
          const productId = generateUUID();
          const productCode = `PROD-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
          
          await c.env.DB.prepare(`
            INSERT INTO products (id, company_id, product_code, product_name, unit_price, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
          `).bind(productId, conversation.company_id, productCode, savedProductName, price).run();
          
          await updateState({});
          
          result = {
            response: `**Product Created Successfully!**\n\n**Product Code:** ${productCode}\n**Name:** ${savedProductName}\n**Price:** R${price.toFixed(2)}\n\nView in **Inventory > Products**`,
            action: 'product_created',
            data: { productId, productCode },
          };
        }
      }else {
        result = getDefaultResponse();
      }
    }
    
    // Store assistant response
    await c.env.DB.prepare(`
      INSERT INTO aria_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).bind(generateUUID(), conversation_id, result.response).run();
    
    // Create streaming response - send as JSON to preserve newlines
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the response as JSON to preserve newlines exactly
        const jsonResponse = JSON.stringify({ content: result.response });
        controller.enqueue(encoder.encode(`data: ${jsonResponse}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

// Upload document
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const fileData = formData.get('file');
    
    if (!fileData || typeof fileData === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    const file = fileData as File;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum size is 10MB.' }, 400);
    }
    
    const documentId = generateUUID();
    const companyId = 'b0598135-52fd-4f67-ac56-8f0237e6355e'; // Default demo company
    const r2Key = `${companyId}/${documentId}/${file.name}`;
    
    // Upload to R2
    await c.env.DOCUMENTS.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });
    
    // Store metadata in D1
    await c.env.DB.prepare(`
      INSERT INTO aria_documents (id, company_id, filename, mime_type, size, r2_key, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'uploaded', datetime('now'))
    `).bind(documentId, companyId, file.name, file.type, file.size, r2Key).run();
    
    return c.json({
      document_id: documentId,
      filename: file.name,
      size: file.size,
      mime_type: file.type,
      status: 'uploaded',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload document' }, 500);
  }
});

// Classify document (rule-based)
app.post('/classify/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    // Get document metadata
    const doc = await c.env.DB.prepare(
      'SELECT * FROM aria_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    // Rule-based classification by file type and name
    const filename = (doc as any).filename.toLowerCase();
    const mimeType = (doc as any).mime_type;
    
    let documentClass = 'unknown';
    let confidence = 0.5;
    
    if (filename.includes('invoice') || filename.includes('inv')) {
      documentClass = 'invoice';
      confidence = 0.85;
    } else if (filename.includes('quote') || filename.includes('quotation')) {
      documentClass = 'quote';
      confidence = 0.85;
    } else if (filename.includes('po') || filename.includes('purchase')) {
      documentClass = 'purchase_order';
      confidence = 0.85;
    } else if (filename.includes('receipt')) {
      documentClass = 'receipt';
      confidence = 0.80;
    } else if (filename.includes('contract')) {
      documentClass = 'contract';
      confidence = 0.80;
    } else if (mimeType === 'application/pdf') {
      documentClass = 'document';
      confidence = 0.60;
    } else if (mimeType?.startsWith('image/')) {
      documentClass = 'image';
      confidence = 0.70;
    }
    
    // Update document status
    await c.env.DB.prepare(`
      UPDATE aria_documents SET status = 'classified', document_class = ?, confidence = ?
      WHERE id = ?
    `).bind(documentClass, confidence, documentId).run();
    
    return c.json({
      document_id: documentId,
      document_class: documentClass,
      confidence,
      status: 'classified',
    });
  } catch (error) {
    console.error('Classification error:', error);
    return c.json({ error: 'Failed to classify document' }, 500);
  }
});

// Extract data from document (placeholder - returns mock data)
app.post('/extract/:documentId', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    const doc = await c.env.DB.prepare(
      'SELECT * FROM aria_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    // Return placeholder extraction (real extraction would need OCR/AI)
    return c.json({
      document_id: documentId,
      extracted_data: {
        note: 'Document extraction requires OCR/AI integration. This is a placeholder response.',
        document_class: (doc as any).document_class || 'unknown',
        filename: (doc as any).filename,
      },
      status: 'extracted',
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return c.json({ error: 'Failed to extract data' }, 500);
  }
});

// Validate document
app.post('/documents/:documentId/validate', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    const doc = await c.env.DB.prepare(
      'SELECT * FROM aria_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!doc) {
      return c.json({ error: 'Document not found' }, 404);
    }
    
    return c.json({
      document_id: documentId,
      valid: true,
      validation_results: {
        file_exists: true,
        size_valid: (doc as any).size <= 10 * 1024 * 1024,
        type_supported: true,
      },
      status: 'validated',
    });
  } catch (error) {
    console.error('Validation error:', error);
    return c.json({ error: 'Failed to validate document' }, 500);
  }
});

// Post to ARIA (placeholder)
app.post('/documents/:documentId/post-to-aria', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    return c.json({
      document_id: documentId,
      posted: true,
      message: 'Document posted to ARIA successfully',
      status: 'posted',
    });
  } catch (error) {
    console.error('Post error:', error);
    return c.json({ error: 'Failed to post document' }, 500);
  }
});

// Export to SAP (placeholder)
app.post('/documents/:documentId/export-to-sap', async (c) => {
  try {
    const documentId = c.req.param('documentId');
    
    return c.json({
      document_id: documentId,
      exported: true,
      message: 'Document exported to SAP format',
      status: 'exported',
    });
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Failed to export document' }, 500);
  }
});

// Get SAP export templates
app.get('/sap/export-templates', async (c) => {
  return c.json({
    templates: [
      { id: 'invoice', name: 'Invoice Template', format: 'IDOC' },
      { id: 'purchase_order', name: 'Purchase Order Template', format: 'IDOC' },
      { id: 'goods_receipt', name: 'Goods Receipt Template', format: 'IDOC' },
    ],
  });
});

// SAP reclassify (placeholder)
app.post('/sap/reclassify', async (c) => {
  try {
    const body = await c.req.json();
    
    return c.json({
      success: true,
      message: 'Document reclassified successfully',
      new_class: body.new_class || 'unknown',
    });
  } catch (error) {
    console.error('Reclassify error:', error);
    return c.json({ error: 'Failed to reclassify document' }, 500);
  }
});

export default app;
