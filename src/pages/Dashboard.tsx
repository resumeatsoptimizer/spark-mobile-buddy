import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, Settings } from "lucide-react";
import Navbar from "@/components/Navbar";
import AIEventRecommendations from "@/components/AIEventRecommendations";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user profile and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", session.user.id)
      .single();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    setUserName(profile?.name || session.user.email || "ผู้ใช้");
    setUserRole(roles?.role || "participant");
    setLoading(false);
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

  const isAdmin = userRole === "admin";
  const isStaff = userRole === "staff" || isAdmin;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              ยินดีต้อนรับ, {userName} ({userRole === "admin" ? "ผู้ดูแลระบบ" : userRole === "staff" ? "เจ้าหน้าที่" : "ผู้เข้าร่วม"})
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Events Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/events")}>
            <CardHeader>
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <CardTitle>กิจกรรม</CardTitle>
              <CardDescription>
                {isStaff ? "จัดการและสร้างกิจกรรม" : "ดูกิจกรรมที่เปิดรับสมัคร"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                {isStaff ? "จัดการกิจกรรม" : "ดูกิจกรรม"}
              </Button>
            </CardContent>
          </Card>

          {/* Registrations Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/registrations")}>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>การลงทะเบียน</CardTitle>
              <CardDescription>
                {isStaff ? "ดูรายการผู้ลงทะเบียนทั้งหมด" : "ดูการลงทะเบียนของคุณ"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">
                {isStaff ? "จัดการการลงทะเบียน" : "ดูการลงทะเบียนของฉัน"}
              </Button>
            </CardContent>
          </Card>

          {/* Admin Dashboard (Admin/Staff only) */}
          {isStaff && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/dashboard")}>
              <CardHeader>
                <Settings className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>
                  ดูสถิติและจัดการระบบ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  เข้าสู่ Admin
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                กิจกรรมทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">รอการพัฒนา</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                การลงทะเบียนทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">รอการพัฒนา</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ผู้เข้าร่วมทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">รอการพัฒนา</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations for Participants */}
        {!isStaff && (
          <div className="mt-8">
            <AIEventRecommendations />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
