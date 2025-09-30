import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Plus, Edit, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: {
    [key: string]: boolean;
  };
  organization_id: string;
}

const PERMISSION_CATEGORIES = {
  events: {
    label: 'Events',
    permissions: [
      { key: 'events.create', label: 'Create Events' },
      { key: 'events.read', label: 'View Events' },
      { key: 'events.update', label: 'Edit Events' },
      { key: 'events.delete', label: 'Delete Events' },
      { key: 'events.publish', label: 'Publish Events' },
    ]
  },
  registrations: {
    label: 'Registrations',
    permissions: [
      { key: 'registrations.read', label: 'View Registrations' },
      { key: 'registrations.update', label: 'Update Registrations' },
      { key: 'registrations.delete', label: 'Delete Registrations' },
      { key: 'registrations.export', label: 'Export Registrations' },
    ]
  },
  users: {
    label: 'Users',
    permissions: [
      { key: 'users.read', label: 'View Users' },
      { key: 'users.update', label: 'Edit Users' },
      { key: 'users.delete', label: 'Delete Users' },
      { key: 'users.manage_roles', label: 'Manage User Roles' },
    ]
  },
  analytics: {
    label: 'Analytics',
    permissions: [
      { key: 'analytics.read', label: 'View Analytics' },
      { key: 'analytics.export', label: 'Export Reports' },
    ]
  },
  settings: {
    label: 'Settings',
    permissions: [
      { key: 'settings.read', label: 'View Settings' },
      { key: 'settings.update', label: 'Update Settings' },
      { key: 'settings.integrations', label: 'Manage Integrations' },
    ]
  }
};

export default function AdminRBAC() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [currentOrg, setCurrentOrg] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAuth();
    fetchCurrentOrg();
  }, []);

  useEffect(() => {
    if (currentOrg) {
      fetchRoles();
    }
  }, [currentOrg]);

  const checkAdminAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (role?.role !== 'admin') {
      navigate('/');
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access this page',
        variant: 'destructive',
      });
    }
  };

  const fetchCurrentOrg = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCurrentOrg(data.organization_id);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchRoles = async () => {
    if (!currentOrg) return;

    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('organization_id', currentOrg);

      if (error) throw error;
      setRoles((data || []).map(role => ({
        ...role,
        permissions: (role.permissions as any) || {}
      })));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive',
      });
    }
  };

  const RoleEditor = ({ role }: { role?: CustomRole }) => {
    const [name, setName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [permissions, setPermissions] = useState<{ [key: string]: boolean }>(
      role?.permissions || {}
    );

    const togglePermission = (key: string) => {
      setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const saveRole = async () => {
      if (!name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Role name is required',
          variant: 'destructive',
        });
        return;
      }

      if (!currentOrg) {
        toast({
          title: 'Error',
          description: 'No organization found',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);

        if (role) {
          const { error } = await supabase
            .from('custom_roles')
            .update({
              name,
              description,
              permissions,
              updated_at: new Date().toISOString(),
            })
            .eq('id', role.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('custom_roles')
            .insert({
              organization_id: currentOrg,
              name,
              description,
              permissions,
            });

          if (error) throw error;
        }

        toast({
          title: 'Success',
          description: `Role ${role ? 'updated' : 'created'} successfully`,
        });

        setDialogOpen(false);
        setEditingRole(null);
        fetchRoles();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="role-name">Role Name</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Event Manager"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role-description">Description</Label>
          <Textarea
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the role and its responsibilities"
            rows={3}
          />
        </div>

        <div className="space-y-4">
          <Label>Permissions</Label>
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                <TabsTrigger key={key} value={key}>
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => (
              <TabsContent key={catKey} value={catKey} className="space-y-3">
                {category.permissions.map((perm) => (
                  <div key={perm.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={perm.key}
                      checked={permissions[perm.key] || false}
                      onCheckedChange={() => togglePermission(perm.key)}
                    />
                    <label
                      htmlFor={perm.key}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {perm.label}
                    </label>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setDialogOpen(false);
              setEditingRole(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={saveRole} disabled={loading}>
            {loading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </Button>
        </div>
      </div>
    );
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      });

      fetchRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/settings')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
              <p className="text-muted-foreground mt-1">
                Define custom roles and manage permissions
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRole(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? 'Edit Role' : 'Create New Role'}
                </DialogTitle>
                <DialogDescription>
                  Define a custom role with specific permissions for your organization
                </DialogDescription>
              </DialogHeader>
              <RoleEditor role={editingRole || undefined} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {roles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No custom roles yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first custom role to manage team permissions
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </CardContent>
            </Card>
          ) : (
            roles.map((role) => {
              const permCount = Object.values(role.permissions).filter(Boolean).length;
              
              return (
                <Card key={role.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle>{role.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {role.description || 'No description provided'}
                          </CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              {permCount} {permCount === 1 ? 'Permission' : 'Permissions'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingRole(role);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteRole(role.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(role.permissions)
                        .filter(([_, enabled]) => enabled)
                        .map(([key]) => (
                          <Badge key={key} variant="outline">
                            {key}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
