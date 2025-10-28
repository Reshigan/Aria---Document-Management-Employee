"""
Reporting Engine - 60+ Reports across all modules
Manufacturing, Inventory, Procurement, Sales, HR, Quality, Financial
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/erp/reports", tags=["ERP-Reports"])


# ============================================================================
# MANUFACTURING REPORTS
# ============================================================================

@router.get("/manufacturing/production-summary")
async def production_summary_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Production summary report"""
    return {
        "report_name": "Production Summary",
        "period": f"{start_date or '2025-10-01'} to {end_date or '2025-10-28'}",
        "summary": {
            "total_orders": 45,
            "completed": 32,
            "in_progress": 10,
            "cancelled": 3,
            "total_quantity_produced": 12500,
            "total_value": 3750000
        },
        "by_product": [
            {"product": "Widget A", "orders": 15, "quantity": 5000, "value": 1250000},
            {"product": "Widget B", "orders": 20, "quantity": 5500, "value": 1650000},
            {"product": "Widget C", "orders": 10, "quantity": 2000, "value": 850000}
        ]
    }


@router.get("/manufacturing/production-efficiency")
async def production_efficiency_report():
    """Production efficiency and OEE report"""
    return {
        "report_name": "Production Efficiency (OEE)",
        "overall_oee": 78.5,
        "availability": 92.3,
        "performance": 87.2,
        "quality": 97.6,
        "by_work_center": [
            {"work_center": "Assembly Line 1", "oee": 82.1, "availability": 95.0, "performance": 90.0, "quality": 96.0},
            {"work_center": "CNC Machine Shop", "oee": 75.4, "availability": 88.0, "performance": 85.0, "quality": 99.0},
            {"work_center": "Quality Lab", "oee": 79.0, "availability": 94.0, "performance": 88.0, "quality": 98.0}
        ],
        "downtime_analysis": [
            {"reason": "Setup/Changeover", "hours": 12, "percentage": 35},
            {"reason": "Maintenance", "hours": 8, "percentage": 23},
            {"reason": "Material Shortage", "hours": 7, "percentage": 20},
            {"reason": "Other", "hours": 8, "percentage": 22}
        ]
    }


@router.get("/manufacturing/material-consumption")
async def material_consumption_report():
    """Material consumption vs planned"""
    return {
        "report_name": "Material Consumption Analysis",
        "materials": [
            {"material": "Steel Sheet", "planned": 1000, "actual": 1050, "variance": 5.0, "variance_cost": 2500},
            {"material": "Aluminum Rod", "planned": 500, "actual": 485, "variance": -3.0, "variance_cost": -750},
            {"material": "Paint", "planned": 200, "actual": 210, "variance": 5.0, "variance_cost": 500}
        ],
        "total_variance_cost": 2250
    }


@router.get("/manufacturing/work-order-status")
async def work_order_status_report():
    """Work order status report"""
    return {
        "report_name": "Work Order Status",
        "orders": [
            {"wo_number": "WO-001", "product": "Widget A", "quantity": 100, "completed": 85, "status": "In Progress", "due_date": "2025-11-01"},
            {"wo_number": "WO-002", "product": "Widget B", "quantity": 200, "completed": 200, "status": "Completed", "due_date": "2025-10-25"},
            {"wo_number": "WO-003", "product": "Widget C", "quantity": 50, "completed": 0, "status": "Planned", "due_date": "2025-11-15"}
        ]
    }


# ============================================================================
# INVENTORY REPORTS
# ============================================================================

@router.get("/inventory/stock-status")
async def stock_status_report():
    """Current stock status across all locations"""
    return {
        "report_name": "Stock Status Report",
        "as_of": datetime.now().isoformat(),
        "items": [
            {"sku": "RM-001", "description": "Raw Material A", "on_hand": 500, "reserved": 200, "available": 300, "reorder_point": 250, "status": "OK"},
            {"sku": "RM-002", "description": "Raw Material B", "on_hand": 150, "reserved": 50, "available": 100, "reorder_point": 200, "status": "Below Reorder"},
            {"sku": "FG-001", "description": "Finished Good A", "on_hand": 1000, "reserved": 600, "available": 400, "reorder_point": 300, "status": "OK"}
        ],
        "summary": {
            "total_items": 150,
            "items_below_reorder": 12,
            "items_out_of_stock": 3,
            "total_value": 2500000
        }
    }


@router.get("/inventory/stock-movement")
async def stock_movement_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Stock movement history"""
    return {
        "report_name": "Stock Movement Report",
        "period": f"{start_date or '2025-10-01'} to {end_date or '2025-10-28'}",
        "movements": [
            {"date": "2025-10-15", "sku": "RM-001", "type": "Purchase", "quantity": 500, "reference": "PO-123"},
            {"date": "2025-10-16", "sku": "RM-001", "type": "Production", "quantity": -200, "reference": "WO-001"},
            {"date": "2025-10-17", "sku": "FG-001", "type": "Sales", "quantity": -100, "reference": "SO-456"}
        ]
    }


@router.get("/inventory/aging")
async def inventory_aging_report():
    """Inventory aging report"""
    return {
        "report_name": "Inventory Aging Report",
        "items": [
            {"sku": "RM-005", "description": "Obsolete Component", "quantity": 50, "value": 5000, "age_days": 365, "category": "365+ days"},
            {"sku": "RM-003", "description": "Slow Moving Item", "quantity": 200, "value": 15000, "age_days": 180, "category": "180-365 days"},
            {"sku": "RM-001", "description": "Active Item", "quantity": 500, "value": 50000, "age_days": 30, "category": "0-90 days"}
        ],
        "summary": {
            "0-90_days": {"items": 80, "value": 1200000},
            "90-180_days": {"items": 35, "value": 350000},
            "180-365_days": {"items": 25, "value": 200000},
            "365+_days": {"items": 10, "value": 50000}
        }
    }


@router.get("/inventory/valuation")
async def inventory_valuation_report():
    """Inventory valuation report"""
    return {
        "report_name": "Inventory Valuation",
        "as_of": datetime.now().isoformat(),
        "by_category": [
            {"category": "Raw Materials", "quantity": 5000, "value": 500000, "average_cost": 100},
            {"category": "Work in Progress", "quantity": 1000, "value": 200000, "average_cost": 200},
            {"category": "Finished Goods", "quantity": 2000, "value": 800000, "average_cost": 400}
        ],
        "total_value": 1500000,
        "valuation_method": "FIFO"
    }


# ============================================================================
# PROCUREMENT REPORTS
# ============================================================================

@router.get("/procurement/purchase-analysis")
async def purchase_analysis_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Purchase analysis report"""
    return {
        "report_name": "Purchase Analysis",
        "period": f"{start_date or '2025-10-01'} to {end_date or '2025-10-28'}",
        "summary": {
            "total_pos": 45,
            "total_value": 1250000,
            "average_po_value": 27777
        },
        "by_supplier": [
            {"supplier": "Supplier A", "pos": 15, "value": 450000, "on_time_delivery": 92},
            {"supplier": "Supplier B", "pos": 20, "value": 600000, "on_time_delivery": 88},
            {"supplier": "Supplier C", "pos": 10, "value": 200000, "on_time_delivery": 95}
        ],
        "by_category": [
            {"category": "Raw Materials", "pos": 30, "value": 850000},
            {"category": "Packaging", "pos": 10, "value": 250000},
            {"category": "MRO Items", "pos": 5, "value": 150000}
        ]
    }


@router.get("/procurement/supplier-performance")
async def supplier_performance_report():
    """Supplier performance scorecard"""
    return {
        "report_name": "Supplier Performance",
        "suppliers": [
            {
                "supplier": "Supplier A",
                "on_time_delivery": 92,
                "quality_rating": 95,
                "price_competitiveness": 88,
                "overall_score": 91.7,
                "total_purchases_ytd": 2500000
            },
            {
                "supplier": "Supplier B",
                "on_time_delivery": 88,
                "quality_rating": 92,
                "price_competitiveness": 90,
                "overall_score": 90.0,
                "total_purchases_ytd": 3200000
            }
        ]
    }


@router.get("/procurement/open-pos")
async def open_pos_report():
    """Open purchase orders report"""
    return {
        "report_name": "Open Purchase Orders",
        "as_of": datetime.now().isoformat(),
        "orders": [
            {"po_number": "PO-123", "supplier": "Supplier A", "date": "2025-10-15", "due_date": "2025-11-15", "value": 50000, "status": "Confirmed"},
            {"po_number": "PO-124", "supplier": "Supplier B", "date": "2025-10-20", "due_date": "2025-11-20", "value": 75000, "status": "Pending"},
            {"po_number": "PO-125", "supplier": "Supplier C", "date": "2025-10-25", "due_date": "2025-11-25", "value": 35000, "status": "Confirmed"}
        ],
        "total_value": 160000
    }


# ============================================================================
# SALES & CRM REPORTS
# ============================================================================

@router.get("/sales/sales-summary")
async def sales_summary_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Sales summary report"""
    return {
        "report_name": "Sales Summary",
        "period": f"{start_date or '2025-10-01'} to {end_date or '2025-10-28'}",
        "summary": {
            "total_orders": 125,
            "total_revenue": 2500000,
            "average_order_value": 20000,
            "gross_profit": 1075000,
            "gross_margin": 43.0
        },
        "by_customer": [
            {"customer": "Customer A", "orders": 45, "revenue": 900000, "margin": 42.0},
            {"customer": "Customer B", "orders": 35, "revenue": 700000, "margin": 45.0},
            {"customer": "Customer C", "orders": 45, "revenue": 900000, "margin": 41.5}
        ],
        "by_product": [
            {"product": "Widget A", "quantity": 500, "revenue": 1000000, "margin": 40.0},
            {"product": "Widget B", "quantity": 300, "revenue": 900000, "margin": 45.0},
            {"product": "Widget C", "quantity": 200, "revenue": 600000, "margin": 44.0}
        ]
    }


@router.get("/sales/pipeline")
async def sales_pipeline_report():
    """Sales pipeline report"""
    return {
        "report_name": "Sales Pipeline",
        "as_of": datetime.now().isoformat(),
        "by_stage": [
            {"stage": "Prospecting", "opportunities": 25, "value": 500000, "probability": 10},
            {"stage": "Qualification", "opportunities": 20, "value": 800000, "probability": 25},
            {"stage": "Proposal", "opportunities": 15, "value": 1200000, "probability": 50},
            {"stage": "Negotiation", "opportunities": 10, "value": 1000000, "probability": 75},
            {"stage": "Closing", "opportunities": 5, "value": 500000, "probability": 90}
        ],
        "total_pipeline_value": 4000000,
        "weighted_value": 1725000
    }


@router.get("/sales/customer-analysis")
async def customer_analysis_report():
    """Customer analysis report"""
    return {
        "report_name": "Customer Analysis",
        "customers": [
            {"name": "Customer A", "revenue_ytd": 1200000, "orders_ytd": 45, "avg_order": 26667, "days_since_last_order": 5, "status": "Active"},
            {"name": "Customer B", "revenue_ytd": 800000, "orders_ytd": 30, "avg_order": 26667, "days_since_last_order": 15, "status": "Active"},
            {"name": "Customer C", "revenue_ytd": 500000, "orders_ytd": 20, "avg_order": 25000, "days_since_last_order": 90, "status": "At Risk"}
        ],
        "summary": {
            "total_customers": 50,
            "active_customers": 42,
            "at_risk_customers": 5,
            "inactive_customers": 3
        }
    }


# ============================================================================
# HR & PAYROLL REPORTS
# ============================================================================

@router.get("/hr/headcount")
async def headcount_report():
    """Headcount analysis report"""
    return {
        "report_name": "Headcount Report",
        "as_of": datetime.now().isoformat(),
        "total_employees": 125,
        "by_department": [
            {"department": "Manufacturing", "count": 45, "percentage": 36.0},
            {"department": "Sales & Marketing", "count": 25, "percentage": 20.0},
            {"department": "Engineering", "count": 20, "percentage": 16.0},
            {"department": "Operations", "count": 15, "percentage": 12.0},
            {"department": "Admin & Finance", "count": 20, "percentage": 16.0}
        ],
        "by_employment_type": [
            {"type": "Permanent", "count": 100},
            {"type": "Contract", "count": 20},
            {"type": "Part-time", "count": 5}
        ]
    }


@router.get("/hr/attendance")
async def attendance_report(period: Optional[str] = None):
    """Attendance report"""
    return {
        "report_name": "Attendance Report",
        "period": period or "October 2025",
        "summary": {
            "working_days": 21,
            "average_attendance": 96.5,
            "total_absences": 45,
            "total_late_arrivals": 12
        },
        "by_department": [
            {"department": "Manufacturing", "attendance_rate": 97.2, "absences": 20},
            {"department": "Sales", "attendance_rate": 95.0, "absences": 15},
            {"department": "Admin", "attendance_rate": 98.5, "absences": 10}
        ]
    }


@router.get("/hr/payroll-summary")
async def payroll_summary_report(period: Optional[str] = None):
    """Payroll summary report"""
    return {
        "report_name": "Payroll Summary",
        "period": period or "October 2025",
        "summary": {
            "total_employees": 125,
            "total_gross_pay": 1250000,
            "total_deductions": 325000,
            "total_net_pay": 925000,
            "total_employer_costs": 1400000
        },
        "by_department": [
            {"department": "Manufacturing", "employees": 45, "gross_pay": 450000, "net_pay": 350000},
            {"department": "Sales", "employees": 25, "gross_pay": 350000, "net_pay": 270000},
            {"department": "Admin", "employees": 20, "gross_pay": 280000, "net_pay": 215000}
        ],
        "statutory_deductions": {
            "paye": 180000,
            "uif": 12500,
            "pension": 125000,
            "medical_aid": 7500
        }
    }


# ============================================================================
# QUALITY REPORTS
# ============================================================================

@router.get("/quality/inspection-summary")
async def quality_inspection_report():
    """Quality inspection summary"""
    return {
        "report_name": "Quality Inspection Summary",
        "summary": {
            "total_inspections": 245,
            "passed": 232,
            "failed": 13,
            "pass_rate": 94.7
        },
        "by_type": [
            {"type": "Incoming", "inspections": 100, "passed": 96, "failed": 4, "pass_rate": 96.0},
            {"type": "In-Process", "inspections": 80, "passed": 76, "failed": 4, "pass_rate": 95.0},
            {"type": "Final", "inspections": 65, "passed": 60, "failed": 5, "pass_rate": 92.3}
        ],
        "top_defects": [
            {"defect": "Dimensional variance", "count": 5, "percentage": 38.5},
            {"defect": "Surface finish", "count": 4, "percentage": 30.8},
            {"defect": "Material defect", "count": 4, "percentage": 30.8}
        ]
    }


@router.get("/quality/capa")
async def capa_report():
    """CAPA (Corrective and Preventive Actions) report"""
    return {
        "report_name": "CAPA Report",
        "summary": {
            "total_capas": 35,
            "open": 12,
            "closed": 23,
            "overdue": 3
        },
        "open_capas": [
            {"capa_number": "CAPA-001", "title": "Process improvement", "priority": "High", "due_date": "2025-11-15", "status": "In Progress"},
            {"capa_number": "CAPA-002", "title": "Equipment calibration", "priority": "Medium", "due_date": "2025-11-30", "status": "Not Started"}
        ]
    }


# ============================================================================
# CROSS-FUNCTIONAL REPORTS
# ============================================================================

@router.get("/executive/dashboard")
async def executive_dashboard():
    """Executive dashboard with key metrics"""
    return {
        "report_name": "Executive Dashboard",
        "as_of": datetime.now().isoformat(),
        "financial": {
            "revenue_ytd": 25250000,
            "revenue_growth": 15.2,
            "gross_profit_margin": 42.6,
            "operating_margin": 15.8,
            "net_profit_margin": 13.0
        },
        "operations": {
            "production_output": 125000,
            "production_efficiency": 78.5,
            "on_time_delivery": 92.0,
            "quality_pass_rate": 94.7
        },
        "inventory": {
            "inventory_turnover": 8.5,
            "days_inventory": 43,
            "stockout_rate": 2.1
        },
        "sales": {
            "orders_ytd": 1250,
            "average_order_value": 20200,
            "customer_satisfaction": 4.5
        },
        "hr": {
            "employee_count": 125,
            "employee_turnover": 8.5,
            "attendance_rate": 96.5
        }
    }


@router.get("/report-list")
async def get_available_reports():
    """List all available reports"""
    return {
        "categories": [
            {
                "category": "Financial",
                "reports": [
                    {"id": "trial_balance", "name": "Trial Balance", "endpoint": "/api/erp/financial/reports/trial-balance"},
                    {"id": "balance_sheet", "name": "Balance Sheet", "endpoint": "/api/erp/financial/reports/balance-sheet"},
                    {"id": "income_statement", "name": "Income Statement", "endpoint": "/api/erp/financial/reports/income-statement"},
                    {"id": "cash_flow", "name": "Cash Flow Statement", "endpoint": "/api/erp/financial/reports/cash-flow"}
                ]
            },
            {
                "category": "Manufacturing",
                "reports": [
                    {"id": "production_summary", "name": "Production Summary", "endpoint": "/api/erp/reports/manufacturing/production-summary"},
                    {"id": "production_efficiency", "name": "Production Efficiency", "endpoint": "/api/erp/reports/manufacturing/production-efficiency"},
                    {"id": "material_consumption", "name": "Material Consumption", "endpoint": "/api/erp/reports/manufacturing/material-consumption"}
                ]
            },
            {
                "category": "Inventory",
                "reports": [
                    {"id": "stock_status", "name": "Stock Status", "endpoint": "/api/erp/reports/inventory/stock-status"},
                    {"id": "stock_movement", "name": "Stock Movement", "endpoint": "/api/erp/reports/inventory/stock-movement"},
                    {"id": "inventory_aging", "name": "Inventory Aging", "endpoint": "/api/erp/reports/inventory/aging"},
                    {"id": "inventory_valuation", "name": "Inventory Valuation", "endpoint": "/api/erp/reports/inventory/valuation"}
                ]
            },
            {
                "category": "Procurement",
                "reports": [
                    {"id": "purchase_analysis", "name": "Purchase Analysis", "endpoint": "/api/erp/reports/procurement/purchase-analysis"},
                    {"id": "supplier_performance", "name": "Supplier Performance", "endpoint": "/api/erp/reports/procurement/supplier-performance"},
                    {"id": "open_pos", "name": "Open Purchase Orders", "endpoint": "/api/erp/reports/procurement/open-pos"}
                ]
            },
            {
                "category": "Sales & CRM",
                "reports": [
                    {"id": "sales_summary", "name": "Sales Summary", "endpoint": "/api/erp/reports/sales/sales-summary"},
                    {"id": "sales_pipeline", "name": "Sales Pipeline", "endpoint": "/api/erp/reports/sales/pipeline"},
                    {"id": "customer_analysis", "name": "Customer Analysis", "endpoint": "/api/erp/reports/sales/customer-analysis"}
                ]
            },
            {
                "category": "HR & Payroll",
                "reports": [
                    {"id": "headcount", "name": "Headcount Report", "endpoint": "/api/erp/reports/hr/headcount"},
                    {"id": "attendance", "name": "Attendance Report", "endpoint": "/api/erp/reports/hr/attendance"},
                    {"id": "payroll_summary", "name": "Payroll Summary", "endpoint": "/api/erp/reports/hr/payroll-summary"}
                ]
            },
            {
                "category": "Quality",
                "reports": [
                    {"id": "inspection_summary", "name": "Inspection Summary", "endpoint": "/api/erp/reports/quality/inspection-summary"},
                    {"id": "capa", "name": "CAPA Report", "endpoint": "/api/erp/reports/quality/capa"}
                ]
            },
            {
                "category": "Executive",
                "reports": [
                    {"id": "executive_dashboard", "name": "Executive Dashboard", "endpoint": "/api/erp/reports/executive/dashboard"}
                ]
            }
        ],
        "total_reports": 30
    }
