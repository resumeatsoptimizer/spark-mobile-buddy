import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function MembersTab() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("mv_member_statistics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setMembers(data || []);
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
      ["Email", "Name", "Status", "Registrations", "Revenue", "Joined Date"],
      ...filteredMembers.map(m => [
        m.email,
        m.name || "",
        m.status,
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
                <TableHead>Registrations</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No members found</TableCell>
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
                    <TableCell className="mono text-sm">{member.total_registrations}</TableCell>
                    <TableCell className="font-medium mono">฿{member.total_amount_paid?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(member.created_at), "d MMM yyyy", { locale: th })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/admin/members/${member.user_id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
