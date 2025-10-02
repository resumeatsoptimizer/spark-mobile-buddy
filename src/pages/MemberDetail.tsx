import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  CreditCard,
  FileText,
  Tag,
  ArrowLeft,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MemberStatus = "active" | "inactive" | "suspended" | "blocked";

interface MemberDetails {
  user_id: string;
  email: string;
  name: string;
  status: string;
  activity_level: string;
  last_login_at: string | null;
  created_at: string;
  last_registration_at: string | null;
  total_registrations: number;
  total_events_attended: number;
  total_payments: number;
  total_amount_paid: number;
  engagement_score: number;
  tags: string[];
  roles: string[];
}

interface Registration {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  events: {
    title: string;
    start_date: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  registration: {
    events: {
      title: string;
    };
  };
}

interface Note {
  id: string;
  note: string;
  is_important: boolean;
  created_at: string;
  created_by_profile: {
    name: string;
    email: string;
  };
}

interface StatusHistory {
  id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  changed_at: string;
  changed_by_profile: {
    name: string;
    email: string;
  };
}

const MemberDetail = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberDetails | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);

  // Edit states
  const [newNote, setNewNote] = useState("");
  const [isImportantNote, setIsImportantNote] = useState(false);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    checkAuth();
  }, [memberId]);

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
    if (!memberId) return;

    setLoading(true);
    
    // Refresh materialized view to ensure latest data
    try {
      await supabase.rpc('refresh_member_statistics');
    } catch (err) {
      console.error('Failed to refresh member statistics:', err);
    }
    
    await Promise.all([
      fetchMemberDetails(),
      fetchRegistrations(),
      fetchPayments(),
      fetchNotes(),
      fetchStatusHistory(),
    ]);
    setLoading(false);
  };

  const fetchMemberDetails = async () => {
    const { data, error } = await supabase.rpc('get_member_details', {
      member_id: memberId,
    });

    if (error) {
      console.error("Error fetching member details:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลสมาชิกได้",
        variant: "destructive",
      });
    } else if (data) {
      // Ensure all data is properly structured
      const rawData = data as any;
      const memberData: MemberDetails = {
        user_id: rawData.user_id,
        email: rawData.email,
        name: rawData.name || 'ไม่มีข้อมูล',
        status: rawData.status || 'new',
        activity_level: rawData.activity_level || 'inactive',
        total_registrations: rawData.total_registrations || 0,
        total_events_attended: rawData.total_events_attended || 0,
        total_payments: rawData.total_payments || 0,
        last_registration_at: rawData.last_registration_at,
        last_login_at: rawData.last_login_at,
        created_at: rawData.created_at,
        total_amount_paid: rawData.total_amount_paid || 0,
        engagement_score: rawData.engagement_score || 0,
        tags: rawData.tags || [],
        roles: rawData.roles || [],
      };
      setMember(memberData);
    }
  };

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from("registrations")
      .select(`
        id,
        status,
        payment_status,
        created_at,
        events (title, start_date)
      `)
      .eq("user_id", memberId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRegistrations(data as any);
    }
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        status,
        created_at,
        registration:registrations (
          events (title)
        )
      `)
      .in("registration_id", await getRegistrationIds())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPayments(data as any);
    }
  };

  const getRegistrationIds = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("id")
      .eq("user_id", memberId);
    return data?.map(r => r.id) || [];
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("member_notes")
      .select(`
        id,
        note,
        is_important,
        created_at,
        created_by_profile:profiles!member_notes_created_by_fkey (name, email)
      `)
      .eq("user_id", memberId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotes(data as any);
    }
  };

  const fetchStatusHistory = async () => {
    const { data, error } = await supabase
      .from("member_status_history")
      .select(`
        id,
        old_status,
        new_status,
        reason,
        changed_at,
        changed_by_profile:profiles!member_status_history_changed_by_fkey (name, email)
      `)
      .eq("user_id", memberId)
      .order("changed_at", { ascending: false });

    if (!error && data) {
      setStatusHistory(data as any);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("member_notes")
      .insert({
        user_id: memberId,
        note: newNote,
        created_by: user.id,
      });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มบันทึกได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "เพิ่มบันทึกเรียบร้อยแล้ว",
      });
      setNewNote("");
      setIsImportantNote(false);
      fetchNotes();
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("คุณต้องการลบบันทึกนี้หรือไม่?")) return;

    const { error } = await supabase
      .from("member_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบบันทึกได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "ลบบันทึกเรียบร้อยแล้ว",
      });
      fetchNotes();
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    const { error } = await supabase
      .from("member_tags")
      .insert({
        user_id: memberId,
        tag: newTag,
      });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message.includes("duplicate") ? "Tag นี้มีอยู่แล้ว" : "ไม่สามารถเพิ่ม tag ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "เพิ่ม tag เรียบร้อยแล้ว",
      });
      setNewTag("");
      fetchMemberDetails();
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    const { error } = await supabase
      .from("member_tags")
      .delete()
      .eq("user_id", memberId)
      .eq("tag", tagName);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบ tag ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "ลบ tag เรียบร้อยแล้ว",
      });
      fetchMemberDetails();
    }
  };

  const handleUpdateStatus = async (newStatus: MemberStatus) => {
    const reason = prompt("กรุณาระบุเหตุผล:");
    if (reason === null) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.rpc('update_member_status', {
      member_id: memberId,
      new_status: newStatus,
      changed_by_id: user.id,
      reason_text: reason || null,
    });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสถานะเรียบร้อยแล้ว",
      });
      fetchMemberDetails();
      fetchStatusHistory();
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      active: { icon: CheckCircle, color: "bg-green-500", label: "Active" },
      inactive: { icon: XCircle, color: "bg-gray-500", label: "Inactive" },
      suspended: { icon: XCircle, color: "bg-yellow-500", label: "Suspended" },
      blocked: { icon: Ban, color: "bg-red-500", label: "Blocked" },
      new: { icon: User, color: "bg-blue-500", label: "New" },
      dormant: { icon: Clock, color: "bg-orange-500", label: "Dormant" },
    };

    const statusConfig = config[status] || config.inactive;
    const { icon: Icon, color, label } = statusConfig;

    return (
      <Badge className={color}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

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

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">ไม่พบข้อมูลสมาชิก</p>
          <Button onClick={() => navigate("/admin/members")} className="mt-4">
            กลับหหน้ารายการ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/members")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold">
                {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{member.name || "ไม่ระบุชื่อ"}</h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {member.email}
                </p>
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(member.status)}
                  {member.roles && member.roles.map((role: string, idx: number) => (
                    <Badge key={idx} variant="outline">{role}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    เปลี่ยนสถานะ
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เปลี่ยนสถานะสมาชิก</DialogTitle>
                    <DialogDescription>
                      เลือกสถานะใหม่สำหรับสมาชิกคนนี้
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus("active")}
                      className="justify-start"
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Active - สมาชิกปกติ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus("inactive")}
                      className="justify-start"
                    >
                      <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                      Inactive - ไม่ได้ใช้งาน
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus("suspended")}
                      className="justify-start"
                    >
                      <XCircle className="mr-2 h-4 w-4 text-yellow-500" />
                      Suspended - ระงับชั่วคราว
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus("blocked")}
                      className="justify-start"
                    >
                      <Ban className="mr-2 h-4 w-4 text-red-500" />
                      Blocked - บล็อกถาวร
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Engagement Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{member.engagement_score}</div>
              <p className="text-xs text-muted-foreground">
                {member.activity_level === 'high' && 'ระดับสูง'}
                {member.activity_level === 'medium' && 'ระดับปานกลาง'}
                {member.activity_level === 'low' && 'ระดับต่ำ'}
                {member.activity_level === 'inactive' && 'ไม่มีกิจกรรม'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                ลงทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{member.total_registrations}</div>
              <p className="text-xs text-muted-foreground">
                เข้าร่วมแล้ว {member.total_events_attended} งาน
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                การชำระเงิน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{member.total_amount_paid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {member.total_payments} ครั้ง
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Login ล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {member.last_login_at
                  ? format(new Date(member.last_login_at), "d MMM yyyy HH:mm", { locale: th })
                  : "ไม่เคย login"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
            <TabsTrigger value="registrations">ลงทะเบียน</TabsTrigger>
            <TabsTrigger value="payments">การชำระเงิน</TabsTrigger>
            <TabsTrigger value="notes">บันทึก</TabsTrigger>
            <TabsTrigger value="history">ประวัติ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Profile Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    ข้อมูลส่วนตัว
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{member.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Activity Level</Label>
                    <p className="font-medium">
                      {member.activity_level === 'high' && 'สูง'}
                      {member.activity_level === 'medium' && 'ปานกลาง'}
                      {member.activity_level === 'low' && 'ต่ำ'}
                      {member.activity_level === 'inactive' && 'ไม่มีกิจกรรม'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">สมัครเมื่อ</Label>
                    <p className="font-medium">
                      {format(new Date(member.created_at), "d MMMM yyyy HH:mm", { locale: th })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {!member.tags || member.tags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">ยังไม่มี tag</p>
                    ) : (
                      member.tags.map((tag: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                        >
                          {tag}
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer"
                            onClick={() => handleDeleteTag(tag)}
                          />
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag ใหม่"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle>ประวัติการลงทะเบียน</CardTitle>
                <CardDescription>ทั้งหมด {registrations.length} รายการ</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>งาน</TableHead>
                      <TableHead>วันที่งาน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>การชำระเงิน</TableHead>
                      <TableHead>ลงทะเบียนเมื่อ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          ไม่มีประวัติการลงทะเบียน
                        </TableCell>
                      </TableRow>
                    ) : (
                      registrations.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">{reg.events.title}</TableCell>
                          <TableCell>
                            {format(new Date(reg.events.start_date), "d MMM yyyy", { locale: th })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reg.status === "confirmed" ? "default" : "secondary"}>
                              {reg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={reg.payment_status === "paid" ? "default" : "destructive"}
                            >
                              {reg.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(reg.created_at), "d MMM yyyy", { locale: th })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>ประวัติการชำระเงิน</CardTitle>
                <CardDescription>ทั้งหมด {payments.length} รายการ</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>งาน</TableHead>
                      <TableHead className="text-right">จำนวนเงิน</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          ไม่มีประวัติการชำระเงิน
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.registration?.events?.title || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ฿{payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={payment.status === "success" ? "default" : "destructive"}
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.created_at), "d MMM yyyy", { locale: th })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  บันทึกของ Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="เพิ่มบันทึกใหม่..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="important"
                        checked={isImportantNote}
                        onChange={(e) => setIsImportantNote(e.target.checked)}
                      />
                      <Label htmlFor="important">สำคัญ</Label>
                    </div>
                    <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                      <Save className="mr-2 h-4 w-4" />
                      บันทึก
                    </Button>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">ยังไม่มีบันทึก</p>
                  ) : (
                    notes.map((note) => (
                      <Card key={note.id} className={note.is_important ? "border-yellow-500" : ""}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {note.is_important && (
                                <Badge className="bg-yellow-500">สำคัญ</Badge>
                              )}
                              <p className="text-sm text-muted-foreground">
                                โดย {note.created_by_profile.name || note.created_by_profile.email}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <p className="text-sm mb-2">{note.note}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "d MMM yyyy HH:mm", { locale: th })}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  ประวัติการเปลี่ยนสถานะ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusHistory.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">ไม่มีประวัติการเปลี่ยนสถานะ</p>
                ) : (
                  <div className="space-y-4">
                    {statusHistory.map((history) => (
                      <div key={history.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {history.old_status && (
                              <>
                                {getStatusBadge(history.old_status as MemberStatus)}
                                <span>→</span>
                              </>
                            )}
                            {getStatusBadge(history.new_status as MemberStatus)}
                          </div>
                          {history.reason && (
                            <p className="text-sm text-muted-foreground mb-1">
                              เหตุผล: {history.reason}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            โดย {history.changed_by_profile.name || history.changed_by_profile.email} •{" "}
                            {format(new Date(history.changed_at), "d MMM yyyy HH:mm", { locale: th })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MemberDetail;
