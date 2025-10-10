'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Input, 
  Button,
  Select,
  DatePicker,
  Tag,
  List,
  Avatar,
  Typography,
  Space,
  Divider,
  Spin,
  Alert,
  Empty,
  Pagination,
  Collapse,
  Slider,
  AutoComplete,
  Tooltip,
  Badge
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  FolderOutlined,
  TagOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  ClearOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

interface SearchResult {
  id: number;
  filename: string;
  original_filename: string;
  document_type?: string;
  status: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  updated_at?: string;
  uploaded_by: number;
  folder_id?: number;
  folder_name?: string;
  tags: string[];
  relevance_score: number;
  matched_content?: string;
  highlight_snippets?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  query: string;
  search_time_ms: number;
  facets: {
    document_types?: Array<{type: string, count: number}>;
    file_sizes?: Array<{label: string, count: number, min: number, max?: number}>;
    date_ranges?: Array<{label: string, count: number, since: string}>;
    top_tags?: Array<{name: string, count: number}>;
  };
}

interface SearchFilters {
  document_type?: string;
  folder_id?: number;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  file_size_min?: number;
  file_size_max?: number;
  uploaded_by?: number;
  include_content: boolean;
  include_metadata: boolean;
}

export default function SearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<SearchFilters>({
    include_content: true,
    include_metadata: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{type: string, text: string}>>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:12001';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const performSearch = async (query: string = searchQuery, page: number = 1) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchRequest = {
        query: query.trim(),
        ...filters
      };

      const response = await fetch(`${API_BASE_URL}/search/?page=${page}&page_size=${pageSize}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(searchRequest)
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setSearchResults(data);
      setCurrentPage(page);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async (value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/search/suggestions?q=${encodeURIComponent(value)}&limit=10`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/search/history?page=1&page_size=10`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.searches || []);
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  };

  const clearSearchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/search/history`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSearchHistory([]);
      }
    } catch (err) {
      console.error('Failed to clear search history:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed': return 'green';
      case 'processing': return 'blue';
      case 'uploaded': return 'orange';
      case 'failed': return 'red';
      default: return 'default';
    }
  };

  const handleSearch = (value?: string) => {
    const query = value || searchQuery;
    if (query.trim()) {
      performSearch(query, 1);
    }
  };

  const handlePageChange = (page: number) => {
    performSearch(searchQuery, page);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      include_content: true,
      include_metadata: true
    });
  };

  const viewDocument = (documentId: number) => {
    router.push(`/documents/${documentId}`);
  };

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const suggestionOptions = suggestions.map(suggestion => ({
    value: suggestion.text,
    label: (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {suggestion.type === 'filename' ? <FileTextOutlined /> : <TagOutlined />}
        <span style={{ marginLeft: 8 }}>{suggestion.text}</span>
        <Text type="secondary" style={{ marginLeft: 'auto', fontSize: '12px' }}>
          {suggestion.type}
        </Text>
      </div>
    )
  }));

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SearchOutlined /> Advanced Search
        </Title>
        <Text type="secondary">Search across documents, content, and metadata</Text>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <AutoComplete
              options={suggestionOptions}
              onSearch={getSuggestions}
              onSelect={handleSearch}
              style={{ width: '100%' }}
            >
              <Input.Search
                placeholder="Search documents, content, filenames..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={handleSearch}
                size="large"
                enterButton={
                  <Button type="primary" icon={<SearchOutlined />} loading={loading}>
                    Search
                  </Button>
                }
              />
            </AutoComplete>
          </Col>
          <Col>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
              type={showFilters ? 'primary' : 'default'}
            >
              Filters
            </Button>
          </Col>
        </Row>

        {/* Advanced Filters */}
        {showFilters && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Text strong>Document Type</Text>
                <Select
                  placeholder="Any type"
                  style={{ width: '100%', marginTop: '4px' }}
                  value={filters.document_type}
                  onChange={(value) => handleFilterChange('document_type', value)}
                  allowClear
                >
                  <Option value="pdf">PDF</Option>
                  <Option value="doc">Word Document</Option>
                  <Option value="txt">Text File</Option>
                  <Option value="image">Image</Option>
                  <Option value="spreadsheet">Spreadsheet</Option>
                </Select>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Text strong>Date Range</Text>
                <RangePicker
                  style={{ width: '100%', marginTop: '4px' }}
                  value={filters.date_from && filters.date_to ? [
                    dayjs(filters.date_from),
                    dayjs(filters.date_to)
                  ] : null}
                  onChange={(dates) => {
                    if (dates) {
                      handleFilterChange('date_from', dates[0]?.toISOString());
                      handleFilterChange('date_to', dates[1]?.toISOString());
                    } else {
                      handleFilterChange('date_from', undefined);
                      handleFilterChange('date_to', undefined);
                    }
                  }}
                />
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Text strong>File Size (MB)</Text>
                <Slider
                  range
                  min={0}
                  max={100}
                  value={[filters.file_size_min || 0, filters.file_size_max || 100]}
                  onChange={([min, max]) => {
                    handleFilterChange('file_size_min', min * 1024 * 1024);
                    handleFilterChange('file_size_max', max * 1024 * 1024);
                  }}
                  style={{ marginTop: '8px' }}
                />
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Text strong>Search In</Text>
                <div style={{ marginTop: '4px' }}>
                  <div>
                    <input
                      type="checkbox"
                      checked={filters.include_content}
                      onChange={(e) => handleFilterChange('include_content', e.target.checked)}
                    />
                    <span style={{ marginLeft: '8px' }}>Document Content</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      checked={filters.include_metadata}
                      onChange={(e) => handleFilterChange('include_metadata', e.target.checked)}
                    />
                    <span style={{ marginLeft: '8px' }}>Filename & Metadata</span>
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Space>
                <Button onClick={clearFilters} icon={<ClearOutlined />}>
                  Clear Filters
                </Button>
                <Button type="primary" onClick={() => handleSearch()} icon={<SearchOutlined />}>
                  Apply Filters
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>

      <Row gutter={[24, 24]}>
        {/* Search Results */}
        <Col xs={24} lg={18}>
          {error && (
            <Alert
              message="Search Error"
              description={error}
              type="error"
              closable
              style={{ marginBottom: '16px' }}
              onClose={() => setError(null)}
            />
          )}

          {loading ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>
                  <Text>Searching documents...</Text>
                </div>
              </div>
            </Card>
          ) : searchResults ? (
            <>
              {/* Results Summary */}
              <Card style={{ marginBottom: '16px' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong>
                      {searchResults.total} results found for "{searchResults.query}"
                    </Text>
                    <Text type="secondary" style={{ marginLeft: '16px' }}>
                      ({searchResults.search_time_ms}ms)
                    </Text>
                  </Col>
                  <Col>
                    <Select
                      value={pageSize}
                      onChange={setPageSize}
                      style={{ width: '120px' }}
                    >
                      <Option value={10}>10 per page</Option>
                      <Option value={20}>20 per page</Option>
                      <Option value={50}>50 per page</Option>
                    </Select>
                  </Col>
                </Row>
              </Card>

              {/* Results List */}
              {searchResults.results.length > 0 ? (
                <Card>
                  <List
                    itemLayout="vertical"
                    dataSource={searchResults.results}
                    renderItem={(item) => (
                      <List.Item
                        key={item.id}
                        actions={[
                          <Button
                            key="view"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => viewDocument(item.id)}
                          >
                            View
                          </Button>,
                          <Button
                            key="download"
                            type="link"
                            icon={<DownloadOutlined />}
                          >
                            Download
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              icon={<FileTextOutlined />}
                              style={{ backgroundColor: '#1890ff' }}
                            />
                          }
                          title={
                            <div>
                              <Text strong style={{ fontSize: '16px' }}>
                                {item.original_filename}
                              </Text>
                              <Badge
                                count={item.relevance_score.toFixed(1)}
                                style={{ backgroundColor: '#52c41a', marginLeft: '8px' }}
                              />
                            </div>
                          }
                          description={
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              <Space wrap>
                                <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                                {item.document_type && (
                                  <Tag icon={<FileTextOutlined />}>{item.document_type}</Tag>
                                )}
                                {item.folder_name && (
                                  <Tag icon={<FolderOutlined />}>{item.folder_name}</Tag>
                                )}
                                <Tag icon={<CalendarOutlined />}>
                                  {dayjs(item.created_at).format('MMM DD, YYYY')}
                                </Tag>
                                {item.file_size && (
                                  <Tag>{formatFileSize(item.file_size)}</Tag>
                                )}
                              </Space>
                              
                              {item.tags.length > 0 && (
                                <div>
                                  <Text type="secondary">Tags: </Text>
                                  {item.tags.map(tag => (
                                    <Tag key={tag} color="blue" style={{ margin: '2px' }}>
                                      {tag}
                                    </Tag>
                                  ))}
                                </div>
                              )}

                              {item.highlight_snippets && item.highlight_snippets.length > 0 && (
                                <div>
                                  <Text type="secondary">Matches: </Text>
                                  {item.highlight_snippets.map((snippet, index) => (
                                    <div key={index} style={{ 
                                      backgroundColor: '#fff7e6', 
                                      padding: '4px 8px', 
                                      borderRadius: '4px',
                                      margin: '4px 0',
                                      fontSize: '12px'
                                    }}>
                                      {snippet}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />

                  {/* Pagination */}
                  {searchResults.pages > 1 && (
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                      <Pagination
                        current={currentPage}
                        total={searchResults.total}
                        pageSize={pageSize}
                        onChange={handlePageChange}
                        showSizeChanger={false}
                        showQuickJumper
                        showTotal={(total, range) =>
                          `${range[0]}-${range[1]} of ${total} results`
                        }
                      />
                    </div>
                  )}
                </Card>
              ) : (
                <Card>
                  <Empty
                    description="No documents found matching your search criteria"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Card>
              )}
            </>
          ) : (
            <Card>
              <Empty
                description="Enter a search query to find documents"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={6}>
          {/* Search History */}
          <Card
            title={
              <Space>
                <HistoryOutlined />
                Recent Searches
              </Space>
            }
            extra={
              searchHistory.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  onClick={clearSearchHistory}
                  icon={<ClearOutlined />}
                >
                  Clear
                </Button>
              )
            }
            style={{ marginBottom: '16px' }}
          >
            {searchHistory.length > 0 ? (
              <List
                size="small"
                dataSource={searchHistory.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSearchQuery(item.query);
                      handleSearch(item.query);
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Text ellipsis style={{ fontSize: '14px' }}>
                          {item.query}
                        </Text>
                      }
                      description={
                        <Space>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {item.results_count} results
                          </Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {dayjs(item.created_at).fromNow()}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description="No recent searches"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '16px 0' }}
              />
            )}
          </Card>

          {/* Search Facets */}
          {searchResults?.facets && (
            <Card title="Refine Results" style={{ marginBottom: '16px' }}>
              <Collapse ghost>
                {searchResults.facets.document_types && searchResults.facets.document_types.length > 0 && (
                  <Panel header="Document Types" key="types">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {searchResults.facets.document_types.map(type => (
                        <div key={type.type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              handleFilterChange('document_type', type.type);
                              handleSearch();
                            }}
                          >
                            {type.type}
                          </Button>
                          <Badge count={type.count} />
                        </div>
                      ))}
                    </Space>
                  </Panel>
                )}

                {searchResults.facets.top_tags && searchResults.facets.top_tags.length > 0 && (
                  <Panel header="Popular Tags" key="tags">
                    <Space wrap>
                      {searchResults.facets.top_tags.map(tag => (
                        <Tag
                          key={tag.name}
                          color="blue"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            handleFilterChange('tags', [tag.name]);
                            handleSearch();
                          }}
                        >
                          {tag.name} ({tag.count})
                        </Tag>
                      ))}
                    </Space>
                  </Panel>
                )}
              </Collapse>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}