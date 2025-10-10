'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  Tag, 
  Clock, 
  User, 
  FileText, 
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Activity,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { versionControlService, DocumentVersion, DocumentBranch, MergeRequest, VersionTag } from '@/services/versionControlService';

export default function VersionControlPage() {
  const [activeTab, setActiveTab] = useState('versions');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [branches, setBranches] = useState<DocumentBranch[]>([]);
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>([]);
  const [tags, setTags] = useState<VersionTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [selectedDocument]);

  const loadData = async () => {
    if (!selectedDocument) return;
    
    setLoading(true);
    try {
      const [versionsData, branchesData, mergeRequestsData, tagsData, statsData] = await Promise.all([
        versionControlService.getDocumentVersions(selectedDocument),
        versionControlService.getDocumentBranches(selectedDocument),
        versionControlService.getMergeRequests({ document_id: selectedDocument }),
        versionControlService.getVersionTags(selectedDocument),
        versionControlService.getVersionControlStats(selectedDocument)
      ]);

      setVersions(versionsData.items);
      setBranches(branchesData);
      setMergeRequests(mergeRequestsData.items);
      setTags(tagsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading version control data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return versionControlService.getVersionStatusColor(status);
  };

  const getMergeStatusColor = (status: string) => {
    return versionControlService.getMergeStatusColor(status);
  };

  const formatFileSize = (bytes: number) => {
    return versionControlService.formatFileSize(bytes);
  };

  const formatVersionNumber = (version: string) => {
    return versionControlService.formatVersionNumber(version);
  };

  const renderVersionsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search versions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {versions.map((version) => (
          <Card key={version.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <GitCommit className="h-5 w-5 text-blue-500" />
                    <span className="font-mono text-sm font-medium">
                      {formatVersionNumber(version.version_number)}
                    </span>
                  </div>
                  <Badge 
                    style={{ backgroundColor: getStatusColor(version.status) }}
                    className="text-white"
                  >
                    {version.status}
                  </Badge>
                  {version.is_current && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                  {version.is_published && (
                    <Badge variant="outline">Published</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>User {version.created_by}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{new Date(version.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mt-3">
                <h4 className="font-medium">{version.title}</h4>
                {version.description && (
                  <p className="text-sm text-gray-600 mt-1">{version.description}</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Branch: {version.branch_name}</span>
                  <span>Size: {formatFileSize(version.file_size)}</span>
                  <span>Changes: {version.changes_count}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <GitBranch className="h-4 w-4 mr-1" />
                    Compare
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderBranchesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Document Branches</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Branch
        </Button>
      </div>

      <div className="grid gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <GitBranch className="h-5 w-5 text-green-500" />
                  <div>
                    <h4 className="font-medium">{branch.name}</h4>
                    {branch.description && (
                      <p className="text-sm text-gray-600">{branch.description}</p>
                    )}
                  </div>
                  {branch.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                  {branch.is_protected && (
                    <Badge variant="destructive">Protected</Badge>
                  )}
                  {!branch.is_active && (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>User {branch.created_by}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{new Date(branch.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderMergeRequestsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Merge Requests</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Merge Request
        </Button>
      </div>

      <div className="grid gap-4">
        {mergeRequests.map((mr) => (
          <Card key={mr.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <GitMerge className="h-5 w-5 text-purple-500" />
                  <div>
                    <h4 className="font-medium">{mr.title}</h4>
                    {mr.description && (
                      <p className="text-sm text-gray-600">{mr.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
                      <span>{mr.source_branch} → {mr.target_branch}</span>
                    </div>
                  </div>
                  <Badge 
                    style={{ backgroundColor: getMergeStatusColor(mr.status) }}
                    className="text-white"
                  >
                    {mr.status}
                  </Badge>
                  {mr.has_conflicts && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Conflicts
                    </Badge>
                  )}
                  {mr.auto_mergeable && !mr.has_conflicts && (
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Auto-mergeable
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>User {mr.created_by}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{new Date(mr.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTagsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Version Tags</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Tag
        </Button>
      </div>

      <div className="grid gap-4">
        {tags.map((tag) => (
          <Card key={tag.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Tag className="h-5 w-5 text-orange-500" />
                  <div>
                    <h4 className="font-medium">{tag.name}</h4>
                    {tag.description && (
                      <p className="text-sm text-gray-600">{tag.description}</p>
                    )}
                  </div>
                  <Badge variant="outline">{tag.tag_type}</Badge>
                  {tag.is_protected && (
                    <Badge variant="destructive">Protected</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  <span>User {tag.created_by}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{new Date(tag.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GitCommit className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Versions</p>
                <p className="text-2xl font-bold">{stats?.total_versions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Active Branches</p>
                <p className="text-2xl font-bold">{stats?.total_branches || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GitMerge className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Merge Requests</p>
                <p className="text-2xl font-bold">{stats?.total_merge_requests || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Tags</p>
                <p className="text-2xl font-bold">{stats?.total_tags || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recent_activity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                <div className="flex-shrink-0">
                  {activity.type === 'version' && <GitCommit className="h-4 w-4 text-blue-500" />}
                  {activity.type === 'branch' && <GitBranch className="h-4 w-4 text-green-500" />}
                  {activity.type === 'merge' && <GitMerge className="h-4 w-4 text-purple-500" />}
                  {activity.type === 'tag' && <Tag className="h-4 w-4 text-orange-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    {activity.type === 'version' && `New version ${activity.version_number} created`}
                    {activity.type === 'branch' && 'New branch created'}
                    {activity.type === 'merge' && 'Merge request created'}
                    {activity.type === 'tag' && 'New tag created'}
                  </p>
                  <p className="text-xs text-gray-500">
                    by User {activity.created_by} • {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Version Control</h1>
          <p className="text-gray-600">Manage document versions, branches, and merges</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {!selectedDocument && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Document</h3>
            <p className="text-gray-600 mb-4">Choose a document to view its version control history</p>
            <Button onClick={() => setSelectedDocument(1)}>
              Select Document
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedDocument && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="versions" className="flex items-center space-x-2">
              <GitCommit className="h-4 w-4" />
              <span>Versions</span>
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex items-center space-x-2">
              <GitBranch className="h-4 w-4" />
              <span>Branches</span>
            </TabsTrigger>
            <TabsTrigger value="merges" className="flex items-center space-x-2">
              <GitMerge className="h-4 w-4" />
              <span>Merges</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Tags</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Statistics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="mt-6">
            {renderVersionsTab()}
          </TabsContent>

          <TabsContent value="branches" className="mt-6">
            {renderBranchesTab()}
          </TabsContent>

          <TabsContent value="merges" className="mt-6">
            {renderMergeRequestsTab()}
          </TabsContent>

          <TabsContent value="tags" className="mt-6">
            {renderTagsTab()}
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            {renderStatsTab()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}