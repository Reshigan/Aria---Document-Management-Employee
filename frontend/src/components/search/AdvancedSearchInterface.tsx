'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, X, FileText, Calendar, Tag, User, Folder, Clock, Download } from 'lucide-react';

interface SearchResult {
  id: number;
  document_id: number;
  title: string;
  content_preview: string;
  content_type: string;
  metadata: any;
  tags: string[];
  word_count: number;
  created_at: string;
  last_indexed_at: string;
}

interface SearchFacet {
  name: string;
  display_name: string;
  type: string;
  values: Array<{
    value: string;
    display_value: string;
    count: number;
    selected: boolean;
  }>;
}

interface SearchFilters {
  content_type?: string;
  tags?: string[];
  date_range?: {
    start?: string;
    end?: string;
  };
  [key: string]: any;
}

export default function AdvancedSearchInterface() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<SearchFacet[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadSuggestions = async () => {
    try {
      const mockSuggestions = [
        'document management',
        'document processing',
        'document workflow',
        'document archive',
        'document security'
      ].filter(s => s.toLowerCase().includes(query.toLowerCase()));
      
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const mockResults: SearchResult[] = [
        {
          id: 1,
          document_id: 101,
          title: 'Project Documentation Guidelines',
          content_preview: 'This document outlines the standard guidelines for creating and maintaining project documentation...',
          content_type: 'document',
          metadata: { author: 'John Doe', department: 'Engineering' },
          tags: ['documentation', 'guidelines', 'project'],
          word_count: 1250,
          created_at: '2024-01-15T10:30:00Z',
          last_indexed_at: '2024-01-15T10:35:00Z'
        },
        {
          id: 2,
          document_id: 102,
          title: 'API Integration Manual',
          content_preview: 'Complete guide for integrating with our REST API endpoints, including authentication and rate limiting...',
          content_type: 'document',
          metadata: { author: 'Jane Smith', department: 'Engineering' },
          tags: ['api', 'integration', 'manual'],
          word_count: 2100,
          created_at: '2024-01-14T14:20:00Z',
          last_indexed_at: '2024-01-14T14:25:00Z'
        }
      ];

      const mockFacets: SearchFacet[] = [
        {
          name: 'content_type',
          display_name: 'Content Type',
          type: 'text',
          values: [
            { value: 'document', display_value: 'Document', count: 15, selected: false },
            { value: 'image', display_value: 'Image', count: 8, selected: false },
            { value: 'video', display_value: 'Video', count: 3, selected: false }
          ]
        },
        {
          name: 'department',
          display_name: 'Department',
          type: 'text',
          values: [
            { value: 'engineering', display_value: 'Engineering', count: 12, selected: false },
            { value: 'marketing', display_value: 'Marketing', count: 6, selected: false },
            { value: 'sales', display_value: 'Sales', count: 4, selected: false }
          ]
        }
      ];

      setResults(mockResults);
      setFacets(mockFacets);
      setTotalResults(mockResults.length);
      setSuggestions([]);
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (facetName: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (facetName === 'tags') {
        if (!newFilters.tags) newFilters.tags = [];
        if (checked) {
          newFilters.tags.push(value);
        } else {
          newFilters.tags = newFilters.tags.filter(tag => tag !== value);
        }
      } else {
        if (checked) {
          newFilters[facetName] = value;
        } else {
          delete newFilters[facetName];
        }
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getActiveFilterCount = () => {
    return Object.keys(filters).length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Search</h2>
          <p className="text-gray-600">Search through documents, content, and metadata</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {getActiveFilterCount() > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents, content, metadata..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  className="pl-10"
                />
                
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setQuery(suggestion);
                          setSuggestions([]);
                          performSearch();
                        }}
                      >
                        <Search className="inline h-4 w-4 mr-2 text-gray-400" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={performSearch} disabled={loading}>
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {showFilters && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  {getActiveFilterCount() > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {facets.map((facet) => (
                  <div key={facet.name}>
                    <Label className="text-sm font-medium">{facet.display_name}</Label>
                    <div className="mt-2 space-y-2">
                      {facet.values.map((value) => (
                        <div key={value.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${facet.name}-${value.value}`}
                            checked={value.selected || filters[facet.name] === value.value}
                            onCheckedChange={(checked) => 
                              handleFilterChange(facet.name, value.value, !!checked)
                            }
                          />
                          <Label 
                            htmlFor={`${facet.name}-${value.value}`}
                            className="text-sm flex-1 cursor-pointer"
                          >
                            {value.display_value}
                          </Label>
                          <Badge variant="secondary" className="text-xs">
                            {value.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <Label className="text-sm font-medium">Date Range</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      type="date"
                      placeholder="Start date"
                      value={filters.date_range?.start || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        date_range: { ...prev.date_range, start: e.target.value }
                      }))}
                    />
                    <Input
                      type="date"
                      placeholder="End date"
                      value={filters.date_range?.end || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        date_range: { ...prev.date_range, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
          {totalResults > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {totalResults.toLocaleString()} results
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                          {result.title}
                        </h3>
                        <Badge variant="secondary">{result.content_type}</Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {result.content_preview}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {result.metadata.author && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{result.metadata.author}</span>
                          </div>
                        )}
                        
                        {result.metadata.department && (
                          <div className="flex items-center space-x-1">
                            <Folder className="h-3 w-3" />
                            <span>{result.metadata.department}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(result.created_at)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{result.word_count} words</span>
                        </div>
                      </div>
                      
                      {result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {result.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {loading && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {!loading && results.length === 0 && query && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}