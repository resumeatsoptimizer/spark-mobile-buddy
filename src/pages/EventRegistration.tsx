import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, ArrowLeft, Clock, MapPin, Mail, Phone, MessageCircle, Building2, Briefcase, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PaymentDialog } from "@/components/PaymentDialog";
import { REGISTRATION_FIELDS, DEFAULT_ENABLED_FIELDS, RegistrationField } from "@/lib/registrationFields";
import { Progress } from "@/components/ui/progress";
import * as Icons from "lucide-react";

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
  location: string | null;
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
  const [enabledFields, setEnabledFields] = useState<string[]>(DEFAULT_ENABLED_FIELDS);
  const [currentStep, setCurrentStep] = useState(1);
  const [workInfoOpen, setWorkInfoOpen] = useState(false);
  const [eventInfoOpen, setEventInfoOpen] = useState(false);
  const [emergencyInfoOpen, setEmergencyInfoOpen] = useState(false);

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
    
    // ดึงข้อมูล profile เพื่อเติมชื่อและอีเมล
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', session.user.id)
      .single();
    
    // Pre-fill name and email from profile
    setFormData(prev => ({ 
      ...prev, 
      full_name: profile?.name || "",
      email: profile?.email || session.user.email || ""
    }));
    
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
        description: "ไม่สามารถโหลดข้อมูลกิจกรรมได้",
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

    // Extract enabled fields from custom_fields
    const customFieldsData = data.custom_fields as { enabled_fields?: string[] } | null;
    setEnabledFields(customFieldsData?.enabled_fields || DEFAULT_ENABLED_FIELDS);

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

    // Validate required fields
    const requiredFields = REGISTRATION_FIELDS.filter(
      f => f.required && enabledFields.includes(f.id)
    );

    for (const field of requiredFields) {
      if (!formData[field.id] || formData[field.id].trim() === "") {
        toast({
          title: "กรุณากรอกข้อมูลให้ครบ",
          description: `${field.label}เป็นข้อมูลที่จำเป็น`,
          variant: "destructive",
        });
        return;
      }
    }

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
    
    console.log('Seat check:', {
      seats_remaining: event.seats_remaining,
      seats_total: event.seats_total,
      allow_overbooking: event.allow_overbooking,
      overbooking_percentage: event.overbooking_percentage,
      maxSeats
    });
    
    const seatsAvailable = event.seats_remaining > 0;
    
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
      setSubmitting(false);
      return;
    }

    // Seats will be automatically decremented by database trigger when payment is completed
    const isFreeTicket = selectedTicket && selectedTicket.price === 0;
    
    // For free tickets, manually decrement seats since there's no payment process
    if (isFreeTicket && status === "pending") {
      await supabase
        .from("events")
        .update({ seats_remaining: event.seats_remaining - 1 })
        .eq("id", event.id);

      if (selectedTicket) {
        await supabase
          .from("ticket_types")
          .update({ seats_remaining: selectedTicket.seats_remaining - 1 })
          .eq("id", selectedTicketTypeId);
      }
    }

    // Send registration confirmation email
    try {
      await supabase.functions.invoke('send-registration-email', {
        body: {
          type: 'registration',
          recipientEmail: formData.email,
          recipientName: formData.full_name,
          eventTitle: event.title,
          eventDate: event.start_date,
          eventLocation: event.location,
          registrationId: registration.id,
          ticketType: selectedTicket?.name,
        }
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    toast({
      title: "✅ ลงทะเบียนสำเร็จ!",
      description: status === "pending" 
        ? isFreeTicket 
          ? "ลงทะเบียนเรียบร้อยแล้ว ตรวจสอบอีเมลของคุณ" 
          : "กรุณาชำระเงินเพื่อยืนยันการลงทะเบียน"
        : "เพิ่มเข้ารายการรอเรียบร้อยแล้ว ตรวจสอบอีเมลของคุณ",
    });

    if (status === "pending" && !isFreeTicket) {
      setNewRegistrationId(registration.id);
      setShowPayment(true);
    } else {
      navigate(`/events/${event.id}`, { 
        state: { 
          registrationSuccess: true,
          needsPayment: false 
        } 
      });
    }

    setSubmitting(false);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = Icons[iconName as keyof typeof Icons] as any;
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const renderField = (field: RegistrationField) => {
    const icon = getIcon(field.icon);
    
    // ตรวจสอบว่าเป็นฟิลด์ที่ต้อง disable หรือไม่
    const isDisabled = field.id === 'full_name' || field.id === 'email';
    
    const commonProps = {
      id: field.id,
      required: field.required,
      placeholder: field.placeholder,
      disabled: isDisabled,
    };

    const inputElement = (() => {
      switch (field.type) {
        case "textarea":
          return (
            <Textarea
              {...commonProps}
              value={formData[field.id] || ""}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              rows={3}
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
        default:
          return (
            <Input
              {...commonProps}
              type={field.type}
              value={formData[field.id] || ""}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              className={isDisabled ? "bg-muted cursor-not-allowed" : ""}
            />
          );
      }
    })();

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="flex items-center gap-2">
          {icon}
          <span>
            {field.label} {field.required && <span className="text-destructive">*</span>}
            {isDisabled && <span className="text-xs text-muted-foreground ml-2">(จากข้อมูลสมาชิก)</span>}
          </span>
        </Label>
        {inputElement}
        {field.labelEn && (
          <p className="text-xs text-muted-foreground">{field.labelEn}</p>
        )}
      </div>
    );
  };

  const handlePaymentSuccess = () => {
    navigate(`/events/${id}`, { 
      state: { 
        registrationSuccess: true,
        paymentSuccess: true 
      } 
    });
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

  const isFull = event.seats_remaining === 0;
  const seatsPercentage = (event.seats_remaining / event.seats_total) * 100;
  
  const now = new Date();
  const isRegistrationOpen = !event.registration_open_date || new Date(event.registration_open_date) <= now;
  const isRegistrationClosed = event.registration_close_date && new Date(event.registration_close_date) < now;
  const canRegister = isRegistrationOpen && !isRegistrationClosed;

  // Group fields by category
  const basicFields = REGISTRATION_FIELDS.filter(f => f.category === "basic" && enabledFields.includes(f.id));
  const workFields = REGISTRATION_FIELDS.filter(f => f.category === "work" && enabledFields.includes(f.id));
  const eventFields = REGISTRATION_FIELDS.filter(f => f.category === "event" && enabledFields.includes(f.id));
  const emergencyFields = REGISTRATION_FIELDS.filter(f => f.category === "emergency" && enabledFields.includes(f.id));

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

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

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">เวลาเริ่มต้น</p>
                      <p className="font-medium">
                        {format(new Date(event.start_date), "d MMM yyyy", { locale: th })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_date), "HH:mm", { locale: th })} น.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">เวลาสิ้นสุด</p>
                      <p className="font-medium">
                        {format(new Date(event.end_date), "d MMM yyyy", { locale: th })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.end_date), "HH:mm", { locale: th })} น.
                      </p>
                    </div>
                  </div>
                  {event.location && (
                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-card sm:col-span-2">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">สถานที่</p>
                        <p className="font-medium">{event.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Seats Info */}
                <div className="p-4 border rounded-lg space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-medium">ที่นั่งคงเหลือ</span>
                    </div>
                    <span className="text-lg font-bold">
                      {event.seats_remaining} / {event.seats_total}
                    </span>
                  </div>
                  <Progress value={seatsPercentage} className="h-3" />
                </div>

                {isFull && event.waitlist_enabled && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      ที่นั่งเต็มแล้ว คุณสามารถลงทะเบียนเข้ารายการรอได้
                      {event.max_waitlist_size && ` (${waitlistCount}/${event.max_waitlist_size})`}
                    </AlertDescription>
                  </Alert>
                )}
                
                {!canRegister && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
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
                {/* Important Notice */}
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>โปรดใช้ชื่อ-นามสกุลจริง</AlertTitle>
                  <AlertDescription>
                    กรุณากรอกชื่อ-นามสกุลจริงของคุณเพื่อใช้ในการตรวจสอบเข้าร่วมกิจกรรม
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Icons.UserCircle className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">ข้อมูลพื้นฐาน</h3>
                    </div>
                    {basicFields.map(renderField)}
                  </div>

                  {/* Ticket Type Selection */}
                  {ticketTypes.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="ticketType" className="flex items-center gap-2">
                        <Icons.Ticket className="h-4 w-4" />
                        <span>ประเภทตั๋ว <span className="text-destructive">*</span></span>
                      </Label>
                      <Select
                        value={selectedTicketTypeId}
                        onValueChange={setSelectedTicketTypeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภทตั๋ว" />
                        </SelectTrigger>
                        <SelectContent>
                          {ticketTypes.map((ticket) => (
                            <SelectItem key={ticket.id} value={ticket.id}>
                              <div className="flex items-center justify-between gap-4">
                                <span>{ticket.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    ฿{ticket.price.toLocaleString()}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    ({ticket.seats_remaining} ที่นั่ง)
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Work Information - Collapsible */}
                  {workFields.length > 0 && (
                    <Collapsible open={workInfoOpen} onOpenChange={setWorkInfoOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between hover:bg-muted/50"
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <Icons.Briefcase className="h-4 w-4" />
                            <span className="font-semibold">ข้อมูลการทำงาน</span>
                            <Badge variant="secondary" className="text-xs">ไม่บังคับ</Badge>
                          </span>
                          {workInfoOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        {workFields.map(renderField)}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Event Preferences - Collapsible */}
                  {eventFields.length > 0 && (
                    <Collapsible open={eventInfoOpen} onOpenChange={setEventInfoOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between hover:bg-muted/50"
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <Icons.Calendar className="h-4 w-4" />
                            <span className="font-semibold">ข้อมูลเกี่ยวกับงาน</span>
                            <Badge variant="secondary" className="text-xs">ไม่บังคับ</Badge>
                          </span>
                          {eventInfoOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        {eventFields.map(renderField)}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Emergency Contact - Collapsible */}
                  {emergencyFields.length > 0 && (
                    <Collapsible open={emergencyInfoOpen} onOpenChange={setEmergencyInfoOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between hover:bg-muted/50"
                          type="button"
                        >
                          <span className="flex items-center gap-2">
                            <Icons.AlertCircle className="h-4 w-4" />
                            <span className="font-semibold">ผู้ติดต่อฉุกเฉิน</span>
                            <Badge variant="secondary" className="text-xs">ไม่บังคับ</Badge>
                          </span>
                          {emergencyInfoOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        {emergencyFields.map(renderField)}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

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
                      <div className="text-center">
                        {ticketTypes.find(t => t.id === selectedTicketTypeId)?.price === 0 ? (
                          <Badge variant="secondary">การลงทะเบียนฟรี</Badge>
                        ) : (
                          <div className="text-sm">
                            <span className="text-muted-foreground">ค่าลงทะเบียน: </span>
                            <span className="font-bold text-primary">
                              ฿{ticketTypes.find(t => t.id === selectedTicketTypeId)?.price.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
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
