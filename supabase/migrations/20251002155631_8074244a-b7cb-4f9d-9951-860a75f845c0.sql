-- Fix seats_remaining for the Bangkok Marathon event using exact ID
UPDATE public.events
SET seats_remaining = seats_total - (
  SELECT COUNT(*)
  FROM public.registrations r
  INNER JOIN public.payments p ON p.registration_id = r.id
  WHERE r.event_id = '615190e5-aeeb-4103-8d68-a11053c9726c'
    AND p.status IN ('success', 'successful', 'completed')
    AND r.status IN ('confirmed', 'pending')
)
WHERE id = '615190e5-aeeb-4103-8d68-a11053c9726c';