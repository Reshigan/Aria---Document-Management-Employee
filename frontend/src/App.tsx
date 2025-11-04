import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import ExecutiveDashboard from './pages/Dashboard/ExecutiveDashboard';
import Quotes from './pages/ERP/Quotes';
import SalesOrders from './pages/ERP/SalesOrders';
import Deliveries from './pages/ERP/Deliveries';
import WMSStock from './pages/ERP/WMSStock';
import './styles/design-system.css';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<ExecutiveDashboard />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/sales-orders" element={<SalesOrders />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/wms-stock" element={<WMSStock />} />
          <Route path="/gl" element={<div style={{padding: '2rem'}}>GL Module - Coming Soon</div>} />
          <Route path="/ap" element={<div style={{padding: '2rem'}}>AP Module - Coming Soon</div>} />
          <Route path="/ar" element={<div style={{padding: '2rem'}}>AR Module - Coming Soon</div>} />
          <Route path="/banking" element={<div style={{padding: '2rem'}}>Banking Module - Coming Soon</div>} />
          <Route path="/payroll" element={<div style={{padding: '2rem'}}>Payroll Module - Coming Soon</div>} />
          <Route path="/crm" element={<div style={{padding: '2rem'}}>CRM Module - Coming Soon</div>} />
          <Route path="/inventory" element={<div style={{padding: '2rem'}}>Inventory Module - Coming Soon</div>} />
          <Route path="/bots" element={<div style={{padding: '2rem'}}>Bots Module - Coming Soon</div>} />
          <Route path="/reports" element={<div style={{padding: '2rem'}}>Reports - Coming Soon</div>} />
          <Route path="/settings" element={<div style={{padding: '2rem'}}>Settings - Coming Soon</div>} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
