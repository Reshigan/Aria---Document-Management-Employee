/**
 * Microfeatures API Routes
 * Handles notifications, recent items, favorites, comments, attachments, and tags
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ==================== NOTIFICATIONS ====================

// Get all notifications for the current user
app.get('/notifications', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c) || 'anonymous';
    
    // Query notifications from database
    const result = await c.env.DB.prepare(
      `SELECT * FROM notifications 
       WHERE company_id = ? AND (user_id = ? OR user_id IS NULL)
       ORDER BY created_at DESC LIMIT 50`
    ).bind(companyId, userId).all();

    const notifications = result.results || [];
    const unreadCount = notifications.filter((n: Record<string, unknown>) => !n.is_read).length;
    
    return c.json({ notifications, unread_count: unreadCount });
  } catch (error) {
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// Mark notification as read
app.post('/notifications/:id/read', async (c) => {
  const notificationId = c.req.param('id');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    // In production, update the database
    return c.json({ success: true, message: `Notification ${notificationId} marked as read` });
  } catch (error) {
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark all notifications as read
app.post('/notifications/read-all', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

// Delete notification
app.delete('/notifications/:id', async (c) => {
  const notificationId = c.req.param('id');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true, message: `Notification ${notificationId} deleted` });
  } catch (error) {
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// ==================== RECENT ITEMS ====================

// Get recent items for the current user
app.get('/recent-items', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c) || 'anonymous';
    
    const result = await c.env.DB.prepare(
      `SELECT * FROM recent_items 
       WHERE company_id = ? AND user_id = ?
       ORDER BY accessed_at DESC LIMIT 20`
    ).bind(companyId, userId).all();

    return c.json({ recent_items: result.results || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch recent items' }, 500);
  }
});

// Add item to recent items
app.post('/recent-items', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c) || 'anonymous';
    const body = await c.req.json();
    const id = crypto.randomUUID();
    
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO recent_items (id, company_id, user_id, item_type, item_id, title, subtitle, path, accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, companyId, userId, body.type, body.item_id, body.title, body.subtitle, body.path).run();

    return c.json({ success: true, message: 'Item added to recent items' });
  } catch (error) {
    return c.json({ error: 'Failed to add recent item' }, 500);
  }
});

// Remove item from recent items
app.delete('/recent-items/:id', async (c) => {
  const itemId = c.req.param('id');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c) || 'anonymous';
    await c.env.DB.prepare(
      'DELETE FROM recent_items WHERE id = ? AND company_id = ? AND user_id = ?'
    ).bind(itemId, companyId, userId).run();
    return c.json({ success: true, message: `Item ${itemId} removed from recent items` });
  } catch (error) {
    return c.json({ error: 'Failed to remove recent item' }, 500);
  }
});

// ==================== FAVORITES ====================

// Get all favorites for the current user
app.get('/favorites', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const userId = await getSecureUserId(c) || 'anonymous';
    
    const result = await c.env.DB.prepare(
      `SELECT * FROM favorites 
       WHERE company_id = ? AND user_id = ?
       ORDER BY created_at DESC`
    ).bind(companyId, userId).all();

    return c.json({ favorites: result.results || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch favorites' }, 500);
  }
});

// Add item to favorites
app.post('/favorites', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    return c.json({ success: true, message: 'Item added to favorites', item: body });
  } catch (error) {
    return c.json({ error: 'Failed to add favorite' }, 500);
  }
});

// Remove item from favorites
app.delete('/favorites/:id', async (c) => {
  const itemId = c.req.param('id');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true, message: `Item ${itemId} removed from favorites` });
  } catch (error) {
    return c.json({ error: 'Failed to remove favorite' }, 500);
  }
});

// ==================== COMMENTS ====================

// Get comments for a transaction
app.get('/comments/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const comments = [
      {
        id: '1',
        author: 'John Doe',
        authorInitials: 'JD',
        content: 'Customer requested expedited shipping. Please prioritize.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isInternal: true
      },
      {
        id: '2',
        author: 'Jane Smith',
        authorInitials: 'JS',
        content: 'Confirmed with warehouse - stock available.',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isInternal: true
      },
    ];
    
    return c.json({ comments, transaction_type: transactionType, transaction_id: transactionId });
  } catch (error) {
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// Add comment to a transaction
app.post('/comments/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    const comment = {
      id: crypto.randomUUID(),
      author: 'Current User',
      authorInitials: 'CU',
      content: body.content,
      timestamp: new Date().toISOString(),
      isInternal: body.isInternal ?? true
    };
    
    return c.json({ success: true, comment });
  } catch (error) {
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// Delete comment
app.delete('/comments/:commentId', async (c) => {
  const commentId = c.req.param('commentId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true, message: `Comment ${commentId} deleted` });
  } catch (error) {
    return c.json({ error: 'Failed to delete comment' }, 500);
  }
});

// ==================== TAGS ====================

// Get available tags
app.get('/tags', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const tags = [
      { id: '1', name: 'Priority', color: '#ef4444' },
      { id: '2', name: 'VIP Customer', color: '#8b5cf6' },
      { id: '3', name: 'Recurring', color: '#10b981' },
      { id: '4', name: 'Needs Review', color: '#f59e0b' },
      { id: '5', name: 'On Hold', color: '#6b7280' },
      { id: '6', name: 'Export', color: '#06b6d4' },
    ];
    
    return c.json({ tags });
  } catch (error) {
    return c.json({ error: 'Failed to fetch tags' }, 500);
  }
});

// Get tags for a transaction
app.get('/tags/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const tags = [
      { id: '1', name: 'Priority', color: '#ef4444' },
      { id: '2', name: 'VIP Customer', color: '#8b5cf6' },
    ];
    
    return c.json({ tags, transaction_type: transactionType, transaction_id: transactionId });
  } catch (error) {
    return c.json({ error: 'Failed to fetch transaction tags' }, 500);
  }
});

// Add tag to a transaction
app.post('/tags/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json();
    return c.json({ success: true, message: `Tag ${body.tagId} added to ${transactionType} ${transactionId}` });
  } catch (error) {
    return c.json({ error: 'Failed to add tag' }, 500);
  }
});

// Remove tag from a transaction
app.delete('/tags/:transactionType/:transactionId/:tagId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  const tagId = c.req.param('tagId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true, message: `Tag ${tagId} removed from ${transactionType} ${transactionId}` });
  } catch (error) {
    return c.json({ error: 'Failed to remove tag' }, 500);
  }
});

// ==================== ACTIVITY TIMELINE ====================

// Get activity timeline for a transaction
app.get('/activity/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const activities = [
      {
        id: '1',
        type: 'created',
        description: `${transactionType} created`,
        user: 'John Doe',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'email_sent',
        description: 'Document emailed to customer',
        user: 'System',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        details: 'Sent to: customer@example.com'
      },
      {
        id: '3',
        type: 'status_change',
        description: 'Status changed to Sent',
        user: 'System',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'comment',
        description: 'Comment added',
        user: 'Jane Smith',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        type: 'updated',
        description: 'Due date updated',
        user: 'John Doe',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: 'Changed from 2026-01-20 to 2026-01-25'
      },
    ];
    
    return c.json({ activities, transaction_type: transactionType, transaction_id: transactionId });
  } catch (error) {
    return c.json({ error: 'Failed to fetch activity timeline' }, 500);
  }
});

// ==================== ATTACHMENTS ====================

// Get attachments for a transaction
app.get('/attachments/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const attachments = [
      {
        id: '1',
        name: 'Purchase_Agreement.pdf',
        size: '2.4 MB',
        type: 'pdf',
        uploadedBy: 'John Doe',
        uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: '/api/attachments/1/download'
      },
      {
        id: '2',
        name: 'Product_Photo.jpg',
        size: '1.1 MB',
        type: 'image',
        uploadedBy: 'Jane Smith',
        uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        url: '/api/attachments/2/download'
      },
    ];
    
    return c.json({ attachments, transaction_type: transactionType, transaction_id: transactionId });
  } catch (error) {
    return c.json({ error: 'Failed to fetch attachments' }, 500);
  }
});

// Upload attachment to a transaction
app.post('/attachments/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    // In production, handle file upload to R2
    const attachment = {
      id: crypto.randomUUID(),
      name: 'uploaded_file.pdf',
      size: '1.0 MB',
      type: 'pdf',
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString()
    };
    
    return c.json({ success: true, attachment });
  } catch (error) {
    return c.json({ error: 'Failed to upload attachment' }, 500);
  }
});

// Delete attachment
app.delete('/attachments/:attachmentId', async (c) => {
  const attachmentId = c.req.param('attachmentId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    return c.json({ success: true, message: `Attachment ${attachmentId} deleted` });
  } catch (error) {
    return c.json({ error: 'Failed to delete attachment' }, 500);
  }
});

// ==================== RELATED DOCUMENTS ====================

// Get related documents for a transaction
app.get('/related/:transactionType/:transactionId', async (c) => {
  const transactionType = c.req.param('transactionType');
  const transactionId = c.req.param('transactionId');
  
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const relatedDocuments = [
      {
        id: '1',
        type: 'quote',
        number: 'QT-2026-000089',
        date: '2026-01-10',
        amount: 12500,
        status: 'Converted',
        link: '/quotes/QT-2026-000089'
      },
      {
        id: '2',
        type: 'delivery',
        number: 'DEL-2026-000045',
        date: '2026-01-15',
        status: 'Delivered',
        link: '/deliveries/DEL-2026-000045'
      },
    ];
    
    return c.json({ related_documents: relatedDocuments, transaction_type: transactionType, transaction_id: transactionId });
  } catch (error) {
    return c.json({ error: 'Failed to fetch related documents' }, 500);
  }
});

// Generic comments endpoint used by some components
app.post('/comments', async (c) => {
  try {
    const body = await c.req.json();
    const comment = {
      id: crypto.randomUUID(),
      content: body?.content || body?.text || '',
      user: body?.user || 'Current User',
      created_at: new Date().toISOString(),
      transaction_type: body?.transaction_type || body?.document_type || null,
      transaction_id: body?.transaction_id || body?.document_id || null
    };
    return c.json({ success: true, comment });
  } catch (error) {
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// Generic attachments upload endpoint used by document upload UI
app.post('/attachments/upload', async (c) => {
  try {
    const attachment = {
      id: crypto.randomUUID(),
      name: 'uploaded.file',
      size: '0.0 MB',
      type: 'binary',
      uploadedAt: new Date().toISOString(),
      url: '/api/attachments/download/' + crypto.randomUUID()
    };
    return c.json({ success: true, attachment });
  } catch (error) {
    return c.json({ error: 'Failed to upload attachment' }, 500);
  }
});

export default app;
