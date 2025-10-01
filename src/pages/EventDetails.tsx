import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, MapPin, Clock, ArrowLeft, Edit, Trash2, CreditCard, CheckCircle, XCircle, Loader, QrCode, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Progress } from "@/components/ui/progress";
import { convertToEmbedUrl, isValidGoogleMapsUrl } from "@/lib/maps";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  google_map_url: string | null;
  google_map_embed_code: string | null;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_remaining: number;
  registration_open_date: string | null;
  registration_close_date: string | null;
  visibility: string | null;
  waitlist_enabled: boolean | null;
  max_waitlist_size: number | null;
  allow_overbooking: boolean | null;
  overbooking_percentage: number | null;
  created_at: string;
}

interface UserRegistration {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  ticket_type_id?: string;
  ticket_types?: {
    id: string;
    name: string;
    price: number;
  };
  form_data?: any;
}

const EventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRegistration, setUserRegistration] = useState<UserRegistration | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchEvent();
    fetchUserRegistration();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      setUserRole(roles?.role || "participant");
    }
  };

  const fetchEvent = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลอีเว้นท์ได้",
        variant: "destructive",
      });
      navigate("/events");
    } else {
      setEvent(data);
    }
    setLoading(false);
  };

  const fetchUserRegistration = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("registrations")
      .select(`
        id,
        status,
        payment_status,
        created_at,
        ticket_type_id,
        form_data,
        ticket_types (
          id,
          name,
          price
        )
      `)
      .eq("event_id", id)
      .eq("user_id", session.user.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (!error && data) {
      setUserRegistration(data);
      
      // Generate QR code if paid
      if (data.payment_status === "paid") {
        try {
          const { data: qrData } = await supabase.functions.invoke('qr-code-generator', {
            body: { registration_id: data.id }
          });
          if (qrData?.qrCodeData) {
            setQrCodeData(qrData.qrCodeData);
          }
        } catch (error) {
          console.error('Failed to generate QR code:', error);
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm(`คุณต้องการลบงานอีเว้นท์ "${event.title}" ใช่หรือไม่?`)) {
      return;
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบงานอีเว้นท์ได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ลบสำเร็จ",
        description: `ลบงานอีเว้นท์ "${event.title}" เรียบร้อยแล้ว`,
      });
      navigate("/events");
    }
  };

  const handlePayNow = () => {
    setPaymentDialogOpen(true);
  };

  const handleCancelRegistration = () => {
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!userRegistration) return;

    setCanceling(true);
    
    const { error } = await supabase
      .from("registrations")
      .update({ status: "cancelled" })
      .eq("id", userRegistration.id);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกการลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ยกเลิกสำเร็จ",
        description: "ยกเลิกการลงทะเบียนเรียบร้อยแล้ว",
      });
      setUserRegistration(null);
      fetchEvent(); // Refresh to update seats
    }

    setCanceling(false);
    setCancelDialogOpen(false);
  };

  const handlePaymentSuccess = async () => {
    await fetchUserRegistration();
    await fetchEvent();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />ยืนยันแล้ว</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader className="mr-1 h-3 w-3" />รอดำเนินการ</Badge>;
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

  const isStaff = userRole === "admin" || userRole === "staff";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const seatsPercentage = (event.seats_remaining / event.seats_total) * 100;
  const isFull = event.seats_remaining === 0;
  const registrationOpen = event.registration_open_date 
    ? new Date(event.registration_open_date) <= new Date()
    : true;
  const registrationClosed = event.registration_close_date
    ? new Date(event.registration_close_date) < new Date()
    : false;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header with Breadcrumb */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate("/")} className="cursor-pointer">
                  หน้าหลัก
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate("/events")} className="cursor-pointer">
                  งานอีเว้นท์
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>{event?.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Event Details */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            {event.cover_image_url && (
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-t-lg">
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-3xl">{event.title}</CardTitle>
                    {event.visibility === "private" && (
                      <Badge variant="secondary">Private</Badge>
                    )}
                  </div>
                  {event.description && (
                    <CardDescription className="text-base mt-2">
                      {event.description}
                    </CardDescription>
                  )}
                </div>
                {isFull && (
                  <Badge variant="destructive">ที่นั่งเต็ม</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Event Info Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">วันที่จัดงาน</p>
                        <p className="font-semibold">
                          {format(new Date(event.start_date), "d MMMM yyyy", { locale: th })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">เวลา</p>
                        <p className="font-semibold">
                          {format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")} น.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Location Info */}
              {(event.location || event.google_map_url) && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">สถานที่จัดงาน</p>
                        {event.location ? (
                          <p className="font-semibold">{event.location}</p>
                        ) : (
                          <p className="font-semibold text-muted-foreground">ดูตำแหน่งบนแผนที่</p>
                        )}
                        {event.google_map_url && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a
                              href={event.google_map_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              เปิดใน Google Maps →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Embedded Google Map */}
                    {(event.google_map_embed_code || event.location || (event.google_map_url && isValidGoogleMapsUrl(event.google_map_url))) && (
                      <div className="w-full h-[300px] rounded-lg overflow-hidden border shadow-sm bg-muted/30 flex items-center justify-center">
                        <iframe
                          src={
                            event.google_map_embed_code 
                              ? event.google_map_embed_code.match(/src="([^"]+)"/)?.[1]?.replace(/^http:/, 'https:') || ''
                              : convertToEmbedUrl(event.google_map_url || '', event.location || undefined)
                          }
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                          title={`แผนที่ ${event.location || 'สถานที่จัดงาน'}`}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* User Registration Status */}
              {userRegistration && (
                <Card className="border-2 border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      ข้อมูลการลงทะเบียนของคุณ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">สถานะ</p>
                        {getStatusBadge(userRegistration.status)}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">การชำระเงิน</p>
                        {getPaymentBadge(userRegistration.payment_status)}
                      </div>
                    </div>

                    {userRegistration.ticket_types && (
                      <div className="p-4 bg-background rounded-lg border">
                        <p className="text-sm text-muted-foreground mb-1">ประเภทตั๋ว</p>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{userRegistration.ticket_types.name}</p>
                          <p className="text-lg font-bold text-primary">
                            ฿{userRegistration.ticket_types.price.toLocaleString('th-TH')}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ลงทะเบียนเมื่อ</p>
                      <p className="font-medium">
                        {format(new Date(userRegistration.created_at), "d MMMM yyyy HH:mm", { locale: th })} น.
                      </p>
                    </div>

                    {/* QR Code */}
                    {qrCodeData && (
                      <div className="p-4 bg-background rounded-lg border text-center">
                        <p className="text-sm font-medium mb-3">QR Code สำหรับเช็คอิน</p>
                        <div className="inline-block p-4 bg-white rounded-lg">
                          <img 
                            src={`data:image/png;base64,${qrCodeData}`} 
                            alt="QR Code" 
                            className="w-48 h-48 mx-auto"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          แสดง QR Code นี้เมื่อเช็คอินเข้างาน
                        </p>
                      </div>
                    )}

                    {/* Action Buttons for Registered User */}
                    <div className="flex gap-2 pt-2">
                      {userRegistration.payment_status === "unpaid" && userRegistration.ticket_types && (
                        <Button
                          onClick={handlePayNow}
                          className="flex-1"
                          size="lg"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          ชำระเงิน
                        </Button>
                      )}
                      {userRegistration.payment_status === "unpaid" && (
                        <Button
                          variant="destructive"
                          onClick={handleCancelRegistration}
                          disabled={canceling}
                          size="lg"
                        >
                          {canceling ? (
                            <>
                              <Loader className="mr-2 h-4 w-4 animate-spin" />
                              กำลังยกเลิก...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              ยกเลิก
                            </>
                          )}
                        </Button>
                      )}
                      {userRegistration.payment_status === "paid" && (
                        <Button
                          variant="outline"
                          onClick={() => navigate("/participant/qr-code")}
                          className="flex-1"
                          size="lg"
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          ดู QR Code แบบเต็ม
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seats Info */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-semibold">ที่นั่งคงเหลือ</span>
                    </div>
                    <span className="text-2xl font-bold">
                      {event.seats_remaining} / {event.seats_total}
                    </span>
                  </div>
                  <Progress value={seatsPercentage} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {seatsPercentage.toFixed(0)}% ของที่นั่งยังว่าง
                  </p>
                </CardContent>
              </Card>

              {/* Registration Period */}
              {(event.registration_open_date || event.registration_close_date) && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">ช่วงเวลาลงทะเบียน</h3>
                    <div className="space-y-2 text-sm">
                      {event.registration_open_date && (
                        <p>
                          <span className="text-muted-foreground">เปิดรับ: </span>
                          {format(new Date(event.registration_open_date), "d MMM yyyy HH:mm", { locale: th })} น.
                        </p>
                      )}
                      {event.registration_close_date && (
                        <p>
                          <span className="text-muted-foreground">ปิดรับ: </span>
                          {format(new Date(event.registration_close_date), "d MMM yyyy HH:mm", { locale: th })} น.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Info */}
              {(event.waitlist_enabled || event.allow_overbooking) && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">ข้อมูลเพิ่มเติม</h3>
                    <div className="space-y-2 text-sm">
                      {event.waitlist_enabled && (
                        <p className="flex items-center gap-2">
                          <Badge variant="outline">Waitlist</Badge>
                          <span>มีระบบรายการรอ</span>
                          {event.max_waitlist_size && (
                            <span className="text-muted-foreground">
                              (สูงสุด {event.max_waitlist_size} คน)
                            </span>
                          )}
                        </p>
                      )}
                      {event.allow_overbooking && (
                        <p className="flex items-center gap-2">
                          <Badge variant="outline">Overbooking</Badge>
                          <span>อนุญาตให้รับเกิน {event.overbooking_percentage}%</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {!userRegistration && (
                <div className="flex gap-3 pt-4">
                  {isStaff ? (
                    <>
                      <Button
                        onClick={() => navigate(`/events/${event.id}/edit`)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        แก้ไขงานอีเว้นท์
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        ลบ
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={isFull || !registrationOpen || registrationClosed}
                      onClick={() => navigate(`/events/${event.id}/register`)}
                    >
                      {!registrationOpen
                        ? "ยังไม่เปิดรับสมัคร"
                        : registrationClosed
                        ? "ปิดรับสมัครแล้ว"
                        : isFull
                        ? "ที่นั่งเต็ม"
                        : "ลงทะเบียนเลย"}
                    </Button>
                  )}
                </div>
              )}

              {/* Staff actions for registered events */}
              {isStaff && userRegistration && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => navigate(`/events/${event.id}/edit`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    แก้ไขงานอีเว้นท์
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Payment Dialog */}
      {userRegistration && userRegistration.ticket_types && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          registrationId={userRegistration.id}
          amount={userRegistration.ticket_types.price}
          eventTitle={event?.title || ""}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการยกเลิก</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะยกเลิกการลงทะเบียนงาน "{event?.title}"?
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ยืนยันการยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventDetails;
