import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomField } from "@/components/event-builder/FieldBuilder";
import { PaymentDialog } from "@/components/PaymentDialog";

interface TicketType {
  id: string;
  name: string;
  price: number;
  seats_allocated: number;
  seats_remaining: number;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
  seats_total: number;
  seats_remaining: number;
  custom_fields: any;
  allow_overbooking: boolean;
  overbooking_percentage: number;
  registration_open_date: string | null;
  registration_close_date: string | null;
  waitlist_enabled: boolean;
  max_waitlist_size: number | null;
  visibility: string;
  invitation_code: string | null;
}

const EventRegistration = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [codeVerified, setCodeVerified] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [newRegistrationId, setNewRegistrationId] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>("");

  useEffect(() => {
    checkAuthAndFetch();
  }, [id]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนลงทะเบียน",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);
    fetchEvent();
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
        description: "ไม่สามารถโหลดข้อมูลงานอีเว้นท์ได้",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Check visibility and invitation code
    if (data.visibility === "private") {
      const codeParam = searchParams.get("code");
      if (!codeParam || codeParam !== data.invitation_code) {
        setCodeVerified(false);
        setEvent(data);
        setLoading(false);
        return;
      }
      setCodeVerified(true);
    }

    // Count waitlist
    const { count } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id);
    
    setWaitlistCount(count || 0);

    // Fetch ticket types
    const { data: ticketTypesData } = await supabase
      .from("ticket_types")
      .select("*")
      .eq("event_id", id)
      .order("price", { ascending: true });
    
    if (ticketTypesData && ticketTypesData.length > 0) {
      setTicketTypes(ticketTypesData);
      setSelectedTicketTypeId(ticketTypesData[0].id);
    }

    setEvent(data);
    setLoading(false);
  };

  const verifyCode = () => {
    if (inputCode === event?.invitation_code) {
      setCodeVerified(true);
      toast({
        title: "ยืนยันรหัสสำเร็จ",
        description: "คุณสามารถลงทะเบียนได้แล้ว",
      });
    } else {
      toast({
        title: "รหัสไม่ถูกต้อง",
        description: "กรุณาตรวจสอบรหัสเชิญชวนอีกครั้ง",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !event) return;

    // Validate ticket type selection
    if (ticketTypes.length > 0 && !selectedTicketTypeId) {
      toast({
        title: "กรุณาเลือกประเภทตั๋ว",
        description: "โปรดเลือกประเภทตั๋วที่ต้องการ",
        variant: "destructive",
      });
      return;
    }

    const selectedTicket = ticketTypes.find(t => t.id === selectedTicketTypeId);

    // Check registration window
    const now = new Date();
    if (event.registration_open_date && new Date(event.registration_open_date) > now) {
      toast({
        title: "ยังไม่เปิดลงทะเบียน",
        description: `การลงทะเบียนจะเปิดวันที่ ${format(new Date(event.registration_open_date), "d MMM yyyy HH:mm", { locale: th })}`,
        variant: "destructive",
      });
      return;
    }

    if (event.registration_close_date && new Date(event.registration_close_date) < now) {
      toast({
        title: "ปิดลงทะเบียนแล้ว",
        description: "ช่วงเวลาลงทะเบียนสิ้นสุดแล้ว",
        variant: "destructive",
      });
      return;
    }

    // Check if already registered
    const { data: existingReg } = await supabase
      .from("registrations")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingReg) {
      toast({
        title: "ลงทะเบียนแล้ว",
        description: "คุณได้ลงทะเบียนงานนี้ไปแล้ว",
        variant: "destructive",
      });
      navigate("/registrations");
      return;
    }

    setSubmitting(true);

    const maxSeats = event.allow_overbooking 
      ? Math.floor(event.seats_total * (1 + event.overbooking_percentage / 100))
      : event.seats_total;
    
    const seatsAvailable = event.seats_remaining > 0 && event.seats_remaining <= maxSeats;
    
    // Check if should go to waitlist
    let shouldWaitlist = !seatsAvailable;
    if (shouldWaitlist && !event.waitlist_enabled) {
      toast({
        title: "ที่นั่งเต็ม",
        description: "งานนี้ไม่เปิดรับรายการรอ",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    // Check waitlist limit
    if (shouldWaitlist && event.max_waitlist_size && waitlistCount >= event.max_waitlist_size) {
      toast({
        title: "รายการรอเต็ม",
        description: "รายการรอมีผู้ลงทะเบียนเต็มแล้ว",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const status = shouldWaitlist ? "waitlist" : "pending";

    if (shouldWaitlist) {
      // Add to waitlist table
      const { error: waitlistError } = await supabase
        .from("waitlist")
        .insert([{
          event_id: event.id,
          user_id: userId,
        }]);

      if (waitlistError) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเพิ่มเข้ารายการรอได้",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
    }

    const { data: registration, error } = await supabase
      .from("registrations")
      .insert([{
        event_id: event.id,
        user_id: userId,
        status,
        payment_status: selectedTicket && selectedTicket.price === 0 ? "paid" : "unpaid",
        form_data: formData,
        ticket_type_id: selectedTicketTypeId || null,
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลงทะเบียนได้",
        variant: "destructive",
      });
    } else {
      // Update seats
      if (status === "pending") {
        await supabase
          .from("events")
          .update({ seats_remaining: event.seats_remaining - 1 })
          .eq("id", event.id);

        // Update ticket type seats if selected
        if (selectedTicket) {
          await supabase
            .from("ticket_types")
            .update({ seats_remaining: selectedTicket.seats_remaining - 1 })
            .eq("id", selectedTicketTypeId);
        }
      }

      const isFreeTicket = selectedTicket && selectedTicket.price === 0;

      toast({
        title: "สำเร็จ!",
        description: status === "pending" 
          ? isFreeTicket 
            ? "ลงทะเบียนเรียบร้อยแล้ว" 
            : "ลงทะเบียนเรียบร้อยแล้ว คุณสามารถชำระเงินได้เลย"
          : "เพิ่มเข้ารายการรอเรียบร้อยแล้ว",
      });

      if (status === "pending" && !isFreeTicket) {
        // Show payment dialog for paid registrations only
        setNewRegistrationId(registration.id);
        setShowPayment(true);
      } else {
        navigate("/registrations");
      }
    }

    setSubmitting(false);
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

  if (!event) {
    return null;
  }

  // Show invitation code form for private events
  if (event.visibility === "private" && !codeVerified) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>งานส่วนตัว</CardTitle>
                <CardDescription>กรุณากรอกรหัสเชิญชวนเพื่อเข้าถึงหน้าลงทะเบียน</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>รหัสเชิญชวน</Label>
                  <Input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="กรอกรหัส"
                  />
                </div>
                <Button onClick={verifyCode} className="w-full">
                  ยืนยัน
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  กลับหน้าแรก
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const maxSeats = event.allow_overbooking 
    ? Math.floor(event.seats_total * (1 + event.overbooking_percentage / 100))
    : event.seats_total;

  const isFull = event.seats_remaining === 0 || event.seats_remaining >= maxSeats;
  const seatsPercentage = (event.seats_remaining / event.seats_total) * 100;
  const customFields = Array.isArray(event.custom_fields) ? (event.custom_fields as CustomField[]) : [];
  
  const now = new Date();
  const isRegistrationOpen = !event.registration_open_date || new Date(event.registration_open_date) <= now;
  const isRegistrationClosed = event.registration_close_date && new Date(event.registration_close_date) < now;
  const canRegister = isRegistrationOpen && !isRegistrationClosed;

  const renderCustomField = (field: CustomField) => {
    const commonProps = {
      id: field.id,
      required: field.required,
      placeholder: field.placeholder,
    };

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            {...commonProps}
            value={formData[field.id] || ""}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
          />
        );
      case "select":
        return (
          <Select
            value={formData[field.id] || ""}
            onValueChange={(value) => setFormData({ ...formData, [field.id]: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "checkbox":
        return (
          <Checkbox
            checked={formData[field.id] === "true"}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, [field.id]: checked.toString() })
            }
          />
        );
      case "radio":
        return (
          <RadioGroup
            value={formData[field.id] || ""}
            onValueChange={(value) => setFormData({ ...formData, [field.id]: value })}
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      default:
        return (
          <Input
            {...commonProps}
            type={field.type}
            value={formData[field.id] || ""}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
          />
        );
    }
  };

  const handlePaymentSuccess = () => {
    navigate("/registrations");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Payment Dialog */}
      {showPayment && newRegistrationId && event && (
        <PaymentDialog
          open={showPayment}
          onOpenChange={setShowPayment}
          registrationId={newRegistrationId}
          amount={ticketTypes.find(t => t.id === selectedTicketTypeId)?.price || 0}
          eventTitle={event.title}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
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
                  <div>
                    <CardTitle className="text-3xl mb-2">{event.title}</CardTitle>
                    <CardDescription className="text-base">
                      {event.description || "ไม่มีรายละเอียด"}
                    </CardDescription>
                  </div>
                  {isFull && <Badge variant="destructive">ที่นั่งเต็ม</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">วันที่จัดงาน</p>
                      <p className="font-medium">
                        {format(new Date(event.start_date), "d MMM yyyy", { locale: th })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">สิ้นสุดวันที่</p>
                      <p className="font-medium">
                        {format(new Date(event.end_date), "d MMM yyyy", { locale: th })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seats Info */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-medium">ที่นั่งคงเหลือ</span>
                    </div>
                    <span className="text-lg font-bold">
                      {event.seats_remaining} / {event.seats_total}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        seatsPercentage > 50
                          ? "bg-primary"
                          : seatsPercentage > 20
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${seatsPercentage}%` }}
                    />
                  </div>
                </div>

                {isFull && event.waitlist_enabled && (
                  <Alert>
                    <AlertDescription>
                      ที่นั่งเต็มแล้ว คุณสามารถลงทะเบียนเข้ารายการรอได้
                      {event.max_waitlist_size && ` (${waitlistCount}/${event.max_waitlist_size})`}
                    </AlertDescription>
                  </Alert>
                )}
                
                {!canRegister && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {!isRegistrationOpen && `การลงทะเบียนจะเปิดวันที่ ${format(new Date(event.registration_open_date!), "d MMM yyyy HH:mm", { locale: th })}`}
                      {isRegistrationClosed && "ปิดลงทะเบียนแล้ว"}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Registration Form */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>ลงทะเบียนเข้าร่วมงาน</CardTitle>
                <CardDescription>
                  {isFull ? "เพิ่มเข้ารายการรอ" : "กรอกข้อมูลเพื่อลงทะเบียน"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
                    <Input
                      id="name"
                      required
                      placeholder="กรอกชื่อของคุณ"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                   <div className="space-y-2">
                    <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                    <Input
                      id="phone"
                      required
                      type="tel"
                      placeholder="0812345678"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* Ticket Type Selection */}
                  {ticketTypes.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="ticketType">ประเภทตั๋ว *</Label>
                      <Select
                        value={selectedTicketTypeId}
                        onValueChange={setSelectedTicketTypeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภทตั๋ว" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {ticketTypes.map((ticket) => (
                            <SelectItem key={ticket.id} value={ticket.id}>
                              {ticket.name} - ฿{ticket.price.toLocaleString()} ({ticket.seats_remaining} ที่นั่งคงเหลือ)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Custom Fields */}
                  {customFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label} {field.required && "*"}
                      </Label>
                      {renderCustomField(field)}
                    </div>
                  ))}

                   <div className="pt-4 space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={submitting || !canRegister || (isFull && !event.waitlist_enabled)}
                      size="lg"
                    >
                      {submitting 
                        ? "กำลังดำเนินการ..." 
                        : isFull 
                        ? "เข้ารายการรอ" 
                        : "ยืนยันการลงทะเบียน"
                      }
                    </Button>
                    {ticketTypes.length > 0 && selectedTicketTypeId && (
                      <p className="text-xs text-muted-foreground text-center">
                        {ticketTypes.find(t => t.id === selectedTicketTypeId)?.price === 0 
                          ? "การลงทะเบียนไม่มีค่าใช้จ่าย" 
                          : `ค่าลงทะเบียน ฿${ticketTypes.find(t => t.id === selectedTicketTypeId)?.price.toLocaleString()}`
                        }
                      </p>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventRegistration;
