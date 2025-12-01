import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FileText, Scale, Building, AlertTriangle } from 'lucide-react';

interface ComplianceMetrics {
  tax_obligations_pending: number;
  legal_documents_expiring: number;
  fixed_assets_count: number;
  compliance_score: number;
}

const ComplianceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    tax_obligations_pending: 0,
    legal_documents_expiring: 0,
    fixed_assets_count: 0,
    compliance_score: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/compliance/metrics');
      setMetrics(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load compliance metrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }} data-testid="compliance-dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          Compliance Dashboard
        </h1>
        <p style={{ color: '#6b7280' }}>
          Monitor tax, legal, and regulatory compliance
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Link to="/tax" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
            <FileText size={24} style={{ color: '#2563eb', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Tax Compliance</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Manage tax obligations</div>
          </div>
        </Link>
        <Link to="/legal" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
            <Scale size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Legal Compliance</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Manage legal documents</div>
          </div>
        </Link>
        <Link to="/fixed-assets" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
            <Building size={24} style={{ color: '#f59e0b', marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Fixed Assets</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Track asset depreciation</div>
          </div>
        </Link>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <AlertTriangle size={24} style={{ color: '#ef4444', marginBottom: '8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Alerts</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>View compliance alerts</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Compliance Score</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: metrics.compliance_score >= 80 ? '#059669' : metrics.compliance_score >= 60 ? '#f59e0b' : '#dc2626' }}>
            {metrics.compliance_score}%
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Pending Tax Obligations</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: metrics.tax_obligations_pending > 0 ? '#f59e0b' : '#059669' }}>
            {metrics.tax_obligations_pending}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Expiring Documents</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: metrics.legal_documents_expiring > 0 ? '#f59e0b' : '#059669' }}>
            {metrics.legal_documents_expiring}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Fixed Assets</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827' }}>
            {metrics.fixed_assets_count}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
          Compliance Status
        </h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Tax Compliance</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>All tax obligations up to date</div>
              </div>
              <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: metrics.tax_obligations_pending === 0 ? '#dcfce7' : '#fef3c7', color: metrics.tax_obligations_pending === 0 ? '#166534' : '#92400e' }}>
                {metrics.tax_obligations_pending === 0 ? 'Compliant' : 'Action Required'}
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Legal Compliance</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>All legal documents current</div>
              </div>
              <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: metrics.legal_documents_expiring === 0 ? '#dcfce7' : '#fef3c7', color: metrics.legal_documents_expiring === 0 ? '#166534' : '#92400e' }}>
                {metrics.legal_documents_expiring === 0 ? 'Compliant' : 'Action Required'}
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Asset Management</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Fixed assets properly tracked</div>
              </div>
              <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534' }}>
                Compliant
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceDashboard;
