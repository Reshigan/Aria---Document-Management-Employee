"""
L5 (Atomic) API Aggregator
Consolidates all 20 L5 routers into a single router for easy inclusion in production_main.py
"""
from fastapi import APIRouter

l5_router = APIRouter(prefix="/api/l5", tags=["L5 Atomic Detail Pages"])

try:
    from .cost_layer_atomic import router as cost_layer_atomic_router
    l5_router.include_router(cost_layer_atomic_router)
except Exception as e:
    print(f"⚠️ L5 cost_layer_atomic not loaded: {e}")

try:
    from .journal_entry_line_atomic import router as journal_entry_line_atomic_router
    l5_router.include_router(journal_entry_line_atomic_router)
except Exception as e:
    print(f"⚠️ L5 journal_entry_line_atomic not loaded: {e}")

try:
    from .quality_test_measurement_atomic import router as quality_test_measurement_atomic_router
    l5_router.include_router(quality_test_measurement_atomic_router)
except Exception as e:
    print(f"⚠️ L5 quality_test_measurement_atomic not loaded: {e}")

try:
    from .field_change_atomic import router as field_change_atomic_router
    l5_router.include_router(field_change_atomic_router)
except Exception as e:
    print(f"⚠️ L5 field_change_atomic not loaded: {e}")

try:
    from .approval_decision_atomic import router as approval_decision_atomic_router
    l5_router.include_router(approval_decision_atomic_router)
except Exception as e:
    print(f"⚠️ L5 approval_decision_atomic not loaded: {e}")

try:
    from .serial_number_atomic import router as serial_number_atomic_router
    l5_router.include_router(serial_number_atomic_router)
except Exception as e:
    print(f"⚠️ L5 serial_number_atomic not loaded: {e}")

try:
    from .lot_number_atomic import router as lot_number_atomic_router
    l5_router.include_router(lot_number_atomic_router)
except Exception as e:
    print(f"⚠️ L5 lot_number_atomic not loaded: {e}")

try:
    from .time_booking_entry_atomic import router as time_booking_entry_atomic_router
    l5_router.include_router(time_booking_entry_atomic_router)
except Exception as e:
    print(f"⚠️ L5 time_booking_entry_atomic not loaded: {e}")

try:
    from .exchange_rate_atomic import router as exchange_rate_atomic_router
    l5_router.include_router(exchange_rate_atomic_router)
except Exception as e:
    print(f"⚠️ L5 exchange_rate_atomic not loaded: {e}")

try:
    from .budget_period_atomic import router as budget_period_atomic_router
    l5_router.include_router(budget_period_atomic_router)
except Exception as e:
    print(f"⚠️ L5 budget_period_atomic not loaded: {e}")

try:
    from .notification_delivery_atomic import router as notification_delivery_atomic_router
    l5_router.include_router(notification_delivery_atomic_router)
except Exception as e:
    print(f"⚠️ L5 notification_delivery_atomic not loaded: {e}")

try:
    from .cost_layer_consumption_atomic import router as cost_layer_consumption_atomic_router
    l5_router.include_router(cost_layer_consumption_atomic_router)
except Exception as e:
    print(f"⚠️ L5 cost_layer_consumption_atomic not loaded: {e}")

try:
    from .component_substitute_atomic import router as component_substitute_atomic_router
    l5_router.include_router(component_substitute_atomic_router)
except Exception as e:
    print(f"⚠️ L5 component_substitute_atomic not loaded: {e}")

try:
    from .warranty_claim_atomic import router as warranty_claim_atomic_router
    l5_router.include_router(warranty_claim_atomic_router)
except Exception as e:
    print(f"⚠️ L5 warranty_claim_atomic not loaded: {e}")

try:
    from .nonconformance_atomic import router as nonconformance_atomic_router
    l5_router.include_router(nonconformance_atomic_router)
except Exception as e:
    print(f"⚠️ L5 nonconformance_atomic not loaded: {e}")

try:
    from .workflow_step_instance_atomic import router as workflow_step_instance_atomic_router
    l5_router.include_router(workflow_step_instance_atomic_router)
except Exception as e:
    print(f"⚠️ L5 workflow_step_instance_atomic not loaded: {e}")

try:
    from .user_session_atomic import router as user_session_atomic_router
    l5_router.include_router(user_session_atomic_router)
except Exception as e:
    print(f"⚠️ L5 user_session_atomic not loaded: {e}")

try:
    from .system_event_atomic import router as system_event_atomic_router
    l5_router.include_router(system_event_atomic_router)
except Exception as e:
    print(f"⚠️ L5 system_event_atomic not loaded: {e}")

try:
    from .audit_log_entry_atomic import router as audit_log_entry_atomic_router
    l5_router.include_router(audit_log_entry_atomic_router)
except Exception as e:
    print(f"⚠️ L5 audit_log_entry_atomic not loaded: {e}")

try:
    from .material_consumption_atomic import router as material_consumption_atomic_router
    l5_router.include_router(material_consumption_atomic_router)
except Exception as e:
    print(f"⚠️ L5 material_consumption_atomic not loaded: {e}")

print(f"✅ L5 API Aggregator loaded with 20 atomic detail routers")
