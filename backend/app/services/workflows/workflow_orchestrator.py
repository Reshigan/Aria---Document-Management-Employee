"""
Workflow Orchestrator Service

Manages multi-step business processes with approval gates.
Enables conversational workflow execution through Ask Aria.
"""

import asyncio
import json
import yaml
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

try:
    from app.services.bots.bot_erp_integration import BotERPIntegration
except ImportError:
    from app.services.workflows.bot_adapter import BotERPIntegration

from app.bots.bot_manager import BotManager


class WorkflowOrchestrator:
    """
    Orchestrates multi-step workflows with approval gates.
    
    Features:
    - Declarative workflow definitions (YAML/JSON)
    - State persistence and resumption
    - Approval gates with role-based access
    - Event correlation for external triggers
    - Document generation and email integration
    - Audit trail for compliance
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.bot_integration = BotERPIntegration(db)
        self.bot_manager = BotManager()
        
    
    async def start_workflow(
        self,
        workflow_name: str,
        company_id: UUID,
        user_id: UUID,
        initial_context: Dict[str, Any],
        conversation_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Start a new workflow instance.
        
        Args:
            workflow_name: Name of workflow definition
            company_id: Company ID
            user_id: User who started workflow
            initial_context: Initial workflow context data
            conversation_id: Optional Ask Aria conversation ID
            
        Returns:
            Workflow instance data
        """
        definition = self._get_workflow_definition(workflow_name)
        if not definition:
            raise ValueError(f"Workflow definition '{workflow_name}' not found")
        
        instance_id = uuid4()
        initial_state = definition['definition']['initial_state']
        
        correlation_keys = self._generate_correlation_keys(initial_context)
        
        self.db.execute("""
            INSERT INTO workflow_instances (
                id, workflow_definition_id, company_id, user_id, conversation_id,
                current_state, status, context, correlation_keys
            ) VALUES (
                :id, :workflow_definition_id, :company_id, :user_id, :conversation_id,
                :current_state, 'running', :context, :correlation_keys
            )
        """, {
            'id': str(instance_id),
            'workflow_definition_id': str(definition['id']),
            'company_id': str(company_id),
            'user_id': str(user_id),
            'conversation_id': str(conversation_id) if conversation_id else None,
            'current_state': initial_state,
            'context': json.dumps(initial_context),
            'correlation_keys': json.dumps(correlation_keys)
        })
        
        self._log_audit(
            instance_id, 'started', user_id, 'user',
            None, initial_state,
            f"Workflow '{workflow_name}' started"
        )
        
        self.db.commit()
        
        await self._execute_next_step(instance_id)
        
        return self.get_workflow_status(instance_id)
    
    async def _execute_next_step(self, instance_id: UUID) -> None:
        """Execute the next step in the workflow."""
        instance = self._get_workflow_instance(instance_id)
        if not instance:
            return
        
        definition = self._get_workflow_definition_by_id(instance['workflow_definition_id'])
        if not definition:
            return
        
        current_state = instance['current_state']
        workflow_def = definition['definition']
        
        state_def = workflow_def['states'].get(current_state)
        if not state_def:
            return
        
        if state_def.get('type') == 'end':
            await self._complete_workflow(instance_id)
            return
        
        step_type = state_def.get('type', 'bot_task')
        
        if step_type == 'bot_task':
            await self._execute_bot_task(instance_id, state_def)
        elif step_type == 'human_approval':
            await self._request_approval(instance_id, state_def)
        elif step_type == 'wait_event':
            await self._wait_for_event(instance_id, state_def)
        elif step_type == 'decision':
            await self._execute_decision(instance_id, state_def)
        elif step_type == 'timer':
            await self._start_timer(instance_id, state_def)
    
    async def _execute_bot_task(self, instance_id: UUID, state_def: Dict[str, Any]) -> None:
        """Execute a bot task step."""
        instance = self._get_workflow_instance(instance_id)
        context = json.loads(instance['context'])
        
        step_id = uuid4()
        self.db.execute("""
            INSERT INTO workflow_steps (
                id, workflow_instance_id, step_name, step_type, step_order, status
            ) VALUES (
                :id, :instance_id, :step_name, 'bot_task', :step_order, 'running'
            )
        """, {
            'id': str(step_id),
            'instance_id': str(instance_id),
            'step_name': state_def['name'],
            'step_order': self._get_next_step_order(instance_id)
        })
        
        try:
            bot_name = state_def['bot']
            action = state_def['action']
            params = self._resolve_params(state_def.get('params', {}), context)
            
            result = await self._call_bot(
                bot_name, action, params,
                instance['company_id'], instance['user_id']
            )
            
            output_key = state_def.get('output_key', 'result')
            context[output_key] = result
            
            self.db.execute("""
                UPDATE workflow_steps
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
                    output_data = :output_data
                WHERE id = :id
            """, {
                'id': str(step_id),
                'output_data': json.dumps(result)
            })
            
            self.db.execute("""
                UPDATE workflow_instances
                SET context = :context, last_activity_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """, {
                'id': str(instance_id),
                'context': json.dumps(context)
            })
            
            self.db.commit()
            
            next_state = state_def.get('next')
            if next_state:
                await self._transition_state(instance_id, next_state)
            
        except Exception as e:
            self.db.execute("""
                UPDATE workflow_steps
                SET status = 'failed', error_message = :error
                WHERE id = :id
            """, {
                'id': str(step_id),
                'error': str(e)
            })
            self.db.commit()
            
            await self._handle_step_failure(instance_id, state_def, str(e))
    
    async def _request_approval(self, instance_id: UUID, state_def: Dict[str, Any]) -> None:
        """Request human approval."""
        instance = self._get_workflow_instance(instance_id)
        context = json.loads(instance['context'])
        
        step_id = uuid4()
        self.db.execute("""
            INSERT INTO workflow_steps (
                id, workflow_instance_id, step_name, step_type, step_order, status
            ) VALUES (
                :id, :instance_id, :step_name, 'human_approval', :step_order, 'running'
            )
        """, {
            'id': str(step_id),
            'instance_id': str(instance_id),
            'step_name': state_def['name'],
            'step_order': self._get_next_step_order(instance_id)
        })
        
        approval_id = uuid4()
        approval_type = state_def['approval_type']
        description = self._resolve_template(state_def.get('description', ''), context)
        
        approver_role = state_def.get('approver_role')
        approver_user_id = state_def.get('approver_user_id')
        if not approver_user_id:
            approver_user_id = instance['user_id']  # Default to workflow starter
        
        approval_data_keys = state_def.get('approval_data_keys', [])
        approval_data = {key: context.get(key) for key in approval_data_keys}
        
        self.db.execute("""
            INSERT INTO workflow_approvals (
                id, workflow_instance_id, workflow_step_id,
                approval_type, description,
                requested_from_user_id, requested_from_role,
                status, approval_data
            ) VALUES (
                :id, :instance_id, :step_id,
                :approval_type, :description,
                :approver_user_id, :approver_role,
                'pending', :approval_data
            )
        """, {
            'id': str(approval_id),
            'instance_id': str(instance_id),
            'step_id': str(step_id),
            'approval_type': approval_type,
            'description': description,
            'approver_user_id': str(approver_user_id),
            'approver_role': approver_role,
            'approval_data': json.dumps(approval_data)
        })
        
        self.db.execute("""
            UPDATE workflow_instances
            SET status = 'paused', last_activity_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(instance_id)})
        
        self.db.commit()
        
        self._log_audit(
            instance_id, 'approval_requested', instance['user_id'], 'system',
            instance['current_state'], instance['current_state'],
            f"Approval requested: {description}"
        )
    
    async def approve_step(
        self,
        instance_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve a workflow step."""
        result = self.db.execute("""
            SELECT id, workflow_step_id, approval_type
            FROM workflow_approvals
            WHERE workflow_instance_id = :instance_id
            AND status = 'pending'
            ORDER BY requested_at DESC
            LIMIT 1
        """, {'instance_id': str(instance_id)}).fetchone()
        
        if not result:
            raise ValueError("No pending approval found")
        
        approval_id = result[0]
        step_id = result[1]
        
        self.db.execute("""
            UPDATE workflow_approvals
            SET status = 'approved',
                decision_by_user_id = :user_id,
                decision_at = CURRENT_TIMESTAMP,
                decision_notes = :notes
            WHERE id = :id
        """, {
            'id': str(approval_id),
            'user_id': str(user_id),
            'notes': notes
        })
        
        self.db.execute("""
            UPDATE workflow_steps
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(step_id)})
        
        self.db.execute("""
            UPDATE workflow_instances
            SET status = 'running', last_activity_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(instance_id)})
        
        self.db.commit()
        
        self._log_audit(
            instance_id, 'approved', user_id, 'user',
            None, None, f"Step approved: {notes or 'No notes'}"
        )
        
        instance = self._get_workflow_instance(instance_id)
        definition = self._get_workflow_definition_by_id(instance['workflow_definition_id'])
        state_def = definition['definition']['states'][instance['current_state']]
        
        next_state = state_def.get('on_approve')
        if next_state:
            await self._transition_state(instance_id, next_state)
        
        return self.get_workflow_status(instance_id)
    
    async def reject_step(
        self,
        instance_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reject a workflow step."""
        result = self.db.execute("""
            SELECT id, workflow_step_id
            FROM workflow_approvals
            WHERE workflow_instance_id = :instance_id
            AND status = 'pending'
            ORDER BY requested_at DESC
            LIMIT 1
        """, {'instance_id': str(instance_id)}).fetchone()
        
        if not result:
            raise ValueError("No pending approval found")
        
        approval_id = result[0]
        step_id = result[1]
        
        self.db.execute("""
            UPDATE workflow_approvals
            SET status = 'rejected',
                decision_by_user_id = :user_id,
                decision_at = CURRENT_TIMESTAMP,
                decision_notes = :notes
            WHERE id = :id
        """, {
            'id': str(approval_id),
            'user_id': str(user_id),
            'notes': notes
        })
        
        self.db.execute("""
            UPDATE workflow_steps
            SET status = 'failed', completed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(step_id)})
        
        self.db.execute("""
            UPDATE workflow_instances
            SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(instance_id)})
        
        self.db.commit()
        
        self._log_audit(
            instance_id, 'rejected', user_id, 'user',
            None, None, f"Step rejected: {notes or 'No notes'}"
        )
        
        return self.get_workflow_status(instance_id)
    
    async def _wait_for_event(self, instance_id: UUID, state_def: Dict[str, Any]) -> None:
        """Wait for external event."""
        self.db.execute("""
            UPDATE workflow_instances
            SET status = 'paused', last_activity_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(instance_id)})
        self.db.commit()
        
    
    async def process_event(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        correlation_keys: Dict[str, Any],
        event_source: str = 'manual'
    ) -> List[UUID]:
        """
        Process an external event and resume matching workflows.
        
        Returns:
            List of workflow instance IDs that were resumed
        """
        results = self.db.execute("""
            SELECT id, current_state, workflow_definition_id
            FROM workflow_instances
            WHERE status = 'paused'
            AND correlation_keys @> :correlation_keys::jsonb
        """, {'correlation_keys': json.dumps(correlation_keys)}).fetchall()
        
        resumed_workflows = []
        
        for row in results:
            instance_id = UUID(row[0])
            current_state = row[1]
            definition_id = row[2]
            
            definition = self._get_workflow_definition_by_id(definition_id)
            state_def = definition['definition']['states'].get(current_state)
            
            if state_def and state_def.get('type') == 'wait_event':
                expected_event = state_def.get('event_type')
                if expected_event == event_type:
                    event_id = uuid4()
                    self.db.execute("""
                        INSERT INTO workflow_events (
                            id, workflow_instance_id, event_type, event_source,
                            event_data, correlation_keys, processed
                        ) VALUES (
                            :id, :instance_id, :event_type, :event_source,
                            :event_data, :correlation_keys, true
                        )
                    """, {
                        'id': str(event_id),
                        'instance_id': str(instance_id),
                        'event_type': event_type,
                        'event_source': event_source,
                        'event_data': json.dumps(event_data),
                        'correlation_keys': json.dumps(correlation_keys)
                    })
                    
                    instance = self._get_workflow_instance(instance_id)
                    context = json.loads(instance['context'])
                    output_key = state_def.get('output_key', 'event_data')
                    context[output_key] = event_data
                    
                    self.db.execute("""
                        UPDATE workflow_instances
                        SET context = :context, status = 'running'
                        WHERE id = :id
                    """, {
                        'id': str(instance_id),
                        'context': json.dumps(context)
                    })
                    
                    self.db.commit()
                    
                    next_state = state_def.get('next')
                    if next_state:
                        await self._transition_state(instance_id, next_state)
                    
                    resumed_workflows.append(instance_id)
        
        return resumed_workflows
    
    async def _transition_state(self, instance_id: UUID, new_state: str) -> None:
        """Transition workflow to new state."""
        instance = self._get_workflow_instance(instance_id)
        old_state = instance['current_state']
        
        self.db.execute("""
            UPDATE workflow_instances
            SET current_state = :new_state, last_activity_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {
            'id': str(instance_id),
            'new_state': new_state
        })
        self.db.commit()
        
        self._log_audit(
            instance_id, 'state_changed', instance['user_id'], 'system',
            old_state, new_state, f"Transitioned from {old_state} to {new_state}"
        )
        
        await self._execute_next_step(instance_id)
    
    async def _complete_workflow(self, instance_id: UUID) -> None:
        """Mark workflow as completed."""
        self.db.execute("""
            UPDATE workflow_instances
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(instance_id)})
        self.db.commit()
        
        instance = self._get_workflow_instance(instance_id)
        self._log_audit(
            instance_id, 'completed', instance['user_id'], 'system',
            instance['current_state'], None, "Workflow completed successfully"
        )
    
    
    def get_workflow_status(self, instance_id: UUID) -> Dict[str, Any]:
        """Get current workflow status."""
        instance = self._get_workflow_instance(instance_id)
        if not instance:
            return None
        
        approvals = self.db.execute("""
            SELECT id, approval_type, description, status
            FROM workflow_approvals
            WHERE workflow_instance_id = :instance_id
            AND status = 'pending'
        """, {'instance_id': str(instance_id)}).fetchall()
        
        steps = self.db.execute("""
            SELECT step_name, step_type, status, completed_at
            FROM workflow_steps
            WHERE workflow_instance_id = :instance_id
            ORDER BY step_order DESC
            LIMIT 10
        """, {'instance_id': str(instance_id)}).fetchall()
        
        return {
            'instance_id': str(instance['id']),
            'workflow_name': instance.get('workflow_name'),
            'current_state': instance['current_state'],
            'status': instance['status'],
            'context': json.loads(instance['context']),
            'started_at': instance['started_at'].isoformat() if instance['started_at'] else None,
            'last_activity_at': instance['last_activity_at'].isoformat() if instance['last_activity_at'] else None,
            'pending_approvals': [
                {
                    'id': str(a[0]),
                    'type': a[1],
                    'description': a[2],
                    'status': a[3]
                }
                for a in approvals
            ],
            'recent_steps': [
                {
                    'name': s[0],
                    'type': s[1],
                    'status': s[2],
                    'completed_at': s[3].isoformat() if s[3] else None
                }
                for s in steps
            ]
        }
    
    def _get_workflow_instance(self, instance_id: UUID) -> Optional[Dict[str, Any]]:
        """Get workflow instance by ID."""
        result = self.db.execute("""
            SELECT id, workflow_definition_id, company_id, user_id, conversation_id,
                   current_state, status, context, correlation_keys,
                   started_at, completed_at, last_activity_at
            FROM workflow_instances
            WHERE id = :id
        """, {'id': str(instance_id)}).fetchone()
        
        if not result:
            return None
        
        return {
            'id': result[0],
            'workflow_definition_id': result[1],
            'company_id': result[2],
            'user_id': result[3],
            'conversation_id': result[4],
            'current_state': result[5],
            'status': result[6],
            'context': result[7],
            'correlation_keys': result[8],
            'started_at': result[9],
            'completed_at': result[10],
            'last_activity_at': result[11]
        }
    
    def _get_workflow_definition(self, name: str) -> Optional[Dict[str, Any]]:
        """Get workflow definition by name."""
        result = self.db.execute("""
            SELECT id, name, description, definition
            FROM workflow_definitions
            WHERE name = :name AND is_active = true
        """, {'name': name}).fetchone()
        
        if not result:
            return None
        
        return {
            'id': result[0],
            'name': result[1],
            'description': result[2],
            'definition': json.loads(result[3]) if isinstance(result[3], str) else result[3]
        }
    
    def _get_workflow_definition_by_id(self, definition_id: UUID) -> Optional[Dict[str, Any]]:
        """Get workflow definition by ID."""
        result = self.db.execute("""
            SELECT id, name, description, definition
            FROM workflow_definitions
            WHERE id = :id
        """, {'id': str(definition_id)}).fetchone()
        
        if not result:
            return None
        
        return {
            'id': result[0],
            'name': result[1],
            'description': result[2],
            'definition': json.loads(result[3]) if isinstance(result[3], str) else result[3]
        }
    
    async def _call_bot(
        self,
        bot_name: str,
        action: str,
        params: Dict[str, Any],
        company_id: UUID,
        user_id: UUID
    ) -> Any:
        """Call a bot action."""
        bot_method_map = {
            'quote_generation': 'create_quote',
            'sales_order': 'create_sales_order',
            'invoice_processing': 'create_invoice',
            'document_generation': 'generate_document_pdf',
            'email_integration': 'send_email',
            'warehouse_management': 'warehouse_management',
            'shipping': 'shipping'
        }
        
        method_name = bot_method_map.get(bot_name)
        if method_name and hasattr(self.bot_integration, method_name):
            method = getattr(self.bot_integration, method_name)
            return await method(company_id, user_id, **params)
        
        bot = self.bot_manager.get_bot(bot_name)
        if bot:
            return bot.execute(action, params)
        
        raise ValueError(f"Bot '{bot_name}' not found")
    
    def _resolve_params(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve parameter values from context."""
        resolved = {}
        for key, value in params.items():
            if isinstance(value, str) and value.startswith('$'):
                context_key = value[1:]
                resolved[key] = context.get(context_key)
            else:
                resolved[key] = value
        return resolved
    
    def _resolve_template(self, template: str, context: Dict[str, Any]) -> str:
        """Resolve template string with context variables."""
        result = template
        for key, value in context.items():
            result = result.replace(f'${{{key}}}', str(value))
        return result
    
    def _generate_correlation_keys(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate correlation keys from context."""
        keys = {}
        for key in ['quote_id', 'sales_order_id', 'invoice_id', 'customer_id', 'po_number']:
            if key in context:
                keys[key] = context[key]
        return keys
    
    def _get_next_step_order(self, instance_id: UUID) -> int:
        """Get next step order number."""
        result = self.db.execute("""
            SELECT MAX(step_order) FROM workflow_steps
            WHERE workflow_instance_id = :instance_id
        """, {'instance_id': str(instance_id)}).fetchone()
        
        return (result[0] or 0) + 1
    
    def _log_audit(
        self,
        instance_id: UUID,
        action: str,
        actor_user_id: UUID,
        actor_type: str,
        old_state: Optional[str],
        new_state: Optional[str],
        description: str
    ) -> None:
        """Log audit entry."""
        self.db.execute("""
            INSERT INTO workflow_audit_log (
                id, workflow_instance_id, action, actor_user_id, actor_type,
                old_state, new_state, description
            ) VALUES (
                :id, :instance_id, :action, :actor_user_id, :actor_type,
                :old_state, :new_state, :description
            )
        """, {
            'id': str(uuid4()),
            'instance_id': str(instance_id),
            'action': action,
            'actor_user_id': str(actor_user_id),
            'actor_type': actor_type,
            'old_state': old_state,
            'new_state': new_state,
            'description': description
        })
    
    async def _handle_step_failure(
        self,
        instance_id: UUID,
        state_def: Dict[str, Any],
        error: str
    ) -> None:
        """Handle step failure."""
        self.db.execute("""
            UPDATE workflow_instances
            SET status = 'failed', completed_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """, {'id': str(instance_id)})
        self.db.commit()
        
        instance = self._get_workflow_instance(instance_id)
        self._log_audit(
            instance_id, 'failed', instance['user_id'], 'system',
            instance['current_state'], None, f"Workflow failed: {error}"
        )
    
    async def _execute_decision(self, instance_id: UUID, state_def: Dict[str, Any]) -> None:
        """Execute decision logic."""
        pass
    
    async def _start_timer(self, instance_id: UUID, state_def: Dict[str, Any]) -> None:
        """Start timer for delayed execution."""
        pass
