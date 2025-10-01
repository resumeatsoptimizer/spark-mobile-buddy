import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, XCircle, Loader, CreditCard, Eye, Trash2, MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { PaymentDialog } from "@/components/PaymentDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Registration {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  event_id: string;
  ticket_type_id?: string;
  events: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    location?: string;
    cover_image_url?: string;
  };
  ticket_types?: {
    id: string;
    name: string;
    price: number;
  };
}

const Registrations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    fetchRegistrations(session.user.id);
  };

  const fetchRegistrations = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("registrations")
      .select(`
        id,
        status,
        payment_status,
        created_at,
        event_id,
        ticket_type_id,
        events (
          id,
          title,
          start_date,
          end_date,
          location,
          cover_image_url
        ),
        ticket_types (
          id,
          name,
          price
        )
      `)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      setRegistrations(data || []);
    }
    setLoading(false);
  };

  const handlePayNow = (registration: Registration) => {
    setSelectedRegistration(registration);
    setPaymentDialogOpen(true);
  };

  const handleViewDetails = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const handleCancelClick = (registration: Registration) => {
    setSelectedRegistration(registration);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedRegistration) return;

    setCancelingId(selectedRegistration.id);
    
    const { error } = await supabase
      .from("registrations")
      .update({ status: "cancelled" })
      .eq("id", selectedRegistration.id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกการลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      // Send cancellation email
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('send-registration-email', {
            body: {
              type: 'cancellation',
              recipientEmail: session.user.email,
              recipientName: session.user.user_metadata?.name || session.user.email,
              eventTitle: selectedRegistration.events.title,
              eventDate: selectedRegistration.events.start_date,
              eventLocation: selectedRegistration.events.location,
              registrationId: selectedRegistration.id,
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
      }

      toast({
        title: "ยกเลิกสำเร็จ",
        description: "ยกเลิกการลงทะเบียนเรียบร้อยแล้ว",
      });

      // Refresh data
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchRegistrations(session.user.id);
      }
    }

    setCancelingId(null);
    setCancelDialogOpen(false);
    setSelectedRegistration(null);
  };

  const handlePaymentSuccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      fetchRegistrations(session.user.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />ยืนยันแล้ว</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader className="mr-1 h-3 w-3" />รอดำเนินการ</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />ยกเลิก</Badge>;
      case "waitlist":
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />รายการรอ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-blue-500">ชำระแล้ว</Badge>;
      case "unpaid":
        return <Badge variant="outline">ยังไม่ชำระ</Badge>;
      case "failed":
        return <Badge variant="destructive">ชำระไม่สำเร็จ</Badge>;
      default:
        return <Badge>{paymentStatus}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
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
          <h1 className="text-3xl font-bold mb-2">การลงทะเบียนของฉัน</h1>
          <p className="text-muted-foreground">
            รายการงานอีเว้นท์ทั้งหมดที่คุณลงทะเบียน
          </p>
        </div>

        {registrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">ยังไม่มีการลงทะเบียน</h3>
              <p className="text-muted-foreground mb-4">
                เริ่มต้นลงทะเบียนงานอีเว้นท์ของเราได้เลย
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {registrations.map((registration) => (
              <Card key={registration.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                {/* Event Cover Image */}
                {registration.events.cover_image_url ? (
                  <div className="relative h-48 overflow-hidden group">
                    <img
                      src={registration.events.cover_image_url}
                      alt={registration.events.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(registration.status)}
                    </div>
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Calendar className="h-16 w-16 text-muted-foreground/30" />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(registration.status)}
                    </div>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{registration.events.title}</CardTitle>
                  </div>
                  <CardDescription>
                    ลงทะเบียนเมื่อ {format(new Date(registration.created_at), "d MMM yyyy", { locale: th })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(registration.events.start_date), "d MMM yyyy", { locale: th })}
                    </span>
                  </div>
                  
                  {registration.events.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{registration.events.location}</span>
                    </div>
                  )}

                  {registration.ticket_types && (
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{registration.ticket_types.name}</span>
                      <span className="ml-auto text-primary font-semibold">
                        ฿{registration.ticket_types.price.toLocaleString('th-TH')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">สถานะการชำระเงิน:</span>
                    {getPaymentBadge(registration.payment_status)}
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-wrap gap-2 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetails(registration.events.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    ดูรายละเอียด
                  </Button>
                  
                  {registration.payment_status === "unpaid" && (registration.status === "confirmed" || registration.status === "pending") && registration.ticket_types && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePayNow(registration)}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      ชำระตอนนี้
                    </Button>
                  )}
                  
                  {registration.status !== "cancelled" && registration.payment_status === "unpaid" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCancelClick(registration)}
                      disabled={cancelingId === registration.id}
                    >
                      {cancelingId === registration.id ? (
                        <>
                          <Loader className="h-4 w-4 mr-1 animate-spin" />
                          กำลังยกเลิก...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          ยกเลิกการลงทะเบียน
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedRegistration && selectedRegistration.ticket_types && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          registrationId={selectedRegistration.id}
          amount={selectedRegistration.ticket_types.price}
          eventTitle={selectedRegistration.events.title}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียนงาน "{selectedRegistration?.events.title}"?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ยืนยันการยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Registrations;
