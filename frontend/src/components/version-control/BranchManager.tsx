'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  GitBranch, 
  Plus, 
  Settings, 
  Trash2, 
  Shield, 
  Star,
  Clock,
  User,
  GitMerge,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { versionControlService, DocumentBranch } from '@/services/versionControlService';

interface BranchManagerProps {
  documentId: number;
  onBranchCreated?: (branch: DocumentBranch) => void;
  onBranchUpdated?: (branch: DocumentBranch) => void;
  onBranchDeleted?: (branchId: number) => void;
}

export default function BranchManager({ 
  documentId, 
  onBranchCreated, 
  onBranchUpdated, 
  onBranchDeleted 
}: BranchManagerProps) {
  const [branches, setBranches] = useState<DocumentBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<DocumentBranch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source_branch: '',
    is_protected: false,
    is_default: false
  });

  useEffect(() => {
    loadBranches();
  }, [documentId]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const branchesData = await versionControlService.getDocumentBranches(documentId);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) return;

    try {
      const newBranch = await versionControlService.createDocumentBranch({
        document_id: documentId,
        ...formData
      });

      setBranches(prev => [...prev, newBranch]);
      setShowCreateDialog(false);
      resetForm();

      if (onBranchCreated) {
        onBranchCreated(newBranch);
      }
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingBranch || !formData.name) return;

    try {
      const updatedBranch = await versionControlService.updateDocumentBranch(editingBranch.id, {
        name: formData.name,
        description: formData.description,
        is_protected: formData.is_protected,
        is_default: formData.is_default
      });

      setBranches(prev => prev.map(branch => 
        branch.id === editingBranch.id ? updatedBranch : branch
      ));
      setEditingBranch(null);
      resetForm();

      if (onBranchUpdated) {
        onBranchUpdated(updatedBranch);
      }
    } catch (error) {
      console.error('Error updating branch:', error);
    }
  };

  const handleDeleteBranch = async (branchId: number) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    try {
      await versionControlService.deleteDocumentBranch(branchId);
      setBranches(prev => prev.filter(branch => branch.id !== branchId));

      if (onBranchDeleted) {
        onBranchDeleted(branchId);
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      source_branch: '',
      is_protected: false,
      is_default: false
    });
  };

  const openEditDialog = (branch: DocumentBranch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      description: branch.description || '',
      source_branch: '',
      is_protected: branch.is_protected,
      is_default: branch.is_default
    });
  };

  const renderBranchForm = () => (
    <form onSubmit={editingBranch ? handleUpdateBranch : handleCreateBranch} className="space-y-4">
      <div>
        <Label htmlFor="name">Branch Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter branch name"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the purpose of this branch"
          rows={3}
        />
      </div>

      {!editingBranch && (
        <div>
          <Label htmlFor="source_branch">Source Branch</Label>
          <Select
            value={formData.source_branch}
            onValueChange={(value) => setFormData(prev => ({ ...prev, source_branch: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source branch (optional)" />
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
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_protected"
            checked={formData.is_protected}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_protected: !!checked }))}
          />
          <Label htmlFor="is_protected" className="text-sm">
            Protected branch (requires special permissions to modify)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: !!checked }))}
          />
          <Label htmlFor="is_default" className="text-sm">
            Set as default branch
          </Label>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            if (editingBranch) {
              setEditingBranch(null);
            } else {
              setShowCreateDialog(false);
            }
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {editingBranch ? 'Update Branch' : 'Create Branch'}
        </Button>
      </div>
    </form>
  );

  const renderBranchCard = (branch: DocumentBranch) => (
    <Card key={branch.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <GitBranch className="h-5 w-5 text-green-500" />
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium">{branch.name}</h4>
                {branch.is_default && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Default
                  </Badge>
                )}
                {branch.is_protected && (
                  <Badge variant="destructive" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Protected
                  </Badge>
                )}
                {!branch.is_active && (
                  <Badge variant="outline" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
              {branch.description && (
                <p className="text-sm text-gray-600 mt-1">{branch.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>User {branch.created_by}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(branch.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(branch)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit
            </Button>
            {!branch.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteBranch(branch.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <GitBranch className="h-6 w-6 text-green-500" />
          <div>
            <h2 className="text-xl font-bold">Branch Management</h2>
            <p className="text-gray-600">Create and manage document branches</p>
          </div>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            {renderBranchForm()}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading branches...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Branches Found</h3>
                <p className="text-gray-600 mb-4">Create your first branch to start organizing document versions</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Branch
                </Button>
              </CardContent>
            </Card>
          ) : (
            branches.map(renderBranchCard)
          )}
        </div>
      )}

      {/* Edit Branch Dialog */}
      <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          {renderBranchForm()}
        </DialogContent>
      </Dialog>
    </div>
  );
}