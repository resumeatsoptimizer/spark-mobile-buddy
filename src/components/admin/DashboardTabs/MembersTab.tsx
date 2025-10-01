import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye, Download, MoreVertical, Shield, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
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
import { useToast } from "@/hooks/use-toast";

export function MembersTab() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    
    // Fetch members with their roles
    const { data: memberData } = await supabase
      .from("mv_member_statistics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch roles for each member
    const membersWithRoles = await Promise.all(
      (memberData || []).map(async (member) => {
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

    setMembers(membersWithRoles);
    setLoading(false);
  };

  const filteredMembers = members.filter((m) =>
    m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, any> = {
      active: { variant: "default", label: "Active" },
      inactive: { variant: "secondary", label: "Inactive" },
      suspended: { variant: "outline", label: "Suspended" },
      blocked: { variant: "destructive", label: "Blocked" },
    };
    const { variant, label } = config[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleExportCSV = () => {
    const csv = [
      ["Email", "Name", "Status", "Roles", "Registrations", "Revenue", "Joined Date"],
      ...filteredMembers.map(m => [
        m.email,
        m.name || "",
        m.status,
        m.roles?.join(", ") || "",
        m.total_registrations?.toString() || "0",
        `฿${(m.total_amount_paid || 0).toLocaleString()}`,
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
        throw new Error(result.error || "Failed to update roles");
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
        throw new Error(result.error || "Failed to delete user");
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

  const getRoleBadges = (roles: string[]) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Members</h2>
          <p className="text-sm text-muted-foreground">Manage your members</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Members</p>
            <p className="text-2xl font-bold mono">{members.length}</p>
          </div>
          <AddUserDialog onUserAdded={fetchMembers} />
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Search Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">All Members</CardTitle>
          <CardDescription className="text-xs">{filteredMembers.length} members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No members found</TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{member.name || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>{getRoleBadges(member.roles)}</TableCell>
                    <TableCell className="mono text-sm">{member.total_registrations}</TableCell>
                    <TableCell className="font-medium mono">฿{member.total_amount_paid?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(member.created_at), "d MMM yyyy", { locale: th })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>จัดการผู้ใช้</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/admin/members/${member.user_id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            ดูรายละเอียด
                          </DropdownMenuItem>
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
        </CardContent>
      </Card>

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
}
