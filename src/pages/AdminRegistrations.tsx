import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Search, RefreshCw, Download, Mail, FileDown, Trash2, CheckCircle, Send, CalendarIcon, Filter, X, Save } from "lucide-react";
import Navbar from "@/components/Navbar";
import { exportRegistrationsToCSV, exportEventRegistrations } from "@/lib/csvExport";

interface Registration {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  form_data?: any;
  user_id: string;
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

  // Advanced Filter States
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRangeType, setDateRangeType] = useState<"registration" | "event" | "payment">("registration");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(10000);
  const [searchOperator, setSearchOperator] = useState<"contains" | "exact" | "starts">("contains");
  const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({});
  const [availableCustomFields, setAvailableCustomFields] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [showSaveFilterDialog, setShowSaveFilterDialog] = useState(false);
  const [filterName, setFilterName] = useState("");

  useEffect(() => {
    checkAuth();
    fetchEvents();
    fetchRegistrations();
    loadSavedFilters();
  }, []);

  useEffect(() => {
    if (registrations.length > 0) {
      analyzeCustomFields();
    }
  }, [registrations]);

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
        profiles!registrations_user_id_fkey(email, name)
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

  // Advanced Filter Functions
  const analyzeCustomFields = () => {
    const fields = new Set<string>();
    registrations.forEach(reg => {
      if (reg.form_data && typeof reg.form_data === 'object') {
        Object.keys(reg.form_data).forEach(key => fields.add(key));
      }
    });
    setAvailableCustomFields(Array.from(fields));
  };

  const loadSavedFilters = () => {
    const saved = localStorage.getItem('adminRegistrationFilters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  };

  const saveFilterConfiguration = () => {
    if (!filterName.trim()) {
      toast({
        title: "กรุณาระบุชื่อ Filter",
        variant: "destructive",
      });
      return;
    }

    const newFilter = {
      id: Date.now().toString(),
      name: filterName,
      config: {
        dateRangeType,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        minAmount,
        maxAmount,
        searchQuery,
        searchOperator,
        filterStatus,
        filterEvent,
        customFieldFilters
      }
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('adminRegistrationFilters', JSON.stringify(updated));
    toast({
      title: "บันทึก Filter เรียบร้อยแล้ว",
      description: `บันทึก "${filterName}" เรียบร้อยแล้ว`,
    });
    setShowSaveFilterDialog(false);
    setFilterName("");
  };

  const loadFilterConfiguration = (filter: any) => {
    const config = filter.config;
    setDateRangeType(config.dateRangeType);
    setStartDate(config.startDate ? new Date(config.startDate) : undefined);
    setEndDate(config.endDate ? new Date(config.endDate) : undefined);
    setMinAmount(config.minAmount);
    setMaxAmount(config.maxAmount);
    setSearchQuery(config.searchQuery);
    setSearchOperator(config.searchOperator);
    setFilterStatus(config.filterStatus);
    setFilterEvent(config.filterEvent);
    setCustomFieldFilters(config.customFieldFilters);
    toast({
      title: "โหลด Filter เรียบร้อยแล้ว",
      description: `โหลด "${filter.name}" เรียบร้อยแล้ว`,
    });
  };

  const deleteFilterConfiguration = (filterId: string) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('adminRegistrationFilters', JSON.stringify(updated));
    toast({
      title: "ลบ Filter เรียบร้อยแล้ว",
    });
  };

  const clearAllFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setMinAmount(0);
    setMaxAmount(10000);
    setSearchQuery("");
    setSearchOperator("contains");
    setFilterStatus("all");
    setFilterEvent("all");
    setCustomFieldFilters({});
    toast({
      title: "ล้าง Filter ทั้งหมดเรียบร้อยแล้ว",
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (startDate || endDate) count++;
    if (minAmount > 0 || maxAmount < 10000) count++;
    if (searchQuery) count++;
    if (filterStatus !== "all") count++;
    if (filterEvent !== "all") count++;
    if (Object.keys(customFieldFilters).length > 0) count++;
    return count;
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
    // Search filter with operator
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchFields = [
        reg.profiles?.name,
        reg.profiles?.email,
        reg.events?.title,
        ...(reg.form_data && typeof reg.form_data === 'object' 
          ? Object.values(reg.form_data).map(v => String(v)) 
          : [])
      ];
      
      const matches = searchFields.some(field => {
        const fieldLower = field?.toLowerCase() || "";
        if (searchOperator === "exact") {
          return fieldLower === query;
        } else if (searchOperator === "starts") {
          return fieldLower.startsWith(query);
        } else {
          return fieldLower.includes(query);
        }
      });
      
      if (!matches) return false;
    }

    // Date range filter
    if (startDate || endDate) {
      let dateToCheck: Date | null = null;
      
      if (dateRangeType === "registration") {
        dateToCheck = new Date(reg.created_at);
      } else if (dateRangeType === "event" && reg.events?.start_date) {
        dateToCheck = new Date(reg.events.start_date);
      }

      if (dateToCheck) {
        if (startDate && dateToCheck < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (dateToCheck > endOfDay) return false;
        }
      }
    }

    // Payment amount filter
    if (reg.ticket_types?.price !== undefined && reg.ticket_types?.price !== null) {
      const amount = Number(reg.ticket_types.price);
      if (amount < minAmount || amount > maxAmount) return false;
    } else if (minAmount > 0) {
      return false;
    }

    // Status filter
    if (filterStatus !== "all" && reg.status !== filterStatus) {
      return false;
    }

    // Event filter
    if (filterEvent !== "all" && reg.events?.id !== filterEvent) {
      return false;
    }

    // Custom field filters
    if (Object.keys(customFieldFilters).length > 0) {
      for (const [key, value] of Object.entries(customFieldFilters)) {
        if (value && reg.form_data) {
          const formData = reg.form_data as Record<string, any>;
          if (!formData[key] || !String(formData[key]).toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
        }
      }
    }

    return true;
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
            <CardTitle className="flex items-center justify-between">
              <span>ค้นหาและกรองข้อมูล</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  ฟิลเตอร์ขั้นสูง
                  {getActiveFilterCount() > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {getActiveFilterCount()}
                    </Badge>
                  )}
                </Button>
                {getActiveFilterCount() > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    ล้างทั้งหมด
                  </Button>
                )}
              </div>
            </CardTitle>
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

              {/* Advanced Filters */}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleContent className="mt-4 space-y-4">
                  {/* Date Range Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">ประเภทวันที่</label>
                      <Select value={dateRangeType} onValueChange={(value: any) => setDateRangeType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registration">วันที่ลงทะเบียน</SelectItem>
                          <SelectItem value="event">วันที่จัดงาน</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP", { locale: th }) : <span>เลือกวันที่</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">วันที่สิ้นสุด</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP", { locale: th }) : <span>เลือกวันที่</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Payment Amount Range */}
                  <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                    <label className="text-sm font-medium">ช่วงราคา: ฿{minAmount.toLocaleString()} - ฿{maxAmount.toLocaleString()}</label>
                    <Slider
                      value={[minAmount, maxAmount]}
                      onValueChange={([min, max]) => {
                        setMinAmount(min);
                        setMaxAmount(max);
                      }}
                      max={10000}
                      min={0}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => { setMinAmount(0); setMaxAmount(500); }}>
                        0-500
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setMinAmount(500); setMaxAmount(1000); }}>
                        500-1,000
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setMinAmount(1000); setMaxAmount(10000); }}>
                        1,000+
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setMinAmount(0); setMaxAmount(0); }}>
                        งานฟรี
                      </Button>
                    </div>
                  </div>

                  {/* Search Operator */}
                  <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                    <label className="text-sm font-medium">รูปแบบการค้นหา</label>
                    <Select value={searchOperator} onValueChange={(value: any) => setSearchOperator(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">มีคำที่ค้นหา (Contains)</SelectItem>
                        <SelectItem value="exact">ตรงทุกอักษร (Exact)</SelectItem>
                        <SelectItem value="starts">เริ่มต้นด้วย (Starts With)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Field Filters */}
                  {availableCustomFields.length > 0 && (
                    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                      <label className="text-sm font-medium">ฟิลด์เพิ่มเติม</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableCustomFields.map(field => (
                          <div key={field} className="space-y-2">
                            <label className="text-xs text-muted-foreground">{field}</label>
                            <Input
                              placeholder={`ค้นหา ${field}...`}
                              value={customFieldFilters[field] || ""}
                              onChange={(e) => setCustomFieldFilters({
                                ...customFieldFilters,
                                [field]: e.target.value
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filter Actions */}
                  <div className="flex gap-2 justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {savedFilters.map(filter => (
                        <div key={filter.id} className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => loadFilterConfiguration(filter)}
                          >
                            {filter.name}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => deleteFilterConfiguration(filter.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => setShowSaveFilterDialog(true)}>
                      <Save className="h-4 w-4 mr-2" />
                      บันทึก Filter
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
                  <TableHead>กิจกรรม</TableHead>
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
                          <p className="font-medium">
                            {reg.profiles?.name || 'ไม่ระบุ'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reg.profiles?.email || '-'}
                          </p>
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

      {/* Save Filter Dialog */}
      <AlertDialog open={showSaveFilterDialog} onOpenChange={setShowSaveFilterDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>บันทึก Filter</AlertDialogTitle>
            <AlertDialogDescription>
              ระบุชื่อสำหรับ Filter Configuration นี้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="ชื่อ Filter..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFilterName("")}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={saveFilterConfiguration}>บันทึก</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRegistrations;
