import { useState, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Smartphone, Activity, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

export default function EventCheckIn() {
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [stationId] = useState(`STATION-${Math.random().toString(36).substring(7).toUpperCase()}`);
  const { toast } = useToast();

  useEffect(() => {
    fetchCheckInStats();
    fetchRecentCheckIns();

    // Subscribe to real-time check-ins
    const channel = supabase
      .channel('check-ins-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_check_ins',
        },
        async (payload) => {
          console.log('New check-in:', payload.new);
          
          // Update stats
          setStats(prev => ({ 
            total: prev.total + 1, 
            today: prev.today + 1 
          }));

          // Fetch complete check-in info
          const { data } = await supabase
            .from('event_check_ins')
            .select(`
              *,
              registrations (
                user_id,
                profiles:user_id (
                  name,
                  email
                )
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setRecentCheckIns(prev => [data, ...prev].slice(0, 5));
          }

          // Show notification
          if (Notification.permission === 'granted') {
            new Notification('New Check-In', {
              body: 'A participant has checked in',
              icon: '/placeholder.svg'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCheckInStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: totalCount } = await supabase
        .from('event_check_ins')
        .select('*', { count: 'exact', head: true });

      const { count: todayCount } = await supabase
        .from('event_check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', today.toISOString());

      setStats({
        total: totalCount || 0,
        today: todayCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentCheckIns = async () => {
    try {
      const { data } = await supabase
        .from('event_check_ins')
        .select(`
          *,
          registrations (
            user_id,
            profiles:user_id (
              name,
              email
            )
          )
        `)
        .order('checked_in_at', { ascending: false })
        .limit(5);

      setRecentCheckIns(data || []);
    } catch (error) {
      console.error('Error fetching recent check-ins:', error);
    }
  };

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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

        {/* Real-time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Check-Ins</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-3xl font-bold">{stats.today}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Check-In Rate</p>
                  <p className="text-3xl font-bold">
                    {stats.total > 0 ? Math.round((stats.today / stats.total) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
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

        {/* Recent Check-Ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Check-Ins
            </CardTitle>
            <CardDescription>
              Live updates of participant check-ins
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No check-ins yet. Waiting for participants...
              </p>
            ) : (
              <div className="space-y-3">
                {recentCheckIns.map((checkIn) => {
                  const profile = checkIn.registrations?.profiles;
                  const name = profile?.name || profile?.email?.split('@')[0] || 'Unknown';
                  
                  return (
                    <div
                      key={checkIn.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(checkIn.checked_in_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{checkIn.check_in_method}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
