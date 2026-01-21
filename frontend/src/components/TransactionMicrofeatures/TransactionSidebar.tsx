import React, { useState } from 'react';
import { 
  Paperclip, MessageSquare, Clock, Tag, Link2, Mail, 
  Printer, Copy, XCircle, MoreHorizontal, ChevronDown, ChevronUp,
  Upload, Send, Plus, X, Check, Edit2, Trash2, Download,
  FileText, Image, File, AlertCircle
} from 'lucide-react';
import './TransactionSidebar.css';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'doc' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  url?: string;
}

interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  content: string;
  timestamp: string;
  isInternal: boolean;
}

interface ActivityItem {
  id: string;
  type: 'created' | 'updated' | 'status_change' | 'email_sent' | 'comment' | 'attachment' | 'approval';
  description: string;
  user: string;
  timestamp: string;
  details?: string;
}

interface RelatedDocument {
  id: string;
  type: 'quote' | 'invoice' | 'po' | 'delivery' | 'payment' | 'credit_note';
  number: string;
  date: string;
  amount?: number;
  status: string;
  link: string;
}

interface TransactionTag {
  id: string;
  name: string;
  color: string;
}

interface TransactionSidebarProps {
  transactionId: string;
  transactionType: string;
  attachments?: Attachment[];
  comments?: Comment[];
  activities?: ActivityItem[];
  relatedDocuments?: RelatedDocument[];
  tags?: TransactionTag[];
  emailHistory?: { id: string; subject: string; to: string; sentAt: string; status: string }[];
  onAddAttachment?: (file: File) => void;
  onAddComment?: (comment: string, isInternal: boolean) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tagId: string) => void;
  onPrint?: () => void;
  onDuplicate?: () => void;
  onVoid?: () => void;
  onSendEmail?: () => void;
}

const mockAttachments: Attachment[] = [
  { id: '1', name: 'Purchase_Agreement.pdf', size: '2.4 MB', type: 'pdf', uploadedBy: 'John Doe', uploadedAt: '2 hours ago' },
  { id: '2', name: 'Product_Photo.jpg', size: '1.1 MB', type: 'image', uploadedBy: 'Jane Smith', uploadedAt: '1 day ago' },
];

const mockComments: Comment[] = [
  { id: '1', author: 'John Doe', authorInitials: 'JD', content: 'Customer requested expedited shipping. Please prioritize.', timestamp: '2 hours ago', isInternal: true },
  { id: '2', author: 'Jane Smith', authorInitials: 'JS', content: 'Confirmed with warehouse - stock available.', timestamp: '1 day ago', isInternal: true },
];

const mockActivities: ActivityItem[] = [
  { id: '1', type: 'created', description: 'Invoice created', user: 'John Doe', timestamp: '3 days ago' },
  { id: '2', type: 'email_sent', description: 'Invoice emailed to customer', user: 'System', timestamp: '3 days ago', details: 'Sent to: customer@example.com' },
  { id: '3', type: 'status_change', description: 'Status changed to Sent', user: 'System', timestamp: '3 days ago' },
  { id: '4', type: 'comment', description: 'Comment added', user: 'Jane Smith', timestamp: '2 days ago' },
  { id: '5', type: 'updated', description: 'Due date updated', user: 'John Doe', timestamp: '1 day ago', details: 'Changed from 2026-01-20 to 2026-01-25' },
];

const mockRelatedDocs: RelatedDocument[] = [
  { id: '1', type: 'quote', number: 'QT-2026-000089', date: '2026-01-10', amount: 12500, status: 'Converted', link: '/quotes/QT-2026-000089' },
  { id: '2', type: 'delivery', number: 'DEL-2026-000045', date: '2026-01-15', status: 'Delivered', link: '/deliveries/DEL-2026-000045' },
];

const mockTags: TransactionTag[] = [
  { id: '1', name: 'Priority', color: '#ef4444' },
  { id: '2', name: 'VIP Customer', color: '#8b5cf6' },
];

const availableTags = [
  { name: 'Priority', color: '#ef4444' },
  { name: 'VIP Customer', color: '#8b5cf6' },
  { name: 'Recurring', color: '#10b981' },
  { name: 'Needs Review', color: '#f59e0b' },
  { name: 'On Hold', color: '#6b7280' },
  { name: 'Export', color: '#06b6d4' },
];

export const TransactionSidebar: React.FC<TransactionSidebarProps> = ({
  transactionId,
  transactionType,
  attachments = mockAttachments,
  comments = mockComments,
  activities = mockActivities,
  relatedDocuments = mockRelatedDocs,
  tags = mockTags,
  onAddAttachment,
  onAddComment,
  onAddTag,
  onRemoveTag,
  onPrint,
  onDuplicate,
  onVoid,
  onSendEmail,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>('comments');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [localTags, setLocalTags] = useState(tags);
  const [localComments, setLocalComments] = useState(comments);
  const [localAttachments, setLocalAttachments] = useState(attachments);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Current User',
      authorInitials: 'CU',
      content: newComment,
      timestamp: 'Just now',
      isInternal: isInternalComment,
    };
    
    setLocalComments([comment, ...localComments]);
    setNewComment('');
    onAddComment?.(newComment, isInternalComment);
  };

  const handleAddTag = (tag: { name: string; color: string }) => {
    if (localTags.find(t => t.name === tag.name)) return;
    
    const newTag: TransactionTag = {
      id: Date.now().toString(),
      ...tag,
    };
    
    setLocalTags([...localTags, newTag]);
    setShowTagPicker(false);
    onAddTag?.(tag.name);
  };

  const handleRemoveTag = (tagId: string) => {
    setLocalTags(localTags.filter(t => t.id !== tagId));
    onRemoveTag?.(tagId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const attachment: Attachment = {
      id: Date.now().toString(),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other',
      uploadedBy: 'Current User',
      uploadedAt: 'Just now',
    };
    
    setLocalAttachments([attachment, ...localAttachments]);
    onAddAttachment?.(file);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText size={16} className="text-red-500" />;
      case 'image':
        return <Image size={16} className="text-blue-500" />;
      case 'doc':
        return <FileText size={16} className="text-blue-600" />;
      default:
        return <File size={16} className="text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Plus size={14} />;
      case 'updated':
        return <Edit2 size={14} />;
      case 'status_change':
        return <Check size={14} />;
      case 'email_sent':
        return <Mail size={14} />;
      case 'comment':
        return <MessageSquare size={14} />;
      case 'attachment':
        return <Paperclip size={14} />;
      case 'approval':
        return <Check size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case 'quote':
        return '#6366f1';
      case 'invoice':
        return '#10b981';
      case 'po':
        return '#f59e0b';
      case 'delivery':
        return '#06b6d4';
      case 'payment':
        return '#8b5cf6';
      case 'credit_note':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="transaction-sidebar">
      {/* Quick Actions */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={onSendEmail} title="Send Email">
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button className="quick-action-btn" onClick={onPrint} title="Print">
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button className="quick-action-btn" onClick={onDuplicate} title="Duplicate">
            <Copy size={16} />
            <span>Duplicate</span>
          </button>
          <button className="quick-action-btn danger" onClick={onVoid} title="Void">
            <XCircle size={16} />
            <span>Void</span>
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <h3><Tag size={14} /> Tags</h3>
          <button className="add-btn" onClick={() => setShowTagPicker(!showTagPicker)}>
            <Plus size={14} />
          </button>
        </div>
        <div className="tags-container">
          {localTags.map(tag => (
            <span 
              key={tag.id} 
              className="tag-badge"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
            >
              {tag.name}
              <button onClick={() => handleRemoveTag(tag.id)} className="tag-remove">
                <X size={12} />
              </button>
            </span>
          ))}
          {localTags.length === 0 && <span className="no-items">No tags</span>}
        </div>
        {showTagPicker && (
          <div className="tag-picker">
            {availableTags.filter(t => !localTags.find(lt => lt.name === t.name)).map(tag => (
              <button 
                key={tag.name}
                className="tag-option"
                onClick={() => handleAddTag(tag)}
                style={{ backgroundColor: `${tag.color}10`, color: tag.color }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="sidebar-section">
        <div 
          className="sidebar-section-header clickable"
          onClick={() => toggleSection('attachments')}
        >
          <h3><Paperclip size={14} /> Attachments ({localAttachments.length})</h3>
          {activeSection === 'attachments' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {activeSection === 'attachments' && (
          <div className="section-content">
            <label className="upload-area">
              <input type="file" onChange={handleFileUpload} hidden />
              <Upload size={20} />
              <span>Drop files or click to upload</span>
            </label>
            <div className="attachments-list">
              {localAttachments.map(attachment => (
                <div key={attachment.id} className="attachment-item">
                  {getFileIcon(attachment.type)}
                  <div className="attachment-info">
                    <span className="attachment-name">{attachment.name}</span>
                    <span className="attachment-meta">{attachment.size} • {attachment.uploadedAt}</span>
                  </div>
                  <button className="attachment-download" title="Download">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="sidebar-section">
        <div 
          className="sidebar-section-header clickable"
          onClick={() => toggleSection('comments')}
        >
          <h3><MessageSquare size={14} /> Comments ({localComments.length})</h3>
          {activeSection === 'comments' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {activeSection === 'comments' && (
          <div className="section-content">
            <div className="comment-input-area">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
              />
              <div className="comment-input-actions">
                <label className="internal-toggle">
                  <input 
                    type="checkbox" 
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                  />
                  <span>Internal only</span>
                </label>
                <button 
                  className="send-comment-btn"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
            <div className="comments-list">
              {localComments.map(comment => (
                <div key={comment.id} className={`comment-item ${comment.isInternal ? 'internal' : ''}`}>
                  <div className="comment-avatar">{comment.authorInitials}</div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">{comment.timestamp}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                    {comment.isInternal && <span className="internal-badge">Internal</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="sidebar-section">
        <div 
          className="sidebar-section-header clickable"
          onClick={() => toggleSection('activity')}
        >
          <h3><Clock size={14} /> Activity</h3>
          {activeSection === 'activity' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {activeSection === 'activity' && (
          <div className="section-content">
            <div className="activity-timeline">
              {activities.map((activity, index) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <span className="activity-description">{activity.description}</span>
                    {activity.details && <span className="activity-details">{activity.details}</span>}
                    <span className="activity-meta">{activity.user} • {activity.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Documents */}
      <div className="sidebar-section">
        <div 
          className="sidebar-section-header clickable"
          onClick={() => toggleSection('related')}
        >
          <h3><Link2 size={14} /> Related Documents ({relatedDocuments.length})</h3>
          {activeSection === 'related' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {activeSection === 'related' && (
          <div className="section-content">
            <div className="related-docs-list">
              {relatedDocuments.map(doc => (
                <a key={doc.id} href={doc.link} className="related-doc-item">
                  <div 
                    className="related-doc-type"
                    style={{ backgroundColor: `${getDocTypeColor(doc.type)}15`, color: getDocTypeColor(doc.type) }}
                  >
                    {doc.type.toUpperCase()}
                  </div>
                  <div className="related-doc-info">
                    <span className="related-doc-number">{doc.number}</span>
                    <span className="related-doc-meta">
                      {doc.date} {doc.amount && `• R ${doc.amount.toLocaleString()}`}
                    </span>
                  </div>
                  <span className={`related-doc-status status-${doc.status.toLowerCase().replace(' ', '-')}`}>
                    {doc.status}
                  </span>
                </a>
              ))}
              {relatedDocuments.length === 0 && <span className="no-items">No related documents</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionSidebar;
