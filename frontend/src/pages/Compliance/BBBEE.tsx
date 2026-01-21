import React, { useState } from 'react';
import { FileText, Download, CheckCircle, AlertTriangle, TrendingUp, Award, Users, Building2 } from 'lucide-react';

interface BBBEEScorecard {
  element: string;
  weighting: number;
  target: number;
  actual: number;
  score: number;
  compliance_indicator: string;
}

const BBBEE: React.FC = () => {
  const [scorecard] = useState<BBBEEScorecard[]>([
    { element: 'Ownership', weighting: 25, target: 25, actual: 22, score: 22, compliance_indicator: 'Compliant' },
    { element: 'Management Control', weighting: 19, target: 19, actual: 15, score: 15, compliance_indicator: 'Partial' },
    { element: 'Skills Development', weighting: 20, target: 20, actual: 18, score: 18, compliance_indicator: 'Compliant' },
    { element: 'Enterprise & Supplier Development', weighting: 40, target: 40, actual: 32, score: 32, compliance_indicator: 'Partial' },
    { element: 'Socio-Economic Development', weighting: 5, target: 5, actual: 5, score: 5, compliance_indicator: 'Compliant' },
  ]);

  const [certifications] = useState([
    { id: 1, level: 'Level 2', score: 92, valid_from: '2025-04-01', valid_to: '2026-03-31', agency: 'BEE Verification Agency', status: 'ACTIVE' },
    { id: 2, level: 'Level 3', score: 85, valid_from: '2024-04-01', valid_to: '2025-03-31', agency: 'BEE Verification Agency', status: 'EXPIRED' },
  ]);

  const totalScore = scorecard.reduce((acc, s) => acc + s.score, 0);
  const totalWeighting = scorecard.reduce((acc, s) => acc + s.weighting, 0);

  const getBBBEELevel = (score: number) => {
    if (score >= 100) return { level: 'Level 1', recognition: '135%', color: '#10b981' };
    if (score >= 95) return { level: 'Level 2', recognition: '125%', color: '#10b981' };
    if (score >= 90) return { level: 'Level 3', recognition: '110%', color: '#22c55e' };
    if (score >= 80) return { level: 'Level 4', recognition: '100%', color: '#84cc16' };
    if (score >= 75) return { level: 'Level 5', recognition: '80%', color: '#eab308' };
    if (score >= 70) return { level: 'Level 6', recognition: '60%', color: '#f59e0b' };
    if (score >= 55) return { level: 'Level 7', recognition: '50%', color: '#f97316' };
    if (score >= 40) return { level: 'Level 8', recognition: '10%', color: '#ef4444' };
    return { level: 'Non-Compliant', recognition: '0%', color: '#991b1b' };
  };

  const currentLevel = getBBBEELevel(totalScore);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      ACTIVE: { bg: '#dcfce7', text: '#166534' },
      EXPIRED: { bg: '#fee2e2', text: '#991b1b' },
      PENDING: { bg: '#fef3c7', text: '#92400e' }
    };
    const c = config[status] || config.ACTIVE;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const getComplianceBadge = (indicator: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      Compliant: { bg: '#dcfce7', text: '#166534' },
      Partial: { bg: '#fef3c7', text: '#92400e' },
      'Non-Compliant': { bg: '#fee2e2', text: '#991b1b' }
    };
    const c = config[indicator] || config.Partial;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{indicator}</span>;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>B-BBEE Compliance</h1>
        <p style={{ color: '#6b7280' }}>Broad-Based Black Economic Empowerment scorecard and certification</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><Award size={24} style={{ color: currentLevel.color }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Current Level</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentLevel.color }}>{currentLevel.level}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><TrendingUp size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Score</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>{totalScore} / {totalWeighting}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Building2 size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Recognition Level</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{currentLevel.recognition}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><FileText size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Certificate Expiry</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>Mar 2026</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Scorecard Elements</h2>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Element</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Weighting</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Target</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actual</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.map((item, index) => {
                  const percentage = (item.actual / item.target) * 100;
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.element}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{item.weighting}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>{item.target}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: percentage >= 90 ? '#10b981' : percentage >= 70 ? '#f59e0b' : '#ef4444', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{item.actual}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#2563eb', textAlign: 'center' }}>{item.score}</td>
                      <td style={{ padding: '12px 16px' }}>{getComplianceBadge(item.compliance_indicator)}</td>
                    </tr>
                  );
                })}
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#111827' }}>Total</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>{totalWeighting}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>{totalWeighting}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#111827', textAlign: 'center' }}>{totalScore}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 'bold', color: '#2563eb', textAlign: 'center' }}>{totalScore}</td>
                  <td style={{ padding: '12px 16px' }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Certifications</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {certifications.map((cert) => (
              <div key={cert.id} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>{cert.level}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>Score: {cert.score} points</div>
                  </div>
                  {getStatusBadge(cert.status)}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Valid: {cert.valid_from} to {cert.valid_to}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  Verified by: {cert.agency}
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                  <Download size={14} /> Download Certificate
                </button>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>B-BBEE Level Guide</h4>
            <div style={{ fontSize: '12px', color: '#1e40af' }}>
              <div>Level 1: 100+ points (135% recognition)</div>
              <div>Level 2: 95-99 points (125% recognition)</div>
              <div>Level 3: 90-94 points (110% recognition)</div>
              <div>Level 4: 80-89 points (100% recognition)</div>
              <div>Level 5-8: Below 80 points</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BBBEE;
