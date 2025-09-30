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
import { Users, Plus, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  organizations: Organization;
  member_count?: number;
}

interface TeamMember {
  id: string;
  role: string;
  profiles: {
    name: string;
    email: string;
  };
}

const AdminTeams = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchOrganizations();
    fetchTeams();
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

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teams")
      .select(`
        *,
        organizations(id, name),
        team_memberships(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลทีมได้",
        variant: "destructive",
      });
    } else {
      setTeams(data || []);
    }
    setLoading(false);
  };

  const fetchMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from("team_memberships")
      .select(`
        id,
        role,
        profiles!team_memberships_user_id_fkey(name, email)
      `)
      .eq("team_id", teamId);

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

  const createTeam = async () => {
    if (!newTeamName || !selectedOrgId) {
      toast({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อทีมและเลือกองค์กร",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("teams")
      .insert({
        name: newTeamName,
        description: newTeamDesc,
        organization_id: selectedOrgId,
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
      title: "สร้างทีมสำเร็จ",
      description: `สร้างทีม ${newTeamName} เรียบร้อยแล้ว`,
    });

    setNewTeamName("");
    setNewTeamDesc("");
    setDialogOpen(false);
    fetchTeams();
  };

  const updateMemberRole = async (membershipId: string, newRole: string) => {
    const { error } = await supabase
      .from("team_memberships")
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
      if (selectedTeam) {
        fetchMembers(selectedTeam.id);
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
            <h1 className="text-3xl font-bold text-foreground">จัดการทีม</h1>
            <p className="text-muted-foreground">จัดการทีมและสมาชิกในองค์กร</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                สร้างทีมใหม่
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>สร้างทีมใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลทีมที่ต้องการสร้าง
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
                  <Label htmlFor="name">ชื่อทีม</Label>
                  <Input
                    id="name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="ทีม Marketing"
                  />
                </div>
                <div>
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea
                    id="description"
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    placeholder="ทีมที่ดูแลด้าน Marketing และ PR"
                    rows={3}
                  />
                </div>
                <Button onClick={createTeam} className="w-full">
                  สร้างทีม
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <CardTitle>{team.name}</CardTitle>
                    <CardDescription>{team.organizations.name}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {team.description && (
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{team.member_count || 0} สมาชิก</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedTeam(team);
                      fetchMembers(team.id);
                    }}
                  >
                    <UserPlus className="mr-2 h-3 w-3" />
                    จัดการสมาชิก
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedTeam && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>สมาชิกของ {selectedTeam.name}</CardTitle>
              <CardDescription>จัดการบทบาทของสมาชิกในทีม</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ยังไม่มีสมาชิกในทีม
                  </p>
                ) : (
                  members.map((member) => (
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
                          <SelectItem value="leader">Leader</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminTeams;
