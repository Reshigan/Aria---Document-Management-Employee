import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Eye, 
  Edit, 
  Crown,
  Key,
  Activity,
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
  Mail,
  Building,
  MapPin
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  is_active: boolean;
  is_verified: boolean;
  two_factor_enabled: boolean;
  last_login_at?: string;
  created_at: string;
  roles: Array<{
    id: number;
    name: string;
    display_name: string;
  }>;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  priority: number;
  color: string;
  is_system_role: boolean;
}

interface UserStatistics {
  total_users: number;
  active_users: number;
  verified_users: number;
  locked_users: number;
  active_sessions: number;
  recent_registrations: number;
  departments: Array<{
    name: string;
    count: number;
  }>;
  user_activity: {
    login_success_rate: number;
    average_session_duration: number;
  };
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form state for creating users
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
    timezone: 'UTC',
    language: 'en'
  });

  // Form state for creating roles
  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
    priority: 0,
    color: '#6B7280'
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadStatistics();
  }, []);

  const loadUsers = async () => {
    try {
      // Mock data for demonstration
      const mockUsers: User[] = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@aria-docs.com',
          first_name: 'System',
          last_name: 'Administrator',
          display_name: 'System Administrator',
          avatar_url: undefined,
          job_title: 'System Administrator',
          department: 'IT',
          is_active: true,
          is_verified: true,
          two_factor_enabled: true,
          last_login_at: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          roles: [
            { id: 1, name: 'admin', display_name: 'Administrator' }
          ]
        },
        {
          id: 2,
          username: 'jdoe',
          email: 'john.doe@company.com',
          first_name: 'John',
          last_name: 'Doe',
          display_name: 'John Doe',
          job_title: 'Document Manager',
          department: 'Operations',
          is_active: true,
          is_verified: true,
          two_factor_enabled: false,
          last_login_at: new Date(Date.now() - 7200000).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
          roles: [
            { id: 2, name: 'manager', display_name: 'Manager' }
          ]
        },
        {
          id: 3,
          username: 'asmith',
          email: 'alice.smith@company.com',
          first_name: 'Alice',
          last_name: 'Smith',
          display_name: 'Alice Smith',
          job_title: 'Content Editor',
          department: 'Content',
          is_active: true,
          is_verified: false,
          two_factor_enabled: false,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          roles: [
            { id: 3, name: 'editor', display_name: 'Editor' }
          ]
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadRoles = async () => {
    try {
      // Mock roles data
      const mockRoles: Role[] = [
        {
          id: 1,
          name: 'admin',
          display_name: 'Administrator',
          description: 'Full system access with all permissions',
          priority: 100,
          color: '#DC2626',
          is_system_role: true
        },
        {
          id: 2,
          name: 'manager',
          display_name: 'Manager',
          description: 'Management access with user and content management permissions',
          priority: 75,
          color: '#059669',
          is_system_role: true
        },
        {
          id: 3,
          name: 'editor',
          display_name: 'Editor',
          description: 'Content editing and document management permissions',
          priority: 50,
          color: '#2563EB',
          is_system_role: true
        },
        {
          id: 4,
          name: 'user',
          display_name: 'User',
          description: 'Basic user access with read and limited write permissions',
          priority: 25,
          color: '#6B7280',
          is_system_role: true
        }
      ];
      setRoles(mockRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      // Mock statistics
      const mockStats: UserStatistics = {
        total_users: 25,
        active_users: 23,
        verified_users: 20,
        locked_users: 1,
        active_sessions: 8,
        recent_registrations: 3,
        departments: [
          { name: 'IT', count: 5 },
          { name: 'Operations', count: 8 },
          { name: 'Content', count: 6 },
          { name: 'Sales', count: 4 },
          { name: 'HR', count: 2 }
        ],
        user_activity: {
          login_success_rate: 94.5,
          average_session_duration: 125.3
        }
      };
      setStatistics(mockStats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const createUser = async () => {
    setLoading(true);
    try {
      // Mock creation - in real app would call API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user: User = {
        id: Date.now(),
        username: newUser.username,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        display_name: `${newUser.first_name} ${newUser.last_name}`,
        job_title: newUser.job_title,
        department: newUser.department,
        is_active: true,
        is_verified: false,
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        roles: [{ id: 4, name: 'user', display_name: 'User' }]
      };
      
      setUsers(prev => [user, ...prev]);
      setShowCreateDialog(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        job_title: '',
        department: '',
        timezone: 'UTC',
        language: 'en'
      });
    } catch (error) {
      alert(`Failed to create user: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    setLoading(true);
    try {
      // Mock creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const role: Role = {
        id: Date.now(),
        name: newRole.name,
        display_name: newRole.display_name,
        description: newRole.description,
        priority: newRole.priority,
        color: newRole.color,
        is_system_role: false
      };
      
      setRoles(prev => [role, ...prev]);
      setShowRoleDialog(false);
      setNewRole({
        name: '',
        display_name: '',
        description: '',
        priority: 0,
        color: '#6B7280'
      });
    } catch (error) {
      alert(`Failed to create role: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (!user.is_verified) {
      return <Badge variant="outline">Unverified</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getRoleBadge = (role: { name: string; display_name: string }) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-green-100 text-green-800',
      editor: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge 
        variant="secondary" 
        className={colors[role.name as keyof typeof colors] || 'bg-gray-100 text-gray-800'}
      >
        {role.display_name}
      </Badge>
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !departmentFilter || user.department === departmentFilter;
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active) ||
      (statusFilter === 'verified' && user.is_verified) ||
      (statusFilter === 'unverified' && !user.is_verified);
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadUsers} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Define a new role with specific permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role_name">Role Name</Label>
                  <Input
                    id="role_name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="e.g., moderator"
                  />
                </div>
                <div>
                  <Label htmlFor="role_display_name">Display Name</Label>
                  <Input
                    id="role_display_name"
                    value={newRole.display_name}
                    onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                    placeholder="e.g., Moderator"
                  />
                </div>
                <div>
                  <Label htmlFor="role_description">Description</Label>
                  <Input
                    id="role_description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Role description"
                  />
                </div>
                <div>
                  <Label htmlFor="role_priority">Priority (0-100)</Label>
                  <Input
                    id="role_priority"
                    type="number"
                    min="0"
                    max="100"
                    value={newRole.priority}
                    onChange={(e) => setNewRole({ ...newRole, priority: parseInt(e.target.value) })}
                  />
                </div>
                <Button onClick={createRole} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create Role'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="johndoe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john.doe@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={newUser.job_title}
                    onChange={(e) => setNewUser({ ...newUser, job_title: e.target.value })}
                    placeholder="Document Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    placeholder="Operations"
                  />
                </div>
                <Button onClick={createUser} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{statistics.total_users}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{statistics.active_users}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                  <p className="text-2xl font-bold">{statistics.active_sessions}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Login Success</p>
                  <p className="text-2xl font-bold">{statistics.user_activity.login_success_rate.toFixed(1)}%</p>
                </div>
                <Shield className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Content">Content</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>
                Manage user accounts and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{user.display_name}</h3>
                              {getStatusBadge(user)}
                              {user.two_factor_enabled && (
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  2FA
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">@{user.username} • {user.email}</p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              {user.job_title && (
                                <span className="flex items-center">
                                  <Building className="h-3 w-3 mr-1" />
                                  {user.job_title}
                                </span>
                              )}
                              {user.department && (
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {user.department}
                                </span>
                              )}
                              {user.last_login_at && (
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Last login: {new Date(user.last_login_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => getRoleBadge(role))}
                          </div>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Details</DialogTitle>
                                  <DialogDescription>
                                    Detailed information about {user.display_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-4">
                                    <Avatar className="h-16 w-16">
                                      <AvatarImage src={user.avatar_url} />
                                      <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h3 className="text-lg font-semibold">{user.display_name}</h3>
                                      <p className="text-muted-foreground">@{user.username}</p>
                                      <div className="flex items-center space-x-2 mt-1">
                                        {getStatusBadge(user)}
                                        {user.two_factor_enabled && (
                                          <Badge variant="outline">
                                            <Shield className="h-3 w-3 mr-1" />
                                            2FA Enabled
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Email</Label>
                                      <p className="text-sm flex items-center">
                                        <Mail className="h-4 w-4 mr-2" />
                                        {user.email}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Job Title</Label>
                                      <p className="text-sm">{user.job_title || 'Not specified'}</p>
                                    </div>
                                    <div>
                                      <Label>Department</Label>
                                      <p className="text-sm">{user.department || 'Not specified'}</p>
                                    </div>
                                    <div>
                                      <Label>Created</Label>
                                      <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {user.last_login_at && (
                                      <div>
                                        <Label>Last Login</Label>
                                        <p className="text-sm">{new Date(user.last_login_at).toLocaleString()}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <Label>Roles</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {user.roles.map((role) => getRoleBadge(role))}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {/* Roles List */}
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Manage roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <Card key={role.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{role.display_name}</h3>
                            {role.is_system_role && (
                              <Badge variant="outline">
                                <Crown className="h-3 w-3 mr-1" />
                                System
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <p className="text-xs text-muted-foreground">Priority: {role.priority}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Key className="h-4 w-4 mr-2" />
                          Permissions
                        </Button>
                        {!role.is_system_role && (
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          {/* Departments */}
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                User distribution across departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statistics?.departments && (
                <div className="space-y-4">
                  {statistics.departments.map((dept) => (
                    <div key={dept.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <Badge variant="secondary">{dept.count} users</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManager;