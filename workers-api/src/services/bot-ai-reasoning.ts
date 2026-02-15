interface AIBinding {
  run(model: string, options: { messages: Array<{role: string, content: string}>, max_tokens?: number, temperature?: number }): Promise<{ response?: string, text?: string }>;
}

interface BotContext {
  botId: string;
  botName: string;
  category: string;
  companyId: string;
  counts: Record<string, number>;
  config: Record<string, unknown>;
}

interface AIInsight {
  summary: string;
  recommendations: string[];
  anomalies: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  suggested_actions: string[];
  confidence: number;
}

interface PreExecutionAnalysis {
  should_proceed: boolean;
  warnings: string[];
  adjustments: Record<string, unknown>;
  reasoning: string;
}

interface EdgeCaseResolution {
  action: 'retry' | 'skip' | 'escalate' | 'alternative';
  reasoning: string;
  alternative_bot_id?: string;
  recovery_steps: string[];
}

const FINANCIAL_SYSTEM_PROMPT = `You are ARIA's Financial Intelligence Engine for a South African ERP system.
You analyze financial data and provide actionable insights for business operations.
Currency is ZAR (South African Rand, symbol R).
Always respond with valid JSON matching the requested schema.
Be concise but thorough. Flag genuine risks.
South African tax context: VAT at 15%, PAYE, UIF, SDL, B-BBEE compliance.`;

const BOT_CATEGORY_PROMPTS: Record<string, string> = {
  Financial: `You specialize in financial operations: AP/AR, bank reconciliation, GL, tax compliance, expense management, and financial reporting. Flag cash flow risks, aging anomalies, and compliance gaps.`,
  Procurement: `You specialize in procurement: purchase orders, supplier management, spend analysis, and inventory. Flag supplier concentration risk, maverick spend, and reorder points.`,
  Manufacturing: `You specialize in manufacturing: work orders, production scheduling, quality control, OEE, and BOM management. Flag downtime patterns, quality trends, and capacity constraints.`,
  Sales: `You specialize in sales: quotes, sales orders, leads, opportunities, and CRM. Flag pipeline risks, conversion bottlenecks, and customer churn signals.`,
  HR: `You specialize in HR & payroll: time & attendance, payroll processing, benefits, recruitment, and performance. Flag compliance issues, overtime anomalies, and retention risks.`,
  Documents: `You specialize in document management: classification, scanning, data extraction, validation, and archiving. Flag processing errors, validation failures, and compliance gaps.`,
  Governance: `You specialize in governance: contracts, policies, audit, risk management, and workflow automation. Flag expiring contracts, policy violations, and unresolved risks.`,
  Operations: `You specialize in operations: delivery scheduling, order fulfillment, and logistics. Flag delayed deliveries, capacity issues, and SLA breaches.`,
  Inventory: `You specialize in inventory: stock levels, reorder points, and warehouse management. Flag stockouts, overstock, and slow-moving inventory.`,
};

function buildCategoryPrompt(category: string): string {
  return BOT_CATEGORY_PROMPTS[category] || `You analyze ${category} operations and provide insights.`;
}

function parseAIJSON<T>(response: string, fallback: T): T {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
  } catch {
    // fall through
  }
  return fallback;
}

export async function analyzeBeforeExecution(
  context: BotContext,
  ai: AIBinding | undefined
): Promise<PreExecutionAnalysis> {
  const defaultResult: PreExecutionAnalysis = {
    should_proceed: true,
    warnings: [],
    adjustments: {},
    reasoning: 'Rule-based: no AI available, proceeding with standard execution.',
  };

  if (!ai) return defaultResult;

  try {
    const dataSnapshot = JSON.stringify(context.counts);
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: `${FINANCIAL_SYSTEM_PROMPT}\n${buildCategoryPrompt(context.category)}\nRespond with JSON: {"should_proceed":bool,"warnings":[],"adjustments":{},"reasoning":"string"}` },
        { role: 'user', content: `Bot "${context.botName}" (${context.botId}, category: ${context.category}) is about to execute for company ${context.companyId}.\n\nCurrent data snapshot:\n${dataSnapshot}\n\nConfig: ${JSON.stringify(context.config)}\n\nShould this bot proceed? Are there any data anomalies or warnings? Suggest any parameter adjustments.` },
      ],
      max_tokens: 300,
      temperature: 0.2,
    });

    const text = response.response || response.text || '';
    return parseAIJSON(text, defaultResult);
  } catch (error) {
    console.error('AI pre-execution analysis failed:', error);
    return defaultResult;
  }
}

export async function generateInsights(
  context: BotContext,
  result: Record<string, unknown>,
  ai: AIBinding | undefined
): Promise<AIInsight> {
  const defaultInsight: AIInsight = {
    summary: `${context.botName} completed successfully.`,
    recommendations: [],
    anomalies: [],
    risk_level: 'low',
    suggested_actions: [],
    confidence: 0.5,
  };

  if (!ai) return defaultInsight;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: `${FINANCIAL_SYSTEM_PROMPT}\n${buildCategoryPrompt(context.category)}\nRespond with JSON: {"summary":"string","recommendations":["string"],"anomalies":["string"],"risk_level":"low|medium|high|critical","suggested_actions":["string"],"confidence":0.0-1.0}` },
        { role: 'user', content: `Bot "${context.botName}" (${context.category}) just finished executing.\n\nExecution result:\n${JSON.stringify(result)}\n\nData context:\n${JSON.stringify(context.counts)}\n\nAnalyze the results. Identify anomalies, risks, and provide actionable recommendations. What should the user do next?` },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const text = response.response || response.text || '';
    const parsed = parseAIJSON(text, defaultInsight);
    if (parsed.summary && parsed.risk_level) {
      return parsed;
    }
    return defaultInsight;
  } catch (error) {
    console.error('AI insight generation failed:', error);
    return defaultInsight;
  }
}

export async function handleEdgeCase(
  context: BotContext,
  error: string,
  ai: AIBinding | undefined
): Promise<EdgeCaseResolution> {
  const defaultResolution: EdgeCaseResolution = {
    action: 'escalate',
    reasoning: 'No AI available. Escalating to manual review.',
    recovery_steps: ['Review the error in the audit log', 'Fix the underlying data issue', 'Re-execute the bot'],
  };

  if (!ai) return defaultResolution;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: `${FINANCIAL_SYSTEM_PROMPT}\n${buildCategoryPrompt(context.category)}\nRespond with JSON: {"action":"retry|skip|escalate|alternative","reasoning":"string","alternative_bot_id":"string|null","recovery_steps":["string"]}` },
        { role: 'user', content: `Bot "${context.botName}" (${context.botId}) failed with error:\n${error}\n\nData context:\n${JSON.stringify(context.counts)}\n\nConfig: ${JSON.stringify(context.config)}\n\nHow should we handle this? Should we retry, skip, escalate to a human, or try an alternative bot? Provide recovery steps.` },
      ],
      max_tokens: 300,
      temperature: 0.2,
    });

    const text = response.response || response.text || '';
    const parsed = parseAIJSON(text, defaultResolution);
    if (parsed.action && parsed.reasoning) {
      return parsed;
    }
    return defaultResolution;
  } catch (aiError) {
    console.error('AI edge case handling failed:', aiError);
    return defaultResolution;
  }
}

export async function prioritizeActions(
  context: BotContext,
  items: Array<Record<string, unknown>>,
  ai: AIBinding | undefined
): Promise<{ prioritized_items: Array<Record<string, unknown> & { ai_priority: number; ai_reason: string }> }> {
  const defaultResult = {
    prioritized_items: items.map((item, i) => ({
      ...item,
      ai_priority: i + 1,
      ai_reason: 'Default ordering (no AI available)',
    })),
  };

  if (!ai || items.length === 0) return defaultResult;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: `${FINANCIAL_SYSTEM_PROMPT}\n${buildCategoryPrompt(context.category)}\nRespond with JSON: {"priorities":[{"index":0,"priority":1,"reason":"string"}]}` },
        { role: 'user', content: `Bot "${context.botName}" needs to process ${items.length} items. Prioritize them by urgency and business impact.\n\nItems:\n${JSON.stringify(items.slice(0, 20))}\n\nReturn priority order (1=highest) with reasoning for each.` },
      ],
      max_tokens: 400,
      temperature: 0.2,
    });

    const text = response.response || response.text || '';
    const parsed = parseAIJSON<{ priorities?: Array<{ index: number; priority: number; reason: string }> }>(text, {});
    if (parsed.priorities && Array.isArray(parsed.priorities)) {
      const priorityMap = new Map(parsed.priorities.map(p => [p.index, p]));
      return {
        prioritized_items: items.map((item, i) => {
          const p = priorityMap.get(i);
          return {
            ...item,
            ai_priority: p?.priority ?? i + 1,
            ai_reason: p?.reason ?? 'No AI prioritization available',
          };
        }),
      };
    }
    return defaultResult;
  } catch (error) {
    console.error('AI prioritization failed:', error);
    return defaultResult;
  }
}

export async function classifyUnknownRequest(
  userMessage: string,
  availableBots: Array<{ id: string; name: string; category: string; description: string }>,
  ai: AIBinding | undefined
): Promise<{ matched_bot_id: string | null; confidence: number; reasoning: string; suggested_response: string }> {
  const defaultResult = {
    matched_bot_id: null,
    confidence: 0,
    reasoning: 'No AI available for intent classification.',
    suggested_response: 'I could not understand your request. Please try a specific command like "run payroll" or "create quote".',
  };

  if (!ai) return defaultResult;

  try {
    const botList = availableBots.map(b => `- ${b.id}: ${b.name} (${b.category}) - ${b.description}`).join('\n');
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: `${FINANCIAL_SYSTEM_PROMPT}\nYou match user requests to available bots.\nRespond with JSON: {"matched_bot_id":"string|null","confidence":0.0-1.0,"reasoning":"string","suggested_response":"string"}` },
        { role: 'user', content: `User said: "${userMessage}"\n\nAvailable bots:\n${botList}\n\nWhich bot (if any) should handle this? If no match, suggest what the user might mean.` },
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    const text = response.response || response.text || '';
    const parsed = parseAIJSON(text, defaultResult);
    if (parsed.reasoning) {
      return parsed;
    }
    return defaultResult;
  } catch (error) {
    console.error('AI classification failed:', error);
    return defaultResult;
  }
}
