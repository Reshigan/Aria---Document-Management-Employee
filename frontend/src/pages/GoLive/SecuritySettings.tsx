import { useState, useEffect } from 'react';
import { Shield, Key, Monitor, Lock, Unlock, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { goLiveApi } from '../../services/goLiveApi';

interface Session {
  id: string;
  created_at: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
}

export default function SecuritySettings() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    fetch2faStatus();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await goLiveApi.getSessions();
      setSessions(res.data?.data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const fetch2faStatus = async () => {
    try {
      const res = await goLiveApi.get2faStatus();
      setTwoFaEnabled(res.data?.enabled || false);
    } catch { /* empty */ }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await goLiveApi.revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      setMessage({ type: 'success', text: 'Session revoked' });
    } catch { setMessage({ type: 'error', text: 'Failed to revoke session' }); }
  };

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    try {
      await goLiveApi.changePassword({ current_password: passwordData.current_password, new_password: passwordData.new_password });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    }
  };

  const handleSetup2fa = async () => {
    try {
      const res = await goLiveApi.setup2fa();
      setTwoFaSecret(res.data?.secret || '');
      setMessage({ type: 'success', text: 'Scan the secret with your authenticator app' });
    } catch { setMessage({ type: 'error', text: 'Failed to setup 2FA' }); }
  };

  const handleVerify2fa = async () => {
    try {
      await goLiveApi.verify2fa(twoFaCode);
      setTwoFaEnabled(true);
      setTwoFaSecret('');
      setTwoFaCode('');
      setMessage({ type: 'success', text: '2FA enabled successfully' });
    } catch { setMessage({ type: 'error', text: 'Invalid code' }); }
  };

  const handleDisable2fa = async () => {
    try {
      await goLiveApi.disable2fa();
      setTwoFaEnabled(false);
      setMessage({ type: 'success', text: '2FA disabled' });
    } catch { setMessage({ type: 'error', text: 'Failed to disable 2FA' }); }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="h-6 w-6 text-indigo-600" />Security Settings</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Key className="h-5 w-5 text-amber-600" />Change Password</h2>
          <div className="space-y-2">
            <input type={showPassword ? 'text' : 'password'} placeholder="Current password" value={passwordData.current_password}
              onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            <input type={showPassword ? 'text' : 'password'} placeholder="New password (min 8 chars)" value={passwordData.new_password}
              onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            <input type={showPassword ? 'text' : 'password'} placeholder="Confirm new password" value={passwordData.confirm_password}
              onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowPassword(!showPassword)} className="p-2 border rounded-lg">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button onClick={handleChangePassword} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                Update Password
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {twoFaEnabled ? <Lock className="h-5 w-5 text-green-600" /> : <Unlock className="h-5 w-5 text-red-600" />}
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-gray-500">
            {twoFaEnabled ? '2FA is enabled. Your account has additional security.' : '2FA is not enabled. Enable it for extra security.'}
          </p>
          {twoFaSecret && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Add this secret to your authenticator app:</p>
              <code className="text-sm font-mono text-indigo-600 break-all">{twoFaSecret}</code>
              <div className="flex gap-2 mt-2">
                <input type="text" placeholder="Enter 6-digit code" maxLength={6} value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={handleVerify2fa} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Verify</button>
              </div>
            </div>
          )}
          {twoFaEnabled ? (
            <button onClick={handleDisable2fa} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Disable 2FA</button>
          ) : (
            <button onClick={handleSetup2fa} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Enable 2FA</button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Monitor className="h-5 w-5 text-blue-600" />Active Sessions</h2>
          <button onClick={fetchSessions} className="p-1.5 hover:bg-gray-100 rounded-lg"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No active sessions found</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                <Monitor className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{s.user_agent || 'Unknown device'}</p>
                  <p className="text-xs text-gray-500">{s.ip_address || 'Unknown IP'} &middot; {s.created_at ? new Date(s.created_at).toLocaleString() : ''}</p>
                </div>
                <button onClick={() => handleRevokeSession(s.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
