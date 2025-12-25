/**
 * Approval Workflow Routes
 * 
 * Handles approval workflows for transactions that require human oversight.
 * Bots can trigger approval requests, humans approve/reject.
 */

import { Hono } from 'hono';
import { jwtVerify } from 'jose';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Helper to verify JWT and get context
async function getAuthContext(c: any): Promise<{ companyId: string; userId: string; userRole: string } | null> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      companyId: (payload as any).company_id,
      userId: (payload as any).sub,
      userRole: (payload as any).role || 'user'
    };
  } catch {
    return null;
  }
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// ==================== APPROVAL WORKFLOWS ====================

// List all approval workflows
app.get('/workflows', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const result = await c.env.DB.prepare(`
      SELECT aw.*, 
        (SELECT COUNT(*) FROM approval_workflow_steps WHERE workflow_id = aw.id) as step_count
      FROM approval_workflows aw
      WHERE aw.company_id = ?
      ORDER BY aw.document_type
    `).bind(auth.companyId).all();
    
    return c.json({
      workflows: result.results || []
    });
  } catch (error) {
    console.error('Error loading workflows:', error);
    return c.json({ error: 'Failed to load workflows' }, 500);
  }
});

// Get workflow with steps
app.get('/workflows/:id', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const workflowId = c.req.param('id');
    
    const workflow = await c.env.DB.prepare(
      'SELECT * FROM approval_workflows WHERE id = ? AND company_id = ?'
    ).bind(workflowId, auth.companyId).first();
    
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }
    
    const steps = await c.env.DB.prepare(
      'SELECT * FROM approval_workflow_steps WHERE workflow_id = ? ORDER BY step_order'
    ).bind(workflowId).all();
    
    return c.json({
      ...workflow,
      steps: steps.results || []
    });
  } catch (error) {
    console.error('Error loading workflow:', error);
    return c.json({ error: 'Failed to load workflow' }, 500);
  }
});

// Create approval workflow
app.post('/workflows', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { workflow_name, document_type, steps } = body;
    
    if (!workflow_name || !document_type) {
      return c.json({ error: 'Workflow name and document type are required' }, 400);
    }
    
    const validDocTypes = ['purchase_order', 'payment', 'journal_entry', 'leave_request', 'expense', 'invoice'];
    if (!validDocTypes.includes(document_type)) {
      return c.json({ error: 'Invalid document type' }, 400);
    }
    
    // Check for existing workflow
    const existing = await c.env.DB.prepare(
      'SELECT id FROM approval_workflows WHERE company_id = ? AND document_type = ?'
    ).bind(auth.companyId, document_type).first();
    
    if (existing) {
      return c.json({ error: 'Workflow already exists for this document type' }, 409);
    }
    
    const workflowId = generateUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO approval_workflows (id, company_id, workflow_name, document_type, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).bind(workflowId, auth.companyId, workflow_name, document_type, now).run();
    
    // Create steps if provided
    if (steps && Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepId = generateUUID();
        await c.env.DB.prepare(`
          INSERT INTO approval_workflow_steps (id, workflow_id, step_order, approver_type, approver_id, min_amount, max_amount, is_required, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          stepId,
          workflowId,
          i + 1,
          step.approver_type || 'role',
          step.approver_id || null,
          step.min_amount || 0,
          step.max_amount || null,
          step.is_required !== false ? 1 : 0,
          now
        ).run();
      }
    }
    
    return c.json({
      id: workflowId,
      workflow_name,
      document_type,
      message: 'Workflow created successfully'
    }, 201);
  } catch (error) {
    console.error('Error creating workflow:', error);
    return c.json({ error: 'Failed to create workflow' }, 500);
  }
});

// ==================== PENDING APPROVALS ====================

// List pending approvals for current user
app.get('/pending', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const status = c.req.query('status') || 'pending';
    const documentType = c.req.query('document_type');
    
    let query = `
      SELECT pa.*, aw.workflow_name, aw.document_type,
        aws.approver_type, aws.approver_id
      FROM pending_approvals pa
      JOIN approval_workflows aw ON pa.workflow_id = aw.id
      JOIN approval_workflow_steps aws ON pa.step_id = aws.id
      WHERE pa.company_id = ? AND pa.status = ?
    `;
    const params: any[] = [auth.companyId, status];
    
    if (documentType) {
      query += ' AND aw.document_type = ?';
      params.push(documentType);
    }
    
    // Filter by approver (user or role)
    query += ` AND (
      (aws.approver_type = 'user' AND aws.approver_id = ?) OR
      (aws.approver_type = 'role' AND aws.approver_id = ?) OR
      (aws.approver_type = 'manager') OR
      (aws.approver_type = 'department_head')
    )`;
    params.push(auth.userId, auth.userRole);
    
    query += ' ORDER BY pa.requested_at DESC';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      approvals: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('Error loading pending approvals:', error);
    return c.json({ error: 'Failed to load pending approvals' }, 500);
  }
});

// Get all pending approvals (admin view)
app.get('/all', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const status = c.req.query('status');
    const documentType = c.req.query('document_type');
    
    let query = `
      SELECT pa.*, aw.workflow_name, aw.document_type,
        u.full_name as requested_by_name
      FROM pending_approvals pa
      JOIN approval_workflows aw ON pa.workflow_id = aw.id
      LEFT JOIN users u ON pa.requested_by = u.id
      WHERE pa.company_id = ?
    `;
    const params: any[] = [auth.companyId];
    
    if (status) {
      query += ' AND pa.status = ?';
      params.push(status);
    }
    
    if (documentType) {
      query += ' AND aw.document_type = ?';
      params.push(documentType);
    }
    
    query += ' ORDER BY pa.requested_at DESC LIMIT 100';
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json({
      approvals: result.results || [],
      total: result.results?.length || 0
    });
  } catch (error) {
    console.error('Error loading all approvals:', error);
    return c.json({ error: 'Failed to load approvals' }, 500);
  }
});

// Submit document for approval (called by bots or manual submission)
app.post('/submit', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const { document_type, document_id, document_number, amount, notes } = body;
    
    if (!document_type || !document_id) {
      return c.json({ error: 'Document type and ID are required' }, 400);
    }
    
    // Find the workflow for this document type
    const workflow = await c.env.DB.prepare(
      'SELECT * FROM approval_workflows WHERE company_id = ? AND document_type = ? AND is_active = 1'
    ).bind(auth.companyId, document_type).first();
    
    if (!workflow) {
      // No workflow configured - auto-approve
      return c.json({
        status: 'auto_approved',
        message: 'No approval workflow configured for this document type'
      });
    }
    
    // Find the first applicable step based on amount
    const step = await c.env.DB.prepare(`
      SELECT * FROM approval_workflow_steps 
      WHERE workflow_id = ? 
        AND (min_amount IS NULL OR min_amount <= ?)
        AND (max_amount IS NULL OR max_amount >= ?)
      ORDER BY step_order
      LIMIT 1
    `).bind((workflow as any).id, amount || 0, amount || 0).first();
    
    if (!step) {
      // No applicable step - auto-approve
      return c.json({
        status: 'auto_approved',
        message: 'No approval step applies to this amount'
      });
    }
    
    // Check if already pending
    const existing = await c.env.DB.prepare(
      'SELECT id FROM pending_approvals WHERE company_id = ? AND document_type = ? AND document_id = ? AND status = ?'
    ).bind(auth.companyId, document_type, document_id, 'pending').first();
    
    if (existing) {
      return c.json({ error: 'Document is already pending approval' }, 409);
    }
    
    const approvalId = generateUUID();
    const now = new Date().toISOString();
    
    await c.env.DB.prepare(`
      INSERT INTO pending_approvals (
        id, company_id, workflow_id, step_id, document_type, document_id, 
        document_number, amount, requested_by, requested_at, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      approvalId,
      auth.companyId,
      (workflow as any).id,
      (step as any).id,
      document_type,
      document_id,
      document_number || null,
      amount || 0,
      auth.userId,
      now,
      notes || null
    ).run();
    
    return c.json({
      id: approvalId,
      status: 'pending',
      workflow_name: (workflow as any).workflow_name,
      message: 'Document submitted for approval'
    }, 201);
  } catch (error) {
    console.error('Error submitting for approval:', error);
    return c.json({ error: 'Failed to submit for approval' }, 500);
  }
});

// Approve a pending approval
app.post('/:id/approve', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const approvalId = c.req.param('id');
    const body = await c.req.json();
    const { notes } = body;
    
    // Get the pending approval
    const approval = await c.env.DB.prepare(
      'SELECT * FROM pending_approvals WHERE id = ? AND company_id = ?'
    ).bind(approvalId, auth.companyId).first();
    
    if (!approval) {
      return c.json({ error: 'Approval not found' }, 404);
    }
    
    if ((approval as any).status !== 'pending') {
      return c.json({ error: 'Approval is not pending' }, 400);
    }
    
    const now = new Date().toISOString();
    
    // Update approval status
    await c.env.DB.prepare(`
      UPDATE pending_approvals 
      SET status = 'approved', approved_by = ?, approved_at = ?, notes = COALESCE(?, notes)
      WHERE id = ?
    `).bind(auth.userId, now, notes, approvalId).run();
    
    // Record in audit trail
    const historyId = generateUUID();
    await c.env.DB.prepare(`
      INSERT INTO transaction_status_history (
        id, company_id, transaction_type, transaction_id, from_status, to_status, changed_by, changed_at, reason
      ) VALUES (?, ?, ?, ?, 'pending', 'approved', ?, ?, ?)
    `).bind(
      historyId,
      auth.companyId,
      (approval as any).document_type,
      (approval as any).document_id,
      auth.userId,
      now,
      notes || 'Approved'
    ).run();
    
    return c.json({
      id: approvalId,
      status: 'approved',
      approved_at: now,
      message: 'Document approved successfully'
    });
  } catch (error) {
    console.error('Error approving:', error);
    return c.json({ error: 'Failed to approve' }, 500);
  }
});

// Reject a pending approval
app.post('/:id/reject', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const approvalId = c.req.param('id');
    const body = await c.req.json();
    const { reason } = body;
    
    if (!reason) {
      return c.json({ error: 'Rejection reason is required' }, 400);
    }
    
    // Get the pending approval
    const approval = await c.env.DB.prepare(
      'SELECT * FROM pending_approvals WHERE id = ? AND company_id = ?'
    ).bind(approvalId, auth.companyId).first();
    
    if (!approval) {
      return c.json({ error: 'Approval not found' }, 404);
    }
    
    if ((approval as any).status !== 'pending') {
      return c.json({ error: 'Approval is not pending' }, 400);
    }
    
    const now = new Date().toISOString();
    
    // Update approval status
    await c.env.DB.prepare(`
      UPDATE pending_approvals 
      SET status = 'rejected', approved_by = ?, approved_at = ?, rejection_reason = ?
      WHERE id = ?
    `).bind(auth.userId, now, reason, approvalId).run();
    
    // Record in audit trail
    const historyId = generateUUID();
    await c.env.DB.prepare(`
      INSERT INTO transaction_status_history (
        id, company_id, transaction_type, transaction_id, from_status, to_status, changed_by, changed_at, reason
      ) VALUES (?, ?, ?, ?, 'pending', 'rejected', ?, ?, ?)
    `).bind(
      historyId,
      auth.companyId,
      (approval as any).document_type,
      (approval as any).document_id,
      auth.userId,
      now,
      reason
    ).run();
    
    return c.json({
      id: approvalId,
      status: 'rejected',
      rejected_at: now,
      message: 'Document rejected'
    });
  } catch (error) {
    console.error('Error rejecting:', error);
    return c.json({ error: 'Failed to reject' }, 500);
  }
});

// Get approval history for a document
app.get('/history/:documentType/:documentId', async (c) => {
  const auth = await getAuthContext(c);
  if (!auth) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const documentType = c.req.param('documentType');
    const documentId = c.req.param('documentId');
    
    const result = await c.env.DB.prepare(`
      SELECT pa.*, u.full_name as approved_by_name, ru.full_name as requested_by_name
      FROM pending_approvals pa
      LEFT JOIN users u ON pa.approved_by = u.id
      LEFT JOIN users ru ON pa.requested_by = ru.id
      WHERE pa.company_id = ? AND pa.document_type = ? AND pa.document_id = ?
      ORDER BY pa.requested_at DESC
    `).bind(auth.companyId, documentType, documentId).all();
    
    return c.json({
      history: result.results || []
    });
  } catch (error) {
    console.error('Error loading approval history:', error);
    return c.json({ error: 'Failed to load approval history' }, 500);
  }
});

export default app;
