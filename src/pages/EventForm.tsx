import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles } from "lucide-react";
import { StaticFieldsConfiguration } from "@/components/event-builder/StaticFieldsConfiguration";
import { DEFAULT_ENABLED_FIELDS } from "@/lib/registrationFields";
import { CapacitySettings, TicketType } from "@/components/event-builder/CapacitySettings";
import { TimeWindowSettings } from "@/components/event-builder/TimeWindowSettings";
import { WaitlistSettings } from "@/components/event-builder/WaitlistSettings";
import { VisibilitySettings } from "@/components/event-builder/VisibilitySettings";
import AIEventCreator from "@/components/AIEventCreator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";

const EventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isDuplicateMode = routeLocation.pathname.includes('/duplicate');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [googleMapEmbedCode, setGoogleMapEmbedCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [seatsTotal, setSeatsTotal] = useState(0);
  
  // Advanced features
  const [enabledFields, setEnabledFields] = useState<string[]>(DEFAULT_ENABLED_FIELDS);
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
  const [showAICreator, setShowAICreator] = useState(!id); // Show AI creator for new events
  const [sourceEventTitle, setSourceEventTitle] = useState("");

  const isEditMode = !!id && !isDuplicateMode;

  const handleAIEventGenerated = (eventData: any) => {
    setTitle(eventData.title);
    setDescription(eventData.description);
    
    // Calculate dates based on suggested duration
    const now = new Date();
    const startDateTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
    const endDateTime = new Date(
      startDateTime.getTime() + 
      (eventData.suggestedDuration.hours * 60 + eventData.suggestedDuration.minutes) * 60 * 1000
    );
    
    setStartDate(startDateTime.toISOString().slice(0, 16));
    setEndDate(endDateTime.toISOString().slice(0, 16));
    setSeatsTotal(eventData.suggestedCapacity);
    
    // AI can suggest enabled fields if needed
    if (eventData.enabledFields) {
      setEnabledFields(eventData.enabledFields);
    }
    
    setShowAICreator(false);
  };

  useEffect(() => {
    checkAuth();
    if (id) {
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
      // In duplicate mode, prefix title and reset some fields
      if (isDuplicateMode) {
        setSourceEventTitle(data.title);
        setTitle(`สำเนา - ${data.title}`);
        toast({
          title: "กำลังสร้างสำเนาอีเวนท์",
          description: `กำลังคัดลอกข้อมูลจาก "${data.title}" - แก้ไขก่อนบันทึก`,
        });
      } else {
        setTitle(data.title);
      }
      
      setDescription(data.description || "");
      setCoverImageUrl(data.cover_image_url || "");
      setEventLocation(data.location || "");
      setGoogleMapUrl(data.google_map_url || "");
      setGoogleMapEmbedCode(data.google_map_embed_code || "");
      
      // In duplicate mode, reset dates to empty for user to set new dates
      if (isDuplicateMode) {
        setStartDate("");
        setEndDate("");
        setRegistrationOpenDate("");
        setRegistrationCloseDate("");
      } else {
        setStartDate(data.start_date.substring(0, 16));
        setEndDate(data.end_date.substring(0, 16));
        setRegistrationOpenDate(data.registration_open_date ? data.registration_open_date.substring(0, 16) : "");
        setRegistrationCloseDate(data.registration_close_date ? data.registration_close_date.substring(0, 16) : "");
      }
      
      setSeatsTotal(data.seats_total);
      const customFieldsData = data.custom_fields as { enabled_fields?: string[] } | null;
      setEnabledFields(customFieldsData?.enabled_fields || DEFAULT_ENABLED_FIELDS);
      setAllowOverbooking(data.allow_overbooking || false);
      setOverbookingPercentage(data.overbooking_percentage || 0);
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
        // In duplicate mode, reset seats and remove IDs
        if (isDuplicateMode) {
          const duplicatedTypes = types.map(t => ({
            id: '', // temporary empty id for new ticket types
            name: t.name,
            seats_allocated: t.seats_allocated,
            seats_remaining: t.seats_allocated, // Reset to allocated
            price: t.price,
          }));
          setTicketTypes(duplicatedTypes);
        } else {
          setTicketTypes(types);
        }
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
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Log enabled fields for debugging
      console.log("💾 Saving event with enabled fields:", enabledFields);
      console.log("📋 Enabled fields count:", enabledFields.length);

      const eventData = {
        title,
        description: description || null,
        cover_image_url: coverImageUrl || null,
        location: eventLocation || null,
        google_map_url: googleMapUrl || null,
        google_map_embed_code: googleMapEmbedCode || null,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        seats_total: seatsTotal,
        seats_remaining: seatsTotal,
        created_by: session.user.id,
        custom_fields: { enabled_fields: enabledFields },
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

      console.log("💾 Saving event data:", eventData);

      let error;
      let eventId = id;

      if (isEditMode) {
        const result = await supabase
          .from("events")
          .update(eventData)
          .eq("id", id);
        error = result.error;
        console.log("✏️ Update result:", { error, id });
      } else {
        const result = await supabase
          .from("events")
          .insert([eventData])
          .select()
          .single();
        error = result.error;
        eventId = result.data?.id;
        console.log("➕ Insert result:", { error, eventId });
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

      if (error) {
        console.error("❌ Error saving event:", error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.message || `ไม่สามารถ${isEditMode ? "แก้ไข" : "สร้าง"}งานอีเว้นท์ได้`,
          variant: "destructive",
        });
      } else {
        console.log(`✅ Event ${isEditMode ? 'updated' : isDuplicateMode ? 'duplicated' : 'created'} successfully with enabled fields:`, enabledFields.length);
        
        const actionText = isEditMode ? "แก้ไข" : isDuplicateMode ? "สร้างสำเนา" : "สร้าง";
        toast({
          title: "สำเร็จ",
          description: `${actionText}งานอีเว้นท์เรียบร้อยแล้ว พร้อมฟิลด์ลงทะเบียน ${enabledFields.length} ฟิลด์`,
        });
        navigate(eventId ? `/events/${eventId}` : "/events");
      }
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      toast({
        title: "เกิดข้อผิดพลาดที่ไม่คาดคิด",
        description: error.message || "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
          {/* AI Event Creator (for new events only, not for duplicate) */}
          {!isEditMode && !isDuplicateMode && showAICreator && (
            <div className="mb-6">
              <AIEventCreator onEventGenerated={handleAIEventGenerated} />
              <div className="text-center mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAICreator(false)}
                >
                  Skip AI Assistant
                </Button>
              </div>
            </div>
          )}

          {!isEditMode && !isDuplicateMode && !showAICreator && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAICreator(true)}
              className="mb-4"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Use AI Event Creator
            </Button>
          )}
          
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
              <div className="space-y-2">
                <Label htmlFor="coverImageUrl">URL ภาพปกงาน</Label>
                <Input
                  id="coverImageUrl"
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                {coverImageUrl && (
                  <div className="mt-2 relative aspect-video w-full max-w-md rounded-lg overflow-hidden border">
                    <img
                      src={coverImageUrl}
                      alt="ตัวอย่างภาพปก"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "";
                        e.currentTarget.alt = "ไม่สามารถโหลดรูปภาพได้";
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">สถานที่จัดงาน</Label>
                <Input
                  id="location"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="เช่น โรงแรม ABC กรุงเทพฯ หรือ Central World"
                />
                <p className="text-xs text-muted-foreground">
                  💡 ระบุชื่อสถานที่หรือที่อยู่เพื่อแสดงแผนที่แบบ Embed ในหน้ารายละเอียด
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleMapUrl">ลิงค์ Google Map (ทางเลือก)</Label>
                <Input
                  id="googleMapUrl"
                  type="url"
                  value={googleMapUrl}
                  onChange={(e) => setGoogleMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/... หรือ https://goo.gl/maps/..."
                />
                <p className="text-xs text-muted-foreground">
                  🔗 ลิงค์สำหรับปุ่ม "เปิดใน Google Maps" (ใช้ลิงค์ใดก็ได้จาก Google Maps)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleMapEmbedCode">Google Maps Embed Code (แนะนำ - แม่นยำที่สุด)</Label>
                <Textarea
                  id="googleMapEmbedCode"
                  value={googleMapEmbedCode}
                  onChange={(e) => setGoogleMapEmbedCode(e.target.value)}
                  placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
                  rows={4}
                  className="font-mono text-xs"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>📍 <strong>วิธีใช้:</strong></p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>เปิด Google Maps แล้วค้นหาสถานที่</li>
                    <li>กดปุ่ม "แชร์" (Share)</li>
                    <li>เลือกแท็บ "ฝังแผนที่" (Embed a map)</li>
                    <li>คัดลอกโค้ด iframe ทั้งหมดมาวางที่นี่</li>
                  </ol>
                  <p className="mt-2 text-primary">✨ ถ้ามีโค้ดนี้ จะใช้แผนที่จาก Embed Code ก่อนเสมอ</p>
                </div>
                {googleMapEmbedCode && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
                    <p className="text-xs font-medium mb-1">ตัวอย่างแผนที่ที่จะแสดง:</p>
                    <div className="w-full h-[200px] rounded overflow-hidden" dangerouslySetInnerHTML={{ __html: googleMapEmbedCode }} />
                  </div>
                )}
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

          {/* Registration Fields Configuration */}
          <StaticFieldsConfiguration
            enabledFields={enabledFields}
            onChange={setEnabledFields}
          />

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
              {loading ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : isDuplicateMode ? "สร้างสำเนาอีเวนท์" : "สร้างงานอีเว้นท์"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EventForm;
