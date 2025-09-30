import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, RefreshCw, Download, Mail, FileDown, Trash2, CheckCircle, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import { exportRegistrationsToCSV, exportEventRegistrations } from "@/lib/csvExport";

interface Registration {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  form_data?: any;
  events: {
    id: string;
    title: string;
    start_date: string;
    location: string | null;
  };
  ticket_types: {
    name: string;
    price: number;
  } | null;
  profiles: {
    email: string;
    name: string;
  };
}

const AdminRegistrations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchEvents();
    fetchRegistrations();
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
      .eq("user_id", session.user.id)
      .single();

    if (roles?.role !== "admin" && roles?.role !== "staff") {
      navigate("/");
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
        variant: "destructive",
      });
    }
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title")
      .order("title");

    setEvents(data || []);
  };

  const fetchRegistrations = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("registrations")
      .select(`
        *,
        events(id, title, start_date, location),
        ticket_types(name, price),
        profiles:user_id(email, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching registrations:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      setRegistrations(data || []);
    }
    
    setLoading(false);
  };

  const updateRegistrationStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("registrations")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสถานะเรียบร้อยแล้ว",
      });
      fetchRegistrations();
    }
  };

  const sendConfirmationEmail = async (email: string, eventTitle: string) => {
    try {
      // Find the registration for this email and event
      const registration = registrations.find(r => 
        r.profiles.email === email && r.events.title === eventTitle
      );
      
      if (!registration) {
        toast({
          title: "ไม่พบข้อมูล",
          description: "ไม่พบข้อมูลการลงทะเบียน",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.functions.invoke('send-registration-email', {
        body: {
          type: 'status_update',
          recipientEmail: registration.profiles.email,
          recipientName: registration.profiles.name,
          eventTitle: registration.events.title,
          eventDate: registration.events.start_date,
          eventLocation: registration.events.location,
          registrationId: registration.id,
          status: registration.status,
          ticketType: registration.ticket_types?.name,
        }
      });

      if (error) {
        toast({
          title: "ส่งอีเมลล้มเหลว",
          description: "กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      } else {
        toast({
          title: "ส่งอีเมลสำเร็จ",
          description: "ส่งอีเมลยืนยันไปยังผู้ลงทะเบียนแล้ว",
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งอีเมลได้",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    try {
      exportRegistrationsToCSV(filteredRegistrations);
      toast({
        title: "ส่งออกข้อมูลสำเร็จ",
        description: `ส่งออกข้อมูล ${filteredRegistrations.length} รายการเรียบร้อยแล้ว`,
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งออกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  };

  const handleExportByEvent = () => {
    if (!filterEvent || filterEvent === "all") {
      toast({
        title: "กรุณาเลือกงาน",
        description: "กรุณาเลือกงานที่ต้องการส่งออกข้อมูล",
        variant: "destructive",
      });
      return;
    }

    const eventRegistrations = filteredRegistrations.filter(
      (reg) => reg.events.id === filterEvent
    );

    if (eventRegistrations.length === 0) {
      toast({
        title: "ไม่พบข้อมูล",
        description: "ไม่มีข้อมูลการลงทะเบียนสำหรับงานนี้",
        variant: "destructive",
      });
      return;
    }

    const eventTitle = events.find((e) => e.id === filterEvent)?.title || "event";
    exportEventRegistrations(eventRegistrations, eventTitle);
    toast({
      title: "ส่งออกข้อมูลสำเร็จ",
      description: `ส่งออกข้อมูล ${eventRegistrations.length} รายการเรียบร้อยแล้ว`,
    });
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegistrations.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Bulk operations
  const handleBulkAction = (action: string) => {
    if (selectedIds.size === 0) {
      toast({
        title: "กรุณาเลือกรายการ",
        description: "กรุณาเลือกรายการที่ต้องการดำเนินการ",
        variant: "destructive",
      });
      return;
    }
    setBulkAction(action);
    setShowBulkDialog(true);
  };

  const confirmBulkAction = async () => {
    setShowBulkDialog(false);
    setIsBulkProcessing(true);
    setBulkProgress(0);

    const selectedRegs = registrations.filter(r => selectedIds.has(r.id));
    const total = selectedRegs.length;

    try {
      switch (bulkAction) {
        case "status-confirmed":
        case "status-pending":
        case "status-cancelled":
          await processBulkStatusUpdate(selectedRegs, bulkAction.replace("status-", ""), total);
          break;
        case "email":
          await processBulkEmail(selectedRegs, total);
          break;
        case "export":
          exportRegistrationsToCSV(selectedRegs, `bulk_export_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`);
          toast({
            title: "ส่งออกสำเร็จ",
            description: `ส่งออกข้อมูล ${total} รายการเรียบร้อยแล้ว`,
          });
          break;
        case "delete":
          await processBulkDelete(selectedRegs, total);
          break;
      }
    } catch (error) {
      console.error("Bulk operation error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }

    setIsBulkProcessing(false);
    setBulkProgress(0);
    setSelectedIds(new Set());
    fetchRegistrations();
  };

  const processBulkStatusUpdate = async (regs: Registration[], newStatus: string, total: number) => {
    let completed = 0;
    
    for (const reg of regs) {
      await supabase
        .from("registrations")
        .update({ status: newStatus })
        .eq("id", reg.id);
      
      completed++;
      setBulkProgress((completed / total) * 100);
    }

    toast({
      title: "อัปเดตสถานะสำเร็จ",
      description: `อัปเดตสถานะ ${total} รายการเป็น "${newStatus === 'confirmed' ? 'ยืนยันแล้ว' : newStatus === 'pending' ? 'รอดำเนินการ' : 'ยกเลิก'}" เรียบร้อยแล้ว`,
    });
  };

  const processBulkEmail = async (regs: Registration[], total: number) => {
    let completed = 0;
    let success = 0;
    let failed = 0;

    for (const reg of regs) {
      try {
        const { error } = await supabase.functions.invoke('send-registration-email', {
          body: {
            type: 'status_update',
            recipientEmail: reg.profiles.email,
            recipientName: reg.profiles.name,
            eventTitle: reg.events.title,
            eventDate: reg.events.start_date,
            eventLocation: reg.events.location,
            registrationId: reg.id,
            status: reg.status,
            ticketType: reg.ticket_types?.name,
          }
        });

        if (error) {
          failed++;
        } else {
          success++;
        }
      } catch {
        failed++;
      }

      completed++;
      setBulkProgress((completed / total) * 100);
    }

    toast({
      title: "ส่งอีเมลเสร็จสิ้น",
      description: `ส่งสำเร็จ: ${success} | ล้มเหลว: ${failed}`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const processBulkDelete = async (regs: Registration[], total: number) => {
    let completed = 0;

    for (const reg of regs) {
      await supabase
        .from("registrations")
        .delete()
        .eq("id", reg.id);
      
      completed++;
      setBulkProgress((completed / total) * 100);
    }

    toast({
      title: "ลบข้อมูลสำเร็จ",
      description: `ลบข้อมูล ${total} รายการเรียบร้อยแล้ว`,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      pending: "secondary",
      cancelled: "destructive",
      waitlist: "outline",
    };

    const labels: Record<string, string> = {
      confirmed: "ยืนยันแล้ว",
      pending: "รอดำเนินการ",
      cancelled: "ยกเลิก",
      waitlist: "รอคิว",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    return (
      <Badge variant={status === "paid" ? "default" : "secondary"}>
        {status === "paid" ? "ชำระแล้ว" : "ยังไม่ชำระ"}
      </Badge>
    );
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = 
      reg.events?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" || reg.status === filterStatus;
    const matchesEvent = filterEvent === "all" || reg.events?.id === filterEvent;

    return matchesSearch && matchesStatus && matchesEvent;
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
              <h1 className="text-3xl font-bold mb-2">จัดการการลงทะเบียน</h1>
              <p className="text-muted-foreground">ตรวจสอบและจัดการผู้ลงทะเบียนทั้งหมด</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportCSV} variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                ส่งออก CSV
              </Button>
              {filterEvent && filterEvent !== "all" && (
                <Button onClick={handleExportByEvent} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  ส่งออกงานนี้
                </Button>
              )}
              <Button onClick={fetchRegistrations} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                รีเฟรช
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registrations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ยืนยันแล้ว</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registrations.filter(r => r.status === "confirmed").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">รอดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registrations.filter(r => r.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ยกเลิก</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {registrations.filter(r => r.status === "cancelled").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ค้นหาและกรองข้อมูล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาชื่องาน, อีเมล, ชื่อผู้ลงทะเบียน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterEvent} onValueChange={setFilterEvent}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="เลือกงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">งานทั้งหมด</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  ทั้งหมด
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "confirmed" ? "default" : "outline"}
                  onClick={() => setFilterStatus("confirmed")}
                >
                  ยืนยันแล้ว
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  onClick={() => setFilterStatus("pending")}
                >
                  รอดำเนินการ
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "cancelled" ? "default" : "outline"}
                  onClick={() => setFilterStatus("cancelled")}
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <Card className="mb-6 border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="text-base px-3 py-1">
                    เลือกแล้ว {selectedIds.size} รายการ
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    ยกเลิกทั้งหมด
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => handleBulkAction(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="เปลี่ยนสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status-confirmed">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          เป็น "ยืนยันแล้ว"
                        </div>
                      </SelectItem>
                      <SelectItem value="status-pending">เป็น "รอดำเนินการ"</SelectItem>
                      <SelectItem value="status-cancelled">เป็น "ยกเลิก"</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("email")}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    ส่งอีเมลหมู่
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction("export")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    ส่งออก CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction("delete")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    ลบทั้งหมด
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Indicator */}
        {isBulkProcessing && (
          <Card className="mb-6 border-primary">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">กำลังดำเนินการ...</p>
                  <p className="text-sm text-muted-foreground">{Math.round(bulkProgress)}%</p>
                </div>
                <Progress value={bulkProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registrations Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการลงทะเบียน</CardTitle>
            <CardDescription>รายการลงทะเบียนทั้งหมด ({filteredRegistrations.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredRegistrations.length && filteredRegistrations.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>วันที่ลงทะเบียน</TableHead>
                  <TableHead>งานอีเว้นท์</TableHead>
                  <TableHead>ผู้ลงทะเบียน</TableHead>
                  <TableHead>ประเภทบัตร</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การชำระเงิน</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(reg.id)}
                          onCheckedChange={() => toggleSelect(reg.id)}
                        />
                      </TableCell>
                       <TableCell className="whitespace-nowrap">
                        {format(new Date(reg.created_at), "d MMM yyyy, HH:mm", { locale: th })}
                      </TableCell>
                      <TableCell>{reg.events?.title}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reg.profiles?.name}</p>
                          <p className="text-xs text-muted-foreground">{reg.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reg.ticket_types ? (
                          <div>
                            <p className="font-medium">{reg.ticket_types.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ฿{reg.ticket_types.price.toLocaleString()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(reg.status)}</TableCell>
                      <TableCell>{getPaymentBadge(reg.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Select
                            value={reg.status}
                            onValueChange={(value) => updateRegistrationStatus(reg.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">รอดำเนินการ</SelectItem>
                              <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                              <SelectItem value="cancelled">ยกเลิก</SelectItem>
                              <SelectItem value="waitlist">รอคิว</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendConfirmationEmail(reg.profiles?.email, reg.events?.title)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการดำเนินการ</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete" && (
                <>
                  คุณกำลังจะลบข้อมูล <strong>{selectedIds.size}</strong> รายการ 
                  การดำเนินการนี้ไม่สามารถยกเลิกได้
                </>
              )}
              {bulkAction === "email" && (
                <>
                  คุณกำลังจะส่งอีเมลไปยัง <strong>{selectedIds.size}</strong> รายการ
                </>
              )}
              {bulkAction.startsWith("status-") && (
                <>
                  คุณกำลังจะเปลี่ยนสถานะของ <strong>{selectedIds.size}</strong> รายการ
                  เป็น "{bulkAction === 'status-confirmed' ? 'ยืนยันแล้ว' : bulkAction === 'status-pending' ? 'รอดำเนินการ' : 'ยกเลิก'}"
                </>
              )}
              {bulkAction === "export" && (
                <>
                  คุณกำลังจะส่งออกข้อมูล <strong>{selectedIds.size}</strong> รายการ
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction}>
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRegistrations;
