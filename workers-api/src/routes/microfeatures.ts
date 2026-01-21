/**
 * Microfeatures API Routes
 * Handles notifications, recent items, favorites, comments, attachments, and tags
 */

import { Hono } from 'hono';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// ==================== NOTIFICATIONS ====================

// Get all notifications for the current user
app.get('/notifications', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'demo-company-001';
  const userId = c.req.header('X-User-ID') || 'demo-user';
  
  try {
    // Return mock notifications for now - in production, these would come from the database
    const notifications = [
      {
        id: '1',
        type: 'alert',
        title: 'Overdue Invoice',
        message: 'Invoice INV-2026-000045 is 15 days overdue (R 12,500)',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        read: false,
        link: '/ar/invoices/INV-2026-000045',
        category: 'invoice'
      },
      {
        id: '2',
        type: 'warning',
        title: 'Low Stock Alert',
        message: 'Widget A is below reorder point (5 units remaining)',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        read: false,
        link: '/inventory/items',
        category: 'inventory'
      },
      {
        id: '3',
        type: 'bot',
        title: 'Bot Execution Complete',
        message: 'AR Collections Bot processed 12 invoices, sent 5 reminders',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        link: '/agents',
        category: 'bot'
      },
      {
        id: '4',
        type: 'success',
        title: 'Payment Received',
        message: 'Payment of R 8,750 received from ABC Company',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        read: true,
        link: '/ar/receipts',
        category: 'payment'
      },
      {
        id: '5',
        type: 'info',
        title: 'Approval Required',
        message: 'Purchase Order PO-2026-000089 requires your approval',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read: true,
        link: '/procurement/purchase-orders/PO-2026-000089',
        category: 'approval'
      },
    ];
    
    return c.json({ notifications, unread_count: notifications.filter(n => !n.read).length });
  } catch (error) {
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

// Mark notification as read
app.post('/notifications/:id/read', async (c) => {
  const notificationId = c.req.param('id');
  
  try {
    // In production, update the database
    return c.json({ success: true, message: `Notification ${notificationId} marked as read` });
  } catch (error) {
    return c.json({ error: 'Failed to mark notification as read' }, 500);
  }
});

// Mark all notifications as read
app.post('/notifications/read-all', async (c) => {
  try {
    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return c.json({ error: 'Failed to mark all notifications as read' }, 500);
  }
});

// Delete notification
app.delete('/notifications/:id', async (c) => {
  const notificationId = c.req.param('id');
  
  try {
    return c.json({ success: true, message: `Notification ${notificationId} deleted` });
  } catch (error) {
    return c.json({ error: 'Failed to delete notification' }, 500);
  }
});

// ==================== RECENT ITEMS ====================

// Get recent items for the current user
app.get('/recent-items', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'demo-company-001';
  const userId = c.req.header('X-User-ID') || 'demo-user';
  
  try {
    const recentItems = [
      {
        id: '1',
        type: 'invoice',
        title: 'INV-2026-000089',
        subtitle: 'ABC Company - R 12,500',
        path: '/ar/invoices/INV-2026-000089',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isFavorite: false
      },
      {
        id: '2',
        type: 'customer',
        title: 'XYZ Corporation',
        subtitle: 'Customer since 2024',
        path: '/crm/customers/xyz-corp',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        isFavorite: true
      },
      {
        id: '3',
        type: 'quote',
        title: 'QT-2026-000156',
        subtitle: 'Tech Solutions - R 45,000',
        path: '/quotes/QT-2026-000156',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        isFavorite: false
      },
      {
        id: '4',
        type: 'po',
        title: 'PO-2026-000078',
        subtitle: 'Office Supplies Ltd',
        path: '/procurement/purchase-orders/PO-2026-000078',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isFavorite: false
      },
      {
        id: '5',
        type: 'product',
        title: 'Widget Pro X',
        subtitle: 'SKU: WPX-001 - 150 in stock',
        path: '/inventory/items/widget-pro-x',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        isFavorite: true
      },
    ];
    
    return c.json({ recent_items: recentItems });
  } catch (error) {
    return c.json({ error: 'Failed to fetch recent items' }, 500);
  }
});

// Add item to recent items
app.post('/recent-items', async (c) => {
  try {
    const body = await c.req.json();
    // In production, save to database
    return c.json({ success: true, message: 'Item added to recent items' });
  } catch (error) {
    return c.json({ error: 'Failed to add recent item' }, 500);
  }
});

// Remove item from recent items
app.delete('/recent-items/:id', async (c) => {
  const itemId = c.req.param('id');
  
  try {
    return c.json({ success: true, message: `Item ${itemId} removed from recent items` });
  } catch (error) {
    return c.json({ error: 'Failed to remove recent item' }, 500);
  }
});

// ==================== FAVORITES ====================

// Get all favorites for the current user
app.get('/favorites', async (c) => {
  const companyId = c.req.header('X-Company-ID') || 'demo-company-001';
  const userId = c.req.header('X-User-ID') || 'demo-user';
  
  try {
    const favorites = [
      {
        id: '1',
        type: 'customer',
        title: 'XYZ Corporation',
        subtitle: 'Customer since 2024',
        path: '/crm/customers/xyz-corp',
        addedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'product',
        title: 'Widget Pro X',
        subtitle: 'SKU: WPX-001',
        path: '/inventory/items/widget-pro-x',
        addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
    ];
    
    return c.json({ favorites });
  } catch (error) {
    return c.json({ error: 'Failed to fetch favorites' }, 500);
  }
});

// Add item to favorites
app.post('/favorites', async (c) => {
  try {
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
    return c.json({ success: true, message: `Comment ${commentId} deleted` });
  } catch (error) {
    return c.json({ error: 'Failed to delete comment' }, 500);
  }
});

// ==================== TAGS ====================

// Get available tags
app.get('/tags', async (c) => {
  try {
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

export default app;
