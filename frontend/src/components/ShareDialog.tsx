'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Select,
  Switch,
  Button,
  DatePicker,
  InputNumber,
  message,
  List,
  Avatar,
  Tag,
  Popconfirm,
  Space,
  Typography,
  Divider,
  Card,
  Row,
  Col,
  Tooltip,
  Alert
} from 'antd';
import {
  UserOutlined,
  LinkOutlined,
  ShareAltOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  DownloadOutlined,
  EditOutlined,
  CommentOutlined,
  CalendarOutlined,
  LockOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { sharingAPI, usersAPI } from '@/lib/api';
import type { 
  Document, 
  User, 
  DocumentShare, 
  DocumentShareCreate, 
  ShareLinkCreate, 
  ShareLinkResponse 
} from '@/types';

const { TabPane } = Tabs;
const { Option } = Select;
const { Text, Title } = Typography;

interface ShareDialogProps {
  visible: boolean;
  onClose: () => void;
  document: Document | null;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ visible, onClose, document }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLinkResponse[]>([]);
  const [userForm] = Form.useForm();
  const [linkForm] = Form.useForm();

  useEffect(() => {
    if (visible && document) {
      loadUsers();
      loadShares();
      loadShareLinks();
    }
  }, [visible, document]);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.list();
      setUsers(response.items || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      message.error('Failed to load users');
    }
  };

  const loadShares = async () => {
    if (!document) return;
    try {
      const sharesData = await sharingAPI.getDocumentShares(document.id);
      setShares(sharesData);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  const loadShareLinks = async () => {
    if (!document) return;
    try {
      const linksData = await sharingAPI.getShareLinks(document.id);
      setShareLinks(linksData);
    } catch (error) {
      console.error('Failed to load share links:', error);
    }
  };

  const handleShareWithUser = async (values: any) => {
    if (!document) return;
    
    setLoading(true);
    try {
      const shareData: DocumentShareCreate = {
        shared_with_user_id: values.user_id,
        can_view: values.can_view ?? true,
        can_edit: values.can_edit ?? false,
        can_download: values.can_download ?? true,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined,
        message: values.message
      };

      await sharingAPI.shareDocument(document.id, shareData);
      message.success('Document shared successfully');
      userForm.resetFields();
      loadShares();
    } catch (error: any) {
      console.error('Failed to share document:', error);
      message.error(error.response?.data?.detail || 'Failed to share document');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShareLink = async (values: any) => {
    if (!document) return;
    
    setLoading(true);
    try {
      const linkData: ShareLinkCreate = {
        link_type: values.link_type || 'private',
        password: values.password,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined,
        max_downloads: values.max_downloads,
        can_view: values.can_view ?? true,
        can_download: values.can_download ?? true,
        can_comment: values.can_comment ?? false
      };

      await sharingAPI.createShareLink(document.id, linkData);
      message.success('Share link created successfully');
      linkForm.resetFields();
      loadShareLinks();
    } catch (error: any) {
      console.error('Failed to create share link:', error);
      message.error(error.response?.data?.detail || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: number) => {
    if (!document) return;
    
    try {
      await sharingAPI.revokeDocumentShare(document.id, shareId);
      message.success('Share revoked successfully');
      loadShares();
    } catch (error: any) {
      console.error('Failed to revoke share:', error);
      message.error(error.response?.data?.detail || 'Failed to revoke share');
    }
  };

  const handleDeleteShareLink = async (linkId: number) => {
    try {
      await sharingAPI.deleteShareLink(linkId);
      message.success('Share link deleted successfully');
      loadShareLinks();
    } catch (error: any) {
      console.error('Failed to delete share link:', error);
      message.error(error.response?.data?.detail || 'Failed to delete share link');
    }
  };

  const copyShareLink = (token: string) => {
    const link = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(link);
    message.success('Share link copied to clipboard');
  };

  const renderUserShareTab = () => (
    <div>
      <Card title="Share with Users" className="mb-4">
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleShareWithUser}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="user_id"
                label="Select User"
                rules={[{ required: true, message: 'Please select a user' }]}
              >
                <Select
                  placeholder="Choose user to share with"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {users.map(user => (
                    <Option key={user.id} value={user.id}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        {user.full_name || user.username} ({user.email})
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expires_at" label="Expires At">
                <DatePicker 
                  showTime 
                  placeholder="Select expiration date"
                  disabledDate={(current) => current && current < dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="can_view" label="Can View" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="can_edit" label="Can Edit" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="can_download" label="Can Download" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="message" label="Message (Optional)">
            <Input.TextArea 
              rows={3} 
              placeholder="Add a message for the recipient..."
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<ShareAltOutlined />}>
              Share Document
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Current Shares">
        <List
          dataSource={shares}
          renderItem={(share) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="revoke"
                  title="Are you sure you want to revoke this share?"
                  onConfirm={() => handleRevokeShare(share.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger icon={<DeleteOutlined />}>
                    Revoke
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={share.shared_with?.full_name || share.shared_with?.username || `User ${share.shared_with_user_id}`}
                description={
                  <Space direction="vertical" size="small">
                    <Space>
                      {share.can_view && <Tag color="blue" icon={<EyeOutlined />}>View</Tag>}
                      {share.can_edit && <Tag color="green" icon={<EditOutlined />}>Edit</Tag>}
                      {share.can_download && <Tag color="orange" icon={<DownloadOutlined />}>Download</Tag>}
                    </Space>
                    {share.expires_at && (
                      <Text type="secondary">
                        <CalendarOutlined /> Expires: {dayjs(share.expires_at).format('MMM DD, YYYY HH:mm')}
                      </Text>
                    )}
                    {share.message && <Text italic>"{share.message}"</Text>}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No shares found' }}
        />
      </Card>
    </div>
  );

  const renderShareLinkTab = () => (
    <div>
      <Card title="Create Share Link" className="mb-4">
        <Form
          form={linkForm}
          layout="vertical"
          onFinish={handleCreateShareLink}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="link_type" label="Link Type" initialValue="private">
                <Select>
                  <Option value="public">Public</Option>
                  <Option value="private">Private</Option>
                  <Option value="password_protected">Password Protected</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expires_at" label="Expires At">
                <DatePicker 
                  showTime 
                  placeholder="Select expiration date"
                  disabledDate={(current) => current && current < dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.link_type !== currentValues.link_type
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('link_type') === 'password_protected' ? (
                <Form.Item
                  name="password"
                  label="Password"
                  rules={[{ required: true, message: 'Password is required for protected links' }]}
                >
                  <Input.Password placeholder="Enter password for the link" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="can_view" label="Can View" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="can_download" label="Can Download" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="can_comment" label="Can Comment" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="max_downloads" label="Max Downloads (Optional)">
            <InputNumber 
              min={1} 
              placeholder="Unlimited if not set"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} icon={<LinkOutlined />}>
              Create Share Link
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Active Share Links">
        <List
          dataSource={shareLinks}
          renderItem={(link) => (
            <List.Item
              actions={[
                <Tooltip key="copy" title="Copy Link">
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />}
                    onClick={() => copyShareLink(link.token)}
                  >
                    Copy
                  </Button>
                </Tooltip>,
                <Popconfirm
                  key="delete"
                  title="Are you sure you want to delete this share link?"
                  onConfirm={() => handleDeleteShareLink(link.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="text" danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<LinkOutlined />} />}
                title={
                  <Space>
                    <Text code>{link.token.substring(0, 8)}...</Text>
                    {link.link_type === 'password_protected' && <LockOutlined />}
                    <Tag color={link.is_active ? 'green' : 'red'}>
                      {link.is_active ? 'Active' : 'Inactive'}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size="small">
                    <Space>
                      {link.can_view && <Tag color="blue" icon={<EyeOutlined />}>View</Tag>}
                      {link.can_download && <Tag color="orange" icon={<DownloadOutlined />}>Download</Tag>}
                      {link.can_comment && <Tag color="purple" icon={<CommentOutlined />}>Comment</Tag>}
                    </Space>
                    <Space>
                      <Text type="secondary">Downloads: {link.download_count}</Text>
                      {link.max_downloads && <Text type="secondary">/ {link.max_downloads}</Text>}
                    </Space>
                    {link.expires_at && (
                      <Text type="secondary">
                        <CalendarOutlined /> Expires: {dayjs(link.expires_at).format('MMM DD, YYYY HH:mm')}
                      </Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No share links found' }}
        />
      </Card>
    </div>
  );

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          Share Document: {document?.original_filename}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      {document && (
        <>
          <Alert
            message="Document Sharing"
            description="Share this document with other users or create shareable links. You can control permissions and set expiration dates."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab={<span><UserOutlined />Share with Users</span>} key="users">
              {renderUserShareTab()}
            </TabPane>
            <TabPane tab={<span><LinkOutlined />Share Links</span>} key="links">
              {renderShareLinkTab()}
            </TabPane>
          </Tabs>
        </>
      )}
    </Modal>
  );
};

export default ShareDialog;