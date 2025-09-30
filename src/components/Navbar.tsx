import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, LayoutDashboard, UserCircle, LogOut, Menu, X, Settings, Workflow, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);

    if (session?.user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      setUserRole(roles?.role || "participant");
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } else {
      setUser(null);
      setUserRole(null);
      navigate("/");
      toast({
        title: "ออกจากระบบสำเร็จ",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const isStaff = userRole === "admin" || userRole === "staff";
  const isAdmin = userRole === "admin";

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          >
            Iwelty Events
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              onClick={() => navigate("/")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              งานอีเว้นท์
            </Button>

            {user && (
              <>
                {isStaff && (
                  <Button
                    variant={isActive("/admin/dashboard") ? "default" : "ghost"}
                    onClick={() => navigate("/admin/dashboard")}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                )}
                <Button
                  variant={isActive("/registrations") ? "default" : "ghost"}
                  onClick={() => navigate("/registrations")}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  การลงทะเบียน
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant={isActive("/admin/automation") ? "default" : "ghost"}
                      onClick={() => navigate("/admin/automation")}
                    >
                      <Workflow className="mr-2 h-4 w-4" />
                      Automation
                    </Button>
                    <Button
                      variant={isActive("/admin/analytics") ? "default" : "ghost"}
                      onClick={() => navigate("/admin/analytics")}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </Button>
                    <Button
                      variant={isActive("/admin/settings") ? "default" : "ghost"}
                      onClick={() => navigate("/admin/settings")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      ตั้งค่า
                    </Button>
                  </>
                )}
              </>
            )}

            {user ? (
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                ออกจากระบบ
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")}>
                เข้าสู่ระบบ
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => {
                navigate("/");
                setMobileMenuOpen(false);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              งานอีเว้นท์
            </Button>

            {user && (
              <>
                {isStaff && (
                  <Button
                    variant={isActive("/admin/dashboard") ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/admin/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                )}
                <Button
                  variant={isActive("/registrations") ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigate("/registrations");
                    setMobileMenuOpen(false);
                  }}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  การลงทะเบียน
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      variant={isActive("/admin/automation") ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/admin/automation");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Workflow className="mr-2 h-4 w-4" />
                      Automation
                    </Button>
                    <Button
                      variant={isActive("/admin/analytics") ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/admin/analytics");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </Button>
                    <Button
                      variant={isActive("/admin/settings") ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/admin/settings");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      ตั้งค่า
                    </Button>
                  </>
                )}
              </>
            )}

            {user ? (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                ออกจากระบบ
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  navigate("/auth");
                  setMobileMenuOpen(false);
                }}
              >
                เข้าสู่ระบบ
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
