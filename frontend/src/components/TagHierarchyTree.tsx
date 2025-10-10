'use client';

import React, { useState, useEffect } from 'react';
import { Tree, Card, Button, Space, Tag, Tooltip, Modal, message } from 'antd';
import { 
  TagOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  DragOutlined, EyeOutlined
} from '@ant-design/icons';
import { enhancedTagsAPI } from '@/lib/api';
import type { EnhancedTag } from '@/types';

interface TagHierarchyTreeProps {
  tags: EnhancedTag[];
  onTagSelect?: (tag: EnhancedTag) => void;
  onTagUpdate?: () => void;
  editable?: boolean;
}

interface TreeNode {
  title: React.ReactNode;
  key: string;
  children?: TreeNode[];
  tag: EnhancedTag;
}

const TagHierarchyTree: React.FC<TagHierarchyTreeProps> = ({
  tags,
  onTagSelect,
  onTagUpdate,
  editable = false
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [dragOverKey, setDragOverKey] = useState<string>('');

  useEffect(() => {
    buildTreeData();
  }, [tags]);

  const buildTreeData = () => {
    // Create a map for quick lookup
    const tagMap = new Map<number, EnhancedTag>();
    tags.forEach(tag => tagMap.set(tag.id, tag));

    // Build tree structure
    const rootNodes: TreeNode[] = [];
    const processedIds = new Set<number>();

    const buildNode = (tag: EnhancedTag): TreeNode => {
      const children: TreeNode[] = [];
      
      // Find children
      tags.forEach(childTag => {
        if (childTag.parent_id === tag.id && !processedIds.has(childTag.id)) {
          processedIds.add(childTag.id);
          children.push(buildNode(childTag));
        }
      });

      return {
        title: renderTagNode(tag),
        key: tag.id.toString(),
        children: children.length > 0 ? children : undefined,
        tag
      };
    };

    // Find root nodes (tags without parents)
    tags.forEach(tag => {
      if (!tag.parent_id && !processedIds.has(tag.id)) {
        processedIds.add(tag.id);
        rootNodes.push(buildNode(tag));
      }
    });

    setTreeData(rootNodes);
  };

  const renderTagNode = (tag: EnhancedTag) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Space>
        <Tag 
          color={tag.color} 
          icon={<TagOutlined />}
          style={{ margin: 0 }}
        >
          {tag.name}
        </Tag>
        <span style={{ fontSize: '12px', color: '#666' }}>
          ({tag.usage_count} uses)
        </span>
        {tag.is_system && (
          <Tag size="small" color="blue">System</Tag>
        )}
        {!tag.is_active && (
          <Tag size="small" color="red">Inactive</Tag>
        )}
      </Space>
      
      {editable && (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Details">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => onTagSelect?.(tag)}
            />
          </Tooltip>
          <Tooltip title="Edit Tag">
            <Button 
              type="text" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEditTag(tag)}
            />
          </Tooltip>
          <Tooltip title="Add Child Tag">
            <Button 
              type="text" 
              size="small" 
              icon={<PlusOutlined />}
              onClick={() => handleAddChildTag(tag)}
            />
          </Tooltip>
          <Tooltip title="Delete Tag">
            <Button 
              type="text" 
              size="small" 
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteTag(tag)}
            />
          </Tooltip>
        </Space>
      )}
    </div>
  );

  const handleEditTag = (tag: EnhancedTag) => {
    // This would open an edit modal
    console.log('Edit tag:', tag);
  };

  const handleAddChildTag = (parentTag: EnhancedTag) => {
    // This would open a create modal with parent_id set
    console.log('Add child to:', parentTag);
  };

  const handleDeleteTag = async (tag: EnhancedTag) => {
    Modal.confirm({
      title: 'Delete Tag',
      content: `Are you sure you want to delete "${tag.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await enhancedTagsAPI.delete(tag.id);
          message.success('Tag deleted successfully');
          onTagUpdate?.();
        } catch (error) {
          message.error('Failed to delete tag');
          console.error('Error deleting tag:', error);
        }
      }
    });
  };

  const handleDrop = async (info: any) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    // Don't allow dropping on itself
    if (dragKey === dropKey) return;

    try {
      const dragTag = tags.find(t => t.id.toString() === dragKey);
      const dropTag = tags.find(t => t.id.toString() === dropKey);
      
      if (!dragTag) return;

      let newParentId: number | undefined;
      
      if (dropPosition === -1) {
        // Drop above the target node
        newParentId = dropTag?.parent_id;
      } else if (dropPosition === 1) {
        // Drop below the target node
        newParentId = dropTag?.parent_id;
      } else {
        // Drop into the target node
        newParentId = dropTag?.id;
      }

      await enhancedTagsAPI.moveTag(dragTag.id, newParentId);
      message.success('Tag moved successfully');
      onTagUpdate?.();
    } catch (error) {
      message.error('Failed to move tag');
      console.error('Error moving tag:', error);
    }
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    setSelectedKeys(selectedKeys as string[]);
    if (selectedKeys.length > 0) {
      const selectedTag = tags.find(t => t.id.toString() === selectedKeys[0]);
      if (selectedTag) {
        onTagSelect?.(selectedTag);
      }
    }
  };

  return (
    <Card 
      title={
        <Space>
          <TagOutlined />
          Tag Hierarchy
        </Space>
      }
      size="small"
    >
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        onExpand={setExpandedKeys}
        onSelect={handleSelect}
        draggable={editable}
        onDrop={handleDrop}
        showLine={{ showLeafIcon: false }}
        blockNode
        style={{ 
          background: 'transparent',
          fontSize: '14px'
        }}
      />
      
      {treeData.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#999' 
        }}>
          No tags found
        </div>
      )}
    </Card>
  );
};

export default TagHierarchyTree;