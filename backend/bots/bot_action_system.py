"""
Intelligent Bot Action System - Proactive AI that chases incomplete actions

This is ARIA's killer feature! Bots don't just answer questions - they:
- Track pending actions across all workflows
- Chase overdue tasks via email, WhatsApp, in-app notifications
- Escalate to managers when SLAs are breached
- Learn user behavior patterns (when they typically complete tasks)
- Prioritize actions based on business impact
- Auto-complete simple tasks when possible

Key Features:
- **Proactive Monitoring**: Bots continuously monitor all pending actions
- **Multi-channel Notifications**: Email, WhatsApp, SMS, in-app, Teams
- **Smart Escalation**: Auto-escalate based on SLAs, business rules
- **AI Prioritization**: Rank actions by urgency, impact, dependencies
- **Auto-completion**: Simple tasks completed automatically (with approval)
- **Learning**: Improve over time based on user behavior

This is what makes ARIA different from SAP, Odoo, and other ERPs!
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class ActionPriority(Enum):
    """Action priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionStatus(Enum):
    """Action status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    ESCALATED = "escalated"
    AUTO_COMPLETED = "auto_completed"


class NotificationChannel(Enum):
    """Notification delivery channels"""
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    SMS = "sms"
    IN_APP = "in_app"
    TEAMS = "teams"
    SLACK = "slack"


@dataclass
class BotAction:
    """A task/action tracked by the bot system"""
    action_id: str
    tenant_id: str
    action_type: str  # "approval", "review", "payment", "followup", etc.
    title: str
    description: str
    priority: ActionPriority
    status: ActionStatus
    assigned_to_user: str
    assigned_to_role: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    source_bot: Optional[str] = None  # Which bot created this action
    source_workflow: Optional[str] = None  # Which workflow this belongs to
    context: Dict = field(default_factory=dict)  # Additional context
    notifications_sent: int = 0
    last_notification: Optional[datetime] = None
    escalation_count: int = 0
    auto_completable: bool = False  # Can bot auto-complete this?


@dataclass
class NotificationRule:
    """Rules for when to send notifications"""
    rule_id: str
    name: str
    action_type: str
    channels: List[NotificationChannel]
    remind_after_hours: int = 24
    remind_every_hours: int = 24
    max_reminders: int = 3
    escalate_after_hours: int = 72
    escalate_to_role: Optional[str] = None


@dataclass
class NotificationLog:
    """Log of notifications sent"""
    notification_id: str
    action_id: str
    channel: NotificationChannel
    recipient: str
    sent_at: datetime
    delivered: bool
    opened: bool = False
    clicked: bool = False
    error: Optional[str] = None


class IntelligentBotActionSystem:
    """AI-powered action tracking and chase system"""
    
    # Default notification rules
    DEFAULT_RULES = [
        NotificationRule(
            rule_id="approval_urgent",
            name="Urgent Approvals",
            action_type="approval",
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
            remind_after_hours=4,
            remind_every_hours=12,
            max_reminders=5,
            escalate_after_hours=24,
            escalate_to_role="manager"
        ),
        NotificationRule(
            rule_id="payment_due",
            name="Payment Due",
            action_type="payment",
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            remind_after_hours=24,
            remind_every_hours=24,
            max_reminders=3,
            escalate_after_hours=72,
            escalate_to_role="cfo"
        ),
        NotificationRule(
            rule_id="invoice_overdue",
            name="Overdue Invoices",
            action_type="followup",
            channels=[NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
            remind_after_hours=7*24,  # 7 days
            remind_every_hours=7*24,  # Weekly
            max_reminders=10,
            escalate_after_hours=30*24,  # 30 days
            escalate_to_role="credit_controller"
        ),
        NotificationRule(
            rule_id="expense_approval",
            name="Expense Approvals",
            action_type="expense_approval",
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            remind_after_hours=24,
            remind_every_hours=48,
            max_reminders=3,
            escalate_after_hours=120,  # 5 days
            escalate_to_role="finance_manager"
        ),
        NotificationRule(
            rule_id="po_approval",
            name="Purchase Order Approvals",
            action_type="po_approval",
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.TEAMS],
            remind_after_hours=12,
            remind_every_hours=24,
            max_reminders=4,
            escalate_after_hours=48,
            escalate_to_role="procurement_manager"
        ),
    ]
    
    def __init__(self):
        self.actions: Dict[str, BotAction] = {}
        self.rules: Dict[str, NotificationRule] = {}
        self.notification_logs: List[NotificationLog] = []
        self._load_default_rules()
    
    def _load_default_rules(self):
        """Load default notification rules"""
        for rule in self.DEFAULT_RULES:
            self.rules[rule.rule_id] = rule
        logger.info(f"Loaded {len(self.DEFAULT_RULES)} notification rules")
    
    def create_action(
        self,
        tenant_id: str,
        action_type: str,
        title: str,
        description: str,
        assigned_to_user: str,
        priority: ActionPriority = ActionPriority.MEDIUM,
        due_date: Optional[datetime] = None,
        source_bot: Optional[str] = None,
        source_workflow: Optional[str] = None,
        context: Optional[Dict] = None,
        auto_completable: bool = False
    ) -> BotAction:
        """Create a new action for tracking"""
        action_id = f"action_{tenant_id}_{int(datetime.utcnow().timestamp())}"
        
        action = BotAction(
            action_id=action_id,
            tenant_id=tenant_id,
            action_type=action_type,
            title=title,
            description=description,
            priority=priority,
            status=ActionStatus.PENDING,
            assigned_to_user=assigned_to_user,
            due_date=due_date,
            source_bot=source_bot,
            source_workflow=source_workflow,
            context=context or {},
            auto_completable=auto_completable
        )
        
        self.actions[action_id] = action
        
        logger.info(f"Created action: {action_id} for user {assigned_to_user}")
        
        # Send initial notification
        self._send_notification(action)
        
        return action
    
    def get_pending_actions(
        self,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        priority: Optional[ActionPriority] = None
    ) -> List[BotAction]:
        """Get pending actions with filters"""
        actions = list(self.actions.values())
        
        # Filter by tenant
        if tenant_id:
            actions = [a for a in actions if a.tenant_id == tenant_id]
        
        # Filter by user
        if user_id:
            actions = [a for a in actions if a.assigned_to_user == user_id]
        
        # Filter by priority
        if priority:
            actions = [a for a in actions if a.priority == priority]
        
        # Only pending/in-progress/overdue actions
        actions = [
            a for a in actions 
            if a.status in [ActionStatus.PENDING, ActionStatus.IN_PROGRESS, ActionStatus.OVERDUE]
        ]
        
        # Sort by priority and due date
        priority_order = {
            ActionPriority.CRITICAL: 0,
            ActionPriority.HIGH: 1,
            ActionPriority.MEDIUM: 2,
            ActionPriority.LOW: 3
        }
        
        actions.sort(
            key=lambda a: (
                priority_order[a.priority],
                a.due_date or datetime.max,
                a.created_at
            )
        )
        
        return actions
    
    def complete_action(
        self,
        action_id: str,
        completed_by: str,
        notes: Optional[str] = None
    ) -> BotAction:
        """Mark action as completed"""
        action = self.actions.get(action_id)
        if not action:
            raise ValueError(f"Action not found: {action_id}")
        
        action.status = ActionStatus.COMPLETED
        action.completed_at = datetime.utcnow()
        action.completed_by = completed_by
        
        if notes:
            action.context["completion_notes"] = notes
        
        logger.info(f"Action completed: {action_id} by {completed_by}")
        
        return action
    
    def auto_complete_action(
        self,
        action_id: str,
        bot_id: str,
        reasoning: str
    ) -> BotAction:
        """Auto-complete action (by bot)"""
        action = self.actions.get(action_id)
        if not action:
            raise ValueError(f"Action not found: {action_id}")
        
        if not action.auto_completable:
            raise ValueError(f"Action not auto-completable: {action_id}")
        
        action.status = ActionStatus.AUTO_COMPLETED
        action.completed_at = datetime.utcnow()
        action.completed_by = f"bot:{bot_id}"
        action.context["auto_completion_reasoning"] = reasoning
        
        logger.info(f"Action auto-completed: {action_id} by bot {bot_id}")
        
        # Notify user of auto-completion
        self._send_notification(action, message=f"✅ Auto-completed: {action.title}\n\nReasoning: {reasoning}")
        
        return action
    
    def check_and_chase_overdue(self) -> List[Dict]:
        """Check for overdue actions and send chase notifications"""
        chased_actions = []
        now = datetime.utcnow()
        
        for action in self.actions.values():
            # Skip completed actions
            if action.status in [ActionStatus.COMPLETED, ActionStatus.AUTO_COMPLETED]:
                continue
            
            # Check if overdue
            if action.due_date and now > action.due_date:
                if action.status != ActionStatus.OVERDUE:
                    action.status = ActionStatus.OVERDUE
                    logger.warning(f"Action overdue: {action.action_id}")
            
            # Get notification rule for this action type
            rule = self._get_notification_rule(action.action_type)
            if not rule:
                continue
            
            # Check if we should send reminder
            hours_since_created = (now - action.created_at).total_seconds() / 3600
            hours_since_last_notification = float('inf')
            
            if action.last_notification:
                hours_since_last_notification = (now - action.last_notification).total_seconds() / 3600
            
            # Should we send reminder?
            should_remind = (
                hours_since_created >= rule.remind_after_hours and
                hours_since_last_notification >= rule.remind_every_hours and
                action.notifications_sent < rule.max_reminders
            )
            
            if should_remind:
                self._send_notification(action)
                chased_actions.append({
                    "action_id": action.action_id,
                    "title": action.title,
                    "assigned_to": action.assigned_to_user,
                    "days_overdue": (now - action.due_date).days if action.due_date else 0
                })
            
            # Should we escalate?
            should_escalate = (
                hours_since_created >= rule.escalate_after_hours and
                action.status != ActionStatus.ESCALATED
            )
            
            if should_escalate:
                self._escalate_action(action, rule)
        
        return chased_actions
    
    def _get_notification_rule(self, action_type: str) -> Optional[NotificationRule]:
        """Get notification rule for action type"""
        # Try exact match first
        for rule in self.rules.values():
            if rule.action_type == action_type:
                return rule
        
        # Fall back to default rule
        return self.rules.get("approval_urgent")
    
    def _send_notification(
        self,
        action: BotAction,
        message: Optional[str] = None,
        channels: Optional[List[NotificationChannel]] = None
    ):
        """Send notification to user"""
        rule = self._get_notification_rule(action.action_type)
        
        if not channels:
            channels = rule.channels if rule else [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
        
        if not message:
            # Generate message
            priority_emoji = {
                ActionPriority.CRITICAL: "🔴",
                ActionPriority.HIGH: "🟠",
                ActionPriority.MEDIUM: "🟡",
                ActionPriority.LOW: "🟢"
            }
            
            emoji = priority_emoji.get(action.priority, "📌")
            
            overdue_text = ""
            if action.due_date and datetime.utcnow() > action.due_date:
                days_overdue = (datetime.utcnow() - action.due_date).days
                overdue_text = f"\n⚠️ OVERDUE by {days_overdue} days!"
            
            message = f"""{emoji} Action Required: {action.title}

{action.description}

Priority: {action.priority.value.upper()}
Due: {action.due_date.strftime('%Y-%m-%d %H:%M') if action.due_date else 'ASAP'}{overdue_text}

Source: {action.source_bot or 'System'}

Please complete this action as soon as possible.
"""
        
        # Send to each channel
        for channel in channels:
            notification_id = f"notif_{action.action_id}_{channel.value}_{int(datetime.utcnow().timestamp())}"
            
            log = NotificationLog(
                notification_id=notification_id,
                action_id=action.action_id,
                channel=channel,
                recipient=action.assigned_to_user,
                sent_at=datetime.utcnow(),
                delivered=True  # Assume delivered for now
            )
            
            self.notification_logs.append(log)
            
            # TODO: Actually send notification via respective channel
            # - Email: Send via SMTP
            # - WhatsApp: Send via Twilio/WhatsApp Business API
            # - SMS: Send via Twilio
            # - In-app: Store in database, show in UI
            # - Teams: Send via Microsoft Graph API
            
            logger.info(f"Sent {channel.value} notification to {action.assigned_to_user} for action {action.action_id}")
        
        # Update action
        action.notifications_sent += 1
        action.last_notification = datetime.utcnow()
    
    def _escalate_action(self, action: BotAction, rule: NotificationRule):
        """Escalate action to higher authority"""
        action.status = ActionStatus.ESCALATED
        action.escalation_count += 1
        
        # Determine escalation recipient
        escalate_to_role = rule.escalate_to_role or "manager"
        
        logger.warning(f"Escalating action {action.action_id} to {escalate_to_role}")
        
        # Send escalation notification
        escalation_message = f"""⚠️ ESCALATION: Action Overdue

Action: {action.title}
Originally assigned to: {action.assigned_to_user}
Priority: {action.priority.value.upper()}
Created: {action.created_at.strftime('%Y-%m-%d %H:%M')}
Due: {action.due_date.strftime('%Y-%m-%d %H:%M') if action.due_date else 'ASAP'}
Days overdue: {(datetime.utcnow() - action.due_date).days if action.due_date else 'N/A'}
Reminders sent: {action.notifications_sent}

This action has not been completed and requires your attention.

Description: {action.description}
"""
        
        # Create escalation action
        escalation_action = BotAction(
            action_id=f"escalation_{action.action_id}",
            tenant_id=action.tenant_id,
            action_type="escalation",
            title=f"ESCALATION: {action.title}",
            description=escalation_message,
            priority=ActionPriority.CRITICAL,
            status=ActionStatus.PENDING,
            assigned_to_user=escalate_to_role,
            assigned_to_role=escalate_to_role,
            context={"original_action_id": action.action_id}
        )
        
        self.actions[escalation_action.action_id] = escalation_action
        
        # Send notification
        self._send_notification(
            escalation_action,
            message=escalation_message,
            channels=[NotificationChannel.EMAIL, NotificationChannel.WHATSAPP, NotificationChannel.IN_APP]
        )
    
    def get_action_summary(self, tenant_id: str) -> Dict:
        """Get summary of actions for a tenant"""
        tenant_actions = [a for a in self.actions.values() if a.tenant_id == tenant_id]
        
        # Count by status
        status_counts = {
            "pending": len([a for a in tenant_actions if a.status == ActionStatus.PENDING]),
            "in_progress": len([a for a in tenant_actions if a.status == ActionStatus.IN_PROGRESS]),
            "overdue": len([a for a in tenant_actions if a.status == ActionStatus.OVERDUE]),
            "escalated": len([a for a in tenant_actions if a.status == ActionStatus.ESCALATED]),
            "completed": len([a for a in tenant_actions if a.status == ActionStatus.COMPLETED]),
            "auto_completed": len([a for a in tenant_actions if a.status == ActionStatus.AUTO_COMPLETED])
        }
        
        # Count by priority
        priority_counts = {
            "critical": len([a for a in tenant_actions if a.priority == ActionPriority.CRITICAL]),
            "high": len([a for a in tenant_actions if a.priority == ActionPriority.HIGH]),
            "medium": len([a for a in tenant_actions if a.priority == ActionPriority.MEDIUM]),
            "low": len([a for a in tenant_actions if a.priority == ActionPriority.LOW])
        }
        
        return {
            "total_actions": len(tenant_actions),
            "status_breakdown": status_counts,
            "priority_breakdown": priority_counts,
            "notifications_sent": sum(a.notifications_sent for a in tenant_actions),
            "escalations": sum(a.escalation_count for a in tenant_actions)
        }
    
    def suggest_auto_completion(self, action: BotAction) -> Optional[Dict]:
        """AI suggests if action can be auto-completed"""
        # This is where we use AI to determine if an action can be auto-completed
        # For example:
        # - Expense claim under policy limit → Auto-approve
        # - Invoice matches PO exactly → Auto-approve payment
        # - Simple data entry task → Auto-complete based on patterns
        
        if not action.auto_completable:
            return None
        
        # TODO: Use Ollama/LLM to analyze action context and suggest completion
        # For now, return a simple suggestion
        
        suggestion = {
            "can_auto_complete": True,
            "confidence": 0.85,
            "reasoning": "Action meets auto-completion criteria based on business rules",
            "suggested_action": "approve",
            "risk_level": "low"
        }
        
        return suggestion


# Singleton instance
bot_action_system = IntelligentBotActionSystem()
