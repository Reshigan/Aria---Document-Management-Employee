import { useState, useEffect } from 'react';
import { Clock, Bot, RefreshCw, Save, Trash2, Plus, Power } from 'lucide-react';
import { goLiveApi } from '../../services/goLiveApi';

interface BotSchedule {
  id?: string;
  bot_id: string;
  schedule: string;
  enabled: number;
  config?: string;
}

const SCHEDULE_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily 9am', value: '0 9 * * *' },
  { label: 'Weekdays 9am', value: '0 9 * * 1-5' },
  { label: 'Weekly Monday', value: '0 9 * * 1' },
  { label: 'Monthly 1st', value: '0 9 1 * *' },
];

const BOT_OPTIONS = [
  'quote_generation', 'sales_order', 'purchase_order', 'invoice_generation',
  'ar_collections', 'payment_processing', 'bank_reconciliation', 'payroll',
  'inventory', 'stock_movement', 'goods_receipt', 'expense_management',
  'workflow_automation', 'leave_management', 'work_order', 'production',
  'quality_control', 'lead_scoring', 'opportunity', 'financial_close',
  'general_ledger', 'tax_compliance', 'bbbee_compliance', 'financial_reporting',
];

export default function ScheduledBots() {
  const [schedules, setSchedules] = useState<BotSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBotId, setNewBotId] = useState('');
  const [newSchedule, setNewSchedule] = useState('0 9 * * 1-5');

  useEffect(() => { fetchSchedules(); }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await goLiveApi.getBotSchedules();
      setSchedules(res.data?.data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const handleSave = async (botId: string, schedule: string, enabled: boolean) => {
    try {
      await goLiveApi.saveBotSchedule({ bot_id: botId, schedule, enabled });
      fetchSchedules();
    } catch { /* empty */ }
  };

  const handleDelete = async (botId: string) => {
    try {
      await goLiveApi.deleteBotSchedule(botId);
      fetchSchedules();
    } catch { /* empty */ }
  };

  const handleAdd = async () => {
    if (!newBotId) return;
    await handleSave(newBotId, newSchedule, true);
    setNewBotId('');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Clock className="h-6 w-6 text-indigo-600" />Scheduled Bot Runs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Configure automated bot execution schedules</p>
        </div>
        <button onClick={fetchSchedules} className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Plus className="h-4 w-4" />Add Schedule</h3>
        <div className="flex gap-2 flex-wrap">
          <select value={newBotId} onChange={e => setNewBotId(e.target.value)} className="flex-1 min-w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="">Select bot...</option>
            {BOT_OPTIONS.map(b => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={newSchedule} onChange={e => setNewSchedule(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            {SCHEDULE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!newBotId} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" /></div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bot className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No scheduled bots yet. Add one above.</p>
          </div>
        ) : schedules.map((s, i) => (
          <div key={s.bot_id || i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Bot className="h-5 w-5 text-indigo-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{(s.bot_id || '').replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-500">{s.schedule || 'No schedule'}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {s.enabled ? 'Active' : 'Paused'}
            </span>
            <button onClick={() => handleSave(s.bot_id, s.schedule, !s.enabled)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <Power className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(s.bot_id)} className="p-1.5 hover:bg-red-100 rounded text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
