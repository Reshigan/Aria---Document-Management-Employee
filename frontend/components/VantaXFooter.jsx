import React from 'react';

const VantaXFooter = () => {
  return (
    <footer className="vx-glass" style={{
      marginTop: '4rem',
      padding: '2rem',
      borderTop: '1px solid rgba(255, 215, 0, 0.2)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* VantaX Branding */}
          <div>
            <div className="vx-flex vx-items-center vx-gap-md vx-m-lg">
              <div className="vx-logo">VX</div>
              <div>
                <div className="vx-text-gradient vx-font-bold" style={{ fontSize: '1.5rem' }}>
                  VantaX
                </div>
                <div className="vx-text-muted" style={{ fontSize: '0.9rem' }}>
                  Multidisciplinary Excellence
                </div>
              </div>
            </div>
            <p className="vx-text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
              Strategic management and holding company creating synergies across business consulting, 
              green energy, AI, retail, medical technology, and chemicals.
            </p>
          </div>

          {/* ARIA Features */}
          <div>
            <h3 className="vx-subtitle">ARIA Features</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🔍 OCR Document Scanning
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🤖 AI Document Classification
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                💼 Business Data Extraction
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🔗 SAP ERP Integration
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                📊 Excel Processing
              </li>
            </ul>
          </div>

          {/* VantaX Industries */}
          <div>
            <h3 className="vx-subtitle">VantaX Industries</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                💼 Business Consulting
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                ⚡ Green Energy Solutions
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🤖 AI Technology
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🛍️ Retail Innovation
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🏥 Medical Technology
              </li>
              <li className="vx-text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                ⚗️ Specialty Chemicals
              </li>
            </ul>
          </div>

          {/* System Status */}
          <div>
            <h3 className="vx-subtitle">System Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="vx-status vx-status-online">
                <div className="vx-status-dot"></div>
                <span style={{ fontSize: '0.75rem' }}>OCR Engine</span>
              </div>
              <div className="vx-status vx-status-online">
                <div className="vx-status-dot"></div>
                <span style={{ fontSize: '0.75rem' }}>AI Model</span>
              </div>
              <div className="vx-status vx-status-online">
                <div className="vx-status-dot"></div>
                <span style={{ fontSize: '0.75rem' }}>Database</span>
              </div>
              <div className="vx-status vx-status-processed">
                <div className="vx-status-dot"></div>
                <span style={{ fontSize: '0.75rem' }}>SAP Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="vx-flex vx-justify-between vx-items-center" style={{
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div className="vx-text-muted" style={{ fontSize: '0.875rem' }}>
            © 2025 VantaX Holdings. All rights reserved.
          </div>
          <div className="vx-flex vx-gap-md">
            <a href="#" className="vx-text-muted" style={{ fontSize: '0.875rem' }}>Privacy Policy</a>
            <a href="#" className="vx-text-muted" style={{ fontSize: '0.875rem' }}>Terms of Service</a>
            <a href="https://www.vantax.co.za" className="vx-text-gradient" style={{ fontSize: '0.875rem' }}>
              VantaX.co.za
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default VantaXFooter;