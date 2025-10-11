'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Plus, Edit, Trash2, Copy, Eye, EyeOff, Calendar, Shield, Activity } from 'lucide-react';
import { apiManagementService, APIKey, APIKeyCreate, APIKeyUpdate } from '@/services/apiManagementService';

export default function APIKeyManager() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [showSecrets, setShowSecrets] = useState<{[key: number]: boolean}>({});

  const [formData, setFormData] = useState<APIKeyCreate>({
    name: '',
    description: '',
    user_id: 1,
    scopes: [],
    rate_limit_requests: 1000,
    rate_limit_window: 3600,
    expires_at: undefined
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const response = await apiManagementService.getAPIKeys();
      setApiKeys(response.items);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const response = await apiManagementService.createAPIKey(formData);
      setNewApiKey(response.api_key);
      await loadApiKeys();
      resetForm();
    } catch (error) {
      console.error('Error creating API key:', error);
    }
  };

  const handleUpdateKey = async (id: number, updates: APIKeyUpdate) => {
    try {
      await apiManagementService.updateAPIKey(id, updates);
      await loadApiKeys();
      setEditingKey(null);
    } catch (error) {
      console.error('Error updating API key:', error);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (confirm('Are you sure you want to delete this API key?')) {
      try {
        await apiManagementService.deleteAPIKey(id);
        await loadApiKeys();
      } catch (error) {
        console.error('Error deleting API key:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      user_id: 1,
      scopes: [],
      rate_limit_requests: 1000,
      rate_limit_window: 3600,
      expires_at: undefined
    });
    setShowCreateDialog(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSecretVisibility = (keyId: number) => {
    setShowSecrets(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const availableScopes = apiManagementService.getAvailableScopes();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-gray-600">Create and manage API keys for system access</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter API key name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the purpose of this API key"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate_limit_requests">Rate Limit (requests)</Label>
                  <Input
                    id="rate_limit_requests"
                    type="number"
                    value={formData.rate_limit_requests}
                    onChange={(e) => setFormData({...formData, rate_limit_requests: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="rate_limit_window">Window (seconds)</Label>
                  <Input
                    id="rate_limit_window"
                    type="number"
                    value={formData.rate_limit_window}
                    onChange={(e) => setFormData({...formData, rate_limit_window: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expires_at">Expiration Date (optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at ? new Date(formData.expires_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({...formData, expires_at: e.target.value ? e.target.value : undefined})}
                />
              </div>

              <div>
                <Label>Scopes</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableScopes.map((scope) => (
                    <div key={scope.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.value}
                        checked={formData.scopes.includes(scope.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({...formData, scopes: [...formData.scopes, scope.value]});
                          } else {
                            setFormData({...formData, scopes: formData.scopes.filter(s => s !== scope.value)});
                          }
                        }}
                      />
                      <Label htmlFor={scope.value} className="text-sm">
                        {scope.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleCreateKey} disabled={!formData.name}>
                  Create API Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {newApiKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">API Key Created Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-2 bg-white border rounded text-sm font-mono">
                {newApiKey}
              </code>
              <Button size="sm" onClick={() => copyToClipboard(newApiKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-green-700 mt-2">
              ⚠️ Save this API key now. You won't be able to see it again!
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={() => setNewApiKey('')}
            >
              I've saved it
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Keys ({apiKeys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{key.name}</div>
                      {key.description && (
                        <div className="text-sm text-gray-500">{key.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {key.key_prefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.slice(0, 2).map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                      {key.scopes.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{key.scopes.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {key.rate_limit_requests}/{key.rate_limit_window}s
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {key.expires_at && new Date(key.expires_at) < new Date() && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {key.last_used_at 
                        ? apiManagementService.formatRelativeTime(key.last_used_at)
                        : 'Never'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingKey(key)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingKey && (
        <Dialog open={!!editingKey} onOpenChange={() => setEditingKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit API Key: {editingKey.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={editingKey.is_active}
                  onCheckedChange={(checked) => 
                    setEditingKey({...editingKey, is_active: !!checked})
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingKey(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleUpdateKey(editingKey.id, {
                    is_active: editingKey.is_active
                  })}
                >
                  Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}