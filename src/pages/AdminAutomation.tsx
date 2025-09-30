import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Clock, Mail, Users, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

interface NotificationSetting {
  id: string;
  event_id: string | null;
  notification_type: string;
  enabled: boolean;
  trigger_config: any;
}

interface ScheduledTask {
  id: string;
  task_type: string;
  event_id: string;
  scheduled_for: string;
  status: string;
  retry_count: number;
  error_message: string | null;
}

export default function AdminAutomation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (roleData?.role !== "admin" && roleData?.role !== "staff") {
      navigate("/");
      return;
    }

    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, tasksRes, eventsRes] = await Promise.all([
        supabase.from("notification_settings").select("*"),
        supabase.from("scheduled_tasks").select("*").order("scheduled_for", { ascending: false }).limit(50),
        supabase.from("events").select("id, title, start_date").order("start_date", { ascending: false }),
      ]);

      if (settingsRes.data) setNotificationSettings(settingsRes.data);
      if (tasksRes.data) setScheduledTasks(tasksRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load automation settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleNotification = async (settingId: string, enabled: boolean) => {
    const { error } = await supabase
      .from("notification_settings")
      .update({ enabled })
      .eq("id", settingId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update notification setting",
        variant: "destructive",
      });
      return;
    }

    setNotificationSettings(prev =>
      prev.map(s => s.id === settingId ? { ...s, enabled } : s)
    );

    toast({
      title: "Success",
      description: "Notification setting updated",
    });
  };

  const executeWorkflow = async (workflowType: string) => {
    if (!selectedEventId && workflowType !== 'check-promotion-timeouts' && workflowType !== 'payment-reminder') {
      toast({
        title: "Error",
        description: "Please select an event",
        variant: "destructive",
      });
      return;
    }

    setExecuting(true);
    try {
      let functionName = '';
      let body: any = {};

      switch (workflowType) {
        case 'auto-promote':
          functionName = 'auto-promote-waitlist';
          body = { eventId: selectedEventId };
          break;
        case 'schedule-reminders':
          functionName = 'event-reminder-scheduler';
          body = { eventId: selectedEventId };
          break;
        case 'check-promotion-timeouts':
          functionName = 'check-promotion-timeouts';
          break;
        case 'payment-reminder':
          functionName = 'payment-reminder-handler';
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Workflow executed successfully",
      });

      await fetchData();
    } catch (error) {
      console.error("Error executing workflow:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute workflow",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Automation & Workflows</h1>
            <p className="text-muted-foreground mt-2">
              Manage automated processes and scheduled tasks
            </p>
          </div>
        </div>

        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="tasks">Scheduled Tasks</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manual Workflow Execution
                </CardTitle>
                <CardDescription>
                  Trigger automated workflows manually for testing or immediate execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Event (for event-specific workflows)</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title} - {new Date(event.start_date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Auto-Promote Waitlist</CardTitle>
                      <CardDescription>
                        Promote users from waitlist to confirmed registrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => executeWorkflow('auto-promote')}
                        disabled={executing || !selectedEventId}
                        className="w-full"
                      >
                        {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                        Execute Now
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Schedule Event Reminders</CardTitle>
                      <CardDescription>
                        Create scheduled reminder tasks for event participants
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => executeWorkflow('schedule-reminders')}
                        disabled={executing || !selectedEventId}
                        className="w-full"
                      >
                        {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                        Schedule Reminders
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Check Promotion Timeouts</CardTitle>
                      <CardDescription>
                        Process expired waitlist promotions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => executeWorkflow('check-promotion-timeouts')}
                        disabled={executing}
                        className="w-full"
                        variant="outline"
                      >
                        {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                        Check Timeouts
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Reminders</CardTitle>
                      <CardDescription>
                        Send reminders for unpaid registrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => executeWorkflow('payment-reminder')}
                        disabled={executing}
                        className="w-full"
                        variant="outline"
                      >
                        {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                        Send Reminders
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Tasks</CardTitle>
                <CardDescription>
                  View and monitor scheduled automation tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scheduledTasks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No scheduled tasks</p>
                  ) : (
                    scheduledTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(task.status)}
                          <div>
                            <p className="font-medium">{task.task_type.replace(/_/g, ' ').toUpperCase()}</p>
                            <p className="text-sm text-muted-foreground">
                              Scheduled for: {new Date(task.scheduled_for).toLocaleString()}
                            </p>
                            {task.error_message && (
                              <p className="text-sm text-red-500 mt-1">Error: {task.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.retry_count > 0 && (
                            <Badge variant="outline">Retry: {task.retry_count}</Badge>
                          )}
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure automated notification triggers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notificationSettings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No notification settings configured
                    </p>
                  ) : (
                    notificationSettings.map(setting => (
                      <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{setting.notification_type.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                            {setting.event_id ? `Event-specific` : 'Global setting'}
                          </p>
                        </div>
                        <Switch
                          checked={setting.enabled}
                          onCheckedChange={(checked) => toggleNotification(setting.id, checked)}
                        />
                      </div>
                    ))
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
