import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
import {
  Users,
  Search,
  RefreshCw,
  Download,
  Filter,
  MoreVertical,
  Eye,
  Mail,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Shield,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type MemberStatus = "active" | "inactive" | "suspended" | "blocked";
type ActivityLevel = "highly_active" | "active" | "moderate" | "inactive";

interface MemberStats {
  user_id: string;
  email: string;
  name: string | null;
  status: MemberStatus;
  created_at: string;
  total_registrations: number;
  total_amount_paid: number;
  activity_level: ActivityLevel;
  last_registration_at?: string;
  roles?: string[];
}

interface Statistics {
  total_members: number;
  active_members: number;
  inactive_members: number;
  total_revenue: number;
}

const MemberManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

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

    const hasAccess = roles?.some(r => r.role === "admin" || r.role === "staff");

    if (!hasAccess) {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchMembers(), fetchStatistics()]);
    setLoading(false);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("mv_member_statistics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
        variant: "destructive",
      });
      return;
    }

    // Fetch roles for each member
    const membersWithRoles = await Promise.all(
      (data || []).map(async (member) => {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", member.user_id);
        
        return {
          ...member,
          roles: roles?.map((r) => r.role) || [],
        };
      })
    );

    setMembers(membersWithRoles as MemberStats[]);
  };

  const fetchStatistics = async () => {
    const { data, error } = await supabase.rpc('get_member_statistics');

    if (error) {
      console.error("Error fetching statistics:", error);
    } else if (data && data.length > 0) {
      setStatistics(data[0]);
    }
  };

  const getStatusBadge = (status: MemberStatus) => {
    const config = {
      active: { icon: CheckCircle, color: "bg-green-500", label: "Active" },
      inactive: { icon: AlertCircle, color: "bg-gray-500", label: "Inactive" },
      suspended: { icon: XCircle, color: "bg-yellow-500", label: "Suspended" },
      blocked: { icon: Ban, color: "bg-red-500", label: "Blocked" },
    };

    const { icon: Icon, color, label } = config[status];

    return (
      <Badge className={color}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getActivityBadge = (level: ActivityLevel) => {
    const config = {
      highly_active: { color: "bg-blue-500", label: "Very Active" },
      active: { color: "bg-green-500", label: "Active" },
      moderate: { color: "bg-yellow-500", label: "Moderate" },
      inactive: { color: "bg-gray-500", label: "Inactive" },
    };

    const badgeConfig = config[level] || { color: "bg-gray-500", label: "Unknown" };
    const { color, label } = badgeConfig;

    return <Badge className={color}>{label}</Badge>;
  };

  const handleRefreshView = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.rpc('refresh_member_stats_mv');
      if (error) throw error;

      await fetchData();
      toast({
        title: "ซิงค์ข้อมูลสำเร็จ",
        description: "ข้อมูลสมาชิกถูกอัปเดตเรียบร้อยแล้ว",
      });
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: MemberStatus) => {
    const reason = prompt("กรุณาระบุเหตุผล (optional):");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.rpc('update_member_status', {
        member_id: userId,
        new_status: newStatus,
        changed_by_id: user.id,
        reason_text: reason || null,
      });

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: "เปลี่ยนสถานะสมาชิกเรียบร้อยแล้ว",
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateRoles = async (userId: string, roles: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management?action=update-roles`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, roles }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Provide more specific error messages
        let errorMessage = result.error || "ไม่สามารถอัปเดตสิทธิ์ได้";
        
        if (errorMessage.includes("duplicate")) {
          errorMessage = "มีสิทธิ์นี้อยู่แล้ว";
        } else if (errorMessage.includes("constraint")) {
          errorMessage = "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: "สำเร็จ",
        description: "อัปเดตสิทธิ์เรียบร้อยแล้ว",
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management?action=delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: deleteUserId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Provide more specific error messages
        let errorMessage = result.error || "ไม่สามารถลบผู้ใช้ได้";
        
        if (errorMessage.includes("foreign key")) {
          errorMessage = "ไม่สามารถลบได้ เนื่องจากมีข้อมูลที่เกี่ยวข้อง";
        } else if (errorMessage.includes("permission")) {
          errorMessage = "คุณไม่มีสิทธิ์ลบผู้ใช้นี้";
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: "สำเร็จ",
        description: "ลบผู้ใช้เรียบร้อยแล้ว",
      });

      setDeleteUserId(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportData = () => {
    const csv = [
      ["Email", "Name", "Status", "Roles", "Activity", "Registrations", "Revenue", "Created"],
      ...filteredMembers.map(m => [
        m.email,
        m.name || "",
        m.status,
        m.roles?.join(", ") || "",
        m.activity_level,
        m.total_registrations.toString(),
        `฿${m.total_amount_paid.toLocaleString()}`,
        format(new Date(m.created_at), "yyyy-MM-dd"),
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRoleBadges = (roles?: string[]) => {
    if (!roles || roles.length === 0) return <Badge variant="outline">No Role</Badge>;
    
    return (
      <div className="flex gap-1 flex-wrap">
        {roles.map((role) => (
          <Badge 
            key={role} 
            variant={role === "admin" ? "default" : role === "staff" ? "secondary" : "outline"}
            className="text-xs"
          >
            {role}
          </Badge>
        ))}
      </div>
    );
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch =
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesActivity = activityFilter === "all" || member.activity_level === activityFilter;

    return matchesSearch && matchesStatus && matchesActivity;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">จัดการสมาชิก</h1>
              </div>
              <p className="text-muted-foreground">จัดการข้อมูลและสถานะสมาชิกทั้งหมด</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRefreshView} 
                variant="outline"
                disabled={syncing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}
              </Button>
              <AddUserDialog onUserAdded={fetchData} />
              <Button onClick={handleExportData} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Auto-sync Info */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">ซิงค์ข้อมูลอัตโนมัติ</p>
              <p className="text-xs text-muted-foreground mt-1">
                ข้อมูลจะถูกอัปเดตอัตโนมัติเมื่อมีการลงทะเบียนหรือชำระเงินใหม่ หากต้องการซิงค์ทันที กดปุ่ม "ซิงค์ข้อมูล"
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  สมาชิกทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_members}</div>
                <p className="text-xs text-muted-foreground">
                  Total members in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.active_members}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((statistics.active_members / statistics.total_members) * 100)}% ของทั้งหมด
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-yellow-500" />
                  Inactive
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.inactive_members}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-500" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">฿{statistics.total_revenue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              ค้นหาและกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="ระดับกิจกรรม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="highly_active">Very Active</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการสมาชิก</CardTitle>
            <CardDescription>ทั้งหมด {filteredMembers.length} คน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สมาชิก</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>สิทธิ์</TableHead>
                    <TableHead>กิจกรรม</TableHead>
                    <TableHead className="text-right">ลงทะเบียน</TableHead>
                    <TableHead className="text-right">รายได้</TableHead>
                    <TableHead>สมัครเมื่อ</TableHead>
                    <TableHead>ลงทะเบียนล่าสุด</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        ไม่พบข้อมูลสมาชิก
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{member.name || "ไม่ระบุ"}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                        <TableCell>{getRoleBadges(member.roles)}</TableCell>
                        <TableCell>{getActivityBadge(member.activity_level)}</TableCell>
                        <TableCell className="text-right">
                          {member.total_registrations}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ฿{member.total_amount_paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(member.created_at), "d MMM yyyy", { locale: th })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {member.last_registration_at
                            ? format(new Date(member.last_registration_at), "d MMM yyyy", { locale: th })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>จัดการสมาชิก</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/admin/members/${member.user_id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                ดูรายละเอียด
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                ส่งอีเมล
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Shield className="mr-2 h-4 w-4" />
                                  จัดการสิทธิ์
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateRoles(member.user_id, ["admin"])}
                                  >
                                    Admin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateRoles(member.user_id, ["staff"])}
                                  >
                                    Staff
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateRoles(member.user_id, ["participant"])}
                                  >
                                    Participant
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateRoles(member.user_id, [])}
                                  >
                                    ลบสิทธิ์ทั้งหมด
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              {member.status !== "active" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(member.user_id, "active")}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {member.status !== "suspended" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(member.user_id, "suspended")}>
                                  <XCircle className="mr-2 h-4 w-4 text-yellow-500" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {member.status !== "blocked" && (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(member.user_id, "blocked")}>
                                  <Ban className="mr-2 h-4 w-4 text-red-500" />
                                  Block
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteUserId(member.user_id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                ลบผู้ใช้
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              การลบผู้ใช้จะทำให้ข้อมูลทั้งหมดของผู้ใช้ถูกลบออกจากระบบอย่างถาวร การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบผู้ใช้
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MemberManagement;
