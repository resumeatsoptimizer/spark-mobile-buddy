import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { operation, eventIds, updates } = await req.json();

    console.log('Bulk operation:', operation, 'on', eventIds.length, 'events');

    if (operation === 'update') {
      // Bulk update events
      const { error } = await supabase
        .from('events')
        .update(updates)
        .in('id', eventIds);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        updatedCount: eventIds.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'delete') {
      // Bulk delete events
      const { error } = await supabase
        .from('events')
        .delete()
        .in('id', eventIds);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        deletedCount: eventIds.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'addCategories') {
      // Bulk add categories to events
      const mappings = eventIds.flatMap((eventId: string) =>
        updates.categoryIds.map((categoryId: string) => ({
          event_id: eventId,
          category_id: categoryId,
        }))
      );

      const { error } = await supabase
        .from('event_category_mapping')
        .upsert(mappings, { onConflict: 'event_id,category_id' });

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        mappingsCreated: mappings.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'addTags') {
      // Bulk add tags to events
      const mappings = eventIds.flatMap((eventId: string) =>
        updates.tagIds.map((tagId: string) => ({
          event_id: eventId,
          tag_id: tagId,
        }))
      );

      const { error } = await supabase
        .from('event_tag_mapping')
        .upsert(mappings, { onConflict: 'event_id,tag_id' });

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        mappingsCreated: mappings.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'duplicate') {
      // Bulk duplicate events
      const { data: events, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (fetchError) throw fetchError;

      const duplicates = events.map((event: any) => {
        const { id, created_at, updated_at, ...eventData } = event;
        return {
          ...eventData,
          title: `${event.title} (Copy)`,
          seats_remaining: event.seats_total,
        };
      });

      const { error: insertError } = await supabase
        .from('events')
        .insert(duplicates);

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ 
        success: true, 
        duplicatedCount: duplicates.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid operation');

  } catch (error) {
    console.error('Error in bulk-event-operations:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});