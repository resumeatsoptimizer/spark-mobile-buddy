import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Edit2, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Organization {
  id: string;
  name: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  organization_id: string;
  organizations: Organization;
}

const AVAILABLE_PERMISSIONS = [
  { id: "events.create", label: "สร้างอีเวนต์" },
  { id: "events.edit", label: "แก้ไขอีเวนต์" },
  { id: "events.delete", label: "ลบอีเวนต์" },
  { id: "registrations.view", label: "ดูการลงทะเบียน" },
  { id: "registrations.manage", label: "จัดการการลงทะเบียน" },
  { id: "users.view", label: "ดูผู้ใช้" },
  { id: "users.manage", label: "จัดการผู้ใช้" },
  { id: "analytics.view", label: "ดูรายงาน" },
  { id: "settings.manage", label: "จัดการการตั้งค่า" },
];

const AdminRoles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchOrganizations();
    fetchRoles();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      navigate("/");
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        variant: "destructive",
      });
    }
  };

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name");

    if (data) {
      setOrganizations(data);
      if (data.length > 0) {
        setSelectedOrgId(data[0].id);
      }
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_roles")
      .select(`
        *,
        organizations(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลบทบาทได้",
        variant: "destructive",
      });
    } else {
      setRoles(data as any || []);
    }
    setLoading(false);
  };

  const createRole = async () => {
    if (!newRoleName || !selectedOrgId) {
      toast({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อบทบาทและเลือกองค์กร",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("custom_roles")
      .insert({
        name: newRoleName,
        description: newRoleDesc,
        organization_id: selectedOrgId,
        permissions: selectedPermissions,
      });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "สร้างบทบาทสำเร็จ",
      description: `สร้างบทบาท ${newRoleName} เรียบร้อยแล้ว`,
    });

    setNewRoleName("");
    setNewRoleDesc("");
    setSelectedPermissions({});
    setDialogOpen(false);
    fetchRoles();
  };

  const deleteRole = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบบทบาท "${name}" หรือไม่?`)) {
      return;
    }

    const { error } = await supabase
      .from("custom_roles")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบบทบาทได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ลบสำเร็จ",
        description: `ลบบทบาท ${name} เรียบร้อยแล้ว`,
      });
      fetchRoles();
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [permissionId]: !prev[permissionId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center">
          <div className="text-center">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">จัดการบทบาทและสิทธิ์</h1>
            <p className="text-muted-foreground">สร้างและจัดการบทบาทแบบกำหนดเอง</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                สร้างบทบาทใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>สร้างบทบาทใหม่</DialogTitle>
                <DialogDescription>
                  กำหนดชื่อ คำอธิบาย และสิทธิ์สำหรับบทบาทใหม่
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="organization">องค์กร</Label>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกองค์กร" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">ชื่อบทบาท</Label>
                  <Input
                    id="name"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Event Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea
                    id="description"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="บทบาทที่ดูแลการจัดการอีเวนต์"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>สิทธิ์</Label>
                  <div className="space-y-3 mt-2">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions[permission.id] || false}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={createRole} className="w-full">
                  สร้างบทบาท
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle>{role.name}</CardTitle>
                      <CardDescription>{role.organizations.name}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRole(role.id, role.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {role.description && (
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  )}
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">สิทธิ์:</p>
                    <div className="space-y-1">
                      {Object.entries(role.permissions).map(([key, value]) => {
                        if (!value) return null;
                        const permission = AVAILABLE_PERMISSIONS.find((p) => p.id === key);
                        return (
                          <div key={key} className="text-xs text-muted-foreground">
                            • {permission?.label || key}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminRoles;
