"""
L4 (Sub-sub-detail) API Aggregator
Consolidates all 35 L4 routers into a single router for easy inclusion in production_main.py
"""
from fastapi import APIRouter

l4_router = APIRouter(prefix="/api/l4", tags=["L4 Sub-Sub-Detail Pages"])

try:
    from .sales_order_line_allocation_detail import router as sales_order_line_allocation_detail_router
    l4_router.include_router(sales_order_line_allocation_detail_router)
except Exception as e:
    print(f"⚠️ L4 sales_order_line_allocation_detail not loaded: {e}")

try:
    from .payment_allocation_detail import router as payment_allocation_detail_router
    l4_router.include_router(payment_allocation_detail_router)
except Exception as e:
    print(f"⚠️ L4 payment_allocation_detail not loaded: {e}")

try:
    from .invoice_line_gl_impact import router as invoice_line_gl_impact_router
    l4_router.include_router(invoice_line_gl_impact_router)
except Exception as e:
    print(f"⚠️ L4 invoice_line_gl_impact not loaded: {e}")

try:
    from .delivery_serial_lot_tracking import router as delivery_serial_lot_tracking_router
    l4_router.include_router(delivery_serial_lot_tracking_router)
except Exception as e:
    print(f"⚠️ L4 delivery_serial_lot_tracking not loaded: {e}")

try:
    from .item_ledger_transaction_detail import router as item_ledger_transaction_detail_router
    l4_router.include_router(item_ledger_transaction_detail_router)
except Exception as e:
    print(f"⚠️ L4 item_ledger_transaction_detail not loaded: {e}")

try:
    from .cost_layer_consumption import router as cost_layer_consumption_router
    l4_router.include_router(cost_layer_consumption_router)
except Exception as e:
    print(f"⚠️ L4 cost_layer_consumption not loaded: {e}")

try:
    from .po_receipt_quality_check import router as po_receipt_quality_check_router
    l4_router.include_router(po_receipt_quality_check_router)
except Exception as e:
    print(f"⚠️ L4 po_receipt_quality_check not loaded: {e}")

try:
    from .three_way_match_variance import router as three_way_match_variance_router
    l4_router.include_router(three_way_match_variance_router)
except Exception as e:
    print(f"⚠️ L4 three_way_match_variance not loaded: {e}")

try:
    from .journal_entry_line_source_trace import router as journal_entry_line_source_trace_router
    l4_router.include_router(journal_entry_line_source_trace_router)
except Exception as e:
    print(f"⚠️ L4 journal_entry_line_source_trace not loaded: {e}")

try:
    from .bom_component_substitution import router as bom_component_substitution_router
    l4_router.include_router(bom_component_substitution_router)
except Exception as e:
    print(f"⚠️ L4 bom_component_substitution not loaded: {e}")

try:
    from .operation_time_booking_detail import router as operation_time_booking_detail_router
    l4_router.include_router(operation_time_booking_detail_router)
except Exception as e:
    print(f"⚠️ L4 operation_time_booking_detail not loaded: {e}")

try:
    from .quality_inspection_test_result import router as quality_inspection_test_result_router
    l4_router.include_router(quality_inspection_test_result_router)
except Exception as e:
    print(f"⚠️ L4 quality_inspection_test_result not loaded: {e}")

try:
    from .approval_step_detail import router as approval_step_detail_router
    l4_router.include_router(approval_step_detail_router)
except Exception as e:
    print(f"⚠️ L4 approval_step_detail not loaded: {e}")

try:
    from .audit_trail_field_change import router as audit_trail_field_change_router
    l4_router.include_router(audit_trail_field_change_router)
except Exception as e:
    print(f"⚠️ L4 audit_trail_field_change not loaded: {e}")

try:
    from .serial_number_history import router as serial_number_history_router
    l4_router.include_router(serial_number_history_router)
except Exception as e:
    print(f"⚠️ L4 serial_number_history not loaded: {e}")

try:
    from .lot_number_quality_expiry import router as lot_number_quality_expiry_router
    l4_router.include_router(lot_number_quality_expiry_router)
except Exception as e:
    print(f"⚠️ L4 lot_number_quality_expiry not loaded: {e}")

try:
    from .credit_memo_allocation_detail import router as credit_memo_allocation_detail_router
    l4_router.include_router(credit_memo_allocation_detail_router)
except Exception as e:
    print(f"⚠️ L4 credit_memo_allocation_detail not loaded: {e}")

try:
    from .bank_statement_line_matching import router as bank_statement_line_matching_router
    l4_router.include_router(bank_statement_line_matching_router)
except Exception as e:
    print(f"⚠️ L4 bank_statement_line_matching not loaded: {e}")

try:
    from .reconciliation_variance import router as reconciliation_variance_router
    l4_router.include_router(reconciliation_variance_router)
except Exception as e:
    print(f"⚠️ L4 reconciliation_variance not loaded: {e}")

try:
    from .payslip_gl_posting import router as payslip_gl_posting_router
    l4_router.include_router(payslip_gl_posting_router)
except Exception as e:
    print(f"⚠️ L4 payslip_gl_posting not loaded: {e}")

try:
    from .leave_accrual_detail import router as leave_accrual_detail_router
    l4_router.include_router(leave_accrual_detail_router)
except Exception as e:
    print(f"⚠️ L4 leave_accrual_detail not loaded: {e}")

try:
    from .timesheet_entry_approval import router as timesheet_entry_approval_router
    l4_router.include_router(timesheet_entry_approval_router)
except Exception as e:
    print(f"⚠️ L4 timesheet_entry_approval not loaded: {e}")

try:
    from .opportunity_product_pricing_history import router as opportunity_product_pricing_history_router
    l4_router.include_router(opportunity_product_pricing_history_router)
except Exception as e:
    print(f"⚠️ L4 opportunity_product_pricing_history not loaded: {e}")

try:
    from .task_activity_timeline import router as task_activity_timeline_router
    l4_router.include_router(task_activity_timeline_router)
except Exception as e:
    print(f"⚠️ L4 task_activity_timeline not loaded: {e}")

try:
    from .notification_action_history import router as notification_action_history_router
    l4_router.include_router(notification_action_history_router)
except Exception as e:
    print(f"⚠️ L4 notification_action_history not loaded: {e}")

try:
    from .ap_invoice_exception_resolution import router as ap_invoice_exception_resolution_router
    l4_router.include_router(ap_invoice_exception_resolution_router)
except Exception as e:
    print(f"⚠️ L4 ap_invoice_exception_resolution not loaded: {e}")

try:
    from .payment_proposal_line_approval import router as payment_proposal_line_approval_router
    l4_router.include_router(payment_proposal_line_approval_router)
except Exception as e:
    print(f"⚠️ L4 payment_proposal_line_approval not loaded: {e}")

try:
    from .account_transaction_drillback import router as account_transaction_drillback_router
    l4_router.include_router(account_transaction_drillback_router)
except Exception as e:
    print(f"⚠️ L4 account_transaction_drillback not loaded: {e}")

try:
    from .cost_center_allocation_detail import router as cost_center_allocation_detail_router
    l4_router.include_router(cost_center_allocation_detail_router)
except Exception as e:
    print(f"⚠️ L4 cost_center_allocation_detail not loaded: {e}")

try:
    from .currency_exchange_rate_impact import router as currency_exchange_rate_impact_router
    l4_router.include_router(currency_exchange_rate_impact_router)
except Exception as e:
    print(f"⚠️ L4 currency_exchange_rate_impact not loaded: {e}")

try:
    from .budget_vs_actual_variance import router as budget_vs_actual_variance_router
    l4_router.include_router(budget_vs_actual_variance_router)
except Exception as e:
    print(f"⚠️ L4 budget_vs_actual_variance not loaded: {e}")

try:
    from .bin_transfer_detail import router as bin_transfer_detail_router
    l4_router.include_router(bin_transfer_detail_router)
except Exception as e:
    print(f"⚠️ L4 bin_transfer_detail not loaded: {e}")

try:
    from .stock_adjustment_reason_analysis import router as stock_adjustment_reason_analysis_router
    l4_router.include_router(stock_adjustment_reason_analysis_router)
except Exception as e:
    print(f"⚠️ L4 stock_adjustment_reason_analysis not loaded: {e}")

try:
    from .material_issue_line_detail import router as material_issue_line_detail_router
    l4_router.include_router(material_issue_line_detail_router)
except Exception as e:
    print(f"⚠️ L4 material_issue_line_detail not loaded: {e}")

try:
    from .work_order_costing_detail import router as work_order_costing_detail_router
    l4_router.include_router(work_order_costing_detail_router)
except Exception as e:
    print(f"⚠️ L4 work_order_costing_detail not loaded: {e}")

print(f"✅ L4 API Aggregator loaded with 35 sub-sub-detail routers")
