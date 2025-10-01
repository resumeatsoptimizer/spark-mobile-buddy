import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Download, Share2, CalendarDays } from "lucide-react";
import QRCode from "qrcode";
import Navbar from "@/components/Navbar";

interface Registration {
  id: string;
  event_id: string;
  status: string;
  events: {
    title: string;
    start_date: string;
    end_date: string;
    location: string;
  };
}

const ParticipantQRCode = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchRegistrations();
  }, []);

  const checkAuthAndFetchRegistrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          event_id,
          status,
          events (
            title,
            start_date,
            end_date,
            location
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRegistrations(data || []);
      
      // Generate QR codes for all registrations
      if (data) {
        const codes: Record<string, string> = {};
        for (const reg of data) {
          const qrData = await generateQRCode(reg.id, reg.event_id, user.id);
          codes[reg.id] = qrData;
        }
        setQrCodes(codes);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (registrationId: string, eventId: string, userId: string) => {
    try {
      const qrData = JSON.stringify({
        registration_id: registrationId,
        event_id: eventId,
        user_id: userId,
        timestamp: new Date().toISOString(),
        type: 'check-in'
      });
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrCodeDataUrl;
    } catch (error: any) {
      console.error('QR Code generation error:', error);
      return '';
    }
  };

  const downloadQRCode = (registrationId: string, eventTitle: string) => {
    const qrCodeDataUrl = qrCodes[registrationId];
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-code-${eventTitle.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "QR Code downloaded successfully",
    });
  };

  const shareQRCode = async (registrationId: string) => {
    const qrCodeDataUrl = qrCodes[registrationId];
    if (!qrCodeDataUrl) return;

    if (navigator.share) {
      try {
        const blob = await (await fetch(qrCodeDataUrl)).blob();
        const file = new File([blob], 'qr-code.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'Event QR Code',
          text: 'My event check-in QR code',
          files: [file]
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      toast({
        title: "Share not supported",
        description: "Your browser doesn't support sharing. Please download instead.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">My QR Codes</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">My QR Codes</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-4">No confirmed registrations found</p>
            <Button onClick={() => navigate('/events')}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My QR Codes</h1>
          <p className="text-muted-foreground">Show these QR codes at event check-in</p>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {registrations.map((registration) => (
          <Card key={registration.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">
                    {registration.events.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(registration.events.start_date).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="default">
                  {registration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrCodes[registration.id] ? (
                <>
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <img 
                      src={qrCodes[registration.id]} 
                      alt="QR Code"
                      className="w-full max-w-[250px]"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground text-center">
                    <p className="font-medium">Location:</p>
                    <p>{registration.events.location}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => downloadQRCode(registration.id, registration.events.title)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => shareQRCode(registration.id)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </>
              ) : (
                <Skeleton className="h-64 w-full" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
};

export default ParticipantQRCode;
