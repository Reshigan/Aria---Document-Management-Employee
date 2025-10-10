'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, List, Tag, Button, Space, Progress, Tooltip, message, 
  Badge, Typography, Empty, Spin
} from 'antd';
import { 
  CheckOutlined, CloseOutlined, BulbOutlined, RobotOutlined,
  EyeOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import { enhancedTagsAPI } from '@/lib/api';
import type { TagSuggestion, EnhancedTag } from '@/types';

const { Text } = Typography;

interface TagSuggestionsProps {
  documentId: number;
  onSuggestionAccepted?: (suggestion: TagSuggestion) => void;
  onSuggestionRejected?: (suggestion: TagSuggestion) => void;
}

const TagSuggestions: React.FC<TagSuggestionsProps> = ({
  documentId,
  onSuggestionAccepted,
  onSuggestionRejected
}) => {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [tags, setTags] = useState<EnhancedTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (documentId) {
      loadSuggestions();
      loadTags();
    }
  }, [documentId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await enhancedTagsAPI.getSuggestions(documentId);
      setSuggestions(response);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      message.error('Failed to load tag suggestions');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await enhancedTagsAPI.list();
      setTags(response);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const getTagById = (tagId: number): EnhancedTag | undefined => {
    return tags.find(tag => tag.id === tagId);
  };

  const handleAcceptSuggestion = async (suggestion: TagSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    
    try {
      await enhancedTagsAPI.acceptSuggestion(suggestion.id);
      message.success('Tag suggestion accepted');
      
      // Update the suggestion in the list
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestion.id 
            ? { ...s, is_accepted: true, reviewed_at: new Date().toISOString() }
            : s
        )
      );
      
      onSuggestionAccepted?.(suggestion);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      message.error('Failed to accept suggestion');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
    }
  };

  const handleRejectSuggestion = async (suggestion: TagSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    
    try {
      await enhancedTagsAPI.rejectSuggestion(suggestion.id);
      message.success('Tag suggestion rejected');
      
      // Update the suggestion in the list
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestion.id 
            ? { ...s, is_accepted: false, reviewed_at: new Date().toISOString() }
            : s
        )
      );
      
      onSuggestionRejected?.(suggestion);
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      message.error('Failed to reject suggestion');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ml_model':
        return <RobotOutlined style={{ color: '#1890ff' }} />;
      case 'content_analysis':
        return <EyeOutlined style={{ color: '#52c41a' }} />;
      case 'user_pattern':
        return <BulbOutlined style={{ color: '#faad14' }} />;
      case 'rule_based':
        return <ThunderboltOutlined style={{ color: '#722ed1' }} />;
      default:
        return <BulbOutlined />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'ml_model':
        return 'blue';
      case 'content_analysis':
        return 'green';
      case 'user_pattern':
        return 'orange';
      case 'rule_based':
        return 'purple';
      default:
        return 'default';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#52c41a';
    if (confidence >= 0.6) return '#faad14';
    return '#ff4d4f';
  };

  const pendingSuggestions = suggestions.filter(s => s.is_accepted === undefined);
  const reviewedSuggestions = suggestions.filter(s => s.is_accepted !== undefined);

  if (loading) {
    return (
      <Card title={<Space><BulbOutlined />Tag Suggestions</Space>}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>Loading suggestions...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <BulbOutlined />
          Tag Suggestions
          {pendingSuggestions.length > 0 && (
            <Badge count={pendingSuggestions.length} />
          )}
        </Space>
      }
    >
      {suggestions.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No tag suggestions available"
        />
      ) : (
        <div>
          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ marginBottom: '12px', display: 'block' }}>
                Pending Suggestions ({pendingSuggestions.length})
              </Text>
              <List
                dataSource={pendingSuggestions}
                renderItem={(suggestion) => {
                  const tag = getTagById(suggestion.tag_id);
                  const isProcessing = processingIds.has(suggestion.id);
                  
                  return (
                    <List.Item
                      actions={[
                        <Tooltip title="Accept suggestion" key="accept">
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            loading={isProcessing}
                            onClick={() => handleAcceptSuggestion(suggestion)}
                          />
                        </Tooltip>,
                        <Tooltip title="Reject suggestion" key="reject">
                          <Button
                            danger
                            size="small"
                            icon={<CloseOutlined />}
                            loading={isProcessing}
                            onClick={() => handleRejectSuggestion(suggestion)}
                          />
                        </Tooltip>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={getSourceIcon(suggestion.suggestion_source)}
                        title={
                          <Space>
                            {tag && (
                              <Tag color={tag.color}>
                                {tag.name}
                              </Tag>
                            )}
                            <Tag color={getSourceColor(suggestion.suggestion_source)}>
                              {suggestion.suggestion_source.replace('_', ' ')}
                            </Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <div style={{ marginBottom: '8px' }}>
                              <Text type="secondary">
                                Confidence: {(suggestion.confidence_score * 100).toFixed(1)}%
                              </Text>
                            </div>
                            <Progress
                              percent={suggestion.confidence_score * 100}
                              size="small"
                              strokeColor={getConfidenceColor(suggestion.confidence_score)}
                              showInfo={false}
                            />
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}

          {/* Reviewed Suggestions */}
          {reviewedSuggestions.length > 0 && (
            <div>
              <Text strong style={{ marginBottom: '12px', display: 'block' }}>
                Reviewed Suggestions ({reviewedSuggestions.length})
              </Text>
              <List
                dataSource={reviewedSuggestions}
                renderItem={(suggestion) => {
                  const tag = getTagById(suggestion.tag_id);
                  
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={getSourceIcon(suggestion.suggestion_source)}
                        title={
                          <Space>
                            {tag && (
                              <Tag color={tag.color}>
                                {tag.name}
                              </Tag>
                            )}
                            <Tag color={getSourceColor(suggestion.suggestion_source)}>
                              {suggestion.suggestion_source.replace('_', ' ')}
                            </Tag>
                            <Badge
                              status={suggestion.is_accepted ? 'success' : 'error'}
                              text={suggestion.is_accepted ? 'Accepted' : 'Rejected'}
                            />
                          </Space>
                        }
                        description={
                          <Space>
                            <Text type="secondary">
                              Confidence: {(suggestion.confidence_score * 100).toFixed(1)}%
                            </Text>
                            {suggestion.reviewed_at && (
                              <Text type="secondary">
                                • Reviewed: {new Date(suggestion.reviewed_at).toLocaleDateString()}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TagSuggestions;