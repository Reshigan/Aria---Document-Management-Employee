import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, Activity } from 'lucide-react';

interface Comment {
  id: string;
  user_email: string;
  comment_text: string;
  created_at: string;
}

interface ActivityItem {
  type: 'comment' | 'action';
  timestamp: string;
  user_email: string;
  action?: string;
  resource?: string;
  details?: any;
  comment_text?: string;
}

interface CommentSectionProps {
  documentType: string;
  documentId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  documentType,
  documentId
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  useEffect(() => {
    loadComments();
    loadActivity();
  }, [documentType, documentId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/comments/${documentType}/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const response = await fetch(
        `/api/activity/${documentType}/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setActivity(data.activity || []);
      }
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_type: documentType,
          document_id: documentId,
          comment_text: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
        await loadComments();
        await loadActivity();
      } else {
        throw new Error('Failed to post comment');
      }
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await loadComments();
        await loadActivity();
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete comment');
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (item: ActivityItem) => {
    if (item.type === 'comment') return <MessageSquare size={16} />;
    return <Activity size={16} />;
  };

  const getActivityColor = (item: ActivityItem) => {
    if (item.type === 'comment') return 'text-blue-600';
    if (item.action?.includes('post')) return 'text-green-600';
    if (item.action?.includes('delete') || item.action?.includes('cancel')) return 'text-red-600';
    if (item.action?.includes('approve')) return 'text-green-600';
    if (item.action?.includes('reject')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={18} />
            <span>Comments ({comments.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'activity'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity size={18} />
            <span>Activity ({activity.length})</span>
          </div>
        </button>
      </div>

      {activeTab === 'comments' ? (
        <div className="space-y-4">
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send size={16} />
              <span>{submitting ? 'Posting...' : 'Post'}</span>
            </button>
          </form>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare size={48} className="mx-auto mb-2 text-gray-400" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{comment.user_email}</span>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.comment_text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {activity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity size={48} className="mx-auto mb-2 text-gray-400" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                >
                  <div className={`mt-1 ${getActivityColor(item)}`}>
                    {getActivityIcon(item)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.user_email}</span>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    {item.type === 'comment' ? (
                      <p className="text-gray-700">{item.comment_text}</p>
                    ) : (
                      <p className="text-gray-700">
                        {item.action} {item.resource}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
