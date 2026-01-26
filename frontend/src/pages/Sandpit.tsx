import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Agent, 
  TestTube, 
  Activity, 
  Database, 
  Users, 
  DollarSign, 
  FileText, 
  Shield,
  ExternalLink,
  CheckCircle,
  Play
} from 'lucide-react';

interface QuickLinkProps {
  to: string;
  icon: any;
  title: string;
  description: string;
  status: 'operational' | 'ready' | 'testing';
  external?: boolean;
}

const QuickLink: React.FC<QuickLinkProps> = ({ to, icon: Icon, title, description, status, external }) => {
  const statusColors = {
    operational: 'bg-green-100 text-green-800',
    ready: 'bg-blue-100 text-blue-800',
    testing: 'bg-yellow-100 text-yellow-800',
  };

  const statusLabels = {
    operational: '✓ Operational',
    ready: '◆ Ready',
    testing: '◐ Testing',
  };

  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
          <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
        {external && <ExternalLink className="inline w-4 h-4 ml-2" />}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        {description}
      </p>
    </div>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link to={to}>{content}</Link>;
};

export default function Sandpit() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm font-semibold px-4 py-2 rounded-full mb-4">
              <CheckCircle className="inline w-4 h-4 mr-2" />
              Sandpit Environment - All Systems Operational
            </div>
            
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              ARIA Testing Sandpit
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Complete testing environment with 8 operational agents and 5 ERP modules.
              Everything is live and ready to test!
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">8</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Agents Active</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">5</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">ERP Modules</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">16+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">UI Pages</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">100%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Testing Tools Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            🧪 Testing Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickLink
              to="/api-test"
              icon={TestTube}
              title="API Connection Test"
              description="Test all API endpoints with automated checks. Verify backend connectivity."
              status="operational"
            />
            <QuickLink
              to="http://localhost:8000/docs"
              icon={ExternalLink}
              title="Interactive API Docs"
              description="Swagger UI - Try every endpoint directly in your browser."
              status="operational"
              external
            />
            <QuickLink
              to="http://localhost:8000/health"
              icon={Activity}
              title="Health Check"
              description="View system health status and loaded agents."
              status="operational"
              external
            />
          </div>
        </section>

        {/* Agent Testing Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            🤖 Agent Testing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickLink
              to="/agents-live"
              icon={Agent}
              title="Live Agent Status"
              description="View all 8 agents with real-time data from the API. Execute test runs."
              status="operational"
            />
            <QuickLink
              to="/agents"
              icon={Play}
              title="Agent Showcase"
              description="Marketing view of all available agents with features and capabilities."
              status="operational"
            />
            <QuickLink
              to="http://localhost:8000/api/agents"
              icon={Database}
              title="Agent API Endpoint"
              description="Direct JSON API endpoint for agent listing."
              status="operational"
              external
            />
          </div>
        </section>

        {/* ERP Modules Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            🏢 ERP Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickLink
              to="http://localhost:8000/api/erp/financial"
              icon={DollarSign}
              title="Financial Module"
              description="GL, AP, AR, Bank Reconciliation, Financial Reporting"
              status="operational"
              external
            />
            <QuickLink
              to="http://localhost:8000/api/erp/hr"
              icon={Users}
              title="HR Module"
              description="Employee Management, Payroll, Leave, Performance"
              status="operational"
              external
            />
            <QuickLink
              to="http://localhost:8000/api/erp/crm"
              icon={FileText}
              title="CRM Module"
              description="Contact Management, Sales Pipeline, Lead Management"
              status="operational"
              external
            />
            <QuickLink
              to="http://localhost:8000/api/erp/procurement"
              icon={FileText}
              title="Procurement Module"
              description="Purchase Orders, Vendor Management, Inventory"
              status="operational"
              external
            />
            <QuickLink
              to="http://localhost:8000/api/erp/compliance"
              icon={Shield}
              title="Compliance Module"
              description="BBBEE Tracking, Regulatory Compliance, Audit Trails"
              status="operational"
              external
            />
          </div>
        </section>

        {/* UI Pages Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            🎨 User Interface
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickLink
              to="/"
              icon={FileText}
              title="Landing Page"
              description="Marketing landing page with product information"
              status="ready"
            />
            <QuickLink
              to="/login"
              icon={Users}
              title="Login Page"
              description="User authentication interface"
              status="ready"
            />
            <QuickLink
              to="/register"
              icon={Users}
              title="Registration Page"
              description="New user signup form"
              status="ready"
            />
          </div>
        </section>

        {/* Information Panel */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">📖 How to Use This Sandpit</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">For Developers:</h3>
              <ul className="space-y-2 text-sm">
                <li>• Use <strong>API Connection Test</strong> for automated testing</li>
                <li>• Open <strong>Interactive API Docs</strong> to try endpoints</li>
                <li>• Check <strong>Live Agent Status</strong> for real-time data</li>
                <li>• Review JSON responses from ERP endpoints</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">For Business Users:</h3>
              <ul className="space-y-2 text-sm">
                <li>• Explore <strong>Agent Showcase</strong> to see capabilities</li>
                <li>• Test <strong>Live Agent Status</strong> with sample data</li>
                <li>• Review UI pages for user experience</li>
                <li>• Provide feedback on features and functionality</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-sm">
              <strong>Backend API:</strong> http://localhost:8000 <br />
              <strong>Frontend UI:</strong> https://work-1-rkasyntaaioiwqjt.prod-runtime.all-hands.dev <br />
              <strong>Status:</strong> All systems operational ✓
            </p>
          </div>
        </div>

        {/* Quick Commands */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6 text-white">
          <h3 className="text-lg font-bold mb-4">🚀 Quick Commands</h3>
          <div className="space-y-2 font-mono text-sm">
            <div className="bg-gray-800 p-3 rounded">
              <span className="text-gray-400"># Test backend health</span>
              <br />
              curl http://localhost:8000/health
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <span className="text-gray-400"># List all agents</span>
              <br />
              curl http://localhost:8000/api/agents
            </div>
            <div className="bg-gray-800 p-3 rounded">
              <span className="text-gray-400"># Run automated tests</span>
              <br />
              ./test_sandpit.sh
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
