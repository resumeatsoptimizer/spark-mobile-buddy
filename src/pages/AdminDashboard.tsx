import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MetricsWidget } from "@/components/admin/DashboardWidgets/MetricsWidget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, DollarSign, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  successRate: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("30");
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    successRate: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchDashboardData();
    }
  }, [timeRange, loading]);

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

    const hasAccess = roles?.some((r) => r.role === "admin" || r.role === "staff");

    if (!hasAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setLoading(false);
  };

  const fetchDashboardData = async () => {
    try {
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch events
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .gte("created_at", startDate.toISOString());

      // Fetch registrations
      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, status, created_at")
        .gte("created_at", startDate.toISOString());

      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status, created_at")
        .gte("created_at", startDate.toISOString());

      const totalRevenue = payments
        ?.filter(p => p.status === "successful" || p.status === "success")
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const successfulPayments = payments?.filter(p => p.status === "successful" || p.status === "success").length || 0;
      const successRate = payments && payments.length > 0 ? (successfulPayments / payments.length) * 100 : 0;

      setStats({
        totalEvents: events?.length || 0,
        totalRegistrations: registrations?.length || 0,
        totalRevenue,
        successRate,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Monitor your event management metrics</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricsWidget
              title="Total Events"
              value={stats.totalEvents}
              icon={Calendar}
            />
            <MetricsWidget
              title="Registrations"
              value={stats.totalRegistrations}
              icon={Users}
            />
            <MetricsWidget
              title="Revenue"
              value={`฿${stats.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
            />
            <MetricsWidget
              title="Success Rate"
              value={`${stats.successRate.toFixed(1)}%`}
              icon={TrendingUp}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
