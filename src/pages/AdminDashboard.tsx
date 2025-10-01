import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { OverviewTab } from "@/components/admin/DashboardTabs/OverviewTab";
import { EventsTab } from "@/components/admin/DashboardTabs/EventsTab";
import { RegistrationsTab } from "@/components/admin/DashboardTabs/RegistrationsTab";
import { PaymentsTab } from "@/components/admin/DashboardTabs/PaymentsTab";
import { MembersTab } from "@/components/admin/DashboardTabs/MembersTab";
import { useDashboardState } from "@/components/admin/hooks/useDashboardState";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeTab, setActiveTab } = useDashboardState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "events":
        return <EventsTab />;
      case "registrations":
        return <RegistrationsTab />;
      case "payments":
        return <PaymentsTab />;
      case "members":
        return <MembersTab />;
      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
              <p className="text-sm text-muted-foreground">Configure your admin preferences</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => navigate("/admin/settings")} variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            </div>
          </div>
        );
      default:
        return <OverviewTab />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
