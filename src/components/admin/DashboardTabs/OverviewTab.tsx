import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricsWidget } from "../DashboardWidgets/MetricsWidget";
import { ChartWidget } from "../DashboardWidgets/ChartWidget";
import { Calendar, Users, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWidgetCustomization } from "../hooks/useWidgetCustomization";

interface DashboardStats {
  totalEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  successRate: number;
}

export function OverviewTab() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0,
    successRate: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [registrationTrends, setRegistrationTrends] = useState<any[]>([]);
  const { timeRange, setTimeRange } = useWidgetCustomization();

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

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

      // Monthly revenue data
      const revenueByMonth = payments?.reduce((acc: any, payment) => {
        if (payment.status === "successful" || payment.status === "success") {
          const month = new Date(payment.created_at).toLocaleDateString("en-US", { month: "short" });
          acc[month] = (acc[month] || 0) + Number(payment.amount);
        }
        return acc;
      }, {});

      setMonthlyRevenue(
        Object.entries(revenueByMonth || {}).map(([month, amount]) => ({ month, amount }))
      );

      // Registration trends
      const regByDay = registrations?.reduce((acc: any, reg) => {
        const date = new Date(reg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      setRegistrationTrends(
        Object.entries(regByDay || {}).map(([date, count]) => ({ date, count }))
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor your event management metrics</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <ChartWidget title="Monthly Revenue" description="Revenue trends over time">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>

        <ChartWidget title="Registration Trends" description="Daily registration activity">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={registrationTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--accent))", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartWidget>
      </div>
    </div>
  );
}
