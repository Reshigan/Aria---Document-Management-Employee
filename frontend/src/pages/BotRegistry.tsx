import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Settings,
  PlayArrow,
  Pause,
  BarChart,
  Info,
  CheckCircle,
  Error,
  Warning,
  Search,
  FilterList,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Agent {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'inactive' | 'error' | 'warning';
  description: string;
  icon: string;
  metrics: {
    processed: number;
    successRate: number;
    avgTime: string;
  };
  hasConfig: boolean;
  hasReport: boolean;
  configPath?: string;
  reportPath?: string;
}

const botRegistry: Agent[] = [
  // Financial Management (11 agents)
  {
    id: 'accounts_payable',
    name: 'Accounts Payable Agent',
    category: 'Financial',
    status: 'active',
    description: 'Automates AP processing, invoice validation, and approval workflows',
    icon: '💳',
    metrics: { processed: 1250, successRate: 98.5, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/accounts-payable/config',
    reportPath: '/agents/accounts-payable/report',
  },
  {
    id: 'ar_collections',
    name: 'AR Collections Agent',
    category: 'Financial',
    status: 'active',
    description: 'Manages receivables, collections, and payment reminders',
    icon: '💰',
    metrics: { processed: 890, successRate: 97.2, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/ar-collections/config',
    reportPath: '/agents/ar-collections/report',
  },
  {
    id: 'bank_reconciliation',
    name: 'Bank Reconciliation Agent',
    category: 'Financial',
    status: 'active',
    description: 'Automatic bank statement reconciliation and matching',
    icon: '🏦',
    metrics: { processed: 560, successRate: 99.1, avgTime: '3.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/bank-reconciliation/config',
    reportPath: '/agents/bank-reconciliation/report',
  },
  {
    id: 'expense_management',
    name: 'Expense Management Agent',
    category: 'Financial',
    status: 'active',
    description: 'Employee expense processing, approval, and reimbursement',
    icon: '🧾',
    metrics: { processed: 2100, successRate: 96.8, avgTime: '1.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/expense-management/config',
    reportPath: '/agents/expense-management/report',
  },
  {
    id: 'financial_close',
    name: 'Financial Close Agent',
    category: 'Financial',
    status: 'active',
    description: 'Period-end close automation and reconciliation',
    icon: '📊',
    metrics: { processed: 120, successRate: 99.5, avgTime: '45s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/financial-close/config',
    reportPath: '/agents/financial-close/report',
  },
  {
    id: 'financial_reporting',
    name: 'Financial Reporting Agent',
    category: 'Financial',
    status: 'active',
    description: 'Automated financial report generation and distribution',
    icon: '📈',
    metrics: { processed: 450, successRate: 98.9, avgTime: '5.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/financial-reporting/config',
    reportPath: '/agents/financial-reporting/report',
  },
  {
    id: 'general_ledger',
    name: 'General Ledger Agent',
    category: 'Financial',
    status: 'active',
    description: 'GL posting, journal entries, and account management',
    icon: '📖',
    metrics: { processed: 3200, successRate: 99.2, avgTime: '0.9s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/general-ledger/config',
    reportPath: '/agents/general-ledger/report',
  },
  {
    id: 'invoice_reconciliation',
    name: 'Invoice Reconciliation Agent',
    category: 'Financial',
    status: 'active',
    description: 'Invoice matching, reconciliation, and discrepancy resolution',
    icon: '🔄',
    metrics: { processed: 1800, successRate: 97.5, avgTime: '2.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/invoice-reconciliation/config',
    reportPath: '/agents/invoice-reconciliation/report',
  },
  {
    id: 'payment_processing',
    name: 'Payment Processing Agent',
    category: 'Financial',
    status: 'active',
    description: 'Automated payment processing and batch runs',
    icon: '💸',
    metrics: { processed: 2500, successRate: 99.7, avgTime: '1.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/payment-processing/config',
    reportPath: '/agents/payment-processing/report',
  },
  {
    id: 'tax_compliance',
    name: 'Tax Compliance Agent',
    category: 'Financial',
    status: 'active',
    description: 'SA tax compliance (VAT, PAYE, UIF)',
    icon: '🇿🇦',
    metrics: { processed: 680, successRate: 99.8, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/tax-compliance/config',
    reportPath: '/agents/tax-compliance/report',
  },
  {
    id: 'bbbee_compliance',
    name: 'BEE Compliance Agent',
    category: 'Financial',
    status: 'active',
    description: 'B-BBEE scorecard tracking and reporting',
    icon: '⚖️',
    metrics: { processed: 95, successRate: 98.9, avgTime: '8.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/bbbee-compliance/config',
    reportPath: '/agents/bbbee-compliance/report',
  },

  // Procurement & Supply Chain (10 agents)
  {
    id: 'purchase_order',
    name: 'Purchase Order Agent',
    category: 'Procurement',
    status: 'active',
    description: 'PO creation, approval, and tracking',
    icon: '📋',
    metrics: { processed: 1450, successRate: 98.3, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/purchase-order/config',
    reportPath: '/agents/purchase-order/report',
  },
  {
    id: 'supplier_management',
    name: 'Supplier Management Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Vendor master data and relationship management',
    icon: '🤝',
    metrics: { processed: 320, successRate: 99.1, avgTime: '1.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/supplier-management/config',
    reportPath: '/agents/supplier-management/report',
  },
  {
    id: 'supplier_performance',
    name: 'Supplier Performance Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Supplier KPI tracking and scorecards',
    icon: '📊',
    metrics: { processed: 180, successRate: 97.8, avgTime: '4.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/supplier-performance/config',
    reportPath: '/agents/supplier-performance/report',
  },
  {
    id: 'supplier_risk',
    name: 'Supplier Risk Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Supply chain risk assessment and monitoring',
    icon: '⚠️',
    metrics: { processed: 145, successRate: 96.5, avgTime: '6.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/supplier-risk/config',
    reportPath: '/agents/supplier-risk/report',
  },
  {
    id: 'rfq_management',
    name: 'RFQ Management Agent',
    category: 'Procurement',
    status: 'active',
    description: 'RFQ/RFP creation, distribution, and evaluation',
    icon: '📨',
    metrics: { processed: 280, successRate: 98.7, avgTime: '3.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/rfq-management/config',
    reportPath: '/agents/rfq-management/report',
  },
  {
    id: 'procurement_analytics',
    name: 'Procurement Analytics Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Procurement insights and analytics',
    icon: '📈',
    metrics: { processed: 520, successRate: 99.2, avgTime: '2.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/procurement-analytics/config',
    reportPath: '/agents/procurement-analytics/report',
  },
  {
    id: 'spend_analysis',
    name: 'Spend Analysis Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Spend visibility and category analysis',
    icon: '💹',
    metrics: { processed: 890, successRate: 98.1, avgTime: '3.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/spend-analysis/config',
    reportPath: '/agents/spend-analysis/report',
  },
  {
    id: 'source_to_pay',
    name: 'Source-to-Pay Agent',
    category: 'Procurement',
    status: 'active',
    description: 'End-to-end S2P process automation',
    icon: '🔄',
    metrics: { processed: 1200, successRate: 97.9, avgTime: '4.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/source-to-pay/config',
    reportPath: '/agents/source-to-pay/report',
  },
  {
    id: 'goods_receipt',
    name: 'Goods Receipt Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Goods receipt processing and matching',
    icon: '📦',
    metrics: { processed: 1650, successRate: 99.4, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/goods-receipt/config',
    reportPath: '/agents/goods-receipt/report',
  },
  {
    id: 'inventory_optimization',
    name: 'Inventory Optimization Agent',
    category: 'Procurement',
    status: 'active',
    description: 'Inventory level optimization and reorder points',
    icon: '📊',
    metrics: { processed: 780, successRate: 98.6, avgTime: '2.9s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/inventory-optimization/config',
    reportPath: '/agents/inventory-optimization/report',
  },

  // Manufacturing & Operations (11 agents)
  {
    id: 'production_scheduling',
    name: 'Production Scheduling Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Production planning and schedule optimization',
    icon: '📅',
    metrics: { processed: 450, successRate: 97.8, avgTime: '5.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/production-scheduling/config',
    reportPath: '/agents/production-scheduling/report',
  },
  {
    id: 'production_reporting',
    name: 'Production Reporting Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Shop floor reporting and production metrics',
    icon: '📊',
    metrics: { processed: 1200, successRate: 99.1, avgTime: '1.9s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/production-reporting/config',
    reportPath: '/agents/production-reporting/report',
  },
  {
    id: 'work_order',
    name: 'Work Order Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Work order creation, tracking, and completion',
    icon: '🔧',
    metrics: { processed: 980, successRate: 98.5, avgTime: '2.4s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/work-order/config',
    reportPath: '/agents/work-order/report',
  },
  {
    id: 'quality_control',
    name: 'Quality Control Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'QC inspection automation and defect tracking',
    icon: '✓',
    metrics: { processed: 2100, successRate: 99.7, avgTime: '1.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/quality-control/config',
    reportPath: '/agents/quality-control/report',
  },
  {
    id: 'downtime_tracking',
    name: 'Downtime Tracking Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Equipment downtime tracking and analysis',
    icon: '⏱️',
    metrics: { processed: 540, successRate: 98.9, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/downtime-tracking/config',
    reportPath: '/agents/downtime-tracking/report',
  },
  {
    id: 'machine_monitoring',
    name: 'Machine Monitoring Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Real-time machine monitoring and alerts',
    icon: '🖥️',
    metrics: { processed: 8500, successRate: 99.5, avgTime: '0.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/machine-monitoring/config',
    reportPath: '/agents/machine-monitoring/report',
  },
  {
    id: 'oee_calculation',
    name: 'OEE Calculation Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Overall Equipment Effectiveness calculation',
    icon: '⚙️',
    metrics: { processed: 720, successRate: 99.2, avgTime: '2.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/oee-calculation/config',
    reportPath: '/agents/oee-calculation/report',
  },
  {
    id: 'mes_integration',
    name: 'MES Integration Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Manufacturing Execution System integration',
    icon: '🔗',
    metrics: { processed: 3200, successRate: 98.7, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/mes-integration/config',
    reportPath: '/agents/mes-integration/report',
  },
  {
    id: 'tool_management',
    name: 'Tool Management Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Tool lifecycle and inventory management',
    icon: '🔨',
    metrics: { processed: 450, successRate: 97.6, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/tool-management/config',
    reportPath: '/agents/tool-management/report',
  },
  {
    id: 'scrap_management',
    name: 'Scrap Management Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Scrap tracking, analysis, and reduction',
    icon: '♻️',
    metrics: { processed: 890, successRate: 98.4, avgTime: '2.0s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/scrap-management/config',
    reportPath: '/agents/scrap-management/report',
  },
  {
    id: 'operator_instructions',
    name: 'Operator Instructions Agent',
    category: 'Manufacturing',
    status: 'active',
    description: 'Work instruction delivery to operators',
    icon: '📝',
    metrics: { processed: 1500, successRate: 99.3, avgTime: '0.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/operator-instructions/config',
    reportPath: '/agents/operator-instructions/report',
  },

  // Sales & CRM (6 agents)
  {
    id: 'sales_order',
    name: 'Sales Order Agent',
    category: 'Sales',
    status: 'active',
    description: 'Sales order processing and fulfillment',
    icon: '🛒',
    metrics: { processed: 2800, successRate: 99.1, avgTime: '1.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/sales-order/config',
    reportPath: '/agents/sales-order/report',
  },
  {
    id: 'quote_generation',
    name: 'Quote Generation Agent',
    category: 'Sales',
    status: 'active',
    description: 'Automated quote and proposal generation',
    icon: '📄',
    metrics: { processed: 1200, successRate: 98.5, avgTime: '3.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/quote-generation/config',
    reportPath: '/agents/quote-generation/report',
  },
  {
    id: 'lead_management',
    name: 'Lead Management Agent',
    category: 'Sales',
    status: 'active',
    description: 'Lead tracking, nurturing, and conversion',
    icon: '👤',
    metrics: { processed: 3500, successRate: 97.8, avgTime: '1.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/lead-management/config',
    reportPath: '/agents/lead-management/report',
  },
  {
    id: 'lead_qualification',
    name: 'Lead Qualification Agent',
    category: 'Sales',
    status: 'active',
    description: 'Lead scoring and qualification automation',
    icon: '⭐',
    metrics: { processed: 2900, successRate: 96.9, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/lead-qualification/config',
    reportPath: '/agents/lead-qualification/report',
  },
  {
    id: 'opportunity_management',
    name: 'Opportunity Management Agent',
    category: 'Sales',
    status: 'active',
    description: 'Opportunity pipeline and deal management',
    icon: '💼',
    metrics: { processed: 1800, successRate: 98.2, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/opportunity-management/config',
    reportPath: '/agents/opportunity-management/report',
  },
  {
    id: 'sales_analytics',
    name: 'Sales Analytics Agent',
    category: 'Sales',
    status: 'active',
    description: 'Sales performance analytics and forecasting',
    icon: '📈',
    metrics: { processed: 950, successRate: 99.4, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/sales-analytics/config',
    reportPath: '/agents/sales-analytics/report',
  },

  // HR & Payroll (8 agents)
  {
    id: 'time_attendance',
    name: 'Time & Attendance Agent',
    category: 'HR',
    status: 'active',
    description: 'Time tracking and attendance management',
    icon: '⏰',
    metrics: { processed: 4200, successRate: 99.6, avgTime: '0.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/time-attendance/config',
    reportPath: '/agents/time-attendance/report',
  },
  {
    id: 'payroll_sa',
    name: 'Payroll (SA) Agent',
    category: 'HR',
    status: 'active',
    description: 'South African payroll processing',
    icon: '💵',
    metrics: { processed: 850, successRate: 99.9, avgTime: '4.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/payroll-sa/config',
    reportPath: '/agents/payroll-sa/report',
  },
  {
    id: 'benefits_administration',
    name: 'Benefits Administration Agent',
    category: 'HR',
    status: 'active',
    description: 'Employee benefits management',
    icon: '🏥',
    metrics: { processed: 320, successRate: 98.7, avgTime: '2.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/benefits-administration/config',
    reportPath: '/agents/benefits-administration/report',
  },
  {
    id: 'recruitment',
    name: 'Recruitment Agent',
    category: 'HR',
    status: 'active',
    description: 'Recruitment workflow automation',
    icon: '👔',
    metrics: { processed: 450, successRate: 97.5, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/recruitment/config',
    reportPath: '/agents/recruitment/report',
  },
  {
    id: 'onboarding',
    name: 'Onboarding Agent',
    category: 'HR',
    status: 'active',
    description: 'Employee onboarding automation',
    icon: '🎓',
    metrics: { processed: 280, successRate: 98.9, avgTime: '5.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/onboarding/config',
    reportPath: '/agents/onboarding/report',
  },
  {
    id: 'performance_management',
    name: 'Performance Management Agent',
    category: 'HR',
    status: 'active',
    description: 'Performance review and goal management',
    icon: '🎯',
    metrics: { processed: 560, successRate: 97.8, avgTime: '4.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/performance-management/config',
    reportPath: '/agents/performance-management/report',
  },
  {
    id: 'learning_development',
    name: 'Learning & Development Agent',
    category: 'HR',
    status: 'active',
    description: 'Training and L&D tracking',
    icon: '📚',
    metrics: { processed: 720, successRate: 98.4, avgTime: '2.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/learning-development/config',
    reportPath: '/agents/learning-development/report',
  },
  {
    id: 'employee_self_service',
    name: 'Employee Self-Service Agent',
    category: 'HR',
    status: 'active',
    description: 'ESS portal automation',
    icon: '👥',
    metrics: { processed: 2100, successRate: 99.2, avgTime: '1.4s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/employee-self-service/config',
    reportPath: '/agents/employee-self-service/report',
  },

  // Document Management (7 agents)
  {
    id: 'document_classification',
    name: 'Document Classification Agent',
    category: 'Documents',
    status: 'active',
    description: 'Automatic document classification and tagging',
    icon: '📁',
    metrics: { processed: 5600, successRate: 98.7, avgTime: '1.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/document-classification/config',
    reportPath: '/agents/document-classification/report',
  },
  {
    id: 'document_scanner',
    name: 'Document Scanner Agent',
    category: 'Documents',
    status: 'active',
    description: 'OCR and document scanning',
    icon: '📷',
    metrics: { processed: 3200, successRate: 97.9, avgTime: '2.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/document-scanner/config',
    reportPath: '/agents/document-scanner/report',
  },
  {
    id: 'data_extraction',
    name: 'Data Extraction Agent',
    category: 'Documents',
    status: 'active',
    description: 'Extract structured data from documents',
    icon: '🔍',
    metrics: { processed: 4800, successRate: 98.2, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/data-extraction/config',
    reportPath: '/agents/data-extraction/report',
  },
  {
    id: 'data_validation',
    name: 'Data Validation Agent',
    category: 'Documents',
    status: 'active',
    description: 'Data quality and validation checks',
    icon: '✓',
    metrics: { processed: 6200, successRate: 99.1, avgTime: '0.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/data-validation/config',
    reportPath: '/agents/data-validation/report',
  },
  {
    id: 'archive_management',
    name: 'Archive Management Agent',
    category: 'Documents',
    status: 'active',
    description: 'Document archival and retention',
    icon: '🗄️',
    metrics: { processed: 1200, successRate: 99.8, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/archive-management/config',
    reportPath: '/agents/archive-management/report',
  },
  {
    id: 'email_processing',
    name: 'Email Processing Agent',
    category: 'Documents',
    status: 'active',
    description: 'Email parsing, classification, and routing',
    icon: '📧',
    metrics: { processed: 8900, successRate: 97.8, avgTime: '1.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/email-processing/config',
    reportPath: '/agents/email-processing/report',
  },
  {
    id: 'category_management',
    name: 'Category Management Agent',
    category: 'Documents',
    status: 'active',
    description: 'Category and taxonomy management',
    icon: '🏷️',
    metrics: { processed: 450, successRate: 98.5, avgTime: '2.0s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/category-management/config',
    reportPath: '/agents/category-management/report',
  },

  // Governance & Compliance (5 agents)
  {
    id: 'contract_management',
    name: 'Contract Management Agent',
    category: 'Governance',
    status: 'active',
    description: 'Contract lifecycle management',
    icon: '📜',
    metrics: { processed: 320, successRate: 99.1, avgTime: '4.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/contract-management/config',
    reportPath: '/agents/contract-management/report',
  },
  {
    id: 'policy_management',
    name: 'Policy Management Agent',
    category: 'Governance',
    status: 'active',
    description: 'Policy version control and distribution',
    icon: '📋',
    metrics: { processed: 180, successRate: 98.9, avgTime: '3.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/policy-management/config',
    reportPath: '/agents/policy-management/report',
  },
  {
    id: 'audit_management',
    name: 'Audit Management Agent',
    category: 'Governance',
    status: 'active',
    description: 'Audit trail and compliance tracking',
    icon: '🔍',
    metrics: { processed: 2100, successRate: 99.7, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/audit-management/config',
    reportPath: '/agents/audit-management/report',
  },
  {
    id: 'risk_management',
    name: 'Risk Management Agent',
    category: 'Governance',
    status: 'active',
    description: 'Risk assessment and mitigation tracking',
    icon: '⚠️',
    metrics: { processed: 280, successRate: 98.3, avgTime: '5.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/risk-management/config',
    reportPath: '/agents/risk-management/report',
  },
  {
    id: 'workflow_automation',
    name: 'Workflow Automation Agent',
    category: 'Governance',
    status: 'active',
    description: 'Business workflow automation engine',
    icon: '🔄',
    metrics: { processed: 3500, successRate: 98.6, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/agents/workflow-automation/config',
    reportPath: '/agents/workflow-automation/report',
  },
];

const BotRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const categories = ['All', ...Array.from(new Set(botRegistry.map(agent => agent.category)))];

  const filteredBots = useMemo(() => {
    return botRegistry.filter(agent => {
      const matchesCategory = selectedCategory === 'All' || agent.category === selectedCategory;
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [selectedCategory, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'inactive': return <Pause />;
      case 'error': return <Error />;
      case 'warning': return <Warning />;
      default: return <Info />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
          AI Agent Registry
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and monitor all 65 AI agents across your organization
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Total Agents</Typography>
              <Typography variant="h4">{botRegistry.length}</Typography>
              <Chip label="+5 this month" size="small" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Active Agents</Typography>
              <Typography variant="h4">{botRegistry.filter(b => b.status === 'active').length}</Typography>
              <LinearProgress variant="determinate" value={98.5} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Avg Success Rate</Typography>
              <Typography variant="h4">98.4%</Typography>
              <Typography variant="caption" color="success.main">↑ 2.3% vs last month</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Total Processed</Typography>
              <Typography variant="h4">127K</Typography>
              <Typography variant="caption" color="success.main">↑ 12% vs last month</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tabs
                value={selectedCategory}
                onChange={(_, value) => setSelectedCategory(value)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {categories.map((category) => (
                  <Tab key={category} label={category} value={category} />
                ))}
              </Tabs>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Agent Cards */}
      <Grid container spacing={3}>
        {filteredBots.map((agent) => (
          <Grid item xs={12} md={6} lg={4} key={agent.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, mr: 2, fontSize: '24px' }}>
                    {agent.icon}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {agent.name}
                    </Typography>
                    <Chip
                      label={agent.status}
                      size="small"
                      color={getStatusColor(agent.status) as any}
                      icon={getStatusIcon(agent.status)}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {agent.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Processed</Typography>
                      <Typography variant="body2" fontWeight={600}>{agent.metrics.processed}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Success</Typography>
                      <Typography variant="body2" fontWeight={600}>{agent.metrics.successRate}%</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Avg Time</Typography>
                      <Typography variant="body2" fontWeight={600}>{agent.metrics.avgTime}</Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {agent.hasConfig && (
                    <Tooltip title="Configure Agent">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(agent.configPath!)}
                      >
                        <Settings />
                      </IconButton>
                    </Tooltip>
                  )}
                  {agent.hasReport && (
                    <Tooltip title="View Report">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(agent.reportPath!)}
                      >
                        <BarChart />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Agent Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => navigate(`/agents/${agent.id}`)}
                    >
                      <Info />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={agent.status === 'active' ? 'Pause Agent' : 'Start Agent'}>
                    <IconButton
                      size="small"
                      color={agent.status === 'active' ? 'error' : 'success'}
                    >
                      {agent.status === 'active' ? <Pause /> : <PlayArrow />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredBots.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No agents found matching your criteria
          </Typography>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setSelectedCategory('All');
            }}
          >
            Clear Filters
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BotRegistry;
