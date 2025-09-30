-- Enable realtime for event_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages;

-- Enable realtime for event_check_ins table
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_check_ins;