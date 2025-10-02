import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  
  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "กรุณากรอกอีเมลและรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(loginEmail)) {
      toast({
        title: "อีเมลไม่ถูกต้อง",
        description: "กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับกลับมา!",
      });
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupEmail || !signupPassword || !signupConfirmPassword || !signupName) {
      toast({
        title: "กรุณากรอกข้อมูล",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(signupEmail)) {
      toast({
        title: "อีเมลไม่ถูกต้อง",
        description: "กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 8) {
      toast({
        title: "รหัสผ่านสั้นเกินไป",
        description: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณายืนยันรหัสผ่านให้ตรงกัน",
        variant: "destructive",
      });
      return;
    }

    const passwordStrength = getPasswordStrength(signupPassword);
    if (passwordStrength < 2) {
      toast({
        title: "รหัสผ่านไม่ปลอดภัย",
        description: "กรุณาใช้รหัสผ่านที่แข็งแกร่งขึ้น (ควรมีตัวพิมพ์เล็ก-ใหญ่ และตัวเลข)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          name: signupName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "ลงทะเบียนไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "ยินดีต้อนรับสู่ Iwelty Event Dashboard!",
      });
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      setSignupName("");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast({
        title: "กรุณากรอกอีเมล",
        description: "กรุณากรอกอีเมลเพื่อรีเซ็ตรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(forgotEmail)) {
      toast({
        title: "อีเมลไม่ถูกต้อง",
        description: "กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "ส่งอีเมลไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: "ส่งอีเมลสำเร็จ",
        description: "กรุณาตรวจสอบอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <CardHeader className="space-y-1 pt-12">
          <CardTitle className="text-2xl font-bold text-center">Iwelty Event Dashboard</CardTitle>
          <CardDescription className="text-center">
            ระบบจัดการกิจกรรมและการลงทะเบียน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="signup">ลงทะเบียน</TabsTrigger>
              <TabsTrigger value="forgot">ลืมรหัสผ่าน</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">อีเมล</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="example@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">รหัสผ่าน</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
                <div className="text-center mt-2">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => {
                      const tabs = document.querySelector('[value="forgot"]') as HTMLElement;
                      tabs?.click();
                    }}
                  >
                    ลืมรหัสผ่าน?
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">ชื่อ-นามสกุล</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="ชื่อของคุณ"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">อีเมล</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="example@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">รหัสผ่าน</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {signupPassword && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              getPasswordStrength(signupPassword) <= 1
                                ? "bg-red-500"
                                : getPasswordStrength(signupPassword) <= 3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${(getPasswordStrength(signupPassword) / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getPasswordStrength(signupPassword) <= 1
                            ? "อ่อนแอ"
                            : getPasswordStrength(signupPassword) <= 3
                            ? "ปานกลาง"
                            : "แข็งแกร่ง"}
                        </span>
                      </div>
                      <ul className="text-xs space-y-1">
                        <li className={signupPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                          {signupPassword.length >= 8 ? "✓" : "○"} อย่างน้อย 8 ตัวอักษร
                        </li>
                        <li className={(/[a-z]/.test(signupPassword) && /[A-Z]/.test(signupPassword)) ? "text-green-600" : "text-muted-foreground"}>
                          {(/[a-z]/.test(signupPassword) && /[A-Z]/.test(signupPassword)) ? "✓" : "○"} มีตัวพิมพ์เล็กและใหญ่
                        </li>
                        <li className={/\d/.test(signupPassword) ? "text-green-600" : "text-muted-foreground"}>
                          {/\d/.test(signupPassword) ? "✓" : "○"} มีตัวเลข
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">ยืนยันรหัสผ่าน</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showSignupConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showSignupConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {signupConfirmPassword && (
                    <div className="flex items-center gap-2 text-xs">
                      {signupPassword === signupConfirmPassword ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">รหัสผ่านตรงกัน</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-600">รหัสผ่านไม่ตรงกัน</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot">
              {resetEmailSent ? (
                <div className="space-y-4 text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">ส่งอีเมลสำเร็จ</h3>
                    <p className="text-sm text-muted-foreground">
                      เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล
                    </p>
                    <p className="text-sm font-medium">{forgotEmail}</p>
                    <p className="text-xs text-muted-foreground mt-4">
                      กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResetEmailSent(false);
                      setForgotEmail("");
                    }}
                    className="mt-4"
                  >
                    กลับไปหน้าเข้าสู่ระบบ
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">อีเมล</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="example@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      กรอกอีเมลที่คุณใช้ลงทะเบียน เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "กำลังส่งอีเมล..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
