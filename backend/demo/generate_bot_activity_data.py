#!/usr/bin/env python3
"""
Generate comprehensive bot activity data for all 27 ARIA bots
Simulates realistic bot operations for demo tenant TechForge Manufacturing
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict
from pathlib import Path

# Bot definitions
ALL_BOTS = {
    # Financial Bots (9)
    "invoice_reconciliation": {
        "name": "Invoice Reconciliation Bot",
        "category": "Financial",
        "actions": ["match_invoice", "detect_duplicate", "flag_discrepancy", "auto_code"],
        "success_rate": 0.95,
        "avg_time_seconds": 45
    },
    "accounts_payable": {
        "name": "Accounts Payable Bot",
        "category": "Financial",
        "actions": ["capture_invoice", "route_approval", "schedule_payment", "update_vendor"],
        "success_rate": 0.92,
        "avg_time_seconds": 60
    },
    "ar_collections": {
        "name": "AR Collections Bot",
        "category": "Financial",
        "actions": ["send_reminder", "predict_payment", "escalate", "analyze_aging"],
        "success_rate": 0.88,
        "avg_time_seconds": 30
    },
    "bank_reconciliation": {
        "name": "Bank Reconciliation Bot",
        "category": "Financial",
        "actions": ["import_statement", "match_transaction", "detect_discrepancy", "reconcile"],
        "success_rate": 0.94,
        "avg_time_seconds": 90
    },
    "general_ledger": {
        "name": "General Ledger Bot",
        "category": "Financial",
        "actions": ["post_entry", "validate_balance", "reconcile_account", "close_period"],
        "success_rate": 0.96,
        "avg_time_seconds": 120
    },
    "financial_close": {
        "name": "Financial Close Bot",
        "category": "Financial",
        "actions": ["post_accrual", "validate_checklist", "generate_report", "close_month"],
        "success_rate": 0.93,
        "avg_time_seconds": 300
    },
    "expense_approval": {
        "name": "Expense Approval Bot",
        "category": "Financial",
        "actions": ["extract_receipt", "auto_code", "check_policy", "route_approval"],
        "success_rate": 0.90,
        "avg_time_seconds": 40
    },
    "analytics": {
        "name": "Analytics Bot",
        "category": "Financial",
        "actions": ["analyze_trend", "explain_variance", "forecast", "answer_query"],
        "success_rate": 0.85,
        "avg_time_seconds": 15
    },
    "sap_document": {
        "name": "SAP Document Bot",
        "category": "Financial",
        "actions": ["extract_data", "migrate_document", "sync_realtime", "validate"],
        "success_rate": 0.91,
        "avg_time_seconds": 180
    },
    
    # Compliance Bots (2)
    "bbbee_compliance": {
        "name": "BBBEE Compliance Bot",
        "category": "Compliance",
        "actions": ["verify_certificate", "calculate_scorecard", "track_spend", "generate_report"],
        "success_rate": 0.94,
        "avg_time_seconds": 240
    },
    "compliance_audit": {
        "name": "Compliance Audit Bot",
        "category": "Compliance",
        "actions": ["check_policy", "analyze_logs", "score_risk", "generate_alert"],
        "success_rate": 0.92,
        "avg_time_seconds": 180
    },
    
    # Sales & CRM Bots (3)
    "lead_qualification": {
        "name": "Lead Qualification Bot",
        "category": "Sales",
        "actions": ["score_lead", "send_followup", "update_crm", "predict_conversion"],
        "success_rate": 0.78,
        "avg_time_seconds": 60
    },
    "quote_generation": {
        "name": "Quote Generation Bot",
        "category": "Sales",
        "actions": ["calculate_pricing", "generate_quote", "send_email", "track_response"],
        "success_rate": 0.89,
        "avg_time_seconds": 120
    },
    "sales_order": {
        "name": "Sales Order Bot",
        "category": "Sales",
        "actions": ["capture_order", "check_credit", "allocate_inventory", "schedule_delivery"],
        "success_rate": 0.91,
        "avg_time_seconds": 90
    },
    
    # Operations Bots (5)
    "inventory_reorder": {
        "name": "Inventory Reorder Bot",
        "category": "Operations",
        "actions": ["forecast_demand", "calculate_reorder", "generate_po", "select_supplier"],
        "success_rate": 0.87,
        "avg_time_seconds": 300
    },
    "purchasing": {
        "name": "Purchasing Bot",
        "category": "Operations",
        "actions": ["generate_rfq", "compare_quotes", "create_po", "match_receipt"],
        "success_rate": 0.90,
        "avg_time_seconds": 180
    },
    "warehouse_management": {
        "name": "Warehouse Management Bot",
        "category": "Operations",
        "actions": ["optimize_picklist", "update_bin", "schedule_count", "generate_label"],
        "success_rate": 0.93,
        "avg_time_seconds": 30
    },
    "manufacturing": {
        "name": "Manufacturing Bot",
        "category": "Operations",
        "actions": ["schedule_production", "plan_materials", "generate_workorder", "track_quality"],
        "success_rate": 0.89,
        "avg_time_seconds": 240
    },
    "project_management": {
        "name": "Project Management Bot",
        "category": "Operations",
        "actions": ["assign_task", "track_progress", "allocate_resource", "monitor_budget"],
        "success_rate": 0.86,
        "avg_time_seconds": 120
    },
    
    # HR & Payroll Bots (3)
    "payroll": {
        "name": "Payroll Bot",
        "category": "HR",
        "actions": ["calculate_payroll", "submit_emp201", "generate_payslip", "generate_irp5"],
        "success_rate": 0.97,
        "avg_time_seconds": 600
    },
    "employee_onboarding": {
        "name": "Employee Onboarding Bot",
        "category": "HR",
        "actions": ["collect_documents", "provision_access", "schedule_training", "update_checklist"],
        "success_rate": 0.91,
        "avg_time_seconds": 300
    },
    "leave_management": {
        "name": "Leave Management Bot",
        "category": "HR",
        "actions": ["calculate_balance", "route_approval", "update_calendar", "check_compliance"],
        "success_rate": 0.95,
        "avg_time_seconds": 45
    },
    
    # Support Bots (2)
    "it_helpdesk": {
        "name": "IT Helpdesk Bot",
        "category": "Support",
        "actions": ["classify_ticket", "auto_resolve", "escalate", "search_kb"],
        "success_rate": 0.60,
        "avg_time_seconds": 120
    },
    "whatsapp_helpdesk": {
        "name": "WhatsApp Helpdesk Bot",
        "category": "Support",
        "actions": ["understand_query", "respond", "handoff", "collect_feedback"],
        "success_rate": 0.75,
        "avg_time_seconds": 30
    },
    
    # Contract Bots (1)
    "contract_renewal": {
        "name": "Contract Renewal Bot",
        "category": "Contract",
        "actions": ["send_reminder", "auto_renew", "compare_terms", "route_approval"],
        "success_rate": 0.92,
        "avg_time_seconds": 180
    },
    
    # Meta Bot (1)
    "meta_orchestrator": {
        "name": "Meta Bot Orchestrator",
        "category": "Meta",
        "actions": ["coordinate_bots", "resolve_conflict", "share_context", "optimize_workflow"],
        "success_rate": 0.88,
        "avg_time_seconds": 60
    }
}

def generate_bot_activities(days_back=30, activities_per_day=150):
    """Generate realistic bot activity data"""
    
    activities = []
    activity_id = 1
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    # Generate activities for each day
    current_date = start_date
    while current_date <= end_date:
        # Vary activity count by day of week (more on weekdays)
        is_weekend = current_date.weekday() >= 5
        day_activities = int(activities_per_day * (0.3 if is_weekend else 1.0))
        
        for _ in range(day_activities):
            # Select random bot (weighted by usage frequency)
            bot_weights = {
                # Financial bots are used most frequently
                **{k: 3.0 for k in ["invoice_reconciliation", "accounts_payable", "expense_approval", "general_ledger"]},
                # Compliance and operations moderate use
                **{k: 2.0 for k in ["bbbee_compliance", "bank_reconciliation", "warehouse_management"]},
                # HR monthly/periodic use
                **{k: 1.5 for k in ["payroll", "leave_management"]},
                # Support high frequency
                **{k: 2.5 for k in ["it_helpdesk", "whatsapp_helpdesk"]},
                # Others normal frequency
                **{k: 1.0 for k in ALL_BOTS.keys() if k not in [
                    "invoice_reconciliation", "accounts_payable", "expense_approval", "general_ledger",
                    "bbbee_compliance", "bank_reconciliation", "warehouse_management",
                    "payroll", "leave_management", "it_helpdesk", "whatsapp_helpdesk"
                ]}
            }
            
            bot_key = random.choices(
                list(bot_weights.keys()),
                weights=list(bot_weights.values()),
                k=1
            )[0]
            
            bot = ALL_BOTS[bot_key]
            
            # Random action for this bot
            action = random.choice(bot["actions"])
            
            # Determine success based on bot's success rate
            success = random.random() < bot["success_rate"]
            status = "completed" if success else "failed"
            
            # Random time variation (80-120% of average)
            execution_time = int(bot["avg_time_seconds"] * random.uniform(0.8, 1.2))
            
            # Random entity IDs
            entity_id = f"{bot_key.upper()[:3]}-{random.randint(1000, 9999)}"
            
            # Generate timestamp (random time during business hours)
            hour = random.randint(7, 18) if not is_weekend else random.randint(9, 14)
            minute = random.randint(0, 59)
            timestamp = current_date.replace(hour=hour, minute=minute, second=random.randint(0, 59))
            
            # Build activity record
            activity = {
                "id": activity_id,
                "bot_id": bot_key,
                "bot_name": bot["name"],
                "category": bot["category"],
                "action": action,
                "action_display": action.replace("_", " ").title(),
                "status": status,
                "entity_type": get_entity_type(bot_key, action),
                "entity_id": entity_id,
                "execution_time_seconds": execution_time,
                "timestamp": timestamp.isoformat(),
                "details": generate_details(bot_key, action, status),
                "user_triggered": random.random() < 0.2  # 20% manually triggered
            }
            
            activities.append(activity)
            activity_id += 1
        
        current_date += timedelta(days=1)
    
    return activities

def get_entity_type(bot_key, action):
    """Map bot/action to entity type"""
    entity_map = {
        "invoice_reconciliation": "Invoice",
        "accounts_payable": "Supplier Invoice",
        "ar_collections": "Customer Invoice",
        "bank_reconciliation": "Bank Statement",
        "general_ledger": "Journal Entry",
        "financial_close": "Period",
        "expense_approval": "Expense Claim",
        "analytics": "Report",
        "sap_document": "Document",
        "bbbee_compliance": "Supplier",
        "compliance_audit": "Audit Check",
        "lead_qualification": "Lead",
        "quote_generation": "Quote",
        "sales_order": "Sales Order",
        "inventory_reorder": "Purchase Order",
        "purchasing": "Purchase Order",
        "warehouse_management": "Pick List",
        "manufacturing": "Work Order",
        "project_management": "Task",
        "payroll": "Payroll Run",
        "employee_onboarding": "Employee",
        "leave_management": "Leave Request",
        "it_helpdesk": "IT Ticket",
        "whatsapp_helpdesk": "Chat Message",
        "contract_renewal": "Contract",
        "meta_orchestrator": "Workflow"
    }
    return entity_map.get(bot_key, "Record")

def generate_details(bot_key, action, status):
    """Generate realistic details for the activity"""
    if status == "failed":
        error_messages = [
            "Validation failed: missing required field",
            "API timeout: external service not responding",
            "Data quality issue: duplicate record detected",
            "Permission denied: insufficient access rights",
            "Threshold exceeded: requires manual review",
            "Connection error: network unavailable"
        ]
        return {"error": random.choice(error_messages)}
    
    # Success details by bot type
    details_map = {
        "invoice_reconciliation": {
            "matched_amount": f"R{random.randint(1000, 50000):,}",
            "confidence": f"{random.randint(85, 99)}%",
            "payment_method": random.choice(["EFT", "Card", "Cash", "Debit Order"])
        },
        "expense_approval": {
            "category": random.choice(["Travel", "Accommodation", "Meals", "Supplies", "Entertainment"]),
            "auto_coded": random.choice([True, True, True, False]),  # 75% auto-coded
            "amount": f"R{random.randint(50, 2000):,}"
        },
        "payroll": {
            "employees": random.randint(40, 50),
            "gross_salary": f"R{random.randint(1800000, 2100000):,}",
            "deductions": f"R{random.randint(500000, 700000):,}"
        },
        "bbbee_compliance": {
            "bbbee_level": random.choice(["1", "2", "3", "4"]),
            "score": f"{random.randint(75, 100)}.{random.randint(0, 9)}",
            "verified": random.choice([True, True, False])
        },
        "it_helpdesk": {
            "category": random.choice(["Password Reset", "Software Issue", "Hardware", "Network", "Access Request"]),
            "auto_resolved": random.choice([True, True, False, False]),  # 50% auto-resolved
            "sla_met": random.choice([True, True, True, False])  # 75% meet SLA
        }
    }
    
    return details_map.get(bot_key, {"action": action, "status": "success"})

def calculate_statistics(activities):
    """Calculate bot activity statistics"""
    
    total = len(activities)
    completed = len([a for a in activities if a["status"] == "completed"])
    failed = total - completed
    
    # Time saved (assuming 15 min manual work per activity)
    time_saved_hours = (total * 15) / 60
    
    # Cost saved (R110/hour)
    cost_saved = time_saved_hours * 110
    
    # By category
    category_stats = {}
    for activity in activities:
        cat = activity["category"]
        if cat not in category_stats:
            category_stats[cat] = {"count": 0, "completed": 0, "time_seconds": 0}
        category_stats[cat]["count"] += 1
        if activity["status"] == "completed":
            category_stats[cat]["completed"] += 1
        category_stats[cat]["time_seconds"] += activity["execution_time_seconds"]
    
    # By bot
    bot_stats = {}
    for activity in activities:
        bot_id = activity["bot_id"]
        if bot_id not in bot_stats:
            bot_stats[bot_id] = {"name": activity["bot_name"], "count": 0, "completed": 0, "avg_time": 0}
        bot_stats[bot_id]["count"] += 1
        if activity["status"] == "completed":
            bot_stats[bot_id]["completed"] += 1
    
    # Calculate averages
    for bot_id, stats in bot_stats.items():
        bot_activities = [a for a in activities if a["bot_id"] == bot_id]
        stats["avg_time"] = sum(a["execution_time_seconds"] for a in bot_activities) / len(bot_activities)
        stats["success_rate"] = (stats["completed"] / stats["count"] * 100) if stats["count"] > 0 else 0
    
    return {
        "summary": {
            "total_activities": total,
            "completed": completed,
            "failed": failed,
            "success_rate": f"{(completed/total*100):.1f}%",
            "time_saved_hours": round(time_saved_hours, 1),
            "cost_saved": f"R{cost_saved:,.0f}"
        },
        "by_category": category_stats,
        "by_bot": bot_stats,
        "top_bots": sorted(bot_stats.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    }

def main():
    print("🤖 Generating comprehensive bot activity data for all 27 bots...")
    print(f"   Period: Last 30 days")
    print(f"   Target: ~4,500 activities\n")
    
    # Generate activities
    activities = generate_bot_activities(days_back=30, activities_per_day=150)
    
    print(f"✅ Generated {len(activities):,} bot activities")
    print(f"   Date range: {activities[0]['timestamp'][:10]} to {activities[-1]['timestamp'][:10]}\n")
    
    # Calculate statistics
    stats = calculate_statistics(activities)
    
    print("📊 Statistics:")
    print(f"   Total Activities: {stats['summary']['total_activities']:,}")
    print(f"   Completed: {stats['summary']['completed']:,}")
    print(f"   Failed: {stats['summary']['failed']:,}")
    print(f"   Success Rate: {stats['summary']['success_rate']}")
    print(f"   Time Saved: {stats['summary']['time_saved_hours']:,} hours")
    print(f"   Cost Saved: {stats['summary']['cost_saved']}\n")
    
    print("🏆 Top 10 Most Active Bots:")
    for i, (bot_id, bot_stats) in enumerate(stats['top_bots'], 1):
        print(f"   {i:2d}. {bot_stats['name']:<35s} {bot_stats['count']:>5,} activities ({bot_stats['success_rate']:.1f}% success)")
    
    # Save to files
    output_dir = Path(__file__).parent / "data"
    output_dir.mkdir(exist_ok=True)
    
    # Save activities
    activities_file = output_dir / "bot_activities.json"
    with open(activities_file, 'w') as f:
        json.dump(activities, f, indent=2)
    print(f"\n✅ Saved activities to: {activities_file}")
    
    # Save statistics
    stats_file = output_dir / "bot_statistics.json"
    with open(stats_file, 'w') as f:
        json.dump(stats, f, indent=2)
    print(f"✅ Saved statistics to: {stats_file}")
    
    # Save bot definitions
    bots_file = output_dir / "all_bots.json"
    with open(bots_file, 'w') as f:
        json.dump(ALL_BOTS, f, indent=2)
    print(f"✅ Saved bot definitions to: {bots_file}")
    
    print("\n🎉 Bot activity data generation complete!")
    print(f"\n📋 Summary:")
    print(f"   • 27 bots defined")
    print(f"   • {len(activities):,} activities generated")
    print(f"   • {stats['summary']['success_rate']} success rate")
    print(f"   • {stats['summary']['cost_saved']} saved")
    print(f"   • Ready for demo and testing!\n")

if __name__ == "__main__":
    main()
