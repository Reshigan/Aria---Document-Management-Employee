/**
 * User Management Page
 * List, invite, edit, and manage users
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/shared/DataTable';
import {
  Users, UserPlus, Mail, Shield, Trash2, RotateCcw,
  CheckCircle, XCircle, Clock, MoreVertical
} from 'lucide-react';
import type { User } from '../../types/api';
import api from '../../lib/api';

interface InviteUserModal {
  isOpen: boolean;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState<InviteUserModal>({
    isOpen: false,
    email: '',
    role: 'employee',
    firstName: '',
    lastName: ''
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editRoleModal, setEditRoleModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    try {
      await api.post('/admin/users/invite', {
        email: inviteModal.email,
        role: inviteModal.role,
        first_name: inviteModal.firstName,
        last_name: inviteModal.lastName
      });
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.setAttribute('data-testid', 'success-message');
      successDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50';
      successDiv.textContent = 'Invitation sent successfully!';
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
      
      setInviteModal({ isOpen: false, email: '', role: 'employee', firstName: '', lastName: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Error sending invitation');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        alert('Role updated successfully!');
        fetchUsers();
        setEditRoleModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        alert('User deactivated successfully!');
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        alert('User reactivated successfully!');
        fetchUsers();
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        alert('Password reset email sent!');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      employee: 'bg-green-100 text-green-800',
      finance: 'bg-yellow-100 text-yellow-800',
      hr: 'bg-pink-100 text-pink-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          Active
        </span>
      );
    } else if (status === 'invited') {
      return (
        <span className="flex items-center gap-1 text-blue-600">
          <Clock className="h-4 w-4" />
          Invited
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="h-4 w-4" />
          Inactive
        </span>
      );
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (user: User) => getRoleBadge(user.role)
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: User) => getStatusBadge(user.status)
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (user: User) => (
        user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedUser(user);
              setEditRoleModal(true);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit Role"
          >
            <Shield className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleResetPassword(user.id)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded"
            title="Reset Password"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {user.status === 'active' ? (
            <button
              onClick={() => handleDeactivateUser(user.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Deactivate User"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => handleReactivateUser(user.id)}
              className="p-2 text-green-600 hover:bg-green-50 rounded"
              title="Reactivate User"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-gray-600 mt-2">Manage team members and their permissions</p>
        </div>
        <Button
          onClick={() => setInviteModal({ ...inviteModal, isOpen: true })}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-invite-user"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {[
          { label: 'Total Users', value: users.length, color: 'blue', testId: 'stat-total' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'green', testId: 'stat-active' },
          { label: 'Invited', value: users.filter(u => u.status === 'invited').length, color: 'yellow', testId: 'stat-invited' },
          { label: 'Inactive', value: users.filter(u => u.status === 'inactive').length, color: 'red', testId: 'stat-inactive' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6" data-testid={stat.testId}>
            <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            <div className={`text-3xl font-bold mt-2 text-${stat.color}-600`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow" data-testid="user-table">
        <DataTable
          data={users}
          columns={columns}
          searchable={true}
          searchPlaceholder="Search users..."
          exportable={true}
          exportFilename="users"
        />
      </div>

      {/* Invite User Modal */}
      {inviteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" data-testid="modal-invite-user">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              Invite New User
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={inviteModal.firstName}
                    onChange={(e) => setInviteModal({ ...inviteModal, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={inviteModal.lastName}
                    onChange={(e) => setInviteModal({ ...inviteModal, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteModal.email}
                  onChange={(e) => setInviteModal({ ...inviteModal, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  placeholder="john.doe@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={inviteModal.role}
                  onChange={(e) => setInviteModal({ ...inviteModal, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="finance">Finance</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {inviteModal.role === 'admin' && 'Full system access'}
                  {inviteModal.role === 'manager' && 'Can approve workflows and view reports'}
                  {inviteModal.role === 'finance' && 'Access to financial data and reports'}
                  {inviteModal.role === 'hr' && 'Access to HR and payroll features'}
                  {inviteModal.role === 'employee' && 'Basic access'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setInviteModal({ isOpen: false, email: '', role: 'employee', firstName: '', lastName: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteUser}
                disabled={!inviteModal.email || !inviteModal.firstName || !inviteModal.lastName}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-send-invitation"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Change User Role
            </h2>

            <div className="mb-4">
              <p className="text-gray-600">
                Change role for <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
              </p>
            </div>

            <div className="space-y-3">
              {['admin', 'manager', 'finance', 'hr', 'employee'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleUpdateRole(selectedUser.id, role)}
                  className={`w-full p-4 border-2 rounded-lg text-left hover:border-blue-500 transition-colors ${
                    selectedUser.role === role ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium text-gray-900 capitalize">{role}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {role === 'admin' && 'Full system access and configuration'}
                    {role === 'manager' && 'Approve workflows, view reports'}
                    {role === 'finance' && 'Access financial data and reports'}
                    {role === 'hr' && 'Access HR and payroll features'}
                    {role === 'employee' && 'Basic system access'}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditRoleModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
