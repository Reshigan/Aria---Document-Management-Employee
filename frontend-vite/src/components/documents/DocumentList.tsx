import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  File, 
  FileText, 
  Image, 
  Download, 
  Eye, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  User,
  FileType,
  Search,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document } from '@/types';

interface DocumentListProps {
  documents: Document[];
  onPreview?: (document: Document) => void;
  onDownload?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type';

export function DocumentList({
  documents,
  onPreview,
  onDownload,
  onDelete,
  className
}: DocumentListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return Image;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || doc.type.includes(selectedType);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'size':
          return b.size - a.size;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  const fileTypes = ['all', 'pdf', 'image', 'document', 'text'];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input-field w-auto"
          >
            {fileTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="input-field w-auto"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="type">Sort by Type</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      <AnimatePresence mode="wait">
        {filteredAndSortedDocuments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <File className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Upload your first document to get started'
              }
            </p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredAndSortedDocuments.map((document, index) => {
              const IconComponent = getFileIcon(document.type);
              return (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200 card-hover"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate" title={document.name}>
                          {document.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(document.size)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-muted rounded">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(document.uploadedAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{document.uploadedBy}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPreview?.(document)}
                      className="flex-1 btn-secondary text-xs py-1.5"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </button>
                    <button
                      onClick={() => onDownload?.(document)}
                      className="p-1.5 hover:bg-muted rounded"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDelete?.(document)}
                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {filteredAndSortedDocuments.map((document, index) => {
              const IconComponent = getFileIcon(document.type);
              return (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="group bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" title={document.name}>
                        {document.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span>{formatFileSize(document.size)}</span>
                        <span>{formatDate(document.uploadedAt)}</span>
                        <span>{document.uploadedBy}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onPreview?.(document)}
                        className="btn-secondary text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </button>
                      <button
                        onClick={() => onDownload?.(document)}
                        className="p-2 hover:bg-muted rounded"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete?.(document)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}