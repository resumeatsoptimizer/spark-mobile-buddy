import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Code, Copy, Key, Book, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface APIKey {
  id: string;
  key_name: string;
  api_key: string;
  rate_limit: number;
  is_active: boolean;
  created_at: string;
}

export default function APIDocumentation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchAPIKeys();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
    }
  };

  const fetchAPIKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      console.error('Error fetching API keys:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const CodeBlock = ({ code, language = 'javascript' }: { code: string; language?: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, 'Code')}
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`;

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
            <h1 className="text-3xl font-bold">API Documentation</h1>
            <p className="text-muted-foreground mt-1">
              Complete reference for integrating with the Event Management API
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">REST API</p>
                  <p className="text-sm text-muted-foreground">
                    RESTful endpoints
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    API key based auth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Book className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Rate Limiting</p>
                  <p className="text-sm text-muted-foreground">
                    1000 req/hour
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Learn how to integrate with the Event Management API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="registrations">Registrations</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Base URL</h3>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                      {baseUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(baseUrl, 'Base URL')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    All API requests must be made over HTTPS. Requests made over plain HTTP will fail.
                    API requests require authentication using an API key.
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="font-semibold mb-2">Response Format</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    All responses are returned in JSON format:
                  </p>
                  <CodeBlock code={`{
  "data": { ... },
  "error": null,
  "status": 200
}`} />
                </div>
              </TabsContent>

              <TabsContent value="auth" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">API Key Authentication</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Include your API key in the request headers:
                  </p>
                  <CodeBlock code={`curl -X GET "${baseUrl}/events" \\
  -H "apikey: YOUR_API_KEY" \\
  -H "Authorization: Bearer YOUR_API_KEY"`} />
                </div>

                {apiKeys.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Your API Keys</h3>
                    <div className="space-y-2">
                      {apiKeys.map((key) => (
                        <div
                          key={key.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Key className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{key.key_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {key.api_key.substring(0, 20)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={key.is_active ? 'default' : 'secondary'}>
                              {key.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(key.api_key, 'API key')}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">List Events</h3>
                  <Badge variant="secondary" className="mb-2">GET</Badge>
                  <CodeBlock code={`GET ${baseUrl}/events

Response:
{
  "data": [
    {
      "id": "uuid",
      "title": "Tech Conference 2025",
      "description": "Annual technology conference",
      "start_date": "2025-10-01T09:00:00Z",
      "end_date": "2025-10-01T17:00:00Z",
      "location": "Bangkok Convention Center",
      "seats_total": 500,
      "seats_remaining": 247
    }
  ]
}`} />
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Get Event by ID</h3>
                  <Badge variant="secondary" className="mb-2">GET</Badge>
                  <CodeBlock code={`GET ${baseUrl}/events?id=eq.{event_id}`} />
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Create Event</h3>
                  <Badge variant="secondary" className="mb-2">POST</Badge>
                  <CodeBlock code={`POST ${baseUrl}/events
Content-Type: application/json

{
  "title": "New Event",
  "description": "Event description",
  "start_date": "2025-11-01T09:00:00Z",
  "end_date": "2025-11-01T17:00:00Z",
  "location": "Venue Name",
  "seats_total": 100
}`} />
                </div>
              </TabsContent>

              <TabsContent value="registrations" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">List Registrations</h3>
                  <Badge variant="secondary" className="mb-2">GET</Badge>
                  <CodeBlock code={`GET ${baseUrl}/registrations?event_id=eq.{event_id}

Response:
{
  "data": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "user_id": "uuid",
      "status": "confirmed",
      "created_at": "2025-09-30T10:00:00Z"
    }
  ]
}`} />
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Create Registration</h3>
                  <Badge variant="secondary" className="mb-2">POST</Badge>
                  <CodeBlock code={`POST ${baseUrl}/registrations
Content-Type: application/json

{
  "event_id": "event-uuid",
  "user_id": "user-uuid",
  "form_data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}`} />
                </div>
              </TabsContent>

              <TabsContent value="webhooks" className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Webhook Events</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure webhooks to receive real-time notifications:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>event.created</Badge>
                      <span className="text-sm text-muted-foreground">New event created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>registration.created</Badge>
                      <span className="text-sm text-muted-foreground">New registration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>payment.completed</Badge>
                      <span className="text-sm text-muted-foreground">Payment received</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Webhook Payload</h3>
                  <CodeBlock code={`{
  "event": "registration.created",
  "timestamp": "2025-09-30T10:00:00Z",
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "user_id": "uuid",
    "status": "confirmed"
  }
}`} />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
