import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Smartphone, Key, AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import QRCode from "qrcode";

const Security2FA = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await check2FAStatus();
  };

  const check2FAStatus = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data, error } = await supabase
      .from("user_2fa")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      toast({
        title: "Error",
        description: "Failed to check 2FA status",
        variant: "destructive",
      });
    }

    setIs2FAEnabled(data?.is_enabled || false);
    setLoading(false);
  };

  const generateSecret = () => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    for (let i = 0; i < 32; i++) {
      secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return secret;
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleSetup2FA = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSecret = generateSecret();
    setSecret(newSecret);

    const otpauthUrl = `otpauth://totp/EventRegistration:${user.email}?secret=${newSecret}&issuer=EventRegistration`;
    
    try {
      const qrUrl = await QRCode.toDataURL(otpauthUrl);
      setQrCodeUrl(qrUrl);
      setShowSetup(true);

      const codes = generateBackupCodes();
      setBackupCodes(codes);

      toast({
        title: "2FA Setup Started",
        description: "Scan the QR code with your authenticator app",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const handleEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_2fa")
      .upsert({
        user_id: user.id,
        secret: secret,
        is_enabled: true,
        backup_codes: backupCodes,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to enable 2FA",
        variant: "destructive",
      });
      return;
    }

    setIs2FAEnabled(true);
    setShowSetup(false);
    toast({
      title: "2FA Enabled",
      description: "Two-factor authentication has been enabled for your account",
    });
  };

  const handleDisable2FA = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_2fa")
      .update({ is_enabled: false })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA",
        variant: "destructive",
      });
      return;
    }

    setIs2FAEnabled(false);
    toast({
      title: "2FA Disabled",
      description: "Two-factor authentication has been disabled",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
          </div>
          <p className="text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>

        {!is2FAEnabled && !showSetup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Enable 2FA
              </CardTitle>
              <CardDescription>
                Secure your account with two-factor authentication using an authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You'll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
                </AlertDescription>
              </Alert>
              <Button onClick={handleSetup2FA}>
                <Key className="mr-2 h-4 w-4" />
                Setup 2FA
              </Button>
            </CardContent>
          </Card>
        )}

        {showSetup && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>
                  Use your authenticator app to scan this QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="border rounded-lg" />
                  </div>
                )}
                
                <div>
                  <Label>Manual Entry Code</Label>
                  <Input value={secret} readOnly className="font-mono" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter this code manually if you can't scan the QR code
                  </p>
                </div>

                <div>
                  <Label htmlFor="verification">Verification Code</Label>
                  <Input
                    id="verification"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                  />
                </div>

                <Button onClick={handleEnable2FA} className="w-full">
                  Verify and Enable 2FA
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Codes</CardTitle>
                <CardDescription>
                  Save these codes in a secure place. You can use them to access your account if you lose your device.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-muted p-4 rounded-lg">
                  {backupCodes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {is2FAEnabled && !showSetup && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Shield className="h-5 w-5" />
                2FA Enabled
              </CardTitle>
              <CardDescription>
                Your account is protected with two-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDisable2FA}>
                Disable 2FA
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Security2FA;
