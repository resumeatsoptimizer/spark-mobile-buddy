import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Video, Mail, Share2, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";

interface Integration {
  id: string;
  integration_type: string;
  is_enabled: boolean;
  config: any;
  updated_at: string;
}

interface IntegrationLog {
  id: string;
  integration_type: string;
  action: string;
  status: string;
  created_at: string;
  error_message?: string;
}

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
    fetchLogs();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .order("integration_type");

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const toggleIntegration = async (integrationType: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("integration_settings")
        .update({ is_enabled: enabled })
        .eq("integration_type", integrationType);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${integrationType} ${enabled ? "enabled" : "disabled"}`,
      });

      fetchIntegrations();
    } catch (error) {
      console.error("Error toggling integration:", error);
      toast({
        title: "Error",
        description: "Failed to update integration",
        variant: "destructive",
      });
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case "google_calendar":
        return <Calendar className="h-5 w-5" />;
      case "zoom":
      case "teams":
        return <Video className="h-5 w-5" />;
      case "mailchimp":
      case "sendgrid":
        return <Mail className="h-5 w-5" />;
      case "facebook":
      case "twitter":
      case "linkedin":
        return <Share2 className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const IntegrationCard = ({ integration }: { integration: Integration }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getIntegrationIcon(integration.integration_type)}
            <div>
              <CardTitle className="text-lg capitalize">
                {integration.integration_type.replace("_", " ")}
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(integration.updated_at).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={integration.is_enabled}
            onCheckedChange={(checked) => toggleIntegration(integration.integration_type, checked)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <div className="mt-1">
              <Badge variant={integration.is_enabled ? "default" : "secondary"}>
                {integration.is_enabled ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-96">
            <p>Loading integrations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your event management system with external services
        </p>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar & Meetings</TabsTrigger>
          <TabsTrigger value="marketing">Email Marketing</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter((i) => ["google_calendar", "zoom", "teams"].includes(i.integration_type))
              .map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter((i) => ["mailchimp", "sendgrid"].includes(i.integration_type))
              .map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter((i) => ["facebook", "twitter", "linkedin"].includes(i.integration_type))
              .map((integration) => (
                <IntegrationCard key={integration.id} integration={integration} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest integration activities and logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getIntegrationIcon(log.integration_type)}
                      <div>
                        <p className="font-medium capitalize">
                          {log.integration_type.replace("_", " ")} - {log.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        {log.error_message && (
                          <p className="text-sm text-destructive">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        log.status === "success"
                          ? "default"
                          : log.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No activity logs yet</p>
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
