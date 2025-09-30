import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Users, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  member_count?: number;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    name: string;
    email: string;
  };
}

const AdminOrganizations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchOrganizations();
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
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select(`
        *,
        organization_memberships(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลองค์กรได้",
        variant: "destructive",
      });
    } else {
      setOrganizations(data || []);
    }
    setLoading(false);
  };

  const fetchMembers = async (orgId: string) => {
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(`
        id,
        user_id,
        role,
        profiles!organization_memberships_user_id_fkey(name, email)
      `)
      .eq("organization_id", orgId);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดสมาชิกได้",
        variant: "destructive",
      });
    } else {
      setMembers(data as any || []);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName || !newOrgSlug) {
      toast({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อองค์กรและ slug",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: newOrgName,
        slug: newOrgSlug,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (orgError) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: orgError.message,
        variant: "destructive",
      });
      return;
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from("organization_memberships")
      .insert({
        organization_id: org.id,
        user_id: session.user.id,
        role: "owner",
      });

    if (memberError) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มสมาชิกได้",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "สร้างองค์กรสำเร็จ",
      description: `สร้างองค์กร ${newOrgName} เรียบร้อยแล้ว`,
    });

    setNewOrgName("");
    setNewOrgSlug("");
    setDialogOpen(false);
    fetchOrganizations();
  };

  const updateMemberRole = async (membershipId: string, newRole: string) => {
    const { error } = await supabase
      .from("organization_memberships")
      .update({ role: newRole })
      .eq("id", membershipId);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทบทบาทได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "อัพเดทสำเร็จ",
        description: "อัพเดทบทบาทสมาชิกเรียบร้อยแล้ว",
      });
      if (selectedOrg) {
        fetchMembers(selectedOrg.id);
      }
    }
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
            <h1 className="text-3xl font-bold text-foreground">จัดการองค์กร</h1>
            <p className="text-muted-foreground">จัดการองค์กรและสมาชิก</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                สร้างองค์กรใหม่
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>สร้างองค์กรใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลองค์กรที่ต้องการสร้าง
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อองค์กร</Label>
                  <Input
                    id="name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="บริษัท ABC จำกัด"
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={newOrgSlug}
                    onChange={(e) => setNewOrgSlug(e.target.value)}
                    placeholder="abc-company"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ใช้สำหรับ URL: /org/abc-company
                  </p>
                </div>
                <Button onClick={createOrganization} className="w-full">
                  สร้างองค์กร
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <CardTitle>{org.name}</CardTitle>
                    <CardDescription>/{org.slug}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{org.member_count || 0} สมาชิก</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedOrg(org);
                        fetchMembers(org.id);
                      }}
                    >
                      <Users className="mr-2 h-3 w-3" />
                      สมาชิก
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedOrg && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>สมาชิกของ {selectedOrg.name}</CardTitle>
              <CardDescription>จัดการบทบาทและสิทธิ์ของสมาชิก</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.profiles.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.profiles.email}
                      </p>
                    </div>
                    <Select
                      value={member.role}
                      onValueChange={(value) => updateMemberRole(member.id, value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminOrganizations;
