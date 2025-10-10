'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitCompare, 
  ArrowRight, 
  Download, 
  Eye, 
  FileText, 
  Clock, 
  User,
  Plus,
  Minus,
  Equal,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { versionControlService, VersionComparison, DocumentVersion } from '@/services/versionControlService';

interface VersionComparisonProps {
  documentId: number;
  version1Id?: number;
  version2Id?: number;
  onClose?: () => void;
}

export default function VersionComparison({ 
  documentId, 
  version1Id, 
  version2Id, 
  onClose 
}: VersionComparisonProps) {
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [version1, setVersion1] = useState<DocumentVersion | null>(null);
  const [version2, setVersion2] = useState<DocumentVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('diff');

  useEffect(() => {
    if (version1Id && version2Id) {
      loadComparison();
    }
  }, [version1Id, version2Id]);

  const loadComparison = async () => {
    if (!version1Id || !version2Id) return;

    setLoading(true);
    try {
      const [comparisonData, v1Data, v2Data] = await Promise.all([
        versionControlService.compareVersions(version1Id, version2Id),
        versionControlService.getDocumentVersion(version1Id),
        versionControlService.getDocumentVersion(version2Id)
      ]);

      setComparison(comparisonData);
      setVersion1(v1Data);
      setVersion2(v2Data);
    } catch (error) {
      console.error('Error loading version comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderDiffLine = (line: any, index: number) => {
    const getLineClass = () => {
      switch (line.type) {
        case 'added':
          return 'bg-green-50 border-l-4 border-green-500';
        case 'removed':
          return 'bg-red-50 border-l-4 border-red-500';
        case 'modified':
          return 'bg-yellow-50 border-l-4 border-yellow-500';
        default:
          return 'bg-gray-50';
      }
    };

    const getLineIcon = () => {
      switch (line.type) {
        case 'added':
          return <Plus className="h-4 w-4 text-green-600" />;
        case 'removed':
          return <Minus className="h-4 w-4 text-red-600" />;
        case 'modified':
          return <Equal className="h-4 w-4 text-yellow-600" />;
        default:
          return null;
      }
    };

    return (
      <div key={index} className={`p-2 font-mono text-sm ${getLineClass()}`}>
        <div className="flex items-center space-x-2">
          <span className="w-8 text-gray-400 text-xs">{line.line_number}</span>
          {getLineIcon()}
          <span className="flex-1">{line.content}</span>
        </div>
      </div>
    );
  };

  const renderSideBySide = () => {
    if (!comparison?.diff_content) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Version {version1?.version_number}</span>
              <Badge variant="outline">{version1?.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {comparison.diff_content.old_lines?.map((line: string, index: number) => (
                <div key={index} className="p-2 font-mono text-sm border-b">
                  <span className="w-8 text-gray-400 text-xs mr-2">{index + 1}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Version {version2?.version_number}</span>
              <Badge variant="outline">{version2?.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {comparison.diff_content.new_lines?.map((line: string, index: number) => (
                <div key={index} className="p-2 font-mono text-sm border-b">
                  <span className="w-8 text-gray-400 text-xs mr-2">{index + 1}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderUnifiedDiff = () => {
    if (!comparison?.diff_content?.unified_diff) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Unified Diff</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {comparison.diff_content.unified_diff.map((line: any, index: number) => 
              renderDiffLine(line, index)
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMetadata = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Version 1 Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Version Number</span>
            <span className="font-mono">{version1?.version_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <Badge variant="outline">{version1?.status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Created By</span>
            <span>User {version1?.created_by}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Created At</span>
            <span>{version1 ? new Date(version1.created_at).toLocaleDateString() : ''}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">File Size</span>
            <span>{version1 ? versionControlService.formatFileSize(version1.file_size) : ''}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Version 2 Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Version Number</span>
            <span className="font-mono">{version2?.version_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <Badge variant="outline">{version2?.status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Created By</span>
            <span>User {version2?.created_by}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Created At</span>
            <span>{version2 ? new Date(version2.created_at).toLocaleDateString() : ''}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">File Size</span>
            <span>{version2 ? versionControlService.formatFileSize(version2.file_size) : ''}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Lines Added</p>
              <p className="text-2xl font-bold text-green-600">
                {comparison?.changes_summary?.lines_added || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Minus className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Lines Removed</p>
              <p className="text-2xl font-bold text-red-600">
                {comparison?.changes_summary?.lines_removed || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Equal className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Lines Modified</p>
              <p className="text-2xl font-bold text-yellow-600">
                {comparison?.changes_summary?.lines_modified || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Similarity</p>
              <p className="text-2xl font-bold text-blue-600">
                {comparison?.similarity_score ? `${Math.round(comparison.similarity_score * 100)}%` : '0%'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Comparison Available</h3>
        <p className="text-gray-600">Select two versions to compare</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <GitCompare className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-bold">Version Comparison</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>v{version1?.version_number}</span>
              <ArrowRight className="h-4 w-4" />
              <span>v{version2?.version_number}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Diff
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Files
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {renderStats()}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="diff">Unified Diff</TabsTrigger>
          <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="diff" className="mt-6">
          {renderUnifiedDiff()}
        </TabsContent>

        <TabsContent value="side-by-side" className="mt-6">
          {renderSideBySide()}
        </TabsContent>

        <TabsContent value="metadata" className="mt-6">
          {renderMetadata()}
        </TabsContent>
      </Tabs>
    </div>
  );
}