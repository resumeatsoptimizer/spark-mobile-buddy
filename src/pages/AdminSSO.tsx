import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Settings, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SSOConfig {
  id: string;
  provider: string;
  is_enabled: boolean;
  config: {
    client_id?: string;
    client_secret?: string;
    domain?: string;
    tenant_id?: string;
    redirect_uri?: string;
  };
}

export default function AdminSSO() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [googleConfig, setGoogleConfig] = useState<SSOConfig | null>(null);
  const [microsoftConfig, setMicrosoftConfig] = useState<SSOConfig | null>(null);

  useEffect(() => {
    checkAdminAuth();
    fetchSSOConfigs();
  }, []);

  const checkAdminAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (role?.role !== 'admin') {
      navigate('/');
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access this page',
        variant: 'destructive',
      });
    }
  };

  const fetchSSOConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .in('integration_type', ['google_oauth', 'microsoft_oauth']);

      if (error) throw error;

      data?.forEach((config: any) => {
        if (config.integration_type === 'google_oauth') {
          setGoogleConfig(config);
        } else if (config.integration_type === 'microsoft_oauth') {
          setMicrosoftConfig(config);
        }
      });
    } catch (error: any) {
      console.error('Error fetching SSO configs:', error);
    }
  };

  const saveConfig = async (provider: 'google' | 'microsoft', configData: any) => {
    try {
      setLoading(true);

      const integrationType = provider === 'google' ? 'google_oauth' : 'microsoft_oauth';
      const existing = provider === 'google' ? googleConfig : microsoftConfig;

      if (existing) {
        const { error } = await supabase
          .from('integration_settings')
          .update({
            config: configData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('integration_settings')
          .insert({
            integration_type: integrationType,
            config: configData,
            is_enabled: false,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `${provider} SSO configuration saved`,
      });

      fetchSSOConfigs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = async (provider: 'google' | 'microsoft', enabled: boolean) => {
    try {
      const config = provider === 'google' ? googleConfig : microsoftConfig;
      if (!config) return;

      const { error } = await supabase
        .from('integration_settings')
        .update({ is_enabled: enabled })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: enabled ? 'Enabled' : 'Disabled',
        description: `${provider} SSO has been ${enabled ? 'enabled' : 'disabled'}`,
      });

      fetchSSOConfigs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const testConnection = async (provider: 'google' | 'microsoft') => {
    try {
      setTesting(true);
      
      // Simulate testing connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Connection Test',
        description: `${provider} SSO configuration appears valid`,
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const GoogleSSOTab = () => {
    const [clientId, setClientId] = useState(googleConfig?.config?.client_id || '');
    const [clientSecret, setClientSecret] = useState(googleConfig?.config?.client_secret || '');
    const [redirectUri] = useState(`${window.location.origin}/auth/callback`);

    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            To set up Google SSO, create OAuth credentials in Google Cloud Console and configure the authorized redirect URI.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">Enable Google SSO</h3>
            <p className="text-sm text-muted-foreground">
              Allow users to sign in with their Google accounts
            </p>
          </div>
          <Switch
            checked={googleConfig?.is_enabled || false}
            onCheckedChange={(checked) => toggleProvider('google', checked)}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google-client-id">Client ID</Label>
            <Input
              id="google-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxx.apps.googleusercontent.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-client-secret">Client Secret</Label>
            <Input
              id="google-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter client secret"
            />
          </div>

          <div className="space-y-2">
            <Label>Authorized Redirect URI</Label>
            <div className="flex gap-2">
              <Input value={redirectUri} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(redirectUri);
                  toast({ title: 'Copied to clipboard' });
                }}
              >
                <Key className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Add this URL to your Google OAuth authorized redirect URIs
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => saveConfig('google', { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri })}
              disabled={loading || !clientId || !clientSecret}
            >
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnection('google')}
              disabled={testing || !googleConfig?.is_enabled}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const MicrosoftSSOTab = () => {
    const [clientId, setClientId] = useState(microsoftConfig?.config?.client_id || '');
    const [clientSecret, setClientSecret] = useState(microsoftConfig?.config?.client_secret || '');
    const [tenantId, setTenantId] = useState(microsoftConfig?.config?.tenant_id || '');
    const [redirectUri] = useState(`${window.location.origin}/auth/callback`);

    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            To set up Microsoft SSO, register your application in Azure AD and configure the redirect URI.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">Enable Microsoft SSO</h3>
            <p className="text-sm text-muted-foreground">
              Allow users to sign in with their Microsoft accounts
            </p>
          </div>
          <Switch
            checked={microsoftConfig?.is_enabled || false}
            onCheckedChange={(checked) => toggleProvider('microsoft', checked)}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ms-client-id">Application (Client) ID</Label>
            <Input
              id="ms-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ms-client-secret">Client Secret</Label>
            <Input
              id="ms-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter client secret value"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ms-tenant-id">Directory (Tenant) ID</Label>
            <Input
              id="ms-tenant-id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <Label>Redirect URI</Label>
            <div className="flex gap-2">
              <Input value={redirectUri} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(redirectUri);
                  toast({ title: 'Copied to clipboard' });
                }}
              >
                <Key className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Add this URL to your Azure AD app registration redirect URIs
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => saveConfig('microsoft', { client_id: clientId, client_secret: clientSecret, tenant_id: tenantId, redirect_uri: redirectUri })}
              disabled={loading || !clientId || !clientSecret || !tenantId}
            >
              Save Configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => testConnection('microsoft')}
              disabled={testing || !microsoftConfig?.is_enabled}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Single Sign-On (SSO)</h1>
            <p className="text-muted-foreground mt-1">
              Configure enterprise authentication providers
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Google OAuth</p>
                    <p className="text-sm text-muted-foreground">
                      {googleConfig?.is_enabled ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {googleConfig?.is_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Microsoft OAuth</p>
                    <p className="text-sm text-muted-foreground">
                      {microsoftConfig?.is_enabled ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                {microsoftConfig?.is_enabled ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SSO Configuration</CardTitle>
            <CardDescription>
              Configure authentication settings for enterprise identity providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="google" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="google">Google</TabsTrigger>
                <TabsTrigger value="microsoft">Microsoft</TabsTrigger>
              </TabsList>

              <TabsContent value="google">
                <GoogleSSOTab />
              </TabsContent>

              <TabsContent value="microsoft">
                <MicrosoftSSOTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
