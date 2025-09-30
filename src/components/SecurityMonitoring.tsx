import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Activity, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SecurityMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
}

const SecurityMonitoring = () => {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityMetrics();
    const interval = setInterval(fetchSecurityMetrics, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      // Fetch failed login attempts (last 24h)
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);

      const { count: failedLogins } = await supabase
        .from("security_audit_log")
        .select("*", { count: "exact", head: true })
        .eq("action_type", "login_failed")
        .gte("created_at", dayAgo.toISOString());

      // Fetch suspicious activities
      const { count: suspiciousActivities } = await supabase
        .from("security_audit_log")
        .select("*", { count: "exact", head: true })
        .eq("severity", "warning")
        .gte("created_at", dayAgo.toISOString());

      // Fetch active API keys
      const { count: activeApiKeys } = await supabase
        .from("api_keys")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Fetch 2FA enabled users
      const { count: twoFAUsers } = await supabase
        .from("user_2fa")
        .select("*", { count: "exact", head: true })
        .eq("is_enabled", true);

      setMetrics([
        {
          label: "Failed Login Attempts (24h)",
          value: failedLogins || 0,
          icon: <Lock className="h-4 w-4" />,
          trend: (failedLogins || 0) > 10 ? "up" : "stable",
        },
        {
          label: "Suspicious Activities",
          value: suspiciousActivities || 0,
          icon: <AlertTriangle className="h-4 w-4" />,
          trend: (suspiciousActivities || 0) > 5 ? "up" : "stable",
        },
        {
          label: "Active API Keys",
          value: activeApiKeys || 0,
          icon: <Activity className="h-4 w-4" />,
          trend: "stable",
        },
        {
          label: "2FA Enabled Users",
          value: twoFAUsers || 0,
          icon: <Shield className="h-4 w-4" />,
          trend: "stable",
        },
      ]);

      // Fetch recent security alerts
      const { data: alerts } = await supabase
        .from("security_audit_log")
        .select("*")
        .eq("severity", "warning")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentAlerts(alerts || []);
    } catch (error) {
      console.error("Error fetching security metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "info":
        return <Badge variant="outline">Info</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.trend && (
                <p className={`text-xs ${
                  metric.trend === "up" ? "text-red-500" : "text-green-500"
                }`}>
                  {metric.trend === "up" ? "↑ Increased" : "→ Stable"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Security Alerts
          </CardTitle>
          <CardDescription>
            Latest security events requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No recent alerts
            </p>
          ) : (
            <div className="space-y-4">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.action_type}</p>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.resource_type && `Resource: ${alert.resource_type}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitoring;
