import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, ChevronDown, Sparkles, Users, Calendar, MapPin, Settings } from "lucide-react";
import { StaticFieldsConfiguration } from "@/components/event-builder/StaticFieldsConfiguration";
import { DEFAULT_ENABLED_FIELDS } from "@/lib/registrationFields";
import { CapacitySettings, TicketType } from "@/components/event-builder/CapacitySettings";
import { TimeWindowSettings } from "@/components/event-builder/TimeWindowSettings";
import { WaitlistSettings } from "@/components/event-builder/WaitlistSettings";
import { VisibilitySettings } from "@/components/event-builder/VisibilitySettings";
import AIEventCreator from "@/components/AIEventCreator";
import Navbar from "@/components/Navbar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAutoSave } from "@/components/event-form/hooks/useAutoSave";
import { cn } from "@/lib/utils";

const EventForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [location, setLocation] = useState("");
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
  const [showAICreator, setShowAICreator] = useState(!id);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const isEditMode = !!id;

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
      setCoverImageUrl(data.cover_image_url || "");
      setLocation(data.location || "");
      setGoogleMapUrl(data.google_map_url || "");
      setGoogleMapEmbedCode(data.google_map_embed_code || "");
      setStartDate(data.start_date.substring(0, 16));
      setEndDate(data.end_date.substring(0, 16));
      setSeatsTotal(data.seats_total);
      const customFieldsData = data.custom_fields as { enabled_fields?: string[] } | null;
      setEnabledFields(customFieldsData?.enabled_fields || DEFAULT_ENABLED_FIELDS);
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

  const handleAutoSave = useCallback(async () => {
    if (!isEditMode || !id) return;
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const eventData = {
        title,
        description: description || null,
        cover_image_url: coverImageUrl || null,
        location: location || null,
        google_map_url: googleMapUrl || null,
        google_map_embed_code: googleMapEmbedCode || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        seats_total: seatsTotal,
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

      await supabase.from("events").update(eventData).eq("id", id);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [id, isEditMode, title, description, coverImageUrl, location, googleMapUrl, googleMapEmbedCode, 
      startDate, endDate, seatsTotal, enabledFields, allowOverbooking, overbookingPercentage,
      registrationOpenDate, registrationCloseDate, waitlistEnabled, maxWaitlistSize, 
      autoPromoteRule, promoteWindowHours, visibility, invitationCode]);

  useAutoSave(
    {
      title, description, coverImageUrl, location, startDate, endDate, seatsTotal,
      enabledFields, allowOverbooking, overbookingPercentage, waitlistEnabled
    },
    handleAutoSave,
    30000,
    isEditMode
  );

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
        location: location || null,
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
        console.log(`✅ Event ${isEditMode ? 'updated' : 'created'} successfully with enabled fields:`, enabledFields.length);
        
        toast({
          title: "สำเร็จ",
          description: `${isEditMode ? "แก้ไข" : "สร้าง"}งานอีเว้นท์เรียบร้อยแล้ว พร้อมฟิลด์ลงทะเบียน ${enabledFields.length} ฟิลด์`,
        });
        navigate("/events");
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
      
      {/* Minimal Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">
                  {isEditMode ? "แก้ไขงาน" : "สร้างงานใหม่"}
                </h1>
                {isEditMode && lastSaved && (
                  <p className="text-xs text-muted-foreground">
                    {isSaving ? "กำลังบันทึก..." : `บันทึกล่าสุด ${lastSaved.toLocaleTimeString('th-TH')}`}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "กำลังบันทึก..." : isEditMode ? "บันทึก" : "สร้างงาน"}
            </Button>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* AI Event Creator */}
          {!isEditMode && showAICreator && (
            <div className="rounded-lg border bg-card p-6">
              <AIEventCreator onEventGenerated={handleAIEventGenerated} />
              <div className="text-center mt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAICreator(false)}>
                  ข้ามขั้นตอนนี้
                </Button>
              </div>
            </div>
          )}

          {!isEditMode && !showAICreator && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAICreator(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              ใช้ AI ช่วยสร้างงาน
            </Button>
          )}
          
          {/* Core Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                ข้อมูลหลัก
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">ชื่องานอีเว้นท์ *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น Yoga Workshop 2024"
                    className="mt-1.5"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">รายละเอียด</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="รายละเอียดของงานอีเว้นท์..."
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="coverImageUrl" className="text-sm font-medium">URL ภาพปก</Label>
                    <Input
                      id="coverImageUrl"
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium">สถานที่</Label>
                    <div className="flex gap-2 mt-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-2.5" />
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="โรงแรม ABC กรุงเทพฯ"
                      />
                    </div>
                  </div>
                </div>

                {coverImageUrl && (
                  <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border">
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
                <div>
                  <Label htmlFor="googleMapUrl" className="text-sm font-medium">ลิงค์ Google Map</Label>
                  <Input
                    id="googleMapUrl"
                    type="url"
                    value={googleMapUrl}
                    onChange={(e) => setGoogleMapUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Time & Capacity */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                วันเวลาและที่นั่ง
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">ชื่องานอีเว้นท์ *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น Yoga Workshop 2024"
                    className="mt-1.5"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">รายละเอียด</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="รายละเอียดของงานอีเว้นท์..."
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="coverImageUrl" className="text-sm font-medium">URL ภาพปก</Label>
                    <Input
                      id="coverImageUrl"
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium">สถานที่</Label>
                    <div className="flex gap-2 mt-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-2.5" />
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="โรงแรม ABC กรุงเทพฯ"
                      />
                    </div>
                  </div>
                </div>

                {coverImageUrl && (
                  <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border">
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

                <div>
                  <Label htmlFor="googleMapUrl" className="text-sm font-medium">ลิงค์ Google Map</Label>
                  <Input
                    id="googleMapUrl"
                    type="url"
                    value={googleMapUrl}
                    onChange={(e) => setGoogleMapUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Time & Capacity */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                วันเวลาและที่นั่ง
              </h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-sm font-medium">วันเริ่มต้น *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1.5"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">วันสิ้นสุด *</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1.5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="seatsTotal" className="text-sm font-medium">จำนวนที่นั่งทั้งหมด *</Label>
                  <Input
                    id="seatsTotal"
                    type="number"
                    value={seatsTotal}
                    onChange={(e) => setSeatsTotal(parseInt(e.target.value) || 0)}
                    min="1"
                    className="mt-1.5"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings - Collapsible */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  ตั้งค่าขั้นสูง
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 mt-4">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">ช่วงเวลาลงทะเบียน</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationOpenDate" className="text-sm">เปิดรับลงทะเบียน</Label>
                    <Input
                      id="registrationOpenDate"
                      type="datetime-local"
                      value={registrationOpenDate}
                      onChange={(e) => setRegistrationOpenDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrationCloseDate" className="text-sm">ปิดรับลงทะเบียน</Label>
                    <Input
                      id="registrationCloseDate"
                      type="datetime-local"
                      value={registrationCloseDate}
                      onChange={(e) => setRegistrationCloseDate(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

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

              <VisibilitySettings
                visibility={visibility}
                onVisibilityChange={setVisibility}
                invitationCode={invitationCode}
                onInvitationCodeChange={setInvitationCode}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Registration Fields - Collapsible */}
          <Collapsible open={showFields} onOpenChange={setShowFields}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between" type="button">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  ฟิลด์ลงทะเบียน ({enabledFields.length} ฟิลด์)
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showFields && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <StaticFieldsConfiguration
                enabledFields={enabledFields}
                onChange={setEnabledFields}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/events")}
            >
              ยกเลิก
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default EventForm;
