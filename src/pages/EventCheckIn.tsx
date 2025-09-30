import { useState } from 'react';
import { QrCode, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function EventCheckIn() {
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const [stationId] = useState(`STATION-${Math.random().toString(36).substring(7).toUpperCase()}`);
  const { toast } = useToast();

  const processCheckIn = async (data: string) => {
    try {
      setScanning(true);

      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: new Date().toISOString(),
      };

      const { data: result, error } = await supabase.functions.invoke('event-check-in', {
        body: {
          qr_data: data,
          station_id: stationId,
          device_info: deviceInfo,
        },
      });

      if (error) throw error;

      if (result.success) {
        setLastCheckIn(result.check_in);
        toast({
          title: 'Check-In Successful',
          description: 'Participant has been checked in',
        });
        setQrData('');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast({
        title: 'Check-In Failed',
        description: error.message || 'Failed to process check-in',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleManualInput = () => {
    if (qrData.trim()) {
      processCheckIn(qrData.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Event Check-In</h1>
            <p className="text-muted-foreground mt-1">Scan QR codes to check in participants</p>
          </div>
          <Badge variant="outline" className="text-lg py-2 px-4">
            <Smartphone className="w-4 h-4 mr-2" />
            {stationId}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              Enter or scan the QR code from the participant's ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter QR code data or scan..."
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualInput();
                  }
                }}
                disabled={scanning}
                className="font-mono"
              />
              <Button
                onClick={handleManualInput}
                disabled={!qrData.trim() || scanning}
                size="lg"
              >
                {scanning ? 'Processing...' : 'Check In'}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Tip: Use a barcode scanner or mobile device to scan QR codes directly into the input field
            </div>
          </CardContent>
        </Card>

        {lastCheckIn && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Last Check-In Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration ID:</span>
                  <span className="font-mono text-sm">{lastCheckIn.registration_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event ID:</span>
                  <span className="font-mono text-sm">{lastCheckIn.event_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="text-sm">
                    {new Date(lastCheckIn.checked_in_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <Badge>{lastCheckIn.check_in_method}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Check-In Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Ask the participant to show their ticket QR code</li>
              <li>Scan the QR code using a barcode scanner or mobile device</li>
              <li>Alternatively, manually enter the code from the ticket</li>
              <li>Confirm the check-in was successful</li>
              <li>Direct the participant to the event venue</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
