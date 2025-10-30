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

interface Bot {
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

const botRegistry: Bot[] = [
  // Financial Management (11 bots)
  {
    id: 'accounts_payable',
    name: 'Accounts Payable Bot',
    category: 'Financial',
    status: 'active',
    description: 'Automates AP processing, invoice validation, and approval workflows',
    icon: '💳',
    metrics: { processed: 1250, successRate: 98.5, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/accounts-payable/config',
    reportPath: '/bots/accounts-payable/report',
  },
  {
    id: 'ar_collections',
    name: 'AR Collections Bot',
    category: 'Financial',
    status: 'active',
    description: 'Manages receivables, collections, and payment reminders',
    icon: '💰',
    metrics: { processed: 890, successRate: 97.2, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/ar-collections/config',
    reportPath: '/bots/ar-collections/report',
  },
  {
    id: 'bank_reconciliation',
    name: 'Bank Reconciliation Bot',
    category: 'Financial',
    status: 'active',
    description: 'Automatic bank statement reconciliation and matching',
    icon: '🏦',
    metrics: { processed: 560, successRate: 99.1, avgTime: '3.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/bank-reconciliation/config',
    reportPath: '/bots/bank-reconciliation/report',
  },
  {
    id: 'expense_management',
    name: 'Expense Management Bot',
    category: 'Financial',
    status: 'active',
    description: 'Employee expense processing, approval, and reimbursement',
    icon: '🧾',
    metrics: { processed: 2100, successRate: 96.8, avgTime: '1.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/expense-management/config',
    reportPath: '/bots/expense-management/report',
  },
  {
    id: 'financial_close',
    name: 'Financial Close Bot',
    category: 'Financial',
    status: 'active',
    description: 'Period-end close automation and reconciliation',
    icon: '📊',
    metrics: { processed: 120, successRate: 99.5, avgTime: '45s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/financial-close/config',
    reportPath: '/bots/financial-close/report',
  },
  {
    id: 'financial_reporting',
    name: 'Financial Reporting Bot',
    category: 'Financial',
    status: 'active',
    description: 'Automated financial report generation and distribution',
    icon: '📈',
    metrics: { processed: 450, successRate: 98.9, avgTime: '5.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/financial-reporting/config',
    reportPath: '/bots/financial-reporting/report',
  },
  {
    id: 'general_ledger',
    name: 'General Ledger Bot',
    category: 'Financial',
    status: 'active',
    description: 'GL posting, journal entries, and account management',
    icon: '📖',
    metrics: { processed: 3200, successRate: 99.2, avgTime: '0.9s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/general-ledger/config',
    reportPath: '/bots/general-ledger/report',
  },
  {
    id: 'invoice_reconciliation',
    name: 'Invoice Reconciliation Bot',
    category: 'Financial',
    status: 'active',
    description: 'Invoice matching, reconciliation, and discrepancy resolution',
    icon: '🔄',
    metrics: { processed: 1800, successRate: 97.5, avgTime: '2.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/invoice-reconciliation/config',
    reportPath: '/bots/invoice-reconciliation/report',
  },
  {
    id: 'payment_processing',
    name: 'Payment Processing Bot',
    category: 'Financial',
    status: 'active',
    description: 'Automated payment processing and batch runs',
    icon: '💸',
    metrics: { processed: 2500, successRate: 99.7, avgTime: '1.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/payment-processing/config',
    reportPath: '/bots/payment-processing/report',
  },
  {
    id: 'tax_compliance',
    name: 'Tax Compliance Bot',
    category: 'Financial',
    status: 'active',
    description: 'SA tax compliance (VAT, PAYE, UIF)',
    icon: '🇿🇦',
    metrics: { processed: 680, successRate: 99.8, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/tax-compliance/config',
    reportPath: '/bots/tax-compliance/report',
  },
  {
    id: 'bbbee_compliance',
    name: 'BEE Compliance Bot',
    category: 'Financial',
    status: 'active',
    description: 'B-BBEE scorecard tracking and reporting',
    icon: '⚖️',
    metrics: { processed: 95, successRate: 98.9, avgTime: '8.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/bbbee-compliance/config',
    reportPath: '/bots/bbbee-compliance/report',
  },

  // Procurement & Supply Chain (10 bots)
  {
    id: 'purchase_order',
    name: 'Purchase Order Bot',
    category: 'Procurement',
    status: 'active',
    description: 'PO creation, approval, and tracking',
    icon: '📋',
    metrics: { processed: 1450, successRate: 98.3, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/purchase-order/config',
    reportPath: '/bots/purchase-order/report',
  },
  {
    id: 'supplier_management',
    name: 'Supplier Management Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Vendor master data and relationship management',
    icon: '🤝',
    metrics: { processed: 320, successRate: 99.1, avgTime: '1.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/supplier-management/config',
    reportPath: '/bots/supplier-management/report',
  },
  {
    id: 'supplier_performance',
    name: 'Supplier Performance Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Supplier KPI tracking and scorecards',
    icon: '📊',
    metrics: { processed: 180, successRate: 97.8, avgTime: '4.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/supplier-performance/config',
    reportPath: '/bots/supplier-performance/report',
  },
  {
    id: 'supplier_risk',
    name: 'Supplier Risk Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Supply chain risk assessment and monitoring',
    icon: '⚠️',
    metrics: { processed: 145, successRate: 96.5, avgTime: '6.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/supplier-risk/config',
    reportPath: '/bots/supplier-risk/report',
  },
  {
    id: 'rfq_management',
    name: 'RFQ Management Bot',
    category: 'Procurement',
    status: 'active',
    description: 'RFQ/RFP creation, distribution, and evaluation',
    icon: '📨',
    metrics: { processed: 280, successRate: 98.7, avgTime: '3.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/rfq-management/config',
    reportPath: '/bots/rfq-management/report',
  },
  {
    id: 'procurement_analytics',
    name: 'Procurement Analytics Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Procurement insights and analytics',
    icon: '📈',
    metrics: { processed: 520, successRate: 99.2, avgTime: '2.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/procurement-analytics/config',
    reportPath: '/bots/procurement-analytics/report',
  },
  {
    id: 'spend_analysis',
    name: 'Spend Analysis Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Spend visibility and category analysis',
    icon: '💹',
    metrics: { processed: 890, successRate: 98.1, avgTime: '3.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/spend-analysis/config',
    reportPath: '/bots/spend-analysis/report',
  },
  {
    id: 'source_to_pay',
    name: 'Source-to-Pay Bot',
    category: 'Procurement',
    status: 'active',
    description: 'End-to-end S2P process automation',
    icon: '🔄',
    metrics: { processed: 1200, successRate: 97.9, avgTime: '4.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/source-to-pay/config',
    reportPath: '/bots/source-to-pay/report',
  },
  {
    id: 'goods_receipt',
    name: 'Goods Receipt Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Goods receipt processing and matching',
    icon: '📦',
    metrics: { processed: 1650, successRate: 99.4, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/goods-receipt/config',
    reportPath: '/bots/goods-receipt/report',
  },
  {
    id: 'inventory_optimization',
    name: 'Inventory Optimization Bot',
    category: 'Procurement',
    status: 'active',
    description: 'Inventory level optimization and reorder points',
    icon: '📊',
    metrics: { processed: 780, successRate: 98.6, avgTime: '2.9s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/inventory-optimization/config',
    reportPath: '/bots/inventory-optimization/report',
  },

  // Manufacturing & Operations (11 bots)
  {
    id: 'production_scheduling',
    name: 'Production Scheduling Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Production planning and schedule optimization',
    icon: '📅',
    metrics: { processed: 450, successRate: 97.8, avgTime: '5.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/production-scheduling/config',
    reportPath: '/bots/production-scheduling/report',
  },
  {
    id: 'production_reporting',
    name: 'Production Reporting Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Shop floor reporting and production metrics',
    icon: '📊',
    metrics: { processed: 1200, successRate: 99.1, avgTime: '1.9s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/production-reporting/config',
    reportPath: '/bots/production-reporting/report',
  },
  {
    id: 'work_order',
    name: 'Work Order Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Work order creation, tracking, and completion',
    icon: '🔧',
    metrics: { processed: 980, successRate: 98.5, avgTime: '2.4s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/work-order/config',
    reportPath: '/bots/work-order/report',
  },
  {
    id: 'quality_control',
    name: 'Quality Control Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'QC inspection automation and defect tracking',
    icon: '✓',
    metrics: { processed: 2100, successRate: 99.7, avgTime: '1.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/quality-control/config',
    reportPath: '/bots/quality-control/report',
  },
  {
    id: 'downtime_tracking',
    name: 'Downtime Tracking Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Equipment downtime tracking and analysis',
    icon: '⏱️',
    metrics: { processed: 540, successRate: 98.9, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/downtime-tracking/config',
    reportPath: '/bots/downtime-tracking/report',
  },
  {
    id: 'machine_monitoring',
    name: 'Machine Monitoring Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Real-time machine monitoring and alerts',
    icon: '🖥️',
    metrics: { processed: 8500, successRate: 99.5, avgTime: '0.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/machine-monitoring/config',
    reportPath: '/bots/machine-monitoring/report',
  },
  {
    id: 'oee_calculation',
    name: 'OEE Calculation Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Overall Equipment Effectiveness calculation',
    icon: '⚙️',
    metrics: { processed: 720, successRate: 99.2, avgTime: '2.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/oee-calculation/config',
    reportPath: '/bots/oee-calculation/report',
  },
  {
    id: 'mes_integration',
    name: 'MES Integration Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Manufacturing Execution System integration',
    icon: '🔗',
    metrics: { processed: 3200, successRate: 98.7, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/mes-integration/config',
    reportPath: '/bots/mes-integration/report',
  },
  {
    id: 'tool_management',
    name: 'Tool Management Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Tool lifecycle and inventory management',
    icon: '🔨',
    metrics: { processed: 450, successRate: 97.6, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/tool-management/config',
    reportPath: '/bots/tool-management/report',
  },
  {
    id: 'scrap_management',
    name: 'Scrap Management Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Scrap tracking, analysis, and reduction',
    icon: '♻️',
    metrics: { processed: 890, successRate: 98.4, avgTime: '2.0s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/scrap-management/config',
    reportPath: '/bots/scrap-management/report',
  },
  {
    id: 'operator_instructions',
    name: 'Operator Instructions Bot',
    category: 'Manufacturing',
    status: 'active',
    description: 'Work instruction delivery to operators',
    icon: '📝',
    metrics: { processed: 1500, successRate: 99.3, avgTime: '0.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/operator-instructions/config',
    reportPath: '/bots/operator-instructions/report',
  },

  // Sales & CRM (6 bots)
  {
    id: 'sales_order',
    name: 'Sales Order Bot',
    category: 'Sales',
    status: 'active',
    description: 'Sales order processing and fulfillment',
    icon: '🛒',
    metrics: { processed: 2800, successRate: 99.1, avgTime: '1.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/sales-order/config',
    reportPath: '/bots/sales-order/report',
  },
  {
    id: 'quote_generation',
    name: 'Quote Generation Bot',
    category: 'Sales',
    status: 'active',
    description: 'Automated quote and proposal generation',
    icon: '📄',
    metrics: { processed: 1200, successRate: 98.5, avgTime: '3.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/quote-generation/config',
    reportPath: '/bots/quote-generation/report',
  },
  {
    id: 'lead_management',
    name: 'Lead Management Bot',
    category: 'Sales',
    status: 'active',
    description: 'Lead tracking, nurturing, and conversion',
    icon: '👤',
    metrics: { processed: 3500, successRate: 97.8, avgTime: '1.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/lead-management/config',
    reportPath: '/bots/lead-management/report',
  },
  {
    id: 'lead_qualification',
    name: 'Lead Qualification Bot',
    category: 'Sales',
    status: 'active',
    description: 'Lead scoring and qualification automation',
    icon: '⭐',
    metrics: { processed: 2900, successRate: 96.9, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/lead-qualification/config',
    reportPath: '/bots/lead-qualification/report',
  },
  {
    id: 'opportunity_management',
    name: 'Opportunity Management Bot',
    category: 'Sales',
    status: 'active',
    description: 'Opportunity pipeline and deal management',
    icon: '💼',
    metrics: { processed: 1800, successRate: 98.2, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/opportunity-management/config',
    reportPath: '/bots/opportunity-management/report',
  },
  {
    id: 'sales_analytics',
    name: 'Sales Analytics Bot',
    category: 'Sales',
    status: 'active',
    description: 'Sales performance analytics and forecasting',
    icon: '📈',
    metrics: { processed: 950, successRate: 99.4, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/sales-analytics/config',
    reportPath: '/bots/sales-analytics/report',
  },

  // HR & Payroll (8 bots)
  {
    id: 'time_attendance',
    name: 'Time & Attendance Bot',
    category: 'HR',
    status: 'active',
    description: 'Time tracking and attendance management',
    icon: '⏰',
    metrics: { processed: 4200, successRate: 99.6, avgTime: '0.7s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/time-attendance/config',
    reportPath: '/bots/time-attendance/report',
  },
  {
    id: 'payroll_sa',
    name: 'Payroll (SA) Bot',
    category: 'HR',
    status: 'active',
    description: 'South African payroll processing',
    icon: '💵',
    metrics: { processed: 850, successRate: 99.9, avgTime: '4.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/payroll-sa/config',
    reportPath: '/bots/payroll-sa/report',
  },
  {
    id: 'benefits_administration',
    name: 'Benefits Administration Bot',
    category: 'HR',
    status: 'active',
    description: 'Employee benefits management',
    icon: '🏥',
    metrics: { processed: 320, successRate: 98.7, avgTime: '2.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/benefits-administration/config',
    reportPath: '/bots/benefits-administration/report',
  },
  {
    id: 'recruitment',
    name: 'Recruitment Bot',
    category: 'HR',
    status: 'active',
    description: 'Recruitment workflow automation',
    icon: '👔',
    metrics: { processed: 450, successRate: 97.5, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/recruitment/config',
    reportPath: '/bots/recruitment/report',
  },
  {
    id: 'onboarding',
    name: 'Onboarding Bot',
    category: 'HR',
    status: 'active',
    description: 'Employee onboarding automation',
    icon: '🎓',
    metrics: { processed: 280, successRate: 98.9, avgTime: '5.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/onboarding/config',
    reportPath: '/bots/onboarding/report',
  },
  {
    id: 'performance_management',
    name: 'Performance Management Bot',
    category: 'HR',
    status: 'active',
    description: 'Performance review and goal management',
    icon: '🎯',
    metrics: { processed: 560, successRate: 97.8, avgTime: '4.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/performance-management/config',
    reportPath: '/bots/performance-management/report',
  },
  {
    id: 'learning_development',
    name: 'Learning & Development Bot',
    category: 'HR',
    status: 'active',
    description: 'Training and L&D tracking',
    icon: '📚',
    metrics: { processed: 720, successRate: 98.4, avgTime: '2.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/learning-development/config',
    reportPath: '/bots/learning-development/report',
  },
  {
    id: 'employee_self_service',
    name: 'Employee Self-Service Bot',
    category: 'HR',
    status: 'active',
    description: 'ESS portal automation',
    icon: '👥',
    metrics: { processed: 2100, successRate: 99.2, avgTime: '1.4s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/employee-self-service/config',
    reportPath: '/bots/employee-self-service/report',
  },

  // Document Management (7 bots)
  {
    id: 'document_classification',
    name: 'Document Classification Bot',
    category: 'Documents',
    status: 'active',
    description: 'Automatic document classification and tagging',
    icon: '📁',
    metrics: { processed: 5600, successRate: 98.7, avgTime: '1.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/document-classification/config',
    reportPath: '/bots/document-classification/report',
  },
  {
    id: 'document_scanner',
    name: 'Document Scanner Bot',
    category: 'Documents',
    status: 'active',
    description: 'OCR and document scanning',
    icon: '📷',
    metrics: { processed: 3200, successRate: 97.9, avgTime: '2.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/document-scanner/config',
    reportPath: '/bots/document-scanner/report',
  },
  {
    id: 'data_extraction',
    name: 'Data Extraction Bot',
    category: 'Documents',
    status: 'active',
    description: 'Extract structured data from documents',
    icon: '🔍',
    metrics: { processed: 4800, successRate: 98.2, avgTime: '2.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/data-extraction/config',
    reportPath: '/bots/data-extraction/report',
  },
  {
    id: 'data_validation',
    name: 'Data Validation Bot',
    category: 'Documents',
    status: 'active',
    description: 'Data quality and validation checks',
    icon: '✓',
    metrics: { processed: 6200, successRate: 99.1, avgTime: '0.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/data-validation/config',
    reportPath: '/bots/data-validation/report',
  },
  {
    id: 'archive_management',
    name: 'Archive Management Bot',
    category: 'Documents',
    status: 'active',
    description: 'Document archival and retention',
    icon: '🗄️',
    metrics: { processed: 1200, successRate: 99.8, avgTime: '3.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/archive-management/config',
    reportPath: '/bots/archive-management/report',
  },
  {
    id: 'email_processing',
    name: 'Email Processing Bot',
    category: 'Documents',
    status: 'active',
    description: 'Email parsing, classification, and routing',
    icon: '📧',
    metrics: { processed: 8900, successRate: 97.8, avgTime: '1.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/email-processing/config',
    reportPath: '/bots/email-processing/report',
  },
  {
    id: 'category_management',
    name: 'Category Management Bot',
    category: 'Documents',
    status: 'active',
    description: 'Category and taxonomy management',
    icon: '🏷️',
    metrics: { processed: 450, successRate: 98.5, avgTime: '2.0s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/category-management/config',
    reportPath: '/bots/category-management/report',
  },

  // Governance & Compliance (5 bots)
  {
    id: 'contract_management',
    name: 'Contract Management Bot',
    category: 'Governance',
    status: 'active',
    description: 'Contract lifecycle management',
    icon: '📜',
    metrics: { processed: 320, successRate: 99.1, avgTime: '4.5s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/contract-management/config',
    reportPath: '/bots/contract-management/report',
  },
  {
    id: 'policy_management',
    name: 'Policy Management Bot',
    category: 'Governance',
    status: 'active',
    description: 'Policy version control and distribution',
    icon: '📋',
    metrics: { processed: 180, successRate: 98.9, avgTime: '3.2s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/policy-management/config',
    reportPath: '/bots/policy-management/report',
  },
  {
    id: 'audit_management',
    name: 'Audit Management Bot',
    category: 'Governance',
    status: 'active',
    description: 'Audit trail and compliance tracking',
    icon: '🔍',
    metrics: { processed: 2100, successRate: 99.7, avgTime: '1.8s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/audit-management/config',
    reportPath: '/bots/audit-management/report',
  },
  {
    id: 'risk_management',
    name: 'Risk Management Bot',
    category: 'Governance',
    status: 'active',
    description: 'Risk assessment and mitigation tracking',
    icon: '⚠️',
    metrics: { processed: 280, successRate: 98.3, avgTime: '5.1s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/risk-management/config',
    reportPath: '/bots/risk-management/report',
  },
  {
    id: 'workflow_automation',
    name: 'Workflow Automation Bot',
    category: 'Governance',
    status: 'active',
    description: 'Business workflow automation engine',
    icon: '🔄',
    metrics: { processed: 3500, successRate: 98.6, avgTime: '2.3s' },
    hasConfig: true,
    hasReport: true,
    configPath: '/bots/workflow-automation/config',
    reportPath: '/bots/workflow-automation/report',
  },
];

const BotRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const categories = ['All', ...Array.from(new Set(botRegistry.map(bot => bot.category)))];

  const filteredBots = useMemo(() => {
    return botRegistry.filter(bot => {
      const matchesCategory = selectedCategory === 'All' || bot.category === selectedCategory;
      const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bot.status === statusFilter;
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
          AI Bot Registry
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and monitor all 65 AI bots across your organization
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Total Bots</Typography>
              <Typography variant="h4">{botRegistry.length}</Typography>
              <Chip label="+5 this month" size="small" color="success" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Active Bots</Typography>
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
                placeholder="Search bots..."
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

      {/* Bot Cards */}
      <Grid container spacing={3}>
        {filteredBots.map((bot) => (
          <Grid item xs={12} md={6} lg={4} key={bot.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, mr: 2, fontSize: '24px' }}>
                    {bot.icon}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      {bot.name}
                    </Typography>
                    <Chip
                      label={bot.status}
                      size="small"
                      color={getStatusColor(bot.status) as any}
                      icon={getStatusIcon(bot.status)}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {bot.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Processed</Typography>
                      <Typography variant="body2" fontWeight={600}>{bot.metrics.processed}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Success</Typography>
                      <Typography variant="body2" fontWeight={600}>{bot.metrics.successRate}%</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Avg Time</Typography>
                      <Typography variant="body2" fontWeight={600}>{bot.metrics.avgTime}</Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {bot.hasConfig && (
                    <Tooltip title="Configure Bot">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(bot.configPath!)}
                      >
                        <Settings />
                      </IconButton>
                    </Tooltip>
                  )}
                  {bot.hasReport && (
                    <Tooltip title="View Report">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(bot.reportPath!)}
                      >
                        <BarChart />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Bot Details">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => navigate(`/bots/${bot.id}`)}
                    >
                      <Info />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={bot.status === 'active' ? 'Pause Bot' : 'Start Bot'}>
                    <IconButton
                      size="small"
                      color={bot.status === 'active' ? 'error' : 'success'}
                    >
                      {bot.status === 'active' ? <Pause /> : <PlayArrow />}
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
            No bots found matching your criteria
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
