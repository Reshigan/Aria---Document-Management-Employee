'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tree, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Dropdown, 
  Space, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Tooltip, 
  Popconfirm,
  Breadcrumb,
  Divider,
  Typography,
  ColorPicker,
  Switch,
  Progress,
  Badge
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ScissorOutlined,
  ShareAltOutlined,
  BarChartOutlined,
  MoreOutlined,
  HomeOutlined,
  FileTextOutlined,
  TeamOutlined,
  SettingOutlined,
  DragOutlined,
  FolderAddOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { foldersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FolderNode {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  path: string;
  color?: string;
  is_public: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  children_count: number;
  documents_count: number;
  children?: FolderNode[];
}

interface FolderStats {
  folder_id: number;
  folder_name: string;
  direct_documents: number;
  total_documents: number;
  direct_subfolders: number;
  total_subfolders: number;
  total_size: number;
  document_types: Record<string, number>;
}

const FoldersPage: React.FC = () => {
  const { user } = useAuth();
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null);
  const [folderStats, setFolderStats] = useState<FolderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  
  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  
  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [duplicateForm] = Form.useForm();
  
  // Breadcrumb path
  const [breadcrumbPath, setBreadcrumbPath] = useState<{ id: number; name: string }[]>([]);

  // Load folder tree
  const loadFolderTree = useCallback(async () => {
    try {
      setLoading(true);
      const response = await foldersAPI.getTree();
      setFolderTree(response.tree || []);
    } catch (error) {
      console.error('Error loading folder tree:', error);
      message.error('Failed to load folder tree');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load folder statistics
  const loadFolderStats = useCallback(async (folderId: number) => {
    try {
      setStatsLoading(true);
      const stats = await foldersAPI.getStatistics(folderId, true);
      setFolderStats(stats);
    } catch (error) {
      console.error('Error loading folder stats:', error);
      message.error('Failed to load folder statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Build breadcrumb path
  const buildBreadcrumbPath = useCallback((folder: FolderNode, tree: FolderNode[]): { id: number; name: string }[] => {
    const path: { id: number; name: string }[] = [];
    
    const findPath = (nodes: FolderNode[], targetId: number, currentPath: { id: number; name: string }[]): boolean => {
      for (const node of nodes) {
        const newPath = [...currentPath, { id: node.id, name: node.name }];
        
        if (node.id === targetId) {
          path.push(...newPath);
          return true;
        }
        
        if (node.children && findPath(node.children, targetId, newPath)) {
          return true;
        }
      }
      return false;
    };
    
    findPath(tree, folder.id, []);
    return path;
  }, []);

  // Convert folder tree to Ant Design Tree format
  const convertToTreeData = useCallback((folders: FolderNode[]) => {
    return folders.map(folder => ({
      key: folder.id,
      title: (
        <Space>
          <span style={{ color: folder.color || '#1890ff' }}>
            {expandedKeys.includes(folder.id) ? <FolderOpenOutlined /> : <FolderOutlined />}
          </span>
          <span>{folder.name}</span>
          {folder.is_public && <Tag color="green" size="small">Public</Tag>}
          {folder.is_system && <Tag color="orange" size="small">System</Tag>}
          <Badge count={folder.documents_count} size="small" />
        </Space>
      ),
      children: folder.children ? convertToTreeData(folder.children) : undefined,
      isLeaf: !folder.children || folder.children.length === 0,
      folder: folder
    }));
  }, [expandedKeys]);

  // Handle folder selection
  const handleFolderSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const folder = info.node.folder as FolderNode;
      setSelectedFolder(folder);
      setSelectedKeys(selectedKeys);
      
      // Build breadcrumb path
      const path = buildBreadcrumbPath(folder, folderTree);
      setBreadcrumbPath(path);
      
      // Load folder statistics
      loadFolderStats(folder.id);
    } else {
      setSelectedFolder(null);
      setSelectedKeys([]);
      setBreadcrumbPath([]);
      setFolderStats(null);
    }
  }, [folderTree, buildBreadcrumbPath, loadFolderStats]);

  // Create folder
  const handleCreateFolder = async (values: any) => {
    try {
      await foldersAPI.create({
        name: values.name,
        description: values.description,
        parent_id: selectedFolder?.id,
        color: values.color,
        is_public: values.is_public || false
      });
      
      message.success('Folder created successfully');
      setCreateModalVisible(false);
      createForm.resetFields();
      loadFolderTree();
    } catch (error) {
      console.error('Error creating folder:', error);
      message.error('Failed to create folder');
    }
  };

  // Edit folder
  const handleEditFolder = async (values: any) => {
    if (!selectedFolder) return;
    
    try {
      await foldersAPI.update(selectedFolder.id, {
        name: values.name,
        description: values.description,
        color: values.color,
        is_public: values.is_public
      });
      
      message.success('Folder updated successfully');
      setEditModalVisible(false);
      editForm.resetFields();
      loadFolderTree();
    } catch (error) {
      console.error('Error updating folder:', error);
      message.error('Failed to update folder');
    }
  };

  // Delete folder
  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    
    try {
      await foldersAPI.delete(selectedFolder.id);
      message.success('Folder deleted successfully');
      setSelectedFolder(null);
      setSelectedKeys([]);
      setBreadcrumbPath([]);
      setFolderStats(null);
      loadFolderTree();
    } catch (error) {
      console.error('Error deleting folder:', error);
      message.error('Failed to delete folder');
    }
  };

  // Duplicate folder
  const handleDuplicateFolder = async (values: any) => {
    if (!selectedFolder) return;
    
    try {
      await foldersAPI.duplicate(
        selectedFolder.id,
        values.target_parent_id,
        values.new_name,
        values.include_documents
      );
      
      message.success('Folder duplicated successfully');
      setDuplicateModalVisible(false);
      duplicateForm.resetFields();
      loadFolderTree();
    } catch (error) {
      console.error('Error duplicating folder:', error);
      message.error('Failed to duplicate folder');
    }
  };

  // Folder context menu
  const getFolderContextMenu = (folder: FolderNode) => [
    {
      key: 'edit',
      label: 'Edit Folder',
      icon: <EditOutlined />,
      onClick: () => {
        setSelectedFolder(folder);
        editForm.setFieldsValue({
          name: folder.name,
          description: folder.description,
          color: folder.color,
          is_public: folder.is_public
        });
        setEditModalVisible(true);
      }
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <CopyOutlined />,
      onClick: () => {
        setSelectedFolder(folder);
        duplicateForm.setFieldsValue({
          new_name: `${folder.name}_copy`,
          include_documents: true
        });
        setDuplicateModalVisible(true);
      }
    },
    {
      key: 'permissions',
      label: 'Permissions',
      icon: <TeamOutlined />,
      onClick: () => {
        setSelectedFolder(folder);
        setPermissionsModalVisible(true);
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        setSelectedFolder(folder);
      }
    }
  ];

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  const treeData = convertToTreeData(folderTree);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Title level={2} className="mb-2">
          <FolderOutlined className="mr-2" />
          Folder Management
        </Title>
        <Text type="secondary">
          Organize and manage your document folders with hierarchical structure and permissions
        </Text>
      </div>

      {/* Breadcrumb */}
      {breadcrumbPath.length > 0 && (
        <Card className="mb-4">
          <Breadcrumb>
            <Breadcrumb.Item>
              <HomeOutlined />
              <span className="ml-1">Root</span>
            </Breadcrumb.Item>
            {breadcrumbPath.map((item, index) => (
              <Breadcrumb.Item key={item.id}>
                <FolderOutlined />
                <span className="ml-1">{item.name}</span>
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        </Card>
      )}

      <Row gutter={[24, 24]}>
        {/* Folder Tree */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <FolderOutlined />
                <span>Folder Structure</span>
              </Space>
            }
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                New Folder
              </Button>
            }
            loading={loading}
          >
            {treeData.length > 0 ? (
              <Tree
                showLine
                showIcon={false}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                onExpand={setExpandedKeys}
                onSelect={handleFolderSelect}
                treeData={treeData}
                height={600}
                titleRender={(nodeData: any) => (
                  <Dropdown
                    menu={{ items: getFolderContextMenu(nodeData.folder) }}
                    trigger={['contextMenu']}
                  >
                    <div>{nodeData.title}</div>
                  </Dropdown>
                )}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FolderOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>No folders found</div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  className="mt-4"
                  onClick={() => setCreateModalVisible(true)}
                >
                  Create Your First Folder
                </Button>
              </div>
            )}
          </Card>
        </Col>

        {/* Folder Details & Statistics */}
        <Col xs={24} lg={12}>
          {selectedFolder ? (
            <Space direction="vertical" size="large" className="w-full">
              {/* Folder Info */}
              <Card 
                title={
                  <Space>
                    <span style={{ color: selectedFolder.color || '#1890ff' }}>
                      <FolderOutlined />
                    </span>
                    <span>{selectedFolder.name}</span>
                    {selectedFolder.is_public && <Tag color="green">Public</Tag>}
                    {selectedFolder.is_system && <Tag color="orange">System</Tag>}
                  </Space>
                }
                extra={
                  <Dropdown
                    menu={{ items: getFolderContextMenu(selectedFolder) }}
                    trigger={['click']}
                  >
                    <Button icon={<MoreOutlined />} />
                  </Dropdown>
                }
              >
                <Space direction="vertical" className="w-full">
                  {selectedFolder.description && (
                    <div>
                      <Text strong>Description:</Text>
                      <div className="mt-1">{selectedFolder.description}</div>
                    </div>
                  )}
                  
                  <div>
                    <Text strong>Path:</Text>
                    <div className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">
                      {selectedFolder.path}
                    </div>
                  </div>
                  
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Created:</Text>
                      <div>{new Date(selectedFolder.created_at).toLocaleDateString()}</div>
                    </Col>
                    <Col span={12}>
                      <Text strong>Modified:</Text>
                      <div>{new Date(selectedFolder.updated_at).toLocaleDateString()}</div>
                    </Col>
                  </Row>
                </Space>
              </Card>

              {/* Folder Statistics */}
              <Card 
                title={
                  <Space>
                    <BarChartOutlined />
                    <span>Statistics</span>
                  </Space>
                }
                loading={statsLoading}
              >
                {folderStats ? (
                  <Space direction="vertical" size="large" className="w-full">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic
                          title="Total Documents"
                          value={folderStats.total_documents}
                          prefix={<FileTextOutlined />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Subfolders"
                          value={folderStats.total_subfolders}
                          prefix={<FolderOutlined />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Total Size"
                          value={formatFileSize(folderStats.total_size)}
                        />
                      </Col>
                    </Row>

                    {Object.keys(folderStats.document_types).length > 0 && (
                      <div>
                        <Title level={5}>Document Types</Title>
                        <Space wrap>
                          {Object.entries(folderStats.document_types).map(([type, count]) => (
                            <Tag key={type} color="blue">
                              {type}: {count}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </Space>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Select a folder to view statistics
                  </div>
                )}
              </Card>

              {/* Quick Actions */}
              <Card title="Quick Actions">
                <Space wrap>
                  <Button 
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    New Subfolder
                  </Button>
                  <Button 
                    icon={<EditOutlined />}
                    onClick={() => {
                      editForm.setFieldsValue({
                        name: selectedFolder.name,
                        description: selectedFolder.description,
                        color: selectedFolder.color,
                        is_public: selectedFolder.is_public
                      });
                      setEditModalVisible(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    icon={<CopyOutlined />}
                    onClick={() => {
                      duplicateForm.setFieldsValue({
                        new_name: `${selectedFolder.name}_copy`,
                        include_documents: true
                      });
                      setDuplicateModalVisible(true);
                    }}
                  >
                    Duplicate
                  </Button>
                  <Button 
                    icon={<TeamOutlined />}
                    onClick={() => setPermissionsModalVisible(true)}
                  >
                    Permissions
                  </Button>
                  <Popconfirm
                    title="Delete Folder"
                    description="Are you sure you want to delete this folder? This action cannot be undone."
                    onConfirm={handleDeleteFolder}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Space>
          ) : (
            <Card>
              <div className="text-center py-12 text-gray-500">
                <FolderOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                <Title level={4} type="secondary">Select a Folder</Title>
                <Text>Choose a folder from the tree to view details and statistics</Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* Create Folder Modal */}
      <Modal
        title="Create New Folder"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateFolder}
        >
          <Form.Item
            name="name"
            label="Folder Name"
            rules={[{ required: true, message: 'Please enter folder name' }]}
          >
            <Input placeholder="Enter folder name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Enter folder description (optional)" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Folder Color"
          >
            <ColorPicker />
          </Form.Item>

          <Form.Item
            name="is_public"
            label="Public Folder"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                Create Folder
              </Button>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal
        title="Edit Folder"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditFolder}
        >
          <Form.Item
            name="name"
            label="Folder Name"
            rules={[{ required: true, message: 'Please enter folder name' }]}
          >
            <Input placeholder="Enter folder name" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} placeholder="Enter folder description (optional)" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Folder Color"
          >
            <ColorPicker />
          </Form.Item>

          <Form.Item
            name="is_public"
            label="Public Folder"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                Update Folder
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Duplicate Folder Modal */}
      <Modal
        title="Duplicate Folder"
        open={duplicateModalVisible}
        onCancel={() => {
          setDuplicateModalVisible(false);
          duplicateForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={duplicateForm}
          layout="vertical"
          onFinish={handleDuplicateFolder}
        >
          <Form.Item
            name="new_name"
            label="New Folder Name"
            rules={[{ required: true, message: 'Please enter new folder name' }]}
          >
            <Input placeholder="Enter new folder name" />
          </Form.Item>

          <Form.Item
            name="target_parent_id"
            label="Target Location"
          >
            <Select placeholder="Select target folder (leave empty for root)">
              {/* TODO: Add folder options */}
            </Select>
          </Form.Item>

          <Form.Item
            name="include_documents"
            label="Include Documents"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                Duplicate Folder
              </Button>
              <Button onClick={() => {
                setDuplicateModalVisible(false);
                duplicateForm.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        title="Folder Permissions"
        open={permissionsModalVisible}
        onCancel={() => setPermissionsModalVisible(false)}
        footer={null}
        width={800}
      >
        <div className="text-center py-8 text-gray-500">
          <TeamOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>Permissions management coming soon</div>
        </div>
      </Modal>
    </div>
  );
};

export default FoldersPage;