import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CustomField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface TicketType {
  id?: string;
  name: string;
  price: number;
  seats_allocated: number;
  seats_remaining?: number;
}

export interface EventFormData {
  // Essential
  title: string;
  start_date: string;
  end_date: string;
  seats_total: number;
  description: string;
  
  // Advanced
  custom_fields: CustomField[];
  ticket_types: TicketType[];
  registration_open_date: string;
  registration_close_date: string;
  waitlist_enabled: boolean;
  max_waitlist_size: number | null;
  promote_window_hours: number;
  auto_promote_rule: string;
  location: string;
  google_map_url: string;
  google_map_embed_code: string;
  event_type: string;
  meeting_url: string;
  meeting_id: string;
  meeting_platform: string;
  
  // Review
  visibility: string;
  invitation_code: string;
  allow_overbooking: boolean;
  overbooking_percentage: number;
  cover_image_url: string;
}

export const useEventFormState = (eventId?: string) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    start_date: "",
    end_date: "",
    seats_total: 50,
    description: "",
    custom_fields: [],
    ticket_types: [],
    registration_open_date: "",
    registration_close_date: "",
    waitlist_enabled: true,
    max_waitlist_size: null,
    promote_window_hours: 24,
    auto_promote_rule: "manual",
    location: "",
    google_map_url: "",
    google_map_embed_code: "",
    event_type: "physical",
    meeting_url: "",
    meeting_id: "",
    meeting_platform: "",
    visibility: "public",
    invitation_code: "",
    allow_overbooking: false,
    overbooking_percentage: 0,
    cover_image_url: "",
  });

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      const { data: event, error } = await supabase
        .from("events")
        .select(`
          *,
          ticket_types (*)
        `)
        .eq("id", eventId)
        .single();

      if (error) throw error;

      if (event) {
        setFormData({
          title: event.title || "",
          start_date: event.start_date || "",
          end_date: event.end_date || "",
          seats_total: event.seats_total || 50,
          description: event.description || "",
          custom_fields: (event.custom_fields as unknown as CustomField[]) || [],
          ticket_types: event.ticket_types || [],
          registration_open_date: event.registration_open_date || "",
          registration_close_date: event.registration_close_date || "",
          waitlist_enabled: event.waitlist_enabled ?? true,
          max_waitlist_size: event.max_waitlist_size,
          promote_window_hours: event.promote_window_hours || 24,
          auto_promote_rule: event.auto_promote_rule || "manual",
          location: event.location || "",
          google_map_url: event.google_map_url || "",
          google_map_embed_code: event.google_map_embed_code || "",
          event_type: event.event_type || "physical",
          meeting_url: event.meeting_url || "",
          meeting_id: event.meeting_id || "",
          meeting_platform: event.meeting_platform || "",
          visibility: event.visibility || "public",
          invitation_code: event.invitation_code || "",
          allow_overbooking: event.allow_overbooking || false,
          overbooking_percentage: event.overbooking_percentage || 0,
          cover_image_url: event.cover_image_url || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const saveEvent = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const eventData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        seats_total: formData.seats_total,
        seats_remaining: eventId ? undefined : formData.seats_total,
        custom_fields: formData.custom_fields as any,
        registration_open_date: formData.registration_open_date || null,
        registration_close_date: formData.registration_close_date || null,
        waitlist_enabled: formData.waitlist_enabled,
        max_waitlist_size: formData.max_waitlist_size,
        promote_window_hours: formData.promote_window_hours,
        auto_promote_rule: formData.auto_promote_rule,
        location: formData.location || null,
        google_map_url: formData.google_map_url || null,
        google_map_embed_code: formData.google_map_embed_code || null,
        event_type: formData.event_type,
        meeting_url: formData.meeting_url || null,
        meeting_id: formData.meeting_id || null,
        meeting_platform: formData.meeting_platform || null,
        visibility: formData.visibility,
        invitation_code: formData.invitation_code || null,
        allow_overbooking: formData.allow_overbooking,
        overbooking_percentage: formData.overbooking_percentage,
        cover_image_url: formData.cover_image_url || null,
        created_by: eventId ? undefined : user.id,
        updated_at: new Date().toISOString(),
      };

      let savedEventId = eventId;

      if (eventId) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", eventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert([eventData])
          .select()
          .single();
        if (error) throw error;
        savedEventId = data.id;
      }

      // Save ticket types
      if (formData.ticket_types.length > 0) {
        const ticketTypesData = formData.ticket_types.map(tt => ({
          ...tt,
          event_id: savedEventId,
          seats_remaining: tt.seats_remaining ?? tt.seats_allocated,
        }));

        // Delete existing ticket types if updating
        if (eventId) {
          await supabase.from("ticket_types").delete().eq("event_id", eventId);
        }

        const { error: ticketError } = await supabase
          .from("ticket_types")
          .insert(ticketTypesData);
        if (ticketError) throw ticketError;
      }

      toast({
        title: eventId ? "Event updated" : "Event created",
        description: eventId ? "Event has been updated successfully" : "Event has been created successfully",
      });

      return savedEventId;
    } catch (error: any) {
      toast({
        title: "Error saving event",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    updateFormData,
    saveEvent,
    isLoading,
    isSaving,
    currentStep,
    setCurrentStep,
  };
};
