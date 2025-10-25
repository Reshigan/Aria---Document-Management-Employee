"""
Reporting & Analytics Service
Generate insights, dashboards, and ROI calculations for B2B clients
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json

from backend.models.reporting_models import (
    BotInteractionLog, DocumentProcessingMetrics, HelpdeskMetrics,
    SalesOrderMetrics, DailyPerformanceMetrics, AccuracyTracking,
    ClientROIMetrics, AlertRule, BotType, ProcessingStatus
)


class ReportingService:
    """Service for analytics and reporting"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============ Performance Metrics ============
    
    def get_bot_performance_summary(
        self,
        organization_id: int,
        bot_type: Optional[BotType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get high-level performance summary"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        query = self.db.query(BotInteractionLog).filter(
            BotInteractionLog.organization_id == organization_id,
            BotInteractionLog.started_at >= start_date,
            BotInteractionLog.started_at <= end_date
        )
        
        if bot_type:
            query = query.filter(BotInteractionLog.bot_type == bot_type)
        
        interactions = query.all()
        
        total = len(interactions)
        if total == 0:
            return self._empty_performance_summary()
        
        successful = len([i for i in interactions if i.processing_status == ProcessingStatus.SUCCESS])
        failed = len([i for i in interactions if i.processing_status == ProcessingStatus.FAILED])
        pending_review = len([i for i in interactions if i.required_human_review])
        
        avg_confidence = sum([i.confidence_score or 0 for i in interactions]) / total
        avg_processing_time = sum([i.processing_time_ms or 0 for i in interactions]) / total
        
        reviewed = len([i for i in interactions if i.human_reviewed])
        approved = len([i for i in interactions if i.human_approved])
        
        feedback_scores = [i.feedback_score for i in interactions if i.feedback_score]
        avg_feedback = sum(feedback_scores) / len(feedback_scores) if feedback_scores else 0
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": (end_date - start_date).days
            },
            "volume": {
                "total_interactions": total,
                "successful": successful,
                "failed": failed,
                "pending_review": pending_review,
                "success_rate": (successful / total * 100) if total > 0 else 0
            },
            "performance": {
                "avg_confidence_score": round(avg_confidence * 100, 2),
                "avg_processing_time_ms": int(avg_processing_time),
                "avg_processing_time_sec": round(avg_processing_time / 1000, 2)
            },
            "quality": {
                "human_review_rate": (pending_review / total * 100) if total > 0 else 0,
                "approval_rate": (approved / reviewed * 100) if reviewed > 0 else 0,
                "avg_feedback_score": round(avg_feedback, 2),
                "feedback_count": len(feedback_scores)
            }
        }
    
    def get_document_processing_stats(
        self,
        organization_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get SAP document processing statistics"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        metrics = self.db.query(DocumentProcessingMetrics).filter(
            DocumentProcessingMetrics.organization_id == organization_id,
            DocumentProcessingMetrics.created_at >= start_date,
            DocumentProcessingMetrics.created_at <= end_date
        ).all()
        
        if not metrics:
            return self._empty_document_stats()
        
        total_docs = len(metrics)
        sap_posted = len([m for m in metrics if m.sap_posted])
        
        total_fields = sum([m.fields_extracted or 0 for m in metrics])
        confident_fields = sum([m.fields_confident or 0 for m in metrics])
        corrected_fields = sum([m.fields_corrected or 0 for m in metrics])
        
        accuracy = (confident_fields / total_fields * 100) if total_fields > 0 else 0
        
        total_time_saved = sum([m.time_saved_min or 0 for m in metrics])
        avg_time_saved = total_time_saved / total_docs if total_docs > 0 else 0
        
        # Financial processing
        total_amount_processed = sum([m.total_amount or 0 for m in metrics])
        
        # Document type breakdown
        doc_types = {}
        for m in metrics:
            doc_type = m.document_type or "unknown"
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "volume": {
                "total_documents": total_docs,
                "sap_posted": sap_posted,
                "pending_review": total_docs - sap_posted,
                "success_rate": (sap_posted / total_docs * 100) if total_docs > 0 else 0
            },
            "accuracy": {
                "field_extraction_accuracy": round(accuracy, 2),
                "total_fields_extracted": total_fields,
                "fields_requiring_correction": corrected_fields,
                "correction_rate": (corrected_fields / total_fields * 100) if total_fields > 0 else 0
            },
            "efficiency": {
                "total_time_saved_hours": round(total_time_saved / 60, 2),
                "avg_time_saved_per_doc_min": round(avg_time_saved, 2),
                "documents_per_hour": round(60 / avg_time_saved, 2) if avg_time_saved > 0 else 0
            },
            "financial": {
                "total_amount_processed": round(total_amount_processed, 2),
                "avg_invoice_value": round(total_amount_processed / total_docs, 2) if total_docs > 0 else 0
            },
            "document_types": doc_types
        }
    
    def get_helpdesk_stats(
        self,
        organization_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get helpdesk performance statistics"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        metrics = self.db.query(HelpdeskMetrics).filter(
            HelpdeskMetrics.organization_id == organization_id,
            HelpdeskMetrics.created_at >= start_date,
            HelpdeskMetrics.created_at <= end_date
        ).all()
        
        if not metrics:
            return self._empty_helpdesk_stats()
        
        total = len(metrics)
        resolved_by_bot = len([m for m in metrics if m.resolved_by_bot])
        escalated = len([m for m in metrics if m.escalated_to_human])
        first_contact_resolution = len([m for m in metrics if m.resolved_on_first_contact])
        
        avg_first_response = sum([m.first_response_time_sec or 0 for m in metrics]) / total
        avg_resolution_time = sum([m.total_resolution_time_min or 0 for m in metrics]) / total
        
        satisfied = len([m for m in metrics if m.customer_satisfied])
        ratings = [m.satisfaction_rating for m in metrics if m.satisfaction_rating]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        sla_met = len([m for m in metrics if m.sla_met])
        
        # Query type breakdown
        query_types = {}
        for m in metrics:
            qt = m.query_type or "unknown"
            query_types[qt] = query_types.get(qt, 0) + 1
        
        # Sentiment analysis
        sentiments = {}
        for m in metrics:
            sent = m.sentiment or "unknown"
            sentiments[sent] = sentiments.get(sent, 0) + 1
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "volume": {
                "total_conversations": total,
                "resolved_by_bot": resolved_by_bot,
                "escalated_to_human": escalated,
                "bot_resolution_rate": (resolved_by_bot / total * 100) if total > 0 else 0,
                "escalation_rate": (escalated / total * 100) if total > 0 else 0
            },
            "performance": {
                "avg_first_response_sec": round(avg_first_response, 2),
                "avg_resolution_time_min": round(avg_resolution_time, 2),
                "first_contact_resolution_rate": (first_contact_resolution / total * 100) if total > 0 else 0
            },
            "satisfaction": {
                "satisfaction_rate": (satisfied / total * 100) if total > 0 else 0,
                "avg_rating": round(avg_rating, 2),
                "rating_count": len(ratings)
            },
            "sla": {
                "sla_compliance_rate": (sla_met / total * 100) if total > 0 else 0,
                "sla_breaches": total - sla_met
            },
            "query_types": query_types,
            "sentiment_distribution": sentiments
        }
    
    def get_sales_order_stats(
        self,
        organization_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get sales order processing statistics"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        metrics = self.db.query(SalesOrderMetrics).filter(
            SalesOrderMetrics.organization_id == organization_id,
            SalesOrderMetrics.created_at >= start_date,
            SalesOrderMetrics.created_at <= end_date
        ).all()
        
        if not metrics:
            return self._empty_sales_order_stats()
        
        total = len(metrics)
        created_in_erp = len([m for m in metrics if m.order_created_in_erp])
        
        total_value = sum([m.order_value or 0 for m in metrics])
        avg_order_value = total_value / total if total > 0 else 0
        
        quotes_converted = len([m for m in metrics if m.quote_converted_to_order])
        conversion_rate = (quotes_converted / total * 100) if total > 0 else 0
        
        avg_conversion_time = sum([m.conversion_time_hours or 0 for m in metrics if m.conversion_time_hours]) / quotes_converted if quotes_converted > 0 else 0
        
        credit_checks_passed = len([m for m in metrics if m.credit_check_passed])
        stock_available = len([m for m in metrics if m.stock_available])
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "volume": {
                "total_orders_processed": total,
                "created_in_erp": created_in_erp,
                "success_rate": (created_in_erp / total * 100) if total > 0 else 0
            },
            "financial": {
                "total_order_value": round(total_value, 2),
                "avg_order_value": round(avg_order_value, 2),
                "largest_order": round(max([m.order_value or 0 for m in metrics]), 2) if metrics else 0
            },
            "conversion": {
                "quotes_converted": quotes_converted,
                "conversion_rate": round(conversion_rate, 2),
                "avg_conversion_time_hours": round(avg_conversion_time, 2)
            },
            "validation": {
                "credit_check_pass_rate": (credit_checks_passed / total * 100) if total > 0 else 0,
                "stock_availability_rate": (stock_available / total * 100) if total > 0 else 0
            }
        }
    
    # ============ ROI Calculations ============
    
    def calculate_roi(
        self,
        organization_id: int,
        period_days: int = 30,
        subscription_cost: float = 0,
        hourly_rate: float = 25.0
    ) -> Dict[str, Any]:
        """Calculate ROI for a client"""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        # Get all interactions in period
        interactions = self.db.query(BotInteractionLog).filter(
            BotInteractionLog.organization_id == organization_id,
            BotInteractionLog.started_at >= start_date,
            BotInteractionLog.started_at <= end_date
        ).all()
        
        total_interactions = len(interactions)
        
        # Calculate time saved
        doc_metrics = self.db.query(DocumentProcessingMetrics).filter(
            DocumentProcessingMetrics.organization_id == organization_id,
            DocumentProcessingMetrics.created_at >= start_date
        ).all()
        
        doc_time_saved = sum([m.time_saved_min or 0 for m in doc_metrics])
        
        # Estimate time saved for other bot types (assume 10 min per interaction)
        other_interactions = total_interactions - len(doc_metrics)
        estimated_time_saved = (other_interactions * 10) + doc_time_saved
        
        # Calculate costs
        usage_cost = total_interactions * 0.10  # Assume $0.10 per interaction
        total_cost = subscription_cost + usage_cost
        
        # Calculate savings
        labor_cost_saved = (estimated_time_saved / 60) * hourly_rate
        
        # Error reduction value (assume 2% error rate reduction worth 5% of labor cost)
        error_reduction_value = labor_cost_saved * 0.05
        
        # Speed improvements (assume 20% faster = 20% more throughput)
        faster_processing_value = labor_cost_saved * 0.20
        
        # Sales order revenue impact
        sales_metrics = self.db.query(SalesOrderMetrics).filter(
            SalesOrderMetrics.organization_id == organization_id,
            SalesOrderMetrics.created_at >= start_date
        ).all()
        
        additional_orders = len(sales_metrics)
        avg_order_value = sum([m.order_value or 0 for m in sales_metrics]) / len(sales_metrics) if sales_metrics else 0
        revenue_impact = additional_orders * avg_order_value * 0.10  # Assume 10% margin
        
        # Total value
        total_value = labor_cost_saved + error_reduction_value + faster_processing_value + revenue_impact
        net_benefit = total_value - total_cost
        roi_percentage = (net_benefit / total_cost * 100) if total_cost > 0 else 0
        
        # Payback period
        daily_benefit = net_benefit / period_days
        payback_days = int(total_cost / daily_benefit) if daily_benefit > 0 else 0
        
        # Projections
        projected_annual_savings = net_benefit * (365 / period_days)
        projected_annual_roi = roi_percentage  # Same ratio
        
        # Save to database
        roi_record = ClientROIMetrics(
            organization_id=organization_id,
            calculation_date=datetime.utcnow(),
            period_days=period_days,
            subscription_cost=subscription_cost,
            usage_cost=usage_cost,
            total_cost_to_client=total_cost,
            manual_hours_saved=estimated_time_saved / 60,
            hourly_rate=hourly_rate,
            labor_cost_saved=labor_cost_saved,
            error_reduction_value=error_reduction_value,
            faster_processing_value=faster_processing_value,
            additional_orders_captured=additional_orders,
            revenue_from_additional_orders=revenue_impact,
            total_value_generated=total_value,
            net_benefit=net_benefit,
            roi_percentage=roi_percentage,
            payback_period_days=payback_days,
            projected_annual_savings=projected_annual_savings,
            projected_annual_roi=projected_annual_roi
        )
        self.db.add(roi_record)
        self.db.commit()
        
        return {
            "period_days": period_days,
            "costs": {
                "subscription": round(subscription_cost, 2),
                "usage": round(usage_cost, 2),
                "total": round(total_cost, 2)
            },
            "savings": {
                "hours_saved": round(estimated_time_saved / 60, 2),
                "labor_cost_saved": round(labor_cost_saved, 2),
                "error_reduction_value": round(error_reduction_value, 2),
                "speed_improvement_value": round(faster_processing_value, 2)
            },
            "revenue_impact": {
                "additional_orders": additional_orders,
                "revenue_generated": round(revenue_impact, 2)
            },
            "roi": {
                "total_value_generated": round(total_value, 2),
                "net_benefit": round(net_benefit, 2),
                "roi_percentage": round(roi_percentage, 2),
                "payback_period_days": payback_days
            },
            "projections": {
                "annual_savings": round(projected_annual_savings, 2),
                "annual_roi_percentage": round(projected_annual_roi, 2)
            }
        }
    
    # ============ Accuracy Tracking ============
    
    def get_accuracy_trends(
        self,
        organization_id: int,
        bot_type: Optional[BotType] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get accuracy trends over time"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.query(AccuracyTracking).filter(
            AccuracyTracking.organization_id == organization_id,
            AccuracyTracking.created_at >= start_date
        )
        
        if bot_type:
            query = query.filter(AccuracyTracking.bot_type == bot_type)
        
        records = query.all()
        
        if not records:
            return {"error": "No accuracy data available"}
        
        total = len(records)
        correct = len([r for r in records if r.is_correct])
        accuracy = (correct / total * 100) if total > 0 else 0
        
        # Field-level accuracy
        field_accuracy = {}
        for record in records:
            field = record.field_name
            if field not in field_accuracy:
                field_accuracy[field] = {"total": 0, "correct": 0}
            field_accuracy[field]["total"] += 1
            if record.is_correct:
                field_accuracy[field]["correct"] += 1
        
        # Calculate percentages
        for field, stats in field_accuracy.items():
            stats["accuracy"] = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        
        return {
            "period_days": days,
            "overall_accuracy": round(accuracy, 2),
            "total_predictions": total,
            "correct_predictions": correct,
            "field_accuracy": {
                field: round(stats["accuracy"], 2) 
                for field, stats in field_accuracy.items()
            }
        }
    
    # ============ Helper Methods ============
    
    def _empty_performance_summary(self) -> Dict[str, Any]:
        return {
            "period": {},
            "volume": {"total_interactions": 0, "successful": 0, "failed": 0, "pending_review": 0, "success_rate": 0},
            "performance": {"avg_confidence_score": 0, "avg_processing_time_ms": 0, "avg_processing_time_sec": 0},
            "quality": {"human_review_rate": 0, "approval_rate": 0, "avg_feedback_score": 0, "feedback_count": 0}
        }
    
    def _empty_document_stats(self) -> Dict[str, Any]:
        return {
            "volume": {"total_documents": 0, "sap_posted": 0, "pending_review": 0, "success_rate": 0},
            "accuracy": {"field_extraction_accuracy": 0, "total_fields_extracted": 0, "fields_requiring_correction": 0, "correction_rate": 0},
            "efficiency": {"total_time_saved_hours": 0, "avg_time_saved_per_doc_min": 0, "documents_per_hour": 0},
            "financial": {"total_amount_processed": 0, "avg_invoice_value": 0},
            "document_types": {}
        }
    
    def _empty_helpdesk_stats(self) -> Dict[str, Any]:
        return {
            "volume": {"total_conversations": 0, "resolved_by_bot": 0, "escalated_to_human": 0, "bot_resolution_rate": 0, "escalation_rate": 0},
            "performance": {"avg_first_response_sec": 0, "avg_resolution_time_min": 0, "first_contact_resolution_rate": 0},
            "satisfaction": {"satisfaction_rate": 0, "avg_rating": 0, "rating_count": 0},
            "sla": {"sla_compliance_rate": 0, "sla_breaches": 0},
            "query_types": {},
            "sentiment_distribution": {}
        }
    
    def _empty_sales_order_stats(self) -> Dict[str, Any]:
        return {
            "volume": {"total_orders_processed": 0, "created_in_erp": 0, "success_rate": 0},
            "financial": {"total_order_value": 0, "avg_order_value": 0, "largest_order": 0},
            "conversion": {"quotes_converted": 0, "conversion_rate": 0, "avg_conversion_time_hours": 0},
            "validation": {"credit_check_pass_rate": 0, "stock_availability_rate": 0}
        }
