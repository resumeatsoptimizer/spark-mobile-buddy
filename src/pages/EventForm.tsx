import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { FieldBuilder, CustomField } from "@/components/event-builder/FieldBuilder";
import { CapacitySettings, TicketType } from "@/components/event-builder/CapacitySettings";
import { TimeWindowSettings } from "@/components/event-builder/TimeWindowSettings";
import { WaitlistSettings } from "@/components/event-builder/WaitlistSettings";
import { VisibilitySettings } from "@/components/event-builder/VisibilitySettings";

const EventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(0);
  
  // Advanced features
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [allowOverbooking, setAllowOverbooking] = useState(false);
  const [overbookingPercentage, setOverbookingPercentage] = useState(0);
  const [registrationOpenDate, setRegistrationOpenDate] = useState("");
  const [registrationCloseDate, setRegistrationCloseDate] = useState("");
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [maxWaitlistSize, setMaxWaitlistSize] = useState(0);
  const [autoPromoteRule, setAutoPromoteRule] = useState<"immediate" | "manual" | "timed">("manual");
  const [promoteWindowHours, setPromoteWindowHours] = useState(24);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [invitationCode, setInvitationCode] = useState("");

  const isEditMode = !!id;

  useEffect(() => {
    checkAuth();
    if (isEditMode) {
      fetchEvent();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    const userRole = roles?.role;
    if (userRole !== "admin" && userRole !== "staff") {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "คุณไม่มีสิทธิ์ในการจัดการงานอีเว้นท์",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const fetchEvent = async () => {
    if (!id) return;

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
      navigate("/events");
      return;
    }

    if (data) {
      setTitle(data.title);
      setDescription(data.description || "");
      setStartDate(data.start_date.substring(0, 16));
      setEndDate(data.end_date.substring(0, 16));
      setSeatsTotal(data.seats_total);
      setCustomFields((data.custom_fields as any as CustomField[]) || []);
      setAllowOverbooking(data.allow_overbooking || false);
      setOverbookingPercentage(data.overbooking_percentage || 0);
      setRegistrationOpenDate(data.registration_open_date ? data.registration_open_date.substring(0, 16) : "");
      setRegistrationCloseDate(data.registration_close_date ? data.registration_close_date.substring(0, 16) : "");
      setWaitlistEnabled(data.waitlist_enabled !== false);
      setMaxWaitlistSize(data.max_waitlist_size || 0);
      setAutoPromoteRule((data.auto_promote_rule as any) || "manual");
      setPromoteWindowHours(data.promote_window_hours || 24);
      setVisibility((data.visibility as any) || "public");
      setInvitationCode(data.invitation_code || "");

      // Fetch ticket types
      const { data: types } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", id);
      
      if (types) {
        setTicketTypes(types);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !startDate || !endDate || !seatsTotal) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    if (seatsTotal <= 0) {
      toast({
        title: "จำนวนที่นั่งไม่ถูกต้อง",
        description: "กรุณากรอกจำนวนที่นั่งที่มากกว่า 0",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "วันที่ไม่ถูกต้อง",
        description: "วันที่เริ่มต้นต้องมาก่อนวันที่สิ้นสุด",
        variant: "destructive",
      });
      return;
    }

    if (visibility === "private" && !invitationCode) {
      toast({
        title: "กรุณากำหนดรหัสเชิญชวน",
        description: "งานส่วนตัวต้องมีรหัสเชิญชวน",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const eventData = {
      title,
      description: description || null,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
      seats_total: seatsTotal,
      seats_remaining: seatsTotal,
      created_by: session.user.id,
      custom_fields: customFields as any,
      allow_overbooking: allowOverbooking,
      overbooking_percentage: overbookingPercentage,
      registration_open_date: registrationOpenDate ? new Date(registrationOpenDate).toISOString() : null,
      registration_close_date: registrationCloseDate ? new Date(registrationCloseDate).toISOString() : null,
      waitlist_enabled: waitlistEnabled,
      max_waitlist_size: maxWaitlistSize > 0 ? maxWaitlistSize : null,
      auto_promote_rule: autoPromoteRule,
      promote_window_hours: promoteWindowHours,
      visibility,
      invitation_code: visibility === "private" ? invitationCode : null,
    };

    let error;
    let eventId = id;

    if (isEditMode) {
      const result = await supabase
        .from("events")
        .update(eventData)
        .eq("id", id);
      error = result.error;
    } else {
      const result = await supabase
        .from("events")
        .insert([eventData])
        .select()
        .single();
      error = result.error;
      eventId = result.data?.id;
    }

    // Handle ticket types
    if (!error && eventId && ticketTypes.length > 0) {
      // Delete existing ticket types if editing
      if (isEditMode) {
        await supabase.from("ticket_types").delete().eq("event_id", eventId);
      }

      // Insert new ticket types
      const ticketTypeData = ticketTypes.map((t) => ({
        event_id: eventId,
        name: t.name,
        seats_allocated: t.seats_allocated,
        seats_remaining: t.seats_allocated,
        price: t.price,
      }));

      const { error: ticketError } = await supabase
        .from("ticket_types")
        .insert(ticketTypeData);

      if (ticketError) {
        console.error("Error saving ticket types:", ticketError);
      }
    }

    setLoading(false);

    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถ${isEditMode ? "แก้ไข" : "สร้าง"}งานอีเว้นท์ได้`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "สำเร็จ",
        description: `${isEditMode ? "แก้ไข" : "สร้าง"}งานอีเว้นท์เรียบร้อยแล้ว`,
      });
      navigate("/events");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditMode ? "แก้ไขงานอีเว้นท์" : "สร้างงานอีเว้นท์ใหม่"}
              </h1>
              <p className="text-sm text-muted-foreground">
                กรอกข้อมูลงานอีเว้นท์
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
              <CardDescription>ข้อมูลหลักของงานอีเว้นท์</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">ชื่องานอีเว้นท์ *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น Yoga Workshop 2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดของงานอีเว้นท์..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Time Window */}
          <TimeWindowSettings
            startDate={startDate}
            endDate={endDate}
            registrationOpenDate={registrationOpenDate}
            registrationCloseDate={registrationCloseDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onRegistrationOpenDateChange={setRegistrationOpenDate}
            onRegistrationCloseDateChange={setRegistrationCloseDate}
          />

          {/* Capacity */}
          <CapacitySettings
            totalSeats={seatsTotal}
            onTotalSeatsChange={setSeatsTotal}
            ticketTypes={ticketTypes}
            onTicketTypesChange={setTicketTypes}
            allowOverbooking={allowOverbooking}
            onAllowOverbookingChange={setAllowOverbooking}
            overbookingPercentage={overbookingPercentage}
            onOverbookingPercentageChange={setOverbookingPercentage}
          />

          {/* Waitlist */}
          <WaitlistSettings
            waitlistEnabled={waitlistEnabled}
            onWaitlistEnabledChange={setWaitlistEnabled}
            maxWaitlistSize={maxWaitlistSize}
            onMaxWaitlistSizeChange={setMaxWaitlistSize}
            autoPromoteRule={autoPromoteRule}
            onAutoPromoteRuleChange={setAutoPromoteRule}
            promoteWindowHours={promoteWindowHours}
            onPromoteWindowHoursChange={setPromoteWindowHours}
          />

          {/* Custom Fields */}
          <FieldBuilder fields={customFields} onChange={setCustomFields} />

          {/* Visibility */}
          <VisibilitySettings
            visibility={visibility}
            onVisibilityChange={setVisibility}
            invitationCode={invitationCode}
            onInvitationCodeChange={setInvitationCode}
          />

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/events")}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "สร้างงานอีเว้นท์"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EventForm;
