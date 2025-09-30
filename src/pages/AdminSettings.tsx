import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, Shield, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type AppRole = "admin" | "staff" | "participant";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  profiles: {
    email: string;
    name: string | null;
  };
}

const AdminSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const hasAdminRole = roles?.some(r => r.role === "admin");
    
    if (!hasAdminRole) {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchUserRoles();
  };

  const fetchUserRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        id,
        user_id,
        role,
        profiles (
          email,
          name
        )
      `)
      .order("profiles(email)", { ascending: true });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
        variant: "destructive",
      });
    } else {
      setUserRoles(data || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userRoleId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("id", userRoleId);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสิทธิ์ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสิทธิ์เรียบร้อยแล้ว",
      });
      fetchUserRoles();
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500"><Shield className="mr-1 h-3 w-3" />Admin</Badge>;
      case "staff":
        return <Badge className="bg-blue-500"><Users className="mr-1 h-3 w-3" />Staff</Badge>;
      case "participant":
        return <Badge variant="outline"><Users className="mr-1 h-3 w-3" />Participant</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const filteredUsers = userRoles.filter(ur => 
    ur.profiles.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
    ur.profiles.name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">ตั้งค่าระบบ</h1>
          </div>
          <p className="text-muted-foreground">
            จัดการผู้ใช้และสิทธิ์การเข้าถึงระบบ
          </p>
        </div>

        {/* Enterprise Features */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/sso')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Single Sign-On
              </CardTitle>
              <CardDescription>
                Configure Google and Microsoft OAuth
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/rbac')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Advanced RBAC
              </CardTitle>
              <CardDescription>
                Define custom roles and permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/api-docs')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                API Documentation
              </CardTitle>
              <CardDescription>
                REST API integration guide
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              จัดการผู้ใช้และสิทธิ์
            </CardTitle>
            <CardDescription>
              กำหนดสิทธิ์การเข้าถึงสำหรับผู้ใช้ในระบบ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <Label htmlFor="search">ค้นหาผู้ใช้</Label>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>สิทธิ์ปัจจุบัน</TableHead>
                    <TableHead>เปลี่ยนสิทธิ์</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        ไม่พบผู้ใช้
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell className="font-medium">
                          {userRole.profiles.name || "ไม่ระบุ"}
                        </TableCell>
                        <TableCell>{userRole.profiles.email}</TableCell>
                        <TableCell>{getRoleBadge(userRole.role)}</TableCell>
                        <TableCell>
                          <Select
                            value={userRole.role}
                            onValueChange={(value) => handleRoleChange(userRole.id, value as AppRole)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="participant">Participant</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminSettings;
