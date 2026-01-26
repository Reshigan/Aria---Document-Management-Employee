import React, { useState, useEffect } from 'react';
import { Shield, Users, Lock, Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
  is_high_risk: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

const RBACManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/permissions')
      ]);
      
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (error) {
      console.error('Failed to fetch RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setEditMode(false);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (!selectedRole || !editMode) return;

    const updatedPermissions = selectedRole.permissions.includes(permissionId)
      ? selectedRole.permissions.filter(p => p !== permissionId)
      : [...selectedRole.permissions, permissionId];

    setSelectedRole({
      ...selectedRole,
      permissions: updatedPermissions
    });
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;

    try {
      await fetch(`/api/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedRole)
      });

      await fetchRolesAndPermissions();
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading RBAC settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Shield size={32} className="text-blue-600 dark:text-blue-400" />
          RBAC Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage roles and permissions for your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users size={20} />
              Roles
            </h2>
            <button className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-blue-100 border-2 border-blue-600'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{role.description}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {role.permissions.length} permissions
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {selectedRole ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Lock size={20} />
                    {selectedRole.name} Permissions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedRole.description}</p>
                </div>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={handleSaveRole}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <Check size={16} />
                        Save
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 uppercase text-sm">
                      {module}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((perm) => {
                        const permId = `${perm.module}:${perm.action}`;
                        const isSelected = selectedRole.permissions.includes(permId);
                        
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-600'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            } ${!editMode ? 'cursor-default' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlePermissionToggle(permId)}
                              disabled={!editMode}
                              className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white text-sm">
                                {perm.action}
                                {perm.is_high_risk && (
                                  <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded">
                                    High Risk
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{perm.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              Select a role to view and manage permissions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RBACManagement;
