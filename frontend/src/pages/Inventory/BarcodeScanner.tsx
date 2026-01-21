import React, { useState } from 'react';
import { Scan, Package, Search, CheckCircle, AlertTriangle, History } from 'lucide-react';

interface ScanResult {
  id: number;
  barcode: string;
  product: string;
  sku: string;
  location: string;
  quantity: number;
  scanned_at: string;
  action: 'LOOKUP' | 'RECEIVE' | 'PICK' | 'COUNT';
}

const BarcodeScanner: React.FC = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([
    { id: 1, barcode: '5901234123457', product: 'Widget A', sku: 'WGT-001', location: 'A-01-01', quantity: 50, scanned_at: '2026-01-21 09:15:00', action: 'RECEIVE' },
    { id: 2, barcode: '5901234123458', product: 'Gadget B', sku: 'GDG-002', location: 'B-02-03', quantity: 25, scanned_at: '2026-01-21 09:10:00', action: 'PICK' },
    { id: 3, barcode: '5901234123459', product: 'Component C', sku: 'CMP-003', location: 'C-03-02', quantity: 100, scanned_at: '2026-01-21 09:05:00', action: 'COUNT' },
    { id: 4, barcode: '5901234123460', product: 'Part D', sku: 'PRT-004', location: 'D-01-05', quantity: 1, scanned_at: '2026-01-21 09:00:00', action: 'LOOKUP' },
  ]);
  const [currentProduct, setCurrentProduct] = useState<ScanResult | null>(null);
  const [scanMode, setScanMode] = useState<'LOOKUP' | 'RECEIVE' | 'PICK' | 'COUNT'>('LOOKUP');

  const handleScan = () => {
    if (!barcodeInput) return;
    
    const mockProduct: ScanResult = {
      id: Date.now(),
      barcode: barcodeInput,
      product: `Product ${barcodeInput.slice(-3)}`,
      sku: `SKU-${barcodeInput.slice(-4)}`,
      location: `${String.fromCharCode(65 + Math.floor(Math.random() * 4))}-0${Math.floor(Math.random() * 5) + 1}-0${Math.floor(Math.random() * 9) + 1}`,
      quantity: Math.floor(Math.random() * 100) + 1,
      scanned_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: scanMode
    };
    
    setCurrentProduct(mockProduct);
    setScanHistory([mockProduct, ...scanHistory]);
    setBarcodeInput('');
  };

  const getActionBadge = (action: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      LOOKUP: { bg: '#dbeafe', text: '#1e40af' },
      RECEIVE: { bg: '#dcfce7', text: '#166534' },
      PICK: { bg: '#fef3c7', text: '#92400e' },
      COUNT: { bg: '#e0e7ff', text: '#3730a3' }
    };
    const c = config[action] || config.LOOKUP;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{action}</span>;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Barcode Scanner</h1>
        <p style={{ color: '#6b7280' }}>Scan barcodes to lookup, receive, pick, or count inventory</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Scan size={24} style={{ color: '#2563eb' }} />
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Scan Barcode</h2>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Scan Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['LOOKUP', 'RECEIVE', 'PICK', 'COUNT'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setScanMode(mode)}
                    style={{
                      padding: '8px 12px',
                      border: scanMode === mode ? '2px solid #2563eb' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: scanMode === mode ? '#eff6ff' : 'white',
                      color: scanMode === mode ? '#2563eb' : '#374151',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Barcode</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="Scan or enter barcode..."
                  style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '16px' }}
                  autoFocus
                />
                <button
                  onClick={handleScan}
                  style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={18} /> Scan
                </button>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
              <Scan size={48} style={{ color: '#9ca3af', marginBottom: '8px' }} />
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Position barcode in front of scanner or enter manually</p>
            </div>
          </div>

          {currentProduct && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <CheckCircle size={24} style={{ color: '#10b981' }} />
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Product Found</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Product</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{currentProduct.product}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>SKU</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#2563eb' }}>{currentProduct.sku}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Location</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{currentProduct.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Quantity</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{currentProduct.quantity}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Barcode</div>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#6b7280' }}>{currentProduct.barcode}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Action</div>
                  {getActionBadge(currentProduct.action)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  View Details
                </button>
                <button style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Confirm {scanMode}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <History size={20} style={{ color: '#6b7280' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Scan History</h2>
          </div>
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            {scanHistory.map((scan) => (
              <div key={scan.id} style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{scan.product}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{scan.sku} - {scan.location}</div>
                  </div>
                  {getActionBadge(scan.action)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6b7280' }}>{scan.barcode}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{scan.scanned_at}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
