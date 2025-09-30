import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, DollarSign, TrendingUp, CreditCard, CheckCircle, XCircle, Clock, Download, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface RegistrationTrend {
  month: string;
  registrations: number;
}

interface EventPopularity {
  name: string;
  count: number;
}

interface PaymentDistribution {
  name: string;
  value: number;
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
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [registrationTrends, setRegistrationTrends] = useState<RegistrationTrend[]>([]);
  const [eventPopularity, setEventPopularity] = useState<EventPopularity[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<PaymentDistribution[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    checkAuth();
    fetchDashboardData();

    // Set up real-time subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations'
        },
        () => {
          console.log('Registrations changed, refreshing...');
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          console.log('Payments changed, refreshing...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
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

      // Fetch registrations with created_at
      const { data: registrations, count: registrationsCount } = await supabase
        .from("registrations")
        .select("*, event:events(title), ticket_type:ticket_types(name, price)");

      const confirmedCount = registrations?.filter(r => r.status === "confirmed").length || 0;

      // Fetch payments with created_at
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status, created_at");

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

      // Calculate monthly revenue for last 6 months
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        return {
          start: startOfMonth(date),
          end: endOfMonth(date),
          label: format(date, 'MMM yyyy', { locale: th })
        };
      });

      const revenueData = last6Months.map(month => {
        const monthPayments = payments?.filter(p => {
          const pDate = new Date(p.created_at);
          return p.status === "successful" && pDate >= month.start && pDate <= month.end;
        }) || [];
        
        const revenue = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        return { month: month.label, revenue };
      });
      setMonthlyRevenue(revenueData);

      // Calculate registration trends
      const trendData = last6Months.map(month => {
        const monthRegs = registrations?.filter(r => {
          const rDate = new Date(r.created_at);
          return rDate >= month.start && rDate <= month.end;
        }) || [];
        
        return { month: month.label, registrations: monthRegs.length };
      });
      setRegistrationTrends(trendData);

      // Calculate event popularity (top 5)
      const eventCounts = registrations?.reduce((acc, reg) => {
        const eventTitle = reg.event?.title || "ไม่ระบุ";
        acc[eventTitle] = (acc[eventTitle] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const popularityData = Object.entries(eventCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      setEventPopularity(popularityData);

      // Payment distribution
      const distributionData = [
        { name: "ชำระสำเร็จ", value: successfulPayments },
        { name: "รอชำระ", value: pendingPayments },
        { name: "ล้มเหลว", value: failedPayments },
      ].filter(d => d.value > 0);
      setPaymentDistribution(distributionData);

      // Get recent registrations
      const { data: recent } = await supabase
        .from("registrations")
        .select("id, created_at, status, payment_status, event:events(title), ticket_type:ticket_types(name, price)")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentRegistrations(recent || []);
      setLastUpdate(new Date());
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
              <p className="text-muted-foreground">
                ภาพรวมและสถิติการจัดการงานอีเว้นท์
                <span className="ml-2 text-xs">
                  อัพเดทล่าสุด: {format(lastUpdate, "HH:mm:ss", { locale: th })} น.
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchDashboardData} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                รีเฟรช
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
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

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>รายได้รายเดือน</CardTitle>
              <CardDescription>รายได้ย้อนหลัง 6 เดือน</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Registration Trends */}
          <Card>
            <CardHeader>
              <CardTitle>แนวโน้มการลงทะเบียน</CardTitle>
              <CardDescription>จำนวนผู้ลงทะเบียนย้อนหลัง 6 เดือน</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={registrationTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="registrations" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Event Popularity */}
          <Card>
            <CardHeader>
              <CardTitle>งานยอดนิยม</CardTitle>
              <CardDescription>Top 5 งานที่มีผู้ลงทะเบียนมากที่สุด</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventPopularity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number"
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>สัดส่วนสถานะการชำระเงิน</CardTitle>
              <CardDescription>การกระจายของสถานะการชำระเงิน</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {paymentDistribution.map((entry, index) => {
                      const colors = [
                        "hsl(142 76% 36%)",  // green for successful
                        "hsl(48 96% 53%)",   // yellow for pending
                        "hsl(0 84% 60%)",    // red for failed
                      ];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
