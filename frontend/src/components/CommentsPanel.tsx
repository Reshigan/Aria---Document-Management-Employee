'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Input,
  Form,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Divider,
  Tooltip,
  Badge,
  Switch,
  Empty,
  Spin
} from 'antd';
import {
  CommentOutlined,
  UserOutlined,
  SendOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReplyArrowIcon,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { commentsAPI } from '@/lib/api';
import type { Comment, CommentCreate, CommentUpdate } from '@/types';

dayjs.extend(relativeTime);

const { TextArea } = Input;
const { Text, Title } = Typography;

interface CommentsPanelProps {
  documentId: number;
  className?: string;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: number) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: number) => void;
  onResolve: (commentId: number, resolved: boolean) => void;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  level = 0
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleReply = async (values: { content: string }) => {
    setLoading(true);
    try {
      const replyData: CommentCreate = {
        document_id: comment.document_id,
        parent_id: comment.id,
        content: values.content
      };
      
      await commentsAPI.createComment(comment.document_id, replyData);
      message.success('Reply added successfully');
      replyForm.resetFields();
      setShowReplyForm(false);
      // Refresh comments would be handled by parent component
    } catch (error: any) {
      console.error('Failed to add reply:', error);
      message.error(error.response?.data?.detail || 'Failed to add reply');
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    <Button
      key="reply"
      type="text"
      size="small"
      icon={<CommentOutlined />}
      onClick={() => setShowReplyForm(!showReplyForm)}
    >
      Reply
    </Button>,
    <Button
      key="edit"
      type="text"
      size="small"
      icon={<EditOutlined />}
      onClick={() => onEdit(comment)}
    >
      Edit
    </Button>,
    <Tooltip key="resolve" title={comment.is_resolved ? 'Mark as unresolved' : 'Mark as resolved'}>
      <Button
        type="text"
        size="small"
        icon={comment.is_resolved ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
        onClick={() => onResolve(comment.id, !comment.is_resolved)}
      >
        {comment.is_resolved ? 'Unresolve' : 'Resolve'}
      </Button>
    </Tooltip>,
    <Popconfirm
      key="delete"
      title="Are you sure you want to delete this comment?"
      onConfirm={() => onDelete(comment.id)}
      okText="Yes"
      cancelText="No"
    >
      <Button
        type="text"
        size="small"
        danger
        icon={<DeleteOutlined />}
      >
        Delete
      </Button>
    </Popconfirm>
  ];

  return (
    <div style={{ marginLeft: level * 24 }}>
      <List.Item
        actions={actions}
        className={comment.is_resolved ? 'opacity-60' : ''}
      >
        <List.Item.Meta
          avatar={<Avatar icon={<UserOutlined />} />}
          title={
            <Space>
              <Text strong>{comment.author_name || `User ${comment.author}`}</Text>
              {comment.is_resolved && (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Resolved
                </Tag>
              )}
              <Text type="secondary" className="text-xs">
                <ClockCircleOutlined /> {dayjs(comment.created_at).fromNow()}
              </Text>
            </Space>
          }
          description={
            <div>
              <Text>{comment.content}</Text>
              {comment.page_number && (
                <div className="mt-2">
                  <Tag color="blue">Page {comment.page_number}</Tag>
                  {comment.x_position && comment.y_position && (
                    <Tag color="purple">
                      Position: ({comment.x_position}, {comment.y_position})
                    </Tag>
                  )}
                </div>
              )}
            </div>
          }
        />
      </List.Item>

      {showReplyForm && (
        <div style={{ marginLeft: 48, marginTop: 8, marginBottom: 16 }}>
          <Form form={replyForm} onFinish={handleReply}>
            <Form.Item
              name="content"
              rules={[{ required: true, message: 'Please enter your reply' }]}
            >
              <TextArea
                rows={3}
                placeholder="Write your reply..."
                autoFocus
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SendOutlined />}
                  size="small"
                >
                  Reply
                </Button>
                <Button size="small" onClick={() => setShowReplyForm(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentsPanel: React.FC<CommentsPanelProps> = ({ documentId, className }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [commentForm] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadComments();
  }, [documentId, showResolved]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const commentsData = await commentsAPI.getDocumentComments(
        documentId,
        1,
        50,
        showResolved
      );
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
      message.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (values: { content: string; page_number?: number }) => {
    setLoading(true);
    try {
      const commentData: CommentCreate = {
        document_id: documentId,
        content: values.content,
        page_number: values.page_number
      };
      
      await commentsAPI.createComment(documentId, commentData);
      message.success('Comment added successfully');
      commentForm.resetFields();
      loadComments();
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      message.error(error.response?.data?.detail || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = async (values: { content: string }) => {
    if (!editingComment) return;
    
    try {
      const updateData: CommentUpdate = {
        content: values.content
      };
      
      await commentsAPI.updateComment(editingComment.id, updateData);
      message.success('Comment updated successfully');
      setEditingComment(null);
      editForm.resetFields();
      loadComments();
    } catch (error: any) {
      console.error('Failed to update comment:', error);
      message.error(error.response?.data?.detail || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await commentsAPI.deleteComment(commentId);
      message.success('Comment deleted successfully');
      loadComments();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      message.error(error.response?.data?.detail || 'Failed to delete comment');
    }
  };

  const handleResolveComment = async (commentId: number, resolved: boolean) => {
    try {
      if (resolved) {
        await commentsAPI.resolveComment(commentId);
        message.success('Comment resolved');
      } else {
        await commentsAPI.unresolveComment(commentId);
        message.success('Comment unresolved');
      }
      loadComments();
    } catch (error: any) {
      console.error('Failed to update comment status:', error);
      message.error(error.response?.data?.detail || 'Failed to update comment status');
    }
  };

  const handleReply = (parentId: number) => {
    // This would typically scroll to the reply form or open a modal
    console.log('Reply to comment:', parentId);
  };

  const handleEdit = (comment: Comment) => {
    setEditingComment(comment);
    editForm.setFieldsValue({ content: comment.content });
  };

  const unresolvedCount = comments.filter(c => !c.is_resolved).length;
  const totalCount = comments.length;

  return (
    <div className={className}>
      <Card
        title={
          <Space>
            <CommentOutlined />
            <span>Comments</span>
            <Badge count={unresolvedCount} showZero />
            <Text type="secondary">({totalCount} total)</Text>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">Show resolved:</Text>
            <Switch
              checked={showResolved}
              onChange={setShowResolved}
              size="small"
            />
          </Space>
        }
      >
        {/* Add Comment Form */}
        <Form form={commentForm} onFinish={handleAddComment} className="mb-4">
          <Form.Item
            name="content"
            rules={[{ required: true, message: 'Please enter your comment' }]}
          >
            <TextArea
              rows={3}
              placeholder="Add a comment..."
              showCount
              maxLength={1000}
            />
          </Form.Item>
          <Form.Item name="page_number">
            <Input
              type="number"
              placeholder="Page number (optional)"
              style={{ width: 150 }}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SendOutlined />}
            >
              Add Comment
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        {/* Edit Comment Modal */}
        {editingComment && (
          <Card size="small" className="mb-4" title="Edit Comment">
            <Form form={editForm} onFinish={handleEditComment}>
              <Form.Item
                name="content"
                rules={[{ required: true, message: 'Please enter your comment' }]}
              >
                <TextArea
                  rows={3}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                    Update Comment
                  </Button>
                  <Button onClick={() => setEditingComment(null)}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* Comments List */}
        <Spin spinning={loading}>
          {comments.length > 0 ? (
            <List
              dataSource={comments}
              renderItem={(comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDeleteComment}
                  onResolve={handleResolveComment}
                />
              )}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No comments yet"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default CommentsPanel;