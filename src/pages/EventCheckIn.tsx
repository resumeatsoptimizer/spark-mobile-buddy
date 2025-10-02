import { useState, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Smartphone, Activity, Users, TrendingUp, AlertCircle, Download, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { exportCheckInsToCSV } from '@/lib/checkInExport';

export default function EventCheckIn() {
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [stationId] = useState(`STATION-${Math.random().toString(36).substring(7).toUpperCase()}`);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalRegistrations: 0,
    totalCheckedIn: 0,
    byTicketType: [] as any[]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
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
                ticket_type_id,
                ticket_types (name, price),
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

          // Refresh summary
          if (selectedEventId) {
            fetchSummary();
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
  }, [selectedEventId]);

  // Subscribe to event capacity changes
  useEffect(() => {
    if (!selectedEventId) return;
    
    const channel = supabase
      .channel(`event-${selectedEventId}-capacity`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'events',
        filter: `id=eq.${selectedEventId}`
      }, (payload) => {
        setCurrentEvent(payload.new);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEventId]);

  // Fetch current event details when selectedEventId changes
  useEffect(() => {
    if (selectedEventId) {
      fetchCurrentEvent();
      fetchSummary();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, seats_total, seats_remaining, start_date')
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCurrentEvent = async () => {
    if (!selectedEventId) return;
    
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, seats_total, seats_remaining')
        .eq('id', selectedEventId)
        .single();
      
      setCurrentEvent(data);
    } catch (error) {
      console.error('Error fetching current event:', error);
    }
  };

  const fetchSummary = async () => {
    if (!selectedEventId) return;
    
    try {
      // Count actual registrations (A) - confirmed and paid only
      const { count: totalRegistrations } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('status', 'confirmed')
        .eq('payment_status', 'paid');
      
      // Count checked-in (C)
      const { count: checkedIn } = await supabase
        .from('event_check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId);
      
      // Count by ticket type
      const { data: byTicket } = await supabase
        .from('event_check_ins')
        .select('registrations(ticket_type_id, ticket_types(name))')
        .eq('event_id', selectedEventId);
      
      // Process ticket types
      const ticketCounts: any = {};
      byTicket?.forEach((item: any) => {
        const ticketName = item.registrations?.ticket_types?.name || 'ไม่ระบุ';
        ticketCounts[ticketName] = (ticketCounts[ticketName] || 0) + 1;
      });
      
      const byTicketArray = Object.entries(ticketCounts).map(([name, count]) => ({
        name,
        count
      }));
      
      setSummary({
        totalRegistrations: totalRegistrations || 0,
        totalCheckedIn: checkedIn || 0,
        byTicketType: byTicketArray
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const searchParticipant = async (term: string) => {
    if (!term.trim() || !selectedEventId) {
      setSearchResults([]);
      return;
    }
    
    try {
      const { data } = await supabase
        .from('registrations')
        .select(`
          *,
          profiles:user_id (name, email),
          ticket_types (name),
          event_check_ins (checked_in_at, station_id)
        `)
        .eq('event_id', selectedEventId)
        .or(`profiles.name.ilike.%${term}%,profiles.email.ilike.%${term}%`)
        .limit(5);
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching participant:', error);
    }
  };

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
      const query = supabase
        .from('event_check_ins')
        .select(`
          *,
          registrations!inner (
            user_id,
            ticket_type_id,
            ticket_types (name, price),
            profiles!inner (
              name,
              email
            )
          )
        `)
        .order('checked_in_at', { ascending: false })
        .limit(5);
      
      // Filter by event if selected
      if (selectedEventId) {
        query.eq('event_id', selectedEventId);
      }

      const { data } = await query;
      console.log('Recent check-ins data:', data);
      setRecentCheckIns(data || []);
    } catch (error) {
      console.error('Error fetching recent check-ins:', error);
    }
  };

  const processCheckIn = async (data: string) => {
    try {
      setScanning(true);
      setDuplicateWarning(null);

      // Parse QR data to check for duplicates
      let parsedQR;
      try {
        try {
          parsedQR = JSON.parse(atob(data));
        } catch {
          parsedQR = JSON.parse(data);
        }
      } catch (e) {
        throw new Error('Invalid QR code format');
      }

      // Check for existing check-in
      const { data: existingCheckIn } = await supabase
        .from('event_check_ins')
        .select(`
          *,
          registrations (
            profiles:user_id (name, email)
          )
        `)
        .eq('registration_id', parsedQR.registration_id)
        .maybeSingle();
      
      if (existingCheckIn) {
        setDuplicateWarning({
          participant: existingCheckIn.registrations?.profiles,
          checkedInAt: existingCheckIn.checked_in_at,
          station: existingCheckIn.station_id
        });
        setScanning(false);
        return;
      }

      // Phase 3: Check if seats are available before check-in
      if (currentEvent && currentEvent.seats_remaining <= 0) {
        toast({
          title: '❌ ที่นั่งเต็ม',
          description: 'ไม่สามารถเช็คอินได้เพราะที่นั่งเต็มแล้ว',
          variant: 'destructive',
        });
        setScanning(false);
        return;
      }

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

  // Calculate capacity percentage: A / B (registered / total capacity)
  const capacityPercentage = currentEvent && currentEvent.seats_total > 0
    ? Math.round((summary.totalRegistrations / currentEvent.seats_total) * 100)
    : 0;

  // Calculate check-in percentage: C / A (checked in / registered)
  const checkedInPercentage = summary.totalRegistrations > 0
    ? Math.round((summary.totalCheckedIn / summary.totalRegistrations) * 100)
    : 0;

  const getCapacityColor = () => {
    if (capacityPercentage >= 90) return 'text-red-500';
    if (capacityPercentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = () => {
    if (capacityPercentage >= 90) return 'bg-red-500';
    if (capacityPercentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Event Check-In</h1>
            <p className="text-muted-foreground mt-1">สแกน QR Code เพื่อเช็คอินผู้เข้าร่วมงาน</p>
          </div>
          <Badge variant="outline" className="text-lg py-2 px-4">
            <Smartphone className="w-4 h-4 mr-2" />
            {stationId}
          </Badge>
        </div>

        {/* Event Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">เลือกงาน</label>
              <Select value={selectedEventId || undefined} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกงาน..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Capacity & Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Capacity Card - A/B (ลงทะเบียน/เปิดรับ) */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">ลงทะเบียน / เปิดรับ</span>
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className={`text-3xl font-bold ${getCapacityColor()}`}>
                  {summary.totalRegistrations} / {currentEvent?.seats_total || 0}
                </div>
                <Progress value={capacityPercentage} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {capacityPercentage}% ของที่นั่งทั้งหมด
                </div>
                {capacityPercentage >= 90 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      ⚠️ ที่นั่งใกล้เต็ม!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Check-In Summary - C/A (เช็คอินแล้ว/ลงทะเบียน) */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">เช็คอิน / ลงทะเบียน</span>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {summary.totalCheckedIn} / {summary.totalRegistrations}
                </div>
                <Progress 
                  value={checkedInPercentage} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {checkedInPercentage}% เช็คอินแล้ว
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">วันนี้</p>
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
                  <p className="text-sm text-muted-foreground">อัตราการเช็คอิน</p>
                  <p className="text-3xl font-bold">
                    {summary.totalRegistrations > 0 
                      ? Math.round((summary.totalCheckedIn / summary.totalRegistrations) * 100) 
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Type Breakdown */}
        {summary.byTicketType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">สรุปตามประเภทตั๋ว</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {summary.byTicketType.map(type => (
                  <div key={type.name} className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">{type.name}</span>
                    <span className="text-2xl font-bold">{type.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Participant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5" />
              ค้นหาผู้เข้าร่วม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input 
              placeholder="พิมพ์ชื่อหรืออีเมล..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchParticipant(e.target.value);
              }}
            />
            
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map(result => (
                  <div key={result.id} className="p-3 border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">{result.profiles?.name || result.profiles?.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.profiles?.email}
                      </p>
                    </div>
                    {result.event_check_ins && result.event_check_ins.length > 0 ? (
                      <Badge className="bg-green-500">
                        ✓ เช็คอินแล้ว
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        ยังไม่เช็คอิน
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="w-5 h-5" />
                ⚠️ ผู้เข้าร่วมคนนี้เช็คอินแล้ว
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{duplicateWarning.participant?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  เช็คอินไปแล้วเมื่อ: {new Date(duplicateWarning.checkedInAt).toLocaleString('th-TH')}
                </p>
                <p className="text-sm text-muted-foreground">
                  ที่: {duplicateWarning.station}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setDuplicateWarning(null)}
                className="mt-4"
              >
                ตกลง
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
            <CardDescription>
              สแกน QR Code จากตั๋วของผู้เข้าร่วมงาน หรือวางข้อมูล JSON ด้านล่าง
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder='วางข้อมูล JSON (เช่น {"registration_id":"...","event_id":"..."})'
                  value={qrData}
                  onChange={(e) => setQrData(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualInput();
                    }
                  }}
                  disabled={scanning}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleManualInput}
                  disabled={!qrData.trim() || scanning}
                  size="lg"
                >
                  {scanning ? 'กำลังดำเนินการ...' : 'Check In'}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">💡 วิธีใช้งาน:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>สแกน QR Code ด้วยกล้องมือถือ แล้ววางข้อมูลที่ได้ในช่องด้านบน</li>
                  <li>หรือคัดลอกข้อมูล JSON จากตั๋วโดยตรง</li>
                  <li>กด Enter หรือคลิกปุ่ม Check In</li>
                </ul>
              </div>
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
                  <span className="text-muted-foreground">รหัสการลงทะเบียน:</span>
                  <span className="font-mono text-sm">{lastCheckIn.registration_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">รหัสงาน:</span>
                  <span className="font-mono text-sm">{lastCheckIn.event_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">เวลา:</span>
                  <span className="text-sm">
                    {new Date(lastCheckIn.checked_in_at).toLocaleString('th-TH')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">วิธีการ:</span>
                  <Badge>{lastCheckIn.check_in_method}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Check-Ins */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Check-Ins
                </CardTitle>
                <CardDescription>
                  อัพเดทเรียลไทม์การเช็คอินของผู้เข้าร่วม
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportCheckInsToCSV(recentCheckIns, currentEvent?.title || 'Event')}
                  disabled={recentCheckIns.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                
                {/* Phase 5: Sync Capacity Button */}
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!selectedEventId || !currentEvent) return;
                    
                    try {
                      // Recalculate seats_remaining based on actual check-ins
                      const { count: checkInCount } = await supabase
                        .from('event_check_ins')
                        .select('*', { count: 'exact', head: true })
                        .eq('event_id', selectedEventId);
                      
                      const newRemaining = currentEvent.seats_total - (checkInCount || 0);
                      
                      await supabase
                        .from('events')
                        .update({ seats_remaining: newRemaining })
                        .eq('id', selectedEventId);
                      
                      toast({ 
                        title: '✅ Capacity Synced!',
                        description: `อัพเดท seats_remaining เป็น ${newRemaining}`
                      });
                      
                      fetchCurrentEvent();
                      fetchSummary();
                    } catch (error) {
                      console.error('Sync error:', error);
                      toast({
                        title: '❌ Sync Failed',
                        description: 'ไม่สามารถ sync capacity ได้',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Capacity
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                ยังไม่มีการเช็คอิน กำลังรอผู้เข้าร่วม...
              </p>
            ) : (
              <div className="space-y-3">
                {recentCheckIns.map((checkIn) => {
                  const profile = checkIn.registrations?.profiles;
                  const name = profile?.name || profile?.email?.split('@')[0] || 'Unknown';
                  const ticketType = checkIn.registrations?.ticket_types?.name;
                  
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
                            {new Date(checkIn.checked_in_at).toLocaleTimeString('th-TH')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{checkIn.check_in_method}</Badge>
                        {ticketType && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                            {ticketType}
                          </Badge>
                        )}
                      </div>
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
              <li>ขอให้ผู้เข้าร่วมแสดง QR Code จากตั๋ว</li>
              <li>สแกน QR Code โดยใช้เครื่องสแกนบาร์โค้ดหรืออุปกรณ์มือถือ</li>
              <li>หรือกรอกโค้ดจากตั๋วด้วยตนเอง</li>
              <li>ยืนยันว่าการเช็คอินสำเร็จ</li>
              <li>นำทางผู้เข้าร่วมไปยังสถานที่จัดงาน</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
