import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, Download, Upload, MoreHorizontal,
  ChevronLeft, ChevronRight, ArrowUpDown, Eye, Edit2, Trash2,
  RefreshCw, Settings, Grid, List as ListIcon
} from 'lucide-react';
import './GenericListPage.css';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'date' | 'text' | 'daterange';
  options?: { value: string; label: string }[];
}

interface GenericListPageProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  columns: Column[];
  data: any[];
  loading?: boolean;
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRefresh?: () => void;
  filters?: FilterOption[];
  createPath?: string;
  createLabel?: string;
  onRowClick?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onView?: (row: any) => void;
  onExport?: () => void;
  onImport?: () => void;
  rowKey?: string;
  emptyMessage?: string;
  showViewToggle?: boolean;
  bulkActions?: { label: string; onClick: (selectedRows: any[]) => void; variant?: 'default' | 'danger' }[];
}

export const GenericListPage: React.FC<GenericListPageProps> = ({
  title,
  subtitle,
  icon,
  columns,
  data,
  loading = false,
  totalCount,
  pageSize = 20,
  currentPage = 1,
  onPageChange,
  onSort,
  onSearch,
  onFilter,
  onRefresh,
  filters = [],
  createPath,
  createLabel = 'Create New',
  onRowClick,
  onEdit,
  onDelete,
  onView,
  onExport,
  onImport,
  rowKey = 'id',
  emptyMessage = 'No records found',
  showViewToggle = false,
  bulkActions = [],
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : Math.ceil(data.length / pageSize);
  const displayData = totalCount ? data : data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === displayData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayData.map(row => row[rowKey])));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    if (!value) delete newFilters[key];
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  return (
    <div className="generic-list-page">
      {/* Header */}
      <div className="list-page-header">
        <div className="list-page-title-section">
          {icon && <div className="list-page-icon">{icon}</div>}
          <div>
            <h1 className="list-page-title">{title}</h1>
            {subtitle && <p className="list-page-subtitle">{subtitle}</p>}
          </div>
        </div>
        
        <div className="list-page-actions">
          {onRefresh && (
            <button className="action-btn icon-only" onClick={onRefresh} title="Refresh">
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            </button>
          )}
          {onExport && (
            <button className="action-btn" onClick={onExport}>
              <Download size={16} />
              Export
            </button>
          )}
          {onImport && (
            <button className="action-btn" onClick={onImport}>
              <Upload size={16} />
              Import
            </button>
          )}
          {createPath && (
            <Link to={createPath} className="action-btn primary">
              <Plus size={16} />
              {createLabel}
            </Link>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="list-page-toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </form>

        <div className="toolbar-actions">
          {filters.length > 0 && (
            <button 
              className={`filter-btn ${showFilters ? 'active' : ''} ${Object.keys(activeFilters).length > 0 ? 'has-filters' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
              {Object.keys(activeFilters).length > 0 && (
                <span className="filter-count">{Object.keys(activeFilters).length}</span>
              )}
            </button>
          )}
          
          {showViewToggle && (
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <ListIcon size={16} />
              </button>
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && filters.length > 0 && (
        <div className="filters-panel">
          {filters.map(filter => (
            <div key={filter.key} className="filter-item">
              <label>{filter.label}</label>
              {filter.type === 'select' && (
                <select
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                >
                  <option value="">All</option>
                  {filter.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              {filter.type === 'text' && (
                <input
                  type="text"
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  placeholder={`Filter by ${filter.label.toLowerCase()}`}
                />
              )}
              {filter.type === 'date' && (
                <input
                  type="date"
                  value={activeFilters[filter.key] || ''}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setActiveFilters({});
              onFilter?.({});
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedRows.size > 0 && bulkActions.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="selected-count">{selectedRows.size} selected</span>
          {bulkActions.map((action, index) => (
            <button
              key={index}
              className={`bulk-action-btn ${action.variant || 'default'}`}
              onClick={() => action.onClick(Array.from(selectedRows).map(id => data.find(row => row[rowKey] === id)))}
            >
              {action.label}
            </button>
          ))}
          <button className="bulk-action-btn" onClick={() => setSelectedRows(new Set())}>
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="list-page-content">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Loading...</p>
          </div>
        ) : displayData.length === 0 ? (
          <div className="empty-state">
            <p>{emptyMessage}</p>
            {createPath && (
              <Link to={createPath} className="action-btn primary">
                <Plus size={16} />
                {createLabel}
              </Link>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {bulkActions.length > 0 && (
                    <th className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === displayData.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                  )}
                  {columns.map(col => (
                    <th 
                      key={col.key}
                      style={{ width: col.width }}
                      className={col.sortable ? 'sortable' : ''}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.label}
                      {col.sortable && (
                        <ArrowUpDown size={14} className={`sort-icon ${sortKey === col.key ? 'active' : ''}`} />
                      )}
                    </th>
                  ))}
                  {(onView || onEdit || onDelete) && <th className="actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayData.map(row => (
                  <tr 
                    key={row[rowKey]}
                    className={`${onRowClick ? 'clickable' : ''} ${selectedRows.has(row[rowKey]) ? 'selected' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {bulkActions.length > 0 && (
                      <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row[rowKey])}
                          onChange={() => handleSelectRow(row[rowKey])}
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                    {(onView || onEdit || onDelete) && (
                      <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          {onView && (
                            <button className="row-action-btn" onClick={() => onView(row)} title="View">
                              <Eye size={16} />
                            </button>
                          )}
                          {onEdit && (
                            <button className="row-action-btn" onClick={() => onEdit(row)} title="Edit">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button className="row-action-btn danger" onClick={() => onDelete(row)} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid-view">
            {displayData.map(row => (
              <div 
                key={row[rowKey]} 
                className="grid-card"
                onClick={() => onRowClick?.(row)}
              >
                {columns.slice(0, 4).map(col => (
                  <div key={col.key} className="grid-card-field">
                    <span className="field-label">{col.label}</span>
                    <span className="field-value">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount || data.length)} of {totalCount || data.length}
          </span>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => onPageChange?.(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericListPage;
