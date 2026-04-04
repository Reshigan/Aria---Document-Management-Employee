/**
 * Bot Memory Service
 * 
 * Handles persistent memory storage and retrieval for bots
 * Enables learning and contextual awareness across bot executions
 */

interface Env {
  DB: D1Database;
}

interface BotMemoryEntry {
  id: string;
  bot_id: string;
  company_id: string;
  memory_type: string;
  content: string; // JSON string
  importance: number;
  accessed_count: number;
  last_accessed_at: string;
  created_at: string;
}

interface BotLearningEntry {
  id: string;
  bot_id: string;
  company_id: string;
  run_id: string | null;
  lesson_type: string;
  title: string;
  description: string;
  solution: string;
  impact: string;
  related_memory_ids: string;
  confidence_score: number;
  archived: number;
  created_at: string;
}

export class BotMemoryService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Store a new memory entry for a bot
   */
  async storeMemory(
    botId: string,
    companyId: string,
    memoryType: string,
    content: Record<string, any>,
    importance: number = 5
  ): Promise<string> {
    const memoryId = crypto.randomUUID();
    const contentJson = JSON.stringify(content);
    const now = new Date().toISOString();

    try {
      await this.db.prepare(`
        INSERT INTO bot_memories (id, bot_id, company_id, memory_type, content, importance, accessed_count, last_accessed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        memoryId,
        botId,
        companyId,
        memoryType,
        contentJson,
        importance,
        now,
        now
      ).run();

      return memoryId;
    } catch (error) {
      console.error('Failed to store bot memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve memories for a bot ordered by importance and recency
   */
  async retrieveMemories(
    botId: string,
    companyId: string,
    memoryTypes?: string[],
    limit: number = 20
  ): Promise<Array<{ content: Record<string, any>, importance: number, last_accessed_at: string }>> {
    try {
      let query = `
        SELECT content, importance, last_accessed_at
        FROM bot_memories
        WHERE bot_id = ? AND company_id = ?
      `;
      const params: any[] = [botId, companyId];

      if (memoryTypes && memoryTypes.length > 0) {
        query += ` AND memory_type IN (${memoryTypes.map(() => '?').join(',')})`;
        params.push(...memoryTypes);
      }

      query += ` ORDER BY importance DESC, last_accessed_at DESC LIMIT ?`;
      params.push(limit);

      const results = await this.db.prepare(query).bind(...params).all();

      if (!results.results) return [];

      // Update access count and timestamp
      const now = new Date().toISOString();
      for (const memory of results.results as any[]) {
        await this.db.prepare(`
          UPDATE bot_memories 
          SET accessed_count = accessed_count + 1, last_accessed_at = ?
          WHERE content = ?
        `).bind(now, memory.content).run();
      }

      return (results.results as any[]).map(mem => ({
        content: JSON.parse(mem.content),
        importance: mem.importance,
        last_accessed_at: mem.last_accessed_at
      }));
    } catch (error) {
      console.error('Failed to retrieve bot memories:', error);
      return [];
    }
  }

  /**
   * Record learning from a bot execution
   */
  async recordLearning(
    botId: string,
    companyId: string,
    runId: string | null,
    lessonType: string,
    title: string,
    description: string,
    solution: string,
    impact: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    relatedMemoryIds: string[] = [],
    confidenceScore: number = 0.5
  ): Promise<string> {
    const learningId = crypto.randomUUID();
    const relatedIds = relatedMemoryIds.join(',');
    const now = new Date().toISOString();

    try {
      await this.db.prepare(`
        INSERT INTO bot_learning_journal 
        (id, bot_id, company_id, run_id, lesson_type, title, description, solution, impact, related_memory_ids, confidence_score, archived, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).bind(
        learningId,
        botId,
        companyId,
        runId,
        lessonType,
        title,
        description,
        solution,
        impact,
        relatedIds,
        confidenceScore,
        now
      ).run();

      return learningId;
    } catch (error) {
      console.error('Failed to record bot learning:', error);
      throw error;
    }
  }

  /**
   * Get recent learnings for a bot
   */
  async getRecentLearnings(
    botId: string,
    companyId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const results = await this.db.prepare(`
        SELECT * FROM bot_learning_journal
        WHERE bot_id = ? AND company_id = ? AND archived = 0
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(botId, companyId, limit).all();

      return (results.results || []).map((learning: any) => ({
        ...learning,
        related_memory_ids: learning.related_memory_ids ? learning.related_memory_ids.split(',') : []
      }));
    } catch (error) {
      console.error('Failed to get bot learnings:', error);
      return [];
    }
  }

  /**
   * Update bot preferences from memory
   */
  async savePreferences(
    botId: string,
    companyId: string,
    preferences: Record<string, any>,
    category: string = 'runtime'
  ): Promise<void> {
    try {
      // Store preference template
      const templateId = crypto.randomUUID();
      const preferencesJson = JSON.stringify(preferences);
      const now = new Date().toISOString();

      await this.db.prepare(`
        INSERT OR REPLACE INTO bot_preference_templates 
        (id, name, bot_id, company_id, category, preferences, is_default, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 'SYSTEM-MEMORY', ?, ?)
      `).bind(
        templateId,
        `Runtime Preferences - ${botId}`,
        botId,
        companyId,
        category,
        preferencesJson,
        now,
        now
      ).run();
    } catch (error) {
      console.error('Failed to save bot preferences:', error);
    }
  }

  /**
   * Load bot preferences
   */
  async loadPreferences(
    botId: string,
    companyId: string,
    category?: string
  ): Promise<Record<string, any> | null> {
    try {
      let query = `
        SELECT preferences FROM bot_preference_templates
        WHERE bot_id = ? AND company_id = ? AND is_default = 0
      `;
      const params: any[] = [botId, companyId];

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      query += ` ORDER BY updated_at DESC LIMIT 1`;

      const result = await this.db.prepare(query).bind(...params).first();

      if (!result) return null;

      return JSON.parse((result as any).preferences);
    } catch (error) {
      console.error('Failed to load bot preferences:', error);
      return null;
    }
  }

  /**
   * Clean up old memories based on importance and age
   */
  async cleanupOldMemories(
    companyId: string,
    maxAgeDays: number = 90
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      const cutoffDateString = cutoffDate.toISOString();

      // Delete low-importance memories older than cutoff
      const result = await this.db.prepare(`
        DELETE FROM bot_memories
        WHERE company_id = ? AND created_at < ? AND importance < 5
      `).bind(companyId, cutoffDateString).run();

      return result.meta?.rows_written || 0;
    } catch (error) {
      console.error('Failed to cleanup old memories:', error);
      return 0;
    }
  }
}

// Initialize memory service singleton
let memoryService: BotMemoryService | null = null;

export function getBotMemoryService(db: D1Database): BotMemoryService {
  if (!memoryService) {
    memoryService = new BotMemoryService(db);
  }
  return memoryService;
}