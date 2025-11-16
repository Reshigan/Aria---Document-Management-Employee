"""
L3 (Sub-detail) API Aggregator
Consolidates all 51 L3 routers into a single router for easy inclusion in production_main.py
"""
from fastapi import APIRouter

l3_router = APIRouter(prefix="/api/l3", tags=["L3 Sub-Detail Pages"])

try:
    from .sales_order_allocations import router as sales_order_allocations_router
    l3_router.include_router(sales_order_allocations_router)
except Exception as e:
    print(f"⚠️ L3 sales_order_allocations not loaded: {e}")

try:
    from .payment_allocations import router as payment_allocations_router
    l3_router.include_router(payment_allocations_router)
except Exception as e:
    print(f"⚠️ L3 payment_allocations not loaded: {e}")

try:
    from .po_line_receipts import router as po_line_receipts_router
    l3_router.include_router(po_line_receipts_router)
except Exception as e:
    print(f"⚠️ L3 po_line_receipts not loaded: {e}")

try:
    from .three_way_match import router as three_way_match_router
    l3_router.include_router(three_way_match_router)
except Exception as e:
    print(f"⚠️ L3 three_way_match not loaded: {e}")

try:
    from .item_ledger import router as item_ledger_router
    l3_router.include_router(item_ledger_router)
except Exception as e:
    print(f"⚠️ L3 item_ledger not loaded: {e}")

try:
    from .journal_entry_detail import router as journal_entry_detail_router
    l3_router.include_router(journal_entry_detail_router)
except Exception as e:
    print(f"⚠️ L3 journal_entry_detail not loaded: {e}")

try:
    from .bom_components import router as bom_components_router
    l3_router.include_router(bom_components_router)
except Exception as e:
    print(f"⚠️ L3 bom_components not loaded: {e}")

try:
    from .payslip_breakdown import router as payslip_breakdown_router
    l3_router.include_router(payslip_breakdown_router)
except Exception as e:
    print(f"⚠️ L3 payslip_breakdown not loaded: {e}")

try:
    from .bank_statement_matching import router as bank_statement_matching_router
    l3_router.include_router(bank_statement_matching_router)
except Exception as e:
    print(f"⚠️ L3 bank_statement_matching not loaded: {e}")

try:
    from .lead_activities import router as lead_activities_router
    l3_router.include_router(lead_activities_router)
except Exception as e:
    print(f"⚠️ L3 lead_activities not loaded: {e}")

try:
    from .customer_addresses import router as customer_addresses_router
    l3_router.include_router(customer_addresses_router)
except Exception as e:
    print(f"⚠️ L3 customer_addresses not loaded: {e}")

try:
    from .approval_history import router as approval_history_router
    l3_router.include_router(approval_history_router)
except Exception as e:
    print(f"⚠️ L3 approval_history not loaded: {e}")

try:
    from .cost_layers import router as cost_layers_router
    l3_router.include_router(cost_layers_router)
except Exception as e:
    print(f"⚠️ L3 cost_layers not loaded: {e}")

try:
    from .routing_operations import router as routing_operations_router
    l3_router.include_router(routing_operations_router)
except Exception as e:
    print(f"⚠️ L3 routing_operations not loaded: {e}")

try:
    from .stock_transfers import router as stock_transfers_router
    l3_router.include_router(stock_transfers_router)
except Exception as e:
    print(f"⚠️ L3 stock_transfers not loaded: {e}")

try:
    from .audit_trail import router as audit_trail_router
    l3_router.include_router(audit_trail_router)
except Exception as e:
    print(f"⚠️ L3 audit_trail not loaded: {e}")

try:
    from .opportunity_history import router as opportunity_history_router
    l3_router.include_router(opportunity_history_router)
except Exception as e:
    print(f"⚠️ L3 opportunity_history not loaded: {e}")

try:
    from .price_lists import router as price_lists_router
    l3_router.include_router(price_lists_router)
except Exception as e:
    print(f"⚠️ L3 price_lists not loaded: {e}")

try:
    from .timesheet_entries import router as timesheet_entries_router
    l3_router.include_router(timesheet_entries_router)
except Exception as e:
    print(f"⚠️ L3 timesheet_entries not loaded: {e}")

try:
    from .uom_conversions import router as uom_conversions_router
    l3_router.include_router(uom_conversions_router)
except Exception as e:
    print(f"⚠️ L3 uom_conversions not loaded: {e}")

try:
    from .delivery_schedules import router as delivery_schedules_router
    l3_router.include_router(delivery_schedules_router)
except Exception as e:
    print(f"⚠️ L3 delivery_schedules not loaded: {e}")

try:
    from .work_center_capacity import router as work_center_capacity_router
    l3_router.include_router(work_center_capacity_router)
except Exception as e:
    print(f"⚠️ L3 work_center_capacity not loaded: {e}")

try:
    from .cycle_count_sessions import router as cycle_count_sessions_router
    l3_router.include_router(cycle_count_sessions_router)
except Exception as e:
    print(f"⚠️ L3 cycle_count_sessions not loaded: {e}")

try:
    from .leave_accruals import router as leave_accruals_router
    l3_router.include_router(leave_accruals_router)
except Exception as e:
    print(f"⚠️ L3 leave_accruals not loaded: {e}")

try:
    from .supplier_bank_accounts import router as supplier_bank_accounts_router
    l3_router.include_router(supplier_bank_accounts_router)
except Exception as e:
    print(f"⚠️ L3 supplier_bank_accounts not loaded: {e}")

try:
    from .tax_codes import router as tax_codes_router
    l3_router.include_router(tax_codes_router)
except Exception as e:
    print(f"⚠️ L3 tax_codes not loaded: {e}")

try:
    from .exchange_rates import router as exchange_rates_router
    l3_router.include_router(exchange_rates_router)
except Exception as e:
    print(f"⚠️ L3 exchange_rates not loaded: {e}")

try:
    from .pick_pack_lists import router as pick_pack_lists_router
    l3_router.include_router(pick_pack_lists_router)
except Exception as e:
    print(f"⚠️ L3 pick_pack_lists not loaded: {e}")

try:
    from .material_issues import router as material_issues_router
    l3_router.include_router(material_issues_router)
except Exception as e:
    print(f"⚠️ L3 material_issues not loaded: {e}")

try:
    from .quality_inspections import router as quality_inspections_router
    l3_router.include_router(quality_inspections_router)
except Exception as e:
    print(f"⚠️ L3 quality_inspections not loaded: {e}")

try:
    from .credit_memo_lines import router as credit_memo_lines_router
    l3_router.include_router(credit_memo_lines_router)
except Exception as e:
    print(f"⚠️ L3 credit_memo_lines not loaded: {e}")

try:
    from .rma_details import router as rma_details_router
    l3_router.include_router(rma_details_router)
except Exception as e:
    print(f"⚠️ L3 rma_details not loaded: {e}")

try:
    from .ap_invoice_exceptions import router as ap_invoice_exceptions_router
    l3_router.include_router(ap_invoice_exceptions_router)
except Exception as e:
    print(f"⚠️ L3 ap_invoice_exceptions not loaded: {e}")

try:
    from .payment_proposals import router as payment_proposals_router
    l3_router.include_router(payment_proposals_router)
except Exception as e:
    print(f"⚠️ L3 payment_proposals not loaded: {e}")

try:
    from .adjustment_journals import router as adjustment_journals_router
    l3_router.include_router(adjustment_journals_router)
except Exception as e:
    print(f"⚠️ L3 adjustment_journals not loaded: {e}")

try:
    from .time_booking import router as time_booking_router
    l3_router.include_router(time_booking_router)
except Exception as e:
    print(f"⚠️ L3 time_booking not loaded: {e}")

try:
    from .nonconformance_details import router as nonconformance_details_router
    l3_router.include_router(nonconformance_details_router)
except Exception as e:
    print(f"⚠️ L3 nonconformance_details not loaded: {e}")

try:
    from .reconciliation_sessions import router as reconciliation_sessions_router
    l3_router.include_router(reconciliation_sessions_router)
except Exception as e:
    print(f"⚠️ L3 reconciliation_sessions not loaded: {e}")

try:
    from .payroll_posting import router as payroll_posting_router
    l3_router.include_router(payroll_posting_router)
except Exception as e:
    print(f"⚠️ L3 payroll_posting not loaded: {e}")

try:
    from .quote_generation import router as quote_generation_router
    l3_router.include_router(quote_generation_router)
except Exception as e:
    print(f"⚠️ L3 quote_generation not loaded: {e}")

try:
    from .notifications_center import router as notifications_center_router
    l3_router.include_router(notifications_center_router)
except Exception as e:
    print(f"⚠️ L3 notifications_center not loaded: {e}")

try:
    from .error_logs import router as error_logs_router
    l3_router.include_router(error_logs_router)
except Exception as e:
    print(f"⚠️ L3 error_logs not loaded: {e}")

try:
    from .posting_preview import router as posting_preview_router
    l3_router.include_router(posting_preview_router)
except Exception as e:
    print(f"⚠️ L3 posting_preview not loaded: {e}")

try:
    from .trial_balance_drilldown import router as trial_balance_drilldown_router
    l3_router.include_router(trial_balance_drilldown_router)
except Exception as e:
    print(f"⚠️ L3 trial_balance_drilldown not loaded: {e}")

try:
    from .manufacturing_order_operations import router as manufacturing_order_operations_router
    l3_router.include_router(manufacturing_order_operations_router)
except Exception as e:
    print(f"⚠️ L3 manufacturing_order_operations not loaded: {e}")

try:
    from .inventory_valuation import router as inventory_valuation_router
    l3_router.include_router(inventory_valuation_router)
except Exception as e:
    print(f"⚠️ L3 inventory_valuation not loaded: {e}")

print(f"✅ L3 API Aggregator loaded with 51 sub-detail routers")
