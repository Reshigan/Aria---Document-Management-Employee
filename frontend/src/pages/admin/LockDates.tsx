import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Calendar, Shield, AlertTriangle, Info, 
  RefreshCw, Save, History, Users, UserCog, Building2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';

interface FinancialSettings {
  financial_year_start_month: number;
  financial_year_start_day: number;
  lock_date_all_users: string | null;
  lock_date_non_admin: string | null;
  conversion_date: string | null;
  conversion_balances_entered: boolean;
  base_currency: string;
}

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function LockDates() {
  const [settings, setSettings] = useState<FinancialSettings>({
    financial_year_start_month: 3,
    financial_year_start_day: 1,
    lock_date_all_users: null,
    lock_date_non_admin: null,
    conversion_date: null,
    conversion_balances_entered: false,
    base_currency: 'ZAR',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/admin-config/financial-settings`);
      const data = await response.json();
      if (data.success && data.data) {
        setSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/api/admin-config/financial-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) {
        alert('Financial settings saved successfully');
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const clearLockDate = (type: 'all_users' | 'non_admin') => {
    if (type === 'all_users') {
      setSettings({ ...settings, lock_date_all_users: null });
    } else {
      setSettings({ ...settings, lock_date_non_admin: null });
    }
  };

  const getFinancialYearEnd = () => {
    const startMonth = settings.financial_year_start_month;
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    return months.find(m => m.value === endMonth)?.label || '';
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Lock Dates & Financial Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Control when transactions can be edited and set your financial year
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><Lock className="h-6 w-6" /></div>
                  <div>
                    <h2 className="text-lg font-semibold">Lock Dates</h2>
                    <p className="text-white/80 text-sm">Prevent changes to transactions before these dates</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg"><Users className="h-5 w-5 text-red-600" /></div>
                    <div className="flex-1">
                      <label className="text-base font-semibold text-red-900 dark:text-red-100">Lock Date (All Users)</label>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-3">No one can edit transactions on or before this date</p>
                      <div className="flex items-center gap-3">
                        <input type="date" value={settings.lock_date_all_users || ''} onChange={(e) => setSettings({ ...settings, lock_date_all_users: e.target.value || null })} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        {settings.lock_date_all_users && (
                          <button onClick={() => clearLockDate('all_users')} className="flex items-center gap-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg"><Unlock className="h-4 w-4" />Clear</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg"><UserCog className="h-5 w-5 text-amber-600" /></div>
                    <div className="flex-1">
                      <label className="text-base font-semibold text-amber-900 dark:text-amber-100">Lock Date (Non-Admin)</label>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">Standard users cannot edit transactions on or before this date</p>
                      <div className="flex items-center gap-3">
                        <input type="date" value={settings.lock_date_non_admin || ''} onChange={(e) => setSettings({ ...settings, lock_date_non_admin: e.target.value || null })} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        {settings.lock_date_non_admin && (
                          <button onClick={() => clearLockDate('non_admin')} className="flex items-center gap-1 px-3 py-2 border border-amber-300 text-amber-600 rounded-lg"><Unlock className="h-4 w-4" />Clear</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><History className="h-6 w-6" /></div>
                  <div><h2 className="text-lg font-semibold">Conversion Date</h2><p className="text-white/80 text-sm">The date you started using ARIA ERP</p></div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conversion Date</label>
                  <input type="date" value={settings.conversion_date || ''} onChange={(e) => setSettings({ ...settings, conversion_date: e.target.value || null })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><Calendar className="h-6 w-6" /></div>
                  <div><h2 className="text-lg font-semibold">Financial Year</h2><p className="text-white/80 text-sm">Configure your accounting period</p></div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Month</label>
                    <select value={settings.financial_year_start_month} onChange={(e) => setSettings({ ...settings, financial_year_start_month: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {months.map(month => (<option key={month.value} value={month.value}>{month.label}</option>))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Day</label>
                    <select value={settings.financial_year_start_day} onChange={(e) => setSettings({ ...settings, financial_year_start_day: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (<option key={day} value={day}>{day}</option>))}
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-2"><Building2 className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-900 dark:text-green-100">Current Financial Year</span></div>
                  <p className="text-sm text-green-700 dark:text-green-300">{months.find(m => m.value === settings.financial_year_start_month)?.label} {settings.financial_year_start_day} - {getFinancialYearEnd()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-violet-500 text-white p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><span className="text-xl font-bold">R</span></div>
                  <div><h2 className="text-lg font-semibold">Base Currency</h2><p className="text-white/80 text-sm">Your primary reporting currency</p></div>
                </div>
              </div>
              <div className="p-6">
                <select value={settings.base_currency} onChange={(e) => setSettings({ ...settings, base_currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
