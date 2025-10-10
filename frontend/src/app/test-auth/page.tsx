'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testLogin = async () => {
    try {
      addLog('Step 1: Sending login request...');
      
      const loginRes = await fetch('http://localhost:12001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin' })
      });
      
      addLog(`Step 2: Login response status: ${loginRes.status}`);
      const loginData = await loginRes.json();
      addLog(`Step 3: Login data: ${JSON.stringify(loginData)}`);
      
      if (!loginData.access_token) {
        throw new Error('No access_token in response');
      }
      
      addLog('Step 4: Storing token in localStorage...');
      localStorage.setItem('token', loginData.access_token);
      
      addLog('Step 5: Verifying token was stored...');
      const storedToken = localStorage.getItem('token');
      addLog(`Step 6: Token stored: ${storedToken ? `YES (length: ${storedToken.length})` : 'NO'}`);
      
      addLog('Step 7: Fetching current user...');
      const meRes = await fetch('http://localhost:12001/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });
      
      addLog(`Step 8: /me response status: ${meRes.status}`);
      const userData = await meRes.json();
      addLog(`Step 9: User data: ${JSON.stringify(userData)}`);
      
      addLog('Step 10: ✅ ALL STEPS COMPLETED SUCCESSFULLY!');
      addLog('Step 11: Navigating to dashboard in 2 seconds...');
      
      setTimeout(() => {
        addLog('Step 12: Calling router.push("/dashboard")...');
        router.push('/dashboard');
      }, 2000);
      
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      addLog(`Stack: ${error.stack}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const checkToken = () => {
    const token = localStorage.getItem('token');
    addLog(`Token check: ${token ? `Found (length: ${token.length})` : 'NOT FOUND'}`);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Authentication Test Page</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={testLogin}
          style={{ padding: '10px 20px', fontSize: '16px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test Login Flow
        </button>
        
        <button 
          onClick={checkToken}
          style={{ padding: '10px 20px', fontSize: '16px', background: '#52c41a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Check Token
        </button>
        
        <button 
          onClick={clearLogs}
          style={{ padding: '10px 20px', fontSize: '16px', background: '#f5222d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Clear Logs
        </button>
        
        <button 
          onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 20px', fontSize: '16px', background: '#722ed1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Go to Dashboard
        </button>
      </div>
      
      <div style={{ background: '#000', color: '#0f0', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px', maxHeight: '600px', overflow: 'auto' }}>
        {logs.length === 0 ? (
          <div>No logs yet. Click "Test Login Flow" to start...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
}
