import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, DollarSign, TrendingUp, CreditCard, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface DashboardStats {
  totalEvents: number;
  totalRegistrations: number;
  confirmedRegistrations: number;
  totalRevenue: number;
  pendingPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averageTicketPrice: number;
}

interface RecentRegistration {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  event: {
    title: string;
  };
  ticket_type: {
    name: string;
    price: number;
  } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalRegistrations: 0,
    confirmedRegistrations: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    averageTicketPrice: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>([]);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
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
      return;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      // Fetch events count
      const { count: eventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });

      // Fetch registrations
      const { data: registrations, count: registrationsCount } = await supabase
        .from("registrations")
        .select("*, event:events(title), ticket_type:ticket_types(name, price)", { count: "exact" });

      const confirmedCount = registrations?.filter(r => r.status === "confirmed").length || 0;

      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status");

      const totalRevenue = payments?.reduce((sum, p) => p.status === "successful" ? sum + Number(p.amount) : sum, 0) || 0;
      const pendingPayments = payments?.filter(p => p.status === "pending").length || 0;
      const successfulPayments = payments?.filter(p => p.status === "successful").length || 0;
      const failedPayments = payments?.filter(p => p.status === "failed").length || 0;

      // Calculate average ticket price
      const paidRegistrations = registrations?.filter(r => r.ticket_type?.price && r.ticket_type.price > 0) || [];
      const averagePrice = paidRegistrations.length > 0
        ? paidRegistrations.reduce((sum, r) => sum + Number(r.ticket_type?.price || 0), 0) / paidRegistrations.length
        : 0;

      setStats({
        totalEvents: eventsCount || 0,
        totalRegistrations: registrationsCount || 0,
        confirmedRegistrations: confirmedCount,
        totalRevenue,
        pendingPayments,
        successfulPayments,
        failedPayments,
        averageTicketPrice: averagePrice,
      });

      // Get recent registrations
      const { data: recent } = await supabase
        .from("registrations")
        .select("id, created_at, status, payment_status, event:events(title), ticket_type:ticket_types(name, price)")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentRegistrations(recent || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const exportToCSV = () => {
    toast({
      title: "กำลังดำเนินการ",
      description: "ฟีเจอร์ Export CSV จะเปิดใช้งานในเร็วๆ นี้",
    });
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">ภาพรวมและสถิติการจัดการงานอีเว้นท์</p>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                งานอีเว้นท์ทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground mt-1">จำนวนงานทั้งหมดในระบบ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                การลงทะเบียน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRegistrations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ยืนยันแล้ว: {stats.confirmedRegistrations}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                รายได้รวม
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">฿{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ค่าเฉลี่ย: ฿{stats.averageTicketPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                อัตราสำเร็จ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.totalRegistrations > 0
                  ? Math.round((stats.confirmedRegistrations / stats.totalRegistrations) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                อัตราการยืนยันการลงทะเบียน
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                ชำระเงินสำเร็จ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successfulPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                รอชำระเงิน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                ชำระเงินล้มเหลว
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedPayments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/events")}>
            <CardHeader>
              <CardTitle className="text-base">จัดการงานอีเว้นท์</CardTitle>
              <CardDescription>สร้าง แก้ไข หรือลบงานอีเว้นท์</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/payments")}>
            <CardHeader>
              <CardTitle className="text-base">จัดการการชำระเงิน</CardTitle>
              <CardDescription>ตรวจสอบและจัดการการชำระเงิน</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/registrations")}>
            <CardHeader>
              <CardTitle className="text-base">จัดการการลงทะเบียน</CardTitle>
              <CardDescription>ดูและจัดการผู้ลงทะเบียน</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>การลงทะเบียนล่าสุด</CardTitle>
            <CardDescription>รายการลงทะเบียนล่าสุด 10 รายการ</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRegistrations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ยังไม่มีการลงทะเบียน</p>
            ) : (
              <div className="space-y-4">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{reg.event?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reg.ticket_type?.name} - ฿{reg.ticket_type?.price?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reg.created_at), "d MMM yyyy, HH:mm", { locale: th })} น.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={reg.status === "confirmed" ? "default" : reg.status === "cancelled" ? "destructive" : "secondary"}>
                        {reg.status === "confirmed" ? "ยืนยันแล้ว" : reg.status === "cancelled" ? "ยกเลิก" : "รอดำเนินการ"}
                      </Badge>
                      <Badge variant={reg.payment_status === "paid" ? "default" : reg.payment_status === "unpaid" ? "secondary" : "outline"}>
                        {reg.payment_status === "paid" ? "ชำระแล้ว" : "ยังไม่ชำระ"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
