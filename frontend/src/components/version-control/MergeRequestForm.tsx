'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  GitMerge, 
  GitBranch, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  FileText,
  Settings
} from 'lucide-react';
import { versionControlService, DocumentBranch, MergeRequest, MergeConflict } from '@/services/versionControlService';

interface MergeRequestFormProps {
  documentId: number;
  sourceBranch?: string;
  targetBranch?: string;
  onSubmit?: (mergeRequest: MergeRequest) => void;
  onCancel?: () => void;
}

export default function MergeRequestForm({ 
  documentId, 
  sourceBranch, 
  targetBranch, 
  onSubmit, 
  onCancel 
}: MergeRequestFormProps) {
  const [branches, setBranches] = useState<DocumentBranch[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    source_branch: sourceBranch || '',
    target_branch: targetBranch || '',
    auto_merge: false,
    delete_source_branch: false,
    squash_commits: false
  });
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [canMerge, setCanMerge] = useState(true);

  useEffect(() => {
    loadBranches();
  }, [documentId]);

  useEffect(() => {
    if (formData.source_branch && formData.target_branch) {
      checkMergeability();
    }
  }, [formData.source_branch, formData.target_branch]);

  const loadBranches = async () => {
    try {
      const branchesData = await versionControlService.getDocumentBranches(documentId);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const checkMergeability = async () => {
    if (!formData.source_branch || !formData.target_branch) return;

    setChecking(true);
    try {
      const conflictsData = await versionControlService.checkMergeConflicts(
        documentId,
        formData.source_branch,
        formData.target_branch
      );
      
      setConflicts(conflictsData);
      setCanMerge(conflictsData.length === 0);
    } catch (error) {
      console.error('Error checking merge conflicts:', error);
      setCanMerge(false);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.source_branch || !formData.target_branch) {
      return;
    }

    setLoading(true);
    try {
      const mergeRequest = await versionControlService.createMergeRequest({
        document_id: documentId,
        ...formData
      });

      if (onSubmit) {
        onSubmit(mergeRequest);
      }
    } catch (error) {
      console.error('Error creating merge request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderConflictsList = () => {
    if (conflicts.length === 0) return null;

    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>Merge Conflicts Detected</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="p-3 bg-white rounded border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{conflict.conflict_type}</span>
                <Badge variant="destructive" className="text-xs">
                  {conflict.resolution_status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{conflict.description}</p>
              <div className="text-xs text-gray-500">
                Line {conflict.line_number} • {conflict.file_path}
              </div>
            </div>
          ))}
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              These conflicts must be resolved before the merge request can be completed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMergeabilityStatus = () => {
    if (checking) {
      return (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Checking mergeability...</span>
        </div>
      );
    }

    if (!formData.source_branch || !formData.target_branch) {
      return null;
    }

    return (
      <div className="flex items-center space-x-2 text-sm">
        {canMerge ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-700">No conflicts detected - ready to merge</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">Conflicts detected - manual resolution required</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <GitMerge className="h-6 w-6 text-purple-500" />
        <div>
          <h2 className="text-xl font-bold">Create Merge Request</h2>
          <p className="text-gray-600">Merge changes from one branch into another</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter merge request title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the changes being merged"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Branch Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source_branch">Source Branch *</Label>
                <Select
                  value={formData.source_branch}
                  onValueChange={(value) => handleInputChange('source_branch', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.name}>
                        <div className="flex items-center space-x-2">
                          <GitBranch className="h-4 w-4" />
                          <span>{branch.name}</span>
                          {branch.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          {branch.is_protected && (
                            <Badge variant="destructive" className="text-xs">Protected</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target_branch">Target Branch *</Label>
                <Select
                  value={formData.target_branch}
                  onValueChange={(value) => handleInputChange('target_branch', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.name}>
                        <div className="flex items-center space-x-2">
                          <GitBranch className="h-4 w-4" />
                          <span>{branch.name}</span>
                          {branch.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          {branch.is_protected && (
                            <Badge variant="destructive" className="text-xs">Protected</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              {renderMergeabilityStatus()}
            </div>
          </CardContent>
        </Card>

        {conflicts.length > 0 && renderConflictsList()}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Merge Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto_merge"
                checked={formData.auto_merge}
                onCheckedChange={(checked) => handleInputChange('auto_merge', checked)}
                disabled={!canMerge}
              />
              <Label htmlFor="auto_merge" className="text-sm">
                Enable auto-merge when all checks pass
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="delete_source_branch"
                checked={formData.delete_source_branch}
                onCheckedChange={(checked) => handleInputChange('delete_source_branch', checked)}
              />
              <Label htmlFor="delete_source_branch" className="text-sm">
                Delete source branch after merge
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="squash_commits"
                checked={formData.squash_commits}
                onCheckedChange={(checked) => handleInputChange('squash_commits', checked)}
              />
              <Label htmlFor="squash_commits" className="text-sm">
                Squash commits into a single commit
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={loading || !canMerge || !formData.title || !formData.source_branch || !formData.target_branch}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <GitMerge className="h-4 w-4 mr-2" />
                Create Merge Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}