'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Loader2,
  Lock,
  Unlock,
  Crown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'organization' | 'products' | 'orders' | 'members' | 'settings';
}

interface Role {
  id: string;
  name: string;
  description: string;
  type: 'system' | 'custom';
  permissions: string[];
  memberCount: number;
}

interface CreateRoleForm {
  name: string;
  description: string;
  permissions: string[];
}

const mockPermissions: Permission[] = [
  // Organization
  { id: 'org.view', name: 'View Organization', description: 'View organization details', category: 'organization' },
  { id: 'org.edit', name: 'Edit Organization', description: 'Edit organization settings', category: 'organization' },
  { id: 'org.delete', name: 'Delete Organization', description: 'Delete organization', category: 'organization' },

  // Products
  { id: 'products.view', name: 'View Products', description: 'View product listings', category: 'products' },
  { id: 'products.create', name: 'Create Products', description: 'Add new products', category: 'products' },
  { id: 'products.edit', name: 'Edit Products', description: 'Modify product details', category: 'products' },
  { id: 'products.delete', name: 'Delete Products', description: 'Remove products', category: 'products' },

  // Orders
  { id: 'orders.view', name: 'View Orders', description: 'View order history', category: 'orders' },
  { id: 'orders.manage', name: 'Manage Orders', description: 'Process and fulfill orders', category: 'orders' },
  { id: 'orders.refund', name: 'Refund Orders', description: 'Issue refunds', category: 'orders' },

  // Members
  { id: 'members.view', name: 'View Members', description: 'View team members', category: 'members' },
  { id: 'members.invite', name: 'Invite Members', description: 'Invite new members', category: 'members' },
  { id: 'members.edit', name: 'Edit Members', description: 'Modify member roles', category: 'members' },
  { id: 'members.remove', name: 'Remove Members', description: 'Remove members', category: 'members' },

  // Settings
  { id: 'settings.view', name: 'View Settings', description: 'View configuration', category: 'settings' },
  { id: 'settings.edit', name: 'Edit Settings', description: 'Modify settings', category: 'settings' },
];

const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Owner',
    description: 'Full access to all organization resources',
    type: 'system',
    permissions: mockPermissions.map(p => p.id),
    memberCount: 1,
  },
  {
    id: '2',
    name: 'Admin',
    description: 'Administrative access with some restrictions',
    type: 'system',
    permissions: mockPermissions.filter(p => !p.id.includes('delete')).map(p => p.id),
    memberCount: 3,
  },
  {
    id: '3',
    name: 'Manager',
    description: 'Can manage products and orders',
    type: 'custom',
    permissions: [
      'org.view',
      'products.view',
      'products.create',
      'products.edit',
      'orders.view',
      'orders.manage',
      'members.view',
    ],
    memberCount: 8,
  },
  {
    id: '4',
    name: 'Member',
    description: 'Basic access to view organization content',
    type: 'system',
    permissions: ['org.view', 'products.view', 'orders.view', 'members.view', 'settings.view'],
    memberCount: 30,
  },
];

const permissionCategories: Array<{ key: Permission['category']; label: string }> = [
  { key: 'organization', label: 'Organization' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'members', label: 'Members' },
  { key: 'settings', label: 'Settings' },
];

export function RolePermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions] = useState<Permission[]>(mockPermissions);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [createForm, setCreateForm] = useState<CreateRoleForm>({
    name: '',
    description: '',
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await api.get('/organizations/current/roles');
      await new Promise(resolve => setTimeout(resolve, 500));
      setRoles(mockRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In production, call API
      // await api.post('/organizations/current/roles', createForm);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newRole: Role = {
        id: String(roles.length + 1),
        ...createForm,
        type: 'custom',
        memberCount: 0,
      };
      setRoles([...roles, newRole]);

      setIsCreateModalOpen(false);
      setCreateForm({ name: '', description: '', permissions: [] });
    } catch (error) {
      console.error('Failed to create role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    if (role.type === 'system') {
      alert('System roles cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete the "${role.name}" role?`)) return;

    try {
      // In production, call API
      // await api.delete(`/organizations/current/roles/${roleId}`);
      setRoles(roles.filter(r => r.id !== roleId));
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const togglePermission = (permissionId: string) => {
    setCreateForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground">Manage access control for your organization</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center gap-2">
                      {role.type === 'system' && <Crown className="h-4 w-4 text-amber-500" />}
                      {role.name}
                    </CardTitle>
                    <Badge variant={role.type === 'system' ? 'default' : 'secondary'}>
                      {role.type}
                    </Badge>
                    <Badge variant="outline">{role.memberCount} members</Badge>
                  </div>
                  <CardDescription className="mt-1.5">{role.description}</CardDescription>
                </div>
                {role.type === 'custom' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRole(role);
                        setCreateForm({
                          name: role.name,
                          description: role.description,
                          permissions: role.permissions,
                        });
                        setIsCreateModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissionCategories.map((category) => {
                  const categoryPerms = permissions.filter(p => p.category === category.key);
                  const enabledPerms = categoryPerms.filter(p => role.permissions.includes(p.id));

                  if (enabledPerms.length === 0) return null;

                  return (
                    <div key={category.key}>
                      <h4 className="text-sm font-medium mb-2">{category.label}</h4>
                      <div className="flex flex-wrap gap-2">
                        {enabledPerms.map((perm) => (
                          <Badge key={perm.id} variant="outline">
                            <Check className="h-3 w-3 mr-1" />
                            {perm.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Role Modal */}
      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setSelectedRole(null);
            setCreateForm({ name: '', description: '', permissions: [] });
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleCreateRole}>
            <DialogHeader>
              <DialogTitle>
                {selectedRole ? 'Edit Role' : 'Create New Role'}
              </DialogTitle>
              <DialogDescription>
                {selectedRole
                  ? 'Update role details and permissions'
                  : 'Define a new role with custom permissions'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Manager"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What can this role do?"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {permissionCategories.map((category) => {
                  const categoryPerms = permissions.filter(p => p.category === category.key);
                  return (
                    <div key={category.key} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {category.label}
                      </h4>
                      <div className="space-y-2 pl-4 border-l-2">
                        {categoryPerms.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-3"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={createForm.permissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={permission.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedRole(null);
                  setCreateForm({ name: '', description: '', permissions: [] });
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {selectedRole ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RolePermissionMatrix;
