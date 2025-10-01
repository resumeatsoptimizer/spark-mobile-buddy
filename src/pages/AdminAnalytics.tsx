import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, Users, DollarSign, AlertTriangle, Calendar, RefreshCw, Sparkles } from "lucide-react";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { AIChatAssistant } from "@/components/AIChatAssistant";
import Navbar from "@/components/Navbar";

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  trend?: "up" | "down";
}

export default function AdminAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load recent metrics
      const { data: metricsData } = await supabase
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);

      setMetrics(metricsData || []);

      // Load events with registrations
      const { data: eventsData } = await supabase
        .from('events')
        .select(`
          *,
          registrations(count)
        `);

      setEvents(eventsData || []);

      // Load recent analytics events
      const { data: alertsData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'alert_triggered')
        .order('created_at', { ascending: false })
        .limit(10);

      setAlerts(alertsData || []);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const collectMetrics = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('metrics-aggregator');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Metrics collected successfully",
      });

      await loadAnalytics();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('alert-processor');
      
      if (error) throw error;

      toast({
        title: "Alerts Processed",
        description: `${data?.alerts_triggered || 0} alerts triggered`,
      });

      await loadAnalytics();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const totalEvents = events.length;
  const totalCapacity = events.reduce((sum, e) => sum + e.seats_total, 0);
  const remainingSeats = events.reduce((sum, e) => sum + e.seats_remaining, 0);
  const capacityUtilization = totalCapacity > 0 ? ((totalCapacity - remainingSeats) / totalCapacity * 100).toFixed(1) : 0;

  const revenueMetric = metrics.find(m => m.metric_name === 'total_revenue');
  const totalRevenue = revenueMetric ? Number(revenueMetric.metric_value).toFixed(2) : '0.00';

  const registrationsMetric = metrics.find(m => m.metric_name === 'total_registrations');
  const totalRegistrations = registrationsMetric ? registrationsMetric.metric_value : 0;

  const failedTasksMetric = metrics.find(m => m.metric_name === 'failed_tasks');
  const failedTasks = failedTasksMetric ? failedTasksMetric.metric_value : 0;

  const kpiCards: MetricCard[] = [
    {
      title: "Total Events",
      value: totalEvents,
      icon: Calendar,
      change: "+12%",
      trend: "up"
    },
    {
      title: "Capacity Utilization",
      value: `${capacityUtilization}%`,
      icon: TrendingUp,
      change: "+5%",
      trend: "up"
    },
    {
      title: "Total Registrations",
      value: totalRegistrations,
      icon: Users,
      change: "+18%",
      trend: "up"
    },
    {
      title: "Total Revenue",
      value: `฿${totalRevenue}`,
      icon: DollarSign,
      change: "+23%",
      trend: "up"
    },
    {
      title: "System Alerts",
      value: alerts.length,
      icon: AlertTriangle,
      trend: alerts.length > 0 ? "up" : undefined
    },
    {
      title: "Failed Tasks",
      value: failedTasks,
      icon: Activity,
      trend: failedTasks > 0 ? "down" : undefined
    }
  ];

  // Prepare chart data
  const eventPerformanceData = events.map(event => ({
    name: event.title.substring(0, 20),
    capacity: event.seats_total,
    booked: event.seats_total - event.seats_remaining,
    remaining: event.seats_remaining
  }));

  const metricsTimelineData = metrics
    .filter(m => m.metric_name === 'total_revenue')
    .slice(0, 10)
    .reverse()
    .map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString(),
      revenue: Number(m.metric_value)
    }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Real-time system monitoring and performance analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={collectMetrics} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Collect Metrics
          </Button>
          <Button onClick={processAlerts} disabled={loading} variant="outline">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Process Alerts
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                {card.change && (
                  <p className={`text-xs ${card.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {card.change} from last month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ai-insights">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="ai-chat">AI Assistant</TabsTrigger>
          <TabsTrigger value="events">Event Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial Analytics</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Capacity Overview</CardTitle>
                <CardDescription>Current capacity utilization across all events</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eventPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="booked" fill="hsl(var(--primary))" name="Booked" />
                    <Bar dataKey="remaining" fill="hsl(var(--muted))" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Total revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} name="Revenue (THB)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Generate predictive analytics, recommendations, and optimization suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIInsightsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-chat" className="space-y-6">
          <AIChatAssistant />
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Performance Details</CardTitle>
              <CardDescription>Detailed breakdown of each event's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event) => {
                  const utilization = ((event.seats_total - event.seats_remaining) / event.seats_total * 100).toFixed(1);
                  return (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.seats_total - event.seats_remaining} / {event.seats_total} seats booked
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{utilization}%</div>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
              <CardDescription>Revenue and payment analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Detailed financial analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Health Metrics</CardTitle>
              <CardDescription>Real-time system performance monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.slice(0, 20).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{metric.metric_name}</p>
                      <p className="text-sm text-muted-foreground">{metric.metric_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{Number(metric.metric_value).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.recorded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>System alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 p-4 border rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">{alert.event_data?.rule_name || 'System Alert'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {JSON.stringify(alert.event_data?.alert_data || {})}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No alerts to display</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}